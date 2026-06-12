// api/admin/approve-agency.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Configuration Supabase manquante ou invalide sur le serveur.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { request_id, p_request_id } = req.body || {};
  const targetRequestId = request_id || p_request_id;
  if (!targetRequestId) return res.status(400).json({ error: 'request_id is required' });

  // 🔐 Sécurisation de l'endpoint : Vérification du token et du rôle de l'appelant
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé - Pas de jeton d\'authentification' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Session invalide ou expirée' });
  }

  const { data: admin, error: adminError } = await supabase
    .from('platform_admins')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (adminError || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Accès refusé - Droits administrateur requis' });
  }

  try {
    // 1. Fetch details of the pending request first
    const { data: request, error: fetchError } = await supabase
      .from('agency_registration_requests')
      .select('*')
      .eq('id', targetRequestId)
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Demande d\'inscription introuvable' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
    }

    // 2. Call the database RPC to approve the request
    const rpc = await supabase.rpc('approve_agency_request', { p_request_id: targetRequestId });
    if (rpc.error) {
      throw rpc.error;
    }

    const approvalResult = rpc.data;
    const isSuccess = approvalResult && (approvalResult.success || approvalResult.agency_id);

    if (!isSuccess) {
      throw new Error(approvalResult?.error || 'Échec de l\'approbation via la RPC');
    }

    // 3. Send the Welcome Email to the Director
    const directorEmail = request.director_email;
    const directorName = `${request.director_first_name} ${request.director_last_name}`;
    const agencyName = request.agency_name;
    const selectedPlan = request.selected_plan || 'basic';

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'no-reply@gestion360immo.com';
    const smtpSecure = process.env.SMTP_SECURE === 'true';

    let emailSent = false;
    let emailWarning = '';

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure, // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gestion360immo.com';

        const mailOptions = {
          from: `"Gestion360" <${smtpFrom}>`,
          to: directorEmail,
          subject: 'Bienvenue sur Gestion360 - Votre agence a été activée ! 🚀',
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background-color: #2563eb; color: #ffffff; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Félicitations ! 🎉</h1>
                <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">Votre agence est désormais en ligne</p>
              </div>
              <div style="padding: 30px; background-color: #ffffff;">
                <p style="font-size: 16px; margin-bottom: 20px;">Bonjour <strong>${directorName}</strong>,</p>
                <p style="font-size: 15px; margin-bottom: 20px;">
                  Nous avons le plaisir de vous informer que votre demande d'inscription pour l'agence <strong>${agencyName}</strong> a été validée par nos administrateurs. Votre espace de gestion immobilière est maintenant entièrement activé.
                </p>
                <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                  <h3 style="margin-top: 0; color: #1e3a8a; font-size: 14px; text-transform: uppercase; tracking-wider: 0.05em;">Vos informations d'accès</h3>
                  <p style="margin: 5px 0; font-size: 14px;"><strong>Identifiant (Email) :</strong> ${directorEmail}</p>
                  <p style="margin: 5px 0; font-size: 14px;"><strong>Mot de passe :</strong> <i>Celui défini lors de votre inscription</i></p>
                  <p style="margin: 5px 0; font-size: 14px;"><strong>Formule :</strong> Plan ${selectedPlan.toUpperCase()} (Période d'essai de 60 jours incluse)</p>
                </div>
                <div style="text-align: center; margin-bottom: 25px;">
                  <a href="${dashboardUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; display: inline-block;">Accéder à mon tableau de bord</a>
                </div>
                <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
                  Besoin d'aide ? Notre support est à votre disposition à l'adresse support@gestion360immo.com.
                </p>
              </div>
              <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                &copy; 2026 Gestion360 - La gestion immobilière simplifiée à 360&deg;
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        emailSent = true;
      } catch (mailErr: any) {
        console.error('❌ Erreur d\'envoi email via SMTP:', mailErr);
        emailWarning = `Approbation réussie, mais l'envoi du mail de bienvenue a échoué: ${mailErr.message}`;
      }
    } else {
      console.warn('⚠️ SMTP non configuré. L\'email de bienvenue n\'a pas pu être envoyé.');
      emailWarning = 'Approbation réussie, mais l\'email n\'a pas été envoyé car les variables SMTP ne sont pas configurées.';
    }

    return res.status(200).json({ 
      ok: true, 
      mode: 'rpc', 
      data: approvalResult, 
      emailSent, 
      warning: emailWarning || null 
    });

  } catch (e: any) {
    console.error('approve-agency handler error:', e);
    return res.status(500).json({ error: e?.message ?? 'Server error' });
  }
}
