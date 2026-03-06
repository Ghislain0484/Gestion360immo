import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Clock, Building2, Calendar, Users, Home, Target, FileText } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { Property, RentReceipt } from '../../types/db';
import { Contract } from '../../types/contracts';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Badge } from '../ui/Badge';

interface OwnerRentSummaryProps {
    ownerId: string;
    ownerProperties: Property[];
}

const MONTHS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const OwnerRentSummary: React.FC<OwnerRentSummaryProps> = ({ ownerId, ownerProperties }) => {
    const { agencyId } = useAuth();
    const now = new Date();

    // --- State for Period Selection ---
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);

    // --- Fetch all contracts for the owner's properties ---
    const fetchContracts = React.useCallback(async () => {
        if (!agencyId || ownerProperties.length === 0) return [];
        return dbService.contracts.getAll({ agency_id: agencyId, type: 'location' });
    }, [agencyId, ownerProperties]);

    const { data: allContracts = [], initialLoading: loadingContracts } = useRealtimeData<Contract>(
        fetchContracts,
        'contracts',
        { agency_id: agencyId || undefined, type: 'location' }
    );

    // Filter contracts to only those for this owner's properties
    const ownerPropertyIds = useMemo(() => new Set(ownerProperties.map(p => p.id)), [ownerProperties]);
    const ownerContracts = useMemo(
        () => allContracts.filter(c => ownerPropertyIds.has(c.property_id)),
        [allContracts, ownerPropertyIds]
    );

    // --- Fetch all rent receipts for this owner ---
    const fetchReceipts = React.useCallback(async () => {
        if (!ownerId) return [];
        return dbService.rentReceipts.getAll({ owner_id: ownerId });
    }, [ownerId]);

    const { data: allReceipts = [], initialLoading: loadingReceipts } = useRealtimeData<RentReceipt>(
        fetchReceipts,
        'rent_receipts',
        { owner_id: ownerId }
    );

    // --- Computations ---
    const stats = useMemo(() => {
        // Filter receipts for the selected period
        const currentPeriodReceipts = allReceipts.filter(
            r => r.period_month === selectedMonth && r.period_year === selectedYear
        );

        // Year receipts
        const currentYearReceipts = allReceipts.filter(r => r.period_year === selectedYear);

        // Revenue Potential (Sum of target monthly_rent for ALL owner properties)
        const totalPotential = ownerProperties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0);

        // Occupancy quantification
        let occupiedCount = 0;

        // Per-property status for selected month
        const propertyRows = ownerProperties.map(prop => {
            // A property is considered "occupied" if it has an active/renewed contract
            // (Note: In a true history mode, we'd check if the contract was active during the selected period)
            const contract = ownerContracts.find(c =>
                c.property_id === prop.id &&
                ['active', 'renewed'].includes(c.status)
            );

            const isOccupied = !!contract;
            if (isOccupied) occupiedCount++;

            const monthlyRentTarget = prop.monthly_rent || 0;
            const monthlyRentContractVal = contract?.monthly_rent || 0;

            const receipt = currentPeriodReceipts.find(r => r.property_id === prop.id);

            let status: 'paid' | 'partial' | 'unpaid' | 'no_contract';
            let amountPaid = 0;
            let balanceDue = 0;

            if (!contract) {
                status = 'no_contract';
            } else if (!receipt) {
                status = 'unpaid';
                balanceDue = monthlyRentContractVal;
            } else {
                amountPaid = receipt.amount_paid ?? receipt.total_amount;
                balanceDue = receipt.balance_due ?? Math.max(0, monthlyRentContractVal - amountPaid);
                status = receipt.payment_status === 'partial' || balanceDue > 0 ? 'partial' : 'paid';
            }

            return {
                prop,
                monthlyRentTarget,
                monthlyRentContract: monthlyRentContractVal,
                status,
                amountPaid,
                balanceDue,
                isOccupied
            };
        });

        // Financials only for "Occupied" properties (expected rent according to contracts)
        const monthlyExpected = propertyRows.reduce((sum, row) => sum + row.monthlyRentContract, 0);
        const monthlyPaid = propertyRows.reduce((sum, row) => sum + row.amountPaid, 0);
        const monthlyRemaining = Math.max(0, monthlyExpected - monthlyPaid);

        // Yearly view
        const yearlyCollected = currentYearReceipts.reduce((sum, r) => sum + (r.amount_paid ?? r.total_amount), 0);
        const yearlyExpected = monthlyExpected * 12; // Approximation
        const yearlyUnpaid = Math.max(0, yearlyExpected - yearlyCollected);

        return {
            totalPotential,
            monthlyExpected,
            monthlyPaid,
            monthlyRemaining,
            yearlyExpected,
            yearlyCollected,
            yearlyUnpaid,
            propertyRows,
            occupiedCount,
            vacantCount: ownerProperties.length - occupiedCount,
            totalCount: ownerProperties.length
        };
    }, [ownerContracts, allReceipts, ownerProperties, selectedMonth, selectedYear]);

    if (loadingContracts || loadingReceipts) {
        return <div className="flex justify-center py-8"><LoadingSpinner size="md" label="Chargement du résumé..." /></div>;
    }

    if (ownerProperties.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400">
                <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucun bien enregistré pour ce propriétaire.</p>
            </div>
        );
    }

    const statusBadge = (status: 'paid' | 'partial' | 'unpaid' | 'no_contract') => {
        switch (status) {
            case 'paid': return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Payé</Badge>;
            case 'partial': return <Badge variant="warning"><AlertTriangle className="w-3 h-3 mr-1" /> Partiel</Badge>;
            case 'unpaid': return <Badge variant="danger"><Clock className="w-3 h-3 mr-1" /> Impayé</Badge>;
            default: return <Badge variant="secondary">Vacant</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Month/Year Picker */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 text-xl tracking-tight">Analyse de Performance</h3>
                        <p className="text-sm text-slate-500 font-medium">Répertoire détaillé des loyers</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                        <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer p-0 pr-6"
                        >
                            {MONTHS_FR.map((name, i) => i > 0 && <option key={i} value={i}>{name}</option>)}
                        </select>
                    </div>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-blue-500 cursor-pointer h-full py-1.5"
                    >
                        {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Top KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Potential KPI */}
                <Card className="p-4 bg-slate-50 border-slate-200 shadow-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white rounded-xl text-slate-400 border border-slate-100"><Target className="w-5 h-5" /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Potentiel Mensuel</p>
                            <p className="text-lg font-black text-slate-900 leading-none">{formatCurrency(stats.totalPotential)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-blue-50/50 border-blue-100 shadow-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white rounded-xl text-blue-600 border border-blue-100 shadow-sm"><FileText className="w-5 h-5" /></div>
                        <div>
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Attendu (Contrats)</p>
                            <p className="text-lg font-black text-slate-900 leading-none">{formatCurrency(stats.monthlyExpected)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-emerald-50/50 border-emerald-100 shadow-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white rounded-xl text-emerald-600 border border-emerald-100 shadow-sm"><CheckCircle className="w-5 h-5" /></div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Encaissé Réel</p>
                            <p className="text-lg font-black text-emerald-700 leading-none">{formatCurrency(stats.monthlyPaid)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-rose-50 border-rose-100 shadow-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white rounded-xl text-rose-600 border border-rose-100 shadow-sm"><AlertTriangle className="w-5 h-5" /></div>
                        <div>
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Reste à Percevoir</p>
                            <p className={`text-lg font-black leading-none ${stats.monthlyRemaining > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {formatCurrency(stats.monthlyRemaining)}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Occupancy Logic Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                            <Home className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Patrimoine</p>
                            <p className="text-lg font-black text-slate-900">{stats.totalCount < 10 ? `0${stats.totalCount}` : stats.totalCount}</p>
                        </div>
                    </div>
                    <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-none">Biens</Badge>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                            <Users className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Occupation</p>
                            <p className="text-lg font-black text-emerald-600">{stats.occupiedCount < 10 ? `0${stats.occupiedCount}` : stats.occupiedCount}</p>
                        </div>
                    </div>
                    <Badge variant="success" className="bg-emerald-50 text-emerald-600 border-none">Occupés</Badge>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100">
                            <Building2 className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Vacance</p>
                            <p className="text-lg font-black text-orange-600">{stats.vacantCount < 10 ? `0${stats.vacantCount}` : stats.vacantCount}</p>
                        </div>
                    </div>
                    <Badge variant="warning" className="bg-orange-50 text-orange-600 border-none">Vacants</Badge>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h4 className="font-black text-slate-900 text-lg flex items-center gap-2 mb-1">
                            <Target className="w-5 h-5 text-blue-500" />
                            Répertoire Financier par Bien
                        </h4>
                        <p className="text-xs text-slate-400">Détail des montants cibles (Potentiel) vs loyers contractuels (Réel)</p>
                    </div>
                    <Badge variant="info" className="py-1 px-3">
                        Période : {MONTHS_FR[selectedMonth]} {selectedYear}
                    </Badge>
                </div>

                <Card className="p-0 overflow-hidden border-slate-200 shadow-elegant" variant="default">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-left font-black text-[10px] text-slate-400 uppercase tracking-widest">Description du Bien</th>
                                    <th className="px-4 py-4 text-right font-black text-[10px] text-slate-400 uppercase tracking-widest">Loyer Cible (Fiche)</th>
                                    <th className="px-4 py-4 text-right font-black text-[10px] text-slate-400 uppercase tracking-widest">Loyer Réel (Contrat)</th>
                                    <th className="px-4 py-4 text-right font-black text-[10px] text-slate-400 uppercase tracking-widest">Perçu (Mois)</th>
                                    <th className="px-4 py-4 text-center font-black text-[10px] text-slate-400 uppercase tracking-widest">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.propertyRows.map(({ prop, monthlyRentTarget, monthlyRentContract, status, amountPaid, balanceDue, isOccupied }) => (
                                    <tr key={prop.id} className={`hover:bg-blue-50/20 transition-colors ${!isOccupied ? 'bg-slate-50/20' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isOccupied ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-300 border-slate-100'
                                                    }`}>
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 mb-0.5">{prop.title}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="text-slate-300">•</span> {prop.property_type || 'Catégorie N/A'}
                                                        <span className="text-slate-300">•</span> {prop.location?.commune || 'Sans commune'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-slate-900 bg-slate-50/30">
                                            {formatCurrency(monthlyRentTarget)}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {isOccupied ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-black text-blue-600">{formatCurrency(monthlyRentContract)}</span>
                                                    {monthlyRentContract !== monthlyRentTarget && (
                                                        <span className={`text-[10px] font-bold ${monthlyRentContract > monthlyRentTarget ? 'text-emerald-500' : 'text-orange-500'}`}>
                                                            {monthlyRentContract > monthlyRentTarget ? '↑ Sur-performance' : '↓ Sous-coté'}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 italic text-xs font-medium">Non loué</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`font-black ${amountPaid > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                    {amountPaid > 0 ? formatCurrency(amountPaid) : '—'}
                                                </span>
                                                {balanceDue > 0 && (
                                                    <span className="text-[10px] font-black text-rose-500">
                                                        Reste : {formatCurrency(balanceDue)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {statusBadge(status)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-900 text-white">
                                <tr>
                                    <td className="px-6 py-5">
                                        <div className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-1">Résumé Consolidé</div>
                                        <div className="text-sm font-medium text-slate-300 italic">Total des montants listés</div>
                                    </td>
                                    <td className="px-4 py-5 text-right">
                                        <div className="font-black text-lg">{formatCurrency(stats.totalPotential)}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Potentiel total</div>
                                    </td>
                                    <td className="px-4 py-5 text-right">
                                        <div className="font-black text-lg text-blue-400">{formatCurrency(stats.monthlyExpected)}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Attendu contrats</div>
                                    </td>
                                    <td className="px-4 py-5 text-right">
                                        <div className="font-black text-lg text-emerald-400">{formatCurrency(stats.monthlyPaid)}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Encaissé réel</div>
                                    </td>
                                    <td className="px-4 py-5 text-center">
                                        {stats.totalPotential > 0 && (
                                            <div className="inline-block p-1 border border-slate-700 rounded-lg">
                                                <div className="text-[8px] font-black text-slate-500 uppercase px-2 mb-0.5">Performance</div>
                                                <div className="text-xs font-black text-white px-2">
                                                    {Math.round((stats.monthlyPaid / stats.totalPotential) * 100)}%
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};
