import React, { useState } from 'react';
import { Receipt, Plus, Filter, Calendar, MapPin, DollarSign, AlertCircle, CheckCircle2, Clock, Eye, Trash2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

interface Expense {
    id: string;
    site: string;
    category: string;
    amount: number;
    date: string;
    status: 'paid' | 'unpaid' | 'pending';
    supplier: string;
    description: string;
}

export const ExpenseManager: React.FC = () => {
    const [expenses] = useState<Expense[]>([
        { id: 'EXP-001', site: 'Résidence Les Perles', category: 'CIE (Électricité)', amount: 145000, date: '2024-03-15', status: 'paid', supplier: 'CIE CI', description: 'Facture Février 2024' },
        { id: 'EXP-002', site: 'Immeuble Horizon', category: 'Maintenance', amount: 45000, date: '2024-03-16', status: 'pending', supplier: 'ClimExpert', description: 'Entretien Clim Studio 05' },
        { id: 'EXP-003', site: 'Résidence Les Perles', category: 'SODECI (Eau)', amount: 28000, date: '2024-03-10', status: 'unpaid', supplier: 'SODECI', description: 'Consommation Janvier' },
    ]);

    const getStatusBadge = (status: Expense['status']) => {
        switch (status) {
            case 'paid':
                return <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><CheckCircle2 size={10} /> PAYÉ</span>;
            case 'unpaid':
                return <span className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100"><AlertCircle size={10} /> IMPAYÉ</span>;
            case 'pending':
                return <span className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100"><Clock size={10} /> EN ATTENTE</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 italic uppercase tracking-tighter">
                        <Receipt className="text-rose-600" />
                        Gestion des Dépenses
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Suivi financier des charges d'exploitation</p>
                </div>
                <Button variant="primary" size="sm" leftIcon={<Plus size={16} />} className="font-black italic shadow-lg shadow-rose-100 bg-rose-600 hover:bg-rose-700">
                    ENREGISTRER UNE FACTURE
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-0 shadow-sm bg-white border-l-4 border-rose-500">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dépenses ce mois</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">218 000 F</p>
                    <p className="text-[9px] text-rose-500 font-bold mt-1">+12% vs mois dernier</p>
                </Card>
                <Card className="p-4 border-0 shadow-sm bg-white border-l-4 border-emerald-500">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Payé</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">145 000 F</p>
                    <div className="w-full bg-gray-100 h-1 rounded-full mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[66%]" />
                    </div>
                </Card>
                <Card className="p-4 border-0 shadow-sm bg-white border-l-4 border-rose-500">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reste à payer</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">73 000 F</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">3 factures en attente</p>
                </Card>
                <Card className="p-4 border-0 shadow-sm bg-slate-900 text-white border-l-4 border-amber-500 uppercase italic">
                    <p className="text-[10px] font-black opacity-50 tracking-widest leading-none">Alerte Prochaine Échéance</p>
                    <p className="text-sm font-black mt-2 text-amber-400">CIE - Marché Cocody</p>
                    <p className="text-[10px] opacity-70">Dans 4 jours</p>
                </Card>
            </div>

            <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                            <Filter size={14} className="text-slate-400" />
                            <select className="text-[11px] font-black uppercase text-slate-600 outline-none bg-transparent">
                                <option>Tous les sites</option>
                                <option>Résidence Les Perles</option>
                                <option>Immeuble Horizon</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                            <Calendar size={14} className="text-slate-400" />
                            <select className="text-[11px] font-black uppercase text-slate-600 outline-none bg-transparent">
                                <option>Mars 2024</option>
                                <option>Février 2024</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider text-left">
                                <th className="px-6 py-4">ID / Facture</th>
                                <th className="px-6 py-4">Immeuble / Site</th>
                                <th className="px-6 py-4">Catégorie / Fournisseur</th>
                                <th className="px-6 py-4">Montant</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                            {expenses.map((exp) => (
                                <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                                                <Receipt size={16} />
                                            </div>
                                            <span className="text-xs font-black text-slate-700">{exp.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 underline decoration-slate-200 text-xs font-black text-slate-600 uppercase">
                                            <MapPin size={12} className="text-slate-400" />
                                            {exp.site}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-black text-slate-800">{exp.category}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase italic">{exp.supplier}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 font-black text-sm text-slate-900 italic">
                                            <DollarSign size={14} className="text-slate-400" />
                                            {exp.amount.toLocaleString()} F
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                                        {exp.date}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(exp.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Voir Facture">
                                                <Eye size={16} />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Supprimer">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};
