import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { RoomDetails } from '../../types/property';

interface RoomDetailsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (room: RoomDetails) => void;
  initialData?: RoomDetails;
}

export const RoomDetailsForm: React.FC<RoomDetailsFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<RoomDetails>({
    type: 'sejour',
    nom: '',
    superficie: 0,
    plafond: {
      type: 'dalle_simple',
      details: '',
    },
    electricite: {
      nombrePrises: 0,
      nombreInterrupteurs: 0,
      nombreDismatique: 0,
      nombreAmpoules: 0,
      typeLuminaires: '',
    },
    peinture: {
      couleur: '',
      type: '',
      marque: '',
    },
    menuiserie: {
      materiau: 'bois',
      nombreFenetres: 0,
      typeFenetres: '',
    },
    serrure: {
      typePoignee: '',
      marquePoignee: '',
      typeCle: '',
    },
    sol: {
      type: 'carrelage',
      details: '',
    },
    images: [],
    ...initialData,
  });

  const roomTypes = [
    { value: 'sejour', label: 'Séjour' },
    { value: 'cuisine', label: 'Cuisine' },
    { value: 'chambre_principale', label: 'Chambre principale' },
    { value: 'chambre_2', label: 'Chambre 2' },
    { value: 'chambre_3', label: 'Chambre 3' },
    { value: 'salle_bain', label: 'Salle de bain' },
    { value: 'wc', label: 'WC' },
    { value: 'autre', label: 'Autre' },
  ];

  const plafondTypes = [
    { value: 'staff', label: 'Staff' },
    { value: 'plafond_bois', label: 'Plafond bois' },
    { value: 'lambris_pvc', label: 'Lambris PVC' },
    { value: 'lambris_bois', label: 'Lambris bois' },
    { value: 'dalle_simple', label: 'Dalle simple' },
    { value: 'autre', label: 'Autre' },
  ];

  const solTypes = [
    { value: 'carrelage', label: 'Carrelage' },
    { value: 'parquet', label: 'Parquet' },
    { value: 'autre', label: 'Autre' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const updateFormData = (updates: Partial<RoomDetails>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateNestedField = (section: keyof RoomDetails, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Détails de la pièce">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de pièce
            </label>
            <select
              value={formData.type}
              onChange={(e) => updateFormData({ type: e.target.value as RoomDetails['type'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {roomTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Nom de la pièce (optionnel)"
            value={formData.nom || ''}
            onChange={(e) => updateFormData({ nom: e.target.value })}
            placeholder="Ex: Chambre parentale"
          />
        </div>

        <Input
          label="Superficie (m²)"
          type="number"
          value={formData.superficie || ''}
          onChange={(e) => updateFormData({ superficie: parseFloat(e.target.value) || 0 })}
          min="0"
          step="0.1"
        />

        {/* Plafond */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Plafond</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de plafond
              </label>
              <select
                value={formData.plafond.type}
                onChange={(e) => updateNestedField('plafond', 'type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {plafondTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Détails supplémentaires"
              value={formData.plafond.details || ''}
              onChange={(e) => updateNestedField('plafond', 'details', e.target.value)}
              placeholder="Précisions sur le plafond"
            />
          </div>
        </div>

        {/* Électricité */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Électricité</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Nombre de prises"
              type="number"
              value={formData.electricite.nombrePrises}
              onChange={(e) => updateNestedField('electricite', 'nombrePrises', parseInt(e.target.value) || 0)}
              min="0"
            />
            <Input
              label="Interrupteurs"
              type="number"
              value={formData.electricite.nombreInterrupteurs}
              onChange={(e) => updateNestedField('electricite', 'nombreInterrupteurs', parseInt(e.target.value) || 0)}
              min="0"
            />
            <Input
              label="Dismatique"
              type="number"
              value={formData.electricite.nombreDismatique}
              onChange={(e) => updateNestedField('electricite', 'nombreDismatique', parseInt(e.target.value) || 0)}
              min="0"
            />
            <Input
              label="Ampoules"
              type="number"
              value={formData.electricite.nombreAmpoules}
              onChange={(e) => updateNestedField('electricite', 'nombreAmpoules', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>
          <Input
            label="Type de luminaires"
            value={formData.electricite.typeLuminaires}
            onChange={(e) => updateNestedField('electricite', 'typeLuminaires', e.target.value)}
            placeholder="Ex: Spots LED, Lustre, Appliques..."
          />
        </div>

        {/* Peinture */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Peinture</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Couleur"
              value={formData.peinture.couleur}
              onChange={(e) => updateNestedField('peinture', 'couleur', e.target.value)}
              placeholder="Ex: Blanc cassé"
            />
            <Input
              label="Type de peinture"
              value={formData.peinture.type}
              onChange={(e) => updateNestedField('peinture', 'type', e.target.value)}
              placeholder="Ex: Acrylique, Glycéro"
            />
            <Input
              label="Marque"
              value={formData.peinture.marque}
              onChange={(e) => updateNestedField('peinture', 'marque', e.target.value)}
              placeholder="Ex: Dulux, Seigneurie"
            />
          </div>
        </div>

        {/* Menuiserie */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Menuiserie</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matériau
              </label>
              <select
                value={formData.menuiserie.materiau}
                onChange={(e) => updateNestedField('menuiserie', 'materiau', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bois">Bois</option>
                <option value="alu">Aluminium</option>
              </select>
            </div>
            <Input
              label="Nombre de fenêtres"
              type="number"
              value={formData.menuiserie.nombreFenetres}
              onChange={(e) => updateNestedField('menuiserie', 'nombreFenetres', parseInt(e.target.value) || 0)}
              min="0"
            />
            <Input
              label="Type de fenêtres"
              value={formData.menuiserie.typeFenetres}
              onChange={(e) => updateNestedField('menuiserie', 'typeFenetres', e.target.value)}
              placeholder="Ex: Coulissante, Battante"
            />
          </div>
        </div>

        {/* Serrure */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Serrure</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Type de poignée"
              value={formData.serrure.typePoignee}
              onChange={(e) => updateNestedField('serrure', 'typePoignee', e.target.value)}
              placeholder="Ex: Béquille, Bouton"
            />
            <Input
              label="Marque de la poignée"
              value={formData.serrure.marquePoignee}
              onChange={(e) => updateNestedField('serrure', 'marquePoignee', e.target.value)}
              placeholder="Ex: Vachette, Bricard"
            />
            <Input
              label="Type de clé"
              value={formData.serrure.typeCle}
              onChange={(e) => updateNestedField('serrure', 'typeCle', e.target.value)}
              placeholder="Ex: Classique, Sécurisée"
            />
          </div>
        </div>

        {/* Sol */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Sol</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de sol
              </label>
              <select
                value={formData.sol.type}
                onChange={(e) => updateNestedField('sol', 'type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {solTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Détails supplémentaires"
              value={formData.sol.details || ''}
              onChange={(e) => updateNestedField('sol', 'details', e.target.value)}
              placeholder="Précisions sur le sol"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit">
            {initialData ? 'Modifier' : 'Ajouter'} la pièce
          </Button>
        </div>
      </form>
    </Modal>
  );
};