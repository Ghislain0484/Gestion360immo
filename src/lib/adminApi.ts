import { PlatformStats } from "../types/db";
import { supabase } from "./config";

export async function getPlatformStats(): Promise<PlatformStats> {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const responses = await Promise.all([
    supabase
      .from('agency_registration_requests')
      .select('*', { head: true, count: 'exact' })
      .eq('status', 'pending'),
    supabase
      .from('agencies')
      .select('*', { head: true, count: 'exact' }),
    supabase
      .from('agencies')
      .select('*', { head: true, count: 'exact' })
      .eq('status', 'approved'),
    // Récupérer toutes les agences avec leurs monthly_fee
    supabase
      .from('agencies')
      .select('subscription_status, monthly_fee'),
    supabase
      .from('properties')
      .select('*', { head: true, count: 'exact' }),
    supabase
      .from('contracts')
      .select('*', { head: true, count: 'exact' }),
    supabase
      .from('agencies')
      .select('*', { head: true, count: 'exact' })
      .gte('created_at', startOfMonth.toISOString()),
    supabase
      .from('agencies')
      .select('*', { head: true, count: 'exact' })
      .gte('created_at', startOfPrevMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString()),
    supabase
      .from('subscription_payments')
      .select('amount')
      .gte('payment_date', new Date(new Date().setHours(0,0,0,0)).toISOString())
      .eq('status', 'completed'),
    supabase
      .from('subscription_payments')
      .select('amount')
      .eq('status', 'completed'),
    supabase
      .from('platform_settings')
      .select('setting_key, setting_value')
      .eq('category', 'subscription'),
  ]);

  const [
    pendingRes,
    totalAgenciesRes,
    approvedAgenciesRes,
    agenciesRes,
    totalPropertiesRes,
    totalContractsRes,
    agenciesCurrentMonthRes,
    agenciesPreviousMonthRes,
    todayPaymentsRes,
    allTimePaymentsRes,
    settingsRes
  ] = responses;

  const errors = responses.map(r => r.error).filter(Boolean);

  if (errors.length > 0) {
    console.error('Erreur lors de la récupération des stats:', errors[0]);
    throw errors[0];
  }

  const todayPayments = todayPaymentsRes.data || [];
  const todayRevenue = todayPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  const allTimePayments = allTimePaymentsRes.data || [];
  const totalCollectedRevenue = allTimePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Calculer les revenus à partir des agences opérationnelles (actives + essai)
  const agencies = agenciesRes.data ?? [];
  const operationalAgencies = agencies.filter((a: any) =>
    (a.subscription_status === 'active' || a.subscription_status === 'trial')
  );

  // Récupérer les prix des plans depuis les paramètres ou utiliser les défauts
  const settings = (settingsRes.data || []).reduce((acc: any, s: any) => {
    acc[s.setting_key] = s.setting_value;
    return acc;
  }, {});

  const prices = {
    basic: Number(settings.subscription_basic_price) || 25000,
    premium: Number(settings.subscription_premium_price) || 50000,
    enterprise: Number(settings.subscription_enterprise_price) || 100000,
  };

  // Pour le compte des agences "actives", on se base sur les agences opérationnelles
  const activeAgenciesCount = operationalAgencies.length;

  // Revenu Mensuel Potentiel (MRR)
  // On utilise le prix actuel du pack s'il est supérieur au monthly_fee enregistré (cas de migration)
  const subscriptionRevenue = operationalAgencies.reduce((sum: number, agency: any) => {
    const planType = (agency.plan_type || 'basic') as keyof typeof prices;
    const standardPrice = prices[planType] || prices.basic;
    
    // Si l'agence a un monthly_fee inférieur au tarif standard du pack, on prend le standard 
    // pour le calcul du potentiel réel de la plateforme
    const effectiveFee = Math.max(agency.monthly_fee || 0, standardPrice);
    
    return sum + effectiveFee;
  }, 0);

  const currentMonthAgencies = agenciesCurrentMonthRes.count ?? 0;
  const previousMonthAgencies = agenciesPreviousMonthRes.count ?? 0;
  const monthlyGrowthRaw = previousMonthAgencies === 0
    ? (currentMonthAgencies > 0 ? 100 : 0)
    : ((currentMonthAgencies - previousMonthAgencies) / previousMonthAgencies) * 100;

  return {
    pendingRequests: pendingRes.count ?? 0,
    approvedAgencies: approvedAgenciesRes.count ?? 0,
    totalAgencies: totalAgenciesRes.count ?? 0,
    activeAgencies: activeAgenciesCount,
    totalRevenue: totalCollectedRevenue, // Revenu Réel historique
    todayRevenue,
    monthlyGrowth: Math.round(monthlyGrowthRaw * 10) / 10,
    subscriptionRevenue, // Revenu Mensuel Potentiel (MRR)
    totalProperties: totalPropertiesRes.count ?? 0,
    totalContracts: totalContractsRes.count ?? 0,
  };
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
