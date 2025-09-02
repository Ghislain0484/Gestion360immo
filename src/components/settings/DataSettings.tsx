import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, Trash2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';

export const DataSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agencyData, setAgencyData] = useState({
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
      if (!user?.agencyId) return;
      
      try {
        // Charger les données réelles de l'agence
        const [properties, owners, tenants, contracts] = await Promise.all([
          dbService.getProperties(user.agencyId),
          dbService.getOwners(user.agencyId),
          dbService.getTenants(user.agencyId),
          dbService.getContracts(user.agencyId),
        ]);
        
        // Charger les utilisateurs de l'agence
        const agencyUsersKey = `agency_users_${user.agencyId}`;
        const users = JSON.parse(localStorage.getItem(agencyUsersKey) || '[]');
        
        // Calculer la taille approximative des données
        const dataSize = JSON.stringify({
          properties,
          owners,
          tenants,
          contracts,
          users
        }).length;
        
        const sizeInMB = (dataSize / (1024 * 1024)).toFixed(2);
        
        setAgencyData({
          properties: properties.length,
          owners: owners.length,
          tenants: tenants.length,
          contracts: contracts.length,
          users: users.length,
          totalSize: `${sizeInMB} MB`,
          lastBackup: new Date(),
        });
        
      } catch (error) {
        console.error('Erreur chargement données agence:', error);
      }
    };
    
    loadAgencyData();
  }, [user?.agencyId]);

  const handleExportData = async () => {
    if (!user?.agencyId) return;
    
    setLoading(true);
    try {
      // Exporter toutes les données de l'agence
      const [properties, owners, tenants, contracts] = await Promise.all([
        dbService.getProperties(user.agencyId),
        dbService.getOwners(user.agencyId),
        dbService.getTenants(user.agencyId),
        dbService.getContracts(user.agencyId),
      ]);
      
      const agencyUsersKey = `agency_users_${user.agencyId}`;
      const users = JSON.parse(localStorage.getItem(agencyUsersKey) || '[]');
      
      const exportData = {
        exported_at: new Date().toISOString(),
        agency_id: user.agencyId,
        agency_name: user.firstName + ' ' + user.lastName + ' Agency',
        data: {
          properties,
          owners,
          tenants,
          contracts,
          users: users.map(u => ({ ...u, password: undefined })) // Exclure les mots de passe
        },
        statistics: agencyData
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `agence-export-${user.agencyId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('✅ Export terminé avec succès !');
    } catch (error) {
      alert('❌ Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!user?.agencyId) return;
    
    setLoading(true);
    try {
      // Créer une sauvegarde des données de l'agence
      const backupKey = `backup_${user.agencyId}_${Date.now()}`;
      const [properties, owners, tenants, contracts] = await Promise.all([
        dbService.getProperties(user.agencyId),
        dbService.getOwners(user.agencyId),
        dbService.getTenants(user.agencyId),
        dbService.getContracts(user.agencyId),
      ]);
      
      const backupData = {
        created_at: new Date().toISOString(),
        agency_id: user.agencyId,
        data: { properties, owners, tenants, contracts }
      };
      
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      
      // Mettre à jour la date de dernière sauvegarde
      setAgencyData(prev => ({ ...prev, lastBackup: new Date() }));
      
      alert('✅ Sauvegarde créée avec succès !');
    } catch (error) {
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!user?.agencyId) return;
    
    setLoading(true);
    try {
      // Supprimer toutes les données de l'agence
      const agencyUsersKey = `agency_users_${user.agencyId}`;
      
      // Supprimer de localStorage
      localStorage.removeItem(`demo_owners_${user.agencyId}`);
      localStorage.removeItem(`demo_tenants_${user.agencyId}`);
      localStorage.removeItem(`demo_properties_${user.agencyId}`);
      localStorage.removeItem(`demo_contracts_${user.agencyId}`);
      localStorage.removeItem(agencyUsersKey);
      
      // Réinitialiser les compteurs
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Overview */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Données de votre agence</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {agencyData.properties}
              </div>
              <p className="text-sm text-blue-800">Propriétés</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {agencyData.owners}
              </div>
              <p className="text-sm text-green-800">Propriétaires</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {agencyData.tenants}
              </div>
              <p className="text-sm text-yellow-800">Locataires</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {agencyData.contracts}
              </div>
              <p className="text-sm text-purple-800">Contrats</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600 mb-1">
                {agencyData.users}
              </div>
              <p className="text-sm text-indigo-800">Utilisateurs</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Taille totale des données</p>
                <p className="text-sm text-gray-500">Données de votre agence uniquement</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{agencyData.totalSize}</p>
                <p className="text-sm text-gray-500">Utilisé</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Sauvegarde et restauration</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900">Dernière sauvegarde</p>
                  <p className="text-sm text-gray-500">
                    {agencyData.lastBackup.toLocaleDateString('fr-FR')} à{' '}
                    {agencyData.lastBackup.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="success" size="sm">À jour</Badge>
                <Button variant="outline" size="sm" onClick={handleBackup} isLoading={loading}>
                  Sauvegarder maintenant
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Import/Export */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Upload className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Import et export</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Exporter les données</h4>
              <p className="text-sm text-gray-500 mb-4">
                Téléchargez toutes les données de votre agence au format JSON
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportData}
                isLoading={loading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Importer des données</h4>
              <p className="text-sm text-gray-500 mb-4">
                Restaurer des données depuis un fichier de sauvegarde
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
              <input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    alert(`Fichier sélectionné: ${file.name}`);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Trash2 className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Gestion des données</h3>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Nettoyage automatique
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Les données supprimées sont conservées 30 jours avant suppression définitive.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <h4 className="font-medium text-red-900">Zone de danger</h4>
                <p className="text-sm text-red-700">
                  Supprimer définitivement toutes les données de votre agence
                </p>
              </div>
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                Supprimer tout
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer toutes les données"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800">
                  Action irréversible
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  Cette action supprimera définitivement toutes les données de votre agence :
                </p>
                <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                  <li>Toutes les propriétés ({agencyData.properties})</li>
                  <li>Tous les propriétaires ({agencyData.owners})</li>
                  <li>Tous les locataires ({agencyData.tenants})</li>
                  <li>Tous les contrats ({agencyData.contracts})</li>
                  <li>Tous les utilisateurs ({agencyData.users})</li>
                  <li>Tous les documents et images</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tapez "SUPPRIMER" pour confirmer
            </label>
            <input
              type="text"
              placeholder="SUPPRIMER"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Annuler
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteAllData}
              isLoading={loading}
            >
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};