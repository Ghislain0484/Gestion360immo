import Dexie, { Table } from 'dexie';
import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

// Définition du schéma de la base de données locale pour l'Outbox
export interface OfflineMutation {
  id?: number;
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: any;
  record_id?: string;
  timestamp: string;
  synced: boolean;
  retry_count: number;
}

class OfflineDatabase extends Dexie {
  mutations!: Table<OfflineMutation>;

  constructor() {
    super('Gestion360Offline');
    this.version(1).stores({
      mutations: '++id, table, action, synced, timestamp'
    });
  }
}

const db = new OfflineDatabase();

export const OfflineSyncManager = {
  /**
   * Enregistre une mutation dans la file d'attente locale si hors ligne
   */
  async queueMutation(mutation: Omit<OfflineMutation, 'timestamp' | 'synced' | 'retry_count'>) {
    try {
      await db.mutations.add({
        ...mutation,
        timestamp: new Date().toISOString(),
        synced: false,
        retry_count: 0
      });
      console.log('📦 Mutation mise en attente (Hors-ligne):', mutation);
      toast.success('Action enregistrée (Mode Hors-ligne). Elle sera synchronisée dès le retour de la connexion.');
    } catch (error) {
      console.error('❌ Erreur lors de la mise en attente de la mutation:', error);
    }
  },

  /**
   * Synchronise toutes les mutations en attente vers Supabase
   */
  async syncOutbox() {
    const pending = await db.mutations.where('synced').equals(0).toArray();
    
    if (pending.length === 0) return;

    console.log(`🔄 Synchronisation de ${pending.length} actions en attente...`);
    toast.loading(`Synchronisation de ${pending.length} actions...`, { id: 'sync-toast' });

    for (const mutation of pending) {
      try {
        let error;
        
        if (mutation.action === 'insert') {
          const { error: err } = await supabase.from(mutation.table).insert(mutation.payload);
          error = err;
        } else if (mutation.action === 'update') {
          const { error: err } = await supabase
            .from(mutation.table)
            .update(mutation.payload)
            .eq('id', mutation.record_id);
          error = err;
        } else if (mutation.action === 'delete') {
          const { error: err } = await supabase
            .from(mutation.table)
            .delete()
            .eq('id', mutation.record_id);
          error = err;
        }

        if (!error) {
          await db.mutations.update(mutation.id!, { synced: true });
          console.log(`✅ Mutation synchronisée: ${mutation.table} (${mutation.action})`);
        } else {
          console.error(`❌ Échec de synchro pour ${mutation.table}:`, error);
          await db.mutations.update(mutation.id!, { retry_count: mutation.retry_count + 1 });
        }
      } catch (err) {
        console.error('🔥 Erreur critique pendant la synchro:', err);
      }
    }

    const remaining = await db.mutations.where('synced').equals(0).count();
    if (remaining === 0) {
      toast.success('Toutes les données sont à jour !', { id: 'sync-toast' });
      // Optionnel: Nettoyer les mutations synchronisées
      await db.mutations.where('synced').equals(1).delete();
    } else {
      toast.error(`${remaining} actions n'ont pas pu être synchronisées.`, { id: 'sync-toast' });
    }
  },

  /**
   * Vérifie si le navigateur est en ligne
   */
  isOnline() {
    return window.navigator.onLine;
  },

  /**
   * Initialise l'écouteur de connexion
   */
  init() {
    window.addEventListener('online', () => {
      console.log('🌐 Connexion rétablie ! Lancement de la synchronisation...');
      this.syncOutbox();
    });

    window.addEventListener('offline', () => {
      console.warn('🔌 Vous êtes maintenant hors-ligne. Les actions seront mises en attente.');
      toast.error('Connexion perdue. Passage en mode Hors-ligne.', { icon: '🔌' });
    });
    
    // Tentative initiale si on est en ligne au chargement
    if (this.isOnline()) {
      this.syncOutbox();
    }
  }
};
