import React, { useState } from 'react';
import { Database, Download, Upload, Trash2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

export const DataSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [backupStatus, setBackupStatus] = useState('success'); // success, warning, error

  const dataStats = {
    properties: 247,
    owners: 89,
    tenants: 198,
    contracts: 176,
    totalSize: '2.4 GB',
    lastBackup: new Date('2024-03-10T14:30:00'),
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      // Export data logic
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate export
      
      // Create and download a mock file
      const data = JSON.stringify({
        exported_at: new Date().toISOString(),
        properties: dataStats.properties,
        owners: dataStats.owners,
        tenants: dataStats.tenants,
        contracts: dataStats.contracts,
      }, null, 2);
      
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `immobilier-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Export terminé avec succès !');
    } catch (error) {
      alert('Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      // Backup logic
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate backup
      setBackupStatus('success');
      alert('Sauvegarde créée avec succès !');
    } catch (error) {
      setBackupStatus('error');
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    setLoading(true);
    try {
      // Delete all data logic
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate deletion
      alert('Toutes les données ont été supprimées !');
      setShowDeleteModal(false);
    } catch (error) {
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const getBackupStatusBadge = () => {
    switch (backupStatus) {
      case 'success':
        return <Badge variant="success" size="sm">À jour</Badge>;
      case 'warning':
        return <Badge variant="warning" size="sm">Attention</Badge>;
      case 'error':
        return <Badge variant="danger" size="sm">Erreur</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Inconnu</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Overview */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Database className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Vue d'ensemble des données</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {dataStats.properties}
              </div>
              <p className="text-sm text-blue-800">Propriétés</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {dataStats.owners}
              </div>
              <p className="text-sm text-green-800">Propriétaires</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {dataStats.tenants}
              </div>
              <p className="text-sm text-yellow-800">Locataires</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {dataStats.contracts}
              </div>
              <p className="text-sm text-purple-800">Contrats</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Taille totale des données</p>
                <p className="text-sm text-gray-500">Incluant les images et documents</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{dataStats.totalSize}</p>
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
                    {dataStats.lastBackup.toLocaleDateString('fr-FR')} à{' '}
                    {dataStats.lastBackup.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getBackupStatusBadge()}
                <Button variant="outline" size="sm" onClick={handleBackup} isLoading={loading}>
                  Sauvegarder maintenant
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Sauvegarde automatique</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Sauvegarde quotidienne à 2h00 du matin
                </p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm text-gray-700">Activé</span>
                </label>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Rétention</h4>
                <p className="text-sm text-gray-500 mb-3">
                  Conserver les sauvegardes pendant 30 jours
                </p>
                <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="7">7 jours</option>
                  <option value="30" selected>30 jours</option>
                  <option value="90">90 jours</option>
                  <option value="365">1 an</option>
                </select>
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
                Téléchargez toutes vos données au format JSON
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
                  Supprimer définitivement toutes les données de l'agence
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
                  <li>Toutes les propriétés ({dataStats.properties})</li>
                  <li>Tous les propriétaires ({dataStats.owners})</li>
                  <li>Tous les locataires ({dataStats.tenants})</li>
                  <li>Tous les contrats ({dataStats.contracts})</li>
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