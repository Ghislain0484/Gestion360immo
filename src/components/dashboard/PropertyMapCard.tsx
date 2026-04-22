import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Building2, TrendingUp, Info, AlertCircle } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import { Property } from '../../types/db';
import { generateSlug } from '../../utils/idSystem';

interface PropertyMapCardProps {
  properties: Property[];
  contracts?: PropertyContractLike[];
}

interface PropertyContractLike {
  status?: string;
  type?: string;
  property_id?: string;
}

interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  property: Property;
  isOccupied?: boolean;
}

const ABIDJAN_CENTER = { lat: 5.3484, lng: -4.0305 };
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places', 'marker'];

const COMMUNE_COORDS: Record<string, { lat: number; lng: number; label: string; color: string }> = {
  cocody: { lat: 5.3484, lng: -3.9897, label: 'Cocody', color: '#6366f1' },
  plateau: { lat: 5.3214, lng: -4.0194, label: 'Plateau', color: '#0ea5e9' },
  marcory: { lat: 5.3014, lng: -3.9894, label: 'Marcory', color: '#f59e0b' },
  treichville: { lat: 5.3014, lng: -4.0194, label: 'Treichville', color: '#ec4899' },
  'port bouet': { lat: 5.253, lng: -3.945, label: 'Port-Bouet', color: '#14b8a6' },
  yopougon: { lat: 5.3484, lng: -4.0714, label: 'Yopougon', color: '#8b5cf6' },
  abobo: { lat: 5.4184, lng: -4.0114, label: 'Abobo', color: '#f97316' },
  adjame: { lat: 5.3584, lng: -4.0194, label: 'Adjame', color: '#10b981' },
  attiecoube: { lat: 5.3384, lng: -4.0414, label: 'Attiecoube', color: '#3b82f6' },
  koumassi: { lat: 5.2914, lng: -3.9494, label: 'Koumassi', color: '#ef4444' },
  bingerville: { lat: 5.3584, lng: -3.8894, label: 'Bingerville', color: '#84cc16' },
  anyama: { lat: 5.4884, lng: -4.0514, label: 'Anyama', color: '#a855f7' },
  songon: { lat: 5.3284, lng: -4.2614, label: 'Songon', color: '#64748b' },
  bonoua: { lat: 5.2714, lng: -3.5914, label: 'Bonoua', color: '#d97706' },
};

const normalize = (value: string) =>
  value?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const Legend: React.FC<{
  data: { name: string; color: string; count: number; occupied: number }[];
  selected: string | null;
  onSelect: (commune: string | null) => void;
}> = ({ data, selected, onSelect }) => (
  <div className="max-h-72 space-y-1 overflow-y-auto">
    {data.map((item) => (
      <button
        key={item.name}
        onClick={() => onSelect(selected === item.name ? null : item.name)}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all ${
          selected === item.name
            ? 'scale-[1.02] bg-slate-900 text-white shadow-lg dark:bg-slate-700'
            : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="truncate font-medium">{item.name}</span>
        </div>
        <div className="ml-2 flex flex-shrink-0 items-center gap-2">
          <span className="text-xs font-bold">{item.count}</span>
          {item.occupied > 0 && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
              {item.occupied}x
            </span>
          )}
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
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const activeContractsByProperty = useMemo(() => {
    const map = new Map<string, boolean>();
    contracts.forEach((contract) => {
      if (contract.status === 'active' && contract.type === 'location') {
        if (contract.property_id) {
          map.set(contract.property_id, true);
        }
      }
    });
    return map;
  }, [contracts]);

  const communeData = useMemo(() => {
    const groups: Record<string, { properties: Property[]; occupied: number }> = {};

    properties.forEach((property) => {
      const commune = normalize(property.location?.commune || '');
      if (!commune) return;
      if (!groups[commune]) groups[commune] = { properties: [], occupied: 0 };

      groups[commune].properties.push(property);
      if (activeContractsByProperty.get(property.id)) {
        groups[commune].occupied += 1;
      }
    });

    return groups;
  }, [properties, activeContractsByProperty]);

  const legendData = useMemo(() => {
    return Object.entries(COMMUNE_COORDS)
      .map(([key, config]) => {
        const data = communeData[key];
        return {
          name: config.label,
          color: config.color,
          count: data?.properties.length ?? 0,
          occupied: data?.occupied ?? 0,
          key,
        };
      })
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [communeData]);

  const selectedCommuneInfo = useMemo(() => {
    if (!selectedCommune) return null;

    const config = COMMUNE_COORDS[selectedCommune];
    const data = communeData[selectedCommune];
    if (!config || !data) return null;

    return {
      label: config.label,
      color: config.color,
      total: data.properties.length,
      occupied: data.occupied,
      vacant: data.properties.length - data.occupied,
      occupancyRate: data.properties.length ? Math.round((data.occupied / data.properties.length) * 100) : 0,
    };
  }, [selectedCommune, communeData]);

  const totalOccupied = Object.values(communeData).reduce((count, group) => count + group.occupied, 0);
  const globalRate = properties.length ? Math.round((totalOccupied / properties.length) * 100) : 0;

  const markers = useMemo<MapMarker[]>(() => {
    return properties
      .map((property) => {
        const communeKey = normalize(property.location?.commune || '');
        const fallback = COMMUNE_COORDS[communeKey];

        const seed = property.id.split('').reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);
        const jitterLat = 0.005 * ((seed % 100) / 100 - 0.5);
        const jitterLng = 0.005 * (((seed * 13) % 100) / 100 - 0.5);

        return {
          id: property.id,
          position:
            property.location?.coordinates?.lat && property.location?.coordinates?.lng
              ? { lat: Number(property.location.coordinates.lat), lng: Number(property.location.coordinates.lng) }
              : fallback
                ? { lat: fallback.lat + jitterLat, lng: fallback.lng + jitterLng }
                : null,
          property,
          isOccupied: activeContractsByProperty.get(property.id),
        };
      })
      .filter((marker): marker is MapMarker => marker.position !== null);
  }, [properties, activeContractsByProperty]);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId),
    [properties, selectedPropertyId]
  );

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ],
  };

  if (loadError || isApiKeyMissing) {
    return (
      <div className="flex h-[500px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Google Maps - Configuration requise</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Cle API manquante ou invalide</p>
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-8 text-center dark:bg-slate-950/70">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <MapPin className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="mb-6 font-medium text-slate-600 dark:text-slate-300">
              Pour afficher la carte interactive Google Maps, vous devez configurer votre cle API dans le fichier{' '}
              <code className="rounded bg-slate-100 px-1 text-red-500 dark:bg-slate-800 dark:text-red-300">.env</code>.
            </p>
            <div className="mb-6 overflow-x-auto rounded-xl bg-slate-900 p-4 text-left text-xs font-mono text-slate-100 shadow-inner">
              VITE_GOOGLE_MAPS_API_KEY=votre_cle_api_ici
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Vous pouvez obtenir une cle sur la{' '}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline transition-colors hover:text-blue-600"
              >
                Google Cloud Console
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-2xl bg-slate-50 animate-pulse dark:bg-slate-900/70">
        <div className="font-medium text-slate-400 dark:text-slate-500">Chargement de la carte...</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-elegant dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Carte interactive des biens</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {properties.length} bien{properties.length > 1 ? 's' : ''} · taux d'occupation global {globalRate}%
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="relative min-h-[450px] flex-1 bg-slate-50 dark:bg-slate-950/60">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%', minHeight: '450px' }}
            center={ABIDJAN_CENTER}
            zoom={12}
            options={mapOptions}
          >
            {markers.map((marker) => (
              <MarkerF
                key={marker.id}
                position={marker.position}
                onClick={() => setSelectedPropertyId(marker.id)}
                icon={
                  marker.isOccupied
                    ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
                }
              />
            ))}

            {selectedPropertyId && selectedProperty && (
              <InfoWindowF
                position={markers.find((marker) => marker.id === selectedPropertyId)?.position || ABIDJAN_CENTER}
                onCloseClick={() => setSelectedPropertyId(null)}
              >
                <div className="min-w-[200px] p-2">
                  <h4 className="mb-1 text-sm font-bold text-slate-900">{selectedProperty.title}</h4>
                  <p className="mb-2 text-xs text-slate-500">
                    {selectedProperty.location.commune}, {selectedProperty.location.quartier}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        activeContractsByProperty.get(selectedProperty.id)
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {activeContractsByProperty.get(selectedProperty.id) ? 'Occupe' : 'Disponible'}
                    </span>
                    <button
                      onClick={() => {
                        const slugId = selectedProperty.business_id || selectedProperty.id;
                        const slug = generateSlug(slugId, selectedProperty.title);
                        navigate(`/proprietes/${slug}`);
                      }}
                      className="text-[10px] font-bold text-blue-600 transition-all hover:underline"
                    >
                      Voir details
                    </button>
                  </div>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>
        </div>

        <div className="flex w-full flex-col border-t border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-900 lg:w-72 lg:border-l lg:border-t-0">
          {selectedCommuneInfo ? (
            <div
              className="border-b border-gray-100 p-4 transition-all duration-300 dark:border-slate-700"
              style={{ borderLeftColor: selectedCommuneInfo.color, borderLeftWidth: 4 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Zone selectionnee
                </p>
                <button
                  onClick={() => setSelectedCommune(null)}
                  className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ×
                </button>
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedCommuneInfo.label}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedCommuneInfo.total}</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Total</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-center shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{selectedCommuneInfo.occupied}</p>
                  <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-300">Occupes</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-2 text-center shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{selectedCommuneInfo.vacant}</p>
                  <p className="text-[10px] font-medium text-amber-600 dark:text-amber-300">Vacants</p>
                </div>
                <div
                  className="rounded-xl border p-2 text-center shadow-sm"
                  style={{ backgroundColor: `${selectedCommuneInfo.color}10`, borderColor: `${selectedCommuneInfo.color}20` }}
                >
                  <p className="text-lg font-bold" style={{ color: selectedCommuneInfo.color }}>
                    {selectedCommuneInfo.occupancyRate}%
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-300">Occupation</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-gray-100 p-4 dark:border-slate-700">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Resume global
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-center shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10">
                  <Building2 className="mx-auto mb-1 h-4 w-4 text-blue-500 dark:text-blue-300" />
                  <p className="text-base font-bold text-blue-700 dark:text-blue-300">{properties.length}</p>
                  <p className="text-[10px] font-medium text-blue-500 dark:text-blue-300">Biens</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-center shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <TrendingUp className="mx-auto mb-1 h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">{globalRate}%</p>
                  <p className="text-[10px] font-medium text-emerald-500 dark:text-emerald-300">Taux</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-1 flex-col overflow-hidden p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Info className="h-3 w-3" />
              Zones actives
            </p>
            <Legend data={legendData} selected={selectedCommuneInfo?.label || null} onSelect={(label) => {
              if (!label) {
                setSelectedCommune(null);
                return;
              }
              const foundEntry = Object.entries(COMMUNE_COORDS).find(([, config]) => config.label === label);
              setSelectedCommune(foundEntry?.[0] || null);
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};
