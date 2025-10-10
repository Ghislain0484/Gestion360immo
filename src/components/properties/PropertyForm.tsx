import React, { useState, useCallback, useEffect } from 'react';
import { MapPin, Upload, Plus, Trash2, Save } from 'lucide-react';
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
import { supabase } from '../../lib/config';
import { toast } from 'react-hot-toast';

interface PropertyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (property: PropertyFormData) => void;
  initialData?: Partial<PropertyFormData>;
}

export const PropertyForm: React.FC<PropertyFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [isLoadingAgency, setIsLoadingAgency] = useState(false);
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
  });
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState(1);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<number | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState<string | null>(null);

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

  // Update formData.agency_id when agencyId changes
  useEffect(() => {
    if (isOpen && agencyId) {
      setFormData((prev) => ({ ...prev, agency_id: agencyId }));
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
      const data = await dbService.owners.getAll({ agency_id: agencyId });
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
    setFormData((prev) => ({ ...prev, images }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(undefined);

    if (!formData.title.trim()) {
      setFormError('Veuillez remplir le titre');
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
      setFormError('L\'ID de l\'agence est requis');
      return;
    }
    if (formData.rooms.length === 0) {
      setFormError('Veuillez ajouter au moins une pièce');
      return;
    }
    if (!formData.details.type) {
      setFormError('Veuillez spécifier le type de propriété');
      return;
    }
    if (formData.details.type === 'villa' && !formData.details.numeroNom?.trim()) {
      setFormError('Veuillez spécifier le numéro ou nom pour la villa');
      return;
    }
    if (formData.details.type === 'appartement' && !formData.details.numeroPorte?.trim()) {
      setFormError('Veuillez spécifier le numéro de porte pour l\'appartement');
      return;
    }
    if (formData.details.type === 'terrain_nu' && !formData.details.titreProprietaire?.trim()) {
      setFormError('Veuillez spécifier le titre de propriétaire pour le terrain nu');
      return;
    }
    if (formData.details.type === 'immeuble' && (!formData.details.numeroEtage?.trim() || !formData.details.numeroPorteImmeuble?.trim())) {
      setFormError('Veuillez spécifier le numéro d\'étage et le numéro de porte pour l\'immeuble');
      return;
    }
    if (formData.details.type === 'autres' && !formData.details.autresDetails?.trim()) {
      setFormError('Veuillez spécifier les détails pour le type "autres"');
      return;
    }

    try {
      const submitData: PropertyFormData = {
        ...formData,
        description: formData.description ?? '',
      };
      onSubmit(submitData);
      toast.success(`Propriété créée avec succès : ${formData.title}`);
      onClose();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement';
      setFormError(errMsg);
      toast.error(errMsg);
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

  if (authLoading || isLoadingAgency) {
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
                label="Numéro du lot"
                value={formData.location.numeroLot || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, location: { ...prev.location, numeroLot: e.target.value } }))}
                aria-label="Numéro du lot"
              />
              <Input
                label="Numéro de l'îlot"
                value={formData.location.numeroIlot || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, location: { ...prev.location, numeroIlot: e.target.value } }))}
                aria-label="Numéro de l'îlot"
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
            {formData.details.type === 'villa' && (
              <Input
                label="Numéro ou nom de la villa *"
                value={formData.details.numeroNom || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('numeroNom', e.target.value)}
                required
                aria-label="Numéro ou nom de la villa"
              />
            )}
            {formData.details.type === 'appartement' && (
              <Input
                label="Numéro de porte *"
                value={formData.details.numeroPorte || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('numeroPorte', e.target.value)}
                required
                aria-label="Numéro de porte"
              />
            )}
            {formData.details.type === 'terrain_nu' && (
              <Input
                label="Titre de propriétaire *"
                value={formData.details.titreProprietaire || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('titreProprietaire', e.target.value)}
                required
                aria-label="Titre de propriétaire"
              />
            )}
            {formData.details.type === 'immeuble' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Numéro d'étage *"
                  value={formData.details.numeroEtage || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('numeroEtage', e.target.value)}
                  required
                  aria-label="Numéro d'étage"
                />
                <Input
                  label="Numéro de porte de l'immeuble *"
                  value={formData.details.numeroPorteImmeuble || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('numeroPorteImmeuble', e.target.value)}
                  required
                  aria-label="Numéro de porte de l'immeuble"
                />
              </div>
            )}
            {formData.details.type === 'autres' && (
              <Input
                label="Détails supplémentaires *"
                value={formData.details.autresDetails || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDetailsChange('autresDetails', e.target.value)}
                required
                aria-label="Détails supplémentaires"
              />
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description générale
              </label>
              <textarea
                value={formData.description ?? ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description détaillée du bien..."
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
                onClick={() => setCurrentStep(currentStep - 1)}
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
                onClick={() => setCurrentStep(currentStep + 1)}
                aria-label="Étape suivante"
              >
                Suivant
              </Button>
            ) : (
              <Button type="submit" aria-label="Enregistrer la propriété">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
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
    </Modal>
  );
};