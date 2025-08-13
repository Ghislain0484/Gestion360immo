import React, { useState } from 'react';
import { Settings, DollarSign, Calendar, Bell, Shield, Database } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const PlatformSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    subscription: {
      basicPrice: 25000,
      premiumPrice: 50000,
      enterprisePrice: 100000,
      trialDays: 30,
      gracePeriodDays: 7
    },
    ranking: {
      evaluationPeriodMonths: 6,
      autoGenerateRankings: true,
      rewardBudget: 1500000
    },
    platform: {
      maintenanceMode: false,
      allowNewRegistrations: true,
      maxAgenciesPerCity: 10,
      supportEmail: 'support@immoplatform.ci'
    }
  });

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save settings to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Paramètres mis à jour avec succès !');
    } catch (error) {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Paramètres de la Plateforme</h2>
        <Button onClick={handleSave} isLoading={loading}>
          Enregistrer les modifications
        </Button>
      </div>

      {/* Subscription Settings */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Paramètres d'abonnement</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              label="Plan Basique (FCFA/mois)"
              type="number"
              value={settings.subscription.basicPrice}
              onChange={(e) => updateSetting('subscription', 'basicPrice', parseInt(e.target.value))}
            />
            <Input
              label="Plan Premium (FCFA/mois)"
              type="number"
              value={settings.subscription.premiumPrice}
              onChange={(e) => updateSetting('subscription', 'premiumPrice', parseInt(e.target.value))}
            />
            <Input
              label="Plan Entreprise (FCFA/mois)"
              type="number"
              value={settings.subscription.enterprisePrice}
              onChange={(e) => updateSetting('subscription', 'enterprisePrice', parseInt(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Période d'essai (jours)"
              type="number"
              value={settings.subscription.trialDays}
              onChange={(e) => updateSetting('subscription', 'trialDays', parseInt(e.target.value))}
            />
            <Input
              label="Délai de grâce (jours)"
              type="number"
              value={settings.subscription.gracePeriodDays}
              onChange={(e) => updateSetting('subscription', 'gracePeriodDays', parseInt(e.target.value))}
              helperText="Délai avant suspension pour impayé"
            />
          </div>
        </div>
      </Card>

      {/* Ranking Settings */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Paramètres de classement</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Période d'évaluation (mois)"
              type="number"
              value={settings.ranking.evaluationPeriodMonths}
              onChange={(e) => updateSetting('ranking', 'evaluationPeriodMonths', parseInt(e.target.value))}
            />
            <Input
              label="Budget récompenses (FCFA)"
              type="number"
              value={settings.ranking.rewardBudget}
              onChange={(e) => updateSetting('ranking', 'rewardBudget', parseInt(e.target.value))}
            />
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="autoRanking"
              checked={settings.ranking.autoGenerateRankings}
              onChange={(e) => updateSetting('ranking', 'autoGenerateRankings', e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="autoRanking" className="text-sm text-gray-700">
              Générer automatiquement les classements
            </label>
          </div>
        </div>
      </Card>

      {/* Platform Settings */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Paramètres généraux</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre max d'agences par ville"
                type="number"
                value={settings.platform.maxAgenciesPerCity}
                onChange={(e) => updateSetting('platform', 'maxAgenciesPerCity', parseInt(e.target.value))}
              />
              <Input
                label="Email de support"
                type="email"
                value={settings.platform.supportEmail}
                onChange={(e) => updateSetting('platform', 'supportEmail', e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Mode maintenance</h4>
                  <p className="text-sm text-gray-500">Désactiver temporairement la plateforme</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.platform.maintenanceMode}
                    onChange={(e) => updateSetting('platform', 'maintenanceMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Nouvelles inscriptions</h4>
                  <p className="text-sm text-gray-500">Autoriser l'inscription de nouvelles agences</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.platform.allowNewRegistrations}
                    onChange={(e) => updateSetting('platform', 'allowNewRegistrations', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* System Status */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">État du système</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="font-medium text-green-900">Base de données</p>
              <p className="text-sm text-green-700">Opérationnelle</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="font-medium text-green-900">API</p>
              <p className="text-sm text-green-700">Fonctionnelle</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
              <p className="font-medium text-green-900">Stockage</p>
              <p className="text-sm text-green-700">Disponible</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview of Changes */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aperçu des tarifs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Plan Basique</h4>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(settings.subscription.basicPrice)}
                <span className="text-sm font-normal text-gray-500">/mois</span>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Plan Premium</h4>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(settings.subscription.premiumPrice)}
                <span className="text-sm font-normal text-gray-500">/mois</span>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Plan Entreprise</h4>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(settings.subscription.enterprisePrice)}
                <span className="text-sm font-normal text-gray-500">/mois</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};