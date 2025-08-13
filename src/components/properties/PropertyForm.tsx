import React, { useState, useCallback } from 'react';
import { MapPin, Upload, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { PropertyFormData, RoomDetails, PropertyImage } from '../../types/property';
import { LocationSelector } from './LocationSelector';
import { RoomDetailsForm } from './RoomDetailsForm';
import { ImageUploader } from './ImageUploader';
import { StandingCalculator } from '../../utils/standingCalculator';
import { AgencyIdGenerator } from '../../utils/idGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';

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
  const { user } = useAuth();
  const [formData, setFormData] = useState<PropertyFormData>({
    ownerId: initialData?.ownerId || '',
    agencyId: '1', // Mock agency ID
    title: '',
    description: '',
    location: {
      commune: '',
      quartier: '',
      numeroLot: '',
      numeroIlot: '',
      facilites: [],
    },
    details: {
      type: 'villa',
    },
    standing: 'economique',
    rooms: [],
    images: [],
    isAvailable: true,
    forSale: false,
    forRent: true,
    ...initialData,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<number | null>(null);
  const [ownerSearch, setOwnerSearch] = useState('');

  // Load owners for selection
  const { data: owners } = useSupabaseData(dbService.getOwners);

  const filteredOwners = owners.filter(owner =>
    `${owner.first_name} ${owner.last_name}`.toLowerCase().includes(ownerSearch.toLowerCase()) ||
    owner.phone.includes(ownerSearch)
  );

  const faciliteOptions = [
    'École primaire', 'École secondaire', 'Université', 'Hôpital', 'Clinique',
    'Pharmacie', 'Marché', 'Supermarché', 'Transport public', 'Station essence',
    'Banque', 'Restaurant', 'Mosquée', 'Église', 'Parc', 'Terrain de sport'
  ];

  const updateFormData = useCallback((updates: Partial<PropertyFormData>) => {
    setFormData(prev => {
      const updated = { ...prev, ...updates };
      // Recalculate standing when rooms change
      if (updates.rooms) {
        updated.standing = StandingCalculator.calculateStanding(updated.rooms);
      }
      return updated;
    });
  }, []);

  const handleLocationChange = (location: PropertyFormData['location']) => {
    updateFormData({ location });
  };

  const handleDetailsChange = (field: string, value: any) => {
    updateFormData({
      details: { ...formData.details, [field]: value }
    });
  };

  const handleFaciliteToggle = (facilite: string) => {
    const facilites = formData.location.facilites.includes(facilite)
      ? formData.location.facilites.filter(f => f !== facilite)
      : [...formData.location.facilites, facilite];
    
    handleLocationChange({ ...formData.location, facilites });
  };

  const handleAddRoom = (room: RoomDetails) => {
    if (editingRoom !== null) {
      const updatedRooms = [...formData.rooms];
      updatedRooms[editingRoom] = room;
      updateFormData({ rooms: updatedRooms });
      setEditingRoom(null);
    } else {
      updateFormData({ rooms: [...formData.rooms, room] });
    }
    setShowRoomForm(false);
  };

  const handleEditRoom = (index: number) => {
    setEditingRoom(index);
    setShowRoomForm(true);
  };

  const handleDeleteRoom = (index: number) => {
    const updatedRooms = formData.rooms.filter((_, i) => i !== index);
    updateFormData({ rooms: updatedRooms });
  };

  const handleImageUpload = (images: PropertyImage[]) => {
    updateFormData({ images });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des données requises
    if (!formData.title.trim() || !formData.location.commune.trim() || !formData.location.quartier.trim()) {
      alert('Veuillez remplir tous les champs obligatoires (titre, commune, quartier)');
      return;
    }
    
    // Validation du propriétaire
    if (!formData.ownerId.trim()) {
      alert('Veuillez sélectionner un propriétaire');
      return;
    }
    
    // Validation des pièces
    if (formData.rooms.length === 0) {
      alert('Veuillez ajouter au moins une pièce');
      return;
    }
    
    try {
      onSubmit(formData);
      
      // Generate unique ID for the property
      if (user?.agencyId) {
        const propertyId = AgencyIdGenerator.generatePropertyId(user.agencyId, 'Agence');
        console.log('Generated Property ID:', propertyId);
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
    }
  };

  const getStandingColor = (standing: string) => {
    switch (standing) {
      case 'economique': return 'warning';
      case 'moyen': return 'info';
      case 'haut': return 'success';
      default: return 'secondary';
    }
  };

  const steps = [
    { id: 1, title: 'Informations générales', icon: MapPin },
    { id: 2, title: 'Détails du bien', icon: Plus },
    { id: 3, title: 'Description des pièces', icon: Upload },
    { id: 4, title: 'Images', icon: Save },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Ajouter une propriété">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.id 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                <step.icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: General Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Titre de la propriété"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                required
              />
              <Input
                label="Commune"
                value={formData.location.commune}
                onChange={(e) => handleLocationChange({ ...formData.location, commune: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Quartier ou lotissement"
                value={formData.location.quartier}
                onChange={(e) => handleLocationChange({ ...formData.location, quartier: e.target.value })}
                required
              />
              <Input
                label="Numéro du lot"
                value={formData.location.numeroLot || ''}
                onChange={(e) => handleLocationChange({ ...formData.location, numeroLot: e.target.value })}
              />
              <Input
                label="Numéro de l'îlot"
                value={formData.location.numeroIlot || ''}
                onChange={(e) => handleLocationChange({ ...formData.location, numeroIlot: e.target.value })}
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

        {/* Step 2: Property Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de bien
              </label>
              <select
                value={formData.details.type}
                onChange={(e) => handleDetailsChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="villa">Villa</option>
                <option value="appartement">Appartement</option>
                <option value="terrain_nu">Terrain nu</option>
                <option value="immeuble">Immeuble</option>
                <option value="autres">Autres</option>
              </select>
            </div>

            {/* Conditional fields based on property type */}
            {formData.details.type === 'villa' && (
              <Input
                label="Numéro ou nom de la villa"
                value={formData.details.numeroNom || ''}
                onChange={(e) => handleDetailsChange('numeroNom', e.target.value)}
              />
            )}

            {formData.details.type === 'appartement' && (
              <Input
                label="Numéro de porte de l'appartement"
                value={formData.details.numeroPorte || ''}
                onChange={(e) => handleDetailsChange('numeroPorte', e.target.value)}
              />
            )}

            {formData.details.type === 'terrain_nu' && (
              <Input
                label="Titre de propriété du bien"
                value={formData.details.titreProprietaire || ''}
                onChange={(e) => handleDetailsChange('titreProprietaire', e.target.value)}
              />
            )}

            {formData.details.type === 'immeuble' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Numéro de l'étage"
                  value={formData.details.numeroEtage || ''}
                  onChange={(e) => handleDetailsChange('numeroEtage', e.target.value)}
                />
                <Input
                  label="Numéro de porte"
                  value={formData.details.numeroPorteImmeuble || ''}
                  onChange={(e) => handleDetailsChange('numeroPorteImmeuble', e.target.value)}
                />
              </div>
            )}

            {formData.details.type === 'autres' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plus de détails
                </label>
                <textarea
                  value={formData.details.autresDetails || ''}
                  onChange={(e) => handleDetailsChange('autresDetails', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Décrivez le type de bien..."
                />
              </div>
            )}

            <div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Propriétaire du bien *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Rechercher un propriétaire par nom ou téléphone..."
                    value={ownerSearch}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {ownerSearch && (
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md">
                      {filteredOwners.length > 0 ? (
                        filteredOwners.map((owner) => (
                          <button
                            key={owner.id}
                            type="button"
                            onClick={() => {
                              updateFormData({ ownerId: owner.id });
                              setOwnerSearch(`${owner.first_name} ${owner.last_name} - ${owner.phone}`);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                          >
                            <div className="font-medium">{owner.first_name} {owner.last_name}</div>
                            <div className="text-sm text-gray-500">{owner.phone} - {owner.city}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          Aucun propriétaire trouvé
                        </div>
                      )}
                    </div>
                  )}
                  {formData.ownerId && (
                    <div className="text-sm text-green-600">
                      ✓ Propriétaire sélectionné
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description générale
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description détaillée du bien..."
                />
              </div>
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

        {/* Step 3: Room Details */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Description des pièces</h3>
              <Button
                type="button"
                onClick={() => setShowRoomForm(true)}
                className="flex items-center space-x-2"
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
                {formData.rooms.map((room, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {room.nom || room.type.replace('_', ' ')}
                      </h4>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRoom(index)}
                        >
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRoom(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {room.superficie && <p>Superficie: {room.superficie} m²</p>}
                      <p>Plafond: {room.plafond.type.replace('_', ' ')}</p>
                      <p>Sol: {room.sol.type}</p>
                      <p>Menuiserie: {room.menuiserie.materiau}</p>
                      <p>Images: {room.images.length}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Images */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <ImageUploader
              images={formData.images}
              onImagesChange={handleImageUpload}
              rooms={formData.rooms}
            />
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
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
            >
              Annuler
            </Button>
            
            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
              >
                Suivant
              </Button>
            ) : (
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Room Form Modal */}
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