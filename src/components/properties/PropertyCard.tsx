import React from 'react';
import { MapPin, User, ArrowRight, Trash2 } from 'lucide-react';

import { Property } from '../../types/db';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ImageCarousel } from '../ui/ImageCarousel';
import { PropertyYield } from './PropertyYield';

interface PropertyCardProps {
    property: Property;
    tenantName?: string;
    rentAmount?: number;
    onClick?: () => void;
    isOccupied?: boolean;
    onDelete?: () => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, tenantName, rentAmount, onClick, isOccupied: isOccupiedProp, onDelete }) => {
    // Source de vérité : isOccupied passé par le parent (basé sur les contrats actifs réels)
    // Si non fourni, on se fie à tenantName (backward compat)
    const isOccupied = isOccupiedProp !== undefined ? isOccupiedProp : !!tenantName;
    // is_available n'est PAS la source primaire — il peut être désynchronisé avec les contrats
    const isAvailable = !isOccupied;

    return (
        <Card 
            className="p-0 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-gray-100 hover:border-primary-100 flex flex-col h-full" 
            onClick={onClick}
        >
            <div className="relative">
                <ImageCarousel
                    images={property.images || []}
                    autoPlay={true}
                    interval={3000}
                    showControls={true}
                    showIndicators={true}
                    height="h-52"
                />
                <div className="absolute top-4 right-4 z-20">
                    <Badge 
                        variant={isOccupied ? 'warning' : (isAvailable ? 'success' : 'secondary')}
                        className="shadow-lg backdrop-blur-md bg-white/90 border-0 font-bold px-3 py-1 text-[10px] uppercase tracking-wider"
                    >
                        {isOccupied ? 'Occupé' : (isAvailable ? 'Disponible' : 'Indisponible')}
                    </Badge>
                </div>
                {onDelete && (
                    <div className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            className="w-10 h-10 rounded-xl bg-white/90 text-red-600 hover:bg-red-600 hover:text-white shadow-lg flex items-center justify-center transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {/* Subtle overlay for title */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 flex items-end p-5">
                    <div className="min-w-0">
                        <h3 className="text-white font-bold truncate text-xl leading-tight group-hover:text-primary-300 transition-colors">
                            {property.title}
                        </h3>
                        <div className="flex items-center text-white/80 text-xs mt-1">
                            <MapPin className="w-3 h-3 mr-1.5 text-primary-400" />
                            <span className="truncate">{property.location.quartier}, {property.location.commune}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col space-y-4">
                {/* Stats / Yield */}
                {property.monthly_rent && property.sale_price && (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-primary-50 group-hover:border-primary-100 transition-colors">
                        <PropertyYield 
                            monthlyRent={property.monthly_rent} 
                            propertyValue={property.sale_price} 
                        />
                    </div>
                )}

                <div className="space-y-2.5 flex-1">
                    {/* Owner Info */}
                    <div className="flex items-center text-[13px] text-gray-600 font-medium">
                        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center mr-3 group-hover:bg-white transition-colors">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <span className="truncate flex-1">
                            <span className="text-gray-400 font-normal mr-1">Proprio:</span>
                            {(() => {
                                const p = property as any;
                                const rawOwner = p.owner || p.owners;
                                const owner = Array.isArray(rawOwner) ? rawOwner[0] : rawOwner;
                                return owner ? `${owner.first_name} ${owner.last_name}` : 'Inconnu';
                            })()}
                        </span>
                    </div>

                    {/* Tenant Info if Occupied */}
                    {isOccupied && (
                        <div className="flex items-center text-[13px] text-blue-700 font-bold bg-blue-50/50 p-2 rounded-xl border border-blue-50">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                                <User className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="truncate leading-none">{tenantName || 'Locataire inconnu'}</p>
                                {rentAmount && (
                                    <p className="text-[10px] text-blue-500 font-normal mt-1 tabular-nums">
                                        Loyer: {rentAmount.toLocaleString('fr-FR')} FCFA
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-1.5">
                       <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0 text-[10px] font-bold">
                           {property.details.type}
                       </Badge>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs font-black text-primary-600 uppercase tracking-widest group/btn hover:text-primary-700 transition-colors">
                        PLUS DE DÉTAILS
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                </div>
            </div>
        </Card>
    );
};
