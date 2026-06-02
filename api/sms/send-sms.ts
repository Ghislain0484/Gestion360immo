import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { recipient, message, agency_id, sender_id } = req.body || {};

  if (!recipient || !message || !agency_id) {
    return res.status(400).json({ ok: false, error: 'Paramètres manquants (destinataire, message, agence).' });
  }

  // Sanitize phone number to international format (ex: +225XXXXXXXXXX)
  let cleanPhone = recipient.trim().replace(/[\s\-\(\)]/g, '');
  if (!cleanPhone.startsWith('+')) {
    if (cleanPhone.startsWith('225')) {
      cleanPhone = '+' + cleanPhone;
    } else {
      // Default to Ivory Coast country code if omitted
      cleanPhone = '+225' + cleanPhone;
    }
  }

  try {
    // 1. Fetch current agency balance and credentials
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('sms_balance, sms_expiry_date, sms_sender_name')
      .eq('id', agency_id)
      .single();

    if (agencyError || !agency) {
      return res.status(404).json({ ok: false, error: 'Agence introuvable.' });
    }

    const today = new Date();
    const currentBalance = agency.sms_balance || 0;
    const currentExpiry = agency.sms_expiry_date ? new Date(agency.sms_expiry_date) : null;
    const isExpired = currentExpiry ? currentExpiry < today : true;

    // Check balance validity
    if (currentBalance < 1) {
      return res.status(400).json({ ok: false, error: 'Solde SMS insuffisant. Veuillez recharger votre compte agence.' });
    }

    if (isExpired) {
      return res.status(400).json({ ok: false, error: 'Vos crédits SMS ont expiré. Veuillez acheter un nouveau forfait pour réactiver votre solde.' });
    }

    // Determine segments (160 characters GSM7 = 1 SMS)
    const smsCountDeducted = Math.max(1, Math.ceil(message.length / 160));

    if (currentBalance < smsCountDeducted) {
      return res.status(400).json({ ok: false, error: `Votre solde (${currentBalance} SMS) est insuffisant pour envoyer ce message long (${smsCountDeducted} SMS requis).` });
    }

    // 2. Authenticate and retrieve OAuth2 token from Orange CI
    const clientId = '2D1n7kQ1HBF3OSmhsYflozv4xDKZSpe';
    const clientSecret = process.env.ORANGE_CLIENT_SECRET || 'MOCK_SECRET';

    let success = false;
    let orangeError = '';
    let responseData = null;

    if (clientSecret === 'MOCK_SECRET' || process.env.NODE_ENV === 'development') {
      // Mock sending in local dev or if secret not set yet
      console.log(`📡 MOCK SMS to ${cleanPhone}: "${message}"`);
      success = true;
    } else {
      try {
        const credentials = btoa(`${clientId}:${clientSecret}`);
        const tokenResponse = await fetch('https://api.orange.com/oauth/v3/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
          throw new Error(tokenData.error_description || 'Authentification Orange échouée.');
        }

        const accessToken = tokenData.access_token;

        // 3. Send outbound SMS request via Orange CI SMS endpoint
        // senderAddress tel:+22500000000 is used on Orange CI Sandbox, can be configured via env
        const senderAddress = process.env.ORANGE_SENDER_ADDRESS || 'tel:+22500000000';
        const senderEncoded = encodeURIComponent(senderAddress);
        const orangeSmsUrl = `https://api.orange.com/smsmessaging/v1/outbound/${senderEncoded}/requests`;

        const smsPayload = {
          outboundSMSMessageRequest: {
            address: `tel:${cleanPhone}`,
            senderAddress: senderAddress,
            outboundSMSTextMessage: {
              message: message
            },
            senderName: agency.sms_sender_name || 'G360Immo'
          }
        };

        const smsResponse = await fetch(orangeSmsUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(smsPayload)
        });

        responseData = await smsResponse.json();

        if (smsResponse.ok) {
          success = true;
        } else {
          orangeError = responseData?.message || responseData?.requestError?.serviceException?.variables?.join(', ') || 'Erreur d envoi SMS Orange CI';
        }
      } catch (err: any) {
        orangeError = err.message || 'Erreur réseau Orange API';
      }
    }

    if (success) {
      // 4. Deduct SMS balance in Postgres
      const { error: deductError } = await supabase
        .from('agencies')
        .update({ sms_balance: currentBalance - smsCountDeducted })
        .eq('id', agency_id);

      if (deductError) throw deductError;

      // 5. Add row in sms_logs
      await supabase.from('sms_logs').insert([{
        agency_id,
        sender_id: sender_id || null,
        recipient: cleanPhone,
        message,
        sms_count_deducted: smsCountDeducted,
        status: 'sent'
      }]);

      return res.status(200).json({
        ok: true,
        message: 'SMS envoyé avec succès !',
        sms_count_deducted: smsCountDeducted,
        sms_balance: currentBalance - smsCountDeducted
      });
    } else {
      // 6. Log failure
      await supabase.from('sms_logs').insert([{
        agency_id,
        sender_id: sender_id || null,
        recipient: cleanPhone,
        message,
        sms_count_deducted: smsCountDeducted,
        status: 'failed',
        error_message: orangeError
      }]);

      return res.status(502).json({
        ok: false,
        error: `L'envoi a échoué auprès de l'opérateur : ${orangeError}`
      });
    }

  } catch (err: any) {
    console.error('send-sms error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Erreur interne du serveur' });
  }
}
