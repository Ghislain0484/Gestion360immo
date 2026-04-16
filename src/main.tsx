import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { OfflineSyncManager } from './lib/offlineSync';

// Initialisation du gestionnaire de synchronisation Hors-ligne
OfflineSyncManager.init();

// --- BLINDAGE ANTI-CRASH SUPABASE (BROADCASTCHANNEL) ---
function suppressSupabaseCrash(error: any) {
  if (!error) return false;
  const msg = error.message || (typeof error === 'string' ? error : error.toString());
  if (msg && (
    msg.includes('No Listener') || 
    msg.includes('tabs:outgoing.message.ready') ||
    msg.includes('BroadcastChannel')
  )) {
    console.warn('⚡ [Intercepté] Crash Supabase évité :', msg);
    return true;
  }
  return false;
}

window.addEventListener('unhandledrejection', (event) => {
  if (suppressSupabaseCrash(event.reason)) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

window.addEventListener('error', (event) => {
  if (suppressSupabaseCrash(event.error || event.message)) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

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
