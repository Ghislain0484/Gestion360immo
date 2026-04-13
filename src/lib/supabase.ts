import { supabase } from './config';
export { supabase };
import { formatSbError } from './helpers';
import { DashboardStats, PropertyExpense } from '../types/db';
import { propertiesService } from './db/propertiesService';
import { contractsService } from './db/contractsService';
import { contractTemplatesService } from './db/contractTemplatesService';
import { contractVersionsService } from './db/contractVersionsService';
import { managedContractsService } from './db/managedContractsService';
import { propertyTenantAssignmentsService } from './db/propertyTenantAssignmentsService';
import { ownersService } from './db/ownersService';
import { tenantsService } from './db/tenantsService';
import { usersService } from './db/usersService';
import { platformAdminsService } from './db/platformAdminsService';
import { platformSettingsService } from './db/platformSettingsService';
import { agenciesService } from './db/agenciesService';
import { agencyUsersService } from './db/agencyUsersService';
import { agencyRegistrationRequestsService } from './db/agencyRegistrationRequestsService';
import { agencySubscriptionsService } from './db/agencySubscriptionsService';
import { subscriptionPaymentsService } from './db/subscriptionPaymentsService';
import { agencyRankingsService } from './db/agencyRankingsService';
import { announcementsService } from './db/announcementsService';
import { announcementInterestsService } from './db/announcementInterestsService';
import { rentReceiptsService } from './db/rentReceiptsService';
import { financialStatementsService } from './db/financialStatementsService';
import { messagesService } from './db/messagesService';
import { auditLogsService } from './db/auditLogsService';
import { systemAlertsService } from './db/systemAlertsService';
import { notificationsService } from './db/notificationsService';
import { notificationSettingsService } from './db/notificationSettingsService';
import { inventoriesService } from './db/inventoriesService';
import { modularService } from './db/modularService';
import { MonthlyRevenueItem } from '../types/contracts';

// Property Expenses Service (Phase 9)
export const propertyExpensesService = {
  async getAll(filters?: { property_id?: string; agency_id?: string; owner_id?: string; status?: string }) {
    let query = supabase.from('property_expenses').select('*');
    if (filters?.property_id) query = query.eq('property_id', filters.property_id);
    if (filters?.agency_id) query = query.eq('agency_id', filters.agency_id);
    if (filters?.owner_id) {
      // Need a join or filtering by property_id list if owner_id is not directly in table
      // Actually, let's assume we fetch properties first, then pass ids.
      // Or better, if the table has owner_id (let's check).
      query = query.eq('owner_id', filters.owner_id);
    }
    if (filters?.status) query = query.eq('status', filters.status);
    const { data, error } = await query.order('expense_date', { ascending: false });
    if (error) throw error;
    return data;
  },
  async create(expense: Partial<PropertyExpense>) {
    const { data, error } = await supabase.from('property_expenses').insert([expense]).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, updates: Partial<PropertyExpense>) {
    const { data, error } = await supabase.from('property_expenses').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  async markAsDeducted(expenseIds: string[], receiptId: string) {
    const { error } = await supabase
      .from('property_expenses')
      .update({ status: 'deducted', receipt_id: receiptId })
      .in('id', expenseIds);
    if (error) throw error;
  },
  async delete(id: string) {
    const { error } = await supabase.from('property_expenses').delete().eq('id', id);
    if (error) throw error;
  }
};

export const dbService = {
  async getDashboardStats(agencyId: string): Promise<DashboardStats> {
    try {
      if (!agencyId) {
        throw new Error('agencyId manquant');
      }

      // Utilisation du nouveau RPC optimisé pour tout récupérer en une seule requête
      const { data, error } = await supabase.rpc('get_dashboard_stats_v3', {
        p_agency_id: agencyId
      });

      if (error) {
        console.warn('⚠️ get_dashboard_stats_v3 non trouvé ou erreur, repli sur l\'ancienne méthode:', error);
        // Fallback technique (ancienne méthode) pour éviter de bloquer l'utilisateur si le SQL n'est pas encore appliqué
        return this.getDashboardStatsLegacy(agencyId);
      }

      return data as DashboardStats;
    } catch (err) {
      console.error('getDashboardStats error:', err);
      throw new Error(formatSbError('❌ getDashboardStats', err));
    }
  },

  /** 
   * Ancienne méthode de calcul (Backend Fallback)
   * À conserver temporairement pendant la migration
   */
  async getDashboardStatsLegacy(agencyId: string): Promise<DashboardStats> {
    const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const [
      { count: totalProperties },
      { count: totalOwners },
      { count: totalTenants },
      { count: totalContracts },
      { data: rentReceipts },
      { data: activeContractsData, count: activeContractsCount },
      modularTransactions,
    ] = await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId),
      supabase.from('owners').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId),
      supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId),
      supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('agency_id', agencyId),
      supabase.rpc('get_rent_receipts_by_agency', {
        p_agency_id: agencyId,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      }),
      supabase.from('contracts').select('property_id, monthly_rent, type', { count: 'exact' })
        .eq('agency_id', agencyId).in('status', ['active', 'renewed']),
      modularService.getAgencyTransactions(agencyId, startDate.toISOString(), endDate.toISOString()),
    ]);

    const rentRevenue = Array.isArray(rentReceipts)
      ? rentReceipts.reduce((sum: number, r: any) => sum + (Number(r.rent_amount) || 0) + (Number(r.charges) || 0) + (Number(r.agency_fees) || 0), 0)
      : 0;

    const totalDeposits = Array.isArray(rentReceipts)
      ? rentReceipts.reduce((sum: number, r: any) => sum + (r.deposit_amount || 0), 0)
      : 0;

    const rentEarnings = Array.isArray(rentReceipts)
      ? rentReceipts.reduce((sum: number, r: any) => sum + (Number(r.commission_amount) || 0) + (Number(r.agency_fees) || 0), 0)
      : 0;

    const modularTxs = Array.isArray(modularTransactions) ? modularTransactions : [];
    const modularRevenue = modularTxs.reduce((sum: number, tx: any) => {
      const isEarned = (tx.type === 'income' || tx.type === 'credit') && !['caution', 'deposit', 'payout'].includes((tx.category || '').toLowerCase());
      return isEarned ? sum + Number(tx.amount || 0) : sum;
    }, 0);

    const modularEarnings = modularTxs.reduce((sum: number, tx: any) => {
      const isFee = ['agency_fees', 'commission', 'fees', 'honoraires', 'frais'].includes((tx.category || '').toLowerCase());
      return isFee ? sum + Number(tx.amount || 0) : sum;
    }, 0);

    const expectedRevenue = Array.isArray(activeContractsData)
      ? activeContractsData.filter((c: any) => c.type === 'location').reduce((sum: number, c: any) => sum + (c.monthly_rent || 0), 0)
      : 0;

    const safeTotalProperties = totalProperties ?? 0;
    const safeOccupiedProperties = new Set((activeContractsData || []).filter((c: any) => c.type === 'location').map((c: any) => c.property_id)).size;

    return {
      totalProperties: totalProperties || 0,
      totalOwners: totalOwners || 0,
      totalTenants: totalTenants || 0,
      totalContracts: totalContracts || 0,
      monthlyRevenue: rentRevenue + modularRevenue,
      expectedRevenue,
      remainingRevenue: Math.max(0, expectedRevenue - rentRevenue),
      activeContracts: activeContractsCount || 0,
      occupancyRate: Number((safeTotalProperties > 0 ? (safeOccupiedProperties / safeTotalProperties) * 100 : 0).toFixed(2)),
      totalDeposits,
      agencyEarnings: rentEarnings + modularEarnings,
    };
  },

  // Remplace getMonthlyRevenue
  async getMonthlyRevenue(agencyId: string, months: number = 6): Promise<MonthlyRevenueItem[]> {
    try {
      if (!agencyId) {
        throw new Error('agencyId manquant');
      }

      const now = new Date();
      // Calculate start of range
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month

      // 1. Fetch Receipts with date filter
      // 2. Fetch Modular Transactions with same date range
      const [
        { data: receipts, error: rpcError },
        modularTransactions
      ] = await Promise.all([
        supabase.rpc('get_rent_receipts_by_agency', {
          p_agency_id: agencyId,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
        }),
        modularService.getAgencyTransactions(
          agencyId,
          startDate.toISOString(),
          endDate.toISOString()
        )
      ]);

      if (rpcError) throw new Error(formatSbError('❌ rent_receipts.rpc', rpcError));

      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      const result: MonthlyRevenueItem[] = [];

      // Iterate through months to build the buckets
      for (let i = 0; i < months; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        // Filter receipts for this month
        // Note: RPC returns period_month/period_year which are the business period, not necessarily payment_date
        const monthlyReceipts = Array.isArray(receipts)
          ? receipts.filter((r: any) => r.period_year === y && r.period_month === m)
          : [];

        // Filter modular transactions for this month (using transaction_date)
        const monthlyModular = Array.isArray(modularTransactions)
          ? modularTransactions.filter((tx: any) => {
              const txDate = new Date(tx.transaction_date);
              return txDate.getFullYear() === y && (txDate.getMonth() + 1) === m;
            })
          : [];

        const rentRev = monthlyReceipts.reduce((sum: number, r: any) => sum + (r.rent_amount || 0) + (r.charges || 0) + (r.agency_fees || 0), 0);
        const modularRev = monthlyModular.reduce((sum: number, tx: any) => {
          const isEarned = (tx.type === 'income' || tx.type === 'credit') && 
                          !['caution', 'deposit', 'payout'].includes((tx.category || '').toLowerCase());
          return isEarned ? sum + Number(tx.amount || 0) : sum;
        }, 0);

        const rentComms = monthlyReceipts.reduce((sum: number, r: any) => sum + (Number(r.commission_amount) || 0) + (Number(r.agency_fees) || 0), 0);
        const modularComms = monthlyModular.reduce((sum: number, tx: any) => {
          const isFee = ['agency_fees', 'commission', 'fees', 'honoraires', 'frais'].includes((tx.category || '').toLowerCase());
          return isFee ? sum + Number(tx.amount || 0) : sum;
        }, 0);
        
        result.push({
          month: monthNames[d.getMonth()],
          revenue: rentRev + modularRev,
          commissions: rentComms + modularComms,
        });
      }

      // Return in chronological order (oldest to newest for the chart)
      return result;
    } catch (err) {
      console.error('getMonthlyRevenue error:', err);
      throw new Error(formatSbError('❌ getMonthlyRevenue', err));
    }
  },

  users: usersService,
  platformAdmins: platformAdminsService,
  platformSettings: platformSettingsService,
  agencies: agenciesService,
  agencyUsers: agencyUsersService,
  agencyRegistrationRequests: agencyRegistrationRequestsService,
  agencySubscriptions: agencySubscriptionsService,
  subscriptionPayments: subscriptionPaymentsService,
  agencyRankings: agencyRankingsService,
  owners: ownersService,
  tenants: tenantsService,
  properties: propertiesService,
  managedContracts: managedContractsService,
  contractTemplates: contractTemplatesService,
  contractVersions: contractVersionsService,
  propertyTenantAssignments: propertyTenantAssignmentsService,
  announcements: announcementsService,
  announcementInterests: announcementInterestsService,
  contracts: contractsService,
  rentReceipts: rentReceiptsService,
  propertyExpenses: propertyExpensesService,
  financials: financialStatementsService,
  messages: messagesService,
  auditLogs: auditLogsService,
  notifications: notificationsService,
  notificationSettings: notificationSettingsService,
  systemAlerts: systemAlertsService,
  inventories: inventoriesService,
  modular: modularService,
};
