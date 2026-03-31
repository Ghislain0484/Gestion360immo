import React, { useState, useEffect, useMemo } from 'react';
import { Save, User, MapPin, FileText, Heart, Camera, X, Upload } from 'lucide-react';
import { supabase } from '../../lib/config';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { SuccessModal } from '../ui/SuccessModal';
import { Owner } from '../../types/db';
import { PropertyTitle, MaritalStatus } from '../../types/enums';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { dbService } from '../../lib/supabase';
import { validatePhoneCI } from '../../utils/validationUtils';

interface OwnerFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Owner | null | undefined;
  onSuccess?: () => void;
}

export const OwnerForm: React.FC<OwnerFormProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const { agencyId: authAgencyId } = useAuth();
  const [formData, setFormData] = useState<Partial<Owner>>({
    first_name: '',
    last_name: '',
    phone: '',
    email: null,
    address: '',
    city: '',
    property_title: 'attestation_villageoise' as PropertyTitle,
    property_title_details: null,
    marital_status: 'celibataire' as MaritalStatus,
    spouse_name: null,
    spouse_phone: null,
    children_count: 0,
    agency_id: '',
    photo_url: null,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: '', message: '' });

  const propertyTitleOptions = [
    { value: 'attestation_villageoise' as PropertyTitle, label: 'Attestation villageoise' },
    { value: 'lettre_attribution' as PropertyTitle, label: "Lettre d'attribution" },
    { value: 'permis_habiter' as PropertyTitle, label: "Permis d'habiter" },
    { value: 'acd' as PropertyTitle, label: 'ACD (Arrêté de Concession Définitive)' },
    { value: 'tf' as PropertyTitle, label: 'TF (Titre Foncier)' },
    { value: 'cpf' as PropertyTitle, label: 'CPF (Certificat de Propriété Foncière)' },
    { value: 'autres' as PropertyTitle, label: 'Autres' },
  ];

  const maritalStatusOptions = [
    { value: 'celibataire' as MaritalStatus, label: 'Célibataire' },
    { value: 'marie' as MaritalStatus, label: 'Marié(e)' },
    { value: 'divorce' as MaritalStatus, label: 'Divorcé(e)' },
    { value: 'veuf' as MaritalStatus, label: 'Veuf/Veuve' },
  ];

  const validatePhone = (phone: string) => {
    return validatePhoneCI(phone);
  };

  const validateForm = (data: Partial<Owner>) => {
    if (!data.first_name?.trim()) return 'Le prénom est obligatoire';
    if (!data.last_name?.trim()) return 'Le nom est obligatoire';
    if (!data.phone?.trim()) return 'Le téléphone est obligatoire';
    if (!validatePhone(data.phone)) return 'Format de téléphone invalide. Ex: 0708090102 ou +225XXXXXXXX';
    if (!data.address?.trim()) return "L'adresse est obligatoire";
    if (!data.city?.trim()) return 'La ville est obligatoire';
    if (!data.agency_id) return "L'ID de l'agence est requis";
    if (!data.property_title) return 'Le titre de propriété est obligatoire';
    if (!data.marital_status) return 'La situation matrimoniale est obligatoire';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return "Format d'email invalide";
    }
    if (data.marital_status === 'marie') {
      if (!data.spouse_name?.trim()) return 'Le nom du conjoint est obligatoire';
      if (!data.spouse_phone?.trim()) return 'Le téléphone du conjoint est obligatoire';
      if (!validatePhone(data.spouse_phone)) return 'Format de téléphone du conjoint invalide';
    }
    if (data.children_count! < 0 || data.children_count! > 20) {
      return 'Le nombre d’enfants doit être entre 0 et 20';
    }
    if (data.property_title === 'autres' && !data.property_title_details?.trim()) {
      return 'Veuillez préciser le type de titre de propriété';
    }
    return null;
  };

  const updateFormData = (updates: Partial<Owner>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const initialFormData = useMemo(
    () => ({
      first_name: '',
      last_name: '',
      phone: '',
      email: null,
      address: '',
      city: '',
      property_title: 'attestation_villageoise' as PropertyTitle,
      property_title_details: null,
      marital_status: 'celibataire' as MaritalStatus,
      spouse_name: null,
      spouse_phone: null,
      children_count: 0,
      agency_id: authAgencyId || '',
      photo_url: null,
      ...(initialData || {}),
    }),
    [initialData, authAgencyId]
  );

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setPhotoPreview(initialFormData.photo_url || null);
    } else {
      setPhotoPreview(null);
    }
  }, [isOpen, initialFormData]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authAgencyId) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La photo est trop lourde (max 2Mo)');
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${authAgencyId}/${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('owner-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('owner-photos')
        .getPublicUrl(filePath);

      updateFormData({ photo_url: publicUrl });
      setPhotoPreview(publicUrl);
      toast.success('Photo téléchargée !');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error('Erreur lors de l’envoi de la photo');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    updateFormData({ photo_url: null });
    setPhotoPreview(null);
  };



  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    console.log('🔄 Début soumission formulaire propriétaire');

    const error = validateForm(formData);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setIsSubmitting(true);
      let result: Owner;
      if (formData.id) {
        result = await dbService.owners.update(formData.id, {
          ...formData,
          agency_id: formData.agency_id || authAgencyId || '',
          email: formData.email || null,
          property_title_details: formData.property_title_details || null,
          spouse_name: formData.spouse_name || null,
          spouse_phone: formData.spouse_phone || null,
        });
      } else {
        if (!authAgencyId) {
          throw new Error('Aucune agence associée à l’utilisateur');
        }
        result = await dbService.owners.create({
          ...formData,
          agency_id: authAgencyId,
          email: formData.email || null,
          property_title_details: formData.property_title_details || null,
          spouse_name: formData.spouse_name || null,
          spouse_phone: formData.spouse_phone || null,
        } as Owner);
      }

      setSuccessInfo({
        title: formData.id ? 'Propriétaire mis à jour' : 'Propriétaire créé',
        message: `Le dossier de ${result.first_name} ${result.last_name} (${result.business_id}) a été enregistré avec succès.`
      });
      setShowSuccessModal(true);
      onSuccess?.();
    } catch (error: any) {
      console.error('❌ Erreur soumission propriétaire:', error);
      toast.error(error.message.includes('row-level security')
        ? 'Vous n’avez pas les permissions nécessaires pour effectuer cette action.'
        : error.message || `Erreur lors de la ${formData.id ? 'mise à jour' : 'création'} du propriétaire`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMarried = formData.marital_status === 'marie' || formData.marital_status === 'divorce';

  if (!authAgencyId && !initialData?.agency_id) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Erreur">
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">Vous n’êtes associé à aucune agence. Veuillez contacter un administrateur ou choisir une agence.</p>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={formData.id ? 'Modifier le propriétaire' : 'Ajouter un propriétaire'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <div className="flex items-center mb-4 p-4">
              <User className="h-5 w-5 text-green-600 mr-2" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900">Informations personnelles</h3>
            </div>
            <div className="p-4 pt-0">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center transition-all group-hover:border-green-400">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Aperçu" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-10 w-10 text-gray-300" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-600 border-t-transparent" />
                      </div>
                    )}
                  </div>
                  
                  {photoPreview ? (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors shadow-sm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <label className="absolute -bottom-2 -right-2 p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg cursor-pointer">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Photo d'identité</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Prénom"
                  value={formData.first_name || ''}
                  onChange={(e) => updateFormData({ first_name: e.target.value })}
                  required
                  placeholder="Prénom du propriétaire"
                  aria-required="true"
                />
                <Input
                  label="Nom de famille"
                  value={formData.last_name || ''}
                  onChange={(e) => updateFormData({ last_name: e.target.value })}
                  required
                  placeholder="Nom de famille"
                  aria-required="true"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Téléphone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => updateFormData({ phone: e.target.value })}
                  required
                  placeholder="+225 XX XX XX XX XX"
                  aria-required="true"
                />
                <Input
                  label="Email (Requis pour l'accès Portail en ligne)"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateFormData({ email: e.target.value })}
                  placeholder="Pour se connecter à l'espace"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <div className="flex items-center mb-4 p-4">
              <MapPin className="h-5 w-5 text-blue-600 mr-2" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900">Localisation</h3>
            </div>
            <div className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Adresse"
                  value={formData.address || ''}
                  onChange={(e) => updateFormData({ address: e.target.value })}
                  required
                  placeholder="Adresse complète"
                  aria-required="true"
                />
                <Input
                  label="Ville"
                  value={formData.city || ''}
                  onChange={(e) => updateFormData({ city: e.target.value })}
                  required
                  placeholder="Ville de résidence"
                  aria-required="true"
                />
              </div>
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <div className="flex items-center mb-4 p-4">
              <FileText className="h-5 w-5 text-orange-600 mr-2" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900">Titre de propriété</h3>
            </div>
            <div className="p-4 pt-0 space-y-4">
              <div>
                <label htmlFor="property-title" className="block text-sm font-medium text-gray-700 mb-2">
                  Type de titre de propriété
                </label>
                <select
                  id="property-title"
                  value={formData.property_title || 'attestation_villageoise'}
                  onChange={(e) => updateFormData({ property_title: e.target.value as PropertyTitle })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                  required
                  aria-required="true"
                  aria-label="Type de titre de propriété"
                >
                  {propertyTitleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {formData.property_title === 'autres' && (
                <div>
                  <label htmlFor="property-title-details" className="block text-sm font-medium text-gray-700 mb-2">
                    Précisez le type de titre (optionnel)
                  </label>
                  <textarea
                    id="property-title-details"
                    value={formData.property_title_details || ''}
                    onChange={(e) => updateFormData({ property_title_details: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                    placeholder="Décrivez le type de titre de propriété..."
                    aria-label="Détails du titre de propriété"
                  />
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
            <div className="flex items-center mb-4 p-4">
              <Heart className="h-5 w-5 text-pink-600 mr-2" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900">Situation familiale</h3>
            </div>
            <div className="p-4 pt-0 space-y-4">
              <div>
                <label htmlFor="marital-status" className="block text-sm font-medium text-gray-700 mb-2">
                  Situation matrimoniale
                </label>
                <select
                  id="marital-status"
                  value={formData.marital_status || 'celibataire'}
                  onChange={(e) => updateFormData({ marital_status: e.target.value as MaritalStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                  required
                  aria-required="true"
                  aria-label="Situation matrimoniale"
                >
                  {maritalStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {isMarried && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-pink-50/80 rounded-lg backdrop-blur-sm">
                  <Input
                    label="Nom du conjoint (optionnel)"
                    value={formData.spouse_name || ''}
                    onChange={(e) => updateFormData({ spouse_name: e.target.value })}
                    placeholder="Nom complet du conjoint"
                    aria-required="false"
                  />
                  <Input
                    label="Téléphone du conjoint (optionnel)"
                    type="tel"
                    value={formData.spouse_phone || ''}
                    onChange={(e) => updateFormData({ spouse_phone: e.target.value })}
                    placeholder="+225 XX XX XX XX XX"
                    aria-required="false"
                  />
                </div>
              )}
              <Input
                label="Nombre d'enfants"
                type="number"
                value={formData.children_count ?? 0}
                onChange={(e) => updateFormData({ children_count: parseInt(e.target.value) || 0 })}
                min="0"
                max="20"
                placeholder="0"
                aria-label="Nombre d'enfants"
              />
            </div>
          </Card>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-green-200">
            <Button type="button" variant="ghost" onClick={onClose} aria-label="Annuler">
              Annuler
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting} aria-label="Enregistrer le propriétaire">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          onClose();
        }}
        title={successInfo.title}
        message={successInfo.message}
      />
    </>
  );
};