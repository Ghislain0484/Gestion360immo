import { PlatformStats } from "../types/db";
import { supabase } from "./config";

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc('get_platform_stats_v2');

  if (error) {
    console.error('Erreur lors de la récupération des stats optimisées:', error);
    throw error;
  }

  const stats = data as PlatformStats;

  // Calcul du potentiel global et des commissions (1%)
  try {
    const { data: contracts, error: contractError } = await supabase
      .from('contracts')
      .select('monthly_rent')
      .in('status', ['active', 'renewed']);
    
    if (!contractError && contracts) {
      const globalPotential = contracts.reduce((sum, c) => sum + (c.monthly_rent || 0), 0);
      stats.globalPotential = globalPotential;
      stats.globalCommissions = globalPotential * 0.01;
    }
  } catch (err) {
    console.warn('Could not fetch global contract data for stats:', err);
  }

  return stats;
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

export async function getGlobalFintechData() {
  const [wallets, transactions] = await Promise.all([
    supabase.from('agency_wallets').select('*, agencies(name, city)'),
    supabase.from('wallet_transactions').select('*, agencies(name)').order('created_at', { ascending: false })
  ]);

  if (wallets.error) throw wallets.error;
  if (transactions.error) throw transactions.error;

  return {
    wallets: wallets.data || [],
    transactions: transactions.data || []
  };
}
