// src/lib/adminApi.ts
import { supabase } from "@/lib/supabase";

/**
 * Stats plateforme utilisées par /admin
 * Renvoie au minimum:
 * - pendingRequests: nb de demandes en 'pending'
 * - approvedAgencies: nb d'agences approuvées (si tu as la table 'agencies' + status=approved)
 */
export async function getPlatformStats() {
  // Comptage demandes 'pending'
  const { count: pending, error: pErr } = await supabase
    .from("agency_registration_requests")
    .select("*", { head: true, count: "exact" })
    .eq("status", "pending");

  if (pErr) throw pErr;

  // Comptage agences approuvées (si tu as une table 'agencies' avec 'status'='approved')
  let approved = 0;
  const { count: appr, error: aErr } = await supabase
    .from("agencies")
    .select("*", { head: true, count: "exact" })
    .eq("status", "approved");

  if (!aErr && typeof appr === "number") {
    approved = appr;
  } // sinon on laisse à 0, et on n’échoue pas la page

  return {
    pendingRequests: pending ?? 0,
    approvedAgencies: approved ?? 0,
  };
}

/** Liste paginée des demandes 'pending' */
export async function listPendingRegistrationRequests(limit = 50) {
  const { data, error } = await supabase
    .from("agency_registration_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/** (optionnel) Approuver / Refuser une demande */
export async function updateRegistrationStatus(id: string, status: "approved" | "rejected") {
  const { error } = await supabase
    .from("agency_registration_requests")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
  return true;
}
