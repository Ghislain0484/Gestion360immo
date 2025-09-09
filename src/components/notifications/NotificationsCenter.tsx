import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  Trash2,
  Settings,
  AlertTriangle,
  MessageSquare,
  Home,
  Calendar,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Notification, NotificationSettingsUpsert } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import NotificationSettingsForm from './NotificationSettingsForm';

const NotificationsList: React.FC<{
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'unread' | 'high';
  markAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
}> = ({ notifications, loading, error, filter, markAsRead, deleteNotification }) => {
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter((notif) => {
      if (filter === 'unread') return !notif.is_read;
      if (filter === 'high') return notif.priority === 'high';
      return true;
    });
  }, [notifications, filter]);

  // Surbrillance des nouvelles notifications
  useMemo(() => {
    const newIds = notifications.map((n) => n.id).filter((id) => !highlightedIds.includes(id));
    if (newIds.length > 0) setHighlightedIds((prev) => [...prev, ...newIds]);
    const timer = setTimeout(() => setHighlightedIds([]), 3000);
    return () => clearTimeout(timer);
  }, [notifications]);

  const unreadCount = useMemo(() => notifications?.filter((n) => !n.is_read).length || 0, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_reminder': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'new_message': return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'property_update': return <Home className="h-5 w-5 text-green-500" />;
      case 'contract_expiry': return <Calendar className="h-5 w-5 text-yellow-500" />;
      case 'new_interest': return <Bell className="h-5 w-5 text-purple-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string): 'danger' | 'warning' | 'info' | 'secondary' => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 text-red-800 rounded-lg">{error}</div>
  );

  if (filteredNotifications.length === 0) return (
    <Card className="p-8 text-center">
      <Bell className="h-16 w-16 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
      <p className="text-gray-600">
        {filter === 'unread' ? 'Toutes vos notifications ont été lues.' : "Vous n'avez aucune notification pour le moment."}
      </p>
    </Card>
  );

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {filteredNotifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            layout
          >
            <Card className={`transition-all hover:shadow-md ${
              highlightedIds.includes(notification.id)
                ? 'bg-yellow-50 border-l-4 border-l-yellow-400'
                : !notification.is_read
                ? 'border-l-4 border-l-blue-500 bg-blue-50'
                : ''
            }`}>
              <div className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityColor(notification.priority)} size="sm">{notification.priority}</Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(notification.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                    <div className="flex items-center space-x-2">
                      {!notification.is_read && (
                        <Button variant="outline" size="sm" onClick={() => markAsRead(notification.id)}>
                          <Check className="h-3 w-3 mr-1" />Marquer comme lu
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3 mr-1" />Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const NotificationsCenter: React.FC = () => {
  const { user, admin } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');

  const userId = user?.id || admin?.user_id;

  const { data: notifications, loading, error } = useRealtimeData<Notification>(
    async () => {
      if (!userId) return [];
      return await dbService.notifications.getByUser(userId);
    },
    `notifications_${userId || ''}`
  );

  const defaultNotificationSettings: NotificationSettingsUpsert = {
    payment_reminder: true,
    new_message: true,
    contract_expiry: true,
    new_interest: true,
    property_update: true,
    email: true,
    push: true,
    sms: false,
  };

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsUpsert>(
    defaultNotificationSettings
  );

  const markAsRead = async (notificationId: string) => {
    if (!userId) return;
    await dbService.notifications.update(notificationId, { is_read: true });
  };

  const markAllAsRead = async () => {
    if (!userId || !notifications) return;
    await Promise.all(
      notifications.filter((n) => !n.is_read).map((n) => dbService.notifications.update(n.id, { is_read: true }))
    );
  };

  const deleteNotification = async (notificationId: string) => {
    if (!userId) return;
    await dbService.notifications.delete(notificationId);
  };

  const saveNotificationSettings = async () => {
    if (!userId) return;
    await dbService.notificationSettings.upsert(userId, notificationSettings);
    setShowSettings(false);
  };

  if (!user && !admin) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        Veuillez vous connecter pour voir les notifications.
      </div>
    );
  }

  const unreadCount = useMemo(
    () => notifications?.filter((n) => !n.is_read).length || 0,
    [notifications]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centre de Notifications</h1>
          <p className="text-gray-600 mt-1">Restez informé des événements importants</p>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead} aria-label="Marquer toutes les notifications comme lues">
              <Check className="h-4 w-4 mr-2" />Tout marquer comme lu
            </Button>
          )}
          <Button variant="ghost" onClick={() => setShowSettings(true)} aria-label="Ouvrir les paramètres de notification">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtrer par :</span>
          <div className="flex space-x-2">
            <Button variant={filter === 'all' ? 'primary' : 'ghost'} onClick={() => setFilter('all')}>
              Toutes ({notifications?.length || 0})
            </Button>
            <Button variant={filter === 'unread' ? 'primary' : 'ghost'} onClick={() => setFilter('unread')}>
              Non lues ({unreadCount})
            </Button>
            <Button variant={filter === 'high' ? 'primary' : 'ghost'} onClick={() => setFilter('high')}>
              Priorité haute
            </Button>
          </div>
        </div>
      </Card>

      {/* Liste des notifications */}
      <NotificationsList
        notifications={notifications || []}
        loading={loading}
        error={error}
        filter={filter}
        markAsRead={markAsRead}
        deleteNotification={deleteNotification}
      />

      {/* Modal Paramètres */}
      {showSettings && (
        <NotificationSettingsForm
          settings={notificationSettings}
          onChange={(partialSettings) =>
            setNotificationSettings((prev) => ({ ...prev, ...partialSettings }))
          }
          onCancel={() => setShowSettings(false)}
          onSave={saveNotificationSettings}
          loading={false}
        />
      )}
    </div>
  );
};
