import React, { useState, useCallback } from 'react';
import { Save, User, MapPin, Phone, FileText, Heart, Camera, Upload, Key, Calendar, DollarSign } from 'lucide-react';
import AsyncSelect from 'react-select/async';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { TenantFormData, Property } from '../../types/db';
import { supabase } from '../../lib/config';
import { dbService } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { validatePhoneCI, validateEmail } from '../../utils/validationUtils';

interface RentalParams {
  propertyId: string;
  monthlyRent: number;
  deposit: number;
  startDate: string;
}

interface TenantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenant: TenantFormData, rentalParams?: RentalParams | null, property?: Property | null) => Promise<void>;
  initialData?: Partial<TenantFormData>;
  preSelectedPropertyId?: string;
  isLoading?: boolean;
}

export const TenantForm: React.FC<TenantFormProps> = ({ isOpen, onClose, onSubmit, initialData, preSelectedPropertyId, isLoading = false }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Sync state with initialData when it changes or form opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
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
      // Reset rental wizard state
      setAssignProperty(false);
      setSelectedProperty(null);
      setRentalTerms({
        monthlyRent: 0,
        deposit: 0,
        agencyFee: 0,
        startDate: new Date().toISOString().split('T')[0]
      });
      setFormError(null);

      // Handle pre-selected property
      if (preSelectedPropertyId) {
        setAssignProperty(true);
        dbService.properties.getById(preSelectedPropertyId).then(prop => {
          if (prop) {
            setSelectedProperty(prop);
          }
        }).catch(err => {
          console.error("Error fetching pre-selected property:", err);
        });
      }
    }
  }, [isOpen, initialData, user?.agency_id, preSelectedPropertyId]);

  // Rental Wizard State
  const [assignProperty, setAssignProperty] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [rentalTerms, setRentalTerms] = useState({
    monthlyRent: 0,
    deposit: 0,
    agencyFee: 0,
    startDate: new Date().toISOString().split('T')[0]
  });

  const loadPropertyOptions = useCallback(async (inputValue: string) => {
    if (!user?.agency_id) return [];
    try {
      const properties = await dbService.properties.getAll({
        agency_id: user.agency_id,
        search: inputValue,
        limit: 10
      });
      // Filter only available properties
      return properties.filter(p => p.is_available);
    } catch {
      return [];
    }
  }, [user?.agency_id]);

  const handlePropertySelect = (property: Property | null) => {
    setSelectedProperty(property);
    if (property) {
      // Auto-fill rent from property if available
      const rent = property.monthly_rent || 0;
      setRentalTerms(prev => ({
        ...prev,
        monthlyRent: rent,
        deposit: rent * 2, // Default deposit (2 months)
        agencyFee: rent * 1 // Default agency fee (1 month)
      }));
    }
  };

  const updateFormData = useCallback((updates: Partial<TenantFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleFileUpload = useCallback(async (file: File, type: 'photo' | 'idCard') => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `${user?.agency_id}/${fileName}`;

      const { error } = await supabase.storage
        .from('tenant-documents')
        .upload(filePath, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from('tenant-documents')
        .getPublicUrl(filePath);

      if (type === 'photo') {
        updateFormData({ photo_url: data.publicUrl });
      } else {
        updateFormData({ id_card_url: data.publicUrl });
      }
    } catch (error) {
      setFormError('Erreur lors du téléchargement du fichier');
      toast.error('Erreur lors du téléchargement du fichier');
    }
  }, [user?.agency_id, updateFormData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    // Validation des champs essentiels
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.phone.trim()) {
      setFormError('Veuillez remplir le prénom, nom et téléphone');
      return;
    }

    if (!formData.address.trim() || !formData.city.trim()) {
      setFormError('Veuillez remplir l\'adresse et la ville');
      return;
    }

    // Validation téléphone permissive
    if (!validatePhoneCI(formData.phone)) {
      setFormError('Format de téléphone invalide. Ex: 0708090102 ou +225XXXXXXXX');
      return;
    }

    if (assignProperty) {
      if (!selectedProperty) {
        setFormError('Veuillez sélectionner un bien immobilier');
        return;
      }
      if (rentalTerms.monthlyRent <= 0) {
        setFormError('Le loyer doit être supérieur à 0');
        return;
      }
    }

    // Validation email optionnelle
    if (formData.email && !validateEmail(formData.email)) {
      setFormError('Format d\'email invalide');
      return;
    }

    // Les champs conjoint sont maintenant optionnels même si marié

    try {
      // Profession plus obligatoire pour plus de souplesse
      if (!formData.profession || formData.profession.trim() === '') {
        // Optionnel: on pourrait juste logger un warning ou laisser passer
      }

      const rentalData = assignProperty && selectedProperty ? {
        propertyId: selectedProperty.id,
        monthlyRent: rentalTerms.monthlyRent,
        deposit: rentalTerms.deposit,
        agencyFee: rentalTerms.agencyFee,
        startDate: rentalTerms.startDate
      } : null;

      await onSubmit(formData, rentalData, selectedProperty);
      onClose();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement';
      setFormError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, onClose, assignProperty, selectedProperty, rentalTerms]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user?.agency_id) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        Aucune agence associée. Veuillez vérifier votre profil.
      </div>
    );
  }

  const isMarried = formData.marital_status === 'marie';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Ajouter un locataire">
      {formError && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg mb-4" role="alert">
          {formError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
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
              label="Profession (optionnelle)"
              value={formData.profession}
              onChange={(e) => updateFormData({ profession: e.target.value })}
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
                  label="Nom du conjoint (optionnel)"
                  value={formData.spouse_name || ''}
                  onChange={(e) => updateFormData({ spouse_name: e.target.value })}
                  placeholder="Nom complet du conjoint"
                />
                <Input
                  label="Téléphone du conjoint (optionnel)"
                  type="tel"
                  value={formData.spouse_phone || ''}
                  onChange={(e) => updateFormData({ spouse_phone: e.target.value })}
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

        <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
          <div className="flex items-center mb-4">
            <FileText className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Documents d'identité</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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



        {/* --- Rental Wizard Section --- */}
        <Card className={`transition-all duration-300 ${assignProperty ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
          <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setAssignProperty(!assignProperty)}>
            <div className="flex items-center">
              <Key className={`h-5 w-5 mr-2 ${assignProperty ? 'text-blue-600' : 'text-gray-500'}`} />
              <h3 className={`text-lg font-medium ${assignProperty ? 'text-blue-900' : 'text-gray-600'}`}>
                Attribution d'un bien (Optionnel)
              </h3>
            </div>
            <div className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${assignProperty ? 'bg-blue-600' : ''}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${assignProperty ? 'translate-x-6' : ''}`}></div>
            </div>
          </div>

          {assignProperty && (
            <div className="space-y-6 animate-fade-in-down">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner un bien disponible</label>
                <AsyncSelect<Property>
                  cacheOptions
                  defaultOptions
                  loadOptions={loadPropertyOptions}
                  getOptionLabel={(p) => `${p.title} - ${p.location.commune} (${p.details?.type})`}
                  getOptionValue={(p) => p.id}
                  onChange={handlePropertySelect}
                  value={selectedProperty}
                  placeholder="Rechercher un bien..."
                  className="mb-4"
                  styles={{
                    control: (base) => ({ ...base, borderColor: '#e2e8f0', borderRadius: '0.5rem' }),
                    option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white', color: state.isSelected ? 'white' : '#1e293b' }),
                  }}
                />
              </div>

              {selectedProperty && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Loyer Mensuel (FCFA)"
                      type="number"
                      value={rentalTerms.monthlyRent}
                      onChange={(e) => {
                        const rent = parseFloat(e.target.value) || 0;
                        setRentalTerms(prev => ({
                          ...prev,
                          monthlyRent: rent,
                          deposit: rent * 2, // Auto-update deposit based on 2 months rule
                          agencyFee: rent * 1 // Auto-update agency fee based on 1 month rule
                        }));
                      }}
                      min="0"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date d'entrée</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="date"
                          value={rentalTerms.startDate}
                          onChange={(e) => setRentalTerms({ ...rentalTerms, startDate: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown (2+2+1 Rule) */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                      Détails à payer à la signature (Règle 2+2+1)
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avance Loyer (2 mois) :</span>
                        <span className="font-medium">{(rentalTerms.monthlyRent * 2).toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Caution (2 mois) :</span>
                        <span className="font-medium">{rentalTerms.deposit.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Frais d'agence (1 mois) :</span>
                        <span className="font-medium">{(rentalTerms.monthlyRent * 1).toLocaleString()} FCFA</span>
                      </div>
                      <div className="border-t border-gray-300 my-2 pt-2 flex justify-between text-base font-bold text-gray-900">
                        <span>Total à payer :</span>
                        <span>{(rentalTerms.monthlyRent * 5).toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-green-200">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting || isLoading}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
  );
};