import React, { useState } from 'react';
import { Save, User, MapPin, Heart, Camera, Upload, FileText, Phone } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { TenantFormData } from '../../types/tenant';

interface TenantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenant: Partial<TenantFormData>) => Promise<any> | any;
  initialData?: Partial<TenantFormData>;
}

export const TenantForm: React.FC<TenantFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<TenantFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    maritalStatus: 'celibataire',
    spouseName: '',
    spousePhone: '',
    childrenCount: 0,
    profession: '',
    nationality: 'Ivoirienne',
    photoUrl: '',
    idCardUrl: '',
    paymentStatus: 'bon',
    // ⛔ plus d'agencyId
    ...initialData,
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
      updateFormData({ photoUrl: url });
    } else {
      setIdCardFile(file);
      updateFormData({ idCardUrl: url });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.city.trim()) {
      alert('Prénom, nom et ville sont obligatoires');
      return;
    }

    if (formData.phone) {
      const phoneRegex = /^(\+225)?[0-9\s-]{8,15}$/;
      if (!phoneRegex.test(formData.phone)) return alert('Format de téléphone invalide');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return alert('Format d’email invalide');
    }

    // ✅ payload minimal : uniquement colonnes réelles de public.tenants
    const payload = {
      firstName: formData.firstName.trim(),
      lastName:  formData.lastName.trim(),
      phone:     formData.phone?.trim() || null,
      email:     formData.email?.trim() || null,
      city:      formData.city.trim(),
    };

    try {
      await onSubmit(payload);
      alert(
        `✅ Locataire créé !\n\n` +
        `👤 ${formData.firstName} ${formData.lastName}\n` +
        `📱 ${formData.phone || '—'}\n` +
        `🏠 ${formData.city}`
      );
      onClose();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert(`❌ Erreur: ${error instanceof Error ? error.message : 'inconnue'}`);
    }
  };

  const isMarried = formData.maritalStatus === 'marie';

  return (
    <div>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Ajouter un locataire">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-blue-600 mr-2" />
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

          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <div className="flex items-center mb-4">
              <MapPin className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Localisation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Adresse (optionnel)" value={formData.address} onChange={(e) => updateFormData({ address: e.target.value })} placeholder="Adresse complète" />
              <Input label="Ville" value={formData.city} onChange={(e) => updateFormData({ city: e.target.value })} required placeholder="Ville de résidence" />
            </div>
          </Card>

          {/* Sections UI (non envoyées à la DB) */}
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
                  onChange={(e) => updateFormData({ maritalStatus: e.target.value as TenantFormData['maritalStatus'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white/90"
                >
                  {maritalStatusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-yellow-200">
            <div className="flex items-center mb-4">
              <Phone className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Informations locatives (UI)</h3>
            </div>
            <div className="space-y-4 text-sm text-gray-600">
              <p>Ces champs restent UI (non envoyés à la DB minimale).</p>
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Documents d'identité (UI)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo du locataire</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white/50">
                  {formData.photoUrl ? (
                    <div className="space-y-2">
                      <img src={formData.photoUrl} alt="Photo" className="w-32 h-32 object-cover rounded-full mx-auto" />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('photo-upload')?.click()}>
                        Changer la photo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Camera className="h-12 w-12 mx-auto text-gray-400" />
                      <Button type="button" variant="outline" onClick={() => document.getElementById('photo-upload')?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Télécharger
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pièce d'identité</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white/50">
                  {formData.idCardUrl ? (
                    <div className="space-y-2">
                      <img src={formData.idCardUrl} alt="Pièce d'identité" className="w-full h-32 object-cover rounded mx-auto" />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('id-upload')?.click()}>
                        Changer le document
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 mx-auto text-gray-400" />
                      <Button type="button" variant="outline" onClick={() => document.getElementById('id-upload')?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Télécharger
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
