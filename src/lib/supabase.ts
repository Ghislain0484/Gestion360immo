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
} from "../types/db";

//supabaseUrl supabaseKey
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
    console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants");
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
});

// --- Helpers généraux ---
const nilIfEmpty = (v: any) => (v === "" || v === undefined || v === null ? null : v);

function formatSbError(prefix: string, error: any) {
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

function isRlsDenied(err: any): boolean {
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
    permissions: u.permissions ?? {},
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
    director_password: nilIfEmpty(arr.director_password), // À gérer avec précaution
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
    receipt_number: nilIfEmpty(rr.receipt_number),
    contract_id: nilIfEmpty(rr.contract_id),
    period_month: rr.period_month ?? 1,
    period_year: rr.period_year ?? new Date().getFullYear(),
    rent_amount: rr.rent_amount ?? 0,
    charges: rr.charges ?? 0,
    total_amount: rr.total_amount ?? 0,
    commission_amount: rr.commission_amount ?? 0,
    owner_payment: rr.owner_payment ?? 0,
    payment_date: nilIfEmpty(rr.payment_date),
    payment_method: nilIfEmpty(rr.payment_method),
    notes: nilIfEmpty(rr.notes),
    issued_by: nilIfEmpty(rr.issued_by),
});

const normalizeFinancialStatement = (fs: Partial<FinancialStatement>) => ({
    agency_id: nilIfEmpty(fs.agency_id),
    owner_id: nilIfEmpty(fs.owner_id),
    tenant_id: nilIfEmpty(fs.tenant_id),
    period_start: nilIfEmpty(fs.period_start),
    period_end: nilIfEmpty(fs.period_end),
    total_income: fs.total_income ?? 0,
    total_expenses: fs.total_expenses ?? 0,
    net_balance: fs.net_balance ?? 0,
    pending_payments: fs.pending_payments ?? 0,
    transactions: fs.transactions ?? [],
    generated_by: nilIfEmpty(fs.generated_by),
    generated_at: nilIfEmpty(fs.generated_at),
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

const normalizeAuditLog = (al: Partial<AuditLog>) => ({
    user_id: nilIfEmpty(al.user_id),
    action: nilIfEmpty(al.action),
    table_name: nilIfEmpty(al.table_name),
    record_id: nilIfEmpty(al.record_id),
    old_values: al.old_values ?? null,
    new_values: al.new_values ?? null,
    ip_address: nilIfEmpty(al.ip_address),
    user_agent: nilIfEmpty(al.user_agent),
});

// ======================================================
// ================   DB SERVICE   ======================
// ======================================================
export const dbService = {
    // ----------------- USERS -----------------
    users: {
        async getCurrent(): Promise<User | null> {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
            if (error) throw new Error(formatSbError('❌ users.select (current)', error));
            return data;
        },
        async getAll(): Promise<User[]> {
            const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ users.select', error));
            return data ?? [];
        },
        async create(user: Partial<User>): Promise<User> {
            const clean = normalizeUser(user);
            const { data, error } = await supabase.from('users').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ users.insert', error));
            return data;
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
        async create(agencyUser: Partial<AgencyUser>): Promise<AgencyUser> {
            const clean = normalizeAgencyUser(agencyUser);
            const { data, error } = await supabase.from('agency_users').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ agency_users.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<AgencyUser>): Promise<AgencyUser> {
            const clean = normalizeAgencyUser(updates);
            const { data, error } = await supabase.from('agency_users').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ agency_users.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('agency_users').delete().eq('id', id);
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

            // Ajouter le director comme agency_user
            if (req.director_auth_user_id) {
                const agencyUserData = normalizeAgencyUser({
                    user_id: req.director_auth_user_id,
                    agency_id: agency.id,
                    role: 'director',
                });
                const { error: auError } = await supabase.from('agency_users').insert(agencyUserData);
                if (auError) throw auError;
            }

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
    },
    /*
    owners: {
        async getOwners(): Promise<Owner[]> {
            const { data, error } = await supabase
                .from('owners')
                .select('*')
                .order('last_name', { ascending: true });
            if (error) throw new Error(formatSbError('❌ owners.select', error));
            return data ?? [];
        },
            async createOwner(owner: Partial<Owner>): Promise < Owner > {
                const clean = normalizeOwner(owner);
                const { data, error } = await supabase
                    .from('owners')
                    .insert(clean)
                    .select('*')
                    .single();
                if(error) throw new Error(formatSbError('❌ owners.insert', error));
                return data;
            },
                async updateOwner(id: string, owner: Partial<Owner>): Promise < Owner > {
                    const clean = normalizeOwner(owner);
                    const { data, error } = await supabase
                        .from('owners')
                        .update(clean)
                        .eq('id', id)
                        .select('*')
                        .single();
                    if(error) throw new Error(formatSbError('❌ owners.update', error));
                    return data;
                },
                    async deleteOwner(id: string): Promise < void> {
                        const { error } = await supabase.from('owners').delete().eq('id', id);
                        if(error) throw new Error(formatSbError('❌ owners.delete', error));
                    },
  },
  */

    // ----------------- TENANTS -----------------
    tenants: {
        async getAll(): Promise<Tenant[]> {
            const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
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
    },

    // ----------------- RENT RECEIPTS -----------------
    rentReceipts: {
        async getAll(): Promise<RentReceipt[]> {
            const { data, error } = await supabase.from('rent_receipts').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ rent_receipts.select', error));
            return data ?? [];
        },
        async create(receipt: Partial<RentReceipt>): Promise<RentReceipt> {
            const clean = normalizeRentReceipt(receipt);
            const { data, error } = await supabase.from('rent_receipts').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ rent_receipts.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<RentReceipt>): Promise<RentReceipt> {
            const clean = normalizeRentReceipt(updates);
            const { data, error } = await supabase.from('rent_receipts').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ rent_receipts.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('rent_receipts').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ rent_receipts.delete', error));
            return true;
        },
    },

    // ----------------- FINANCIAL STATEMENTS -----------------
    financialStatements: {
        async getAll(): Promise<FinancialStatement[]> {
            const { data, error } = await supabase.from('financial_statements').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(formatSbError('❌ financial_statements.select', error));
            return data ?? [];
        },
        async create(statement: Partial<FinancialStatement>): Promise<FinancialStatement> {
            const clean = normalizeFinancialStatement(statement);
            const { data, error } = await supabase.from('financial_statements').insert(clean).select('*').single();
            if (error) throw new Error(formatSbError('❌ financial_statements.insert', error));
            return data;
        },
        async update(id: string, updates: Partial<FinancialStatement>): Promise<FinancialStatement> {
            const clean = normalizeFinancialStatement(updates);
            const { data, error } = await supabase.from('financial_statements').update(clean).eq('id', id).select('*').single();
            if (error) throw new Error(formatSbError('❌ financial_statements.update', error));
            return data;
        },
        async delete(id: string): Promise<boolean> {
            const { error } = await supabase.from('financial_statements').delete().eq('id', id);
            if (error) throw new Error(formatSbError('❌ financial_statements.delete', error));
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