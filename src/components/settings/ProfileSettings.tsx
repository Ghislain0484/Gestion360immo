import React, { useState } from 'react';
import { Save, Upload, User, Mail, Phone } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';

export const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    avatar: user?.avatar || '',
  });

  const handleAvatarUpload = (file: File) => {
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, avatar: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation des données
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert('Le prénom et le nom sont obligatoires');
      return;
    }
    
    // Validation email
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert('Format d\'email invalide');
      return;
    }
    
    // Validation téléphone si fourni
    if (formData.phone && !/^(\+225)?[0-9\s-]{8,15}$/.test(formData.phone)) {
      alert('Format de téléphone invalide');
      return;
    }

    setLoading(true);
    try {
      // Pour les utilisateurs de démonstration, mise à jour locale
      if (user.id.startsWith('a1b2c3d4') || user.id.startsWith('c3d4e5f6') || user.id.startsWith('d4e5f6a7')) {
        // Mise à jour des données utilisateur en local storage
        const updatedUser = {
          ...user,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          avatar: formData.avatar,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Profil mis à jour avec succès !');
      } else {
        // Pour les vrais utilisateurs Supabase
        await dbService.updateUser(user.id, {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          avatar: formData.avatar,
        });
        alert('Profil mis à jour avec succès !');
      }
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour du profil. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Informations du profil
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-semibold text-blue-600">
                    {formData.firstName?.[0]}{formData.lastName?.[0]}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
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
              <h4 className="font-medium text-gray-900">Photo de profil</h4>
              <p className="text-sm text-gray-500 mt-1">
                JPG, PNG ou GIF. Taille maximale 2MB.
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              required
              icon={<User className="h-4 w-4" />}
            />
            <Input
              label="Nom"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              required
              icon={<User className="h-4 w-4" />}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
            icon={<Mail className="h-4 w-4" />}
          />

          <Input
            label="Téléphone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+225 XX XX XX XX XX"
            icon={<Phone className="h-4 w-4" />}
          />

          {/* Role Information */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Rôle dans l'agence</p>
              <p className="text-sm text-gray-500">
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