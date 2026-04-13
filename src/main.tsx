import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { OfflineSyncManager } from './lib/offlineSync';

// Initialisation du gestionnaire de synchronisation Hors-ligne
OfflineSyncManager.init();

// INTERCEPTEUR DE CRASH VITE: Empêche l'overlay d'erreur Vite de bloquer l'application
// à cause de l'erreur interne inoffensive de Supabase Auth (tabs sync).
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason.toString === 'function') {
    const errorString = event.reason.toString();
    if (errorString.includes('No Listener') || errorString.includes('tabs:outgoing.message.ready')) {
      // Annule l'événement pour empêcher Vite (vite-plugin-checker ou client overlay) de crasher l'UI
      event.preventDefault();
      console.warn('⚠️ [Supprimé] Erreur inoffensive Supabase interceptée:', errorString);
    }
  }
});

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
