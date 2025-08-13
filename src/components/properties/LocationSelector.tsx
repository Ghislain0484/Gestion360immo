import React, { useState, useEffect } from 'react';
import { MapPin, Loader } from 'lucide-react';
import { PropertyFormData } from '../../types/property';

interface LocationSelectorProps {
  location: PropertyFormData['location'];
  onChange: (location: PropertyFormData['location']) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  location,
  onChange,
}) => {
  const [mapPosition, setMapPosition] = useState<[number, number]>([5.3364, -4.0267]); // Abidjan coordinates
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    // Load Google Maps API
    const loadGoogleMaps = async () => {
      try {
        // For demo purposes, we'll simulate map loading
        setTimeout(() => {
          setIsMapLoaded(true);
        }, 1000);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapError(true);
        setIsMapLoaded(true);
      }
    };

    loadGoogleMaps();
  }, []);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert click position to approximate coordinates (mock calculation)
    const lat = 5.3364 + (y - rect.height / 2) * 0.001;
    const lng = -4.0267 + (x - rect.width / 2) * 0.001;
    
    onChange({
      ...location,
      coordinates: { lat, lng },
    });
  };

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
          className="h-64 rounded-lg overflow-hidden border border-gray-300 bg-gray-100 relative cursor-crosshair"
          onClick={handleMapClick}
        >
          {!isMapLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <Loader className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600">Chargement de la carte...</p>
              </div>
            </div>
          ) : mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-gray-600">Cliquez pour placer le marqueur</p>
                <p className="text-xs text-gray-500 mt-1">Carte interactive - Abidjan, Côte d'Ivoire</p>
                <p className="text-xs text-red-500 mt-2">API Google Maps non configurée - Mode démonstration</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-2 text-blue-500" />
                <p className="text-sm text-gray-600">Cliquez pour placer le marqueur</p>
                <p className="text-xs text-gray-500 mt-1">Carte Google Maps - Abidjan, Côte d'Ivoire</p>
              </div>
            </div>
          )}
          
          {/* Marker */}
          {location.coordinates && (
            <div 
              className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${50 + (location.coordinates.lng + 4.0267) * 100}%`,
                top: `${50 - (location.coordinates.lat - 5.3364) * 100}%`,
              }}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
          
          {/* Grid overlay for visual reference */}
          <div className="absolute inset-0 opacity-20">
            <div className="grid grid-cols-8 grid-rows-6 h-full">
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="border border-gray-300"></div>
              ))}
            </div>
          </div>
        </div>
        
        {location.coordinates && (
          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            <p className="flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-blue-500" />
              Coordonnées: {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
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