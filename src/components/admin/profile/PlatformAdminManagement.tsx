import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, ShieldAlert, Check, X, Trash2, Edit2, Save } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { supabase } from '../../../lib/config';
import { PlatformAdmin } from '../../../types/db';
import { toast } from 'react-hot-toast';

interface AdminWithProfile extends PlatformAdmin {
    user: {
        email: string;
        first_name: string;
        last_name: string;
    };
}

const AVAILABLE_PERMISSIONS = [
    { id: 'agencies', name: 'Gestion des Agences', description: 'Approuver les inscriptions, voir les détails des agences' },
    { id: 'subscriptions', name: 'Gestion des Abonnements', description: 'Modifier les tarifs, gérer les suspensions' },
    { id: 'reports', name: 'Rapports Financiers', description: 'Accès aux statistiques de revenus et performances' },
    { id: 'settings', name: 'Paramètres Système', description: 'Modifier les configurations globales de la plateforme' },
    { id: 'admins', name: 'Gestion des Administrateurs', description: "Ajouter ou supprimer d'autres super-admins" },
];

export const PlatformAdminManagement: React.FC = () => {
    const [admins, setAdmins] = useState<AdminWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<AdminWithProfile | null>(null);

    const [newAdmin, setNewAdmin] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'admin' as 'admin' | 'super_admin',
        permissions: {} as Record<string, boolean>
    });

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('platform_admins')
                .select('*, user:users(email, first_name, last_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAdmins(data as AdminWithProfile[]);
        } catch (error: any) {
            toast.error('Erreur lors du chargement des administrateurs');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const handleCreateAdmin = async () => {
        if (!newAdmin.email || !newAdmin.password || !newAdmin.first_name) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        try {
            const { data, error } = await supabase.rpc('create_platform_admin', {
                p_email: newAdmin.email,
                p_password: newAdmin.password,
                p_first_name: newAdmin.first_name,
                p_last_name: newAdmin.last_name,
                p_role: newAdmin.role,
                p_permissions: newAdmin.permissions
            });

            if (error) throw error;

            toast.success('Administrateur créé avec succès');
            setShowAddModal(false);
            setNewAdmin({
                email: '',
                password: '',
                first_name: '',
                last_name: '',
                role: 'admin',
                permissions: {}
            });
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la création');
        }
    };

    const togglePermission = (permId: string) => {
        setNewAdmin(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permId]: !prev.permissions[permId]
            }
        }));
    };

    const toggleEditingPermission = (permId: string) => {
        if (!editingAdmin) return;
        setEditingAdmin({
            ...editingAdmin,
            permissions: {
                ...(editingAdmin.permissions as Record<string, boolean>),
                [permId]: !(editingAdmin.permissions as Record<string, boolean>)[permId]
            }
        });
    };

    const handleUpdateAdmin = async () => {
        if (!editingAdmin) return;
        try {
            const { error } = await supabase
                .from('platform_admins')
                .update({
                    role: editingAdmin.role,
                    permissions: editingAdmin.permissions,
                    is_active: editingAdmin.is_active
                })
                .eq('id', editingAdmin.id);

            if (error) throw error;
            toast.success('Administrateur mis à jour');
            setEditingAdmin(null);
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteAdmin = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet administrateur ?')) return;
        try {
            const { error } = await supabase
                .from('platform_admins')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Administrateur supprimé');
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Équipe de Gestion</h3>
                    <p className="text-sm text-slate-500">Gérez les accès et les permissions de votre équipe d'administration.</p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Ajouter un admin
                </Button>
            </div>

            {loading ? (
                <div className="flex h-32 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {admins.map((admin) => (
                        <Card key={admin.id} className="p-4 transition-all hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${admin.role === 'super_admin' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        {admin.role === 'super_admin' ? <ShieldAlert className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">
                                            {admin.user?.first_name} {admin.user?.last_name}
                                            {admin.role === 'super_admin' && <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] text-purple-700 font-bold uppercase">Super Admin</span>}
                                        </p>
                                        <p className="text-sm text-slate-500">{admin.user?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setEditingAdmin(admin)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDeleteAdmin(admin.id)} className="text-red-600 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Permissions Preview */}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {Object.entries(admin.permissions as Record<string, boolean> || {}).map(([key, val]) => (
                                    val && (
                                        <span key={key} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                            {AVAILABLE_PERMISSIONS.find(p => p.id === key)?.name || key}
                                        </span>
                                    )
                                ))}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modale d'ajout */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <Card className="max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nouvel Administrateur</h3>
                            <button onClick={() => setShowAddModal(false)}><X className="h-6 w-6 text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <Input label="Prénom" value={newAdmin.first_name} onChange={e => setNewAdmin({...newAdmin, first_name: e.target.value})} />
                            <Input label="Nom" value={newAdmin.last_name} onChange={e => setNewAdmin({...newAdmin, last_name: e.target.value})} />
                            <Input label="Email" type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} />
                            <Input label="Mot de passe" type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} />
                        </div>

                        <div className="mb-6">
                            <label className="text-sm font-bold text-slate-700 mb-2 block">Rôle</label>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setNewAdmin({...newAdmin, role: 'admin'})}
                                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${newAdmin.role === 'admin' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100'}`}
                                >
                                    <p className="font-bold text-slate-900">Admin Standard</p>
                                    <p className="text-xs text-slate-500">Accès restreint aux permissions</p>
                                </button>
                                <button 
                                    onClick={() => setNewAdmin({...newAdmin, role: 'super_admin'})}
                                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${newAdmin.role === 'super_admin' ? 'border-purple-600 bg-purple-50' : 'border-slate-100'}`}
                                >
                                    <p className="font-bold text-slate-900">Super Admin</p>
                                    <p className="text-xs text-slate-500">Accès total à la plateforme</p>
                                </button>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="text-sm font-bold text-slate-700 mb-3 block">Permissions granulaires</label>
                            <div className="space-y-2">
                                {AVAILABLE_PERMISSIONS.map(perm => (
                                    <label key={perm.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{perm.name}</p>
                                            <p className="text-xs text-slate-500">{perm.description}</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={newAdmin.permissions[perm.id]} 
                                            onChange={() => togglePermission(perm.id)}
                                            className="h-5 w-5 rounded border-slate-300 text-indigo-600"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Annuler</Button>
                            <Button className="flex-1" onClick={handleCreateAdmin}>Créer l'accès</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modale d'édition */}
            {editingAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <Card className="max-w-xl w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Modifier les permissions</h3>
                            <button onClick={() => setEditingAdmin(null)}><X className="h-6 w-6 text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="font-bold text-slate-900">{editingAdmin.user?.first_name} {editingAdmin.user?.last_name}</p>
                            <p className="text-sm text-slate-500">{editingAdmin.user?.email}</p>
                        </div>

                        <div className="mb-6">
                            <label className="text-sm font-bold text-slate-700 mb-2 block">Rôle</label>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setEditingAdmin({...editingAdmin, role: 'admin'})}
                                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${editingAdmin.role === 'admin' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100'}`}
                                >
                                    <p className="font-bold text-slate-900">Admin</p>
                                </button>
                                <button 
                                    onClick={() => setEditingAdmin({...editingAdmin, role: 'super_admin'})}
                                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${editingAdmin.role === 'super_admin' ? 'border-purple-600 bg-purple-50' : 'border-slate-100'}`}
                                >
                                    <p className="font-bold text-slate-900">Super Admin</p>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 mb-8">
                            {AVAILABLE_PERMISSIONS.map(perm => (
                                <label key={perm.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100">
                                    <p className="text-sm font-bold text-slate-900">{perm.name}</p>
                                    <input 
                                        type="checkbox" 
                                        checked={(editingAdmin.permissions as Record<string, boolean>)?.[perm.id] || false} 
                                        onChange={() => toggleEditingPermission(perm.id)}
                                        className="h-5 w-5 rounded border-slate-300 text-indigo-600"
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setEditingAdmin(null)}>Annuler</Button>
                            <Button className="flex-1" onClick={handleUpdateAdmin}><Save className="h-4 w-4 mr-2" />Enregistrer</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
