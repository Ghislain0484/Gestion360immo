import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader } from 'lucide-react';
import { PropertyLocation } from '../../types/db';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationSelectorProps {
  location: PropertyLocation;
  onChange: (location: PropertyLocation) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  location,
  onChange,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    // Initialize Leaflet map
    mapRef.current = L.map('map').setView([5.3364, -4.0267], 13); // Abidjan
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(mapRef.current);

    // Add click event to place marker
    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      onChange({ ...location, coordinates: { lat, lng } });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else if (mapRef.current) {
        markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
      }
    });

    // Set initial marker if coordinates exist
    if (location.coordinates && mapRef.current) {
      markerRef.current = L.marker([
        location.coordinates.lat,
        location.coordinates.lng,
      ]).addTo(mapRef.current);
    }

    setIsMapLoaded(true);

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [location, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Géolocalisation du bien
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Cliquez sur la carte pour définir l'emplacement exact du bien
        </p>
        
        <div
          id="map"
          className="h-64 rounded-lg overflow-hidden border border-gray-300 relative"
        >
          {!isMapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Loader className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600">Chargement de la carte...</p>
              </div>
            </div>
          )}
        </div>
        
        {location.coordinates && (
          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <p className="flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-blue-500" />
              Coordonnées: {location.coordinates.lat.toFixed(6)},{' '}
              {location.coordinates.lng.toFixed(6)}
            </p>
          </div>
        )}
        
        <div className="mt-3 text-xs text-gray-500">
          <p>💡 Astuce: Une géolocalisation précise améliore la visibilité de votre bien</p>
          <p>🗺️ Cliquez sur la carte pour définir l'emplacement exact</p>
        </div>
      </div>
    </div>
  );
};
