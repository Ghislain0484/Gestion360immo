import React from 'react';
import { ShieldAlert, Mail, Phone, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export const AccountSuspended: React.FC = () => {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 p-8 text-center animate-fade-in">
                <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform hover:rotate-6 transition-transform">
                    <ShieldAlert className="w-10 h-10 text-rose-600" />
                </div>
                
                <h1 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Accès Restreint</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Le compte de votre agence a été temporairement suspendu par l'administration de <span className="font-bold text-slate-900">Gestion360Immo</span>. 
                    Cette mesure est généralement due à un impayé ou à une révision administrative en cours.
                </p>

                <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                        <Mail className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Contact Support</p>
                            <p className="text-sm font-semibold text-slate-700">support@gestion360immo.ci</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                        <Phone className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assistance Mobile</p>
                            <p className="text-sm font-semibold text-slate-700">+225 27 24 35 12 12</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <Button 
                        variant="primary" 
                        className="w-full py-4 rounded-2xl font-bold bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200"
                        onClick={() => window.location.href = 'mailto:support@gestion360immo.ci'}
                    >
                        Contacter l'administration
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600"
                        onClick={logout}
                    >
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                    </Button>
                </div>

                <p className="mt-8 text-[10px] text-slate-300 font-medium uppercase tracking-[0.2em]">
                    Système de Gestion Immobilière Intelligent
                </p>
            </div>
        </div>
    );
};
