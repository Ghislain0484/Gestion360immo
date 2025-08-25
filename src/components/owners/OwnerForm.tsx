import React, { useState } from 'react';
import { Save, User, MapPin, FileText, Heart } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { OwnerFormData } from '../../types/owner';

interface OwnerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (owner: Partial<OwnerFormData>) => Promise<any> | any;
  initialData?: Partial<OwnerFormData>;
}

export const OwnerForm: React.FC<OwnerFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<OwnerFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    propertyTitle: 'attestation_villageoise',
    propertyTitleDetails: '',
    maritalStatus: 'celibataire',
    spouseName: '',
    spousePhone: '',
    childrenCount: 0,
    // ⛔ plus d'agencyId ici
    ...initialData,
  });

  const propertyTitleOptions = [
    { value: 'attestation_villageoise', label: 'Attestation villageoise' },
    { value: 'lettre_attribution', label: "Lettre d'attribution" },
    { value: 'permis_habiter', label: "Permis d'habiter" },
    { value: 'acd', label: 'ACD (Arrêté de Concession Définitive)' },
    { value: 'tf', label: 'TF (Titre Foncier)' },
    { value: 'cpf', label: 'CPF (Certificat de Propriété Foncière)' },
    { value: 'autres', label: 'Autres' },
  ];

  const maritalStatusOptions = [
    { value: 'celibataire', label: 'Célibataire' },
    { value: 'marie', label: 'Marié(e)' },
    { value: 'divorce', label: 'Divorcé(e)' },
    { value: 'veuf', label: 'Veuf/Veuve' },
  ];

  const updateFormData = (updates: Partial<OwnerFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Champs minimaux obligatoires pour la table owners
    if (!formData.firstName.trim()) return alert('Le prénom est obligatoire');
    if (!formData.lastName.trim()) return alert('Le nom est obligatoire');
    if (!formData.city.trim()) return alert('La ville est obligatoire');

    // Téléphone (optionnel mais si fourni, format)
    if (formData.phone) {
      const phoneRegex = /^(\+225)?[0-9\s-]{8,15}$/;
      if (!phoneRegex.test(formData.phone)) {
        return alert('Format de téléphone invalide');
      }
    }

    // Email (optionnel mais si fourni, format)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return alert('Format d’email invalide');
    }

    // ✅ payload minimal : uniquement colonnes réelles
    const payload = {
      firstName: formData.firstName.trim(),
      lastName:  formData.lastName.trim(),
      phone:     formData.phone?.trim() || null,
      email:     formData.email?.trim() || null,
      city:      formData.city.trim(),
      maritalStatus: formData.maritalStatus || null,
    };

    try {
      await onSubmit(payload);
      alert(
        `✅ Propriétaire créé !\n\n` +
        `👤 ${formData.firstName} ${formData.lastName}\n` +
        `📱 ${formData.phone || '—'}\n` +
        `🏠 ${formData.city}`
      );
      onClose();
    } catch (error) {
      console.error('❌ Erreur création propriétaire:', error);
      alert(`❌ Erreur: ${error instanceof Error ? error.message : 'inconnue'}`);
    }
  };

  const isMarried = formData.maritalStatus === 'marie';

  return (
    <div>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Ajouter un propriétaire">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Informations personnelles</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Prénom" value={formData.firstName} onChange={(e) => updateFormData({ firstName: e.target.value })} required />
              <Input label="Nom de famille" value={formData.lastName} onChange={(e) => updateFormData({ lastName: e.target.value })} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Téléphone (optionnel)" type="tel" value={formData.phone} onChange={(e) => updateFormData({ phone: e.target.value })} placeholder="+225 XX XX XX XX XX" />
              <Input label="Email (optionnel)" type="email" value={formData.email || ''} onChange={(e) => updateFormData({ email: e.target.value })} placeholder="email@exemple.com" />
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <div className="flex items-center mb-4">
              <MapPin className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Localisation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Adresse (optionnel)" value={formData.address} onChange={(e) => updateFormData({ address: e.target.value })} placeholder="Adresse complète" />
              <Input label="Ville" value={formData.city} onChange={(e) => updateFormData({ city: e.target.value })} required placeholder="Ville de résidence" />
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-orange-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Titre de propriété (UI)</h3>
            </div>
            {/* UI uniquement — non envoyé à la DB */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de titre</label>
                <select
                  value={formData.propertyTitle}
                  onChange={(e) => updateFormData({ propertyTitle: e.target.value as OwnerFormData['propertyTitle'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                >
                  {propertyTitleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              {formData.propertyTitle === 'autres' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Précisez</label>
                  <textarea
                    value={formData.propertyTitleDetails || ''}
                    onChange={(e) => updateFormData({ propertyTitleDetails: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                    placeholder="Décrivez le type de titre..."
                  />
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
            <div className="flex items-center mb-4">
              <Heart className="h-5 w-5 text-pink-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Situation familiale</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Situation matrimoniale</label>
                <select
                  value={formData.maritalStatus}
                  onChange={(e) => updateFormData({ maritalStatus: e.target.value as OwnerFormData['maritalStatus'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/90"
                >
                  {maritalStatusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-green-200">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
