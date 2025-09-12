import React, { useState } from 'react';
import { Save, FileText, Calendar, DollarSign, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Contract } from '../../types/db';

interface ContractFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contract: Partial<Contract>) => void;
  initialData?: Partial<Contract>;
}

export const ContractForm: React.FC<ContractFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Contract>>({
    property_id: '',
    owner_id: '',
    tenant_id: '',
    agency_id: '',
    type: 'location',
    start_date: new Date().toISOString().split('T')[0],
    monthly_rent: 0,
    deposit: 0,
    charges: 0,
    commission_rate: 10,
    commission_amount: 0,
    status: 'draft',
    terms: '',
    documents: [],
    ...initialData,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateFormData = (updates: Partial<Contract>) => {
    setFormData(prev => {
      const updated = { ...prev, ...updates };
      // Recalculer la commission si nécessaire
      if (updates.monthly_rent !== undefined || updates.commission_rate !== undefined) {
        const rent = updates.monthly_rent ?? prev.monthly_rent ?? 0;
        const rate = updates.commission_rate ?? prev.commission_rate ?? 0;
        updated.commission_amount = (rent * rate) / 100;
      }
      return updated;
    });
  };

  const resetForm = () => {
    setFormData({
      property_id: '',
      owner_id: '',
      tenant_id: '',
      agency_id: '',
      type: 'location',
      start_date: new Date().toISOString().split('T')[0],
      monthly_rent: 0,
      deposit: 0,
      charges: 0,
      commission_rate: 10,
      commission_amount: 0,
      status: 'draft',
      terms: '',
      documents: [],
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validation des champs obligatoires
      if (!formData.agency_id?.trim()) {
        throw new Error('L\'ID de l\'agence est requis');
      }
      if (!formData.property_id?.trim()) {
        throw new Error('Veuillez sélectionner une propriété');
      }
      if (!formData.owner_id?.trim()) {
        throw new Error('Veuillez sélectionner un propriétaire');
      }
      if (!formData.tenant_id?.trim()) {
        throw new Error('Veuillez sélectionner un locataire');
      }
      if (!formData.type) {
        throw new Error('Veuillez sélectionner un type de contrat');
      }
      if (!formData.start_date) {
        throw new Error('Veuillez spécifier une date de début');
      }
      if (!formData.terms?.trim()) {
        throw new Error('Veuillez saisir les termes du contrat');
      }
      if (formData.type === 'location') {
        if (!formData.monthly_rent || formData.monthly_rent <= 0) {
          throw new Error('Veuillez saisir un loyer mensuel valide');
        }
      } else if (formData.type === 'vente') {
        if (!formData.sale_price || formData.sale_price <= 0) {
          throw new Error('Veuillez saisir un prix de vente valide');
        }
      }
      if (!formData.commission_rate || formData.commission_rate < 0 || formData.commission_rate > 100) {
        throw new Error('Veuillez saisir un taux de commission valide (0-100%)');
      }

      await onSubmit(formData);
      resetForm();
      onClose();
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose(); }} size="lg" title="Nouveau contrat">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        <Card>
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Informations générales</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Type de contrat
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => updateFormData({ type: e.target.value as Contract['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="location">Location</option>
                <option value="vente">Vente</option>
                <option value="gestion">Gestion</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Statut
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => updateFormData({ status: e.target.value as Contract['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="draft">Brouillon</option>
                <option value="active">Actif</option>
                <option value="expired">Expiré</option>
                <option value="terminated">Résilié</option>
                <option value="renewed">Renouvelé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="agency_id"
              label="ID Agence"
              value={formData.agency_id}
              onChange={(e) => updateFormData({ agency_id: e.target.value })}
              required
              placeholder="ID de l'agence"
            />
            <Input
              id="property_id"
              label="ID Propriété"
              value={formData.property_id}
              onChange={(e) => updateFormData({ property_id: e.target.value })}
              required
              placeholder="Sélectionner une propriété"
              // TODO: Remplacer par un composant Select avec autocomplétion basé sur dbService.properties.getAll
            />
            <Input
              id="owner_id"
              label="ID Propriétaire"
              value={formData.owner_id}
              onChange={(e) => updateFormData({ owner_id: e.target.value })}
              required
              placeholder="Sélectionner un propriétaire"
              // TODO: Remplacer par un composant Select avec autocomplétion basé sur dbService.owners.getAll
            />
            <Input
              id="tenant_id"
              label="ID Locataire"
              value={formData.tenant_id}
              onChange={(e) => updateFormData({ tenant_id: e.target.value })}
              required
              placeholder="Sélectionner un locataire"
              // TODO: Remplacer par un composant Select avec autocomplétion basé sur dbService.tenants.getAll
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
              id="start_date"
              label="Date de début"
              type="date"
              value={formData.start_date}
              onChange={(e) => updateFormData({ start_date: e.target.value })}
              required
            />
            <Input
              id="end_date"
              label="Date de fin (optionnel)"
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => updateFormData({ end_date: e.target.value || null })}
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
                  id="monthly_rent"
                  label="Loyer mensuel (FCFA)"
                  type="number"
                  value={formData.monthly_rent || ''}
                  onChange={(e) => updateFormData({ monthly_rent: parseFloat(e.target.value) || 0 })}
                  min="0"
                  placeholder="450000"
                />
                <Input
                  id="deposit"
                  label="Caution (FCFA)"
                  type="number"
                  value={formData.deposit || ''}
                  onChange={(e) => updateFormData({ deposit: parseFloat(e.target.value) || 0 })}
                  min="0"
                  placeholder="900000"
                />
                <Input
                  id="charges"
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
                id="sale_price"
                label="Prix de vente (FCFA)"
                type="number"
                value={formData.sale_price || ''}
                onChange={(e) => updateFormData({ sale_price: parseFloat(e.target.value) || 0 })}
                min="0"
                placeholder="25000000"
              />
            )}

            <Input
              id="commission_rate"
              label="Taux de commission (%)"
              type="number"
              value={formData.commission_rate}
              onChange={(e) => updateFormData({ commission_rate: parseFloat(e.target.value) || 0 })}
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
              }).format(formData.commission_amount || 0)} FCFA
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex items-center mb-4">
            <Upload className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Termes et conditions</h3>
          </div>

          <div>
            <label htmlFor="terms" className="block text-sm font-medium text-gray-700 mb-2">
              Termes du contrat
            </label>
            <textarea
              id="terms"
              value={formData.terms || ''}
              onChange={(e) => updateFormData({ terms: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Décrivez les termes et conditions du contrat..."
              required
            />
          </div>
        </Card>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="ghost" onClick={() => { resetForm(); onClose(); }} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? 'Enregistrement...' : 'Enregistrer le contrat'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};