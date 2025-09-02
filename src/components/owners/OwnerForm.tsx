import React, { useState, useEffect } from 'react';
import { Save, User, MapPin, FileText, Heart } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Owner } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { dbService, supabase } from '../../lib/supabase';

interface OwnerFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Owner | null | undefined;
}

export const OwnerForm: React.FC<OwnerFormProps> = ({
  isOpen,
  onClose,
  initialData,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<Owner>>({
    first_name: '',
    last_name: '',
    phone: '',
    email: null,
    address: '',
    city: '',
    property_title: 'attestation_villageoise',
    property_title_details: null,
    marital_status: 'celibataire',
    spouse_name: null,
    spouse_phone: null,
    children_count: 0,
    agency_id: '',
  });
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [isLoadingAgency, setIsLoadingAgency] = useState(false);

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

  const getPropertyTitleLabel = (title: string) => {
    const labels: Record<Owner['property_title'], string> = {
      attestation_villageoise: 'Attestation villageoise',
      lettre_attribution: "Lettre d'attribution",
      permis_habiter: "Permis d'habiter",
      acd: 'ACD',
      tf: 'TF',
      cpf: 'CPF',
      autres: 'Autres',
    };
    return labels[title as Owner['property_title']] || title;
  };

  const updateFormData = (updates: Partial<Owner>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Fetch agency_id for the authenticated user
  useEffect(() => {
    const fetchAgencyId = async () => {
      if (!user?.id) {
        setAgencyId(null);
        return;
      }

      setIsLoadingAgency(true);
      try {
        const { data, error } = await supabase
          .from('agency_users')
          .select('agency_id')
          .eq('user_id', user.id)
          .single();

        if (error) {
          throw new Error('Erreur lors de la récupération de l’agence: ' + error.message);
        }

        setAgencyId(data?.agency_id || null);
      } catch (err: any) {
        console.error('Erreur récupération agency_id:', err);
        toast.error('Impossible de récupérer les informations de l’agence.');
        setAgencyId(null);
      } finally {
        setIsLoadingAgency(false);
      }
    };

    fetchAgencyId();
  }, [user?.id]);

  // Update formData when modal opens or initialData/agencyId changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        email: null,
        address: '',
        city: '',
        property_title: 'attestation_villageoise',
        property_title_details: null,
        marital_status: 'celibataire',
        spouse_name: null,
        spouse_phone: null,
        children_count: 0,
        agency_id: agencyId || '',
        ...(initialData || {}),
      });
    }
  }, [isOpen, initialData, agencyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔄 Début soumission formulaire propriétaire');

    if (!formData.first_name?.trim()) {
      toast.error('Le prénom est obligatoire');
      return;
    }

    if (!formData.last_name?.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    if (!formData.phone?.trim()) {
      toast.error('Le téléphone est obligatoire');
      return;
    }

    if (!formData.address?.trim()) {
      toast.error("L'adresse est obligatoire");
      return;
    }

    if (!formData.city?.trim()) {
      toast.error('La ville est obligatoire');
      return;
    }

    if (!formData.agency_id && !agencyId) {
      toast.error("L'ID de l'agence est requis");
      return;
    }

    if (!formData.property_title) {
      toast.error('Le titre de propriété est obligatoire');
      return;
    }

    if (!formData.marital_status) {
      toast.error('La situation matrimoniale est obligatoire');
      return;
    }

    const phoneRegex = /^(\+225)?[0-9\s-]{8,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Format de téléphone invalide. Exemple: +225 01 02 03 04 05');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Format d'email invalide");
      return;
    }

    if (formData.marital_status === 'marie') {
      if (!formData.spouse_name?.trim()) {
        toast.error('Le nom du conjoint est obligatoire pour une personne mariée');
        return;
      }
      if (!formData.spouse_phone?.trim()) {
        toast.error('Le téléphone du conjoint est obligatoire pour une personne mariée');
        return;
      }
      if (!phoneRegex.test(formData.spouse_phone)) {
        toast.error('Format de téléphone du conjoint invalide');
        return;
      }
    }

    if (formData.children_count! < 0 || formData.children_count! > 20) {
      toast.error('Le nombre d’enfants doit être entre 0 et 20');
      return;
    }

    if (formData.property_title === 'autres' && !formData.property_title_details?.trim()) {
      toast.error('Veuillez préciser le type de titre de propriété');
      return;
    }

    console.log('🔄 Soumission des données:', {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone,
      email: formData.email,
      city: formData.city,
      property_title: formData.property_title,
      marital_status: formData.marital_status,
      agency_id: formData.agency_id || agencyId,
    });

    try {
      let result: Owner;
      if (formData.id) {
        result = await dbService.owners.update(formData.id, {
          ...formData,
          agency_id: formData.agency_id || agencyId || '',
          email: formData.email || null,
          property_title_details: formData.property_title_details || null,
          spouse_name: formData.spouse_name || null,
          spouse_phone: formData.spouse_phone || null,
        });
      } else {
        if (!agencyId) {
          throw new Error('Aucune agence associée à l’utilisateur');
        }
        result = await dbService.owners.create({
          ...formData,
          agency_id: agencyId,
          email: formData.email || null,
          property_title_details: formData.property_title_details || null,
          spouse_name: formData.spouse_name || null,
          spouse_phone: formData.spouse_phone || null,
        });
      }

      toast.success(
        `✅ Propriétaire ${formData.id ? 'mis à jour' : 'créé'} avec succès !\n` +
          `👤 ${result.first_name} ${result.last_name}\n` +
          `📱 ${result.phone}\n` +
          `🏠 ${result.city}\n` +
          `📋 Titre: ${getPropertyTitleLabel(result.property_title)}`
      );
      onClose();
    } catch (error: any) {
      console.error('❌ Erreur soumission propriétaire:', error);
      if (error.message.includes('row-level security')) {
        toast.error('Vous n’avez pas les permissions nécessaires pour effectuer cette action.');
      } else {
        toast.error(error.message || `Erreur lors de la ${formData.id ? 'mise à jour' : 'création'} du propriétaire`);
      }
    }
  };

  const isMarried = formData.marital_status === 'marie';

  if (isLoadingAgency) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Chargement...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    );
  }

  if (!agencyId && !initialData?.agency_id) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Erreur">
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">Vous n’êtes associé à aucune agence. Veuillez contacter un administrateur.</p>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={formData.id ? 'Modifier le propriétaire' : 'Ajouter un propriétaire'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-white/80 backdrop-blur-sm border-green-200">
          <div className="flex items-center mb-4 p-4">
            <User className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Informations personnelles</h3>
          </div>
          <div className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                value={formData.first_name || ''}
                onChange={(e) => updateFormData({ first_name: e.target.value })}
                required
                placeholder="Prénom du propriétaire"
              />
              <Input
                label="Nom de famille"
                value={formData.last_name || ''}
                onChange={(e) => updateFormData({ last_name: e.target.value })}
                required
                placeholder="Nom de famille"
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
              />
              <Input
                label="Email (optionnel)"
                type="email"
                value={formData.email || ''}
                onChange={(e) => updateFormData({ email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>
          </div>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
          <div className="flex items-center mb-4 p-4">
            <MapPin className="h-5 w-5 text-blue-600 mr-2" />
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
              />
              <Input
                label="Ville"
                value={formData.city || ''}
                onChange={(e) => updateFormData({ city: e.target.value })}
                required
                placeholder="Ville de résidence"
              />
            </div>
          </div>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
          <div className="flex items-center mb-4 p-4">
            <FileText className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Titre de propriété</h3>
          </div>
          <div className="p-4 pt-0 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de titre de propriété
              </label>
              <select
                value={formData.property_title || 'attestation_villageoise'}
                onChange={(e) =>
                  updateFormData({ property_title: e.target.value as Owner['property_title'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                required
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Précisez le type de titre
                </label>
                <textarea
                  value={formData.property_title_details || ''}
                  onChange={(e) => updateFormData({ property_title_details: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                  placeholder="Décrivez le type de titre de propriété..."
                  required
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
          <div className="flex items-center mb-4 p-4">
            <Heart className="h-5 w-5 text-pink-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Situation familiale</h3>
          </div>
          <div className="p-4 pt-0 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Situation matrimoniale
              </label>
              <select
                value={formData.marital_status || 'celibataire'}
                onChange={(e) =>
                  updateFormData({ marital_status: e.target.value as Owner['marital_status'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90"
                required
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
              value={formData.children_count ?? 0}
              onChange={(e) => updateFormData({ children_count: parseInt(e.target.value) || 0 })}
              min="0"
              max="20"
              placeholder="0"
            />
          </div>
        </Card>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-green-200">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
};