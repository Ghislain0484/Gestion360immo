import React, { useState, useEffect } from 'react';
import { Database, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { dbService, supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface AgencyData {
  properties: number;
  owners: number;
  tenants: number;
  contracts: number;
  users: number;
  totalSize: string;
  lastBackup: Date;
}

export const DataSettings: React.FC = () => {
  const { user, agencyId, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Extraire les settings de l'agence active depuis le contexte
  const activeAgency = user?.agencies?.find(a => a.agency_id === agencyId);
  
  // Lire l'état depuis localStorage en priorité (persistance locale immédiate)
  // puis depuis le contexte auth comme fallback
  const localStorageKey = agencyId ? `agency_allow_delete_${agencyId}` : null;
  const getInitialDeleteState = () => {
    if (localStorageKey) {
      const stored = localStorage.getItem(localStorageKey);
      if (stored !== null) return stored === 'true';
    }
    return activeAgency?.settings?.allow_data_deletion === true;
  };
  const [allowDataDeletion, setAllowDataDeletion] = useState(getInitialDeleteState);
  const [agencyData, setAgencyData] = useState<AgencyData>({
    properties: 0,
    owners: 0,
    tenants: 0,
    contracts: 0,
    users: 0,
    totalSize: '0 MB',
    lastBackup: new Date(),
  });

  useEffect(() => {
    const loadAgencyData = async () => {
      if (!user?.agency_id) return;

      try {
        console.log('🔍 DataSettings: Chargement des données pour agency_id:', user.agency_id);

        // Charger les données depuis Supabase avec getAll (limite augmentée pour cohérence)
        const [propertiesRes, ownersRes, tenantsRes, contractsRes] = await Promise.all([
          dbService.properties.getAll({ agency_id: user.agency_id, limit: 1000 }),
          dbService.owners.getAll({ agency_id: user.agency_id, limit: 1000 }),
          dbService.tenants.getAll({ agency_id: user.agency_id, limit: 1000 }),
          dbService.contracts.getAll({ agency_id: user.agency_id, limit: 1000 }),
        ]);

        // Toujours utiliser des tableaux pour éviter les erreurs TS
        const properties = Array.isArray(propertiesRes) ? propertiesRes : [];
        const owners = Array.isArray(ownersRes) ? ownersRes : [];
        const tenants = Array.isArray(tenantsRes) ? tenantsRes : [];
        const contracts = Array.isArray(contractsRes) ? contractsRes : [];

        console.log('✅ DataSettings: Données chargées:', {
          properties: properties.length,
          owners: owners.length,
          tenants: tenants.length,
          contracts: contracts.length
        });

        const dataSize = JSON.stringify({ properties, owners, tenants, contracts }).length;
        const sizeInMB = (dataSize / (1024 * 1024)).toFixed(2);

        setAgencyData({
          properties: properties.length,
          owners: owners.length,
          tenants: tenants.length,
          contracts: contracts.length,
          users: 0, // tu peux ajouter un count pour les utilisateurs
          totalSize: `${sizeInMB} MB`,
          lastBackup: new Date(),
        });
      } catch (error) {
        console.error('❌ DataSettings: Erreur chargement données agence:', error);
      }
    };

    loadAgencyData();
  }, [user?.agency_id]);

  const handleDeleteAllData = async () => {
    if (!user?.agency_id) return;

    setLoading(true);
    try {
      // Supprimer toutes les données de l'agence dans Supabase
      await Promise.all([
        dbService.properties.deleteAllByAgency(user.agency_id),
        dbService.owners.deleteAllByAgency(user.agency_id),
        dbService.tenants.deleteAllByAgency(user.agency_id),
        dbService.contracts.deleteAllByAgency(user.agency_id),
        dbService.rentReceipts.deleteAllByAgency(user.agency_id),
      ]);

      setAgencyData({
        properties: 0,
        owners: 0,
        tenants: 0,
        contracts: 0,
        users: 0,
        totalSize: '0 MB',
        lastBackup: new Date(),
      });

      alert('✅ Toutes les données de l\'agence ont été supprimées !');
      setShowDeleteModal(false);
    } catch (error) {
      alert('❌ Erreur lors de la suppression');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDataDeletion = async () => {
    if (!agencyId) return;
    
    const newValue = !allowDataDeletion;
    setSettingsLoading(true);

    // 1. Mise à jour locale IMMÉDIATE (même si la DB échoue, l'UI répond)
    if (localStorageKey) localStorage.setItem(localStorageKey, String(newValue));
    setAllowDataDeletion(newValue);

    try {
      if (agencyId === '00000000-0000-0000-0000-000000000000') {
        // Mode démo : localStorage suffit
        toast.success(newValue ? '✅ Suppression activée (mode démo)' : '🔒 Suppression désactivée');
        return;
      }

      // 2. Appel RPC sécurisé qui contourne la RLS (SECURITY DEFINER)
      const { error } = await supabase.rpc('update_agency_settings', {
        p_agency_id: agencyId,
        p_settings: { allow_data_deletion: newValue }
      });

      if (error) {
        // La RPC n'existe pas encore : on garde la valeur locale et on avertit
        console.warn('RPC update_agency_settings non disponible, valeur locale conservée:', error.message);
        toast.success(
          newValue ? '✅ Suppression activée (local)' : '🔒 Suppression désactivée',
          { icon: '💾' }
        );
      } else {
        toast.success(newValue ? '✅ Suppression activée' : '🔒 Suppression désactivée');
        await refreshAuth();
      }
    } catch (error) {
      // En cas d'erreur réseau, la valeur locale est déjà sauvegardée
      console.warn('Erreur réseau pour update_agency_settings, valeur locale conservée');
      toast.success(
        newValue ? '✅ Suppression activée (hors ligne)' : '🔒 Suppression désactivée',
        { icon: '📱' }
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Aperçu des données */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-primary-600 dark:text-primary-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Données de votre agence</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">{agencyData.properties}</div>
              <p className="text-sm text-primary-800 dark:text-primary-300">Propriétés</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{agencyData.owners}</div>
              <p className="text-sm text-green-800 dark:text-green-300">Propriétaires</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{agencyData.tenants}</div>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">Locataires</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">{agencyData.contracts}</div>
              <p className="text-sm text-purple-800 dark:text-purple-300">Contrats</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex justify-between border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Taille totale des données</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Basée sur les données Supabase</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{agencyData.totalSize}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Utilisé</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Gestion des données */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gestion des données</h3>
          </div>

          <div className="space-y-4">
            {/* Nouveau: Switch de sécurité global */}
            <div className="flex items-center justify-between p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-900/20 mb-4">
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-300">Master Switch : Autoriser les suppressions</h4>
                <p className="text-sm text-orange-700 dark:text-orange-400">
                  Débloque les boutons "Supprimer" dans l'application pour le Directeur et le Chef d'agence.
                </p>
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleToggleDataDeletion}
                  disabled={settingsLoading}
                  className={`${
                    allowDataDeletion ? 'bg-orange-600' : 'bg-gray-200 dark:bg-gray-700'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 ${settingsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  role="switch"
                  aria-checked={allowDataDeletion}
                >
                  <span
                    aria-hidden="true"
                    className={`${
                      allowDataDeletion ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-300">Zone de danger</h4>
                <p className="text-sm text-red-700 dark:text-red-400">
                  Supprimer définitivement toutes les données de votre agence
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
                Supprimer tout
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal confirmation suppression */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Supprimer toutes les données" size="md">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">Action irréversible</h4>
                <p className="text-sm text-red-700 mt-1">
                  Cette action supprimera définitivement toutes les données de votre agence :
                </p>
                <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                  <li>Toutes les propriétés ({agencyData.properties})</li>
                  <li>Tous les propriétaires ({agencyData.owners})</li>
                  <li>Tous les locataires ({agencyData.tenants})</li>
                  <li>Tous les contrats ({agencyData.contracts})</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleDeleteAllData} isLoading={loading}>
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
