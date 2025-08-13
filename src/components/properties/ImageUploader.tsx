import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { PropertyImage, RoomDetails } from '../../types/property';

interface ImageUploaderProps {
  images: PropertyImage[];
  onImagesChange: (images: PropertyImage[]) => void;
  rooms: RoomDetails[];
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onImagesChange,
  rooms,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null, room?: string) => {
    if (!files) return;

    const newImages: PropertyImage[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      file,
      room: room || 'general',
      isPrimary: images.length === 0 && index === 0,
    }));

    onImagesChange([...images, ...newImages]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeImage = (imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    onImagesChange(updatedImages);
  };

  const setPrimaryImage = (imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId,
    }));
    onImagesChange(updatedImages);
  };

  const updateImageRoom = (imageId: string, room: string) => {
    const updatedImages = images.map(img =>
      img.id === imageId ? { ...img, room } : img
    );
    onImagesChange(updatedImages);
  };

  const updateImageDescription = (imageId: string, description: string) => {
    const updatedImages = images.map(img =>
      img.id === imageId ? { ...img, description } : img
    );
    onImagesChange(updatedImages);
  };

  const roomOptions = [
    { value: 'general', label: 'Vue générale' },
    { value: 'exterior', label: 'Extérieur' },
    ...rooms.map(room => ({
      value: room.type,
      label: room.nom || room.type.replace('_', ' '),
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Images du bien</h3>
        
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Glissez-déposez vos images ici
          </p>
          <p className="text-sm text-gray-500 mb-4">
            ou cliquez pour sélectionner des fichiers
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Sélectionner des images
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Images ajoutées ({images.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="aspect-w-16 aspect-h-12 relative">
                  <img
                    src={image.url}
                    alt="Property"
                    className="w-full h-48 object-cover"
                  />
                  {image.isPrimary && (
                    <div className="absolute top-2 left-2">
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Image principale
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Pièce
                    </label>
                    <select
                      value={image.room}
                      onChange={(e) => updateImageRoom(image.id, e.target.value)}
                      className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {roomOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={image.description || ''}
                      onChange={(e) => updateImageDescription(image.id, e.target.value)}
                      placeholder="Description de l'image..."
                      className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  {!image.isPrimary && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPrimaryImage(image.id)}
                      className="w-full text-xs"
                    >
                      Définir comme principale
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};