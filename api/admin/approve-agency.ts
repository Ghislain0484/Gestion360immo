// /api/admin/approve-agency.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!; // ⚠️ server-only

function userClient(jwt?: string) {
  return createClient(SUPABASE_URL, ANON, {
    global: { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const authz = req.headers.authorization;
    const token = authz?.startsWith("Bearer ") ? authz.slice(7) : undefined;
    if (!token) return res.status(401).json({ error: "Missing access token" });

    const supaUser = userClient(token);
    const { data: me } = await supaUser.auth.getUser();
    if (!me?.user) return res.status(401).json({ error: "Invalid session" });

    // vérifier platform_admin
    const { data: isAdmin } = await supaUser
      .from("platform_admins")
      .select("id")
      .eq("id", me.user.id)
      .maybeSingle();
    if (!isAdmin) return res.status(403).json({ error: "Not platform_admin" });

    const { request_id } = req.body as { request_id?: string };
    if (!request_id) return res.status(400).json({ error: "request_id required" });

    const admin = adminClient();

    // 1) Récupérer la demande
    const { data: reqRow, error: reqErr } = await admin
      .from("agency_registration_requests")
      .select("*")
      .eq("id", request_id)
      .single();
    if (reqErr || !reqRow) return res.status(404).json({ error: "Request not found" });

    // 2) Upsert agence
    const agencyPayload = {
      name: reqRow.agency_name,
      address: reqRow.address ?? null,
      city: reqRow.city ?? null,
      phone: reqRow.phone ?? null,
      email: reqRow.email ?? reqRow.director_email ?? null,
      commercial_register: reqRow.commercial_register ?? null,
      status: "approved",
    };

    let agencyId: string;
    if (agencyPayload.commercial_register) {
      const { data: up, error: upErr } = await admin
        .from("agencies")
        .upsert(agencyPayload, { onConflict: "commercial_register" })
        .select("id")
        .single();
      if (upErr) return res.status(400).json({ error: upErr.message });
      agencyId = up.id;
    } else {
      const { data: ins, error: insErr } = await admin
        .from("agencies")
        .insert(agencyPayload)
        .select("id")
        .single();
      if (insErr) return res.status(400).json({ error: insErr.message });
      agencyId = ins.id;
    }

    // 3) Lier le directeur à l’agence
    const directorId: string | null = reqRow.director_auth_user_id ?? null;
    if (!directorId) {
      return res.status(400).json({
        error:
          "La demande ne contient pas director_auth_user_id. Assure-toi que le directeur a créé son compte lors de la demande.",
      });
    }

    const { error: upAU } = await admin
      .from("agency_users")
      .upsert({ user_id: directorId, agency_id: agencyId, role: "director" }, { onConflict: "user_id" });
    if (upAU) return res.status(400).json({ error: upAU.message });

    // (Optionnel) synchro table users.agency_id si elle existe
    try {
      await admin.from("users").update({ agency_id: agencyId }).eq("id", directorId);
    } catch {}

    // 4) Marquer la demande approuvée
    const { error: updErr } = await admin
      .from("agency_registration_requests")
      .update({ status: "approved" })
      .eq("id", request_id);
    if (updErr) return res.status(400).json({ error: updErr.message });

    return res.status(200).json({ ok: true, agency_id: agencyId, director_id: directorId });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
