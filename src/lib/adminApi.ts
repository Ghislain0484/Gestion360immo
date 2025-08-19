import { supabase } from "@/lib/supabase";

export async function getPlatformStats() {
  const { count: pending = 0, error: pErr } = await supabase
    .from("agency_registration_requests")
    .select("*", { head: true, count: "exact" })
    .eq("status", "pending");
  if (pErr) throw pErr;

  // si pas de table "agencies", on ignore l'erreur et met 0
  let approved = 0;
  const { count: appr } = await supabase
    .from("agencies")
    .select("*", { head: true, count: "exact" })
    .eq("status", "approved");
  if (typeof appr === "number") approved = appr;

  return { pendingRequests: pending, approvedAgencies: approved };
}

export async function listPendingRegistrationRequests(limit = 100) {
  const { data, error } = await supabase
    .from("agency_registration_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function updateRegistrationStatus(id: string, status: "approved" | "rejected") {
  const { error } = await supabase
    .from("agency_registration_requests")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
  return true;
}

// Optionnel : approuver et créer une agence
export async function approveAndCreateAgency(request: any) {
  await updateRegistrationStatus(request.id, "approved");
  const payload = {
    name: request.agency_name,
    address: request.address ?? null,
    city: request.city ?? null,
    phone: request.phone ?? null,
    email: request.director_email ?? null,
    commercial_register: request.commercial_register ?? null,
    status: "approved",
  };
  // Si pas de table 'agencies', commente la ligne suivante
  const { error } = await supabase.from("agencies").insert(payload);
  if (error) throw error;
  return true;
}
