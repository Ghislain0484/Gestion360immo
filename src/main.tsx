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
