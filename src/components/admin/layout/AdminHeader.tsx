import React, { useState } from 'react';
import { Bell, User, LogOut, Settings, Shield, TrendingUp, DollarSign, Building2, CheckCircle } from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '../../../hooks/useNotifications';
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

        if (diffInMinutes < 1) return 'À l\'instant';
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

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleNotificationClick = (notificationId: string) => {
        markAsRead.mutate(notificationId);
    };

    const handleMarkAllAsRead = () => {
        markAllAsRead.mutate();
    };

    return (
        <>
            <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo et titre */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
                                    <Shield className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">Gestion360Immo</h1>
                                    <p className="text-sm text-gray-600">Administration Plateforme</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats rapides */}
                        {platformStats && (
                            <div className="hidden lg:flex items-center gap-6">
                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="text-xs text-blue-600">Agences actives</p>
                                        <p className="text-lg font-bold text-blue-900">{platformStats.activeAgencies}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg">
                                    <DollarSign className="h-5 w-5 text-emerald-600" />
                                    <div>
                                        <p className="text-xs text-emerald-600">Revenus du jour</p>
                                        <p className="text-lg font-bold text-emerald-900">
                                            {formatCurrency(platformStats.todayRevenue)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
                                    <TrendingUp className="h-5 w-5 text-orange-600" />
                                    <div>
                                        <p className="text-xs text-orange-600">En attente</p>
                                        <p className="text-lg font-bold text-orange-900">{platformStats.pendingRequests}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {/* Notifications */}
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative"
                                >
                                    <Bell className="h-5 w-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
                                            {unreadCount}
                                        </span>
                                    )}
                                </Button>

                                {/* Dropdown notifications */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                                        <div className="p-4 border-b border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-900">Notifications</h3>
                                                <div className="flex items-center gap-2">
                                                    {unreadCount > 0 && (
                                                        <Badge variant="primary" size="sm">{unreadCount} nouvelles</Badge>
                                                    )}
                                                    {notifications.length > 0 && (
                                                        <button
                                                            onClick={handleMarkAllAsRead}
                                                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
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
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                                    <p className="text-sm text-gray-500 mt-2">Chargement...</p>
                                                </div>
                                            ) : notifications.length > 0 ? (
                                                notifications.map((notif) => (
                                                    <div
                                                        key={notif.id}
                                                        onClick={() => handleNotificationClick(notif.id)}
                                                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!notif.read ? 'bg-blue-50' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                                                                <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                                                                <p className="text-xs text-gray-400 mt-1">{getTimeAgo(notif.created_at)}</p>
                                                            </div>
                                                            {!notif.read && (
                                                                <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                                    <p className="text-sm text-gray-500">Aucune notification</p>
                                                </div>
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <div className="p-3 border-t border-gray-200 text-center">
                                                <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                                    Voir toutes les notifications
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Profil */}
                            <div className="relative">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowProfile(!showProfile)}
                                    className="flex items-center gap-2"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold">
                                        {admin?.email?.charAt(0).toUpperCase() || 'A'}
                                    </div>
                                    <span className="hidden md:block text-sm font-medium text-gray-700">
                                        {admin?.email?.split('@')[0] || 'Admin'}
                                    </span>
                                </Button>

                                {/* Dropdown profil */}
                                {showProfile && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                                        <div className="p-4 border-b border-gray-200">
                                            <p className="font-semibold text-gray-900">{admin?.email || 'Administrateur'}</p>
                                            <p className="text-xs text-gray-500 mt-1">Super Admin</p>
                                        </div>
                                        <div className="p-2">
                                            <button
                                                onClick={() => {
                                                    setShowProfile(false);
                                                    setShowProfileModal(true);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                                            >
                                                <User className="h-4 w-4" />
                                                Mon profil
                                            </button>
                                            <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                                                <Settings className="h-4 w-4" />
                                                Paramètres
                                            </button>
                                        </div>
                                        <div className="p-2 border-t border-gray-200">
                                            <button
                                                onClick={logout}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Déconnexion
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* User Profile Modal */}
            <UserProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
            />
        </>
    );
};
