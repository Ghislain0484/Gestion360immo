import React, { useState, useEffect } from 'react';
import { Plus, Users, Shield, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { UserFormData, UserPermissions, User } from '../../types/db';
import { AgencyUserRole } from '../../types/enums';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { supabase } from '../../lib/config';
import toast from 'react-hot-toast';

interface AuthUser extends User {
  role: AgencyUserRole;
  agency_id: string | undefined;
}

interface ExtendedUser extends User {
  role: AgencyUserRole;
  agency_id: string | undefined;
}

export const UserManagement: React.FC = () => {
  const { user } = useAuth() as { user: AuthUser | null };
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [realUsers, setRealUsers] = useState<ExtendedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'agent',
    agency_id: user?.agency_id || undefined,
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
    is_active: true,
    password: '',
  });

  const checkEmail = async (email: string) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || editingUser) {
      setIsExistingUser(false);
      return;
    }

    setCheckingEmail(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (data) {
        setIsExistingUser(true);
        // Pré-remplir les noms si vides pour ne pas écraser les données existantes
        setFormData(prev => ({
          ...prev,
          first_name: prev.first_name || data.first_name || '',
          last_name: prev.last_name || data.last_name || '',
          password: '', // On vide le mot de passe car inutile pour un utilisateur existant
        }));
      } else {
        setIsExistingUser(false);
      }
    } catch (err) {
      console.error('Error checking email:', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const roleLabels: Record<AgencyUserRole, string> = {
    director: 'Directeur',
    manager: "Chef d'agence",
    agent: 'Agent',
  };

  const permissionLabels: Record<keyof UserPermissions, string> = {
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
      if (!user?.agency_id) {
        setError('Votre compte n’est pas encore associé à une agence. Veuillez attendre l’approbation de votre demande d’enregistrement.');
        setLoadingUsers(false);
        return;
      }

      setLoadingUsers(true);
      setError(null);

      try {
        console.log('Loading users for agency:', user.agency_id);
        const users = await dbService.users.getByAgency(user.agency_id);
        console.log('Fetched users:', users);
        setRealUsers(users);
        console.log(
          `✅ ${users.length} utilisateur(s) chargé(s) pour l'agence ${user.agency_id
          } à ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}`
        );
      } catch (error: any) {
        console.error('❌ Erreur chargement utilisateurs:', error.message, error.stack);
        setError(`Erreur lors du chargement des utilisateurs: ${error.message}`);
        setRealUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadAgencyUsers();
  }, [user?.agency_id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('🚀 UserManagement: handleSubmit triggered', {
      isExistingUser,
      editingUser: !!editingUser,
      email: formData.email
    });
    setLoading(true);

    if (!user?.agency_id) {
      console.warn('⚠️ UserManagement: No agency_id found in context');
      toast.error('Aucune agence associée. Veuillez attendre l’approbation de votre demande.');
      setLoading(false);
      return;
    }

    try {
      // 0. Validation basique
      if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
        throw new Error('Tous les champs obligatoires doivent être remplis');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error("Format d'email invalide");
      }

      const emailLower = formData.email.toLowerCase();

      if (editingUser) {
        console.log('📝 Updating existing agency user:', editingUser.id);

        if (emailLower !== editingUser.email.toLowerCase()) {
          const { data: emailOwner } = await supabase
            .from('users')
            .select('id')
            .eq('email', emailLower)
            .maybeSingle();

          if (emailOwner && emailOwner.id !== editingUser.id) {
            throw new Error('Cet email est déjà utilisé par un autre utilisateur');
          }
        }

        const updatedUser = await dbService.users.update(editingUser.id, {
          email: emailLower,
          first_name: formData.first_name,
          last_name: formData.last_name,
          is_active: formData.is_active,
          permissions: formData.permissions,
          updated_at: new Date().toISOString(),
        });

        await dbService.agencyUsers.update(editingUser.id, {
          role: formData.role,
          updated_at: new Date().toISOString(),
        });

        setRealUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                ...u,
                email: emailLower,
                first_name: formData.first_name,
                last_name: formData.last_name,
                is_active: formData.is_active,
                permissions: formData.permissions,
                role: formData.role,
                agency_id: user.agency_id,
                updated_at: new Date().toISOString(),
              }
              : u
          )
        );

        await dbService.auditLogs.insert({
          user_id: user.id || null,
          action: 'user_updated',
          table_name: 'users',
          record_id: editingUser.id,
          new_values: {
            email: emailLower,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
          },
          ip_address: '0.0.0.0',
          user_agent: navigator.userAgent,
        });

        toast.success(`✅ Utilisateur mis à jour avec succès !`);
      } else {
        // CRÉATION OU AJOUT
        console.log('🔍 Checking global existence for:', emailLower);

        // 1. Chercher si l'utilisateur existe déjà dans le système
        const { data: globalUser, error: globalError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, is_active, permissions, created_at')
          .eq('email', emailLower)
          .maybeSingle();

        if (globalError) throw new Error(`Erreur recherche système: ${globalError.message}`);

        const userExistsGlobally = !!globalUser;
        console.log('📊 Result:', { userExistsGlobally, globalId: globalUser?.id });

        // 2. Validation du mot de passe (UNIQUEMENT si nouveau compte requis)
        if (!userExistsGlobally && (!formData.password || formData.password.length < 8)) {
          console.error('❌ Validation failed: Password required for new account');
          throw new Error('Le mot de passe doit contenir au moins 8 caractères');
        }

        let targetUserId: string;
        let isNewAccount = false;
        let finalUserObj: any;

        if (userExistsGlobally && globalUser) {
          targetUserId = globalUser.id;
          finalUserObj = globalUser;
          console.log('🔗 Reusing global user ID:', targetUserId);

          // Vérifier doublon agence
          const { data: checkLink } = await supabase
            .from('agency_users')
            .select('user_id')
            .eq('user_id', targetUserId)
            .eq('agency_id', user.agency_id)
            .maybeSingle();

          if (checkLink) throw new Error('Cet utilisateur fait déjà partie de cette agence');
        } else {
          // Nouveau compte Auth
          isNewAccount = true;
          console.log('🆕 Creating new Auth account...');
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: emailLower,
            password: formData.password!,
            options: {
              data: { first_name: formData.first_name, last_name: formData.last_name },
              emailRedirectTo: `${window.location.origin}/login`,
            },
          });

          if (authError || !authData.user) {
            throw new Error(authError?.message || "Erreur création compte Auth");
          }
          targetUserId = authData.user.id;
          console.log('✅ Auth account created:', targetUserId);

          // Créer dans public.users
          const newUser = await dbService.users.create({
            id: targetUserId,
            email: emailLower,
            first_name: formData.first_name,
            last_name: formData.last_name,
            is_active: formData.is_active,
            permissions: formData.permissions,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          finalUserObj = newUser;
        }

        // 3. Liaison agence
        await dbService.agencyUsers.create({
          user_id: targetUserId,
          agency_id: user.agency_id,
          role: formData.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Mise à jour locale de la liste
        setRealUsers((prev) => [
          {
            ...finalUserObj,
            role: formData.role,
            agency_id: user.agency_id as string,
          } as ExtendedUser,
          ...prev,
        ]);

        // Audit Log (Optionnel, ne doit pas faire échouer l'action principale)
        try {
          await dbService.auditLogs.insert({
            user_id: user?.id || null,
            action: isNewAccount ? 'user_created' : 'user_added_to_agency',
            table_name: 'users',
            record_id: targetUserId,
            new_values: {
              email: emailLower,
              role: formData.role,
              agency_id: user.agency_id,
              is_new_account: isNewAccount,
              timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
            },
            ip_address: '0.0.0.0',
            user_agent: navigator.userAgent,
          });
        } catch (e) {
          console.warn('⚠️ Audit log failed (RLS?):', e);
        }

        toast.success(
          isNewAccount
            ? `✅ Nouveau compte créé et lié à l'agence !`
            : `✅ Utilisateur existant ajouté à votre agence !`
        );
      }

      setShowUserForm(false);
      setEditingUser(null);
      resetForm();
    } catch (error: any) {
      console.error('❌ Erreur gestion utilisateur:', error.message, error.stack);
      toast.error(`Erreur: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'agent',
      agency_id: user?.agency_id || '',
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
      is_active: true,
      password: '',
    });
  };

  const handleEdit = (userData: ExtendedUser) => {
    setEditingUser(userData);
    setFormData({
      id: userData.id,
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
      agency_id: userData.agency_id,
      permissions: userData.permissions,
      is_active: userData.is_active,
      password: '',
    });
    setShowUserForm(true);
  };

  const toggleUserStatus = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('Vous ne pouvez pas modifier votre propre statut');
      return;
    }

    const userToUpdate = realUsers.find((u) => u.id === userId);
    if (!userToUpdate) return;

    try {
      console.log('Toggling user status:', userId);
      const updatedUser = await dbService.users.update(userId, {
        is_active: !userToUpdate.is_active,
        updated_at: new Date().toISOString(),
      });
      console.log('User status updated:', updatedUser);

      setRealUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, is_active: !u.is_active, updated_at: new Date().toISOString() }
            : u
        )
      );

      await dbService.auditLogs.insert({
        user_id: user?.id || null,
        action: 'user_status_toggled',
        table_name: 'users',
        record_id: userId,
        new_values: {
          is_active: !userToUpdate.is_active,
          timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
        },
        ip_address: '0.0.0.0',
        user_agent: navigator.userAgent,
      });

      toast.success(
        `✅ Statut de l'utilisateur modifié à ${new Date().toLocaleString('fr-FR', {
          timeZone: 'Africa/Abidjan',
        })}`
      );
    } catch (error: any) {
      console.error('❌ Erreur lors du changement de statut:', error.message, error.stack);
      toast.error(`Erreur lors du changement de statut: ${error.message}`);
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      console.log('Deleting agency_users entry:', userId);
      await dbService.agencyUsers.delete(userId);
      console.log('Agency user deleted');

      console.log('Deleting user:', userId);
      await dbService.users.delete(userId);
      console.log('User deleted');

      setRealUsers((prev) => prev.filter((u) => u.id !== userId));

      await dbService.auditLogs.insert({
        user_id: user?.id || null,
        action: 'user_deleted',
        table_name: 'users',
        record_id: userId,
        new_values: {
          timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
        },
        ip_address: '0.0.0.0',
        user_agent: navigator.userAgent,
      });

      toast.success(
        `✅ Utilisateur supprimé avec succès à ${new Date().toLocaleString('fr-FR', {
          timeZone: 'Africa/Abidjan',
        })}`
      );
    } catch (error: any) {
      console.error('❌ Erreur suppression utilisateur:', error.message, error.stack);
      toast.error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
    }
  };

  const updatePermission = (key: keyof UserPermissions, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: value },
    }));
  };

  const getRolePermissions = (role: AgencyUserRole): UserPermissions => {
    switch (role) {
      case 'director':
        return {
          dashboard: true,
          properties: true,
          owners: true,
          tenants: true,
          contracts: true,
          collaboration: true,
          reports: true,
          notifications: true,
          settings: true,
          userManagement: true,
        };
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
        return {
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
        };
    }
  };

  const handleRoleChange = (role: string) => {
    const rolePermissions = getRolePermissions(role as AgencyUserRole);
    setFormData((prev) => ({
      ...prev,
      role: role as AgencyUserRole,
      permissions: { ...prev.permissions, ...rolePermissions },
    }));
  };

  if (user?.role !== 'director') {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-600">Seuls les directeurs peuvent gérer les utilisateurs.</p>
      </Card>
    );
  }

  if (loadingUsers) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Gestion des utilisateurs</h3>
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gestion des utilisateurs</h3>
          <p className="text-sm text-gray-500 mt-1">
            Créez et gérez les comptes de vos employés ({realUsers.length} utilisateur
            {realUsers.length > 1 ? 's' : ''})
          </p>
        </div>
        <Button onClick={() => setShowUserForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un utilisateur
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {realUsers.length > 0 ? (
          realUsers.map((userData) => (
            <Card key={userData.id}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {userData.first_name[0]}
                        {userData.last_name[0]}
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
                      variant={
                        userData.role === 'director'
                          ? 'success'
                          : userData.role === 'manager'
                            ? 'warning'
                            : 'info'
                      }
                      size="sm"
                    >
                      {roleLabels[userData.role]}
                    </Badge>
                    <Badge variant={userData.is_active ? 'success' : 'secondary'} size="sm">
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
                          {permissionLabels[key as keyof UserPermissions]}
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
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(userData)}>
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
          ))
        ) : (
          <div className="col-span-2 text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun utilisateur dans votre agence
            </h3>
            <p className="text-gray-600 mb-4">Commencez par créer des comptes pour vos employés.</p>
            <Button onClick={() => setShowUserForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier utilisateur
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false);
          setEditingUser(null);
          resetForm();
        }}
        title={editingUser ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              value={formData.first_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, first_name: e.target.value }))
              }
              required
              autoComplete="given-name"
            />
            <Input
              label="Nom"
              value={formData.last_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, last_name: e.target.value }))
              }
              required
              autoComplete="family-name"
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const newEmail = e.target.value;
              setFormData((prev) => ({ ...prev, email: newEmail }));
              // On peut débouncer ou vérifier onBlur, ici on vérifie quand l'email semble complet
              if (newEmail.includes('.') && newEmail.includes('@')) {
                checkEmail(newEmail);
              } else {
                setIsExistingUser(false);
              }
            }}
            onBlur={(e) => checkEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="email@exemple.com"
            className={checkingEmail ? 'animate-pulse' : ''}
          />

          {checkingEmail && (
            <p className="text-xs text-blue-500 italic ml-1">Vérification de l'existence de l'utilisateur...</p>
          )}

          {isExistingUser && !editingUser && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
              <p className="text-sm text-blue-800 flex items-start">
                <Shield className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Utilisateur existant détecté</strong> : Cet email possède déjà un compte Gestion360.
                  Il sera ajouté à votre agence avec ses accès actuels.
                  <br />
                  <em className="text-xs mt-1 block italic opacity-75">
                    Note : Son mot de passe ne sera pas modifié.
                  </em>
                </span>
              </p>
            </div>
          )}

          {!editingUser && !isExistingUser && (
            <div className="space-y-1">
              <Input
                label="Mot de passe temporaire"
                type="password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
                autoComplete="new-password"
              />
              <p className="text-[10px] text-gray-500 italic">
                L'utilisateur devra changer ce mot de passe à sa première connexion
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
            <select
              value={formData.role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="agent">Agent</option>
              <option value="manager">Chef d'agence</option>
            </select>
          </div>
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
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
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
              {editingUser ? 'Mettre à jour' : "Créer l'utilisateur"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};