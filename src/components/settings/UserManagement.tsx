import React, { useState, useEffect } from 'react';
import { Plus, Users, Shield, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { UserFormData, UserPermissions } from '../../types/agency';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [agencyUsers, setAgencyUsers] = useState<any[]>([]);
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
        // Charger les utilisateurs de cette agence depuis Supabase
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select(`
            *,
            agency_users (
              role,
              created_at
            )
          `)
          .eq('agency_users.agency_id', user.agencyId)
          .order('created_at', { ascending: false });

        if (usersError) throw usersError;

        // Filtrer et mapper les données
        const formattedUsers = usersData.map(u => ({
          ...u,
          role: u.agency_users?.[0]?.role || 'agent',
        }));

        setAgencyUsers(formattedUsers);
        console.log(`✅ ${formattedUsers.length} utilisateur(s) chargé(s) pour l'agence ${user.agencyId}`);
        
      } catch (err) {
        console.error('❌ Erreur chargement utilisateurs:', err);
        setError('Erreur lors du chargement des utilisateurs');
        setAgencyUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    loadAgencyUsers();
  }, [user?.agencyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation des données
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        throw new Error('Tous les champs obligatoires doivent être remplis');
      }
      
      if (!editingUser && (!formData.password || formData.password.length < 8)) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }
      
      // Validation email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('Format d\'email invalide');
      }
      
      // Vérifier que l'email n'existe pas déjà
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .neq(editingUser ? 'id' : 'fake_id', editingUser?.id || 'none')
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      if (existingUser) {
        throw new Error('Cet email est déjà utilisé par un autre utilisateur');
      }
      
      let userId: string | undefined;
      let authUser: any;

      if (editingUser) {
        // Mise à jour utilisateur existant
        const { error: updateError } = await supabase
          .from('users')
          .update({
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            permissions: formData.permissions,
            is_active: formData.isActive,
            updated_at: new Date(),
          })
          .eq('id', editingUser.id);

        if (updateError) throw updateError;

        // Mise à jour du rôle dans agency_users
        const { error: roleError } = await supabase
          .from('agency_users')
          .update({ role: formData.role })
          .eq('user_id', editingUser.id)
          .eq('agency_id', user?.agencyId);

        if (roleError) throw roleError;

        userId = editingUser.id;
        alert('✅ Utilisateur mis à jour avec succès !');
      } else {
        // Création nouvel utilisateur avec Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password.trim(),
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              role: formData.role,
              agency_id: formData.agencyId,
            }
          }
        });

        if (authError) throw authError;
        authUser = authData.user;

        if (!authUser) throw new Error('Erreur lors de la création de l\'utilisateur auth');

        // Insérer dans la table users (lié à auth.users.id)
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: formData.email,
            first_name: formData.firstName,
            last_name: formData.lastName,
            permissions: formData.permissions,
            is_active: formData.isActive,
            created_at: new Date(),
            updated_at: new Date(),
          });

        if (userError) {
          // Nettoyage si erreur: supprimer l'utilisateur auth
          await supabase.auth.admin.deleteUser(authUser.id);
          throw userError;
        }

        // Insérer dans agency_users
        const { error: agencyUserError } = await supabase
          .from('agency_users')
          .insert({
            user_id: authUser.id,
            agency_id: formData.agencyId,
            role: formData.role,
            created_at: new Date(),
          });

        if (agencyUserError) {
          // Nettoyage
          await supabase.from('users').delete().eq('id', authUser.id);
          await supabase.auth.admin.deleteUser(authUser.id);
          throw agencyUserError;
        }

        userId = authUser.id;
        alert(`✅ UTILISATEUR CRÉÉ AVEC SUCCÈS !
        
👤 NOM : ${formData.firstName} ${formData.lastName}
📧 EMAIL : ${formData.email}
🔑 MOT DE PASSE TEMPORAIRE : ${formData.password}
👔 RÔLE : ${roleLabels[formData.role]}

✅ Le compte a été créé dans Supabase Auth
✅ L'utilisateur peut maintenant se connecter
✅ Permissions et rôle configurés

L'utilisateur doit confirmer son email si la vérification est activée, et changer son mot de passe à la première connexion.`);
      }

      // Recharger la liste des utilisateurs
      const { data: updatedUsers } = await supabase
        .from('users')
        .select(`
          *,
          agency_users (
            role,
            created_at
          )
        `)
        .eq('agency_users.agency_id', user?.agencyId);
      
      setAgencyUsers(updatedUsers?.map(u => ({
        ...u,
        role: u.agency_users?.[0]?.role || 'agent',
      })) || []);
      
      setShowUserForm(false);
      setEditingUser(null);
      resetForm();
    } catch (err) {
      console.error('❌ Erreur gestion utilisateur:', err);
      alert(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
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
      firstName: userData.first_name,
      lastName: userData.last_name,
      role: userData.role,
      agencyId: userData.agency_id || user?.agencyId || '',
      permissions: userData.permissions,
      isActive: userData.is_active,
      password: '',
    });
    setShowUserForm(true);
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      const { data: currentUser } = await supabase
        .from('users')
        .select('is_active')
        .eq('id', userId)
        .single();

      const newStatus = !currentUser?.is_active;

      const { error } = await supabase
        .from('users')
        .update({ is_active: newStatus, updated_at: new Date() })
        .eq('id', userId);

      if (error) throw error;

      setAgencyUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_active: newStatus } : u
      ));
    } catch (err) {
      console.error('Erreur toggle status:', err);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === user?.id) {
      alert('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cela supprimera aussi son compte auth.')) {
      try {
        // Supprimer de agency_users
        await supabase.from('agency_users').delete().eq('user_id', userId);
        
        // Supprimer de users (cascade vers auth.users via trigger/FK)
        const { error: deleteError } = await supabase.from('users').delete().eq('id', userId);
        if (deleteError) throw deleteError;

        // Supprimer l'utilisateur auth (au cas où)
        await supabase.auth.admin.deleteUser(userId);

        setAgencyUsers(prev => prev.filter(u => u.id !== userId));
        alert('✅ Utilisateur supprimé avec succès');
      } catch (err) {
        console.error('Erreur suppression:', err);
        alert('Erreur lors de la suppression');
      }
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
            Créez et gérez les comptes de vos employés ({agencyUsers.length} utilisateur{agencyUsers.length > 1 ? 's' : ''})
          </p>
        </div>
        <Button onClick={() => setShowUserForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agencyUsers.length > 0 ? agencyUsers.map((userData) => (
          <Card key={userData.id}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {userData.first_name[0]}{userData.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {userData.first_name} {userData.last_name}
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
                    variant={userData.is_active ? 'success' : 'secondary'} 
                    size="sm"
                  >
                    {userData.is_active ? 'Actif' : 'Inactif'}
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
                  Créé le {new Date(userData.created_at).toLocaleDateString('fr-FR')}
                </span>
                <div className="flex space-x-1">
                  {userData.id !== user?.id && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserStatus(userData.id)}
                      >
                        {userData.is_active ? (
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
              helperText="L'utilisateur devra changer ce mot de passe à sa première connexion. Minimum 8 caractères."
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
              <option value="director">Directeur</option>
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