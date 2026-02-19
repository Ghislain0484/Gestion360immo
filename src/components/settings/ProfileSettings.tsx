import React, { useState, useEffect } from 'react';
import { Save, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { supabase } from '../../lib/config';

export const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
  });

  // 🔹 Synchroniser formData avec user quand user change
  useEffect(() => {
    console.log('🔍 ProfileSettings: user data:', user);
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const handleAvatarUpload = (file: File) => {
    if (!user?.id) {
      toast.error('Utilisateur non authentifié pour upload avatar');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier doit être inférieur à 2 Mo');
      return;
    }
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, avatar: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    // --- Validation ---
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('Le prénom et le nom sont obligatoires');
      return;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Format d\'email invalide');
      return;
    }
    if (formData.phone && !/^(\+225)?[0-9\s-]{8,15}$/.test(formData.phone)) {
      toast.error('Format de téléphone invalide');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Mise à jour profil utilisateur...');

      let avatarUrl = formData.avatar;

      // Upload de l'avatar si fichier présent et Supabase configuré
      if (avatarFile && supabase) {
        try {
          console.log('📤 Upload avatar vers Supabase Storage...');
          const ext = avatarFile.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, avatarFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.warn('⚠️ Erreur upload avatar:', uploadError);
            toast.error('Erreur lors de l\'upload de l\'avatar');
          } else {
            const { data } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);

            avatarUrl = data?.publicUrl || avatarUrl;
            console.log('✅ Avatar uploadé:', avatarUrl);
            toast.success('Avatar mis à jour avec succès');
          }
        } catch (uploadError) {
          console.warn('⚠️ Erreur upload avatar, utilisation URL locale', uploadError);
          toast.error('Erreur lors de l\'upload de l\'avatar');
        }
      }

      // --- Mise à jour du profil ---
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        avatar: avatarUrl,
        phone: formData.phone,
      };

      console.log('📝 Données à sauvegarder:', updateData);

      const result = await dbService.users.update(user.id, updateData);
      console.log('✅ Profil sauvegardé:', result);

      // --- Mettre à jour localStorage ---
      const updatedUser = {
        ...user,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        avatar: avatarUrl,
        phone: formData.phone,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('✅ Profil mis à jour avec succès !');
      // window.location.reload(); // Optionnel : rafraîchir pour recharger useAuth

    } catch (err) {
      console.error('❌ Erreur mise à jour profil:', err);
      toast.error('❌ Erreur lors de la mise à jour du profil. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Informations du profil
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
                    {formData.first_name?.[0]}{formData.last_name?.[0]}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-all duration-200 hover:scale-110 shadow-lg"
              >
                <Upload className="h-3 w-3" />
              </button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                }}
              />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Photo de profil</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                JPG, PNG ou GIF. Taille maximale 2MB.
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              value={formData.first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              required
            />
            <Input
              label="Nom"
              value={formData.last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
          />

          <Input
            label="Téléphone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+225 XX XX XX XX XX"
          />

          {/* Role Information */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Rôle dans l'agence</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Votre niveau d'accès dans l'agence
              </p>
            </div>
            <Badge variant="info" size="sm">
              {user?.role === 'director' ? 'Directeur' :
                user?.role === 'manager' ? 'Chef d\'agence' : 'Agent'}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="ghost">
              Annuler
            </Button>
            <Button type="submit" isLoading={loading}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
};