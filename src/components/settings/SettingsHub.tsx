import React, { useState, Suspense, lazy } from 'react';
import { Settings, User, Shield, Bell, Palette, Database, Users, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { APP_NAME, IS_STANDALONE } from '../../lib/constants';

// Lazy loading of components for better performance on slow networks
const ProfileSettings = lazy(() => import('./ProfileSettings').then(m => ({ default: m.ProfileSettings })));
const SecuritySettings = lazy(() => import('./SecuritySettings').then(m => ({ default: m.SecuritySettings })));
const NotificationSettings = lazy(() => import('./NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const AppearanceSettings = lazy(() => import('./AppearanceSettings').then(m => ({ default: m.AppearanceSettings })));
const DataSettings = lazy(() => import('./DataSettings').then(m => ({ default: m.DataSettings })));
const UserManagement = lazy(() => import('./UserManagement').then(m => ({ default: m.UserManagement })));
const SubscriptionSettings = lazy(() => import('./SubscriptionSettings').then(m => ({ default: m.SubscriptionSettings })));

const LoadingTab = () => (
  <Card className="p-8 flex flex-col items-center justify-center">
    <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
    <p className="text-gray-600">Chargement de la section...</p>
  </Card>
);

export const SettingsHub: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'profile';
  });

  const settingsTabs = [
    { id: 'profile', name: 'Profil', icon: User },
    { id: 'security', name: 'Sécurité', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'appearance', name: 'Apparence', icon: Palette },
    { id: 'data', name: 'Données', icon: Database },
    ...(user?.role === 'director' ? [
      { id: 'users', name: 'Utilisateurs', icon: Users },
      ...(!IS_STANDALONE ? [{ id: 'subscription', name: 'Abonnement', icon: Settings }] : [])
    ] : [])
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {IS_STANDALONE ? `Paramètres ${APP_NAME}` : 'Paramètres'}
        </h1>
        <p className="text-gray-600 mt-1">
          Configurez votre compte et vos préférences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="lg:w-64">
          <Card>
            <nav className="space-y-1">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <Suspense fallback={<LoadingTab />}>
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
            {activeTab === 'data' && <DataSettings />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'subscription' && <SubscriptionSettings />}
          </Suspense>

          {/* Other tabs placeholder */}
          {!['profile', 'security', 'notifications', 'appearance', 'data', 'users', 'subscription'].includes(activeTab) && (
            <Card className="p-8 text-center">
              <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {settingsTabs.find(t => t.id === activeTab)?.name}
              </h3>
              <p className="text-gray-600 mb-4">
                Cette section sera disponible dans une prochaine version.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};