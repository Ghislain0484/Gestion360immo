import React from 'react';
import { Hammer, Settings, Clock, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export const MaintenancePage: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-indigo-950 overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[10%] left-[5%] w-72 h-72 bg-blue-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-2xl w-full px-6 text-center animate-fade-in">
                <div className="relative inline-block mb-12">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto transform hover:rotate-12 transition-transform duration-500">
                        <Hammer className="w-10 h-10 text-blue-400" />
                    </div>
                    {/* Floating icons */}
                    <div className="absolute -top-4 -right-4 animate-bounce delay-100">
                        <div className="bg-amber-400 p-2 rounded-lg shadow-xl">
                            <Settings className="w-4 h-4 text-amber-900" />
                        </div>
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
                    Optimisation de votre <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        Plateforme 360
                    </span>
                </h1>
                
                <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                    Nous mettons à jour nos services pour vous offrir une expérience plus fluide et plus sécurisée. 
                    Nous serons de retour dans quelques instants.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-12">
                    <div className="flex items-center gap-4 p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 transition-colors hover:bg-white/10 group text-left">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-0.5">Statut</p>
                            <p className="text-sm font-bold text-white">Maintenance en cours</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 transition-colors hover:bg-white/10 group text-left">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-0.5">Estimation</p>
                            <p className="text-sm font-bold text-white">~ 15-30 minutes</p>
                        </div>
                    </div>
                </div>

                <Button 
                    variant="primary" 
                    size="lg"
                    className="px-10 py-4 rounded-2xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-900/40"
                    onClick={() => window.location.reload()}
                >
                    Vérifier la disponibilité
                </Button>

                <p className="mt-16 text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">
                    Gestion360Immo &middot; Excellence Immobilière
                </p>
            </div>
        </div>
    );
};
