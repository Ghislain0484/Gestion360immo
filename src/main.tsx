import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { OfflineSyncManager } from './lib/offlineSync';

// Initialisation du gestionnaire de synchronisation Hors-ligne
OfflineSyncManager.init();

// --- SILENCIEUX DE PANIQUE (RÉACT) ---
// Intercepteur de dernier recours pour neutraliser les crashs de Supabase
if (typeof window !== 'undefined') {
  const universalSilencer = (e: any) => {
    const error = e.error || e.reason || e.message || e;
    const msg = (typeof error === 'string' ? error : (error.message || error.stack || "")).toLowerCase();
    
    // On cible spécifiquement les erreurs de BroadcastChannel / No Listener
    if (msg.indexOf('no listener') !== -1 || msg.indexOf('outgoing.message.ready') !== -1) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      console.warn("🛡️ [Réact] Panique Supabase neutralisée avec succès.");
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
