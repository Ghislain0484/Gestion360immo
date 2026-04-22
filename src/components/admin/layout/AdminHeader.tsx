import React, { useState } from 'react';
import {
  Bell,
  User,
  LogOut,
  Settings,
  Shield,
  TrendingUp,
  DollarSign,
  Building2,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '../../../hooks/useNotifications';
import { UserProfileModal } from '../profile/UserProfileModal';

interface AdminHeaderProps {
  platformStats?: {
    activeAgencies: number;
    todayRevenue: number;
    pendingRequests: number;
  };
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ platformStats }) => {
  const { admin, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "A l'instant";
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;

    return date.toLocaleDateString('fr-FR');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request':
        return '📝';
      case 'subscription':
        return '💳';
      case 'payment':
        return '💰';
      case 'alert':
        return '⚠️';
      case 'system':
        return '🔔';
      default:
        return '📌';
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const handleNotificationClick = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gestion360Immo</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Administration plateforme</p>
                </div>
              </div>
            </div>

            {platformStats && (
              <div className="hidden items-center gap-6 lg:flex">
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-500/10">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-300">Agences actives</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{platformStats.activeAgencies}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 dark:bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  <div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-300">Revenus du jour</p>
                    <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                      {formatCurrency(platformStats.todayRevenue)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-2 dark:bg-orange-500/10">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                  <div>
                    <p className="text-xs text-orange-600 dark:text-orange-300">En attente</p>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-100">{platformStats.pendingRequests}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications((value) => !value)}
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 z-50 mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {unreadCount > 0 && (
                            <Badge variant="primary" size="sm">
                              {unreadCount} nouvelles
                            </Badge>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                            >
                              Tout marquer comme lu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-8 text-center">
                          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600 dark:border-indigo-300" />
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Chargement...</p>
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification.id)}
                            className={`cursor-pointer border-b border-slate-100 p-4 transition-colors dark:border-slate-800 ${
                              !notification.read
                                ? 'bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-500/10 dark:hover:bg-blue-500/15'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{notification.title}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{notification.message}</p>
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{getTimeAgo(notification.created_at)}</p>
                              </div>
                              {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <CheckCircle className="mx-auto mb-2 h-12 w-12 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">Aucune notification</p>
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="border-t border-slate-200 p-3 text-center dark:border-slate-700">
                        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200">
                          Voir toutes les notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfile((value) => !value)}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold text-white">
                    {admin?.email?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 md:block">
                    {admin?.email?.split('@')[0] || 'Admin'}
                  </span>
                </Button>

                {showProfile && (
                  <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                      <p className="font-semibold text-slate-900 dark:text-white">{admin?.email || 'Administrateur'}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Super Admin</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          setShowProfileModal(true);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <User className="h-4 w-4" />
                        Mon profil
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                        <Settings className="h-4 w-4" />
                        Parametres
                      </button>
                    </div>
                    <div className="border-t border-slate-200 p-2 dark:border-slate-700">
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Deconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
};
