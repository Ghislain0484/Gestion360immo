import React, { useState } from 'react';
import { Bell, Check, Trash2, Settings, AlertTriangle, MessageSquare, Home, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Notification } from '../../types/notification';

export const NotificationsCenter: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState('all');

  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      userId: '1',
      type: 'payment_reminder',
      title: 'Rappel de paiement',
      message: 'Le loyer de la Villa Cocody est en retard de 5 jours',
      priority: 'high',
      isRead: false,
      createdAt: new Date('2024-03-10T10:30:00')
    },
    {
      id: '2',
      userId: '1',
      type: 'new_message',
      title: 'Nouveau message',
      message: 'Agence Immobilier Plus vous a envoyé un message concernant la Villa Angré',
      priority: 'medium',
      isRead: false,
      createdAt: new Date('2024-03-10T09:15:00')
    },
    {
      id: '3',
      userId: '1',
      type: 'contract_expiry',
      title: 'Contrat bientôt expiré',
      message: 'Le contrat de location de l\'Appartement Plateau expire dans 30 jours',
      priority: 'medium',
      isRead: true,
      createdAt: new Date('2024-03-09T14:20:00')
    },
    {
      id: '4',
      userId: '1',
      type: 'new_interest',
      title: 'Nouvel intérêt',
      message: 'Une agence a manifesté son intérêt pour votre annonce Villa Moderne',
      priority: 'low',
      isRead: true,
      createdAt: new Date('2024-03-08T16:45:00')
    }
  ]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_reminder':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'new_message':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'property_update':
        return <Home className="h-5 w-5 text-green-500" />;
      case 'contract_expiry':
        return <Calendar className="h-5 w-5 text-yellow-500" />;
      case 'new_interest':
        return <Bell className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.isRead;
    if (filter === 'high') return notif.priority === 'high';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
          <Button variant="ghost" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtrer par:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Non lues ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-3 py-1 rounded-full text-sm ${
                filter === 'high'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Priorité haute
            </button>
          </div>
        </div>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="p-8 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-400" />
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
                !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityColor(notification.priority)} size="sm">
                          {notification.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {notification.createdAt.toLocaleDateString('fr-FR')} à{' '}
                          {notification.createdAt.toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      {!notification.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Marquer comme lu
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
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

      {/* Settings Modal */}
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
                { key: 'property_update', label: 'Mises à jour de propriétés' }
              ].map((item) => (
                <label key={item.key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    defaultChecked
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
                { key: 'sms', label: 'SMS (pour les urgences)' }
              ].map((item) => (
                <label key={item.key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    defaultChecked={item.key !== 'sms'}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowSettings(false)}>
              Annuler
            </Button>
            <Button onClick={() => setShowSettings(false)}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};