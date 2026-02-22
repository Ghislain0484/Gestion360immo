import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Building, Users, Wallet, Edit, ArrowLeft, BedDouble, Bath, Square, CheckCircle, AlertCircle } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { Property, RoomDetails } from '../../types/db';
import { extractIdFromSlug } from '../../utils/idSystem';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { PropertyForm } from './PropertyForm';
import { PaymentsList } from '../payments/PaymentsList';
import { ImageGallery } from '../ui/ImageGallery';
import { generateSlug } from '../../utils/idSystem';
import { Owner } from '../../types/db';

const OwnerInfoDisplay: React.FC<{ ownerId: string }> = ({ ownerId }) => {
    const navigate = useNavigate();
    const [owner, setOwner] = useState<Owner | null>(null);

    React.useEffect(() => {
        if (ownerId) {
            dbService.owners.getById(ownerId).then(setOwner);
        }
    }, [ownerId]);

    if (!owner) return <div className="animate-pulse h-12 bg-gray-100 rounded"></div>;

    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                {owner.first_name[0]}{owner.last_name[0]}
            </div>
            <div>
                <p className="font-medium text-gray-900">{owner.first_name} {owner.last_name}</p>
                <p className="text-xs text-gray-500">{owner.phone}</p>
                <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto text-blue-600 hover:text-blue-700 underline"
                    onClick={() => {
                        const matchId = owner.business_id || owner.id;
                        const slug = generateSlug(matchId, `${owner.first_name} ${owner.last_name}`);
                        navigate(`/proprietaires/${slug}`);
                    }}
                >
                    Voir le profil
                </Button>
            </div>
        </div>
    );
};

export const PropertyDetails: React.FC = () => {
    const { id: slug } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const propertyId = extractIdFromSlug(slug || '');

    const [activeTab, setActiveTab] = useState('details');
    const [showEditForm, setShowEditForm] = useState(false);

    // Fetch Specific Property Data
    const { data: properties } = useRealtimeData<Property>(
        dbService.properties.getAll,
        'properties'
    );
    // Fallback: If properties are loaded, find match. If not found yet, it will be undefined.
    const property = properties.find(p => p.id === propertyId);

    // Fetch Related Data (Contracts & Tenants)
    const { data: contracts } = useRealtimeData(dbService.contracts.getAll, 'contracts');
    const { data: tenants } = useRealtimeData(dbService.tenants.getAll, 'tenants');

    // Derived Data
    // Correction : Un bien est "loué" uniquement s'il y a un contrat de type 'location' actif
    const activeContract: any = contracts?.find(c =>
        c.property_id === propertyId &&
        c.status === 'active' &&
        c.type === 'location'
    );

    // Source robuste pour le locataire : prioriser celui inclus dans le contrat (jointure)
    const currentTenant = activeContract?.tenant || (activeContract ? tenants?.find(t => t.id === activeContract.tenant_id) : null);

    // Historique : Uniquement les contrats de location pour cet onglet
    const rentalHistory = contracts?.filter(c =>
        c.property_id === propertyId &&
        c.type === 'location'
    ) || [];

    if (!property) {
        // Show loading only if properties list is empty (loading)
        // If list is populated but not found, show "Not Found"
        if (properties.length === 0) {
            return <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                Chargement des détails du bien...
            </div>;
        }
        return <div className="p-8 text-center text-red-500">Bien introuvable (ID: {propertyId})</div>;
    }

    // Coexistence Robuste : Un bien est "Occupé" uniquement s'il y a un contrat de location actif
    const isOccupied = !!activeContract && !!currentTenant;

    // Un bien est "Disponible" s'il n'est pas occupé ET qu'il est marqué comme disponible
    const isAvailable = property.is_available && !isOccupied;

    console.log('🏘️ Property Sync Check:', {
        propertyId,
        property_is_available: property.is_available,
        hasActiveRentalContract: !!activeContract,
        isOccupied,
        isAvailable,
        tenantFound: !!currentTenant,
        allContractsForProperty: contracts?.filter(c => c.property_id === propertyId).map(c => ({ id: c.id, status: c.status, type: c.type }))
    });

    const bedrooms = property.rooms?.filter(r => ['chambre_principale', 'chambre_2', 'chambre_3'].includes(r.type)).length || 0;
    const bathrooms = property.rooms?.filter(r => r.type === 'salle_bain').length || 0;

    const tabs = [
        { id: 'details', label: 'Détails & Pièces', icon: Building },
        { id: 'tenants', label: `Locataires (${activeContract ? '1' : '0'})`, icon: Users },
        { id: 'financials', label: 'Historique Caisse', icon: Wallet },
    ];

    const getPrimaryImage = () => {
        return property.images?.find(img => img.isPrimary)?.url || property.images?.[0]?.url;
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Back Button */}
            <Button variant="ghost" size="sm" onClick={() => navigate('/proprietes')} className="mb-2 pl-0 hover:bg-transparent hover:text-blue-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au catalogue
            </Button>

            {/* Hero Section */}
            <div className="relative h-64 md:h-80 rounded-xl overflow-hidden shadow-lg bg-gray-900 group">
                {getPrimaryImage() ? (
                    <img
                        src={getPrimaryImage()}
                        alt={property.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-70 transition-opacity"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                        <Building className="w-16 h-16" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                    <div className="absolute bottom-0 left-0 p-6 w-full">
                        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">{property.title}</h1>
                                <div className="flex items-center text-gray-200 mb-4">
                                    <MapPin className="w-5 h-5 mr-2" />
                                    <span className="text-lg">{property.location.commune}, {property.location.quartier}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant={isOccupied ? "warning" : (isAvailable ? "success" : "secondary")} className="text-sm px-3 py-1">
                                        {isOccupied ? "Occupé" : (isAvailable ? "Disponible" : "Indisponible")}
                                    </Badge>
                                    <Badge variant="secondary" className="text-sm px-3 py-1 bg-white/20 text-white border-none backdrop-blur-md">
                                        {property.details.type}
                                    </Badge>
                                </div>
                            </div>
                            <Button onClick={() => setShowEditForm(true)} variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Tabs & Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Image Gallery */}
                    {property.images && property.images.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Photos du bien</h3>
                            <ImageGallery images={property.images} />
                        </div>
                    )}

                    <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 min-h-[400px]">
                        {activeTab === 'details' && (
                            <div className="space-y-8">
                                {/* Description */}
                                <section>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                                    <p className="text-gray-600 leading-relaxed">
                                        {property.description || "Aucune description disponible pour ce bien."}
                                    </p>
                                </section>

                                {/* Caractéristiques */}
                                <section>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Caractéristiques</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-xs text-gray-500 uppercase tracking-wide">Standing</span>
                                            <p className="font-medium capitalize">{property.standing}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-xs text-gray-500 uppercase tracking-wide">Usage</span>
                                            <p className="font-medium">
                                                {property.for_rent && "Location"}
                                                {property.for_rent && property.for_sale && " / "}
                                                {property.for_sale && "Vente"}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <span className="text-xs text-gray-500 uppercase tracking-wide">Pièces</span>
                                            <p className="font-medium">{bedrooms} Ch. / {bathrooms} SDB</p>
                                        </div>
                                        {/* Add more arbitrary details if needed */}
                                    </div>
                                </section>

                                {/* Pièces */}
                                <section>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                                        Description des pièces
                                        <span className="text-sm font-normal text-gray-500">{property.rooms?.length || 0} pièces</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {property.rooms && property.rooms.map((room: RoomDetails, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                        {room.type === 'chambre_principale' || room.type === 'chambre_2' || room.type === 'chambre_3' ? <BedDouble className="w-5 h-5" /> :
                                                            room.type === 'salle_bain' ? <Bath className="w-5 h-5" /> :
                                                                <Square className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 capitalize">{room.nom || room.type.replace('_', ' ')}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {room.superficie ? `${room.superficie} m²` : 'Surface non précisée'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Optional: Add more details popup */}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'tenants' && (
                            <div className="space-y-6">
                                {isOccupied && currentTenant ? (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                                                    {currentTenant.first_name[0]}{currentTenant.last_name[0]}
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">{currentTenant.first_name} {currentTenant.last_name}</h3>
                                                    <p className="text-blue-600 font-medium">Locataire actuel</p>
                                                </div>
                                            </div>
                                            <Button variant="outline" onClick={() => {
                                                const slug = generateSlug(currentTenant.id, `${currentTenant.first_name} ${currentTenant.last_name}`);
                                                navigate(`/locataires/${slug}`)
                                            }}>
                                                Voir le dossier
                                            </Button>
                                        </div>

                                        {activeContract && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-blue-200 pt-6">
                                                <div>
                                                    <span className="text-sm text-gray-500 block mb-1">Contrat</span>
                                                    <span className="font-medium">Bail #{activeContract.id.slice(0, 8)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-sm text-gray-500 block mb-1">Loyer Mensuel</span>
                                                    <span className="font-medium text-lg">{activeContract.monthly_rent?.toLocaleString('fr-FR')} FCFA</span>
                                                </div>
                                                <div>
                                                    <span className="text-sm text-gray-500 block mb-1">Date d'entrée</span>
                                                    <span className="font-medium">
                                                        {new Date(activeContract.start_date).toLocaleDateString('fr-FR')}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium">Ce bien est actuellement libre</h3>
                                        <p className="text-gray-500 mb-6">Prêt à accueillir un nouveau locataire.</p>
                                        <Button onClick={() => navigate(`/locataires?action=new&propertyId=${property.id}`)}>Ajouter un locataire</Button>
                                    </div>
                                )}

                                {/* Rental History List (could stay or move to its own block) */}
                                {rentalHistory.length > 0 && (
                                    <div className="mt-8">
                                        <h4 className="text-lg font-semibold mb-4">Historique des locations</h4>
                                        <div className="space-y-2">
                                            {rentalHistory.map(contract => (
                                                <div key={contract.id} className="flex justify-between p-3 bg-gray-50 rounded border border-gray-100 text-sm">
                                                    <span>Du {new Date(contract.start_date).toLocaleDateString()}</span>
                                                    <Badge variant={contract.status === 'active' ? 'success' : 'secondary'}>
                                                        {contract.status === 'active' ? 'En cours' : 'Terminé'}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des paiements</h3>
                                <PaymentsList propertyId={property.id} limit={20} showActions={true} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Sidebar Info */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Propriétaire</h3>
                        {activeContract && activeContract.owner ? (
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="font-bold text-gray-600">
                                        {activeContract.owner.first_name?.[0]}{activeContract.owner.last_name?.[0]}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-medium">
                                        {activeContract.owner.first_name} {activeContract.owner.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500">{activeContract.owner.phone}</p>
                                    <Button variant="ghost" size="sm" className="p-0 h-auto text-blue-600 hover:text-blue-700 underline"
                                        onClick={() => {
                                            const owner = activeContract.owner!;
                                            const matchId = owner.business_id || owner.id;
                                            const slug = generateSlug(matchId, `${owner.first_name} ${owner.last_name}`);
                                            navigate(`/proprietaires/${slug}`);
                                        }}
                                    >
                                        Voir le profil
                                    </Button>
                                </div>
                            </div>
                        ) : property ? (
                            // Fallback if no active contract but property exists (fetch owner if needed, but for now show basic or fetch separately)
                            // Since we didn't fetch owner separately in the original code, we might need to rely on what we have.
                            // The easiest way is to fetch the owner here if not present in contract.
                            <OwnerInfoDisplay ownerId={property.owner_id} />
                        ) : (
                            <p className="text-gray-500">Information non disponible</p>
                        )}
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Documents</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100 text-sm">
                                <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-gray-400" /> Mandat de gestion</span>
                                <span className="text-gray-400 text-xs">Manquant</span>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full mt-4" size="sm">Ajouter un document</Button>
                    </Card>
                </div>
            </div>

            <PropertyForm
                isOpen={showEditForm}
                onClose={() => setShowEditForm(false)}
                initialData={property}
                onSubmit={() => {
                    setShowEditForm(false);
                    // Refresh handled by realtime or parent
                }}
            />
        </div>
    );
};
