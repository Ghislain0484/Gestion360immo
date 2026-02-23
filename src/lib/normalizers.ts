import { v4 as uuidv4 } from 'uuid';
import {
    Agency, AgencyUser, AgencyRegistrationRequest, AgencySubscription, SubscriptionPayment,
    AgencyRanking, Owner, Tenant, Property, Announcement, AnnouncementInterest, Contract,
    RentReceipt, FinancialStatement, Message, Notification, PlatformSetting, AuditLog, User,
    PlatformAdmin, EmailNotification
} from "../types/db";
import { AgencyUserRole } from '../types/enums';

const nilIfEmpty = <T>(value: T): T | null => {
    if (value === '' || value === undefined || value === null) return null;
    return value;
};

const undefinedIfEmpty = <T>(value: T): T | undefined => {
    if (value === '' || value === undefined || value === null) return undefined;
    return value;
};

export const normalizeUser = (u: Partial<User>) => ({
    id: nilIfEmpty(u.id),
    email: nilIfEmpty(u.email),
    first_name: nilIfEmpty(u.first_name),
    last_name: nilIfEmpty(u.last_name),
    phone: nilIfEmpty(u.phone),
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
    agency_id: nilIfEmpty(u.agency_id),
    created_at: u.created_at ?? new Date().toISOString(),
    updated_at: u.updated_at ?? new Date().toISOString(),
});

export const normalizePlatformAdmin = (pa: Partial<PlatformAdmin>) => ({
    user_id: nilIfEmpty(pa.user_id),
    role: nilIfEmpty(pa.role),
    permissions: pa.permissions ?? {},
    is_active: pa.is_active ?? true,
    last_login: nilIfEmpty(pa.last_login),
});

export const normalizeAgency = (a: Partial<Agency>) => {
    const result: any = {};

    // Inclure seulement les champs qui sont explicitement fournis
    if (a.name !== undefined) result.name = nilIfEmpty(a.name);
    if (a.commercial_register !== undefined) result.commercial_register = nilIfEmpty(a.commercial_register);
    if (a.logo_url !== undefined) result.logo_url = nilIfEmpty(a.logo_url);
    if (a.is_accredited !== undefined) result.is_accredited = a.is_accredited ?? false;
    if (a.accreditation_number !== undefined) result.accreditation_number = nilIfEmpty(a.accreditation_number);
    if (a.address !== undefined) result.address = nilIfEmpty(a.address);
    if (a.city !== undefined) result.city = nilIfEmpty(a.city);
    if (a.phone !== undefined) result.phone = nilIfEmpty(a.phone);
    if (a.email !== undefined) result.email = nilIfEmpty(a.email);
    if (a.director_id !== undefined) result.director_id = nilIfEmpty(a.director_id);
    if (a.status !== undefined) result.status = nilIfEmpty(a.status) ?? 'approved';

    // Champs d'abonnement - IMPORTANT: ne pas filtrer avec nilIfEmpty
    if (a.subscription_status !== undefined) result.subscription_status = a.subscription_status;
    if (a.plan_type !== undefined) result.plan_type = a.plan_type;
    if (a.monthly_fee !== undefined) result.monthly_fee = a.monthly_fee;

    return result;
};

export const normalizeAgencyUser = (au: Partial<AgencyUser>) => ({
    user_id: nilIfEmpty(au.user_id),
    agency_id: nilIfEmpty(au.agency_id),
    role: nilIfEmpty(au.role),
});

// Nouvelle fonction pour les updates partiels d'utilisateur
export const normalizePartialUser = (u: Partial<User>): Partial<User> => {
    const partial: Partial<User> = {};

    // Inclure seulement si fourni (et appliquer nilIfEmpty pour chaînes vides, puis ?? undefined pour types)
    if (u.id !== undefined) partial.id = nilIfEmpty(u.id) ?? undefined;
    if (u.email !== undefined) partial.email = nilIfEmpty(u.email) ?? undefined;
    if (u.first_name !== undefined) partial.first_name = nilIfEmpty(u.first_name) ?? undefined;
    if (u.last_name !== undefined) partial.last_name = nilIfEmpty(u.last_name) ?? undefined;
    if (u.phone !== undefined) partial.phone = nilIfEmpty(u.phone) ?? undefined;
    if (u.avatar !== undefined) partial.avatar = nilIfEmpty(u.avatar) ?? undefined;
    if (u.is_active !== undefined) partial.is_active = !!u.is_active;  // Booléen strict
    if (u.permissions !== undefined) partial.permissions = u.permissions;  // Pas de default pour partial
    if (u.created_at !== undefined) partial.created_at = new Date(u.created_at).toISOString();
    if (u.updated_at !== undefined) partial.updated_at = new Date(u.updated_at).toISOString();
    if (u.agency_id !== undefined) partial.agency_id = nilIfEmpty(u.agency_id) ?? undefined;

    return partial;
};

// Nouvelle fonction pour les updates partiels d'agence user
export const normalizePartialAgencyUser = (au: Partial<AgencyUser>): Partial<AgencyUser> => {
    const partial: Partial<AgencyUser> = {};

    if (au.user_id !== undefined) partial.user_id = nilIfEmpty(au.user_id) ?? undefined;
    if (au.agency_id !== undefined) partial.agency_id = nilIfEmpty(au.agency_id) ?? undefined;
    if (au.role !== undefined) partial.role = au.role as AgencyUserRole;  // Pas de nilIfEmpty si enum (ajustez si role peut être string vide)
    if (au.created_at !== undefined) partial.created_at = new Date(au.created_at).toISOString();
    if (au.updated_at !== undefined) partial.updated_at = new Date(au.updated_at).toISOString();

    return partial;
};

export const normalizeAgencyRegistrationRequest = (arr: Partial<AgencyRegistrationRequest>) => ({
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

export const normalizeAgencySubscription = (as: Partial<AgencySubscription>) => ({
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

export const normalizeSubscriptionPayment = (sp: Partial<SubscriptionPayment>) => ({
    subscription_id: nilIfEmpty(sp.subscription_id),
    amount: sp.amount ?? 0,
    payment_date: nilIfEmpty(sp.payment_date) ?? new Date().toISOString().split('T')[0],
    payment_method: nilIfEmpty(sp.payment_method),
    reference_number: nilIfEmpty(sp.reference_number),
    status: nilIfEmpty(sp.status) ?? 'completed',
    processed_by: nilIfEmpty(sp.processed_by),
    notes: nilIfEmpty(sp.notes),
});

export const normalizeAgencyRanking = (ar: Partial<AgencyRanking>) => ({
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

export const normalizeOwner = (owner: Partial<Owner>): Partial<Owner> => ({
    ...owner,
    email: owner.email?.trim() || null,
    property_title_details: owner.property_title_details?.trim() || null,
    spouse_name: owner.spouse_name?.trim() || null,
    spouse_phone: owner.spouse_phone?.trim() || null,
    children_count: owner.children_count ?? 0,
});

export const normalizeTenant = (t: Partial<Tenant>) => {
    const data: any = {};
    if (t.agency_id !== undefined) data.agency_id = nilIfEmpty(t.agency_id);
    if (t.first_name !== undefined) data.first_name = nilIfEmpty(t.first_name);
    if (t.last_name !== undefined) data.last_name = nilIfEmpty(t.last_name);
    if (t.phone !== undefined) data.phone = nilIfEmpty(t.phone);
    if (t.email !== undefined) data.email = nilIfEmpty(t.email);
    if (t.address !== undefined) data.address = nilIfEmpty(t.address);
    if (t.city !== undefined) data.city = nilIfEmpty(t.city);
    if (t.marital_status !== undefined) data.marital_status = nilIfEmpty(t.marital_status);
    if (t.spouse_name !== undefined) data.spouse_name = nilIfEmpty(t.spouse_name);
    if (t.spouse_phone !== undefined) data.spouse_phone = nilIfEmpty(t.spouse_phone);
    if (t.children_count !== undefined) data.children_count = t.children_count;
    if (t.profession !== undefined) data.profession = nilIfEmpty(t.profession);
    if (t.nationality !== undefined) data.nationality = nilIfEmpty(t.nationality);
    if (t.photo_url !== undefined) data.photo_url = nilIfEmpty(t.photo_url);
    if (t.id_card_url !== undefined) data.id_card_url = nilIfEmpty(t.id_card_url);
    if (t.payment_status !== undefined) data.payment_status = nilIfEmpty(t.payment_status);
    return data;
};

export const normalizeProperty = (p: Partial<Property>) => {
    const data: any = {};
    if (p.agency_id !== undefined) data.agency_id = nilIfEmpty(p.agency_id);
    if (p.owner_id !== undefined) data.owner_id = nilIfEmpty(p.owner_id);
    if (p.title !== undefined) data.title = nilIfEmpty(p.title);
    if (p.description !== undefined) data.description = nilIfEmpty(p.description);
    if (p.location !== undefined) data.location = p.location;
    if (p.details !== undefined) data.details = p.details;
    if (p.standing !== undefined) data.standing = nilIfEmpty(p.standing);
    if (p.rooms !== undefined) data.rooms = p.rooms;
    if (p.images !== undefined) data.images = p.images;
    if (p.is_available !== undefined) data.is_available = p.is_available;
    if (p.for_sale !== undefined) data.for_sale = p.for_sale;
    if (p.for_rent !== undefined) data.for_rent = p.for_rent;
    if (p.monthly_rent !== undefined) data.monthly_rent = p.monthly_rent;
    if (p.sale_price !== undefined) data.sale_price = p.sale_price;
    return data;
};

export const normalizeAnnouncement = (a: Partial<Announcement>) => ({
    agency_id: nilIfEmpty(a.agency_id),
    property_id: nilIfEmpty(a.property_id),
    title: nilIfEmpty(a.title),
    description: nilIfEmpty(a.description),
    type: nilIfEmpty(a.type),
    is_active: a.is_active ?? true,
    expires_at: nilIfEmpty(a.expires_at),
    views: a.views ?? 0,
});

export const normalizeAnnouncementInterest = (ai: Partial<AnnouncementInterest>) => ({
    announcement_id: nilIfEmpty(ai.announcement_id),
    agency_id: nilIfEmpty(ai.agency_id),
    user_id: nilIfEmpty(ai.user_id),
    message: nilIfEmpty(ai.message),
    status: nilIfEmpty(ai.status) ?? 'pending',
});

export const normalizeContract = (c: Partial<Contract>): Partial<Contract> => ({
    agency_id: undefinedIfEmpty(c.agency_id),
    property_id: undefinedIfEmpty(c.property_id),
    owner_id: undefinedIfEmpty(c.owner_id),
    tenant_id: undefinedIfEmpty(c.tenant_id),
    type: undefinedIfEmpty(c.type),
    start_date: undefinedIfEmpty(c.start_date),
    end_date: undefinedIfEmpty(c.end_date),
    monthly_rent: undefinedIfEmpty(c.monthly_rent),
    sale_price: undefinedIfEmpty(c.sale_price),
    deposit: undefinedIfEmpty(c.deposit),
    charges: undefinedIfEmpty(c.charges),
    commission_rate: c.commission_rate ?? 10.0,
    commission_amount: c.commission_amount ?? 0,
    status: undefinedIfEmpty(c.status),
    terms: undefinedIfEmpty(c.terms),
    documents: Array.isArray(c.documents) ? c.documents : [],
    created_at: undefinedIfEmpty(c.created_at),
});

export const normalizeRentReceipt = (rr: Partial<RentReceipt>) => {
    // Convert period_month to integer if it's a string
    let periodMonth: number;
    if (typeof rr.period_month === 'string') {
        periodMonth = parseInt(rr.period_month, 10);
        if (isNaN(periodMonth) || periodMonth < 1 || periodMonth > 12) {
            periodMonth = new Date().getMonth() + 1; // Default to current month
        }
    } else {
        periodMonth = rr.period_month ?? new Date().getMonth() + 1;
    }

    return {
        agency_id: nilIfEmpty(rr.agency_id) ?? undefined,
        receipt_number: nilIfEmpty(rr.receipt_number) ?? undefined,
        contract_id: nilIfEmpty(rr.contract_id) ?? undefined,
        tenant_id: nilIfEmpty(rr.tenant_id) ?? undefined,
        property_id: nilIfEmpty(rr.property_id) ?? undefined,
        owner_id: nilIfEmpty(rr.owner_id) ?? undefined,
        period_month: periodMonth,
        period_year: rr.period_year ?? new Date().getFullYear(),
        rent_amount: rr.rent_amount ?? 0,
        charges: rr.charges ?? 0,
        total_amount: rr.total_amount ?? 0,
        commission_amount: rr.commission_amount ?? 0,
        owner_payment: rr.owner_payment ?? 0,
        payment_date: nilIfEmpty(rr.payment_date) ?? undefined,
        payment_method: nilIfEmpty(rr.payment_method) ?? "especes",
        notes: nilIfEmpty(rr.notes) ?? undefined,
        issued_by: nilIfEmpty(rr.issued_by) ?? undefined,
    };
};

export const normalizeFinancialStatement = (fs: any): FinancialStatement => ({
    id: nilIfEmpty(fs.id) ?? uuidv4(),
    agency_id: nilIfEmpty(fs.agency_id),
    owner_id: nilIfEmpty(fs.owner_id) ?? nilIfEmpty(fs.tenant_id),
    tenant_id: nilIfEmpty(fs.tenant_id),
    entity_type: nilIfEmpty(fs.entity_type) ?? (fs.owner_id ? 'owner' : 'tenant'),
    period: {
        start_date: nilIfEmpty(fs.period?.startDate ?? fs.period?.start_date) ?? new Date().toISOString(),
        end_date: nilIfEmpty(fs.period?.endDate ?? fs.period?.end_date) ?? new Date().toISOString(),
    },
    summary: {
        total_income: fs.summary?.totalIncome ?? fs.summary?.total_income ?? fs.total_income ?? 0,
        total_expenses: fs.summary?.totalExpenses ?? fs.summary?.total_expenses ?? fs.total_expenses ?? 0,
        balance: fs.summary?.netBalance ?? fs.summary?.balance ?? fs.net_balance ?? 0,
        pending_payments: fs.summary?.pendingPayments ?? fs.summary?.pending_payments ?? fs.pending_payments ?? 0,
    },
    transactions: (fs.transactions ?? []).map((t: any) => ({
        id: nilIfEmpty(t.id) ?? uuidv4(),
        date: nilIfEmpty(t.transactionDate ?? t.date) ?? new Date().toISOString(),
        description: nilIfEmpty(t.description) ?? 'Unknown',
        category: nilIfEmpty(t.category) ?? 'Other',
        type: nilIfEmpty(t.type) ?? 'expense',
        amount: t.amount ?? 0,
        property_id: nilIfEmpty(t.propertyId ?? t.property_id),
    })),
    generated_by: nilIfEmpty(fs.generated_by),
    generated_at: nilIfEmpty(fs.generatedAt ?? fs.generated_at) ?? new Date().toISOString(),
    created_at: nilIfEmpty(fs.created_at) ?? new Date().toISOString(),
    updated_at: nilIfEmpty(fs.updated_at) ?? new Date().toISOString(),
});

export const normalizeMessage = (m: Partial<Message>) => ({
    sender_id: nilIfEmpty(m.sender_id),
    receiver_id: nilIfEmpty(m.receiver_id),
    agency_id: nilIfEmpty(m.agency_id),
    property_id: nilIfEmpty(m.property_id),
    announcement_id: nilIfEmpty(m.announcement_id),
    subject: nilIfEmpty(m.subject),
    content: nilIfEmpty(m.content),
    is_read: m.is_read ?? false,
    attachments: m.attachments ?? [],
    created_at: nilIfEmpty(m.created_at) ?? new Date().toISOString(),
});

export const normalizeNotification = (n: Partial<Notification>) => ({
    user_id: nilIfEmpty(n.user_id),
    type: nilIfEmpty(n.type),
    title: nilIfEmpty(n.title),
    message: nilIfEmpty(n.message),
    data: n.data ?? {},
    is_read: n.is_read ?? false,
    priority: nilIfEmpty(n.priority) ?? 'normal',
    created_at: nilIfEmpty(n.created_at) ?? new Date().toISOString(),
});

export const normalizePlatformSetting = (ps: Partial<PlatformSetting>) => ({
    setting_key: nilIfEmpty(ps.setting_key),
    setting_value: ps.setting_value ?? {},
    description: nilIfEmpty(ps.description),
    category: nilIfEmpty(ps.category) ?? 'general',
    is_public: ps.is_public ?? false,
    updated_by: nilIfEmpty(ps.updated_by),
});

export const normalizeAuditLog = (al: Partial<AuditLog>) => {
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
        created_at: nilIfEmpty(al.created_at) ?? new Date().toISOString(),
    };
};

export const normalizeEmailNotification = (en: Partial<EmailNotification>) => ({
    id: nilIfEmpty(en.id) ?? uuidv4(),
    type: nilIfEmpty(en.type),
    recipient: nilIfEmpty(en.recipient),
    subject: nilIfEmpty(en.subject),
    content: nilIfEmpty(en.content),
    status: nilIfEmpty(en.status) ?? 'pending',
    sent_at: nilIfEmpty(en.sent_at),
    agency_id: nilIfEmpty(en.agency_id),
    created_at: nilIfEmpty(en.created_at) ?? new Date().toISOString(),
});