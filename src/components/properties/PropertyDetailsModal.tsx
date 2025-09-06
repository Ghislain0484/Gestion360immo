import React, { useState } from 'react';
import { Edit, MapPin } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Property, PropertyFormData } from '../../types/db'; // Updated import
import { PropertyForm } from './PropertyForm';

interface PropertyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
  onUpdate: (property: Property) => void;
}

export const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  isOpen,
  onClose,
  property,
  onUpdate
}) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!property) return null;

  const getStandingColor = (standing: string) => {
    switch (standing) {
      case 'economique': return 'warning';
      case 'moyen': return 'info';
      case 'haut': return 'success';
      default: return 'secondary';
    }
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleUpdate = (updatedProperty: PropertyFormData) => {
    onUpdate(updatedProperty as Property); // Cast to Property since PropertyFormData should align
    setShowEditForm(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl" title="Détails de la propriété">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{property.title}</h2>
              <p className="text-gray-600 mt-1">
                {property.location?.commune}, {property.location?.quartier}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStandingColor(property.standing)} size="md">
                {property.standing.charAt(0).toUpperCase() + property.standing.slice(1)}
              </Badge>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </div>
          </div>

          {/* Images Gallery */}
          {property.images && property.images.length > 0 && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Images ({property.images.length})</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="aspect-w-16 aspect-h-12">
                    <img
                      src={property.images[selectedImageIndex]?.url}
                      alt="Propriété"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {property.images.map((image: any, index: number) => (
                      <button
                        key={image.id || index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`aspect-w-1 aspect-h-1 rounded-lg overflow-hidden border-2 ${
                          selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={image.description || 'Image'}
                          className="w-full h-20 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Property Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Informations générales</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Standing:</span>
                    <Badge variant={getStandingColor(property.standing)} size="sm">
                      {property.standing.charAt(0).toUpperCase() + property.standing.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Disponibilité:</span>
                    <Badge variant={property.is_available ? 'success' : 'danger'} size="sm">
                      {property.is_available ? 'Disponible' : 'Occupé'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pour location:</span>
                    <span>{property.for_rent ? '✅' : '❌'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pour vente:</span>
                    <span>{property.for_sale ? '✅' : '❌'}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Localisation</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{property.location?.commune}, {property.location?.quartier}</span>
                  </div>
                  {property.location?.numeroLot && (
                    <p><strong>Lot:</strong> {property.location.numeroLot}</p>
                  )}
                  {property.location?.numeroIlot && (
                    <p><strong>Îlot:</strong> {property.location.numeroIlot}</p>
                  )}
                  {property.location?.coordinates && (
                    <p className="text-xs text-gray-500">
                      Coordonnées: {property.location.coordinates.lat?.toFixed(6)}, {property.location.coordinates.lng?.toFixed(6)}
                    </p>
                  )}
                  {property.location?.facilites && property.location.facilites.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Facilités à proximité:</p>
                      <div className="flex flex-wrap gap-1">
                        {property.location.facilites.map((facilite: string, index: number) => (
                          <Badge key={index} variant="secondary" size="sm">
                            {facilite}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Rooms Details */}
          {property.rooms && property.rooms.length > 0 && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">
                  Description des pièces ({property.rooms.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.rooms.map((room: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2 capitalize">
                        {room.nom || room.type?.replace('_', ' ')}
                      </h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        {room.superficie && <p>Superficie: {room.superficie} m²</p>}
                        {room.plafond?.type && <p>Plafond: {room.plafond.type.replace('_', ' ')}</p>}
                        {room.sol?.type && <p>Sol: {room.sol.type}</p>}
                        {room.menuiserie?.materiau && <p>Menuiserie: {room.menuiserie.materiau}</p>}
                        {room.electricite?.nombrePrises && <p>Prises électriques: {room.electricite.nombrePrises}</p>}
                        {room.peinture?.marque && (
                          <p>Peinture: {room.peinture.marque} ({room.peinture.couleur})</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Description */}
          {property.description && (
            <Card>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-4">Description</h3>
                <p className="text-gray-700 leading-relaxed">{property.description}</p>
              </div>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Informations système</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p><strong>ID Propriété:</strong> {property.id}</p>
                  <p><strong>ID Propriétaire:</strong> {property.owner_id}</p>
                  <p><strong>ID Agence:</strong> {property.agency_id}</p>
                </div>
                <div>
                  <p><strong>Créée le:</strong> {new Date(property.created_at).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Modifiée le:</strong> {new Date(property.updated_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Modal>

      {/* Edit Form Modal */}
      <PropertyForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSubmit={handleUpdate}
        initialData={{
          owner_id: property.owner_id,
          agency_id: property.agency_id,
          title: property.title,
          description: property.description,
          location: property.location,
          details: property.details,
          standing: property.standing,
          rooms: property.rooms,
          images: property.images,
          is_available: property.is_available,
          for_sale: property.for_sale,
          for_rent: property.for_rent,
        }}
      />
    </>
  );
};