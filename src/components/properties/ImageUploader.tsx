import React, { useState, useCallback } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { PropertyImage, RoomDetails } from '../../types/db';
import { supabase } from '../../lib/config';
import { toast } from 'react-hot-toast';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

interface ImageUploaderProps {
  images: PropertyImage[];
  onImagesChange: (images: PropertyImage[]) => void;
  rooms: RoomDetails[];
}

const BUCKET_NAME = 'property-images';

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');

const createStoragePath = (prefix: string, fileName: string) => {
  const safeName = sanitizeFileName(fileName);
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${Date.now()}-${randomSuffix}-${safeName}`;
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onImagesChange, rooms }) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const agencyPrefix = user?.agency_id ? `agencies/${user.agency_id}` : 'public';

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) {
        return;
      }

      setUploading(true);
      const selectedFiles = Array.from(fileList);

      try {
        const uploaded = await Promise.all(
          selectedFiles.map(async (file) => {
            const storagePath = createStoragePath(agencyPrefix, file.name);
            const { data, error } = await supabase.storage
              .from(BUCKET_NAME)
              .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false,
              });

            if (error || !data?.path) {
              throw new Error(`Televersement impossible pour ${file.name}: ${error?.message ?? 'bucket introuvable'}`);
            }

            const { data: urlData, error: urlError } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
            if (urlError || !urlData?.publicUrl) {
              throw new Error(`Impossible de recuperer le lien pour ${file.name}`);
            }

            const isFirstImage = images.length === 0;
            return {
              id: data.path,
              url: urlData.publicUrl,
              description: '',
              isPrimary: isFirstImage,
              room: '',
            } as PropertyImage;
          }),
        );

        const merged = [...images];
        uploaded.forEach((image) => {
          if (!merged.some((img) => img.isPrimary)) {
            merged.push({ ...image, isPrimary: merged.length === 0 });
          } else {
            merged.push(image);
          }
        });

        if (merged.length > 0 && !merged.some((img) => img.isPrimary)) {
          merged[0].isPrimary = true;
        }

        onImagesChange(merged);
        toast.success('Images televersees avec succes');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors du televersement';
        toast.error(message);
      } finally {
        setUploading(false);
        event.target.value = '';
      }
    },
    [agencyPrefix, images, onImagesChange],
  );

  const removeImage = useCallback(
    async (imageId: string) => {
      try {
        const { error } = await supabase.storage.from(BUCKET_NAME).remove([imageId]);
        if (error) {
          throw new Error(`Suppression impossible: ${error.message}`);
        }

        const updated = images.filter((img) => img.id !== imageId);
        if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
          updated[0].isPrimary = true;
        }
        onImagesChange(updated);
        toast.success('Image supprimee avec succes');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
        toast.error(message);
      }
    },
    [images, onImagesChange],
  );

  const setPrimaryImage = useCallback(
    (imageId: string) => {
      const updated = images.map((img) => ({
        ...img,
        isPrimary: img.id === imageId,
      }));
      onImagesChange(updated);
    },
    [images, onImagesChange],
  );

  const updateImageRoom = useCallback(
    (imageId: string, room: string) => {
      const updated = images.map((img) => (img.id === imageId ? { ...img, room } : img));
      onImagesChange(updated);
    },
    [images, onImagesChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Images ({images.length})</h3>
        <label className="cursor-pointer">
          <Button disabled={uploading} aria-label="Televerser des images">
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Televersement...' : 'Televerser des images'}
          </Button>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
            aria-label="Selectionner des images"
          />
        </label>
      </div>

      {images.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <Upload className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>Aucune image televersee</p>
          <p className="text-sm">Ajoutez des visuels pour valoriser le bien</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <Card key={image.id} className="p-2">
              <div className="relative">
                <img src={image.url} alt={image.description || 'Image'} className="h-32 w-full rounded-md object-cover" />
                {image.isPrimary && (
                  <Badge variant="success" className="absolute left-2 top-2">
                    Principale
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 text-red-600 hover:text-red-700"
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
                      images.map((img) => (img.id === image.id ? { ...img, description: e.target.value } : img)),
                    )
                  }
                  placeholder="Description de l'image"
                  aria-label={`Description de l'image ${image.id}`}
                />
                <select
                  value={image.room || ''}
                  onChange={(e) => updateImageRoom(image.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Associer l'image ${image.id} a une piece`}
                >
                  <option value="">Aucune piece</option>
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
                  aria-label={`Definir l'image ${image.id} comme principale`}
                >
                  Definir comme principale
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
