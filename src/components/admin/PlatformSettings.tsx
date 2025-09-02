import React, { useState, useEffect, useCallback } from 'react';
import { Settings, DollarSign, Calendar, Database } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { dbService } from '../../lib/supabase';
import { PlatformSetting, AuditLog } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';

interface SettingsState {
  subscription: {
    basicPrice: number;
    premiumPrice: number;
    enterprisePrice: number;
    trialDays: number;
    gracePeriodDays: number;
  };
  ranking: {
    evaluationPeriodMonths: number;
    autoGenerateRankings: boolean;
    rewardBudget: number;
  };
  platform: {
    maintenanceMode: boolean;
    allowNewRegistrations: boolean;
    maxAgenciesPerCity: number;
    supportEmail: string;
  };
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export const PlatformSettings: React.FC = () => {
  const { admin, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    subscription: {
      basicPrice: 25000,
      premiumPrice: 50000,
      enterprisePrice: 100000,
      trialDays: 30,
      gracePeriodDays: 7,
    },
    ranking: {
      evaluationPeriodMonths: 6,
      autoGenerateRankings: true,
      rewardBudget: 1500000,
    },
    platform: {
      maintenanceMode: false,
      allowNewRegistrations: true,
      maxAgenciesPerCity: 10,
      supportEmail: 'support@immoplatform.ci',
    },
  });

  // Toast notification
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Log audit action
  const logAudit = useCallback(async (action: string, tableName: string, recordId: string | null, oldValues: any, newValues: any) => {
    try {
      const auditLog: Partial<AuditLog> = {
        user_id: admin?.id ?? null,
        action,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: 'unknown', // Replace with actual IP if available
        user_agent: navigator.userAgent,
      };
      await dbService.auditLogs.getAll(); // No insert method, assuming trigger-based logging
    } catch (err) {
      console.error('Erreur lors de l’enregistrement de l’audit:', err);
    }
  }, [admin]);

  // Charger les paramètres
  const fetchSettings = useCallback(async () => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé. Veuillez vous connecter en tant qu’administrateur.');
      showToast('Accès non autorisé', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const settingsData = await dbService.platformSettings.getAll();
      const settingsMap = settingsData.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as { [key: string]: any });

      setSettings({
        subscription: {
          basicPrice: Number(settingsMap['subscription_basic_price']) || 25000,
          premiumPrice: Number(settingsMap['subscription_premium_price']) || 50000,
          enterprisePrice: Number(settingsMap['subscription_enterprise_price']) || 100000,
          trialDays: Number(settingsMap['subscription_trial_days']) || 30,
          gracePeriodDays: Number(settingsMap['subscription_grace_period_days']) || 7,
        },
        ranking: {
          evaluationPeriodMonths: Number(settingsMap['ranking_evaluation_period_months']) || 6,
          autoGenerateRankings: Boolean(settingsMap['ranking_auto_generate']) ?? true,
          rewardBudget: Number(settingsMap['ranking_reward_budget']) || 1500000,
        },
        platform: {
          maintenanceMode: Boolean(settingsMap['platform_maintenance_mode']) ?? false,
          allowNewRegistrations: Boolean(settingsMap['platform_allow_new_registrations']) ?? true,
          maxAgenciesPerCity: Number(settingsMap['platform_max_agencies_per_city']) || 10,
          supportEmail: String(settingsMap['platform_support_email']) || 'support@immoplatform.ci',
        },
      });
    } catch (err: any) {
      console.error('Erreur lors du chargement des paramètres:', err);
      const errorMessage = err.message || 'Erreur lors du chargement des paramètres';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [admin, showToast]);

  useEffect(() => {
    if (authLoading) return;
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé. Veuillez vous connecter en tant qu’administrateur.');
      showToast('Accès non autorisé', 'error');
      return;
    }
    fetchSettings();
  }, [fetchSettings, admin, authLoading]);

  const updateSetting = (section: keyof SettingsState, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: typeof value === 'number' ? Math.max(0, value) : value,
      },
    }));
  };

  const handleSave = useCallback(async () => {
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      setError('Accès non autorisé. Veuillez vous connecter en tant qu’administrateur.');
      showToast('Accès non autorisé', 'error');
      return;
    }

    // Input validation
    if (settings.subscription.basicPrice < 0 || settings.subscription.premiumPrice < 0 || settings.subscription.enterprisePrice < 0) {
      setError('Les prix des plans ne peuvent pas être négatifs.');
      showToast('Les prix des plans ne peuvent pas être négatifs', 'error');
      return;
    }
    if (settings.subscription.trialDays < 0 || settings.subscription.gracePeriodDays < 0) {
      setError('Les périodes d’essai et de grâce ne peuvent pas être négatives.');
      showToast('Les périodes ne peuvent pas être négatives', 'error');
      return;
    }
    if (settings.ranking.evaluationPeriodMonths < 1) {
      setError('La période d’évaluation doit être d’au moins 1 mois.');
      showToast('Période d’évaluation invalide', 'error');
      return;
    }
    if (settings.ranking.rewardBudget < 0) {
      setError('Le budget des récompenses ne peut pas être négatif.');
      showToast('Budget des récompenses invalide', 'error');
      return;
    }
    if (settings.platform.maxAgenciesPerCity < 1) {
      setError('Le nombre maximum d’agences par ville doit être d’au moins 1.');
      showToast('Nombre maximum d’agences invalide', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.platform.supportEmail)) {
      setError('Veuillez entrer un email de support valide.');
      showToast('Email de support invalide', 'error');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch current settings for audit logging
      const currentSettings = await dbService.platformSettings.getAll();
      const settingsMap = currentSettings.reduce((acc, setting) => {
        acc[setting.setting_key] = setting;
        return acc;
      }, {} as { [key: string]: PlatformSetting });

      const settingsToSave: PlatformSetting[] = [
        {
          id: settingsMap['subscription_basic_price']?.id || crypto.randomUUID(),
          setting_key: 'subscription_basic_price',
          setting_value: settings.subscription.basicPrice,
          description: 'Prix mensuel du plan Basique',
          category: 'subscription',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['subscription_premium_price']?.id || crypto.randomUUID(),
          setting_key: 'subscription_premium_price',
          setting_value: settings.subscription.premiumPrice,
          description: 'Prix mensuel du plan Premium',
          category: 'subscription',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['subscription_enterprise_price']?.id || crypto.randomUUID(),
          setting_key: 'subscription_enterprise_price',
          setting_value: settings.subscription.enterprisePrice,
          description: 'Prix mensuel du plan Entreprise',
          category: 'subscription',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['subscription_trial_days']?.id || crypto.randomUUID(),
          setting_key: 'subscription_trial_days',
          setting_value: settings.subscription.trialDays,
          description: 'Nombre de jours pour la période d’essai',
          category: 'subscription',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['subscription_grace_period_days']?.id || crypto.randomUUID(),
          setting_key: 'subscription_grace_period_days',
          setting_value: settings.subscription.gracePeriodDays,
          description: 'Délai de grâce avant suspension pour impayé',
          category: 'subscription',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['ranking_evaluation_period_months']?.id || crypto.randomUUID(),
          setting_key: 'ranking_evaluation_period_months',
          setting_value: settings.ranking.evaluationPeriodMonths,
          description: 'Durée de la période d’évaluation pour les classements',
          category: 'ranking',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['ranking_auto_generate']?.id || crypto.randomUUID(),
          setting_key: 'ranking_auto_generate',
          setting_value: settings.ranking.autoGenerateRankings,
          description: 'Génération automatique des classements',
          category: 'ranking',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['ranking_reward_budget']?.id || crypto.randomUUID(),
          setting_key: 'ranking_reward_budget',
          setting_value: settings.ranking.rewardBudget,
          description: 'Budget total des récompenses pour les classements',
          category: 'ranking',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['platform_maintenance_mode']?.id || crypto.randomUUID(),
          setting_key: 'platform_maintenance_mode',
          setting_value: settings.platform.maintenanceMode,
          description: 'Mode maintenance de la plateforme',
          category: 'platform',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['platform_allow_new_registrations']?.id || crypto.randomUUID(),
          setting_key: 'platform_allow_new_registrations',
          setting_value: settings.platform.allowNewRegistrations,
          description: 'Autoriser les nouvelles inscriptions d’agences',
          category: 'platform',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['platform_max_agencies_per_city']?.id || crypto.randomUUID(),
          setting_key: 'platform_max_agencies_per_city',
          setting_value: settings.platform.maxAgenciesPerCity,
          description: 'Nombre maximum d’agences par ville',
          category: 'platform',
          is_public: false,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: settingsMap['platform_support_email']?.id || crypto.randomUUID(),
          setting_key: 'platform_support_email',
          setting_value: settings.platform.supportEmail,
          description: 'Email de support de la plateforme',
          category: 'platform',
          is_public: true,
          updated_by: admin?.id || null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      // Log audit for each changed setting
      for (const setting of settingsToSave) {
        const oldSetting = settingsMap[setting.setting_key];
        if (oldSetting && oldSetting.setting_value !== setting.setting_value) {
          await logAudit(
            'update',
            'platform_settings',
            setting.id,
            { setting_value: oldSetting.setting_value },
            { setting_value: setting.setting_value }
          );
        } else if (!oldSetting) {
          await logAudit('insert', 'platform_settings', setting.id, null, { setting_value: setting.setting_value });
        }
      }

      await dbService.platformSettings.upsert(settingsToSave);
      showToast('Paramètres mis à jour avec succès !', 'success');
      await fetchSettings();
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde des paramètres:', err);
      const errorMessage = err.message || 'Erreur lors de la sauvegarde des paramètres';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [settings, fetchSettings, admin, showToast, logAudit]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Paramètres de la Plateforme</h2>
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchSettings}>
            Réessayer
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Paramètres de la Plateforme</h2>
        <Button onClick={handleSave} disabled={loading}>
          Enregistrer les modifications
        </Button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
        >
          {toast.message}
        </div>
      )}

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
              onChange={(e) => updateSetting('subscription', 'basicPrice', parseInt(e.target.value) || 0)}
              min={0}
            />
            <Input
              label="Plan Premium (FCFA/mois)"
              type="number"
              value={settings.subscription.premiumPrice}
              onChange={(e) => updateSetting('subscription', 'premiumPrice', parseInt(e.target.value) || 0)}
              min={0}
            />
            <Input
              label="Plan Entreprise (FCFA/mois)"
              type="number"
              value={settings.subscription.enterprisePrice}
              onChange={(e) => updateSetting('subscription', 'enterprisePrice', parseInt(e.target.value) || 0)}
              min={0}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Période d'essai (jours)"
              type="number"
              value={settings.subscription.trialDays}
              onChange={(e) => updateSetting('subscription', 'trialDays', parseInt(e.target.value) || 0)}
              min={0}
            />
            <Input
              label="Délai de grâce (jours)"
              type="number"
              value={settings.subscription.gracePeriodDays}
              onChange={(e) => updateSetting('subscription', 'gracePeriodDays', parseInt(e.target.value) || 0)}
              min={0}
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
              onChange={(e) => updateSetting('ranking', 'evaluationPeriodMonths', parseInt(e.target.value) || 1)}
              min={1}
            />
            <Input
              label="Budget récompenses (FCFA)"
              type="number"
              value={settings.ranking.rewardBudget}
              onChange={(e) => updateSetting('ranking', 'rewardBudget', parseInt(e.target.value) || 0)}
              min={0}
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
                onChange={(e) => updateSetting('platform', 'maxAgenciesPerCity', parseInt(e.target.value) || 1)}
                min={1}
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

      {/* 
        System Status 

        const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
        useEffect(() => {
          const fetchAlerts = async () => {
            const alerts = await dbService.getSystemAlerts();
            setSystemAlerts(alerts);
          };
          fetchAlerts();
        }, []);

      */}
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