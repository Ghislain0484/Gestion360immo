import React, { useState } from 'react';
import { Save, FileText, Calendar, DollarSign, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { ContractFormData } from '../../types/contract';

interface ContractFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contract: ContractFormData) => void;
  initialData?: Partial<ContractFormData>;
}

export const ContractForm: React.FC<ContractFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<ContractFormData>({
    propertyId: '',
    ownerId: '',
    tenantId: '',
    agencyId: '1',
    type: 'location',
    startDate: new Date(),
    monthlyRent: 0,
    deposit: 0,
    charges: 0,
    commissionRate: 10,
    commissionAmount: 0,
    status: 'draft',
    terms: '',
    documents: [],
    renewalHistory: [],
    ...initialData,
  });

  const updateFormData = (updates: Partial<ContractFormData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...updates };
      // Recalculate commission when rent or rate changes
      if (updates.monthlyRent !== undefined || updates.commissionRate !== undefined) {
        const rent = updates.monthlyRent ?? prev.monthlyRent ?? 0;
        const rate = updates.commissionRate ?? prev.commissionRate ?? 0;
        updated.commissionAmount = (rent * rate) / 100;
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des données requises
    if (!formData.propertyId.trim() || !formData.ownerId.trim() || !formData.tenantId.trim()) {
      alert('Veuillez sélectionner une propriété, un propriétaire et un locataire');
      return;
    }
    
    // Validation des montants
    if (formData.type === 'location') {
      if (!formData.monthlyRent || formData.monthlyRent <= 0) {
        alert('Veuillez saisir un loyer mensuel valide');
        return;
      }
    } else if (formData.type === 'vente') {
      if (!formData.salePrice || formData.salePrice <= 0) {
        alert('Veuillez saisir un prix de vente valide');
        return;
      }
    }
    
    // Validation du taux de commission
    if (!formData.commissionRate || formData.commissionRate < 0 || formData.commissionRate > 100) {
      alert('Veuillez saisir un taux de commission valide (0-100%)');
      return;
    }
    
    // Validation des termes
    if (!formData.terms.trim()) {
      alert('Veuillez saisir les termes du contrat');
      return;
    }
    
    try {
      onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Nouveau contrat">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Informations générales</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de contrat
              </label>
              <select
                value={formData.type}
                onChange={(e) => updateFormData({ type: e.target.value as ContractFormData['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="location">Location</option>
                <option value="vente">Vente</option>
                <option value="gestion">Gestion</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => updateFormData({ status: e.target.value as ContractFormData['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
                <option value="expired">Expiré</option>
                <option value="terminated">Résilié</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="ID Propriété"
              value={formData.propertyId}
              onChange={(e) => updateFormData({ propertyId: e.target.value })}
              required
              placeholder="Sélectionner une propriété"
            />
            <Input
              label="ID Propriétaire"
              value={formData.ownerId}
              onChange={(e) => updateFormData({ ownerId: e.target.value })}
              required
              placeholder="Sélectionner un propriétaire"
            />
            <Input
              label="ID Locataire"
              value={formData.tenantId}
              onChange={(e) => updateFormData({ tenantId: e.target.value })}
              required
              placeholder="Sélectionner un locataire"
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Dates</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date de début"
              type="date"
              value={formData.startDate.toISOString().split('T')[0]}
              onChange={(e) => updateFormData({ startDate: new Date(e.target.value) })}
              required
            />
            <Input
              label="Date de fin (optionnel)"
              type="date"
              value={formData.endDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => updateFormData({ endDate: e.target.value ? new Date(e.target.value) : undefined })}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center mb-4">
            <DollarSign className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Montants</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.type === 'location' ? (
              <>
                <Input
                  label="Loyer mensuel (FCFA)"
                  type="number"
                  value={formData.monthlyRent || ''}
                  onChange={(e) => updateFormData({ monthlyRent: parseFloat(e.target.value) || 0 })}
                  min="0"
                  placeholder="450000"
                />
                <Input
                  label="Caution (FCFA)"
                  type="number"
                  value={formData.deposit || ''}
                  onChange={(e) => updateFormData({ deposit: parseFloat(e.target.value) || 0 })}
                  min="0"
                  placeholder="900000"
                />
                <Input
                  label="Charges (FCFA)"
                  type="number"
                  value={formData.charges || ''}
                  onChange={(e) => updateFormData({ charges: parseFloat(e.target.value) || 0 })}
                  min="0"
                  placeholder="25000"
                />
              </>
            ) : (
              <Input
                label="Prix de vente (FCFA)"
                type="number"
                value={formData.salePrice || ''}
                onChange={(e) => updateFormData({ salePrice: parseFloat(e.target.value) || 0 })}
                min="0"
                placeholder="25000000"
              />
            )}
            
            <Input
              label="Taux de commission (%)"
              type="number"
              value={formData.commissionRate}
              onChange={(e) => updateFormData({ commissionRate: parseFloat(e.target.value) || 0 })}
              min="0"
              max="100"
              step="0.1"
              placeholder="10"
            />
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Commission calculée :</strong> {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF',
                minimumFractionDigits: 0,
              }).format(formData.commissionAmount)} FCFA
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center mb-4">
            <Upload className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Termes et conditions</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Termes du contrat
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => updateFormData({ terms: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez les termes et conditions du contrat..."
              required
            />
          </div>
        </Card>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Enregistrer le contrat
          </Button>
        </div>
      </form>
    </Modal>
  );
};