import React, { useState, useEffect } from 'react';
import { Building2, MapPin, CheckCircle, AlertCircle, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface AgencyOption {
    id: string;
    name: string;
    city: string;
    commercial_register: string;
}

export const AgencyPicker: React.FC = () => {
    const { user, logout } = useAuth();
    const [agencies, setAgencies] = useState<AgencyOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState<string | null>(null); // agencyId en cours

    useEffect(() => {
        if (user) {
            loadAllAgencies();
        }
    }, [user?.id]);

    const loadAllAgencies = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Passe l'ID utilisateur pour filtrer par RCCM en base
            const { data, error } = await supabase.rpc('get_approved_agencies', {
                p_user_id: user.id,
            });
            if (error) throw error;
            setAgencies(data ?? []);
        } catch (err: any) {
            console.error('AgencyPicker: erreur chargement agences:', err);
            toast.error('Impossible de charger la liste des agences');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (agency: AgencyOption) => {
        if (!user || linking) return;
        setLinking(agency.id);
        try {
            // Utilise la fonction RPC SECURITY DEFINER pour lier le directeur
            const { data, error } = await supabase.rpc('link_director_to_agency', {
                p_agency_id: agency.id,
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success(`✅ Connecté à : ${agency.name}`);

            // Mémoriser le choix du directeur pour AuthContext
            localStorage.setItem('gestion360_active_agency', agency.id);

            // Rechargement complet pour relancer la session avec la nouvelle agence
            setTimeout(() => window.location.reload(), 800);
        } catch (err: any) {
            toast.error('Erreur de connexion : ' + (err.message ?? 'inconnue'));
        } finally {
            setLinking(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Sélectionnez votre agence</h1>
                    <p className="text-blue-200 text-sm">
                        Connecté en tant que{' '}
                        <span className="font-semibold text-white">{user?.email}</span>
                    </p>
                    <p className="text-blue-300 text-xs mt-1">
                        Cliquez sur l'agence que vous gérez pour accéder à son tableau de bord
                    </p>
                    <div className="mt-2 inline-block px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] text-blue-200 uppercase tracking-widest font-bold">
                        Filtre : Agences liées à votre RCCM
                    </div>
                </div>

                {/* Agency list */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-blue-200">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-sm">Chargement des agences...</span>
                        </div>
                    ) : agencies.length === 0 ? (
                        <div className="flex flex-col items-center py-12 text-center px-6">
                            <AlertCircle className="w-10 h-10 text-yellow-400 mb-3" />
                            <p className="text-white font-medium">Aucune agence approuvée trouvée</p>
                            <p className="text-blue-200 text-sm mt-2 max-w-sm">
                                La fonction <code className="bg-white/10 px-1 rounded">get_approved_agencies</code> n'a pas été
                                créée dans Supabase. Exécutez le fichier{' '}
                                <strong>Fix_DirecteurMultiAgence.sql</strong> dans Supabase → SQL Editor.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/10">
                            <p className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-blue-300 bg-white/5">
                                {agencies.length} agence{agencies.length > 1 ? 's' : ''} disponible{agencies.length > 1 ? 's' : ''}
                            </p>
                            {agencies.map((agency) => {
                                const isLinking = linking === agency.id;
                                return (
                                    <button
                                        key={agency.id}
                                        disabled={!!linking}
                                        onClick={() => handleSelect(agency)}
                                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/10 transition-all text-left group disabled:opacity-60"
                                    >
                                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/40 transition-colors flex-shrink-0">
                                            {isLinking ? (
                                                <Loader2 className="w-6 h-6 text-blue-300 animate-spin" />
                                            ) : (
                                                <Building2 className="w-6 h-6 text-blue-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-white truncate">{agency.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="flex items-center gap-1 text-xs text-blue-200">
                                                    <MapPin className="w-3 h-3" />
                                                    {agency.city}
                                                </span>
                                                <span className="text-xs text-blue-300/60">
                                                    RCCM : {agency.commercial_register}
                                                </span>
                                            </div>
                                        </div>
                                        <CheckCircle className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-4 text-center">
                    <button
                        onClick={logout}
                        className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-white transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
};
