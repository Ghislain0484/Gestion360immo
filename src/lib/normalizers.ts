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

export const normalizeAgency = (a: Partial<Agency>) => ({
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
    // Supprimé le bloc agency_id pour fixer TS2339 (absent de User). Ajoutez agency_id à User type si needed.

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

export const normalizeTenant = (t: Partial<Tenant>) => ({
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

export const normalizeProperty = (p: Partial<Property>) => ({
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

export const normalizeContract = (c: Partial<Contract>) => ({
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

export const normalizeRentReceipt = (rr: Partial<RentReceipt>) => ({
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