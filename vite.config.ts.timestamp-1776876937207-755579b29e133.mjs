// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/DELL%205510%20CORE%20I7/Documents/project-gestion360-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/DELL%205510%20CORE%20I7/Documents/project-gestion360-main/node_modules/@vitejs/plugin-react/dist/index.js";
import legacy from "file:///C:/Users/DELL%205510%20CORE%20I7/Documents/project-gestion360-main/node_modules/@vitejs/plugin-legacy/dist/index.mjs";

// server/payments/verifySubscription.ts
import { createClient } from "file:///C:/Users/DELL%205510%20CORE%20I7/Documents/project-gestion360-main/node_modules/@supabase/supabase-js/dist/index.mjs";
var FLUTTERWAVE_VERIFY_BASE_URL = "https://api.flutterwave.com/v3/transactions";
function getServerEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`La variable d'environnement ${name} est requise.`);
  }
  return value;
}
function createServiceSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) {
    throw new Error("La variable d'environnement SUPABASE_URL est requise.");
  }
  if (!serviceRoleKey) {
    throw new Error("La variable d'environnement SUPABASE_SERVICE_ROLE_KEY est requise.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeEmail(value) {
  return (value || "").trim().toLowerCase();
}
function parseDateOnly(value) {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
}
function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}
function getTodayDateOnly() {
  const now = /* @__PURE__ */ new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function addMonthsToDateOnly(value, months) {
  const baseDate = parseDateOnly(value) || getTodayDateOnly();
  const day = baseDate.getUTCDate();
  const result = new Date(baseDate.getTime());
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
function getTransactionMeta(transaction) {
  const candidates = [
    transaction.meta,
    transaction.meta_data,
    transaction.metadata
  ];
  for (const candidate of candidates) {
    if (isRecord(candidate)) {
      return candidate;
    }
  }
  return null;
}
function getPaymentHistoryEntries(subscription) {
  return Array.isArray(subscription.payment_history) ? [...subscription.payment_history] : [];
}
function paymentHistoryContainsReference(subscription, txRef) {
  const history = getPaymentHistoryEntries(subscription);
  return history.some((entry) => {
    if (!isRecord(entry)) return false;
    return String(entry.tx_ref || entry.reference_number || "") === txRef;
  });
}
function mapFlutterwavePaymentMethod(paymentType) {
  const normalized = String(paymentType || "").trim().toLowerCase();
  if (normalized.includes("mobile")) return "mobile_money";
  if (normalized.includes("bank") || normalized.includes("transfer")) return "bank_transfer";
  return "virement";
}
function buildNotesPayload(transaction, meta) {
  return JSON.stringify({
    verified_at: (/* @__PURE__ */ new Date()).toISOString(),
    flutterwave_transaction: transaction,
    verified_meta: meta
  });
}
function toSuccessResponse(body) {
  return {
    status: 200,
    body: {
      ok: true,
      ...body
    }
  };
}
function toErrorResponse(status, error) {
  return {
    status,
    body: {
      ok: false,
      error
    }
  };
}
function parseRequestBody(rawBody) {
  if (!isRecord(rawBody)) {
    throw new Error("Corps de requete invalide.");
  }
  const transactionId = Number(rawBody.transaction_id);
  const txRef = String(rawBody.tx_ref || "").trim();
  const agencyId = String(rawBody.agency_id || "").trim();
  const subscriptionId = String(rawBody.subscription_id || "").trim();
  const expectedAmount = Number(rawBody.expected_amount);
  const currency = String(rawBody.currency || "XOF").trim().toUpperCase();
  const email = rawBody.email ? String(rawBody.email) : void 0;
  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    throw new Error("transaction_id invalide.");
  }
  if (!txRef || !agencyId || !subscriptionId) {
    throw new Error("tx_ref, agency_id et subscription_id sont requis.");
  }
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
    throw new Error("expected_amount invalide.");
  }
  return {
    transaction_id: transactionId,
    tx_ref: txRef,
    agency_id: agencyId,
    subscription_id: subscriptionId,
    expected_amount: expectedAmount,
    currency,
    email
  };
}
async function verifyFlutterwaveTransaction(transactionId) {
  const secretKey = getServerEnv("FLUTTERWAVE_SECRET_KEY");
  const response = await fetch(`${FLUTTERWAVE_VERIFY_BASE_URL}/${transactionId}/verify`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json"
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload.message === "string" ? payload.message : "Verification Flutterwave impossible.";
    throw new Error(message);
  }
  return payload;
}
async function insertPaymentRecord(args) {
  const { error } = await args.supabase.from("subscription_payments").insert({
    subscription_id: args.subscriptionId,
    amount: args.amount,
    payment_date: args.paymentDate,
    payment_method: args.paymentMethod,
    reference_number: args.txRef,
    status: "successful",
    processed_by: null,
    notes: args.notes
  });
  if (error) {
    throw new Error(`Impossible d'enregistrer le paiement d'abonnement: ${error.message}`);
  }
}
async function handleVerifySubscriptionRequest(rawBody) {
  try {
    const body = parseRequestBody(rawBody);
    const supabase = createServiceSupabaseClient();
    const { data: subscription, error: subscriptionError } = await supabase.from("agency_subscriptions").select("*").eq("id", body.subscription_id).eq("agency_id", body.agency_id).single();
    if (subscriptionError || !subscription) {
      return toErrorResponse(404, "Abonnement introuvable pour cette agence.");
    }
    const { data: existingPayment, error: paymentLookupError } = await supabase.from("subscription_payments").select("id, reference_number").eq("subscription_id", body.subscription_id).eq("reference_number", body.tx_ref).maybeSingle();
    if (paymentLookupError) {
      return toErrorResponse(500, paymentLookupError.message);
    }
    if (existingPayment) {
      return toSuccessResponse({
        alreadyProcessed: true,
        message: "Paiement deja confirme.",
        status: subscription.status,
        next_payment_date: subscription.next_payment_date
      });
    }
    const verificationPayload = await verifyFlutterwaveTransaction(body.transaction_id);
    const verifiedTransaction = verificationPayload && isRecord(verificationPayload.data) ? verificationPayload.data : null;
    if (!verifiedTransaction) {
      return toErrorResponse(400, "Reponse Flutterwave invalide.");
    }
    const verifiedStatus = String(verifiedTransaction.status || "").trim().toLowerCase();
    if (verifiedStatus !== "successful") {
      return toErrorResponse(400, "La transaction verifiee n est pas marquee comme successful.");
    }
    const verifiedTxRef = String(verifiedTransaction.tx_ref || "").trim();
    if (verifiedTxRef !== body.tx_ref) {
      return toErrorResponse(400, "Le tx_ref Flutterwave ne correspond pas a la transaction attendue.");
    }
    const verifiedCurrency = String(verifiedTransaction.currency || "").trim().toUpperCase();
    if (verifiedCurrency !== body.currency) {
      return toErrorResponse(400, `Devise inattendue (${verifiedCurrency || "inconnue"}).`);
    }
    const verifiedAmount = Number(verifiedTransaction.amount ?? verifiedTransaction.charged_amount ?? 0);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount < body.expected_amount) {
      return toErrorResponse(400, "Le montant verifie est inferieur au montant attendu.");
    }
    const verifiedCustomer = isRecord(verifiedTransaction.customer) ? verifiedTransaction.customer : null;
    if (body.email) {
      const verifiedEmail = normalizeEmail(String(verifiedCustomer?.email || ""));
      if (!verifiedEmail || verifiedEmail !== normalizeEmail(body.email)) {
        return toErrorResponse(400, "L adresse email du paiement ne correspond pas au compte connecte.");
      }
    }
    const meta = getTransactionMeta(verifiedTransaction);
    if (!meta) {
      return toErrorResponse(400, "Les metadonnees de paiement sont absentes.");
    }
    if (String(meta.payment_type || "").trim().toLowerCase() !== "subscription") {
      return toErrorResponse(400, "Le contexte de paiement n'est pas un abonnement.");
    }
    if (String(meta.agency_id || "").trim() !== body.agency_id) {
      return toErrorResponse(400, "L'agence verifiee ne correspond pas a la requete.");
    }
    if (String(meta.subscription_id || "").trim() !== body.subscription_id) {
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
        notes
      });
      return toSuccessResponse({
        alreadyProcessed: true,
        message: "Paiement deja confirme.",
        status: subscription.status,
        next_payment_date: subscription.next_payment_date
      });
    }
    const nextPaymentDate = addMonthsToDateOnly(subscription.next_payment_date, 1);
    const nextPaymentDateValue = formatDateOnly(nextPaymentDate);
    const stillSuspended = nextPaymentDate < getTodayDateOnly();
    const nextStatus = stillSuspended ? "suspended" : "active";
    const paymentHistory = getPaymentHistoryEntries(subscription);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    paymentHistory.push({
      amount: verifiedAmount,
      date: paymentDate,
      tx_ref: body.tx_ref,
      transaction_id: body.transaction_id,
      payment_method: verifiedTransaction.payment_type
    });
    const { error: subscriptionUpdateError } = await supabase.from("agency_subscriptions").update({
      last_payment_date: paymentDate,
      next_payment_date: nextPaymentDateValue,
      payment_history: paymentHistory,
      status: nextStatus,
      trial_days_remaining: null,
      updated_at: nowIso
    }).eq("id", body.subscription_id);
    if (subscriptionUpdateError) {
      return toErrorResponse(500, subscriptionUpdateError.message);
    }
    const { error: agencyUpdateError } = await supabase.from("agencies").update({
      subscription_status: nextStatus,
      plan_type: subscription.plan_type,
      monthly_fee: subscription.monthly_fee,
      updated_at: nowIso
    }).eq("id", body.agency_id);
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
      notes
    });
    return toSuccessResponse({
      message: stillSuspended ? "Paiement verifie, mais l abonnement reste suspendu car un arriere subsiste." : "Paiement verifie et abonnement mis a jour.",
      status: nextStatus,
      next_payment_date: nextPaymentDateValue
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inattendue lors de la verification du paiement.";
    return toErrorResponse(500, message);
  }
}

// vite.config.ts
var readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};
var sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};
var subscriptionVerificationDevPlugin = () => ({
  name: "subscription-verification-dev-plugin",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = (req.url || "").split("?")[0];
      if (pathname !== "/api/payments/verify-subscription") {
        next();
        return;
      }
      if (req.method !== "POST") {
        sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
        return;
      }
      try {
        const body = await readJsonBody(req);
        const result = await handleVerifySubscriptionRequest(body);
        sendJson(res, result.status, result.body);
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : "Erreur serveur de developpement."
        });
      }
    });
  }
});
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);
  return {
    plugins: [
      react(),
      legacy({
        targets: ["defaults", "not IE 11", "Safari 12"]
      }),
      subscriptionVerificationDevPlugin()
    ],
    build: {
      outDir: "dist",
      sourcemap: false,
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-core": ["react", "react-dom"],
            "vendor-router": ["react-router-dom", "@tanstack/react-query"],
            "vendor-supabase": ["@supabase/supabase-js"],
            "vendor-ui": ["lucide-react", "clsx", "tailwind-merge", "react-hot-toast"],
            "vendor-utils": ["date-fns", "dexie", "html2canvas", "jspdf"]
          }
        }
      }
    },
    server: {
      port: 3e3,
      host: true,
      hmr: {
        overlay: false
      }
    },
    preview: {
      port: 3e3,
      host: true
    },
    optimizeDeps: {
      exclude: ["lucide-react"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic2VydmVyL3BheW1lbnRzL3ZlcmlmeVN1YnNjcmlwdGlvbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXERFTEwgNTUxMCBDT1JFIEk3XFxcXERvY3VtZW50c1xcXFxwcm9qZWN0LWdlc3Rpb24zNjAtbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcREVMTCA1NTEwIENPUkUgSTdcXFxcRG9jdW1lbnRzXFxcXHByb2plY3QtZ2VzdGlvbjM2MC1tYWluXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9ERUxMJTIwNTUxMCUyMENPUkUlMjBJNy9Eb2N1bWVudHMvcHJvamVjdC1nZXN0aW9uMzYwLW1haW4vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBJbmNvbWluZ01lc3NhZ2UsIFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnbm9kZTpodHRwJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiwgVml0ZURldlNlcnZlciB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCBsZWdhY3kgZnJvbSAnQHZpdGVqcy9wbHVnaW4tbGVnYWN5JztcbmltcG9ydCB7IGhhbmRsZVZlcmlmeVN1YnNjcmlwdGlvblJlcXVlc3QgfSBmcm9tICcuL3NlcnZlci9wYXltZW50cy92ZXJpZnlTdWJzY3JpcHRpb24nO1xuXG5jb25zdCByZWFkSnNvbkJvZHkgPSBhc3luYyAocmVxOiBJbmNvbWluZ01lc3NhZ2UpID0+IHtcbiAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xuXG4gIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2YgcmVxKSB7XG4gICAgY2h1bmtzLnB1c2goQnVmZmVyLmlzQnVmZmVyKGNodW5rKSA/IGNodW5rIDogQnVmZmVyLmZyb20oY2h1bmspKTtcbiAgfVxuXG4gIGlmIChjaHVua3MubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgcmV0dXJuIEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4JykpO1xufTtcblxuY29uc3Qgc2VuZEpzb24gPSAocmVzOiBTZXJ2ZXJSZXNwb25zZSwgc3RhdHVzOiBudW1iZXIsIGJvZHk6IHVua25vd24pID0+IHtcbiAgcmVzLnN0YXR1c0NvZGUgPSBzdGF0dXM7XG4gIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoYm9keSkpO1xufTtcblxuY29uc3Qgc3Vic2NyaXB0aW9uVmVyaWZpY2F0aW9uRGV2UGx1Z2luID0gKCkgPT4gKHtcbiAgbmFtZTogJ3N1YnNjcmlwdGlvbi12ZXJpZmljYXRpb24tZGV2LXBsdWdpbicsXG4gIGFwcGx5OiAnc2VydmUnIGFzIGNvbnN0LFxuICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyOiBWaXRlRGV2U2VydmVyKSB7XG4gICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhc3luYyAocmVxOiBJbmNvbWluZ01lc3NhZ2UgJiB7IHVybD86IHN0cmluZyB9LCByZXM6IFNlcnZlclJlc3BvbnNlLCBuZXh0OiAoKSA9PiB2b2lkKSA9PiB7XG4gICAgICBjb25zdCBwYXRobmFtZSA9IChyZXEudXJsIHx8ICcnKS5zcGxpdCgnPycpWzBdO1xuICAgICAgaWYgKHBhdGhuYW1lICE9PSAnL2FwaS9wYXltZW50cy92ZXJpZnktc3Vic2NyaXB0aW9uJykge1xuICAgICAgICBuZXh0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykge1xuICAgICAgICBzZW5kSnNvbihyZXMsIDQwNSwgeyBvazogZmFsc2UsIGVycm9yOiAnTWV0aG9kIE5vdCBBbGxvd2VkJyB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVhZEpzb25Cb2R5KHJlcSk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZVZlcmlmeVN1YnNjcmlwdGlvblJlcXVlc3QoYm9keSk7XG4gICAgICAgIHNlbmRKc29uKHJlcywgcmVzdWx0LnN0YXR1cywgcmVzdWx0LmJvZHkpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc2VuZEpzb24ocmVzLCA1MDAsIHtcbiAgICAgICAgICBvazogZmFsc2UsXG4gICAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0VycmV1ciBzZXJ2ZXVyIGRlIGRldmVsb3BwZW1lbnQuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG59KTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG4gIE9iamVjdC5hc3NpZ24ocHJvY2Vzcy5lbnYsIGVudik7XG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAgbGVnYWN5KHtcbiAgICAgICAgdGFyZ2V0czogWydkZWZhdWx0cycsICdub3QgSUUgMTEnLCAnU2FmYXJpIDEyJ10sXG4gICAgICB9KSxcbiAgICAgIHN1YnNjcmlwdGlvblZlcmlmaWNhdGlvbkRldlBsdWdpbigpLFxuICAgIF0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxuICAgICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICAgIG1pbmlmeTogJ3RlcnNlcicsXG4gICAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgICAgZHJvcF9jb25zb2xlOiB0cnVlLFxuICAgICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAgICd2ZW5kb3ItY29yZSc6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgICAndmVuZG9yLXJvdXRlcic6IFsncmVhY3Qtcm91dGVyLWRvbScsICdAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcbiAgICAgICAgICAgICd2ZW5kb3Itc3VwYWJhc2UnOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxuICAgICAgICAgICAgJ3ZlbmRvci11aSc6IFsnbHVjaWRlLXJlYWN0JywgJ2Nsc3gnLCAndGFpbHdpbmQtbWVyZ2UnLCAncmVhY3QtaG90LXRvYXN0J10sXG4gICAgICAgICAgICAndmVuZG9yLXV0aWxzJzogWydkYXRlLWZucycsICdkZXhpZScsICdodG1sMmNhbnZhcycsICdqc3BkZiddLFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiAzMDAwLFxuICAgICAgaG9zdDogdHJ1ZSxcbiAgICAgIGhtcjoge1xuICAgICAgICBvdmVybGF5OiBmYWxzZVxuICAgICAgfVxuICAgIH0sXG4gICAgcHJldmlldzoge1xuICAgICAgcG9ydDogMzAwMCxcbiAgICAgIGhvc3Q6IHRydWVcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgICB9LFxuICB9O1xufSk7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXERFTEwgNTUxMCBDT1JFIEk3XFxcXERvY3VtZW50c1xcXFxwcm9qZWN0LWdlc3Rpb24zNjAtbWFpblxcXFxzZXJ2ZXJcXFxccGF5bWVudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXERFTEwgNTUxMCBDT1JFIEk3XFxcXERvY3VtZW50c1xcXFxwcm9qZWN0LWdlc3Rpb24zNjAtbWFpblxcXFxzZXJ2ZXJcXFxccGF5bWVudHNcXFxcdmVyaWZ5U3Vic2NyaXB0aW9uLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9ERUxMJTIwNTUxMCUyMENPUkUlMjBJNy9Eb2N1bWVudHMvcHJvamVjdC1nZXN0aW9uMzYwLW1haW4vc2VydmVyL3BheW1lbnRzL3ZlcmlmeVN1YnNjcmlwdGlvbi50c1wiO2ltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyc7XG5pbXBvcnQgdHlwZSB7IERhdGFiYXNlIH0gZnJvbSAnLi4vLi4vc3JjL3R5cGVzL2RhdGFiYXNlLnR5cGVzJztcblxudHlwZSBBZ2VuY3lTdWJzY3JpcHRpb25Sb3cgPSBEYXRhYmFzZVsncHVibGljJ11bJ1RhYmxlcyddWydhZ2VuY3lfc3Vic2NyaXB0aW9ucyddWydSb3cnXTtcbnR5cGUgU3Vic2NyaXB0aW9uUGF5bWVudE1ldGhvZCA9XG4gIHwgJ2VzcGVjZXMnXG4gIHwgJ2NoZXF1ZSdcbiAgfCAndmlyZW1lbnQnXG4gIHwgJ21vYmlsZV9tb25leSdcbiAgfCAnYmFua190cmFuc2ZlcidcbiAgfCAnY2FzaCdcbiAgfCAnY2hlY2snO1xuXG5leHBvcnQgaW50ZXJmYWNlIFZlcmlmeVN1YnNjcmlwdGlvblJlcXVlc3RCb2R5IHtcbiAgdHJhbnNhY3Rpb25faWQ6IG51bWJlcjtcbiAgdHhfcmVmOiBzdHJpbmc7XG4gIGFnZW5jeV9pZDogc3RyaW5nO1xuICBzdWJzY3JpcHRpb25faWQ6IHN0cmluZztcbiAgZXhwZWN0ZWRfYW1vdW50OiBudW1iZXI7XG4gIGN1cnJlbmN5Pzogc3RyaW5nO1xuICBlbWFpbD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFZlcmlmeVN1YnNjcmlwdGlvblJlc3BvbnNlQm9keSB7XG4gIG9rOiBib29sZWFuO1xuICBlcnJvcj86IHN0cmluZztcbiAgYWxyZWFkeVByb2Nlc3NlZD86IGJvb2xlYW47XG4gIG1lc3NhZ2U/OiBzdHJpbmc7XG4gIHN0YXR1cz86IHN0cmluZztcbiAgbmV4dF9wYXltZW50X2RhdGU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IEZMVVRURVJXQVZFX1ZFUklGWV9CQVNFX1VSTCA9ICdodHRwczovL2FwaS5mbHV0dGVyd2F2ZS5jb20vdjMvdHJhbnNhY3Rpb25zJztcblxuZnVuY3Rpb24gZ2V0U2VydmVyRW52KG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbbmFtZV07XG4gIGlmICghdmFsdWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYExhIHZhcmlhYmxlIGQnZW52aXJvbm5lbWVudCAke25hbWV9IGVzdCByZXF1aXNlLmApO1xuICB9XG5cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVTZXJ2aWNlU3VwYWJhc2VDbGllbnQoKSB7XG4gIGNvbnN0IHN1cGFiYXNlVXJsID1cbiAgICBwcm9jZXNzLmVudi5TVVBBQkFTRV9VUkwgfHxcbiAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwgfHxcbiAgICBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTDtcbiAgY29uc3Qgc2VydmljZVJvbGVLZXkgPSBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZO1xuXG4gIGlmICghc3VwYWJhc2VVcmwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJMYSB2YXJpYWJsZSBkJ2Vudmlyb25uZW1lbnQgU1VQQUJBU0VfVVJMIGVzdCByZXF1aXNlLlwiKTtcbiAgfVxuXG4gIGlmICghc2VydmljZVJvbGVLZXkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJMYSB2YXJpYWJsZSBkJ2Vudmlyb25uZW1lbnQgU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSBlc3QgcmVxdWlzZS5cIik7XG4gIH1cblxuICByZXR1cm4gY3JlYXRlQ2xpZW50PERhdGFiYXNlPihzdXBhYmFzZVVybCwgc2VydmljZVJvbGVLZXksIHtcbiAgICBhdXRoOiB7IGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlLCBwZXJzaXN0U2Vzc2lvbjogZmFsc2UgfSxcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGlzUmVjb3JkKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUVtYWlsKHZhbHVlPzogc3RyaW5nIHwgbnVsbCkge1xuICByZXR1cm4gKHZhbHVlIHx8ICcnKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VEYXRlT25seSh2YWx1ZT86IHN0cmluZyB8IG51bGwpIHtcbiAgaWYgKCF2YWx1ZSkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgcGFydHMgPSB2YWx1ZS5zcGxpdCgnLScpLm1hcChOdW1iZXIpO1xuICBpZiAocGFydHMubGVuZ3RoICE9PSAzIHx8IHBhcnRzLnNvbWUoTnVtYmVyLmlzTmFOKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgW3llYXIsIG1vbnRoLCBkYXldID0gcGFydHM7XG4gIHJldHVybiBuZXcgRGF0ZShEYXRlLlVUQyh5ZWFyLCBtb250aCAtIDEsIGRheSkpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXRlT25seShkYXRlOiBEYXRlKSB7XG4gIHJldHVybiBkYXRlLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xufVxuXG5mdW5jdGlvbiBnZXRUb2RheURhdGVPbmx5KCkge1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMobm93LmdldFVUQ0Z1bGxZZWFyKCksIG5vdy5nZXRVVENNb250aCgpLCBub3cuZ2V0VVRDRGF0ZSgpKSk7XG59XG5cbmZ1bmN0aW9uIGFkZE1vbnRoc1RvRGF0ZU9ubHkodmFsdWU6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQsIG1vbnRoczogbnVtYmVyKSB7XG4gIGNvbnN0IGJhc2VEYXRlID0gcGFyc2VEYXRlT25seSh2YWx1ZSkgfHwgZ2V0VG9kYXlEYXRlT25seSgpO1xuICBjb25zdCBkYXkgPSBiYXNlRGF0ZS5nZXRVVENEYXRlKCk7XG4gIGNvbnN0IHJlc3VsdCA9IG5ldyBEYXRlKGJhc2VEYXRlLmdldFRpbWUoKSk7XG5cbiAgcmVzdWx0LnNldFVUQ0RhdGUoMSk7XG4gIHJlc3VsdC5zZXRVVENNb250aChyZXN1bHQuZ2V0VVRDTW9udGgoKSArIG1vbnRocyk7XG5cbiAgY29uc3QgbGFzdERheSA9IG5ldyBEYXRlKERhdGUuVVRDKHJlc3VsdC5nZXRVVENGdWxsWWVhcigpLCByZXN1bHQuZ2V0VVRDTW9udGgoKSArIDEsIDApKS5nZXRVVENEYXRlKCk7XG4gIHJlc3VsdC5zZXRVVENEYXRlKE1hdGgubWluKGRheSwgbGFzdERheSkpO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGdldFRyYW5zYWN0aW9uTWV0YSh0cmFuc2FjdGlvbjogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHtcbiAgY29uc3QgY2FuZGlkYXRlcyA9IFtcbiAgICB0cmFuc2FjdGlvbi5tZXRhLFxuICAgIHRyYW5zYWN0aW9uLm1ldGFfZGF0YSxcbiAgICB0cmFuc2FjdGlvbi5tZXRhZGF0YSxcbiAgXTtcblxuICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVzKSB7XG4gICAgaWYgKGlzUmVjb3JkKGNhbmRpZGF0ZSkpIHtcbiAgICAgIHJldHVybiBjYW5kaWRhdGU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldFBheW1lbnRIaXN0b3J5RW50cmllcyhzdWJzY3JpcHRpb246IEFnZW5jeVN1YnNjcmlwdGlvblJvdykge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShzdWJzY3JpcHRpb24ucGF5bWVudF9oaXN0b3J5KSA/IFsuLi5zdWJzY3JpcHRpb24ucGF5bWVudF9oaXN0b3J5XSA6IFtdO1xufVxuXG5mdW5jdGlvbiBwYXltZW50SGlzdG9yeUNvbnRhaW5zUmVmZXJlbmNlKHN1YnNjcmlwdGlvbjogQWdlbmN5U3Vic2NyaXB0aW9uUm93LCB0eFJlZjogc3RyaW5nKSB7XG4gIGNvbnN0IGhpc3RvcnkgPSBnZXRQYXltZW50SGlzdG9yeUVudHJpZXMoc3Vic2NyaXB0aW9uKTtcblxuICByZXR1cm4gaGlzdG9yeS5zb21lKChlbnRyeSkgPT4ge1xuICAgIGlmICghaXNSZWNvcmQoZW50cnkpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIFN0cmluZyhlbnRyeS50eF9yZWYgfHwgZW50cnkucmVmZXJlbmNlX251bWJlciB8fCAnJykgPT09IHR4UmVmO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbWFwRmx1dHRlcndhdmVQYXltZW50TWV0aG9kKHBheW1lbnRUeXBlOiB1bmtub3duKTogU3Vic2NyaXB0aW9uUGF5bWVudE1ldGhvZCB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBTdHJpbmcocGF5bWVudFR5cGUgfHwgJycpLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuXG4gIGlmIChub3JtYWxpemVkLmluY2x1ZGVzKCdtb2JpbGUnKSkgcmV0dXJuICdtb2JpbGVfbW9uZXknO1xuICBpZiAobm9ybWFsaXplZC5pbmNsdWRlcygnYmFuaycpIHx8IG5vcm1hbGl6ZWQuaW5jbHVkZXMoJ3RyYW5zZmVyJykpIHJldHVybiAnYmFua190cmFuc2Zlcic7XG5cbiAgLy8gVGhlIGludGVybmFsIGVudW0gaGFzIG5vIGRlZGljYXRlZCBcImNhcmRcIiB2YWx1ZSwgc28gd2Uga2VlcCBhIGdlbmVyaWNcbiAgLy8gYmFuay1saWtlIGJ1Y2tldCBhbmQgcHJlc2VydmUgdGhlIGV4YWN0IEZsdXR0ZXJ3YXZlIG1ldGhvZCBpbiBub3Rlcy5cbiAgcmV0dXJuICd2aXJlbWVudCc7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkTm90ZXNQYXlsb2FkKHRyYW5zYWN0aW9uOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwgbWV0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgdmVyaWZpZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBmbHV0dGVyd2F2ZV90cmFuc2FjdGlvbjogdHJhbnNhY3Rpb24sXG4gICAgdmVyaWZpZWRfbWV0YTogbWV0YSxcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHRvU3VjY2Vzc1Jlc3BvbnNlKGJvZHk6IE9taXQ8VmVyaWZ5U3Vic2NyaXB0aW9uUmVzcG9uc2VCb2R5LCAnb2snPikge1xuICByZXR1cm4ge1xuICAgIHN0YXR1czogMjAwLFxuICAgIGJvZHk6IHtcbiAgICAgIG9rOiB0cnVlLFxuICAgICAgLi4uYm9keSxcbiAgICB9IHNhdGlzZmllcyBWZXJpZnlTdWJzY3JpcHRpb25SZXNwb25zZUJvZHksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHRvRXJyb3JSZXNwb25zZShzdGF0dXM6IG51bWJlciwgZXJyb3I6IHN0cmluZykge1xuICByZXR1cm4ge1xuICAgIHN0YXR1cyxcbiAgICBib2R5OiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBlcnJvcixcbiAgICB9IHNhdGlzZmllcyBWZXJpZnlTdWJzY3JpcHRpb25SZXNwb25zZUJvZHksXG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlUmVxdWVzdEJvZHkocmF3Qm9keTogdW5rbm93bik6IFZlcmlmeVN1YnNjcmlwdGlvblJlcXVlc3RCb2R5IHtcbiAgaWYgKCFpc1JlY29yZChyYXdCb2R5KSkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ29ycHMgZGUgcmVxdWV0ZSBpbnZhbGlkZS4nKTtcbiAgfVxuXG4gIGNvbnN0IHRyYW5zYWN0aW9uSWQgPSBOdW1iZXIocmF3Qm9keS50cmFuc2FjdGlvbl9pZCk7XG4gIGNvbnN0IHR4UmVmID0gU3RyaW5nKHJhd0JvZHkudHhfcmVmIHx8ICcnKS50cmltKCk7XG4gIGNvbnN0IGFnZW5jeUlkID0gU3RyaW5nKHJhd0JvZHkuYWdlbmN5X2lkIHx8ICcnKS50cmltKCk7XG4gIGNvbnN0IHN1YnNjcmlwdGlvbklkID0gU3RyaW5nKHJhd0JvZHkuc3Vic2NyaXB0aW9uX2lkIHx8ICcnKS50cmltKCk7XG4gIGNvbnN0IGV4cGVjdGVkQW1vdW50ID0gTnVtYmVyKHJhd0JvZHkuZXhwZWN0ZWRfYW1vdW50KTtcbiAgY29uc3QgY3VycmVuY3kgPSBTdHJpbmcocmF3Qm9keS5jdXJyZW5jeSB8fCAnWE9GJykudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG4gIGNvbnN0IGVtYWlsID0gcmF3Qm9keS5lbWFpbCA/IFN0cmluZyhyYXdCb2R5LmVtYWlsKSA6IHVuZGVmaW5lZDtcblxuICBpZiAoIU51bWJlci5pc0Zpbml0ZSh0cmFuc2FjdGlvbklkKSB8fCB0cmFuc2FjdGlvbklkIDw9IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3RyYW5zYWN0aW9uX2lkIGludmFsaWRlLicpO1xuICB9XG5cbiAgaWYgKCF0eFJlZiB8fCAhYWdlbmN5SWQgfHwgIXN1YnNjcmlwdGlvbklkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd0eF9yZWYsIGFnZW5jeV9pZCBldCBzdWJzY3JpcHRpb25faWQgc29udCByZXF1aXMuJyk7XG4gIH1cblxuICBpZiAoIU51bWJlci5pc0Zpbml0ZShleHBlY3RlZEFtb3VudCkgfHwgZXhwZWN0ZWRBbW91bnQgPD0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignZXhwZWN0ZWRfYW1vdW50IGludmFsaWRlLicpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0cmFuc2FjdGlvbl9pZDogdHJhbnNhY3Rpb25JZCxcbiAgICB0eF9yZWY6IHR4UmVmLFxuICAgIGFnZW5jeV9pZDogYWdlbmN5SWQsXG4gICAgc3Vic2NyaXB0aW9uX2lkOiBzdWJzY3JpcHRpb25JZCxcbiAgICBleHBlY3RlZF9hbW91bnQ6IGV4cGVjdGVkQW1vdW50LFxuICAgIGN1cnJlbmN5LFxuICAgIGVtYWlsLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiB2ZXJpZnlGbHV0dGVyd2F2ZVRyYW5zYWN0aW9uKHRyYW5zYWN0aW9uSWQ6IG51bWJlcikge1xuICBjb25zdCBzZWNyZXRLZXkgPSBnZXRTZXJ2ZXJFbnYoJ0ZMVVRURVJXQVZFX1NFQ1JFVF9LRVknKTtcblxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke0ZMVVRURVJXQVZFX1ZFUklGWV9CQVNFX1VSTH0vJHt0cmFuc2FjdGlvbklkfS92ZXJpZnlgLCB7XG4gICAgbWV0aG9kOiAnR0VUJyxcbiAgICBoZWFkZXJzOiB7XG4gICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7c2VjcmV0S2V5fWAsXG4gICAgICBBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9LFxuICB9KTtcblxuICBjb25zdCBwYXlsb2FkID0gKGF3YWl0IHJlc3BvbnNlLmpzb24oKS5jYXRjaCgoKSA9PiBudWxsKSkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsO1xuXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICBjb25zdCBtZXNzYWdlID0gcGF5bG9hZCAmJiB0eXBlb2YgcGF5bG9hZC5tZXNzYWdlID09PSAnc3RyaW5nJ1xuICAgICAgPyBwYXlsb2FkLm1lc3NhZ2VcbiAgICAgIDogJ1ZlcmlmaWNhdGlvbiBGbHV0dGVyd2F2ZSBpbXBvc3NpYmxlLic7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICB9XG5cbiAgcmV0dXJuIHBheWxvYWQ7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluc2VydFBheW1lbnRSZWNvcmQoYXJnczoge1xuICBzdXBhYmFzZTogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlU2VydmljZVN1cGFiYXNlQ2xpZW50PjtcbiAgc3Vic2NyaXB0aW9uSWQ6IHN0cmluZztcbiAgdHhSZWY6IHN0cmluZztcbiAgYW1vdW50OiBudW1iZXI7XG4gIHBheW1lbnREYXRlOiBzdHJpbmc7XG4gIHBheW1lbnRNZXRob2Q6IFN1YnNjcmlwdGlvblBheW1lbnRNZXRob2Q7XG4gIG5vdGVzOiBzdHJpbmc7XG59KSB7XG4gIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGFyZ3Muc3VwYWJhc2VcbiAgICAuZnJvbSgnc3Vic2NyaXB0aW9uX3BheW1lbnRzJylcbiAgICAuaW5zZXJ0KHtcbiAgICAgIHN1YnNjcmlwdGlvbl9pZDogYXJncy5zdWJzY3JpcHRpb25JZCxcbiAgICAgIGFtb3VudDogYXJncy5hbW91bnQsXG4gICAgICBwYXltZW50X2RhdGU6IGFyZ3MucGF5bWVudERhdGUsXG4gICAgICBwYXltZW50X21ldGhvZDogYXJncy5wYXltZW50TWV0aG9kLFxuICAgICAgcmVmZXJlbmNlX251bWJlcjogYXJncy50eFJlZixcbiAgICAgIHN0YXR1czogJ3N1Y2Nlc3NmdWwnLFxuICAgICAgcHJvY2Vzc2VkX2J5OiBudWxsLFxuICAgICAgbm90ZXM6IGFyZ3Mubm90ZXMsXG4gICAgfSk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBJbXBvc3NpYmxlIGQnZW5yZWdpc3RyZXIgbGUgcGFpZW1lbnQgZCdhYm9ubmVtZW50OiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVZlcmlmeVN1YnNjcmlwdGlvblJlcXVlc3QocmF3Qm9keTogdW5rbm93bikge1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBwYXJzZVJlcXVlc3RCb2R5KHJhd0JvZHkpO1xuICAgIGNvbnN0IHN1cGFiYXNlID0gY3JlYXRlU2VydmljZVN1cGFiYXNlQ2xpZW50KCk7XG5cbiAgICBjb25zdCB7IGRhdGE6IHN1YnNjcmlwdGlvbiwgZXJyb3I6IHN1YnNjcmlwdGlvbkVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2FnZW5jeV9zdWJzY3JpcHRpb25zJylcbiAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgLmVxKCdpZCcsIGJvZHkuc3Vic2NyaXB0aW9uX2lkKVxuICAgICAgLmVxKCdhZ2VuY3lfaWQnLCBib2R5LmFnZW5jeV9pZClcbiAgICAgIC5zaW5nbGUoKTtcblxuICAgIGlmIChzdWJzY3JpcHRpb25FcnJvciB8fCAhc3Vic2NyaXB0aW9uKSB7XG4gICAgICByZXR1cm4gdG9FcnJvclJlc3BvbnNlKDQwNCwgXCJBYm9ubmVtZW50IGludHJvdXZhYmxlIHBvdXIgY2V0dGUgYWdlbmNlLlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGRhdGE6IGV4aXN0aW5nUGF5bWVudCwgZXJyb3I6IHBheW1lbnRMb29rdXBFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdzdWJzY3JpcHRpb25fcGF5bWVudHMnKVxuICAgICAgLnNlbGVjdCgnaWQsIHJlZmVyZW5jZV9udW1iZXInKVxuICAgICAgLmVxKCdzdWJzY3JpcHRpb25faWQnLCBib2R5LnN1YnNjcmlwdGlvbl9pZClcbiAgICAgIC5lcSgncmVmZXJlbmNlX251bWJlcicsIGJvZHkudHhfcmVmKVxuICAgICAgLm1heWJlU2luZ2xlKCk7XG5cbiAgICBpZiAocGF5bWVudExvb2t1cEVycm9yKSB7XG4gICAgICByZXR1cm4gdG9FcnJvclJlc3BvbnNlKDUwMCwgcGF5bWVudExvb2t1cEVycm9yLm1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGlmIChleGlzdGluZ1BheW1lbnQpIHtcbiAgICAgIHJldHVybiB0b1N1Y2Nlc3NSZXNwb25zZSh7XG4gICAgICAgIGFscmVhZHlQcm9jZXNzZWQ6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6ICdQYWllbWVudCBkZWphIGNvbmZpcm1lLicsXG4gICAgICAgIHN0YXR1czogc3Vic2NyaXB0aW9uLnN0YXR1cyxcbiAgICAgICAgbmV4dF9wYXltZW50X2RhdGU6IHN1YnNjcmlwdGlvbi5uZXh0X3BheW1lbnRfZGF0ZSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHZlcmlmaWNhdGlvblBheWxvYWQgPSBhd2FpdCB2ZXJpZnlGbHV0dGVyd2F2ZVRyYW5zYWN0aW9uKGJvZHkudHJhbnNhY3Rpb25faWQpO1xuICAgIGNvbnN0IHZlcmlmaWVkVHJhbnNhY3Rpb24gPSB2ZXJpZmljYXRpb25QYXlsb2FkICYmIGlzUmVjb3JkKHZlcmlmaWNhdGlvblBheWxvYWQuZGF0YSlcbiAgICAgID8gdmVyaWZpY2F0aW9uUGF5bG9hZC5kYXRhXG4gICAgICA6IG51bGw7XG5cbiAgICBpZiAoIXZlcmlmaWVkVHJhbnNhY3Rpb24pIHtcbiAgICAgIHJldHVybiB0b0Vycm9yUmVzcG9uc2UoNDAwLCAnUmVwb25zZSBGbHV0dGVyd2F2ZSBpbnZhbGlkZS4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB2ZXJpZmllZFN0YXR1cyA9IFN0cmluZyh2ZXJpZmllZFRyYW5zYWN0aW9uLnN0YXR1cyB8fCAnJykudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKHZlcmlmaWVkU3RhdHVzICE9PSAnc3VjY2Vzc2Z1bCcpIHtcbiAgICAgIHJldHVybiB0b0Vycm9yUmVzcG9uc2UoNDAwLCAnTGEgdHJhbnNhY3Rpb24gdmVyaWZpZWUgbiBlc3QgcGFzIG1hcnF1ZWUgY29tbWUgc3VjY2Vzc2Z1bC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB2ZXJpZmllZFR4UmVmID0gU3RyaW5nKHZlcmlmaWVkVHJhbnNhY3Rpb24udHhfcmVmIHx8ICcnKS50cmltKCk7XG4gICAgaWYgKHZlcmlmaWVkVHhSZWYgIT09IGJvZHkudHhfcmVmKSB7XG4gICAgICByZXR1cm4gdG9FcnJvclJlc3BvbnNlKDQwMCwgJ0xlIHR4X3JlZiBGbHV0dGVyd2F2ZSBuZSBjb3JyZXNwb25kIHBhcyBhIGxhIHRyYW5zYWN0aW9uIGF0dGVuZHVlLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHZlcmlmaWVkQ3VycmVuY3kgPSBTdHJpbmcodmVyaWZpZWRUcmFuc2FjdGlvbi5jdXJyZW5jeSB8fCAnJykudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG4gICAgaWYgKHZlcmlmaWVkQ3VycmVuY3kgIT09IGJvZHkuY3VycmVuY3kpIHtcbiAgICAgIHJldHVybiB0b0Vycm9yUmVzcG9uc2UoNDAwLCBgRGV2aXNlIGluYXR0ZW5kdWUgKCR7dmVyaWZpZWRDdXJyZW5jeSB8fCAnaW5jb25udWUnfSkuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgdmVyaWZpZWRBbW91bnQgPSBOdW1iZXIodmVyaWZpZWRUcmFuc2FjdGlvbi5hbW91bnQgPz8gdmVyaWZpZWRUcmFuc2FjdGlvbi5jaGFyZ2VkX2Ftb3VudCA/PyAwKTtcbiAgICBpZiAoIU51bWJlci5pc0Zpbml0ZSh2ZXJpZmllZEFtb3VudCkgfHwgdmVyaWZpZWRBbW91bnQgPCBib2R5LmV4cGVjdGVkX2Ftb3VudCkge1xuICAgICAgcmV0dXJuIHRvRXJyb3JSZXNwb25zZSg0MDAsICdMZSBtb250YW50IHZlcmlmaWUgZXN0IGluZmVyaWV1ciBhdSBtb250YW50IGF0dGVuZHUuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgdmVyaWZpZWRDdXN0b21lciA9IGlzUmVjb3JkKHZlcmlmaWVkVHJhbnNhY3Rpb24uY3VzdG9tZXIpID8gdmVyaWZpZWRUcmFuc2FjdGlvbi5jdXN0b21lciA6IG51bGw7XG4gICAgaWYgKGJvZHkuZW1haWwpIHtcbiAgICAgIGNvbnN0IHZlcmlmaWVkRW1haWwgPSBub3JtYWxpemVFbWFpbChTdHJpbmcodmVyaWZpZWRDdXN0b21lcj8uZW1haWwgfHwgJycpKTtcbiAgICAgIGlmICghdmVyaWZpZWRFbWFpbCB8fCB2ZXJpZmllZEVtYWlsICE9PSBub3JtYWxpemVFbWFpbChib2R5LmVtYWlsKSkge1xuICAgICAgICByZXR1cm4gdG9FcnJvclJlc3BvbnNlKDQwMCwgJ0wgYWRyZXNzZSBlbWFpbCBkdSBwYWllbWVudCBuZSBjb3JyZXNwb25kIHBhcyBhdSBjb21wdGUgY29ubmVjdGUuJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbWV0YSA9IGdldFRyYW5zYWN0aW9uTWV0YSh2ZXJpZmllZFRyYW5zYWN0aW9uKTtcbiAgICBpZiAoIW1ldGEpIHtcbiAgICAgIHJldHVybiB0b0Vycm9yUmVzcG9uc2UoNDAwLCAnTGVzIG1ldGFkb25uZWVzIGRlIHBhaWVtZW50IHNvbnQgYWJzZW50ZXMuJyk7XG4gICAgfVxuXG4gICAgaWYgKFN0cmluZyhtZXRhLnBheW1lbnRfdHlwZSB8fCAnJykudHJpbSgpLnRvTG93ZXJDYXNlKCkgIT09ICdzdWJzY3JpcHRpb24nKSB7XG4gICAgICByZXR1cm4gdG9FcnJvclJlc3BvbnNlKDQwMCwgXCJMZSBjb250ZXh0ZSBkZSBwYWllbWVudCBuJ2VzdCBwYXMgdW4gYWJvbm5lbWVudC5cIik7XG4gICAgfVxuXG4gICAgaWYgKFN0cmluZyhtZXRhLmFnZW5jeV9pZCB8fCAnJykudHJpbSgpICE9PSBib2R5LmFnZW5jeV9pZCkge1xuICAgICAgcmV0dXJuIHRvRXJyb3JSZXNwb25zZSg0MDAsIFwiTCdhZ2VuY2UgdmVyaWZpZWUgbmUgY29ycmVzcG9uZCBwYXMgYSBsYSByZXF1ZXRlLlwiKTtcbiAgICB9XG5cbiAgICBpZiAoU3RyaW5nKG1ldGEuc3Vic2NyaXB0aW9uX2lkIHx8ICcnKS50cmltKCkgIT09IGJvZHkuc3Vic2NyaXB0aW9uX2lkKSB7XG4gICAgICByZXR1cm4gdG9FcnJvclJlc3BvbnNlKDQwMCwgXCJMJ2Fib25uZW1lbnQgdmVyaWZpZSBuZSBjb3JyZXNwb25kIHBhcyBhIGxhIHJlcXVldGUuXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IHBheW1lbnREYXRlID0gZm9ybWF0RGF0ZU9ubHkoZ2V0VG9kYXlEYXRlT25seSgpKTtcbiAgICBjb25zdCBwYXltZW50TWV0aG9kID0gbWFwRmx1dHRlcndhdmVQYXltZW50TWV0aG9kKHZlcmlmaWVkVHJhbnNhY3Rpb24ucGF5bWVudF90eXBlKTtcbiAgICBjb25zdCBub3RlcyA9IGJ1aWxkTm90ZXNQYXlsb2FkKHZlcmlmaWVkVHJhbnNhY3Rpb24sIG1ldGEpO1xuXG4gICAgaWYgKHBheW1lbnRIaXN0b3J5Q29udGFpbnNSZWZlcmVuY2Uoc3Vic2NyaXB0aW9uLCBib2R5LnR4X3JlZikpIHtcbiAgICAgIGF3YWl0IGluc2VydFBheW1lbnRSZWNvcmQoe1xuICAgICAgICBzdXBhYmFzZSxcbiAgICAgICAgc3Vic2NyaXB0aW9uSWQ6IGJvZHkuc3Vic2NyaXB0aW9uX2lkLFxuICAgICAgICB0eFJlZjogYm9keS50eF9yZWYsXG4gICAgICAgIGFtb3VudDogdmVyaWZpZWRBbW91bnQsXG4gICAgICAgIHBheW1lbnREYXRlLFxuICAgICAgICBwYXltZW50TWV0aG9kLFxuICAgICAgICBub3RlcyxcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gdG9TdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgICBhbHJlYWR5UHJvY2Vzc2VkOiB0cnVlLFxuICAgICAgICBtZXNzYWdlOiAnUGFpZW1lbnQgZGVqYSBjb25maXJtZS4nLFxuICAgICAgICBzdGF0dXM6IHN1YnNjcmlwdGlvbi5zdGF0dXMsXG4gICAgICAgIG5leHRfcGF5bWVudF9kYXRlOiBzdWJzY3JpcHRpb24ubmV4dF9wYXltZW50X2RhdGUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBuZXh0UGF5bWVudERhdGUgPSBhZGRNb250aHNUb0RhdGVPbmx5KHN1YnNjcmlwdGlvbi5uZXh0X3BheW1lbnRfZGF0ZSwgMSk7XG4gICAgY29uc3QgbmV4dFBheW1lbnREYXRlVmFsdWUgPSBmb3JtYXREYXRlT25seShuZXh0UGF5bWVudERhdGUpO1xuICAgIGNvbnN0IHN0aWxsU3VzcGVuZGVkID0gbmV4dFBheW1lbnREYXRlIDwgZ2V0VG9kYXlEYXRlT25seSgpO1xuICAgIGNvbnN0IG5leHRTdGF0dXMgPSBzdGlsbFN1c3BlbmRlZCA/ICdzdXNwZW5kZWQnIDogJ2FjdGl2ZSc7XG4gICAgY29uc3QgcGF5bWVudEhpc3RvcnkgPSBnZXRQYXltZW50SGlzdG9yeUVudHJpZXMoc3Vic2NyaXB0aW9uKTtcbiAgICBjb25zdCBub3dJc28gPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICBwYXltZW50SGlzdG9yeS5wdXNoKHtcbiAgICAgIGFtb3VudDogdmVyaWZpZWRBbW91bnQsXG4gICAgICBkYXRlOiBwYXltZW50RGF0ZSxcbiAgICAgIHR4X3JlZjogYm9keS50eF9yZWYsXG4gICAgICB0cmFuc2FjdGlvbl9pZDogYm9keS50cmFuc2FjdGlvbl9pZCxcbiAgICAgIHBheW1lbnRfbWV0aG9kOiB2ZXJpZmllZFRyYW5zYWN0aW9uLnBheW1lbnRfdHlwZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHsgZXJyb3I6IHN1YnNjcmlwdGlvblVwZGF0ZUVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ2FnZW5jeV9zdWJzY3JpcHRpb25zJylcbiAgICAgIC51cGRhdGUoe1xuICAgICAgICBsYXN0X3BheW1lbnRfZGF0ZTogcGF5bWVudERhdGUsXG4gICAgICAgIG5leHRfcGF5bWVudF9kYXRlOiBuZXh0UGF5bWVudERhdGVWYWx1ZSxcbiAgICAgICAgcGF5bWVudF9oaXN0b3J5OiBwYXltZW50SGlzdG9yeSxcbiAgICAgICAgc3RhdHVzOiBuZXh0U3RhdHVzLFxuICAgICAgICB0cmlhbF9kYXlzX3JlbWFpbmluZzogbnVsbCxcbiAgICAgICAgdXBkYXRlZF9hdDogbm93SXNvLFxuICAgICAgfSlcbiAgICAgIC5lcSgnaWQnLCBib2R5LnN1YnNjcmlwdGlvbl9pZCk7XG5cbiAgICBpZiAoc3Vic2NyaXB0aW9uVXBkYXRlRXJyb3IpIHtcbiAgICAgIHJldHVybiB0b0Vycm9yUmVzcG9uc2UoNTAwLCBzdWJzY3JpcHRpb25VcGRhdGVFcnJvci5tZXNzYWdlKTtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVycm9yOiBhZ2VuY3lVcGRhdGVFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdhZ2VuY2llcycpXG4gICAgICAudXBkYXRlKHtcbiAgICAgICAgc3Vic2NyaXB0aW9uX3N0YXR1czogbmV4dFN0YXR1cyxcbiAgICAgICAgcGxhbl90eXBlOiBzdWJzY3JpcHRpb24ucGxhbl90eXBlLFxuICAgICAgICBtb250aGx5X2ZlZTogc3Vic2NyaXB0aW9uLm1vbnRobHlfZmVlLFxuICAgICAgICB1cGRhdGVkX2F0OiBub3dJc28sXG4gICAgICB9KVxuICAgICAgLmVxKCdpZCcsIGJvZHkuYWdlbmN5X2lkKTtcblxuICAgIGlmIChhZ2VuY3lVcGRhdGVFcnJvcikge1xuICAgICAgcmV0dXJuIHRvRXJyb3JSZXNwb25zZSg1MDAsIGFnZW5jeVVwZGF0ZUVycm9yLm1lc3NhZ2UpO1xuICAgIH1cblxuICAgIGF3YWl0IGluc2VydFBheW1lbnRSZWNvcmQoe1xuICAgICAgc3VwYWJhc2UsXG4gICAgICBzdWJzY3JpcHRpb25JZDogYm9keS5zdWJzY3JpcHRpb25faWQsXG4gICAgICB0eFJlZjogYm9keS50eF9yZWYsXG4gICAgICBhbW91bnQ6IHZlcmlmaWVkQW1vdW50LFxuICAgICAgcGF5bWVudERhdGUsXG4gICAgICBwYXltZW50TWV0aG9kLFxuICAgICAgbm90ZXMsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gdG9TdWNjZXNzUmVzcG9uc2Uoe1xuICAgICAgbWVzc2FnZTogc3RpbGxTdXNwZW5kZWRcbiAgICAgICAgPyAnUGFpZW1lbnQgdmVyaWZpZSwgbWFpcyBsIGFib25uZW1lbnQgcmVzdGUgc3VzcGVuZHUgY2FyIHVuIGFycmllcmUgc3Vic2lzdGUuJ1xuICAgICAgICA6ICdQYWllbWVudCB2ZXJpZmllIGV0IGFib25uZW1lbnQgbWlzIGEgam91ci4nLFxuICAgICAgc3RhdHVzOiBuZXh0U3RhdHVzLFxuICAgICAgbmV4dF9wYXltZW50X2RhdGU6IG5leHRQYXltZW50RGF0ZVZhbHVlLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdFcnJldXIgaW5hdHRlbmR1ZSBsb3JzIGRlIGxhIHZlcmlmaWNhdGlvbiBkdSBwYWllbWVudC4nO1xuICAgIHJldHVybiB0b0Vycm9yUmVzcG9uc2UoNTAwLCBtZXNzYWdlKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsY0FBYyxlQUE4QjtBQUNyRCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxZQUFZOzs7QUNIcWEsU0FBUyxvQkFBb0I7QUFnQ3JkLElBQU0sOEJBQThCO0FBRXBDLFNBQVMsYUFBYSxNQUFzQjtBQUMxQyxRQUFNLFFBQVEsUUFBUSxJQUFJLElBQUk7QUFDOUIsTUFBSSxDQUFDLE9BQU87QUFDVixVQUFNLElBQUksTUFBTSwrQkFBK0IsSUFBSSxlQUFlO0FBQUEsRUFDcEU7QUFFQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTLDhCQUE4QjtBQUNyQyxRQUFNLGNBQ0osUUFBUSxJQUFJLGdCQUNaLFFBQVEsSUFBSSw0QkFDWixRQUFRLElBQUk7QUFDZCxRQUFNLGlCQUFpQixRQUFRLElBQUk7QUFFbkMsTUFBSSxDQUFDLGFBQWE7QUFDaEIsVUFBTSxJQUFJLE1BQU0sdURBQXVEO0FBQUEsRUFDekU7QUFFQSxNQUFJLENBQUMsZ0JBQWdCO0FBQ25CLFVBQU0sSUFBSSxNQUFNLG9FQUFvRTtBQUFBLEVBQ3RGO0FBRUEsU0FBTyxhQUF1QixhQUFhLGdCQUFnQjtBQUFBLElBQ3pELE1BQU0sRUFBRSxrQkFBa0IsT0FBTyxnQkFBZ0IsTUFBTTtBQUFBLEVBQ3pELENBQUM7QUFDSDtBQUVB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
