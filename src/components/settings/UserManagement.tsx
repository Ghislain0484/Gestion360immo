import React, { useState, useEffect } from 'react';
import { Plus, Users, Shield, Edit, Trash2, Eye, EyeOff, UserCheck, UserX } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { UserFormData, UserPermissions } from '../../types/agency';
import { useAuth } from '../../contexts/AuthContext';
import { dbService, supabase } from '../../lib/supabase';

export const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'agent',
    agencyId: user?.agencyId || '',
    permissions: {
      dashboard: true,
      properties: false,
      owners: false,
      tenants: false,
      contracts: false,
      collaboration: false,
      reports: false,
      notifications: true,
      settings: false,
      userManagement: false,
    },
    isActive: true,
    password: '',
  });

  const roleLabels = {
    director: 'Directeur',
    manager: 'Chef d\'agence',
    agent: 'Agent',
  };

  const permissionLabels = {
    dashboard: 'Tableau de bord',
    properties: 'Propriétés',
    owners: 'Propriétaires',
    tenants: 'Locataires',
    contracts: 'Contrats',
    collaboration: 'Collaboration',
    reports: 'Rapports',
    notifications: 'Notifications',
    settings: 'Paramètres',
    userManagement: 'Gestion utilisateurs',
  };

  useEffect(() => {
    const loadAgencyUsers = async () => {
      if (!user?.agencyId) {
        setError('Aucune agence associée');
        setLoadingUsers(false);
        return;
      }
      
      setLoadingUsers(true);
      setError(null);
      
      try {
        // Charger les utilisateurs de cette agence uniquement
        const agencyUsersKey = `agency_users_${user.agencyId}`;
        const storedUsers = JSON.parse(localStorage.getItem(agencyUsersKey) || '[]');
        
        // Ajouter l'utilisateur connecté s'il n'est pas dans la liste
        const currentUserExists = storedUsers.find((u: any) => u.id === user.id);
        if (!currentUserExists) {
          const currentUserData = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            agencyId: user.agencyId,
            isActive: true,
            permissions: {
              dashboard: true,
              properties: true,
              owners: true,
              tenants: true,
              contracts: true,
              collaboration: true,
              reports: true,
              notifications: true,
              settings: true,
              userManagement: user.role === 'director',
            },
            createdAt: new Date(),
          };
          storedUsers.unshift(currentUserData);
          localStorage.setItem(agencyUsersKey, JSON.stringify(storedUsers));
        }
        
        setRealUsers(storedUsers);
        console.log(`✅ ${storedUsers.length} utilisateur(s) chargé(s) pour l'agence ${user.agencyId}`);
        
      } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);
        setError('Erreur lors du chargement des utilisateurs');
        setRealUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    loadAgencyUsers();
  }, [user?.agencyId, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation des données
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        throw new Error('Tous les champs obligatoires doivent être remplis');
      }
      
      if (!editingUser && (!formData.password || formData.password.length < 6)) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }
      
      // Validation email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('Format d\'email invalide');
      }
      
      // Vérifier que l'email n'existe pas déjà
      const agencyUsersKey = `agency_users_${user?.agencyId}`;
      const existingUsers = JSON.parse(localStorage.getItem(agencyUsersKey) || '[]');
      const emailExists = existingUsers.find((u: any) => 
        u.email.toLowerCase() === formData.email.toLowerCase() && 
        (!editingUser || u.id !== editingUser.id)
      );
      
      if (emailExists) {
        throw new Error('Cet email est déjà utilisé par un autre utilisateur');
      }
      
      if (editingUser) {
        // Mise à jour utilisateur existant
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role,
          permissions: formData.permissions,
          isActive: formData.isActive,
          updatedAt: new Date(),
        };
        
        const updatedUsers = existingUsers.map((u: any) => 
          u.id === editingUser.id ? { ...u, ...updateData } : u
        );
        
        localStorage.setItem(agencyUsersKey, JSON.stringify(updatedUsers));
        setRealUsers(updatedUsers);
        
        alert('✅ Utilisateur mis à jour avec succès !');
      } else {
        // Création nouvel utilisateur
        const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userData = {
          id: newUserId,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          agencyId: user?.agencyId || '',
          permissions: formData.permissions,
          isActive: formData.isActive,
          password: formData.password,
          createdAt: new Date(),
        };
        
        const updatedUsers = [userData, ...existingUsers];
        localStorage.setItem(agencyUsersKey, JSON.stringify(updatedUsers));
        setRealUsers(updatedUsers);
        
        alert(`✅ UTILISATEUR CRÉÉ AVEC SUCCÈS !
        
👤 NOM : ${formData.firstName} ${formData.lastName}
📧 EMAIL : ${formData.email}
🔑 MOT DE PASSE : ${formData.password}
👔 RÔLE : ${roleLabels[formData.role]}

✅ Le compte a été créé et sauvegardé
✅ L'utilisateur peut maintenant se connecter
✅ Permissions configurées selon le rôle

IDENTIFIANTS DE CONNEXION :
Email : ${formData.email}
Mot de passe : ${formData.password}

L'utilisateur peut maintenant se connecter avec ces identifiants.`);
      }
      
      setShowUserForm(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error('❌ Erreur gestion utilisateur:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'agent',
      agencyId: user?.agencyId || '',
      permissions: {
        dashboard: true,
        properties: false,
        owners: false,
        tenants: false,
        contracts: false,
        collaboration: false,
        reports: false,
        notifications: true,
        settings: false,
        userManagement: false,
      },
      isActive: true,
      password: '',
    });
  };

  const handleEdit = (userData: any) => {
    setEditingUser(userData);
    setFormData({
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      agencyId: userData.agencyId || user?.agencyId || '',
      permissions: userData.permissions,
      isActive: userData.isActive,
      password: '',
    });
    setShowUserForm(true);
  };

  const toggleUserStatus = (userId: string) => {
    const agencyUsersKey = `agency_users_${user?.agencyId}`;
    const updatedUsers = realUsers.map(u => 
      u.id === userId ? { ...u, isActive: !u.isActive, updatedAt: new Date() } : u
    );
    
    localStorage.setItem(agencyUsersKey, JSON.stringify(updatedUsers));
    setRealUsers(updatedUsers);
  };

  const deleteUser = (userId: string) => {
    if (userId === user?.id) {
      alert('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      const agencyUsersKey = `agency_users_${user?.agencyId}`;
      const updatedUsers = realUsers.filter(u => u.id !== userId);
      
      localStorage.setItem(agencyUsersKey, JSON.stringify(updatedUsers));
      setRealUsers(updatedUsers);
      
      alert('✅ Utilisateur supprimé avec succès');
    }
  };

  const updatePermission = (key: keyof UserPermissions, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: value }
    }));
  };

  const getRolePermissions = (role: string): Partial<UserPermissions> => {
    switch (role) {
      case 'director':
        return Object.keys(permissionLabels).reduce((acc, key) => ({
          ...acc,
          [key]: true
        }), {} as UserPermissions);
      case 'manager':
        return {
          dashboard: true,
          properties: true,
          owners: true,
          tenants: true,
          contracts: true,
          collaboration: true,
          reports: true,
          notifications: true,
          settings: false,
          userManagement: false,
        };
      case 'agent':
        return {
          dashboard: true,
          properties: true,
          owners: true,
          tenants: true,
          contracts: false,
          collaboration: false,
          reports: false,
          notifications: true,
          settings: false,
          userManagement: false,
        };
      default:
        return {};
    }
  };

  const handleRoleChange = (role: string) => {
    const rolePermissions = getRolePermissions(role);
    setFormData(prev => ({
      ...prev,
      role: role as UserFormData['role'],
      permissions: { ...prev.permissions, ...rolePermissions }
    }));
  };

  if (user?.role !== 'director') {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès restreint
        </h3>
        <p className="text-gray-600">
          Seuls les directeurs peuvent gérer les utilisateurs.
        </p>
      </Card>
    );
  }

  if (loadingUsers) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Gestion des utilisateurs
          </h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-16 w-16 mx-auto mb-4 text-red-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Erreur de chargement
        </h3>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Gestion des utilisateurs
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Créez et gérez les comptes de vos employés ({realUsers.length} utilisateur{realUsers.length > 1 ? 's' : ''})
          </p>
        </div>
        <Button onClick={() => setShowUserForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {realUsers.length > 0 ? realUsers.map((userData) => (
          <Card key={userData.id}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {userData.firstName[0]}{userData.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {userData.firstName} {userData.lastName}
                      {userData.id === user?.id && (
                        <span className="text-xs text-blue-600 ml-2">(Vous)</span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-500">{userData.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={userData.role === 'director' ? 'success' : userData.role === 'manager' ? 'warning' : 'info'} 
                    size="sm"
                  >
                    {roleLabels[userData.role as keyof typeof roleLabels]}
                  </Badge>
                  <Badge 
                    variant={userData.isActive ? 'success' : 'secondary'} 
                    size="sm"
                  >
                    {userData.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">Permissions actives :</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(userData.permissions || {})
                    .filter(([_, enabled]) => enabled)
                    .slice(0, 4)
                    .map(([key]) => (
                      <Badge key={key} variant="secondary" size="sm">
                        {permissionLabels[key as keyof typeof permissionLabels]}
                      </Badge>
                    ))}
                  {Object.values(userData.permissions || {}).filter(Boolean).length > 4 && (
                    <Badge variant="secondary" size="sm">
                      +{Object.values(userData.permissions || {}).filter(Boolean).length - 4}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-500">
                  Créé le {new Date(userData.createdAt).toLocaleDateString('fr-FR')}
                </span>
                <div className="flex space-x-1">
                  {userData.id !== user?.id && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserStatus(userData.id)}
                      >
                        {userData.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(userData)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUser(userData.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )) : (
          <div className="col-span-2 text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun utilisateur dans votre agence
            </h3>
            <p className="text-gray-600 mb-4">
              Commencez par créer des comptes pour vos employés.
            </p>
            <Button onClick={() => setShowUserForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier utilisateur
            </Button>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <Modal
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false);
          setEditingUser(null);
          resetForm();
        }}
        title={editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              required
            />
            <Input
              label="Nom"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
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

          {!editingUser && (
            <Input
              label="Mot de passe temporaire"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              helperText="L'utilisateur devra changer ce mot de passe à sa première connexion"
            />
          )}

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rôle
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="agent">Agent</option>
              <option value="manager">Chef d'agence</option>
            </select>
          </div>

          {/* Permissions */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Permissions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.permissions[key as keyof UserPermissions]}
                    onChange={(e) => updatePermission(key as keyof UserPermissions, e.target.checked)}
                    disabled={key === 'userManagement' && formData.role !== 'director'}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Compte actif
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowUserForm(false);
                setEditingUser(null);
                resetForm();
              }}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={loading}>
              {editingUser ? 'Mettre à jour' : 'Créer l\'utilisateur'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};