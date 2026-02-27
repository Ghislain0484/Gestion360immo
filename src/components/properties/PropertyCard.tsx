import React from 'react';
import { MapPin, User, ArrowRight, Trash2 } from 'lucide-react';

import { Property } from '../../types/db';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ImageCarousel } from '../ui/ImageCarousel';

interface PropertyCardProps {
    property: Property;
    tenantName?: string;
    rentAmount?: number;
    onClick?: () => void;
    isOccupied?: boolean;
    onDelete?: () => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, tenantName, rentAmount, onClick, isOccupied: isOccupiedProp, onDelete }) => {
    const isOccupied = isOccupiedProp !== undefined ? isOccupiedProp : (!!tenantName && !property.is_available);
    const isAvailable = property.is_available && !isOccupied;

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" onClick={onClick}>
            <div className="relative">
                <ImageCarousel
                    images={property.images || []}
                    autoPlay={true}
                    interval={3000}
                    showControls={true}
                    showIndicators={true}
                    height="h-48"
                />
                <div className="absolute top-3 right-3 z-50">
                    <Badge variant={isOccupied ? 'warning' : (isAvailable ? 'success' : 'secondary')}>
                        {isOccupied ? 'Occupé' : (isAvailable ? 'Vacant' : 'Indisponible')}
                    </Badge>
                </div>
                {onDelete && (
                    <div className="absolute top-3 left-3 z-50">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white/90 hover:bg-red-50 text-red-600 hover:text-red-700 shadow-sm transition-colors w-8 h-8 p-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            title="Supprimer ce bien"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 z-10">
                    <h3 className="text-white font-semibold truncate text-lg">{property.title}</h3>
                </div>
            </div>

            <div className="p-4 space-y-3">
                <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">{property.location.quartier}, {property.location.commune}</span>
                </div>

                {/* Owner Info */}
                <div className="flex items-center text-gray-600 text-sm">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">
                        Proprio: {(() => {
                            const p = property as any;
                            // Check both owner (alias) and owners (default) just in case
                            const rawOwner = p.owner || p.owners;
                            const owner = Array.isArray(rawOwner) ? rawOwner[0] : rawOwner;
                            return owner ? `${owner.first_name} ${owner.last_name}` : 'Inconnu';
                        })()}
                    </span>
                </div>

                {/* Tenant & Rent Info */}
                {isOccupied && (
                    <div className="bg-blue-50 p-2 rounded-lg text-sm space-y-1">
                        <div className="flex items-center justify-between text-blue-900">
                            <span className="flex items-center gap-1.5 font-medium">
                                <User className="w-3.5 h-3.5" />
                                {tenantName || 'Locataire inconnu'}
                            </span>
                        </div>
                        {rentAmount && (
                            <div className="flex items-center justify-between text-blue-700 font-semibold">
                                <span>Loyer:</span>
                                <span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(rentAmount)}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-sm text-gray-500">
                        {property.details.type}
                    </div>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 p-0">
                        Détails <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        </Card>
    );
};
