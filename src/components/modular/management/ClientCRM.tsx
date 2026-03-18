import React, { useState } from 'react';
import { Plus, Users, Search, Star, History, Coffee, ShieldCheck, Mail, Phone, ChevronRight } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

interface Resident {
    id: string;
    name: string;
    email: string;
    phone: string;
    totalStays: number;
    points: number;
    preferences: string[];
    status: 'vip' | 'regular' | 'corporate';
    lastStay: string;
}

export const ClientCRM: React.FC = () => {
    const [residents] = useState<Resident[]>([
        { id: 'CLI-001', name: 'Jean Kouassi', email: 'jean.k@email.ci', phone: '+225 07 01 02 03 04', totalStays: 12, points: 1250, preferences: ['Étage élevé', 'Wave'], status: 'vip', lastStay: 'Mars 2024' },
        { id: 'CLI-002', name: 'Sarah Touré', email: 'sarah.toure@orange.ci', phone: '+225 05 55 66 77 88', totalStays: 4, points: 450, preferences: ['Climatisé', 'Petit-déj'], status: 'regular', lastStay: 'Février 2024' },
        { id: 'CLI-003', name: 'Global Logistics SARL', email: 'admin@globallog.ci', phone: '+225 27 22 11 00 99', totalStays: 45, points: 8900, preferences: ['Facturation mensuelle', 'Navette'], status: 'corporate', lastStay: 'En cours' },
    ]);

    const getStatusStyle = (status: Resident['status']) => {
        switch (status) {
            case 'vip': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'corporate': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'regular': return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 italic uppercase tracking-tighter">
                        <Users className="text-indigo-600" />
                        CRM Résidents
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Base de données clients et fidélisation</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="RECHERCHER UN CLIENT..." 
                            className="bg-white border-2 border-slate-100 rounded-xl pl-9 pr-4 py-2 text-[10px] font-black uppercase outline-none focus:border-indigo-500 transition-all w-64 shadow-sm"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="font-black italic">EXPORTER</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {residents.map((res) => (
                    <Card key={res.id} className="p-0 overflow-hidden border-0 shadow-lg group hover:scale-[1.02] transition-all cursor-pointer">
                        <div className={`p-4 border-b ${getStatusStyle(res.status)} flex justify-between items-center`}>
                            <div className="flex items-center gap-2">
                                {res.status === 'vip' && <Star size={14} className="fill-amber-400 text-amber-400" />}
                                {res.status === 'corporate' && <ShieldCheck size={14} className="text-indigo-600" />}
                                <span className="text-[10px] font-black uppercase tracking-widest">{res.status}</span>
                            </div>
                            <span className="text-[9px] font-black opacity-50">{res.id}</span>
                        </div>
                        <div className="p-5 space-y-4 bg-white">
                            <div>
                                <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors uppercase italic">{res.name}</h4>
                                <div className="flex flex-col gap-1 mt-2">
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <Mail size={10} /> {res.email}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                        <Phone size={10} /> {res.phone}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Total Séjours</p>
                                    <p className="text-sm font-black text-slate-800">{res.totalStays}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Points Fidélité</p>
                                    <p className="text-sm font-black text-indigo-600">{res.points.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Coffee size={10} /> Préférences
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {res.preferences.map((pref, i) => (
                                        <span key={i} className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase">
                                            {pref}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-indigo-600">
                                <span className="text-[10px] font-black uppercase flex items-center gap-1">
                                    <History size={12} /> Dernier: {res.lastStay}
                                </span>
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </Card>
                ))}
                
                {/* Nouveau Client Card */}
                <Card className="p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-all cursor-pointer group bg-slate-50/50">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Nouveau Résident</p>
                </Card>
            </div>
        </div>
    );
};
