import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, ShieldAlert, Check, X, Trash2, Edit2, Save } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { supabase } from '../../../lib/config';
import { PlatformAdmin } from '../../../types/db';
import { toast } from 'react-hot-toast';

interface AdminWithProfile extends PlatformAdmin {
    users: {
        email: string;
        first_name: string;
        last_name: string;
    };
}

const AVAILABLE_PERMISSIONS = [
    { id: `agencies`, name: `Gestion des Agences`, description: `Approuver les inscriptions, voir les détails des agences` },
    { id: `subscriptions`, name: `Gestion des Abonnements`, description: `Modifier les tarifs, gérer les suspensions` },
    { id: `reports`, name: `Rapports Financiers`, description: `Accès aux statistiques de revenus et performances` },
    { id: `settings`, name: `Paramètres Système`, description: `Modifier les configurations globales de la plateforme` },
    { id: `admins`, name: `Gestion des Administrateurs`, description: `Ajouter ou supprimer d'autres super-admins` },
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
                .from('view_platform_admins')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Transformer les données pour correspondre à l'interface (aplatir users)
            const formattedAdmins = (data as any[]).map(admin => ({
                ...admin,
                users: {
                    email: admin.email,
                    first_name: admin.first_name,
                    last_name: admin.last_name
                }
            }));
            setAdmins(formattedAdmins);
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

    useEffect(() => {
        if (showAddModal) {
            setTimeout(() => {
                const scrollContainer = document.getElementById('add-admin-modal-body');
                if (scrollContainer) {
                    scrollContainer.scrollTop = 0;
                }
            }, 50);
        }
    }, [showAddModal]);

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
                                            {admin.users?.first_name} {admin.users?.last_name}
                                            {admin.role === 'super_admin' && <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] text-purple-700 font-bold uppercase">Super Admin</span>}
                                        </p>
                                        <p className="text-sm text-slate-500">{admin.users?.email}</p>
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
                    <Card className="max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between mb-6 flex-shrink-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nouvel Administrateur</h3>
                            <button onClick={() => setShowAddModal(false)}><X className="h-6 w-6 text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        
                        <div className="overflow-y-auto custom-scrollbar flex-grow pr-1 mb-6 scroll-smooth" id="add-admin-modal-body">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <Input label="Prénom" value={newAdmin.first_name} onChange={e => setNewAdmin({...newAdmin, first_name: e.target.value})} />
                                <Input label="Nom" value={newAdmin.last_name} onChange={e => setNewAdmin({...newAdmin, last_name: e.target.value})} />
                                <Input label="Email" type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} />
                                <Input label="Mot de passe" type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} />
                            </div>

                            <div className="mb-6">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Rôle</label>
                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setNewAdmin({...newAdmin, role: 'admin'})}
                                        className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${newAdmin.role === 'admin' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <p className="font-bold text-slate-900 dark:text-white">Admin Standard</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Accès restreint aux permissions</p>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setNewAdmin({...newAdmin, role: 'super_admin'})}
                                        className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${newAdmin.role === 'super_admin' ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <p className="font-bold text-slate-900 dark:text-white">Super Admin</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Accès total à la plateforme</p>
                                    </button>
                                </div>
                            </div>

                            {newAdmin.role === 'super_admin' ? (
                                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 flex items-start gap-3 animate-fade-in">
                                    <ShieldAlert className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-purple-950 dark:text-purple-300">Accès Super Admin Total</p>
                                        <p className="text-xs text-purple-700/80 dark:text-purple-400/80 mt-0.5">Le Super Admin possède l'intégralité des permissions sur la plateforme. Il n'est pas nécessaire de lui attribuer des permissions granulaires.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 block">Permissions granulaires</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {AVAILABLE_PERMISSIONS.map(perm => (
                                            <label key={perm.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{perm.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{perm.description}</p>
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
                            )}
                        </div>

                        <div className="flex gap-3 mt-auto pt-4 flex-shrink-0 border-t border-slate-100 dark:border-slate-700">
                            <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Annuler</Button>
                            <Button className="flex-1" onClick={handleCreateAdmin}>Créer l'accès</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modale d'édition */}
            {editingAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <Card className="max-w-xl w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between mb-6 flex-shrink-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Modifier les permissions</h3>
                            <button onClick={() => setEditingAdmin(null)}><X className="h-6 w-6 text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-grow pr-1 mb-6">
                            <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                <p className="font-bold text-slate-900 dark:text-white">{editingAdmin.users?.first_name} {editingAdmin.users?.last_name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{editingAdmin.users?.email}</p>
                            </div>

                            <div className="mb-6">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Rôle</label>
                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setEditingAdmin({...editingAdmin, role: 'admin'})}
                                        className={`flex-1 p-3 rounded-xl border-2 transition-all ${editingAdmin.role === 'admin' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <p className="font-bold text-slate-900 dark:text-white">Admin</p>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setEditingAdmin({...editingAdmin, role: 'super_admin'})}
                                        className={`flex-1 p-3 rounded-xl border-2 transition-all ${editingAdmin.role === 'super_admin' ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <p className="font-bold text-slate-900 dark:text-white">Super Admin</p>
                                    </button>
                                </div>
                            </div>

                            {editingAdmin.role === 'super_admin' ? (
                                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 flex items-start gap-3 animate-fade-in">
                                    <ShieldAlert className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-purple-950 dark:text-purple-300">Accès Super Admin Total</p>
                                        <p className="text-xs text-purple-700/80 dark:text-purple-400/80 mt-0.5">Le Super Admin possède l'intégralité des permissions sur la plateforme. Il n'est pas nécessaire de lui attribuer des permissions granulaires.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 block">Permissions granulaires</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {AVAILABLE_PERMISSIONS.map(perm => (
                                            <label key={perm.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{perm.name}</p>
                                                <input 
                                                    type="checkbox" 
                                                    checked={(editingAdmin.permissions as Record<string, boolean>)?.[perm.id] || false} 
                                                    onChange={() => toggleEditingPermission(perm.id)}
                                                    className="h-5 w-5 rounded border-slate-300 text-indigo-600"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-auto pt-4 flex-shrink-0 border-t border-slate-100 dark:border-slate-700">
                            <Button variant="outline" className="flex-1" onClick={() => setEditingAdmin(null)}>Annuler</Button>
                            <Button className="flex-1" onClick={handleUpdateAdmin}><Save className="h-4 w-4 mr-2" />Enregistrer</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
