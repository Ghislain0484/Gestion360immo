import { PlatformStats } from "../types/db";
import { supabase } from "./config";

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc('get_platform_stats_v2');

  if (error) {
    console.error('Erreur lors de la récupération des stats optimisées:', error);
    throw error;
  }

  return data as PlatformStats;
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
