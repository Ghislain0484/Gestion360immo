import React, { useState, useEffect } from 'react';
import { Plus, Users, Shield, Edit, Trash2, Eye, EyeOff, Key } from 'lucide-react';
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
import { useQuotaManager } from '../../hooks/useQuotaManager';
import { QuotaExceededModal } from '../shared/QuotaExceededModal';

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
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<ExtendedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  
  const { stats, isEnterprise } = useQuotaManager();
  const [showQuotaModal, setShowQuotaModal] = useState(false);

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
      caisse: false,
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
      // Utiliser le RPC global v20 pour voir au-delà des restrictions RLS (auth + public)
      const { data, error } = await supabase.rpc('get_user_by_email_v20', {
        p_email: email.toLowerCase()
      });

      if (error) {
        console.warn('RPC checkEmail error:', error);
        // Fallback sur le select classique si le RPC n'est pas encore là
        const { data: fallbackData } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (fallbackData) {
          setIsExistingUser(true);
          setFormData(prev => ({
            ...prev,
            first_name: prev.first_name || fallbackData.first_name || '',
            last_name: prev.last_name || fallbackData.last_name || '',
          }));
        }
        return;
      }

      const existingRecord = data?.[0];
      if (existingRecord) {
        setIsExistingUser(true);
        setFormData(prev => ({
          ...prev,
          first_name: prev.first_name || existingRecord.first_name || '',
          last_name: prev.last_name || existingRecord.last_name || '',
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
    cashier: 'Caissière / Caissier',
  };

  const permissionLabels: Record<keyof UserPermissions, string> = {
    dashboard: 'Tableau de bord',
    properties: 'Propriétés',
    owners: 'Propriétaires',
    tenants: 'Locataires',
    contracts: 'Contrats',
    collaboration: 'Collaboration',
    caisse: 'Caisse & Trésorerie',
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
    console.log('🔘 UserManagement: Bouton Enregistrer cliqué');
    
    if (loading) {
      console.log('⏳ UserManagement: handleSubmit déjà en cours, on ignore le clic.');
      return;
    }

    console.log('🚀 UserManagement: Début du traitement', {
      isExistingUser,
      editingUser: !!editingUser,
      email: formData.email,
      role: formData.role,
      agency_id: user?.agency_id
    });
    setLoading(true);

    if (!user?.agency_id) {
      console.warn('⚠️ UserManagement: Pas d\'agency_id dans le contexte');
      toast.error('Aucune agence associée. Veuillez attendre l’approbation de votre demande.');
      setLoading(false);
      return;
    }

    try {
      // Vérification du quota pour les nouveaux utilisateurs
      if (!editingUser && !isEnterprise && stats.users.isReached) {
        console.warn('🚫 UserManagement: Quota atteint !', stats.users);
        setShowQuotaModal(true);
        setLoading(false);
        return;
      }

      // 0. Validation basique
      if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
        throw new Error('Tous les champs obligatoires doivent être remplis');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error("Format d'email invalide");
      }

      const emailLower = formData.email.toLowerCase();

      if (editingUser) {
        // ... (existing update logic)
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

        // 1. Chercher si l'utilisateur existe déjà dans le système (via RPC global v20)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_by_email_v20', {
          p_email: emailLower
        });

        let globalUser = rpcData?.[0];

        // Fallback si RPC v20 manquant
        if (rpcError) {
          console.warn('⚠️ RPC get_user_by_email_v20 failed:', rpcError);
          const { data: v19Data } = await supabase.rpc('get_user_by_email_v19', { p_email: emailLower });
          globalUser = v19Data?.[0];
        }

        const userExistsGlobally = !!globalUser;
        const existsInAuthOnly = globalUser?.source === 'auth';
        console.log('📊 Global Check Result:', { userExistsGlobally, existsInAuthOnly, globalId: globalUser?.id });

        // 2. Création via RPC (Contourne les limites de vitesse Auth et valide l'email)
        console.log('🆕 Creating user via Admin RPC V4...');
        const { data: rpcResult, error: rpcErr } = await supabase.rpc('admin_create_user_v4', {
          p_email: emailLower,
          p_password: formData.password || 'Temporary@123', // Password par défaut si non fourni
          p_first_name: formData.first_name,
          p_last_name: formData.last_name,
          p_agency_id: user.agency_id,
          p_role: formData.role
        });

        if (rpcErr || !rpcResult?.success) {
          console.error('❌ RPC V4 Error:', rpcErr || rpcResult?.error);
          throw new Error(rpcErr?.message || rpcResult?.error || "Échec de la création via RPC");
        }

        const targetUserId = rpcResult.user_id;
        const isNewAccount = rpcResult.message && rpcResult.message.includes('Nouvel');
        console.log('✅ User created/linked:', targetUserId);

        // Récupérer l'objet utilisateur final pour la mise à jour locale
        const { data: finalUser, error: finalUserErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', targetUserId)
          .single();
        
        if (finalUserErr) {
          console.error('❌ Error fetching final user:', finalUserErr);
          throw new Error("Compte créé mais impossible de récupérer les informations de profil.");
        }

        const finalUserObj = finalUser;

        // 3. Liaison agence (déjà faite par le RPC v4, mais on s'assure par précaution si nécessaire)
        // Note: admin_create_user_v4 fait déjà l'insertion dans agency_users.
        
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
        caisse: false,
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
      permissions: userData.permissions || {
        dashboard: true,
        properties: false,
        owners: false,
        tenants: false,
        contracts: false,
        collaboration: false,
        caisse: false,
        reports: false,
        notifications: true,
        settings: false,
        userManagement: false,
      },
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPassword || !newPassword || newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setResettingPassword(true);
    try {
      console.log('Resetting password for user:', userToResetPassword.id);
      const { data, error } = await supabase.rpc('admin_reset_user_password', {
        p_user_id: userToResetPassword.id,
        p_new_password: newPassword
      });

      if (error) throw error;

      await dbService.auditLogs.insert({
        user_id: user?.id || null,
        action: 'admin_reset_password',
        table_name: 'users',
        record_id: userToResetPassword.id,
        new_values: {
          target_user: userToResetPassword.email,
          timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
        },
        ip_address: '0.0.0.0',
        user_agent: navigator.userAgent,
      });

      toast.success(`✅ Mot de passe réinitialisé pour ${userToResetPassword.first_name}`);
      setShowPasswordResetModal(false);
      setUserToResetPassword(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('❌ Erreur réinitialisation mot de passe:', error.message);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setResettingPassword(false);
    }
  };

  const updatePermission = (key: keyof UserPermissions, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: { ...(prev.permissions || {}), [key]: value },
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
          caisse: true,
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
          caisse: true,
          reports: true,
          notifications: true,
          settings: false,
          userManagement: false,
        };
      case 'cashier':
        return {
          dashboard: true,
          properties: false,
          owners: false,
          tenants: false,
          contracts: false,
          collaboration: false,
          caisse: true,
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
          caisse: false,
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
          caisse: false,
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
        <Button onClick={() => {
          if (!isEnterprise && stats.users.isReached) {
            setShowQuotaModal(true);
          } else {
            setShowUserForm(true);
          }
        }}>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserToResetPassword(userData);
                            setShowPasswordResetModal(true);
                          }}
                          title="Réinitialiser le mot de passe"
                        >
                          <Key className="h-4 w-4" />
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
            <Button onClick={() => {
              if (!isEnterprise && stats.users.isReached) {
                setShowQuotaModal(true);
              } else {
                setShowUserForm(true);
              }
            }}>
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
              autoComplete="given-name"
            />
            <Input
              label="Nom"
              value={formData.last_name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, last_name: e.target.value }))
              }
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
            >
              <option value="agent">Agent</option>
              <option value="manager">Chef d'agence</option>
              <option value="cashier">Caissière / Caissier</option>
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
            <Button 
              type="submit" 
              isLoading={loading}
              onClick={() => console.log('🖱️ CLIC DÉTECTÉ SUR LE BOUTON ENREGISTRER')}
            >
              {editingUser ? 'Mettre à jour' : "Créer l'utilisateur"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showPasswordResetModal}
        onClose={() => {
          setShowPasswordResetModal(false);
          setUserToResetPassword(null);
          setNewPassword('');
        }}
        title={`Réinitialiser le mot de passe - ${userToResetPassword?.first_name} ${userToResetPassword?.last_name}`}
        size="md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
            <p className="text-sm text-amber-800">
              <strong>Attention</strong> : Vous allez modifier manuellement le mot de passe de cet utilisateur.
              Veuillez lui communiquer le nouveau mot de passe une fois validé.
            </p>
          </div>

          <Input
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Min. 6 caractères"
            autoFocus
          />

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowPasswordResetModal(false);
                setUserToResetPassword(null);
                setNewPassword('');
              }}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={resettingPassword} className="bg-amber-600 hover:bg-amber-700">
              Valider le nouveau mot de passe
            </Button>
          </div>
        </form>
      </Modal>

      <QuotaExceededModal 
        isOpen={showQuotaModal} 
        onClose={() => setShowQuotaModal(false)} 
        type="users" 
        currentLimit={stats.users.max} 
      />
    </div>
  );
};