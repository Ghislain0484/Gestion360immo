import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, MessageSquare } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type NotifType = 'message' | 'alert' | 'collaboration' | 'payment' | 'system';

// ─── Générateur de son via Web Audio API ─────────────────────────────────────
function playNotificationSound(type: NotifType = 'message') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    const freqMap: Record<NotifType, number[]> = {
      message:       [880, 1100],
      alert:         [440, 330],
      collaboration: [660, 880, 1100],
      payment:       [523, 659, 784],
      system:        [440],
    };

    const frequencies = freqMap[type] || freqMap.message;
    let time = ctx.currentTime;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.connect(gainNode);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + i * 0.12);

      gainNode.gain.setValueAtTime(0, time + i * 0.12);
      gainNode.gain.linearRampToValueAtTime(0.3, time + i * 0.12 + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, time + i * 0.12 + 0.18);

      osc.start(time + i * 0.12);
      osc.stop(time + i * 0.12 + 0.2);
    });

    setTimeout(() => ctx.close(), 2000);
  } catch {
    // Web Audio API non disponible sur certains navigateurs — fallback silencieux
    console.warn('NotificationSound: Web Audio API non disponible');
  }
}

// ─── Toast visuel enrichi ─────────────────────────────────────────────────────
function showVisualNotification(title: string, message: string, type: NotifType = 'message') {
  const colorMap: Record<NotifType, string> = {
    message:       'bg-blue-600',
    alert:         'bg-red-600',
    collaboration: 'bg-indigo-600',
    payment:       'bg-emerald-600',
    system:        'bg-slate-700',
  };

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-sm w-full shadow-2xl rounded-2xl pointer-events-auto flex overflow-hidden border border-white/10`}
        style={{ background: 'white' }}
      >
        {/* Barre colorée à gauche */}
        <div className={`w-1.5 flex-shrink-0 ${colorMap[type]}`} />
        <div className="flex-1 p-4">
          <div className="flex items-start gap-3">
            {/* Icône animée */}
            <div className={`w-10 h-10 rounded-xl ${colorMap[type]} flex items-center justify-center flex-shrink-0 animate-bounce`}>
              <span className="text-white text-lg">🔔</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 text-sm leading-tight truncate">{title}</p>
              <p className="text-slate-500 text-xs mt-0.5 leading-relaxed line-clamp-2">{message}</p>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      duration: 5000,
      position: 'top-right',
    }
  );
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export const useNotificationSound = () => {
  const playSoundAndNotify = useCallback((
    title: string,
    message: string,
    type: NotifType = 'message'
  ) => {
    playNotificationSound(type);
    showVisualNotification(title, message, type);
  }, []);

  return { playSoundAndNotify, playNotificationSound };
};

// ─── Hook de surveillance temps-réel des messages ─────────────────────────────
// Utilise Supabase Realtime pour détecter les nouveaux messages entrants
export const useRealtimeMessageWatcher = (agencyId: string | null | undefined) => {
  const { playSoundAndNotify } = useNotificationSound();
  const lastCountRef = useRef<number>(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!agencyId) return;

    // Import dynamique pour éviter les dépendances circulaires
    import('../lib/config').then(({ supabase }) => {
      // S'abonner aux nouveaux messages entrants pour cette agence
      const channel = supabase
        .channel(`messages_watcher_${agencyId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_agency_id=eq.${agencyId}`,
          },
          (payload) => {
            if (!initializedRef.current) {
              // Ignorer la première vague de données initiales
              initializedRef.current = true;
              return;
            }

            const newMsg = payload.new as any;
            playSoundAndNotify(
              '💬 Nouveau message',
              newMsg.subject || 'Vous avez reçu un message via le hub de collaboration',
              'message'
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'collaboration_requests',
            filter: `target_agency_id=eq.${agencyId}`,
          },
          (payload) => {
            if (!initializedRef.current) return;
            playSoundAndNotify(
              '🤝 Demande de collaboration',
              'Une agence souhaite accéder aux informations d\'un locataire ou propriétaire',
              'collaboration'
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            if (!initializedRef.current) {
              initializedRef.current = true;
              return;
            }

            const notif = payload.new as any;
            const typeMap: Record<string, NotifType> = {
              new_message: 'message',
              payment_reminder: 'payment',
              contract_expiry: 'alert',
              new_interest: 'collaboration',
              property_update: 'system',
            };

            playSoundAndNotify(
              notif.title || '🔔 Nouvelle notification',
              notif.message || '',
              typeMap[notif.type] || 'system'
            );
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Marquer comme initialisé après 1s pour ignorer les événements de démarrage
            setTimeout(() => { initializedRef.current = true; }, 1000);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [agencyId, playSoundAndNotify]);
};
