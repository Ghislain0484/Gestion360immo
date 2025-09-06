import React, { useState } from 'react';
import { Save, User, MapPin, Phone, FileText, Heart, Camera, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { TenantFormData } from '../../types/db';

interface TenantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenant: TenantFormData) => void;
  initialData?: Partial<TenantFormData>;
}

export const TenantForm: React.FC<TenantFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { user } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<TenantFormData>({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    phone: initialData?.phone || '',
    email: initialData?.email ?? '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    marital_status: initialData?.marital_status || 'celibataire',
    spouse_name: initialData?.spouse_name || '',
    spouse_phone: initialData?.spouse_phone || '',
    children_count: initialData?.children_count || 0,
    profession: initialData?.profession || '',
    nationality: initialData?.nationality || 'Ivoirienne',
    photo_url: initialData?.photo_url || '',
    id_card_url: initialData?.id_card_url || '',
    payment_status: initialData?.payment_status || 'bon',
    agency_id: user?.agency_id || '',
  });


  const maritalStatusOptions = [
    { value: 'celibataire', label: 'Célibataire' },
    { value: 'marie', label: 'Marié(e)' },
    { value: 'divorce', label: 'Divorcé(e)' },
    { value: 'veuf', label: 'Veuf/Veuve' },
  ];

  const nationalityOptions = [
    'Ivoirienne', 'Française', 'Malienne', 'Burkinabé', 'Ghanéenne',
    'Nigériane', 'Sénégalaise', 'Guinéenne', 'Libérienne', 'Autre'
  ];

  const paymentStatusOptions = [
    { value: 'bon', label: 'Bon payeur', color: 'text-green-600' },
    { value: 'irregulier', label: 'Payeur irrégulier', color: 'text-yellow-600' },
    { value: 'mauvais', label: 'Mauvais payeur', color: 'text-red-600' },
  ];

  const updateFormData = (updates: Partial<TenantFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = (file: File, type: 'photo' | 'idCard') => {
    const url = URL.createObjectURL(file);
    if (type === 'photo') {
      setPhotoFile(file);
      updateFormData({ photo_url: url });
    } else {
      setIdCardFile(file);
      updateFormData({ id_card_url: url });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation des données requises
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.phone.trim() || !formData.profession.trim()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validation du téléphone
    const phoneRegex = /^(\+225)?[0-9\s-]{8,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert('Format de téléphone invalide');
      return;
    }

    // Validation email si fourni
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert('Format d\'email invalide');
      return;
    }

    // Validation des données du conjoint si marié
    if (formData.marital_status === 'marie') {
      if (!formData.spouse_name?.trim() || !formData.spouse_phone?.trim()) {
        alert('Veuillez remplir les informations du conjoint');
        return;
      }
    }

    try {
      await onSubmit(formData);

      alert(`✅ Locataire créé avec succès !
      
👤 ${formData.first_name} ${formData.last_name}
📱 ${formData.phone}
🏠 ${formData.city}

Le locataire a été enregistré et est maintenant disponible dans votre liste.`);

      onClose();

    } catch (error) {
      console.error('Erreur lors de la soumission:', error);

      if (error instanceof Error) {
        alert(`❌ Erreur: ${error.message}`);
      } else {
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
      }
    }
  };

  const isMarried = formData.marital_status === 'marie';

  return (
    <div>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Ajouter un locataire">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations personnelles */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Informations personnelles</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                value={formData.first_name}
                onChange={(e) => updateFormData({ first_name: e.target.value })}
                required
                placeholder="Prénom du locataire"
              />
              <Input
                label="Nom de famille"
                value={formData.last_name}
                onChange={(e) => updateFormData({ last_name: e.target.value })}
                required
                placeholder="Nom de famille"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Téléphone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData({ phone: e.target.value })}
                required
                placeholder="+225 XX XX XX XX XX"
              />
              <Input
                label="Email (optionnel)"
                type="email"
                value={formData.email || ''}
                onChange={(e) => updateFormData({ email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Profession"
                value={formData.profession}
                onChange={(e) => updateFormData({ profession: e.target.value })}
                required
                placeholder="Profession du locataire"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationalité
                </label>
                <select
                  value={formData.nationality}
                  onChange={(e) => updateFormData({ nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                  required
                >
                  {nationalityOptions.map(nationality => (
                    <option key={nationality} value={nationality}>
                      {nationality}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Localisation */}
          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <div className="flex items-center mb-4">
              <MapPin className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Localisation</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Adresse"
                value={formData.address}
                onChange={(e) => updateFormData({ address: e.target.value })}
                required
                placeholder="Adresse complète"
              />
              <Input
                label="Ville"
                value={formData.city}
                onChange={(e) => updateFormData({ city: e.target.value })}
                required
                placeholder="Ville de résidence"
              />
            </div>
          </Card>

          {/* Situation familiale */}
          <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
            <div className="flex items-center mb-4">
              <Heart className="h-5 w-5 text-pink-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Situation familiale</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Situation matrimoniale
                </label>
                <select
                  value={formData.marital_status}
                  onChange={(e) => updateFormData({ marital_status: e.target.value as TenantFormData['marital_status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                  required
                >
                  {maritalStatusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {isMarried && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-pink-50/80 rounded-lg backdrop-blur-sm">
                  <Input
                    label="Nom du conjoint"
                    value={formData.spouse_name || ''}
                    onChange={(e) => updateFormData({ spouse_name: e.target.value })}
                    required={isMarried}
                    placeholder="Nom complet du conjoint"
                  />
                  <Input
                    label="Téléphone du conjoint"
                    type="tel"
                    value={formData.spouse_phone || ''}
                    onChange={(e) => updateFormData({ spouse_phone: e.target.value })}
                    required={isMarried}
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>
              )}

              <Input
                label="Nombre d'enfants"
                type="number"
                value={formData.children_count}
                onChange={(e) => updateFormData({ children_count: parseInt(e.target.value) || 0 })}
                min="0"
                max="20"
                placeholder="0"
              />
            </div>
          </Card>

          {/* Statut de paiement */}
          <Card className="bg-white/80 backdrop-blur-sm border-yellow-200">
            <div className="flex items-center mb-4">
              <Phone className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Informations locatives</h3>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Historique de paiement
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) => updateFormData({ payment_status: e.target.value as TenantFormData['payment_status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                required
              >
                {paymentStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-sm text-gray-500">
                <p><strong>Bon payeur :</strong> Paiements réguliers et à temps</p>
                <p><strong>Payeur irrégulier :</strong> Retards occasionnels mais à jour</p>
                <p><strong>Mauvais payeur :</strong> Plus de 2 mois d'impayés</p>
              </div>
            </div>
          </Card>

          {/* Documents d'identité */}
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Documents d'identité</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo du locataire
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors bg-white/50">
                  {formData.photo_url ? (
                    <div className="space-y-2">
                      <img
                        src={formData.photo_url}
                        alt="Photo du locataire"
                        className="w-32 h-32 object-cover rounded-full mx-auto"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                      >
                        Changer la photo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Camera className="h-12 w-12 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">Cliquez pour ajouter une photo</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>
                  )}
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'photo');
                    }}
                  />
                </div>
              </div>

              {/* ID Card Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pièce d'identité
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors bg-white/50">
                  {formData.id_card_url ? (
                    <div className="space-y-2">
                      <img
                        src={formData.id_card_url}
                        alt="Pièce d'identité"
                        className="w-full h-32 object-cover rounded mx-auto"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('id-upload')?.click()}
                      >
                        Changer le document
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500">CNI, Passeport, Permis de conduire</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('id-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>
                  )}
                  <input
                    id="id-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'idCard');
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-green-200">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Annuler
            </Button>
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