import React, { useState, useEffect } from 'react';
import { Database, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
        // Charger les données depuis Supabase
        const [propertiesRes, ownersRes, tenantsRes, contractsRes] = await Promise.all([
          dbService.properties.findOne(user.agency_id),
          dbService.owners.findOne(user.agency_id),
          dbService.tenants.findOne(user.agency_id),
          dbService.contracts.findOne(user.agency_id),
        ]);

        // Toujours utiliser des tableaux pour éviter les erreurs TS
        const properties = Array.isArray(propertiesRes) ? propertiesRes : [];
        const owners = Array.isArray(ownersRes) ? ownersRes : [];
        const tenants = Array.isArray(tenantsRes) ? tenantsRes : [];
        const contracts = Array.isArray(contractsRes) ? contractsRes : [];

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
        console.error('Erreur chargement données agence:', error);
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
        dbService.properties.delete(user.agency_id),
        dbService.owners.delete(user.agency_id),
        dbService.tenants.delete(user.agency_id),
        dbService.contracts.delete(user.agency_id),
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

  return (
    <div className="space-y-6">
      {/* Aperçu des données */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Données de votre agence</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">{agencyData.properties}</div>
              <p className="text-sm text-blue-800">Propriétés</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">{agencyData.owners}</div>
              <p className="text-sm text-green-800">Propriétaires</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 mb-1">{agencyData.tenants}</div>
              <p className="text-sm text-yellow-800">Locataires</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">{agencyData.contracts}</div>
              <p className="text-sm text-purple-800">Contrats</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg flex justify-between">
            <div>
              <p className="font-medium text-gray-900">Taille totale des données</p>
              <p className="text-sm text-gray-500">Basée sur les données Supabase</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">{agencyData.totalSize}</p>
              <p className="text-sm text-gray-500">Utilisé</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Gestion des données */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Gestion des données</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <h4 className="font-medium text-red-900">Zone de danger</h4>
                <p className="text-sm text-red-700">
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
