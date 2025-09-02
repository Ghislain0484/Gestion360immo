import React, { useState } from 'react';
import { Bell, Mail, Smartphone, MessageSquare, AlertTriangle, Home, Calendar, Users } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  paymentReminders: boolean;
  contractExpiry: boolean;
  newMessages: boolean;
  propertyUpdates: boolean;
  collaborationUpdates: boolean;
  rentalAlerts: boolean;
}

export const NotificationSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    sms: false,
    paymentReminders: true,
    contractExpiry: true,
    newMessages: true,
    propertyUpdates: true,
    collaborationUpdates: false,
    rentalAlerts: true,
  });

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save preferences to database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      alert('Préférences de notification mises à jour !');
    } catch (error) {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const notificationChannels = [
    {
      key: 'email' as keyof NotificationPreferences,
      icon: Mail,
      title: 'Email',
      description: 'Recevez des notifications par email',
      color: 'text-blue-600',
    },
    {
      key: 'push' as keyof NotificationPreferences,
      icon: Bell,
      title: 'Notifications push',
      description: 'Notifications dans le navigateur',
      color: 'text-green-600',
    },
    {
      key: 'sms' as keyof NotificationPreferences,
      icon: Smartphone,
      title: 'SMS',
      description: 'Notifications par SMS (urgences uniquement)',
      color: 'text-orange-600',
    },
  ];

  const notificationTypes = [
    {
      key: 'paymentReminders' as keyof NotificationPreferences,
      icon: AlertTriangle,
      title: 'Rappels de paiement',
      description: 'Loyers en retard et échéances',
      color: 'text-red-600',
      priority: 'high',
    },
    {
      key: 'contractExpiry' as keyof NotificationPreferences,
      icon: Calendar,
      title: 'Expiration de contrats',
      description: 'Contrats arrivant à échéance',
      color: 'text-yellow-600',
      priority: 'medium',
    },
    {
      key: 'newMessages' as keyof NotificationPreferences,
      icon: MessageSquare,
      title: 'Nouveaux messages',
      description: 'Messages de collaboration inter-agences',
      color: 'text-blue-600',
      priority: 'medium',
    },
    {
      key: 'propertyUpdates' as keyof NotificationPreferences,
      icon: Home,
      title: 'Mises à jour de propriétés',
      description: 'Modifications et nouvelles propriétés',
      color: 'text-green-600',
      priority: 'low',
    },
    {
      key: 'collaborationUpdates' as keyof NotificationPreferences,
      icon: Users,
      title: 'Collaboration',
      description: 'Nouvelles annonces et intérêts',
      color: 'text-purple-600',
      priority: 'low',
    },
    {
      key: 'rentalAlerts' as keyof NotificationPreferences,
      icon: Home,
      title: 'Alertes de location',
      description: 'Nouveaux locataires et résiliations',
      color: 'text-indigo-600',
      priority: 'medium',
    },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="danger" size="sm">Haute</Badge>;
      case 'medium': return <Badge variant="warning" size="sm">Moyenne</Badge>;
      case 'low': return <Badge variant="info" size="sm">Basse</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Canaux de notification
          </h3>
          
          <div className="space-y-4">
            {notificationChannels.map((channel) => (
              <div key={channel.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <channel.icon className={`h-5 w-5 ${channel.color}`} />
                  <div>
                    <h4 className="font-medium text-gray-900">{channel.title}</h4>
                    <p className="text-sm text-gray-500">{channel.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences[channel.key]}
                    onChange={(e) => updatePreference(channel.key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Notification Types */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Types de notifications
          </h3>
          
          <div className="space-y-4">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <type.icon className={`h-5 w-5 ${type.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">{type.title}</h4>
                      {getPriorityBadge(type.priority)}
                    </div>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences[type.key]}
                    onChange={(e) => updatePreference(type.key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Notification Schedule */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Horaires de notification
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heure de début
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="08:00">08:00</option>
                <option value="09:00">09:00</option>
                <option value="10:00">10:00</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heure de fin
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="18:00">18:00</option>
                <option value="19:00">19:00</option>
                <option value="20:00">20:00</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Respecter les horaires pour les notifications non urgentes
              </span>
            </label>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Résumé des préférences
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {Object.values(preferences).filter(Boolean).length}
              </div>
              <p className="text-blue-800">Notifications activées</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {[preferences.email, preferences.push, preferences.sms].filter(Boolean).length}
              </div>
              <p className="text-green-800">Canaux actifs</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {notificationTypes.filter(type => preferences[type.key] && type.priority === 'high').length}
              </div>
              <p className="text-yellow-800">Priorité haute</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3">
        <Button variant="ghost">
          Réinitialiser
        </Button>
        <Button onClick={handleSave} isLoading={loading}>
          Enregistrer les préférences
        </Button>
      </div>
    </div>
  );
};