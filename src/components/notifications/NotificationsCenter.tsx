import React, { useState, useMemo } from 'react';
import { Bell, Check, Trash2, Settings, AlertTriangle, MessageSquare, Home, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Notification } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';

export const NotificationsCenter: React.FC = () => {
  const { user, admin } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const userId = user?.id || admin?.user_id;

  const { data: notifications, loading, error } = useRealtimeData<Notification>(
    async () => {
      if (!userId) return [];
      return await dbService.notifications.getByUser(userId);
    },
    `notifications_${userId || ''}`
  );

  const [notificationSettings, setNotificationSettings] = useState({
    payment_reminder: true,
    new_message: true,
    contract_expiry: true,
    new_interest: true,
    property_update: true,
    email: true,
    push: true,
    sms: false,
  });

  const markAsRead = async (notificationId: string) => {
    if (!userId) return;
    try {
      await dbService.notifications.update(notificationId, { is_read: true });
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId || !notifications) return;
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.is_read)
          .map((n) => dbService.notifications.update(n.id, { is_read: true }))
      );
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!userId) return;
    try {
      await dbService.notifications.delete(notificationId);
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
    }
  };

  const saveNotificationSettings = async () => {
    if (!userId) return;
    try {
      // TODO: Implement dbService.notificationSettings.upsert
      console.log('Sauvegarde des paramètres:', notificationSettings);
      setShowSettings(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    return notifications.filter((notif) => {
      if (filter === 'unread') return !notif.is_read;
      if (filter === 'high') return notif.priority === 'high';
      return true;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications?.filter((n) => !n.is_read).length || 0,
    [notifications]
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_reminder':
        return <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />;
      case 'new_message':
        return <MessageSquare className="h-5 w-5 text-blue-500" aria-hidden="true" />;
      case 'property_update':
        return <Home className="h-5 w-5 text-green-500" aria-hidden="true" />;
      case 'contract_expiry':
        return <Calendar className="h-5 w-5 text-yellow-500" aria-hidden="true" />;
      case 'new_interest':
        return <Bell className="h-5 w-5 text-purple-500" aria-hidden="true" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" aria-hidden="true" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'secondary';
    }
  };

  if (!user && !admin) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        Veuillez vous connecter pour voir les notifications.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centre de Notifications</h1>
          <p className="text-gray-600 mt-1">
            Restez informé des événements importants
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllAsRead}
              aria-label="Marquer toutes les notifications comme lues"
            >
              <Check className="h-4 w-4 mr-2" aria-hidden="true" />
              Tout marquer comme lu
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => setShowSettings(true)}
            aria-label="Ouvrir les paramètres de notification"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtrer par :</span>
          <div className="flex space-x-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'ghost'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-blue-100 text-blue-700' : ''}
              aria-label={`Afficher toutes les notifications (${notifications?.length || 0})`}
            >
              Toutes ({notifications?.length || 0})
            </Button>
            <Button
              variant={filter === 'unread' ? 'primary' : 'ghost'}
              onClick={() => setFilter('unread')}
              className={filter === 'unread' ? 'bg-blue-100 text-blue-700' : ''}
              aria-label={`Afficher les notifications non lues (${unreadCount})`}
            >
              Non lues ({unreadCount})
            </Button>
            <Button
              variant={filter === 'high' ? 'primary' : 'ghost'}
              onClick={() => setFilter('high')}
              className={filter === 'high' ? 'bg-blue-100 text-blue-700' : ''}
              aria-label="Afficher les notifications à haute priorité"
            >
              Priorité haute
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-400" aria-hidden="true" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune notification
            </h3>
            <p className="text-gray-600">
              {filter === 'unread'
                ? 'Toutes vos notifications ont été lues.'
                : 'Vous n\'avez aucune notification pour le moment.'}
            </p>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all hover:shadow-md ${
                !notification.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityColor(notification.priority)} size="sm">
                          {notification.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(notification.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                    <div className="flex items-center space-x-2">
                      {!notification.is_read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          aria-label={`Marquer la notification "${notification.title}" comme lue`}
                        >
                          <Check className="h-3 w-3 mr-1" aria-hidden="true" />
                          Marquer comme lu
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-700"
                        aria-label={`Supprimer la notification "${notification.title}"`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Paramètres de notification"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Types de notifications</h4>
            <div className="space-y-3">
              {[
                { key: 'payment_reminder', label: 'Rappels de paiement' },
                { key: 'new_message', label: 'Nouveaux messages' },
                { key: 'contract_expiry', label: 'Expiration de contrats' },
                { key: 'new_interest', label: 'Nouveaux intérêts' },
                { key: 'property_update', label: 'Mises à jour de propriétés' },
              ].map((item) => (
                <label key={item.key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                    onChange={(e) =>
                      setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Canaux de notification</h4>
            <div className="space-y-3">
              {[
                { key: 'email', label: 'Email' },
                { key: 'push', label: 'Notifications push' },
                { key: 'sms', label: 'SMS (pour les urgences)' },
              ].map((item) => (
                <label key={item.key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                    onChange={(e) =>
                      setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setShowSettings(false)}
              aria-label="Annuler les modifications des paramètres"
            >
              Annuler
            </Button>
            <Button
              onClick={saveNotificationSettings}
              aria-label="Enregistrer les paramètres de notification"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};