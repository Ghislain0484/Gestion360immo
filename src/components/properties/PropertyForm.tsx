import React, { useState, useCallback, useEffect } from 'react';
import { MapPin, Upload, Plus, Trash2, Save, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { PropertyFormData, Owner, RoomDetails, PropertyImage, PropertyDetails } from '../../types/db';
import { PropertyStanding } from '../../types/enums';
import { LocationSelector } from './LocationSelector';
import { RoomDetailsForm } from './RoomDetailsForm';
import { ImageUploader } from './ImageUploader';
import { StandingCalculator } from '../../utils/standingCalculator';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface PropertyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (property: PropertyFormData) => Promise<void> | void;
  initialData?: Partial<PropertyFormData>;
  isLoading?: boolean;
}

export const PropertyForm: React.FC<PropertyFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const { user, agencyId, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState<PropertyFormData>({
    owner_id: initialData?.owner_id || '',
    agency_id: initialData?.agency_id || (user?.agency_id ?? ''),
    title: initialData?.title || '',
    description: initialData?.description ?? '',
    location: initialData?.location || {
      commune: '',
      quartier: '',
      numeroLot: '',
      numeroIlot: '',
      facilites: [],
    },
    details: initialData?.details || { type: 'villa' },
    standing: initialData?.standing || 'economique',
    rooms: initialData?.rooms || [],
    images: initialData?.images || [],
    is_available: initialData?.is_available ?? true,
    for_sale: initialData?.for_sale ?? false,
    for_rent: initialData?.for_rent ?? true,
    monthly_rent: initialData?.monthly_rent || 0,
    sale_price: initialData?.sale_price || 0,
  });
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState(1);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<number | null>(null);

  useEffect(() => {
    console.log('🔄 PropertyForm MOUNTED');
    return () => console.log('👋 PropertyForm UNMOUNTED');
  }, []);

  useEffect(() => {
    console.log(`📍 PropertyForm Step Changed: ${currentStep}`);
  }, [currentStep]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: '', message: '' });



  // Update formData.agency_id when agencyId changes
  useEffect(() => {
    if (isOpen && agencyId) {
      setFormData((prev) => {
        if (prev.agency_id === agencyId) return prev;
        return { ...prev, agency_id: agencyId };
      });
    }
  }, [isOpen, agencyId]);

  // Define refetchOwners for fetching owners
  const refetchOwners = useCallback(async () => {
    if (!agencyId) {
      setOwners([]);
      return;
    }

    setOwnersLoading(true);
    setOwnersError(null);

    try {
      const data = await dbService.owners.getAll({ agency_id: agencyId, limit: 1000 });
      setOwners(data);
    } catch (err: any) {
      const errMsg = err.message || 'Erreur lors du chargement des propriétaires';
      setOwnersError(errMsg);
      toast.error(errMsg);
      setOwners([]);
    } finally {
      setOwnersLoading(false);
    }
  }, [agencyId]);

  // Fetch owners when the form is opened and agencyId is available
  useEffect(() => {
    if (isOpen && agencyId) {
      refetchOwners();
    } else {
      setOwners([]);
    }
  }, [isOpen, agencyId, refetchOwners]);

  const faciliteOptions = [
    'École primaire', 'École secondaire', 'Université', 'Hôpital', 'Clinique',
    'Pharmacie', 'Marché', 'Supermarché', 'Transport public', 'Station essence',
    'Banque', 'Restaurant', 'Mosquée', 'Église', 'Parc', 'Terrain de sport'
  ];

  const handleLocationChange = useCallback((newLocation: PropertyFormData['location']) => {
    setFormData((prev) => ({ ...prev, location: newLocation }));
  }, []);

  const handleDetailsChange = useCallback((field: keyof PropertyDetails, value: string) => {
    setFormData((prev) => ({
      ...prev,
      details: { ...prev.details, [field]: value }
    }));
  }, []);

  const handleFaciliteToggle = useCallback((facilite: string) => {
    setFormData((prev) => {
      const currentLocation = prev.location;
      const newFacilites = currentLocation.facilites.includes(facilite)
        ? currentLocation.facilites.filter((f: string) => f !== facilite)
        : [...currentLocation.facilites, facilite];
      return { ...prev, location: { ...currentLocation, facilites: newFacilites } };
    });
  }, []);

  const handleAddRoom = useCallback((room: RoomDetails) => {
    setFormData((prev) => {
      if (editingRoom !== null) {
        const updatedRooms = [...prev.rooms];
        updatedRooms[editingRoom] = room;
        const updated = { ...prev, rooms: updatedRooms };
        updated.standing = StandingCalculator.calculateStanding(updatedRooms) as PropertyStanding;
        return updated;
      } else {
        const updatedRooms = [...prev.rooms, room];
        const updated = { ...prev, rooms: updatedRooms };
        updated.standing = StandingCalculator.calculateStanding(updatedRooms) as PropertyStanding;
        return updated;
      }
    });
    setShowRoomForm(false);
    setEditingRoom(null);
  }, [editingRoom]);

  const handleEditRoom = useCallback((index: number) => {
    setEditingRoom(index);
    setShowRoomForm(true);
  }, []);

  const handleDeleteRoom = useCallback((index: number) => {
    setFormData((prev) => {
      const updatedRooms = prev.rooms.filter((_: RoomDetails, i: number) => i !== index);
      const updated = { ...prev, rooms: updatedRooms };
      updated.standing = StandingCalculator.calculateStanding(updatedRooms) as PropertyStanding;
      return updated;
    });
  }, []);

  const handleImageUpload = useCallback((images: PropertyImage[]) => {
    console.log('🖼️ handleImageUpload appelé avec:', images.length, 'images', images);
    setFormData((prev) => {
      console.log('🖼️ formData.images AVANT:', prev.images.length);
      const updated = { ...prev, images };
      console.log('🖼️ formData.images APRÈS:', updated.images.length);
      return updated;
    });
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(undefined);

    // Validation des champs essentiels uniquement
    if (!formData.title.trim()) {
      setFormError('Veuillez remplir le titre du bien');
      return;
    }
    if (!formData.location.commune.trim()) {
      setFormError('Veuillez remplir la commune');
      return;
    }
    if (!formData.location.quartier.trim()) {
      setFormError('Veuillez remplir le quartier');
      return;
    }
    if (!formData.owner_id.trim()) {
      setFormError('Veuillez sélectionner un propriétaire');
      return;
    }
    if (!formData.agency_id) {
      console.error('❌ Erreur: Agency ID manquant dans le formulaire', formData);
      setFormError('Erreur interne: L\'identifiant de l\'agence est manquant. Veuillez rafraîchir la page.');
      return;
    }
    if (!formData.details.type) {
      setFormError('Veuillez spécifier le type de propriété');
      return;
    }

    // Les pièces sont optionnelles (terrain nu, etc.) — pas de blocage

    // Les détails spécifiques restent optionnels pour permettre une saisie rapide


    try {
      setIsSubmitting(true);
      const submitData: PropertyFormData = {
        ...formData,
        description: formData.description ?? '',
      };

      console.log('🔍 PropertyForm: Données à soumettre:', {
        images: submitData.images,
        nombreImages: submitData.images?.length || 0,
        submitData
      });

      await onSubmit(submitData);

      setSuccessInfo({
        title: 'Propriété enregistrée',
        message: `Le bien "${formData.title}" a été enregistré avec succès.`
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error("❌ Erreur validation/soumission propriété:", error);
      const errMsg = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement';
      setFormError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, onClose]);

  const getStandingColor = useCallback((standing: PropertyStanding): 'warning' | 'info' | 'success' | 'secondary' => {
    switch (standing) {
      case 'economique': return 'warning';
      case 'moyen': return 'info';
      case 'haut': return 'success';
      default: return 'secondary';
    }
  }, []);

  const steps = [
    { id: 1, title: 'Informations générales', icon: MapPin },
    { id: 2, title: 'Détails du bien', icon: Plus },
    { id: 3, title: 'Description des pièces', icon: Upload },
    { id: 4, title: 'Images', icon: Save },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user?.id || !agencyId) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">
        Aucune agence associée. Veuillez vérifier votre profil.
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Ajouter une propriété">
      {formError && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg mb-4" role="alert">
          {formError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${currentStep >= step.id
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 text-gray-500'
                }`}>
                <step.icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
              )}
            </div>
          ))}
        </div>

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-6 pb-4 border-b">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.for_rent}
                  onChange={(e) => setFormData(prev => ({ ...prev, for_rent: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">À louer</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.for_sale}
                  onChange={(e) => setFormData(prev => ({ ...prev, for_sale: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">À vendre</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer ml-auto bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-blue-700">Bien disponible</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="ID du bien"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
                aria-label="ID du bien"
              />
              <Input
                label="Commune"
                value={formData.location.commune}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, location: { ...prev.location, commune: e.target.value } }))}
                required
                aria-label="Commune"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Quartier ou lotissement"
                value={formData.location.quartier}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, location: { ...prev.location, quartier: e.target.value } }))}
                required
                aria-label="Quartier ou lotissement"
              />
              <Input
                label="Numéro du lot (optionnel)"
                value={formData.location.numeroLot || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, location: { ...prev.location, numeroLot: e.target.value } }))}
                aria-label="Numéro du lot"
                placeholder="Ex: Lot 123"
              />
              <Input
                label="Numéro de l'îlot (optionnel)"
                value={formData.location.numeroIlot || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, location: { ...prev.location, numeroIlot: e.target.value } }))}
                aria-label="Numéro de l'îlot"
                placeholder="Ex: Îlot 45"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facilités autour du bien
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {faciliteOptions.map((facilite) => (
                  <label key={facilite} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.location.facilites.includes(facilite)}
                      onChange={() => handleFaciliteToggle(facilite)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Facilité ${facilite}`}
                    />
                    <span className="text-sm text-gray-700">{facilite}</span>
                  </label>
                ))}
              </div>
            </div>
            <LocationSelector
              location={formData.location}
              onChange={handleLocationChange}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Propriétaire du bien *
              </label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <select
                    value={formData.owner_id}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, owner_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={ownersLoading}
                    required
                    aria-label="Sélectionner un propriétaire"
                  >
                    <option value="">Sélectionner un propriétaire</option>
                    {owners.map((owner: Owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.first_name} {owner.last_name} - {owner.phone}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={refetchOwners}
                    disabled={ownersLoading}
                    aria-label="Rafraîchir la liste des propriétaires"
                  >
                    Rafraîchir
                  </Button>
                </div>
                {ownersLoading && (
                  <div className="text-sm text-gray-500">
                    Chargement des propriétaires...
                  </div>
                )}
                {ownersError && (
                  <div className="text-sm text-red-600">
                    Erreur lors du chargement des propriétaires : {ownersError}
                  </div>
                )}
                {!ownersLoading && !ownersError && owners.length === 0 && (
                  <div className="text-sm text-gray-500">
                    Aucun propriétaire disponible
                  </div>
                )}
                {formData.owner_id && (
                  <div className="text-sm text-green-600">
                    ✓ Propriétaire sélectionné
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de propriété *
              </label>
              <select
                value={formData.details.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDetailsChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                aria-label="Type de propriété"
              >
                <option value="">Sélectionner un type</option>
                <option value="villa">Villa</option>
                <option value="appartement">Appartement</option>
                <option value="terrain_nu">Terrain nu</option>
                <option value="immeuble">Immeuble</option>
                <option value="autres">Autres</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.for_rent && (
                <Input
                  label="Loyer mensuel indicatif (FCFA)"
                  type="number"
                  value={formData.monthly_rent}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_rent: parseFloat(e.target.value) || 0 }))}
                  placeholder="Ex: 150000"
                  min="0"
                />
              )}
              {formData.for_sale && (
                <Input
                  label="Prix de vente indicatif (FCFA)"
                  type="number"
                  value={formData.sale_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, sale_price: parseFloat(e.target.value) || 0 }))}
                  placeholder="Ex: 45000000"
                  min="0"
                />
              )}
            </div>
            {formData.details.type === 'villa' && (
              <Input
                label="Numéro ou nom de la villa (optionnel)"
                value={formData.details.numeroNom || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('numeroNom', e.target.value)}
                aria-label="Numéro ou nom de la villa"
                placeholder="Ex: Villa Jasmin ou V123"
              />
            )}
            {formData.details.type === 'appartement' && (
              <Input
                label="Numéro de porte (optionnel)"
                value={formData.details.numeroPorte || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('numeroPorte', e.target.value)}
                aria-label="Numéro de porte"
                placeholder="Ex: Appt 201"
              />
            )}
            {formData.details.type === 'terrain_nu' && (
              <Input
                label="Titre de propriétaire (optionnel)"
                value={formData.details.titreProprietaire || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('titreProprietaire', e.target.value)}
                aria-label="Titre de propriétaire"
                placeholder="Ex: TF 12345"
              />
            )}
            {formData.details.type === 'immeuble' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Numéro d'étage (optionnel)"
                  value={formData.details.numeroEtage || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('numeroEtage', e.target.value)}
                  aria-label="Numéro d'étage"
                  placeholder="Ex: 3ème étage"
                />
                <Input
                  label="Numéro de porte (optionnel)"
                  value={formData.details.numeroPorteImmeuble || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('numeroPorteImmeuble', e.target.value)}
                  aria-label="Numéro de porte de l'immeuble"
                  placeholder="Ex: Porte 302"
                />
              </div>
            )}
            {formData.details.type === 'autres' && (
              <Input
                label="Détails supplémentaires (optionnel)"
                value={formData.details.autresDetails || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('autresDetails', e.target.value)}
                aria-label="Détails supplémentaires"
                placeholder="Décrivez le type de bien"
              />
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description générale (optionnel)
              </label>
              <textarea
                value={formData.description ?? ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ajoutez une description détaillée du bien (vous pourrez la compléter plus tard)..."
                aria-label="Description générale"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Standing calculé automatiquement</h4>
                <p className="text-sm text-gray-500">Basé sur les détails des pièces</p>
              </div>
              <Badge variant={getStandingColor(formData.standing)} size="md">
                {formData.standing.charAt(0).toUpperCase() + formData.standing.slice(1)}
              </Badge>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            {formData.details.type === 'terrain_nu' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                💡 Pour un terrain nu, l'ajout de pièces est optionnel. Vous pouvez passer directement à l'étape Images.
              </div>
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Description des pièces</h3>
              <Button
                type="button"
                onClick={() => setShowRoomForm(true)}
                className="flex items-center space-x-2"
                aria-label="Ajouter une pièce"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter une pièce</span>
              </Button>
            </div>
            {formData.rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune pièce ajoutée</p>
                <p className="text-sm">Cliquez sur "Ajouter une pièce" pour commencer</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.rooms.map((room: RoomDetails, index: number) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {room.nom || room.type?.replace('_', ' ')}
                      </h4>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRoom(index)}
                          aria-label={`Modifier ${room.nom || room.type}`}
                        >
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRoom(index)}
                          className="text-red-600 hover:text-red-700"
                          aria-label={`Supprimer ${room.nom || room.type}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {room.superficie && <p>Superficie: {room.superficie} m²</p>}
                      {room.plafond?.type && <p>Plafond: {room.plafond.type.replace('_', ' ')}</p>}
                      {room.sol?.type && <p>Sol: {room.sol.type}</p>}
                      {room.menuiserie?.materiau && <p>Menuiserie: {room.menuiserie.materiau}</p>}
                      {room.serrure?.typePoignee && <p>Poignée: {room.serrure.typePoignee}</p>}
                      {room.serrure?.typeCle && <p>Clé: {room.serrure.typeCle}</p>}
                      {room.images && <p>Images: {room.images.length}</p>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            {formData.images.length === 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg mb-4">
                <div className="flex items-center">
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      📸 Ajoutez des photos de votre bien
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Cliquez sur "Téléverser des images" ci-dessous pour ajouter des photos. Les images seront automatiquement sauvegardées avec le bien.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {formData.images.length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg mb-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      ✅ {formData.images.length} image{formData.images.length > 1 ? 's' : ''} prête{formData.images.length > 1 ? 's' : ''} à être sauvegardée{formData.images.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Cliquez sur "Enregistrer" pour sauvegarder le bien avec les images.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <ImageUploader
              images={formData.images}
              onImagesChange={handleImageUpload}
              rooms={formData.rooms}
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { setFormError(undefined); setCurrentStep(currentStep - 1); }}
                aria-label="Étape précédente"
              >
                Précédent
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              aria-label="Annuler"
            >
              Annuler
            </Button>
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={() => { setFormError(undefined); setCurrentStep(currentStep + 1); }}
                aria-label="Étape suivante"
              >
                Suivant
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting || isLoading || showSuccessModal} aria-label="Enregistrer la propriété">
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enregistrement...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer{formData.images.length > 0 ? ` avec ${formData.images.length} image${formData.images.length > 1 ? 's' : ''}` : ''}
                  </div>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      <RoomDetailsForm
        isOpen={showRoomForm}
        onClose={() => {
          setShowRoomForm(false);
          setEditingRoom(null);
        }}
        onSubmit={handleAddRoom}
        initialData={editingRoom !== null ? formData.rooms[editingRoom] : undefined}
      />

      {/* Modal de succès personnalisé */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-4">
                <Save className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {successInfo.title}
                </h3>
              </div>
            </div>
            <p className="text-gray-700 dark:text-slate-300 mb-6">{successInfo.message}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCurrentStep(4);
                }}
                className="flex-1"
              >
                Ajouter des images
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
                className="flex-1"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};