import { supabase } from './config';
export { supabase };
import { formatSbError } from './helpers';
import { DashboardStats } from '../types/db';
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
import { MonthlyRevenueItem, RentReceiptSummary } from '../types/contracts';

export const dbService = {
  async getDashboardStats(agencyId: string): Promise<DashboardStats> {
    try {
      if (!agencyId) {
        throw new Error('agencyId manquant');
      }

      const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

      const [
        { count: totalProperties, error: propertiesError },
        { count: totalOwners, error: ownersError },
        { count: totalTenants, error: tenantsError },
        { count: totalContracts, error: contractsError },
        { data: rentReceipts, error: receiptsError },
        { count: activeContracts, error: activeContractsError },
        { count: occupiedProperties, error: occupiedPropertiesError },
      ] = await Promise.all([
        supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        supabase
          .from('owners')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        supabase
          .from('tenants')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId),
        // RPC sans cast restrictif - retourne { data: RentReceiptSummary[], error }
        supabase.rpc('get_rent_receipts_by_agency', {
          p_agency_id: agencyId,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
        }),
        supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .in('status', ['active', 'renewed', 'draft'])
          .eq('type', 'location'),
        supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('is_available', false),
      ]);

      if (propertiesError) throw new Error(formatSbError('❌ properties.count', propertiesError));
      if (ownersError) throw new Error(formatSbError('❌ owners.count', ownersError));
      if (tenantsError) throw new Error(formatSbError('❌ tenants.count', tenantsError));
      if (contractsError) throw new Error(formatSbError('❌ contracts.count', contractsError));
      if (receiptsError) throw new Error(formatSbError('❌ rent_receipts.rpc', receiptsError));
      if (activeContractsError) throw new Error(formatSbError('❌ contracts.count (active)', activeContractsError));
      if (occupiedPropertiesError) throw new Error(formatSbError('❌ properties.count (occupied)', occupiedPropertiesError));

      // Reduce corrigé : utilise RentReceiptSummary et somme number
      const monthlyRevenue = Array.isArray(rentReceipts)  // TS infère RentReceiptSummary[]
        ? rentReceipts.reduce((sum: number, r: RentReceiptSummary) => sum + (r.total_amount || 0), 0)
        : 0;  // Fix TS2769 et TS2322

      const safeTotalProperties = totalProperties ?? 0;
      const safeOccupiedProperties = occupiedProperties ?? 0;

      const occupancyRate =
        safeTotalProperties > 0
          ? (safeOccupiedProperties / safeTotalProperties) * 100
          : 0;

      return {
        totalProperties: totalProperties || 0,
        totalOwners: totalOwners || 0,
        totalTenants: totalTenants || 0,
        totalContracts: totalContracts || 0,
        monthlyRevenue,
        activeContracts: activeContracts || 0,
        occupancyRate: Number(occupancyRate.toFixed(2)),
      };
    } catch (err) {
      console.error('getDashboardStats error:', err);
      throw new Error(formatSbError('❌ getDashboardStats', err));
    }
  },

  // Remplace getMonthlyRevenue
  async getMonthlyRevenue(agencyId: string, months: number = 6): Promise<MonthlyRevenueItem[]> {
    try {
      if (!agencyId) {
        throw new Error('agencyId manquant');
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12
      const startMonth = currentMonth - months + 1;
      const startYear = startMonth <= 0 ? currentYear - 1 : currentYear;
      const adjustedStartMonth = startMonth <= 0 ? startMonth + 12 : startMonth;

      // RPC sans dates (filtre client)
      const { data: receipts, error: rpcError } = await supabase.rpc('get_rent_receipts_by_agency', {
        p_agency_id: agencyId,
        p_start_date: null,
        p_end_date: null,
      });

      if (rpcError) throw new Error(formatSbError('❌ rent_receipts.rpc', rpcError));  // Fix TS2339

      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      const result: MonthlyRevenueItem[] = [];
      for (let i = 0; i < months; i++) {
        const month = ((adjustedStartMonth + i - 1) % 12) + 1;
        const year = startYear + Math.floor(((adjustedStartMonth + i - 1) / 12));
        const monthData = Array.isArray(receipts)
          ? receipts.filter((r: RentReceiptSummary) => r.period_year === year && r.period_month === month)
          : [];
        const revenue = monthData.reduce((sum: number, r: RentReceiptSummary) => sum + (r.total_amount || 0), 0);
        result.push({
          month: monthNames[month - 1],
          revenue,
          commissions: revenue * 0.1, // 10% commission (ajuste si needed)
        });
      }

      return result.reverse();
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
  financialStatements: financialStatementsService,
  messages: messagesService,
  auditLogs: auditLogsService,
  notifications: notificationsService,
  notificationSettings: notificationSettingsService,
  systemAlerts: systemAlertsService,
  inventories: inventoriesService,
};
