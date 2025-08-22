// api/owners/create.ts
import { createClient } from '@supabase/supabase-js';

function ohadaMandate(owner: any, agencyName: string) {
  return [
    'CONTRAT DE MANDAT DE GESTION – OHADA',
    `Agence: ${agencyName} – Propriétaire: ${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim(),
    'Objet: Mandat de gestion locative des biens du Propriétaire.',
    'Durée: 12 mois renouvelable par tacite reconduction.',
    'Rémunération: Commission mensuelle de gestion.',
    'Obligations: Conformément aux actes uniformes OHADA et lois de Côte d’Ivoire.',
    'Résiliation: Préavis 1 mois, solde des comptes, remise des documents.',
    'Fait à Abidjan, en deux exemplaires originaux.'
  ].join('\n');
}

// Vercel serverless (Node/Express-like)
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || token !== process.env.DEMO_SHARED_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { owner, userEmail, userId } = req.body || {};

  if (!owner || (!userEmail && !userId)) {
    return res.status(400).json({ error: 'missing_params' });
  }

  // Récupère user→agency_id
  const orFilter = userId
    ? `id.eq.${userId},auth_user_id.eq.${userId}`
    : `email.eq.${userEmail}`;

  const { data: userRow, error: uErr } = await supa
    .from('users')
    .select('id, agency_id, email, first_name, last_name')
    .or(orFilter)
    .maybeSingle();

  if (uErr) return res.status(500).json({ error: uErr.message });
  if (!userRow?.agency_id) return res.status(400).json({ error: 'no_agency_for_user' });

  // Récupère nom de l’agence (facultatif pour le contrat)
  const { data: ag, error: aErr } = await supa
    .from('agencies')
    .select('name')
    .eq('id', userRow.agency_id)
    .maybeSingle();
  const agencyName = ag?.name ?? 'Votre Agence';

  // Payload minimal côté DB
  const payload: any = {
    agency_id: userRow.agency_id, // même si trigger existe, on met explicite
    first_name: owner.firstName ?? owner.first_name,
    last_name: owner.lastName ?? owner.last_name,
    phone: owner.phone ?? null,
    email: owner.email || null
  };

  const { data: inserted, error: iErr } = await supa
    .from('owners')
    .insert(payload)
    .select('*')
    .single();

  if (iErr) return res.status(400).json({ error: iErr.message });

  // Contrat OHADA auto
  const contract = {
    agency_id: userRow.agency_id,
    owner_id: inserted.id,
    tenant_id: null,
    type: 'mandate',
    status: 'active',
    title: 'Mandat de gestion – OHADA',
    content: ohadaMandate(inserted, agencyName)
  };
  await supa.from('contracts').insert(contract);

  return res.status(200).json(inserted);
}
