import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { OfflineSyncManager } from './lib/offlineSync';

// Initialisation du gestionnaire de synchronisation Hors-ligne
OfflineSyncManager.init();

// --- SILENCIEUX DE PANIQUE ULTIME (RÉACT) ---
// On intercepte TOUT ce qui pourrait bloquer l'UI suite au bug Supabase/Antivirus
if (typeof window !== 'undefined') {
  // --- DOM SHIELD INTERCEPTOR ---
  try {
    const _origRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child: any) {
      if (child && child.parentNode === this) {
        return _origRemoveChild.call(this, child);
      }
      return child;
    };

    const _origRemove = Element.prototype.remove;
    Element.prototype.remove = function() {
      if (this.parentNode) {
        try { _origRemove.call(this); } catch(e) {}
      }
    };
  } catch (e) {
    console.warn("🛡️ [DOM Shield] Error:", e);
  }

  // --- SURCHARGE GLOBALE DU FORMATAGE DES NOMBRES (Points pour les milliers) ---
  const originalNumberToLocale = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function(locale, options) {
    // On force le style allemand (de-DE) qui utilise des points pour les milliers
    return originalNumberToLocale.call(this, 'de-DE', options);
  };

  const universalSilencer = (e: any) => {
    const error = e.error || e.reason || e.message || e;
    const msg = (typeof error === 'string' ? error : (error.message || error.stack || "") || "").toLowerCase();
    
    // On capture les erreurs de communication (Broadcast) et les erreurs de type (regression lock)
    const patterns = ['no listener', 'outgoing.message.ready', 'this.lock'];
    
    if (patterns.some(p => msg.indexOf(p) !== -1)) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      console.warn("🛡️ [Réact] Protection Active : Erreur interceptée et neutralisée.");
      return true;
    }
  };
  window.addEventListener('error', universalSilencer, { capture: true });
  window.addEventListener('unhandledrejection', universalSilencer, { capture: true });
}

// Configuration du QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
