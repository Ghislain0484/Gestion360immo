// api/admin/approve-agency.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { request_id } = req.body || {};
  if (!request_id) return res.status(400).json({ error: 'request_id is required' });

  try {
    // 1) RPC si disponible
    const rpc = await supabase.rpc('approve_agency_request', { p_request_id: request_id });
    if (!rpc.error) return res.status(200).json({ ok: true, mode: 'rpc', data: rpc.data });

    // 2) Fallback minimal
    const { data, error } = await supabase
      .from('agency_registration_requests')
      .update({ status: 'approved' })
      .eq('id', request_id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ ok: true, mode: 'fallback', data });
  } catch (e: any) {
    console.error('approve-agency error', e);
    return res.status(500).json({ error: e?.message ?? 'Server error' });
  }
}
