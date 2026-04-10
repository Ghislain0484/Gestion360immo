import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Building2, TrendingUp, Info, AlertCircle } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Property } from '../../types/db';
import { generateSlug } from '../../utils/idSystem';

interface PropertyMapCardProps {
    properties: Property[];
    contracts?: any[];
}

const ABIDJAN_CENTER = { lat: 5.3484, lng: -4.0305 };
const GOOGLE_MAPS_LIBRARIES: any[] = ["places"];

const COMMUNE_COORDS: Record<string, { lat: number; lng: number; label: string; color: string }> = {
    'cocody': { lat: 5.3484, lng: -3.9897, label: 'Cocody', color: '#6366f1' },
    'plateau': { lat: 5.3214, lng: -4.0194, label: 'Plateau', color: '#0ea5e9' },
    'marcory': { lat: 5.3014, lng: -3.9894, label: 'Marcory', color: '#f59e0b' },
    'treichville': { lat: 5.3014, lng: -4.0194, label: 'Treichville', color: '#ec4899' },
    'port bouet': { lat: 5.2530, lng: -3.9450, label: 'Port-Bouët', color: '#14b8a6' },
    'yopougon': { lat: 5.3484, lng: -4.0714, label: 'Yopougon', color: '#8b5cf6' },
    'abobo': { lat: 5.4184, lng: -4.0114, label: 'Abobo', color: '#f97316' },
    'adjame': { lat: 5.3584, lng: -4.0194, label: 'Adjamé', color: '#10b981' },
    'attiecoube': { lat: 5.3384, lng: -4.0414, label: 'Attécoubé', color: '#3b82f6' },
    'koumassi': { lat: 5.2914, lng: -3.9494, label: 'Koumassi', color: '#ef4444' },
    'bingerville': { lat: 5.3584, lng: -3.8894, label: 'Bingerville', color: '#84cc16' },
    'anyama': { lat: 5.4884, lng: -4.0514, label: 'Anyama', color: '#a855f7' },
    'songon': { lat: 5.3284, lng: -4.2614, label: 'Songon', color: '#64748b' },
    'bonoua': { lat: 5.2714, lng: -3.5914, label: 'Bonoua', color: '#d97706' },
};

const normalize = (s: string) =>
    s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const Legend: React.FC<{ data: { name: string; color: string; count: number; occupied: number }[]; selected: string | null; onSelect: (c: string | null) => void }> = ({ data, selected, onSelect }) => (
    <div className="space-y-1 max-h-72 overflow-y-auto">
        {data.map(item => (
            <button
                key={item.name}
                onClick={() => onSelect(selected === item.name ? null : item.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all text-sm ${selected === item.name
                    ? 'bg-slate-900 text-white shadow-lg scale-[1.02]'
                    : 'hover:bg-slate-50 text-slate-700'
                    }`}
            >
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-medium truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs font-bold">{item.count}</span>
                    {item.occupied > 0 && <span className="text-[10px] text-emerald-600 font-semibold">{item.occupied}✓</span>}
                </div>
            </button>
        ))}
    </div>
);

export const PropertyMapCard: React.FC<PropertyMapCardProps> = ({ properties, contracts = [] }) => {
    const navigate = useNavigate();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [selectedCommune, setSelectedCommune] = useState<string | null>(null);

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const isApiKeyMissing = !apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: isApiKeyMissing ? '' : apiKey,
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    const activeContractsByProperty = useMemo(() => {
        const map = new Map<string, boolean>();
        contracts.forEach((c: any) => {
            if (c.status === 'active' && c.type === 'location') {
                map.set(c.property_id, true);
            }
        });
        return map;
    }, [contracts]);

    const communeData = useMemo(() => {
        const groups: Record<string, { properties: Property[]; occupied: number }> = {};
        properties.forEach(p => {
            const commune = normalize(p.location?.commune || '');
            if (!commune) return;
            if (!groups[commune]) groups[commune] = { properties: [], occupied: 0 };
            groups[commune].properties.push(p);
            if (activeContractsByProperty.get(p.id)) {
                groups[commune].occupied++;
            }
        });
        return groups;
    }, [properties, activeContractsByProperty]);

    const legendData = useMemo(() => {
        return Object.entries(COMMUNE_COORDS)
            .map(([key, cfg]) => {
                const data = communeData[key];
                return {
                    name: cfg.label,
                    color: cfg.color,
                    count: data?.properties.length ?? 0,
                    occupied: data?.occupied ?? 0,
                    key,
                };
            })
            .filter(d => d.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [communeData]);

    const selectedCommuneInfo = useMemo(() => {
        if (!selectedCommune) return null;
        const cfg = COMMUNE_COORDS[selectedCommune];
        const data = communeData[selectedCommune];
        if (!cfg || !data) return null;
        return {
            label: cfg.label,
            color: cfg.color,
            total: data.properties.length,
            occupied: data.occupied,
            vacant: data.properties.length - data.occupied,
            occupancyRate: data.properties.length ? Math.round((data.occupied / data.properties.length) * 100) : 0,
        };
    }, [selectedCommune, communeData]);

    const totalOccupied = Object.values(communeData).reduce((a, b) => a + b.occupied, 0);
    const globalRate = properties.length ? Math.round((totalOccupied / properties.length) * 100) : 0;

    const markers = useMemo(() => {
        return properties.map(p => {
            const communeKey = normalize(p.location?.commune || '');
            const fallback = COMMUNE_COORDS[communeKey];

            // Jitter for markers in the same commune with no coordinates
            const seed = p.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const jitterLat = 0.005 * ((seed % 100) / 100 - 0.5);
            const jitterLng = 0.005 * (((seed * 13) % 100) / 100 - 0.5);

            return {
                id: p.id,
                position: p.location?.coordinates?.lat && p.location?.coordinates?.lng
                    ? { lat: Number(p.location.coordinates.lat), lng: Number(p.location.coordinates.lng) }
                    : fallback ? { lat: fallback.lat + jitterLat, lng: fallback.lng + jitterLng } : null,
                property: p,
                isOccupied: activeContractsByProperty.get(p.id)
            };
        }).filter(m => m.position !== null);
    }, [properties, activeContractsByProperty]);

    const selectedProperty = useMemo(() =>
        properties.find(p => p.id === selectedPropertyId),
        [properties, selectedPropertyId]);

    const mapOptions = {
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        styles: [
            {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
            }
        ]
    };

    if (loadError || isApiKeyMissing) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-elegant overflow-hidden h-[500px] flex flex-col">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Google Maps - Configuration requise</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Clé API manquante ou invalide</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-md">
                        <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 mb-6 font-medium">
                            Pour afficher la carte interactive Google Maps, vous devez configurer votre clé API dans le fichier <code className="bg-slate-100 px-1 rounded text-red-500">.env</code>.
                        </p>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-left text-xs font-mono mb-6 overflow-x-auto shadow-inner">
                            VITE_GOOGLE_MAPS_API_KEY=votre_cle_api_ici
                        </div>
                        <p className="text-xs text-slate-400">
                            Vous pouvez obtenir une clé sur la <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600 transition-colors">Google Cloud Console</a>.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return <div className="h-[500px] flex items-center justify-center bg-slate-50 rounded-2xl animate-pulse">
            <div className="text-slate-400 font-medium">Chargement de la carte...</div>
        </div>;
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-elegant overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                        <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Carte interactive des biens</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{properties.length} bien{properties.length > 1 ? 's' : ''} · taux d'occupation global {globalRate}%</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row">
                <div className="flex-1 min-h-[450px] relative bg-slate-50">
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%', minHeight: '450px' }}
                        center={ABIDJAN_CENTER}
                        zoom={12}
                        options={mapOptions}
                    >
                        {markers.map((marker: any) => (
                            <MarkerF
                                key={marker.id}
                                position={marker.position}
                                onClick={() => setSelectedPropertyId(marker.id)}
                                icon={marker.isOccupied
                                    ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                                    : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                                }
                            />
                        ))}

                        {selectedPropertyId && selectedProperty && (
                            <InfoWindowF
                                position={
                                    markers.find(m => m.id === selectedPropertyId)?.position || ABIDJAN_CENTER
                                }
                                onCloseClick={() => setSelectedPropertyId(null)}
                            >
                                <div className="p-2 min-w-[200px]">
                                    <h4 className="font-bold text-slate-900 text-sm mb-1">{selectedProperty.title}</h4>
                                    <p className="text-xs text-slate-500 mb-2">
                                        {selectedProperty.location.commune}, {selectedProperty.location.quartier}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeContractsByProperty.get(selectedProperty.id)
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {activeContractsByProperty.get(selectedProperty.id) ? 'Occupé' : 'Disponible'}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const slugId = selectedProperty.business_id || selectedProperty.id;
                                                const slug = generateSlug(slugId, selectedProperty.title);
                                                navigate(`/proprietes/${slug}`);
                                            }}
                                            className="text-[10px] text-blue-600 font-bold hover:underline transition-all"
                                        >
                                            Voir détails
                                        </button>
                                    </div>
                                </div>
                            </InfoWindowF>
                        )}
                    </GoogleMap>
                </div>

                <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col bg-white">
                    {selectedCommuneInfo ? (
                        <div className="p-4 border-b border-gray-100 transition-all duration-300" style={{ borderLeftColor: selectedCommuneInfo.color, borderLeftWidth: 4 }}>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Zone sélectionnée</p>
                                <button onClick={() => setSelectedCommune(null)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                            </div>
                            <p className="font-bold text-slate-900 text-base">{selectedCommuneInfo.label}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100 shadow-sm">
                                    <p className="text-lg font-bold text-slate-900">{selectedCommuneInfo.total}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Total</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-2 text-center border border-emerald-100 shadow-sm">
                                    <p className="text-lg font-bold text-emerald-700">{selectedCommuneInfo.occupied}</p>
                                    <p className="text-[10px] text-emerald-600 font-medium">Occupés</p>
                                </div>
                                <div className="bg-amber-50 rounded-xl p-2 text-center border border-amber-100 shadow-sm">
                                    <p className="text-lg font-bold text-amber-700">{selectedCommuneInfo.vacant}</p>
                                    <p className="text-[10px] text-amber-600 font-medium">Vacants</p>
                                </div>
                                <div className="rounded-xl p-2 text-center border shadow-sm" style={{ backgroundColor: selectedCommuneInfo.color + '10', borderColor: selectedCommuneInfo.color + '20' }}>
                                    <p className="text-lg font-bold" style={{ color: selectedCommuneInfo.color }}>{selectedCommuneInfo.occupancyRate}%</p>
                                    <p className="text-[10px] text-slate-500 font-medium">Occupation</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 border-b border-gray-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Résumé global</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100 shadow-sm">
                                    <Building2 className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                                    <p className="text-base font-bold text-blue-700">{properties.length}</p>
                                    <p className="text-[10px] text-blue-500 font-medium">Biens</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-2.5 text-center border border-emerald-100 shadow-sm">
                                    <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                                    <p className="text-base font-bold text-emerald-700">{globalRate}%</p>
                                    <p className="text-[10px] text-emerald-500 font-medium">Taux</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 flex-1 overflow-hidden flex flex-col">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Info className="w-3 h-3" />
                            Zones actives
                        </p>
                        <Legend
                            data={legendData}
                            selected={selectedCommune}
                            onSelect={setSelectedCommune}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
