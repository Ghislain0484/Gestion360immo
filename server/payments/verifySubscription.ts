import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.types';

type AgencySubscriptionRow = Database['public']['Tables']['agency_subscriptions']['Row'];
type SubscriptionPaymentMethod =
  | 'especes'
  | 'cheque'
  | 'virement'
  | 'mobile_money'
  | 'bank_transfer'
  | 'cash'
  | 'check';

export interface VerifySubscriptionRequestBody {
  transaction_id: number;
  tx_ref: string;
  agency_id: string;
  subscription_id: string;
  expected_amount: number;
  currency?: string;
  email?: string;
}

interface VerifySubscriptionResponseBody {
  ok: boolean;
  error?: string;
  alreadyProcessed?: boolean;
  message?: string;
  status?: string;
  next_payment_date?: string;
}

const FLUTTERWAVE_VERIFY_BASE_URL = 'https://api.flutterwave.com/v3/transactions';

function getServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`La variable d'environnement ${name} est requise.`);
  }

  return value;
}

function createServiceSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("La variable d'environnement SUPABASE_URL est requise.");
  }

  if (!serviceRoleKey) {
    throw new Error("La variable d'environnement SUPABASE_SERVICE_ROLE_KEY est requise.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;

  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayDateOnly() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addMonthsToDateOnly(value: string | null | undefined, months: number) {
  const baseDate = parseDateOnly(value) || getTodayDateOnly();
  const day = baseDate.getUTCDate();
  const result = new Date(baseDate.getTime());

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));

  return result;
}

function getTransactionMeta(transaction: Record<string, unknown>) {
  const candidates = [
    transaction.meta,
    transaction.meta_data,
    transaction.metadata,
  ];

  for (const candidate of candidates) {
    if (isRecord(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getPaymentHistoryEntries(subscription: AgencySubscriptionRow) {
  return Array.isArray(subscription.payment_history) ? [...subscription.payment_history] : [];
}

function paymentHistoryContainsReference(subscription: AgencySubscriptionRow, txRef: string) {
  const history = getPaymentHistoryEntries(subscription);

  return history.some((entry) => {
    if (!isRecord(entry)) return false;
    return String(entry.tx_ref || entry.reference_number || '') === txRef;
  });
}

function mapFlutterwavePaymentMethod(paymentType: unknown): SubscriptionPaymentMethod {
  const normalized = String(paymentType || '').trim().toLowerCase();

  if (normalized.includes('mobile')) return 'mobile_money';
  if (normalized.includes('bank') || normalized.includes('transfer')) return 'bank_transfer';

  // The internal enum has no dedicated "card" value, so we keep a generic
  // bank-like bucket and preserve the exact Flutterwave method in notes.
  return 'virement';
}

function buildNotesPayload(transaction: Record<string, unknown>, meta: Record<string, unknown> | null) {
  return JSON.stringify({
    verified_at: new Date().toISOString(),
    flutterwave_transaction: transaction,
    verified_meta: meta,
  });
}

function toSuccessResponse(body: Omit<VerifySubscriptionResponseBody, 'ok'>) {
  return {
    status: 200,
    body: {
      ok: true,
      ...body,
    } satisfies VerifySubscriptionResponseBody,
  };
}

function toErrorResponse(status: number, error: string) {
  return {
    status,
    body: {
      ok: false,
      error,
    } satisfies VerifySubscriptionResponseBody,
  };
}

function parseRequestBody(rawBody: unknown): VerifySubscriptionRequestBody {
  if (!isRecord(rawBody)) {
    throw new Error('Corps de requete invalide.');
  }

  const transactionId = Number(rawBody.transaction_id);
  const txRef = String(rawBody.tx_ref || '').trim();
  const agencyId = String(rawBody.agency_id || '').trim();
  const subscriptionId = String(rawBody.subscription_id || '').trim();
  const expectedAmount = Number(rawBody.expected_amount);
  const currency = String(rawBody.currency || 'XOF').trim().toUpperCase();
  const email = rawBody.email ? String(rawBody.email) : undefined;

  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    throw new Error('transaction_id invalide.');
  }

  if (!txRef || !agencyId || !subscriptionId) {
    throw new Error('tx_ref, agency_id et subscription_id sont requis.');
  }

  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
    throw new Error('expected_amount invalide.');
  }

  return {
    transaction_id: transactionId,
    tx_ref: txRef,
    agency_id: agencyId,
    subscription_id: subscriptionId,
    expected_amount: expectedAmount,
    currency,
    email,
  };
}

async function verifyFlutterwaveTransaction(transactionId: number) {
  const secretKey = getServerEnv('FLUTTERWAVE_SECRET_KEY');

  const response = await fetch(`${FLUTTERWAVE_VERIFY_BASE_URL}/${transactionId}/verify`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: 'application/json',
    },
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const message = payload && typeof payload.message === 'string'
      ? payload.message
      : 'Verification Flutterwave impossible.';
    throw new Error(message);
  }

  return payload;
}

async function insertPaymentRecord(args: {
  supabase: ReturnType<typeof createServiceSupabaseClient>;
  subscriptionId: string;
  txRef: string;
  amount: number;
  paymentDate: string;
  paymentMethod: SubscriptionPaymentMethod;
  notes: string;
}) {
  const { error } = await args.supabase
    .from('subscription_payments')
    .insert({
      subscription_id: args.subscriptionId,
      amount: args.amount,
      payment_date: args.paymentDate,
      payment_method: args.paymentMethod,
      reference_number: args.txRef,
      status: 'successful',
      processed_by: null,
      notes: args.notes,
    });

  if (error) {
    throw new Error(`Impossible d'enregistrer le paiement d'abonnement: ${error.message}`);
  }
}

export async function handleVerifySubscriptionRequest(rawBody: unknown) {
  try {
    const body = parseRequestBody(rawBody);
    const supabase = createServiceSupabaseClient();

    const { data: subscription, error: subscriptionError } = await supabase
      .from('agency_subscriptions')
      .select('*')
      .eq('id', body.subscription_id)
      .eq('agency_id', body.agency_id)
      .single();

    if (subscriptionError || !subscription) {
      return toErrorResponse(404, "Abonnement introuvable pour cette agence.");
    }

    const { data: existingPayment, error: paymentLookupError } = await supabase
      .from('subscription_payments')
      .select('id, reference_number')
      .eq('subscription_id', body.subscription_id)
      .eq('reference_number', body.tx_ref)
      .maybeSingle();

    if (paymentLookupError) {
      return toErrorResponse(500, paymentLookupError.message);
    }

    if (existingPayment) {
      return toSuccessResponse({
        alreadyProcessed: true,
        message: 'Paiement deja confirme.',
        status: subscription.status,
        next_payment_date: subscription.next_payment_date,
      });
    }

    const verificationPayload = await verifyFlutterwaveTransaction(body.transaction_id);
    const verifiedTransaction = verificationPayload && isRecord(verificationPayload.data)
      ? verificationPayload.data
      : null;

    if (!verifiedTransaction) {
      return toErrorResponse(400, 'Reponse Flutterwave invalide.');
    }

    const verifiedStatus = String(verifiedTransaction.status || '').trim().toLowerCase();
    if (verifiedStatus !== 'successful') {
      return toErrorResponse(400, 'La transaction verifiee n est pas marquee comme successful.');
    }

    const verifiedTxRef = String(verifiedTransaction.tx_ref || '').trim();
    if (verifiedTxRef !== body.tx_ref) {
      return toErrorResponse(400, 'Le tx_ref Flutterwave ne correspond pas a la transaction attendue.');
    }

    const verifiedCurrency = String(verifiedTransaction.currency || '').trim().toUpperCase();
    if (verifiedCurrency !== body.currency) {
      return toErrorResponse(400, `Devise inattendue (${verifiedCurrency || 'inconnue'}).`);
    }

    const verifiedAmount = Number(verifiedTransaction.amount ?? verifiedTransaction.charged_amount ?? 0);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount < body.expected_amount) {
      return toErrorResponse(400, 'Le montant verifie est inferieur au montant attendu.');
    }

    const verifiedCustomer = isRecord(verifiedTransaction.customer) ? verifiedTransaction.customer : null;
    if (body.email) {
      const verifiedEmail = normalizeEmail(String(verifiedCustomer?.email || ''));
      if (!verifiedEmail || verifiedEmail !== normalizeEmail(body.email)) {
        return toErrorResponse(400, 'L adresse email du paiement ne correspond pas au compte connecte.');
      }
    }

    const meta = getTransactionMeta(verifiedTransaction);
    if (!meta) {
      return toErrorResponse(400, 'Les metadonnees de paiement sont absentes.');
    }

    if (String(meta.payment_type || '').trim().toLowerCase() !== 'subscription') {
      return toErrorResponse(400, "Le contexte de paiement n'est pas un abonnement.");
    }

    if (String(meta.agency_id || '').trim() !== body.agency_id) {
      return toErrorResponse(400, "L'agence verifiee ne correspond pas a la requete.");
    }

    if (String(meta.subscription_id || '').trim() !== body.subscription_id) {
      return toErrorResponse(400, "L'abonnement verifie ne correspond pas a la requete.");
    }

    const paymentDate = formatDateOnly(getTodayDateOnly());
    const paymentMethod = mapFlutterwavePaymentMethod(verifiedTransaction.payment_type);
    const notes = buildNotesPayload(verifiedTransaction, meta);

    if (paymentHistoryContainsReference(subscription, body.tx_ref)) {
      await insertPaymentRecord({
        supabase,
        subscriptionId: body.subscription_id,
        txRef: body.tx_ref,
        amount: verifiedAmount,
        paymentDate,
        paymentMethod,
        notes,
      });

      return toSuccessResponse({
        alreadyProcessed: true,
        message: 'Paiement deja confirme.',
        status: subscription.status,
        next_payment_date: subscription.next_payment_date,
      });
    }

    const nextPaymentDate = addMonthsToDateOnly(subscription.next_payment_date, 1);
    const nextPaymentDateValue = formatDateOnly(nextPaymentDate);
    const stillSuspended = nextPaymentDate < getTodayDateOnly();
    const nextStatus = stillSuspended ? 'suspended' : 'active';
    const paymentHistory = getPaymentHistoryEntries(subscription);
    const nowIso = new Date().toISOString();

    paymentHistory.push({
      amount: verifiedAmount,
      date: paymentDate,
      tx_ref: body.tx_ref,
      transaction_id: body.transaction_id,
      payment_method: verifiedTransaction.payment_type,
    });

    const { error: subscriptionUpdateError } = await supabase
      .from('agency_subscriptions')
      .update({
        last_payment_date: paymentDate,
        next_payment_date: nextPaymentDateValue,
        payment_history: paymentHistory,
        status: nextStatus,
        trial_days_remaining: null,
        updated_at: nowIso,
      })
      .eq('id', body.subscription_id);

    if (subscriptionUpdateError) {
      return toErrorResponse(500, subscriptionUpdateError.message);
    }

    const { error: agencyUpdateError } = await supabase
      .from('agencies')
      .update({
        subscription_status: nextStatus,
        plan_type: subscription.plan_type,
        monthly_fee: subscription.monthly_fee,
        updated_at: nowIso,
      })
      .eq('id', body.agency_id);

    if (agencyUpdateError) {
      return toErrorResponse(500, agencyUpdateError.message);
    }

    await insertPaymentRecord({
      supabase,
      subscriptionId: body.subscription_id,
      txRef: body.tx_ref,
      amount: verifiedAmount,
      paymentDate,
      paymentMethod,
      notes,
    });

    return toSuccessResponse({
      message: stillSuspended
        ? 'Paiement verifie, mais l abonnement reste suspendu car un arriere subsiste.'
        : 'Paiement verifie et abonnement mis a jour.',
      status: nextStatus,
      next_payment_date: nextPaymentDateValue,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue lors de la verification du paiement.';
    return toErrorResponse(500, message);
  }
}
