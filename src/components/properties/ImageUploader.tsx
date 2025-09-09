import React, { useState, useCallback } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { PropertyImage, RoomDetails } from '../../types/db';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Badge } from '../ui/Badge';

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
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || event.target.files.length === 0) return;

      setUploading(true);
      const newImages: PropertyImage[] = [];

      try {
        for (const file of Array.from(event.target.files)) {
          const fileName = `${Date.now()}_${file.name}`;
          const { data, error } = await supabase.storage
            .from('property-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (error) {
            throw new Error(`Erreur lors du téléversement de ${file.name}: ${error.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('property-images')
            .getPublicUrl(fileName);

          newImages.push({
            id: data.path,
            url: urlData.publicUrl,
            description: '',
            isPrimary: images.length === 0 && newImages.length === 0,
            room: '', // Use empty string as default, matches PropertyImage type
          });
        }

        onImagesChange([...images, ...newImages]);
        toast.success('Images téléversées avec succès');
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Erreur lors du téléversement';
        toast.error(errMsg);
      } finally {
        setUploading(false);
        event.target.value = ''; // Reset input
      }
    },
    [images, onImagesChange]
  );

  const removeImage = useCallback(
    async (imageId: string) => {
      try {
        const { error } = await supabase.storage
          .from('property-images')
          .remove([imageId]);

        if (error) {
          throw new Error(`Erreur lors de la suppression de l'image: ${error.message}`);
        }

        const updatedImages = images.filter((img) => img.id !== imageId);
        if (updatedImages.length > 0 && !updatedImages.some((img) => img.isPrimary)) {
          updatedImages[0].isPrimary = true;
        }
        onImagesChange(updatedImages);
        toast.success('Image supprimée avec succès');
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Erreur lors de la suppression';
        toast.error(errMsg);
      }
    },
    [images, onImagesChange]
  );

  const setPrimaryImage = useCallback(
    (imageId: string) => {
      const updatedImages = images.map((img) => ({
        ...img,
        isPrimary: img.id === imageId,
      }));
      onImagesChange(updatedImages);
    },
    [images, onImagesChange]
  );

  const updateImageRoom = useCallback(
    (imageId: string, room: string) => {
      const updatedImages = images.map((img) =>
        img.id === imageId ? { ...img, room } : img
      );
      onImagesChange(updatedImages);
    },
    [images, onImagesChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Images ({images.length})</h3>
        <label className="cursor-pointer">
          <Button disabled={uploading} aria-label="Téléverser des images">
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Téléversement...' : 'Téléverser des images'}
          </Button>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
            aria-label="Sélectionner des images"
          />
        </label>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Aucune image téléversée</p>
          <p className="text-sm">Téléversez des images pour illustrer la propriété</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <Card key={image.id} className="p-2">
              <div className="relative">
                <img
                  src={image.url}
                  alt={image.description || 'Image'}
                  className="w-full h-32 object-cover rounded-md"
                />
                {image.isPrimary && (
                  <Badge variant="success" className="absolute top-2 left-2">
                    Principale
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                  onClick={() => removeImage(image.id)}
                  aria-label={`Supprimer l'image ${image.description || image.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                <Input
                  value={image.description || ''}
                  onChange={(e) =>
                    onImagesChange(
                      images.map((img) =>
                        img.id === image.id ? { ...img, description: e.target.value } : img
                      )
                    )
                  }
                  placeholder="Description de l'image"
                  aria-label={`Description de l'image ${image.id}`}
                />
                <select
                  value={image.room || ''}
                  onChange={(e) => updateImageRoom(image.id, e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Associer l'image ${image.id} à une pièce`}
                >
                  <option value="">Aucune pièce</option>
                  {rooms.map((room) => (
                    <option key={room.id || room.type} value={room.id || room.type}>
                      {room.nom || room.type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPrimaryImage(image.id)}
                  disabled={image.isPrimary}
                  aria-label={`Définir l'image ${image.id} comme principale`}
                >
                  Définir comme principale
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};