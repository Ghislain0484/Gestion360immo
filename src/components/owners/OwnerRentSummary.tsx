import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Clock, Building2 } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { Property, RentReceipt } from '../../types/db';
import { Contract } from '../../types/contracts';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface OwnerRentSummaryProps {
    ownerId: string;
    ownerProperties: Property[];
}

const MONTHS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const OwnerRentSummary: React.FC<OwnerRentSummaryProps> = ({ ownerId, ownerProperties }) => {
    const { agencyId } = useAuth();
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);

    // --- Fetch all active contracts for the owner's properties ---
    const fetchContracts = React.useCallback(async () => {
        if (!agencyId || ownerProperties.length === 0) return [];
        // Fetch all location contracts for agency, filter client-side by property
        return dbService.contracts.getAll({ agency_id: agencyId, status: 'active', type: 'location' });
    }, [agencyId, ownerProperties]);

    const { data: allContracts = [], initialLoading: loadingContracts } = useRealtimeData<Contract>(
        fetchContracts,
        'contracts',
        { agency_id: agencyId || undefined, status: 'active', type: 'location' }
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
        // Monthly expected = sum of monthly_rent for all active contracts
        const monthlyExpected = ownerContracts.reduce((sum, c) => sum + (c.monthly_rent || 0), 0);
        const yearlyExpected = monthlyExpected * 12;

        // Current month receipts
        const currentMonthReceipts = allReceipts.filter(
            r => r.period_month === currentMonth && r.period_year === currentYear
        );

        // Year receipts
        const currentYearReceipts = allReceipts.filter(r => r.period_year === currentYear);

        // Collected
        const monthlyCollected = currentMonthReceipts.reduce((sum, r) => sum + (r.amount_paid ?? r.total_amount), 0);
        const yearlyCollected = currentYearReceipts.reduce((sum, r) => sum + (r.amount_paid ?? r.total_amount), 0);

        // Unpaid
        const monthlyUnpaid = Math.max(0, monthlyExpected - monthlyCollected);
        const yearlyUnpaid = Math.max(0, yearlyExpected - yearlyCollected);

        // Per-property status for current month
        const propertyRows = ownerProperties.map(prop => {
            const contract = ownerContracts.find(c => c.property_id === prop.id);
            const monthlyRent = contract?.monthly_rent || 0;

            const receipt = currentMonthReceipts.find(r => r.property_id === prop.id);
            let status: 'paid' | 'partial' | 'unpaid' | 'no_contract';
            let amountPaid = 0;
            let balanceDue = 0;

            if (!contract) {
                status = 'no_contract';
            } else if (!receipt) {
                status = 'unpaid';
                balanceDue = monthlyRent;
            } else {
                amountPaid = receipt.amount_paid ?? receipt.total_amount;
                balanceDue = receipt.balance_due ?? Math.max(0, monthlyRent - amountPaid);
                status = receipt.payment_status === 'partial' || balanceDue > 0 ? 'partial' : 'paid';
            }

            return { prop, monthlyRent, status, amountPaid, balanceDue };
        });

        return { monthlyExpected, yearlyExpected, monthlyCollected, yearlyCollected, monthlyUnpaid, yearlyUnpaid, propertyRows };
    }, [ownerContracts, allReceipts, ownerProperties, currentMonth, currentYear]);

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
            case 'paid': return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3" /> Payé
                </span>
            );
            case 'partial': return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                    <AlertTriangle className="w-3 h-3" /> Partiel
                </span>
            );
            case 'unpaid': return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    <Clock className="w-3 h-3" /> Impayé
                </span>
            );
            default: return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                    Sans contrat actif
                </span>
            );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900 text-lg">Tableau de bord des revenus</h3>
                    <p className="text-sm text-gray-500">
                        {MONTHS_FR[currentMonth]} {currentYear} — Vue consolidée de tous les biens
                    </p>
                </div>
            </div>

            {/* Summary Cards — 2 rows: monthly | yearly */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Monthly */}
                <Card className="p-5 border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-3">
                        📅 Ce mois · {MONTHS_FR[currentMonth]} {currentYear}
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Loyers attendus</span>
                            <span className="font-bold text-gray-900">{formatCurrency(stats.monthlyExpected)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-green-700 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Encaissé
                            </span>
                            <span className="font-bold text-green-700">{formatCurrency(stats.monthlyCollected)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-blue-100 pt-2 mt-2">
                            <span className="text-sm text-red-600 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" /> Reste à percevoir
                            </span>
                            <span className={`font-bold ${stats.monthlyUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(stats.monthlyUnpaid)}
                            </span>
                        </div>
                        {/* Progress bar */}
                        {stats.monthlyExpected > 0 && (
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Taux de collecte</span>
                                    <span>{Math.min(100, Math.round((stats.monthlyCollected / stats.monthlyExpected) * 100))}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min(100, (stats.monthlyCollected / stats.monthlyExpected) * 100)}%`,
                                            background: stats.monthlyUnpaid === 0 ? '#16a34a' : '#3b82f6'
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Yearly */}
                <Card className="p-5 border border-purple-100 bg-gradient-to-br from-purple-50 to-white">
                    <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-3">
                        📆 Cette année · {currentYear}
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Loyers attendus</span>
                            <span className="font-bold text-gray-900">{formatCurrency(stats.yearlyExpected)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-green-700 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Encaissé
                            </span>
                            <span className="font-bold text-green-700">{formatCurrency(stats.yearlyCollected)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-purple-100 pt-2 mt-2">
                            <span className="text-sm text-red-600 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" /> Reste à percevoir
                            </span>
                            <span className={`font-bold ${stats.yearlyUnpaid > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(stats.yearlyUnpaid)}
                            </span>
                        </div>
                        {/* Progress bar */}
                        {stats.yearlyExpected > 0 && (
                            <div className="mt-2">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Taux de collecte</span>
                                    <span>{Math.min(100, Math.round((stats.yearlyCollected / stats.yearlyExpected) * 100))}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min(100, (stats.yearlyCollected / stats.yearlyExpected) * 100)}%`,
                                            background: stats.yearlyUnpaid === 0 ? '#16a34a' : '#7c3aed'
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Per-property table for current month */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    Statut par bien — {MONTHS_FR[currentMonth]} {currentYear}
                </h4>
                <Card className="overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bien</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Loyer attendu</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Encaissé</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Reste</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {stats.propertyRows.map(({ prop, monthlyRent, status, amountPaid, balanceDue }) => (
                                <tr key={prop.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{prop.title}</div>
                                        <div className="text-xs text-gray-400">{prop.location?.commune}, {prop.location?.quartier}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                                        {monthlyRent > 0 ? formatCurrency(monthlyRent) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-700">
                                        {amountPaid > 0 ? formatCurrency(amountPaid) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">
                                        {balanceDue > 0
                                            ? <span className="text-red-600">{formatCurrency(balanceDue)}</span>
                                            : <span className="text-green-600">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">{statusBadge(status)}</td>
                                </tr>
                            ))}
                        </tbody>
                        {/* Footer row totals */}
                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                            <tr>
                                <td className="px-4 py-3 font-bold text-gray-700">Total</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(stats.monthlyExpected)}</td>
                                <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(stats.monthlyCollected)}</td>
                                <td className="px-4 py-3 text-right font-bold text-red-600">
                                    {stats.monthlyUnpaid > 0 ? formatCurrency(stats.monthlyUnpaid) : '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {stats.monthlyUnpaid === 0 && stats.monthlyExpected > 0
                                        ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Tout soldé</span>
                                        : null}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </Card>
            </div>
        </div>
    );
};
