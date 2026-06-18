import { supabase } from '../../lib/config';

// ─── Shared types ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  category: string;
  description: string;
  payment_method: string;
  source: 'rent_receipt' | 'modular_transaction' | 'property_expense';
  reference_id: string;
  details?: any;
}

export interface CaisseFilters {
  ownerId: string;
  period: string;
  type: string;
  category: string;
}

export interface CaisseMetricsData {
  potential: number;
  expected: number;
  collected: number;
  remaining: number;
  balance: number;
}

// ─── Transaction categories ─────────────────────────────────────────────────────
export const TRANSACTION_CATEGORIES: Record<string, string> = {
  rent_payment: 'Loyer',
  owner_payout: 'Reversement Propriétaire',
  caution: 'Caution',
  agency_fees: 'Honoraires Agence',
  bank_deposit: 'Dépôt Banque',
  withdrawal: 'Retrait / Décaissement',
  supplies: 'Fournitures / Bureau',
  maintenance: 'Maintenance / Travaux',
  salary: 'Salaires / Commissions',
  other: 'Autre',
};

// ─── Credit types (income direction) ────────────────────────────────────────────
export const CREDIT_TYPES = ['income', 'credit', 'deposit'];

// ─── Data fetching service ───────────────────────────────────────────────────────

export const fetchCaisseData = async (
  agencyId: string,
  filters: CaisseFilters
): Promise<{
  transactions: Transaction[];
  globalCredits: number;
  globalDebits: number;
  potential: number;
  expected: number;
  collected: number;
  collectedThisMonth: number;
}> => {
  // ── Date range helper ──
  const getDateRange = (period: string) => {
    if (!period || period === 'all') return null;
    const [year, month] = period.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);
    return { startDate, endDate };
  };
  const dateRange = getDateRange(filters.period);

  // ── Run all queries in parallel ──────────────────────────────────────────────
  const [receiptsRes, cashRes, expensesRes, globalReceiptsRes, globalManualRes, globalExpensesRes, propsRes, contractsRes] =
    await Promise.all([
      // Filtered queries (for journal display)
      (() => {
        let q = supabase
          .from('rent_receipts')
          .select('*, tenant:tenants(first_name,last_name,business_id), property:properties(title,business_id,owner_id)')
          .eq('agency_id', agencyId);
        if (filters.ownerId !== 'all') q = q.eq('owner_id', filters.ownerId);
        if (dateRange) q = q.gte('payment_date', dateRange.startDate).lte('payment_date', dateRange.endDate);
        return q;
      })(),
      (() => {
        let q = supabase.from('modular_transactions').select('*').eq('agency_id', agencyId);
        // When filtering by owner, include only owner-linked transactions
        if (filters.ownerId !== 'all') {
          q = q.eq('related_owner_id', filters.ownerId);
        }
        if (dateRange) q = q.gte('transaction_date', dateRange.startDate).lte('transaction_date', dateRange.endDate);
        return q;
      })(),
      (() => {
        let q = supabase.from('property_expenses').select('*, property:properties(title)').eq('agency_id', agencyId);
        if (filters.ownerId !== 'all') q = q.eq('owner_id', filters.ownerId);
        if (dateRange) q = q.gte('expense_date', dateRange.startDate).lte('expense_date', dateRange.endDate);
        return q;
      })(),

      // Global queries (for accurate balance — no filters)
      supabase.from('rent_receipts').select('amount_paid, total_amount, property_id, payment_date, created_at').eq('agency_id', agencyId),
      supabase.from('modular_transactions').select('amount, type, category, related_property_id, transaction_date, created_at').eq('agency_id', agencyId),
      supabase.from('property_expenses').select('amount').eq('agency_id', agencyId),

      // KPI data
      (() => {
        let q = supabase.from('properties').select('monthly_rent').eq('agency_id', agencyId);
        if (filters.ownerId !== 'all') q = q.eq('owner_id', filters.ownerId);
        return q;
      })(),
      (() => {
        let q = supabase.from('contracts').select('monthly_rent, start_date, end_date, property_id, status, properties!inner(owner_id)').eq('agency_id', agencyId);
        if (filters.ownerId !== 'all') q = q.eq('properties.owner_id', filters.ownerId);
        return q;
      })(),
    ]);

  const receipts = receiptsRes.data ?? [];
  const cashTrans = cashRes.data ?? [];
  const workExpenses = expensesRes.data ?? [];
  const globalReceipts = globalReceiptsRes.data ?? [];
  const globalManual = globalManualRes.data ?? [];
  const globalExpenses = globalExpensesRes.data ?? [];

  // Dédupliquer les modular_transactions globales de type rent_payment qui font doublon avec rent_receipts
  const uniqueGlobalManual = globalManual.filter(m => {
    if (m.category !== 'rent_payment' || !CREDIT_TYPES.includes(m.type)) return true;
    const isDuplicated = globalReceipts.some(r =>
      r.property_id === m.related_property_id &&
      Math.abs(Number(r.amount_paid || r.total_amount) - Number(m.amount)) < 1 &&
      Math.abs(new Date(r.payment_date || r.created_at).getTime() - new Date(m.transaction_date || m.created_at).getTime()) < 172800000
    );
    return !isDuplicated;
  });

  // ── Global balance ──────────────────────────────────────────────────────────
  const globalCredits =
    globalReceipts.reduce((s, r) => s + (Number(r.amount_paid ?? r.total_amount) || 0), 0) +
    uniqueGlobalManual.filter(t => CREDIT_TYPES.includes(t.type)).reduce((s, t) => s + Number(t.amount || 0), 0);

  const globalDebits =
    uniqueGlobalManual.filter(t => !CREDIT_TYPES.includes(t.type)).reduce((s, t) => s + Number(t.amount || 0), 0) +
    globalExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const potential = (propsRes.data ?? []).reduce((s, p) => s + (Number(p.monthly_rent) || 0), 0);
  
  // Refined expected calculation based on period context
  const targetDateRange = dateRange || { 
    startDate: new Date().toISOString().slice(0, 10), 
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) 
  };
  const startOfPeriod = new Date(targetDateRange.startDate);
  const endOfPeriod = new Date(targetDateRange.endDate);

  const expected = (contractsRes.data ?? []).reduce((s, c) => {
    // Only count rent if the contract was active during the period
    const startStr = c.start_date;
    const endStr = c.end_date || '9999-12-31';
    const periodStartStr = startOfPeriod.toISOString().split('T')[0];
    const periodEndStr = endOfPeriod.toISOString().split('T')[0];
    
    const wasActive = startStr <= periodEndStr && endStr >= periodStartStr;
    const isValidStatus = ['active', 'renewed', 'terminated', 'archived', 'expired', 'actif', 'renouvelé', 'terminé', 'archivé', 'expiré'].includes(c.status);
    
    if (wasActive && isValidStatus && !['cancelled', 'draft', 'annulé'].includes(c.status)) {
      return s + (Number(c.monthly_rent) || 0);
    }
    return s;
  }, 0);

  // ── Map to normalized Transaction objects ────────────────────────────────────
  const mappedReceipts: Transaction[] = receipts.map(r => ({
    id: `receipt-${r.id}`,
    date: r.payment_date,
    type: 'credit',
    category: 'rent_payment',
    amount: r.amount_paid ?? r.total_amount,
    description: `Loyer ${r.property?.title || 'Bien'} - ${r.tenant?.first_name || ''} ${r.tenant?.last_name || ''}`,
    payment_method: r.payment_method,
    source: 'rent_receipt',
    reference_id: r.receipt_number,
    details: r,
  }));

  // Dédupliquer les transactions de loyer manuelles par rapport aux reçus
  const uniqueCashTrans = cashTrans.filter(m => {
    if (m.category !== 'rent_payment' || !CREDIT_TYPES.includes(m.type)) return true;
    const isDuplicated = receipts.some(r =>
      r.property_id === m.related_property_id &&
      Math.abs(Number(r.amount_paid || r.total_amount) - Number(m.amount)) < 1 &&
      Math.abs(new Date(r.payment_date || r.created_at).getTime() - new Date(m.transaction_date || m.created_at).getTime()) < 172800000
    );
    return !isDuplicated;
  });

  const mappedManual: Transaction[] = uniqueCashTrans.map(t => {
    let ownerPayment = 0;
    if (t.category === 'owner_payout') ownerPayment = t.amount;
    else if (t.category === 'caution') ownerPayment = 0;
    else if (t.category === 'rent_payment') {
      const match = t.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
      ownerPayment = match ? Number(match[1]) : t.amount * 0.9;
    }
    return {
      id: t.id,
      date: t.transaction_date,
      type: CREDIT_TYPES.includes(t.type) ? 'credit' : 'debit',
      amount: t.amount,
      category: t.category,
      description: t.description || 'N/A',
      payment_method: t.payment_method,
      source: 'modular_transaction',
      reference_id: '',
      details: { ...t, owner_payment: ownerPayment },
    };
  });

  const mappedExpenses: Transaction[] = workExpenses.map(e => ({
    id: `expense-${e.id}`,
    date: e.expense_date,
    type: 'debit',
    amount: e.amount,
    category: e.category || 'maintenance',
    description: `Travaux - ${e.description || 'Intervention'} (${e.property?.title || 'Bien'})`,
    payment_method: 'especes',
    source: 'property_expense',
    reference_id: '',
    details: e,
  }));

  const allTransactions = [...mappedReceipts, ...mappedManual, ...mappedExpenses].sort(
    (a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const aTime = a.details?.created_at ? new Date(a.details.created_at).getTime() : 0;
      const bTime = b.details?.created_at ? new Date(b.details.created_at).getTime() : 0;
      return bTime - aTime;
    }
  );

  const collected = mappedReceipts
    .filter(t => t.category === 'rent_payment' && t.type === 'credit')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  // Pour "Reste à percevoir", on se base sur les encaissements du mois en cours
  // car 'expected' représente le loyer mensuel attendu.
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const collectedThisMonth = mappedReceipts
    .filter(t => {
      if (t.category !== 'rent_payment' || t.type !== 'credit') return false;
      // Si on a filtré sur une période spécifique, on utilise les encaissements de la période pour le calcul
      if (filters.period && filters.period !== 'all') return true; 
      // Sinon, on extrait uniquement les encaissements du mois courant
      return t.date.startsWith(currentMonthStr);
    })
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  return { transactions: allTransactions, globalCredits, globalDebits, potential, expected, collected, collectedThisMonth };
};

