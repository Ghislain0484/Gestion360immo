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

  const { transaction_id, tx_ref, agency_id, package_id, amount, email } = req.body || {};

  if (!transaction_id || !tx_ref || !agency_id || !package_id) {
    return res.status(400).json({ ok: false, error: 'Paramètres manquants pour la vérification.' });
  }

  try {
    // 1. Check if this transaction was already processed to avoid double credits
    const { data: existingTx } = await supabase
      .from('sms_purchase_history')
      .select('id, payment_status')
      .eq('payment_gateway_ref', transaction_id.toString())
      .maybeSingle();

    if (existingTx && existingTx.payment_status === 'completed') {
      return res.status(200).json({ ok: true, alreadyProcessed: true, message: 'Cette recharge a déjà été créditée.' });
    }

    // 2. Fetch the SMS package details to get SMS count and validity days
    const { data: pack, error: packError } = await supabase
      .from('sms_packages')
      .select('*')
      .eq('id', package_id)
      .single();

    if (packError || !pack) {
      return res.status(404).json({ ok: false, error: 'Forfait SMS introuvable.' });
    }

    // 3. Verify transaction with Flutterwave API
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST_MOCK_KEY';
    const verifyUrl = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const verifyData = await response.json();

    if (!response.ok || verifyData.status !== 'success' || verifyData.data.status !== 'successful') {
      // Allow local development testing with mock keys
      if (secretKey.includes('MOCK') || process.env.NODE_ENV === 'development') {
        console.log("⚠️ Dev Mode: Mocking successful payment validation.");
      } else {
        return res.status(400).json({ ok: false, error: 'La validation du paiement auprès de Flutterwave a échoué.' });
      }
    }

    // Verify amount matches the package price (with a small margin)
    const paidAmount = verifyData?.data?.amount || amount;
    if (Math.abs(paidAmount - pack.price_xof) > 10) {
      if (!secretKey.includes('MOCK')) {
        return res.status(400).json({ ok: false, error: 'Le montant payé ne correspond pas au prix du forfait.' });
      }
    }

    // 4. Fetch current agency SMS state for Orange-style rollover
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('sms_balance, sms_expiry_date')
      .eq('id', agency_id)
      .single();

    if (agencyError || !agency) {
      return res.status(404).json({ ok: false, error: 'Agence introuvable.' });
    }

    const today = new Date();
    const currentBalance = agency.sms_balance || 0;
    const currentExpiry = agency.sms_expiry_date ? new Date(agency.sms_expiry_date) : null;
    const isExpired = currentExpiry ? currentExpiry < today : true;

    // Rollover rule: if not expired, add new SMS to current balance and extend validity from today.
    // If expired, the previous balance is cleared (starts at 0) and the new count is credited.
    const newBalance = (isExpired ? 0 : currentBalance) + pack.sms_count;
    const newExpiryDate = new Date(today.getTime() + pack.validity_days * 24 * 60 * 60 * 1000).toISOString();

    // 5. Update agency SMS balance in database
    const { error: updateError } = await supabase
      .from('agencies')
      .update({
        sms_balance: newBalance,
        sms_expiry_date: newExpiryDate
      })
      .eq('id', agency_id);

    if (updateError) throw updateError;

    // 6. Record transaction in history
    await supabase.from('sms_purchase_history').insert([{
      agency_id,
      package_id,
      amount_paid: pack.price_xof,
      sms_added: pack.sms_count,
      payment_gateway_ref: transaction_id.toString(),
      payment_status: 'completed',
      payment_method: verifyData?.data?.payment_type || 'mobilemoney_xof'
    }]);

    return res.status(200).json({
      ok: true,
      message: `Votre achat de forfait a été validé ! ${pack.sms_count} SMS ont été crédités.`,
      sms_balance: newBalance,
      sms_expiry_date: newExpiryDate
    });

  } catch (err: any) {
    console.error('verify-purchase error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Erreur interne du serveur' });
  }
}
