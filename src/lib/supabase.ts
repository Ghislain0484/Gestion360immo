import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
    Agency,
    AgencyUser,
    AgencyRegistrationRequest,
    AgencySubscription,
    SubscriptionPayment,
    AgencyRanking,
    Owner,
    Tenant,
    Property,
    Announcement,
    AnnouncementInterest,
    Contract,
    RentReceipt,
    FinancialStatement,
    Message,
    Notification,
    PlatformSetting,
    AuditLog,
    User,
    PlatformAdmin,
    AgencyUserRole,
    UserPermissions,
    EmailNotification,
    TenantFilters,
    RentReceiptWithContract,
} from "../types/db";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
    throw new Error('Configuration Supabase manquante');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'supabase.auth.token',
    },
});

// --- Helpers généraux ---
const nilIfEmpty = <T>(value: T): T | null => {
    if (value === '' || value === undefined || value === null) return null;
    return value;
};

export function formatSbError(prefix: string, error: any) {
    const parts = [prefix];
    if (error?.code) parts.push(`code=${error.code}`);
    if (error?.message) parts.push(`msg=${error.message}`);
    return parts.join(" | ");
}

async function logAuthContext(tag: string) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.warn(`🔑 ${tag} getSession error:`, error);
        return { user: null, token: null };
    }
    return { user: session?.user ?? null, token: session?.access_token ?? null };
}

export function isRlsDenied(err: any): boolean {
    const msg = (err?.message || "").toLowerCase();
    return err?.code === "42501" || msg.includes("row-level security");
}

// Normalizers pour chaque entité (basés sur le schéma)
const normalizeUser = (u: Partial<User>) => ({
    email: nilIfEmpty(u.email),
    first_name: nilIfEmpty(u.first_name),
    last_name: nilIfEmpty(u.last_name),
    avatar: nilIfEmpty(u.avatar),
    is_active: u.is_active ?? true,
    permissions: u.permissions ?? {
        dashboard: true,
        properties: false,
        owners: false,
        tenants: false,
        contracts: false,
        collaboration: false,
        reports: false,
        notifications: true,
        settings: false,
        userManagement: false,
    },
    created_at: u.created_at ?? new Date().toISOString(),
    updated_at: u.updated_at ?? new Date().toISOString(),
});

const normalizePlatformAdmin = (pa: Partial<PlatformAdmin>) => ({
    user_id: nilIfEmpty(pa.user_id),
    role: nilIfEmpty(pa.role),
    permissions: pa.permissions ?? {},
    is_active: pa.is_active ?? true,
    last_login: nilIfEmpty(pa.last_login),
});

const normalizeAgency = (a: Partial<Agency>) => ({
    name: nilIfEmpty(a.name),
    commercial_register: nilIfEmpty(a.commercial_register),
    logo_url: nilIfEmpty(a.logo_url),
    is_accredited: a.is_accredited ?? false,
    accreditation_number: nilIfEmpty(a.accreditation_number),
    address: nilIfEmpty(a.address),
    city: nilIfEmpty(a.city),
    phone: nilIfEmpty(a.phone),
    email: nilIfEmpty(a.email),
    director_id: nilIfEmpty(a.director_id),
    status: nilIfEmpty(a.status) ?? 'approved',
});

const normalizeAgencyUser = (au: Partial<AgencyUser>) => ({
    user_id: nilIfEmpty(au.user_id),
    agency_id: nilIfEmpty(au.agency_id),
    role: nilIfEmpty(au.role),
});

const normalizeAgencyRegistrationRequest = (arr: Partial<AgencyRegistrationRequest>) => ({
    agency_name: nilIfEmpty(arr.agency_name),
    commercial_register: nilIfEmpty(arr.commercial_register),
    director_first_name: nilIfEmpty(arr.director_first_name),
    director_last_name: nilIfEmpty(arr.director_last_name),
    director_email: nilIfEmpty(arr.director_email),
    phone: nilIfEmpty(arr.phone),
    city: nilIfEmpty(arr.city),
    address: nilIfEmpty(arr.address),
    logo_url: nilIfEmpty(arr.logo_url),
    is_accredited: arr.is_accredited ?? false,
    accreditation_number: nilIfEmpty(arr.accreditation_number),
    status: nilIfEmpty(arr.status) ?? 'pending',
    admin_notes: nilIfEmpty(arr.admin_notes),
    processed_by: nilIfEmpty(arr.processed_by),
    processed_at: nilIfEmpty(arr.processed_at),
    director_password: nilIfEmpty(arr.director_password),
    director_auth_user_id: nilIfEmpty(arr.director_auth_user_id),
});

const normalizeAgencySubscription = (as: Partial<AgencySubscription>) => ({
    agency_id: nilIfEmpty(as.agency_id),
    plan_type: nilIfEmpty(as.plan_type) ?? 'basic',
    status: nilIfEmpty(as.status) ?? 'trial',
    monthly_fee: as.monthly_fee ?? 25000,
    start_date: nilIfEmpty(as.start_date) ?? new Date().toISOString().split('T')[0],
    end_date: nilIfEmpty(as.end_date),
    last_payment_date: nilIfEmpty(as.last_payment_date),
    next_payment_date: nilIfEmpty(as.next_payment_date),
    trial_days_remaining: as.trial_days_remaining ?? 30,
    payment_history: as.payment_history ?? [],
});

const normalizeSubscriptionPayment = (sp: Partial<SubscriptionPayment>) => ({
    subscription_id: nilIfEmpty(sp.subscription_id),
    amount: sp.amount ?? 0,
    payment_date: nilIfEmpty(sp.payment_date) ?? new Date().toISOString().split('T')[0],
    payment_method: nilIfEmpty(sp.payment_method),
    reference_number: nilIfEmpty(sp.reference_number),
    status: nilIfEmpty(sp.status) ?? 'completed',
    processed_by: nilIfEmpty(sp.processed_by),
    notes: nilIfEmpty(sp.notes),
});

const normalizeAgencyRanking = (ar: Partial<AgencyRanking>) => ({
    agency_id: nilIfEmpty(ar.agency_id),
    year: ar.year ?? new Date().getFullYear(),
    rank: ar.rank ?? 0,
    total_score: ar.total_score ?? 0,
    volume_score: ar.volume_score ?? 0,
    recovery_rate_score: ar.recovery_rate_score ?? 0,
    satisfaction_score: ar.satisfaction_score ?? 0,
    metrics: ar.metrics ?? {},
    rewards: ar.rewards ?? [],
});

const normalizeOwner = (o: Partial<Owner>) => ({
    agency_id: nilIfEmpty(o.agency_id),
    first_name: nilIfEmpty(o.first_name),
    last_name: nilIfEmpty(o.last_name),
    phone: nilIfEmpty(o.phone),
    email: nilIfEmpty(o.email),
    address: nilIfEmpty(o.address),
    city: nilIfEmpty(o.city),
    property_title: nilIfEmpty(o.property_title),
    property_title_details: nilIfEmpty(o.property_title_details),
    marital_status: nilIfEmpty(o.marital_status),
    spouse_name: nilIfEmpty(o.spouse_name),
    spouse_phone: nilIfEmpty(o.spouse_phone),
    children_count: o.children_count ?? 0,
    created_at: o.created_at ?? new Date().toISOString(),
    updated_at: o.updated_at ?? new Date().toISOString(),
});

const normalizeTenant = (t: Partial<Tenant>) => ({
    agency_id: nilIfEmpty(t.agency_id),
    first_name: nilIfEmpty(t.first_name),
    last_name: nilIfEmpty(t.last_name),
    phone: nilIfEmpty(t.phone),
    email: nilIfEmpty(t.email),
    address: nilIfEmpty(t.address),
    city: nilIfEmpty(t.city),
    marital_status: nilIfEmpty(t.marital_status),
    spouse_name: nilIfEmpty(t.spouse_name),
    spouse_phone: nilIfEmpty(t.spouse_phone),
    children_count: t.children_count ?? 0,
    profession: nilIfEmpty(t.profession),
    nationality: nilIfEmpty(t.nationality),
    photo_url: nilIfEmpty(t.photo_url),
    id_card_url: nilIfEmpty(t.id_card_url),
    payment_status: nilIfEmpty(t.payment_status),
});

const normalizeProperty = (p: Partial<Property>) => ({
    agency_id: nilIfEmpty(p.agency_id),
    owner_id: nilIfEmpty(p.owner_id),
    title: nilIfEmpty(p.title),
    description: nilIfEmpty(p.description),
    location: p.location ?? {},
    details: p.details ?? {},
    standing: nilIfEmpty(p.standing),
    rooms: p.rooms ?? [],
    images: p.images ?? [],
    is_available: p.is_available ?? true,
    for_sale: p.for_sale ?? false,
    for_rent: p.for_rent ?? true,
});

const normalizeAnnouncement = (a: Partial<Announcement>) => ({
    agency_id: nilIfEmpty(a.agency_id),
    property_id: nilIfEmpty(a.property_id),
    title: nilIfEmpty(a.title),
    description: nilIfEmpty(a.description),
    type: nilIfEmpty(a.type),
    is_active: a.is_active ?? true,
    expires_at: nilIfEmpty(a.expires_at),
    views: a.views ?? 0,
});

const normalizeAnnouncementInterest = (ai: Partial<AnnouncementInterest>) => ({
    announcement_id: nilIfEmpty(ai.announcement_id),
    agency_id: nilIfEmpty(ai.agency_id),
    user_id: nilIfEmpty(ai.user_id),
    message: nilIfEmpty(ai.message),
    status: nilIfEmpty(ai.status) ?? 'pending',
});

const normalizeContract = (c: Partial<Contract>) => ({
    agency_id: nilIfEmpty(c.agency_id),
    property_id: nilIfEmpty(c.property_id),
    owner_id: nilIfEmpty(c.owner_id),
    tenant_id: nilIfEmpty(c.tenant_id),
    type: nilIfEmpty(c.type),
    start_date: nilIfEmpty(c.start_date),
    end_date: nilIfEmpty(c.end_date),
    monthly_rent: nilIfEmpty(c.monthly_rent),
    sale_price: nilIfEmpty(c.sale_price),
    deposit: nilIfEmpty(c.deposit),
    charges: nilIfEmpty(c.charges),
    commission_rate: c.commission_rate ?? 10.0,
    commission_amount: c.commission_amount ?? 0,
    status: nilIfEmpty(c.status),
    terms: nilIfEmpty(c.terms),
    documents: c.documents ?? [],
});

const normalizeRentReceipt = (rr: Partial<RentReceipt>) => ({
    receipt_number: nilIfEmpty(rr.receipt_number) ?? undefined,
    contract_id: nilIfEmpty(rr.contract_id) ?? undefined,
    period_month: rr.period_month ?? "Janvier",
    period_year: rr.period_year ?? new Date().getFullYear(),
    rent_amount: rr.rent_amount ?? 0,
    charges: rr.charges ?? 0,
    total_amount: rr.total_amount ?? 0,
    commission_amount: rr.commission_amount ?? 0,
    owner_payment: rr.owner_payment ?? 0,
    payment_date: nilIfEmpty(rr.payment_date) ?? undefined,
    payment_method: nilIfEmpty(rr.payment_method) ?? "especes",
    notes: nilIfEmpty(rr.notes) ?? undefined,
    issued_by: nilIfEmpty(rr.issued_by) ?? "Agence 360 Immo",
});

const normalizeFinancialStatement = (fs: any): FinancialStatement => ({
    id: nilIfEmpty(fs.id) ?? crypto.randomUUID(),
    agency_id: nilIfEmpty(fs.agency_id),
    owner_id: nilIfEmpty(fs.owner_id) ?? nilIfEmpty(fs.tenant_id),
    tenant_id: nilIfEmpty(fs.tenant_id),
    entity_type: nilIfEmpty(fs.entity_type) ?? (fs.owner_id ? 'owner' : 'tenant'),
    period: {
        start_date: nilIfEmpty(fs.period?.startDate ?? fs.period?.start_date) ?? new Date().toISOString(),
        end_date: nilIfEmpty(fs.period?.endDate ?? fs.period?.end_date) ?? new Date().toISOString(),
    },
    summary: {
        total_income: fs.summary?.totalIncome ?? fs.summary?.total_income ?? 0,
        total_expenses: fs.summary?.totalExpenses ?? fs.summary?.total_expenses ?? 0,
        balance: fs.summary?.netBalance ?? fs.summary?.balance ?? 0,
        pending_payments: fs.summary?.pendingPayments ?? fs.summary?.pending_payments ?? 0,
    },
    transactions: (fs.transactions ?? []).map((t: any) => ({
        id: nilIfEmpty(t.id) ?? crypto.randomUUID(),
        date: nilIfEmpty(t.transactionDate ?? t.date) ?? new Date().toISOString(),
        description: nilIfEmpty(t.description) ?? 'Unknown',
        category: nilIfEmpty(t.category) ?? 'Other',
        type: nilIfEmpty(t.type) ?? 'expense',
        amount: t.amount ?? 0,
        property_id: nilIfEmpty(t.propertyId ?? t.property_id),
    })),
    generated_by: nilIfEmpty(fs.generated_by),
    generated_at: nilIfEmpty(fs.generatedAt ?? fs.generated_at) ?? new Date().toISOString(),
    created_at: nilIfEmpty(fs.created_at) ?? '',
    updated_at: nilIfEmpty(fs.updated_at) ?? '',
});

const normalizeMessage = (m: Partial<Message>) => ({
    sender_id: nilIfEmpty(m.sender_id),
    receiver_id: nilIfEmpty(m.receiver_id),
    agency_id: nilIfEmpty(m.agency_id),
    property_id: nilIfEmpty(m.property_id),
    announcement_id: nilIfEmpty(m.announcement_id),
    subject: nilIfEmpty(m.subject),
    content: nilIfEmpty(m.content),
    is_read: m.is_read ?? false,
    attachments: m.attachments ?? [],
    created_at: nilIfEmpty(m.created_at),
});

const normalizeNotification = (n: Partial<Notification>) => ({
    user_id: nilIfEmpty(n.user_id),
    type: nilIfEmpty(n.type),
    title: nilIfEmpty(n.title),
    message: nilIfEmpty(n.message),
    data: n.data ?? {},
    is_read: n.is_read ?? false,
    priority: nilIfEmpty(n.priority),
    created_at: nilIfEmpty(n.created_at),
});

const normalizePlatformSetting = (ps: Partial<PlatformSetting>) => ({
    setting_key: nilIfEmpty(ps.setting_key),
    setting_value: ps.setting_value ?? {},
    description: nilIfEmpty(ps.description),
    category: nilIfEmpty(ps.category) ?? 'general',
    is_public: ps.is_public ?? false,
    updated_by: nilIfEmpty(ps.updated_by),
});

const normalizeAuditLog = (al: Partial<AuditLog>) => {
    const ipRegex = /^(?:(?:[0-9]{1,3}\.){3}[0-9]{1,3}|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})$/;
    const ip_address = al.ip_address && ipRegex.test(al.ip_address) ? al.ip_address : '0.0.0.0';
    return {
        user_id: nilIfEmpty(al.user_id),
        action: nilIfEmpty(al.action),
        table_name: nilIfEmpty(al.table_name),
        record_id: nilIfEmpty(al.record_id),
        old_values: al.old_values ?? null,
        new_values: al.new_values ?? null,
        ip_address,
        user_agent: nilIfEmpty(al.user_agent),
    };
}
const normalizeEmailNotification = (en: Partial<EmailNotification>) => ({
    id: nilIfEmpty(en.id),
    type: nilIfEmpty(en.type),
    recipient: nilIfEmpty(en.recipient),
    subject: nilIfEmpty(en.subject),
    content: nilIfEmpty(en.content),
    status: nilIfEmpty(en.status) ?? 'pending',
    sent_at: nilIfEmpty(en.sent_at),
    agency_id: nilIfEmpty(en.agency_id),
    created_at: nilIfEmpty(en.created_at) ?? new Date().toISOString(),
});

// ======================================================
// ================   DB SERVICE   ======================
// ======================================================
export const dbService = {
    // ----------------- Dashboard Stats -----------------
    async getDashboardStats(agencyId: string): Promise<{
        totalProperties: number;
        totalOwners: number;
        totalTenants: number;
        totalContracts: number;
        monthlyRevenue: number;
        activeContracts: number;
        occupancyRate: number;
    }> {
        try {
            const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

            const [
                { count: totalProperties, error: propertiesError },
                { count: totalOwners, error: ownersError },
                { count: totalTenants, error: tenantsError },
                { count: totalContracts, error: contractsError },
                { data: rentReceiptsRaw, error: receiptsError },
                { count: activeContracts, error: activeContractsError },
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

                supabase
                    .from('rent_receipts')
                    .select('total_amount, contract(agency_id)')
                    .gte('payment_date', startDate.toISOString())
                    .lte('payment_date', endDate.toISOString()) as unknown as {
                        data: RentReceiptWithContract[] | null;
                        error: any;
                    },

                supabase
                    .from('contracts')
                    .select('*', { count: 'exact', head: true })
                    .eq('agency_id', agencyId)
                    .eq('status', 'active'),
            ]);

            // Gestion des erreurs
            if (propertiesError) throw new Error(formatSbError('❌ properties.count', propertiesError));
            if (ownersError) throw new Error(formatSbError('❌ owners.count', ownersError));
            if (tenantsError) throw new Error(formatSbError('❌ tenants.count', tenantsError));
            if (contractsError) throw new Error(formatSbError('❌ contracts.count', contractsError));
            if (receiptsError) throw new Error(formatSbError('❌ rent_receipts.select', receiptsError));
            if (activeContractsError) throw new Error(formatSbError('❌ contracts.count (active)', activeContractsError));

            // Filtrer uniquement les rent_receipts liés à l’agence
            const rentReceipts = (rentReceiptsRaw ?? []).filter(
                r => r.contract?.agency_id === agencyId
            );

            const monthlyRevenue = rentReceipts.reduce(
                (sum, r) => sum + (r.total_amount || 0),
                0
            );

            const safeTotalProperties = totalProperties ?? 0;
            const safeActiveContracts = activeContracts ?? 0;

            const occupancyRate =
                safeTotalProperties > 0
                    ? (safeActiveContracts / safeTotalProperties) * 100
                    : 0;

            return {
                totalProperties: totalProperties || 0,
                totalOwners: totalOwners || 0,
                totalTenants: totalTenants || 0,
                totalContracts: totalContracts || 0,
                monthlyRevenue,
                activeContracts: safeActiveContracts,
                occupancyRate: Number(occupancyRate.toFixed(2)),
            };
        } catch (err) {
            console.error('getDashboardStats error:', err);
            throw new Error(formatSbError('❌ getDashboardStats', err));
        }
    },

    // ----------------- USERS -----------------
    users: {
        async getCurrent(): Promise<User | null> {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
            if (error) throw new Error(formatSbError('❌ users.select (current)', error));
            return data;
        },
        countByAgency: async (agency_id: string): Promise<number> => {
            const { count, error } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('agency_id', agency_id);

            if (error) {
                console.error('Erreur count users:', error);
                return 0;
            }
            return count ?? 0;
        },
        async getAll(): Promise<User[]> {
            const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ users.select', error));
            return data ?? [];
        },
        async create(user: {
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            is_active: boolean;
            permissions: UserPermissions;
            created_at: string;
            updated_at: string;
        }) {
            try {
                console.log('Inserting user into users table:', user);
                const { data, error } = await supabase
                    .from('users')
                    .insert([user])
                    .select('*')
                    .single();
                if (error) {
                    console.error('users.insert error:', error);
                    throw new Error(`users.insert | code=${error.code} | msg=${error.message}`);
                }
                console.log('User inserted successfully:', data);
                return data;
            } catch (err) {
                console.error('Error in dbService.users.create:', err);
                throw err;
            }
        },
        async update(id: string, updates: Partial<User>): Promise<User> {
            const clean = normalizeUser(updates);
            const { data, error } = await supabase.from('users').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ users.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('users').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ users.delete', error));
            return true;
        },
        async getByAgency(agencyId: string): Promise<(User & { role: AgencyUserRole; agency_id: string | null })[]> {
            const { data, error } = await supabase
                .from('agency_users')
                .select('*, users!inner(*)')
                .eq('agency_id', agencyId)
                .order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ agency_users.select (by agency)', error));
            return data.map((au) => ({
                ...au.users,
                role: au.role,
                agency_id: au.agency_id,
            }));
        },
    },

    // ----------------- PLATFORM ADMINS -----------------
    platformAdmins: {
        async getAll(): Promise<PlatformAdmin[]> {
            const { data, error } = await supabase.from('platform_admins').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ platform_admins.select', error));
            return data ?? [];
        },
        async create(admin: Partial<PlatformAdmin>): Promise<PlatformAdmin> {
            const clean = normalizePlatformAdmin(admin);
            const { data, error } = await supabase.from('platform_admins').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ platform_admins.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<PlatformAdmin>): Promise<PlatformAdmin> {
            const clean = normalizePlatformAdmin(updates);
            const { data, error } = await supabase.from('platform_admins').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ platform_admins.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('platform_admins').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ platform_admins.delete', error));
            return true;
        },
    },

    // ----------------- AGENCIES -----------------
    agencies: {
        async getAll(): Promise<Agency[]> {
            const { data, error } = await supabase.from('agencies').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ agencies.select', error));
            return data ?? [];
        },
        async getById(id: string): Promise<Agency | null> {
            const { data, error } = await supabase.from('agencies').select('*').eq('id', id).single();
            if (error) throw new Error(formatSbError('❌ agencies.select (by id)', error));
            return data;
        },
        async create(agency: Partial<Agency>): Promise<Agency> {
            const clean = normalizeAgency(agency);
            const { data, error } = await supabase.from('agencies').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ agencies.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<Agency>): Promise<Agency> {
            const clean = normalizeAgency(updates);
            const { data, error } = await supabase.from('agencies').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ agencies.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('agencies').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ agencies.delete', error));
            return true;
        },
        async getRecent(limit: number = 5): Promise<Agency[]> {
            const { data, error } = await supabase
                .from('agencies')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw new Error(formatSbError('❌ agencies.select (recent)', error));
            return data ?? [];
        },
    },

    // ----------------- AGENCY USERS -----------------
    agencyUsers: {
        async getAll(): Promise<AgencyUser[]> {
            const { data, error } = await supabase.from('agency_users').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ agency_users.select', error));
            return data ?? [];
        },
        /*async create(agencyUser: Partial<AgencyUser>): Promise<AgencyUser> {
            const clean = normalizeAgencyUser(agencyUser);
            const { data, error } = await supabase.from('agency_users').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ agency_users.insert', error));
            return data;
        },*/
        async create(agencyUser: {
            user_id: string;
            agency_id: string; // Allow null
            role: string;
            created_at: string;
            updated_at: string;
        }) {
            try {
                console.log('Inserting agency_user:', agencyUser);
                const { data, error } = await supabase
                    .from('agency_users')
                    .insert([agencyUser])
                    .select('*')
                    .single();
                if (error) {
                    console.error('agency_users.insert error:', error);
                    throw new Error(`agency_users.insert | code=${error.code} | msg=${error.message}`);
                }
                console.log('Agency user inserted successfully:', data);
                return data;
            } catch (err) {
                console.error('Error in dbService.agencyUsers.create:', err);
                throw err;
            }
        },
        async update(user_id: string, updates: Partial<AgencyUser>): Promise<AgencyUser> {
            const clean = normalizeAgencyUser(updates);
            const { data, error } = await supabase.from('agency_users').update(clean).eq('user_id', user_id).select('*').single();
            if (error) throw new Error(formatSbError('❌ agency_users.update', error));
            return data;
        },
        async delete(user_id: string): Promise<boolean> {
            const { error } = await supabase.from('agency_users').delete().eq('user_id', user_id);
            if (error) throw new Error(formatSbError('❌ agency_users.delete', error));
            return true;
        },
    },

    // ----------------- AGENCY REGISTRATION REQUESTS -----------------
    agencyRegistrationRequests: {
        async getAll(): Promise<AgencyRegistrationRequest[]> {
            const { data, error } = await supabase
                .from('agency_registration_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ agency_registration_requests.select', error));
            return data ?? [];
        },
        async create(request: Partial<AgencyRegistrationRequest>): Promise<{ id: string }> {
            const clean = normalizeAgencyRegistrationRequest(request);
            const { data, error } = await supabase
                .from('agency_registration_requests')
                .insert(clean)
                .select('id')
                .single();
            if (error) throw new Error(formatSbError('❌ agency_registration_requests.insert', error));
            return { id: data.id };
        },
        async update(id: string, updates: Partial<AgencyRegistrationRequest>): Promise<AgencyRegistrationRequest> {
            const clean = normalizeAgencyRegistrationRequest(updates);
            const { data, error } = await supabase.from('agency_registration_requests').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ agency_registration_requests.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('agency_registration_requests').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ agency_registration_requests.delete', error));
            return true;
        },
        /*
        async approve(requestId: string): Promise<{ agencyId: string }> {
            const { user } = await logAuthContext('approveAgencyRequest');
            if (!user) throw new Error('Utilisateur non authentifié');
 
            // Vérifier si l'utilisateur est admin
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
                throw new Error('Permissions insuffisantes');
            }
 
            // Récupérer la demande
            const { data: req, error: reqError } = await supabase
                .from('agency_registration_requests')
                .select('*')
                .eq('id', requestId)
                .single();
            if (reqError || !req) throw new Error('Demande introuvable');
 
            // Vérifier si la demande est déjà approuvée
            if (req.status === 'approved') {
                throw new Error('Demande déjà approuvée');
            }
 
            // Mettre à jour le statut de la demande
            const { error: updateError } = await supabase
                .from('agency_registration_requests')
                .update({
                    status: 'approved',
                    processed_by: user.id,
                    processed_at: new Date().toISOString(),
                })
                .eq('id', requestId);
            if (updateError) throw updateError;
 
            // Créer l'agence
            const agencyData = normalizeAgency({
                name: req.agency_name,
                commercial_register: req.commercial_register,
                logo_url: req.logo_url,
                is_accredited: req.is_accredited,
                accreditation_number: req.accreditation_number,
                address: req.address,
                city: req.city,
                phone: req.phone,
                email: req.director_email,
                director_id: req.director_auth_user_id,
                status: 'approved',
            });
 
            const { data: agency, error: agencyError } = await supabase
                .from('agencies')
                .insert(agencyData)
                .select('id')
                .single();
            if (agencyError || !agency) throw new Error('Échec de la création de l\'agence');
 
            // Créer l'abonnement par défaut
            const subscriptionData = normalizeAgencySubscription({
                agency_id: agency.id,
                plan_type: 'basic',
                status: 'trial',
                monthly_fee: 25000,
                start_date: new Date().toISOString().split('T')[0],
                next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                trial_days_remaining: 30,
            });
            const { error: subError } = await supabase.from('agency_subscriptions').insert(subscriptionData);
            if (subError) throw subError;
 
            // Vérifier si une entrée agency_users existe déjà pour cet utilisateur
            if (req.director_auth_user_id) {
                const { data: existingAgencyUser, error: checkError } = await supabase
                    .from('agency_users')
                    .select('user_id')
                    .eq('user_id', req.director_auth_user_id)
                    .single();
                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
                    console.error('Error checking existing agency_users:', checkError);
                    throw new Error(`agency_users.check | code=${checkError.code} | msg=${checkError.message}`);
                }
 
                if (!existingAgencyUser) {
                    const agencyUserData = normalizeAgencyUser({
                        user_id: req.director_auth_user_id,
                        agency_id: agency.id,
                        role: 'director',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
                    console.log('Creating agency_users entry:', agencyUserData);
                    const { error: auError } = await supabase.from('agency_users').insert(agencyUserData);
                    if (auError) {
                        console.error('agency_users.insert error:', auError);
                        throw new Error(`agency_users.insert | code=${auError.code} | msg=${auError.message}`);
                    }
                    console.log('Agency user created successfully');
                } else {
                    console.log('Agency user already exists for user_id:', req.director_auth_user_id);
                }
            }
 
            // Enregistrer un log d'audit
            await dbService.auditLogs.insert({
                user_id: user.id,
                action: 'agency_approved',
                table_name: 'agency_registration_requests',
                record_id: requestId,
                new_values: {
                    agency_id: agency.id,
                    director_id: req.director_auth_user_id,
                    timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
                },
                ip_address: '0.0.0.0',
                user_agent: navigator.userAgent,
            });
 
            return { agencyId: agency.id };
        },
        */
        async approve(requestId: string): Promise<{ agencyId: string }> {
            const { user } = await logAuthContext('approveAgencyRequest');
            if (!user) throw new Error('Utilisateur non authentifié');

            // Vérifier si l'utilisateur est admin
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
                throw new Error('Permissions insuffisantes');
            }

            // Récupérer la demande
            const { data: req, error: reqError } = await supabase
                .from('agency_registration_requests')
                .select('*')
                .eq('id', requestId)
                .single();
            if (reqError || !req) throw new Error('Demande introuvable');

            // Vérifier si la demande est déjà approuvée
            if (req.status === 'approved') {
                throw new Error('Demande déjà approuvée');
            }

            // Vérifier si l'agence existe déjà
            const { data: existingAgency, error: existingAgencyError } = await supabase
                .from('agencies')
                .select('id')
                .eq('commercial_register', req.commercial_register)
                .single();
            if (existingAgency) {
                throw new Error(`Une agence avec le registre de commerce ${req.commercial_register} existe déjà (ID: ${existingAgency.id})`);
            }
            if (existingAgencyError && existingAgencyError.code !== 'PGRST116') {
                console.error('Error checking existing agency:', existingAgencyError);
                throw new Error(`agencies.check | code=${existingAgencyError.code} | msg=${existingAgencyError.message}`);
            }

            // Mettre à jour le statut de la demande
            const { error: updateError } = await supabase
                .from('agency_registration_requests')
                .update({
                    status: 'approved',
                    processed_by: user.id,
                    processed_at: new Date().toISOString(),
                })
                .eq('id', requestId);
            if (updateError) throw updateError;

            // Créer l'agence
            const agencyData = normalizeAgency({
                name: req.agency_name,
                commercial_register: req.commercial_register,
                logo_url: req.logo_url,
                is_accredited: req.is_accredited,
                accreditation_number: req.accreditation_number,
                address: req.address,
                city: req.city,
                phone: req.phone,
                email: req.director_email,
                director_id: req.director_auth_user_id,
                status: 'approved',
            });
            console.log('Inserting agency with payload:', agencyData);
            const { data: agency, error: agencyError } = await supabase
                .from('agencies')
                .insert(agencyData)
                .select('id')
                .single();
            if (agencyError || !agency) {
                console.error('agencies.insert error:', agencyError);
                throw new Error(`agencies.insert | code=${agencyError?.code} | msg=${agencyError?.message || 'Échec de la création de l\'agence'}`);
            }
            console.log('Agency created successfully:', agency);

            // Créer l'abonnement par défaut
            const subscriptionData = normalizeAgencySubscription({
                agency_id: agency.id,
                plan_type: 'basic',
                status: 'trial',
                monthly_fee: 25000,
                start_date: new Date().toISOString().split('T')[0],
                next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                trial_days_remaining: 30,
            });
            const { error: subError } = await supabase.from('agency_subscriptions').insert(subscriptionData);
            if (subError) throw subError;

            // Vérifier si une entrée agency_users existe déjà
            if (req.director_auth_user_id) {
                const { data: existingAgencyUser, error: checkError } = await supabase
                    .from('agency_users')
                    .select('user_id')
                    .eq('user_id', req.director_auth_user_id)
                    .single();
                if (checkError && checkError.code !== 'PGRST116' && checkError.code !== '406') {
                    console.error('Error checking existing agency_users:', checkError);
                    throw new Error(`agency_users.check | code=${checkError.code} | msg=${checkError.message}`);
                }

                if (!existingAgencyUser) {
                    const agencyUserData = normalizeAgencyUser({
                        user_id: req.director_auth_user_id,
                        agency_id: agency.id,
                        role: 'director',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
                    console.log('Creating agency_users entry:', agencyUserData);
                    const { error: auError } = await supabase.from('agency_users').insert(agencyUserData);
                    if (auError) {
                        console.error('agency_users.insert error:', auError);
                        throw new Error(`agency_users.insert | code=${auError.code} | msg=${auError.message}`);
                    }
                    console.log('Agency user created successfully');
                } else {
                    console.log('Agency user already exists for user_id:', req.director_auth_user_id);
                }
            }

            // Enregistrer un log d'audit
            await dbService.auditLogs.insert({
                user_id: user.id,
                action: 'agency_approved',
                table_name: 'agency_registration_requests',
                record_id: requestId,
                new_values: {
                    agency_id: agency.id,
                    director_id: req.director_auth_user_id,
                    timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
                },
                ip_address: '0.0.0.0',
                user_agent: navigator.userAgent,
            });

            return { agencyId: agency.id };
        },
        async reject(requestId: string, notes?: string): Promise<boolean> {
            const { user } = await logAuthContext('rejectAgencyRequest');
            if (!user) throw new Error('Utilisateur non authentifié');

            // Vérifier si l'utilisateur est admin
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
                throw new Error('Permissions insuffisantes');
            }

            const updates = {
                status: 'rejected',
                processed_by: user.id,
                processed_at: new Date().toISOString(),
                admin_notes: nilIfEmpty(notes),
            };

            const { error } = await supabase
                .from('agency_registration_requests')
                .update(updates)
                .eq('id', requestId);
            if (error) throw new Error(formatSbError('❌ agency_registration_requests.reject', error));
            return true;
        },
    },

    // ----------------- AGENCY SUBSCRIPTIONS -----------------
    agencySubscriptions: {
        async getAll(): Promise<AgencySubscription[]> {
            const { data, error } = await supabase.from('agency_subscriptions').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ agency_subscriptions.select', error));
            return data ?? [];
        },
        async create(sub: Partial<AgencySubscription>): Promise<AgencySubscription> {
            const clean = normalizeAgencySubscription(sub);
            const { data, error } = await supabase.from('agency_subscriptions').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ agency_subscriptions.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<AgencySubscription>): Promise<AgencySubscription> {
            const clean = normalizeAgencySubscription(updates);
            const { data, error } = await supabase.from('agency_subscriptions').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ agency_subscriptions.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('agency_subscriptions').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ agency_subscriptions.delete', error));
            return true;
        },
        async extend(agencyId: string, months: number): Promise<boolean> {
            const { user } = await logAuthContext('extendSubscription');
            if (!user) throw new Error('Utilisateur non authentifié');

            // Vérifier si l'utilisateur est admin
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
                throw new Error('Permissions insuffisantes');
            }

            const { data: sub, error: subError } = await supabase
                .from('agency_subscriptions')
                .select('*')
                .eq('agency_id', agencyId)
                .single();
            if (subError || !sub) throw new Error('Abonnement introuvable');

            const nextPaymentDate = new Date(sub.next_payment_date || Date.now());
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + months);

            const payment = {
                date: new Date().toISOString(),
                amount: sub.monthly_fee * months,
            };

            const updatedHistory = [...(sub.payment_history || []), payment];

            const updates = {
                next_payment_date: nextPaymentDate.toISOString().split('T')[0],
                payment_history: updatedHistory,
                status: 'active',
            };

            const { error } = await supabase
                .from('agency_subscriptions')
                .update(updates)
                .eq('id', sub.id);
            if (error) throw error;

            return true;
        },
        async suspend(agencyId: string, reason: string): Promise<boolean> {
            const { user } = await logAuthContext('suspendSubscription');
            if (!user) throw new Error('Utilisateur non authentifié');

            // Vérifier si l'utilisateur est admin
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
                throw new Error('Permissions insuffisantes');
            }

            const { data: sub, error: subError } = await supabase
                .from('agency_subscriptions')
                .select('id')
                .eq('agency_id', agencyId)
                .single();
            if (subError || !sub) throw new Error('Abonnement introuvable');

            const { error } = await supabase
                .from('agency_subscriptions')
                .update({ status: 'suspended', suspension_reason: reason }) // Ajoutez un champ suspension_reason si nécessaire dans le schéma
                .eq('id', sub.id);
            if (error) throw error;

            return true;
        },
        async activate(agencyId: string): Promise<boolean> {
            const { user } = await logAuthContext('activateSubscription');
            if (!user) throw new Error('Utilisateur non authentifié');

            // Vérifier si l'utilisateur est admin
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
                throw new Error('Permissions insuffisantes');
            }

            const { data: sub, error: subError } = await supabase
                .from('agency_subscriptions')
                .select('*')
                .eq('agency_id', agencyId)
                .single();
            if (subError || !sub) throw new Error('Abonnement introuvable');

            const nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const { error } = await supabase
                .from('agency_subscriptions')
                .update({ status: 'active', next_payment_date: nextPaymentDate })
                .eq('id', sub.id);
            if (error) throw error;

            return true;
        },
    },

    // ----------------- SUBSCRIPTION PAYMENTS -----------------
    subscriptionPayments: {
        async getAll(): Promise<SubscriptionPayment[]> {
            const { data, error } = await supabase.from('subscription_payments').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ subscription_payments.select', error));
            return data ?? [];
        },
        async create(payment: Partial<SubscriptionPayment>): Promise<SubscriptionPayment> {
            const clean = normalizeSubscriptionPayment(payment);
            const { data, error } = await supabase.from('subscription_payments').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ subscription_payments.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<SubscriptionPayment>): Promise<SubscriptionPayment> {
            const clean = normalizeSubscriptionPayment(updates);
            const { data, error } = await supabase.from('subscription_payments').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ subscription_payments.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('subscription_payments').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ subscription_payments.delete', error));
            return true;
        },
    },

    // ----------------- AGENCY RANKINGS -----------------
    agencyRankings: {
        async getAll(): Promise<AgencyRanking[]> {
            const { data, error } = await supabase.from('agency_rankings').select('*').order('year', { ascending: false });
            if (error) throw new Error(formatSbError('❌ agency_rankings.select', error));
            return data ?? [];
        },
        async create(ranking: Partial<AgencyRanking>): Promise<AgencyRanking> {
            const clean = normalizeAgencyRanking(ranking);
            const { data, error } = await supabase.from('agency_rankings').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ agency_rankings.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<AgencyRanking>): Promise<AgencyRanking> {
            const clean = normalizeAgencyRanking(updates);
            const { data, error } = await supabase.from('agency_rankings').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ agency_rankings.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('agency_rankings').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ agency_rankings.delete', error));
            return true;
        },
        getByPeriod: async (year: number): Promise<AgencyRanking[]> => {
            const { data, error } = await supabase
                .from('agency_rankings')
                .select('*')
                .eq('year', year)
                .order('rank', { ascending: true });
            if (error) throw new Error(formatSbError('❌ agency_rankings.select (by year)', error));
            return data ?? [];
        },
        generate: async (year: number): Promise<void> => {
            const { user } = await logAuthContext('generateAgencyRankings');
            if (!user) throw new Error('Utilisateur non authentifié');

            // Vérifier si l'utilisateur est admin
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
                throw new Error('Permissions insuffisantes');
            }

            const { error } = await supabase.rpc('generate_agency_rankings', { p_year: year });
            if (error) throw new Error(formatSbError('❌ agency_rankings.generate', error));
        },
    },

    // ----------------- OWNERS -----------------
    owners: {
        async getAll(): Promise<Owner[]> {
            const { data, error } = await supabase.from('owners').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ owners.select', error));
            return data ?? [];
        },
        async create(owner: Partial<Owner>): Promise<Owner> {
            const clean = normalizeOwner(owner);
            const { data, error } = await supabase.from('owners').insert(clean).select('*').single();
            if (error) {
                if (isRlsDenied(error)) {
                    console.warn('↪️ RLS bloqué pour owners.insert, fallback possible si implémenté');
                }
                throw new Error(formatSbError('❌ owners.insert', error));
            }
            return data;
        },
        async update(id: string, updates: Partial<Owner>): Promise<Owner> {
            const clean = normalizeOwner(updates);
            const { data, error } = await supabase.from('owners').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ owners.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('owners').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ owners.delete', error));
            return true;
        },
        async findOne(id: string): Promise<Owner | null> {
            const { data, error } = await supabase
                .from('owners')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') return null; // pas trouvé
                throw new Error(formatSbError('❌ owners.findOne', error));
            }
            return data;
        },
    },

    // ----------------- TENANTS -----------------
    tenants: {
        async getAll(filters: TenantFilters = {}): Promise<Tenant[]> {
            let query = supabase.from('tenants').select('*').order('created_at', { ascending: false });

            if (filters.agency_id) {
                query = query.eq('agency_id', filters.agency_id);
            }
            if (filters.marital_status) {
                query = query.eq('marital_status', filters.marital_status);
            }
            if (filters.payment_status) {
                query = query.eq('payment_status', filters.payment_status);
            }
            if (filters.search) {
                const search = `%${filters.search.toLowerCase()}%`;
                query = query.or(
                    `first_name.ilike.${search},last_name.ilike.${search},phone.ilike.${search},city.ilike.${search},profession.ilike.${search}`
                );
            }

            if (filters.limit !== undefined) {
                const from = filters.offset ?? 0;
                const to = from + filters.limit - 1;
                query = query.range(from, to); // remplace offset + limit
            }

            const { data, error } = await query;
            if (error) throw new Error(formatSbError('❌ tenants.select', error));
            return data ?? [];
        },
        async create(tenant: Partial<Tenant>): Promise<Tenant> {
            const clean = normalizeTenant(tenant);
            const { data, error } = await supabase.from('tenants').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ tenants.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<Tenant>): Promise<Tenant> {
            const clean = normalizeTenant(updates);
            const { data, error } = await supabase.from('tenants').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ tenants.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('tenants').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ tenants.delete', error));
            return true;
        },
        async findOne(id: string): Promise<Tenant | null> {
            const { data, error } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') return null;
                throw new Error(formatSbError('❌ tenants.findOne', error));
            }
            return data;
        },
    },

    // ----------------- PROPERTIES -----------------
    properties: {
        async getAll(): Promise<Property[]> {
            const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ properties.select', error));
            return data ?? [];
        },
        async create(property: Partial<Property>): Promise<Property> {
            const clean = normalizeProperty(property);
            const { data, error } = await supabase.from('properties').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ properties.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<Property>): Promise<Property> {
            const clean = normalizeProperty(updates);
            const { data, error } = await supabase.from('properties').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ properties.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('properties').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ properties.delete', error));
            return true;
        },
        async findOne(id: string): Promise<Property | null> {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') return null;
                throw new Error(formatSbError('❌ properties.findOne', error));
            }
            return data;
        },
    },

    // ----------------- ANNOUNCEMENTS -----------------
    announcements: {
        async getAll(): Promise<Announcement[]> {
            const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ announcements.select', error));
            return data ?? [];
        },
        async create(announcement: Partial<Announcement>): Promise<Announcement> {
            const clean = normalizeAnnouncement(announcement);
            const { data, error } = await supabase.from('announcements').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ announcements.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<Announcement>): Promise<Announcement> {
            const clean = normalizeAnnouncement(updates);
            const { data, error } = await supabase.from('announcements').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ announcements.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ announcements.delete', error));
            return true;
        },
    },

    // ----------------- ANNOUNCEMENT INTERESTS -----------------
    announcementInterests: {
        async getAll(): Promise<AnnouncementInterest[]> {
            const { data, error } = await supabase.from('announcement_interests').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ announcement_interests.select', error));
            return data ?? [];
        },
        async create(interest: Partial<AnnouncementInterest>): Promise<AnnouncementInterest> {
            const clean = normalizeAnnouncementInterest(interest);
            const { data, error } = await supabase.from('announcement_interests').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ announcement_interests.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<AnnouncementInterest>): Promise<AnnouncementInterest> {
            const clean = normalizeAnnouncementInterest(updates);
            const { data, error } = await supabase.from('announcement_interests').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ announcement_interests.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('announcement_interests').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ announcement_interests.delete', error));
            return true;
        },
    },

    // ----------------- CONTRACTS -----------------
    contracts: {
        async getAll(): Promise<Contract[]> {
            const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ contracts.select', error));
            return data ?? [];
        },
        async create(contract: Partial<Contract>): Promise<Contract> {
            const clean = normalizeContract(contract);
            const { data, error } = await supabase.from('contracts').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ contracts.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<Contract>): Promise<Contract> {
            const clean = normalizeContract(updates);
            const { data, error } = await supabase.from('contracts').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ contracts.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('contracts').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ contracts.delete', error));
            return true;
        },
        async findOne(id: string): Promise<Contract | null> {
            const { data, error } = await supabase
                .from('contracts')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                if (error.code === 'PGRST116') return null;
                throw new Error(formatSbError('❌ contracts.findOne', error));
            }
            return data;
        },
    },

    // ----------------- RENT RECEIPTS -----------------
    rentReceipts: {
        async getAll(): Promise<RentReceipt[]> {
            const { data, error } = await supabase
                .from("rent_receipts")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw new Error(formatSbError("❌ rentReceipts.select", error));
            return data ?? [];
        },

        async findOne(id: string): Promise<RentReceipt | null> {
            const { data, error } = await supabase
                .from("rent_receipts")
                .select("*")
                .eq("id", id)
                .single();
            if (error) throw new Error(formatSbError("❌ rentReceipts.findOne", error));
            return data ?? null;
        },

        async create(receipt: Partial<RentReceipt>): Promise<RentReceipt> {
            // Normalisation via fonction utilitaire
            const clean: Partial<RentReceipt> = {
                id: receipt.id ?? crypto.randomUUID(),
                agency_id: receipt.agency_id,
                created_at: new Date().toISOString(),
                ...normalizeRentReceipt(receipt),
            };

            const { data, error } = await supabase
                .from("rent_receipts")
                .insert(clean)
                .select("*")
                .single();

            if (error) throw new Error(formatSbError("❌ rentReceipts.insert", error));
            return data;
        },

        async update(id: string, updates: Partial<RentReceipt>): Promise<RentReceipt> {
            const cleanUpdates = normalizeRentReceipt(updates);

            const { data, error } = await supabase
                .from("rent_receipts")
                .update(cleanUpdates)
                .eq("id", id)
                .select("*")
                .single();
            if (error) throw new Error(formatSbError("❌ rentReceipts.update", error));
            return data;
        },

        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from("rent_receipts").delete().eq("id", id);
            if (error) throw new Error(formatSbError("❌ rentReceipts.delete", error));
            return true;
        },
    },

    // ----------------- FINANCIAL STATEMENTS -----------------
    financialStatements: {
        async getAll(): Promise<FinancialStatement[]> {
            const { data, error } = await supabase
                .from("financial_statements")
                .select(`
        id,
        agency_id,
        owner_id,
        tenant_id,
        period_start,
        period_end,
        total_income,
        total_expenses,
        net_balance,
        pending_payments,
        generated_by,
        generated_at,
        created_at,
        updated_at,
        transactions:financial_transactions (
          id,
          agency_id,
          owner_id,
          entity_type,
          type,
          amount,
          description,
          category,
          date,
          property_id,
          created_at,
          updated_at
        )
      `);

            if (error) throw new Error(formatSbError("❌ financial_statements.getAll", error));
            return data?.map(normalizeFinancialStatement) ?? [];
        },
        async getByEntity(
            entityId: string,
            entityType: "owner" | "tenant",
            period: string
        ): Promise<FinancialStatement[]> {
            const [year, month] = period.split("-").map(Number);
            const startDate = new Date(year, month - 1, 1).toISOString();
            const endDate = new Date(year, month, 0).toISOString();

            const { data, error } = await supabase
                .from("financial_statements")
                .select(`
        id,
        agency_id,
        owner_id,
        tenant_id,
        period_start,
        period_end,
        total_income,
        total_expenses,
        net_balance,
        pending_payments,
        generated_by,
        generated_at,
        created_at,
        updated_at,
        transactions:financial_transactions (
          id,
          agency_id,
          owner_id,
          entity_type,
          type,
          amount,
          description,
          category,
          date,
          property_id,
          created_at,
          updated_at
        )
      `)
                .eq(entityType === "owner" ? "owner_id" : "tenant_id", entityId)
                .gte("period_start", startDate)
                .lte("period_end", endDate);

            if (error) throw new Error(formatSbError("❌ financial_statements.getByEntity", error));
            return data?.map(normalizeFinancialStatement) ?? [];
        },
        async create(statement: Partial<FinancialStatement>): Promise<FinancialStatement[]> {
            const normalizedStatement = normalizeFinancialStatement({
                ...statement,
                id: statement.id ?? crypto.randomUUID(),
                generated_at: statement.generated_at ?? new Date().toISOString(),
                created_at: statement.created_at ?? new Date().toISOString(),
                updated_at: statement.updated_at ?? new Date().toISOString(),
            });

            const { data, error } = await supabase
                .from("financial_statements")
                .insert({
                    id: normalizedStatement.id,
                    agency_id: normalizedStatement.agency_id,
                    owner_id: normalizedStatement.entity_type === "owner" ? normalizedStatement.owner_id : null,
                    tenant_id: normalizedStatement.entity_type === "tenant" ? normalizedStatement.owner_id : null,
                    period_start: normalizedStatement.period.start_date,
                    period_end: normalizedStatement.period.end_date,
                    total_income: normalizedStatement.summary.total_income,
                    total_expenses: normalizedStatement.summary.total_expenses,
                    net_balance: normalizedStatement.summary.balance,
                    pending_payments: normalizedStatement.summary.pending_payments,
                    generated_by: normalizedStatement.generated_by,
                    generated_at: normalizedStatement.generated_at,
                    created_at: normalizedStatement.created_at,
                    updated_at: normalizedStatement.updated_at,
                })
                .select();

            if (error) throw new Error(formatSbError("❌ financial_statements.create", error));
            return data?.map(d =>
                normalizeFinancialStatement({
                    ...d,
                    transactions: statement.transactions || [],
                })
            ) ?? [];
        },
        async update(id: string, updates: Partial<FinancialStatement>): Promise<FinancialStatement[]> {
            const normalizedUpdates = normalizeFinancialStatement({
                ...updates,
                id,
                updated_at: updates.updated_at ?? new Date().toISOString(),
            });

            const { data, error } = await supabase
                .from("financial_statements")
                .update({
                    agency_id: normalizedUpdates.agency_id,
                    owner_id: normalizedUpdates.entity_type === "owner" ? normalizedUpdates.owner_id : null,
                    tenant_id: normalizedUpdates.entity_type === "tenant" ? normalizedUpdates.owner_id : null,
                    period_start: normalizedUpdates.period.start_date,
                    period_end: normalizedUpdates.period.end_date,
                    total_income: normalizedUpdates.summary.total_income,
                    total_expenses: normalizedUpdates.summary.total_expenses,
                    net_balance: normalizedUpdates.summary.balance,
                    pending_payments: normalizedUpdates.summary.pending_payments,
                    generated_by: normalizedUpdates.generated_by,
                    generated_at: normalizedUpdates.generated_at,
                    updated_at: normalizedUpdates.updated_at,
                })
                .eq("id", id)
                .select();

            if (error) throw new Error(formatSbError("❌ financial_statements.update", error));
            return data?.map(d =>
                normalizeFinancialStatement({
                    ...d,
                    transactions: updates.transactions || [],
                })
            ) ?? [];
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase
                .from("financial_statements")
                .delete()
                .eq("id", id);
            if (error) throw new Error(formatSbError("❌ financial_statements.delete", error));
            return true;
        },
    },

    // ----------------- MESSAGES -----------------
    messages: {
        async getAll(): Promise<Message[]> {
            const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ messages.select', error));
            return data ?? [];
        },
        async create(message: Partial<Message>): Promise<Message> {
            const clean = normalizeMessage(message);
            const { data, error } = await supabase.from('messages').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ messages.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<Message>): Promise<Message> {
            const clean = normalizeMessage(updates);
            const { data, error } = await supabase.from('messages').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ messages.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('messages').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ messages.delete', error));
            return true;
        },
    },

    // ----------------- NOTIFICATIONS -----------------
    notifications: {
        async getAll(): Promise<Notification[]> {
            const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ notifications.select', error));
            return data ?? [];
        },
        getByUser: async (userId: string): Promise<Notification[]> => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw new Error(`Erreur lors de la récupération des notifications: ${error.message}`);
            return data;
        },
        async create(notification: Partial<Notification>): Promise<Notification> {
            const clean = normalizeNotification(notification);
            const { data, error } = await supabase.from('notifications').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ notifications.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<Notification>): Promise<Notification> {
            const clean = normalizeNotification(updates);
            const { data, error } = await supabase.from('notifications').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ notifications.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('notifications').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ notifications.delete', error));
            return true;
        },
    },

    // ----------------- EMAIL NOTIFICATIONS -----------------
    emailNotifications: {
        getByAgency: async (agencyId: string): Promise<EmailNotification[]> => {
            const { data, error } = await supabase
                .from('email_notifications')
                .select('*')
                .eq('agency_id', agencyId)
                .order('created_at', { ascending: false });
            if (error) throw new Error(`Erreur lors de la récupération des notifications par email: ${error.message}`);
            return data;
        },
        create: async (notification: EmailNotification) => {
            const clean = normalizeEmailNotification(notification);
            const { error } = await supabase.from('email_notifications').insert(clean);
            if (error) throw new Error(`Erreur lors de la création de la notification par email: ${error.message}`);
        },
        update: async (notificationId: string, updates: Partial<EmailNotification>) => {
            const clean = normalizeEmailNotification(updates);
            const { error } = await supabase
                .from('email_notifications')
                .update(clean)
                .eq('id', notificationId);
            if (error) throw new Error(`Erreur lors de la mise à jour de la notification par email: ${error.message}`);
        },
    },

    // ----------------- PLATFORM SETTINGS -----------------
    platformSettings: {
        async getAll(): Promise<PlatformSetting[]> {
            const { data, error } = await supabase.from('platform_settings').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ platform_settings.select', error));
            return data ?? [];
        },
        async create(setting: Partial<PlatformSetting>): Promise<PlatformSetting> {
            const clean = normalizePlatformSetting(setting);
            const { data, error } = await supabase.from('platform_settings').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ platform_settings.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<PlatformSetting>): Promise<PlatformSetting> {
            const clean = normalizePlatformSetting(updates);
            const { data, error } = await supabase.from('platform_settings').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ platform_settings.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('platform_settings').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ platform_settings.delete', error));
            return true;
        },
        upsert: async (settings: Partial<PlatformSetting>[]): Promise<void> => {
            const { user } = await logAuthContext('platformSettingsUpsert');
            if (!user) throw new Error('Utilisateur non authentifié');

            // Vérifier si l'utilisateur est admin
            const { data: admin } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('user_id', user.id)
                .single();
            if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
                throw new Error('Permissions insuffisantes');
            }

            const cleanSettings = settings.map(setting => ({
                ...normalizePlatformSetting(setting),
                updated_by: user.id,
                updated_at: new Date().toISOString(),
            }));

            const { error } = await supabase
                .from('platform_settings')
                .upsert(cleanSettings, { onConflict: 'setting_key' });
            if (error) throw new Error(formatSbError('❌ platform_settings.upsert', error));
        },
    },

    // ----------------- AUDIT LOGS -----------------
    auditLogs: {
        async getAll(): Promise<AuditLog[]> {
            const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ audit_logs.select', error));
            return data ?? [];
        },
        async insert(log: Partial<AuditLog>): Promise<AuditLog> {
            const clean = normalizeAuditLog(log);
            const { data, error } = await supabase.from('audit_logs').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ audit_logs.insert', error));
            return data;
        },
    },

    // ----------------- AUTRES FONCTIONS UTILES -----------------
    async getSystemAlerts(): Promise<any> {
        try {
            const { data, error } = await supabase
                .from('platform_settings')
                .select('setting_value')
                .eq('setting_key', 'system_alerts')
                .eq('is_public', true)
                .limit(1)
                .maybeSingle(); // Use maybeSingle instead of single

            if (error) {
                throw new Error(`❌ platform_settings.select (system_alerts) | code=${error.code} | msg=${error.message}`);
            }

            return data?.setting_value || null; // Return null if no rows found
        } catch (err: any) {
            console.error('getSystemAlerts:', err);
            throw new Error(`❌ getSystemAlerts: ${err.message}`);
        }
    },

};