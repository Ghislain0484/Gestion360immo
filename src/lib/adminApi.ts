import { PlatformStats } from "../types/db";
import { supabase } from "./config";

export async function getPlatformStats(): Promise<PlatformStats> {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [
    pendingRes,
    totalAgenciesRes,
    approvedAgenciesRes,
    activeSubscriptionsRes,
    totalPropertiesRes,
    totalContractsRes,
    paymentsRes,
    agenciesCurrentMonthRes,
    agenciesPreviousMonthRes,
  ] = await Promise.all([
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
    supabase
      .from('agency_subscriptions')
      .select('*', { head: true, count: 'exact' })
      .in('status', ['active', 'trial']),
    supabase
      .from('properties')
      .select('*', { head: true, count: 'exact' }),
    supabase
      .from('contracts')
      .select('*', { head: true, count: 'exact' }),
    supabase
      .from('subscription_payments')
      .select('amount, payment_date')
      .eq('status', 'completed'),
    supabase
      .from('agencies')
      .select('*', { head: true, count: 'exact' })
      .gte('created_at', startOfMonth.toISOString()),
    supabase
      .from('agencies')
      .select('*', { head: true, count: 'exact' })
      .gte('created_at', startOfPrevMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString()),
  ]);

  const errors = [
    pendingRes.error,
    totalAgenciesRes.error,
    approvedAgenciesRes.error,
    activeSubscriptionsRes.error,
    totalPropertiesRes.error,
    totalContractsRes.error,
    paymentsRes.error,
    agenciesCurrentMonthRes.error,
    agenciesPreviousMonthRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  const payments = paymentsRes.data ?? [];
  const totalRevenue = payments.reduce((sum: number, payment: { amount?: number | null }) => sum + (payment.amount ?? 0), 0);
  const subscriptionRevenue = payments.reduce((sum: number, payment: { amount?: number | null; payment_date?: string | null }) => {
    if (!payment.payment_date) return sum;
    const paymentDate = new Date(payment.payment_date);
    if (paymentDate >= startOfMonth && paymentDate < startOfNextMonth) {
      return sum + (payment.amount ?? 0);
    }
    return sum;
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
    activeAgencies: activeSubscriptionsRes.count ?? approvedAgenciesRes.count ?? 0,
    totalRevenue,
    monthlyGrowth: Math.round(monthlyGrowthRaw * 10) / 10,
    subscriptionRevenue,
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

// Optionnel : approuver et crÃ©er une agence
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

