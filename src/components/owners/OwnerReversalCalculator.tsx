import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Trash2, Calculator, DollarSign, TrendingDown, ArrowRight } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService, supabase } from '../../lib/supabase';
import { RentReceipt } from '../../types/db';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface DeductibleFee {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: 'reparation' | 'charge' | 'autre';
}

export interface ReversalTransaction {
    id: string;
    date: string;
    description: string;
    propertyTitle: string;
    amount: number;
    commission: number;
    type: 'receipt' | 'manual';
    status?: 'full' | 'partial';
}

export interface ReversalDetails {
    period: { startDate: string; endDate: string };
    totalRent: number;
    totalCommission: number;
    totalFees: number;
    netAmount: number;
    paymentsCount: number;
    fees: DeductibleFee[];
    transactions: ReversalTransaction[];
}

interface OwnerReversalCalculatorProps {
    ownerId: string;
    ownerProperties?: any[];
    onGenerateReversal: (amount: number, details: ReversalDetails) => void;
}

export const OwnerReversalCalculator: React.FC<OwnerReversalCalculatorProps> = ({
    ownerId,
    ownerProperties = [],
    onGenerateReversal,
}) => {
    const currentDate = new Date();
    // Set default period: first day of current month to last day of current month
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(lastDayOfMonth.toISOString().split('T')[0]);
    const [fees, setFees] = useState<DeductibleFee[]>([]);
    const [newFee, setNewFee] = useState({ description: '', amount: 0, category: 'autre' as const });

    // Fetch payments for the owner
    const fetchPayments = React.useCallback(async () => {
        const params = { owner_id: ownerId };
        const data = await dbService.rentReceipts.getAll(params);
        return data || [];
    }, [ownerId]);

    const { data: allPayments = [], initialLoading } = useRealtimeData<RentReceipt>(
        fetchPayments,
        'rent_receipts',
        { owner_id: ownerId }
    );

    // --- Fetch all manual transactions for this owner ---
    const fetchManualTransactions = React.useCallback(async () => {
        if (!ownerId) return [];
        const { data, error } = await supabase
            .from('modular_transactions')
            .select('*')
            .eq('related_owner_id', ownerId)
            .in('category', ['rent_payment', 'caution'])
            .eq('type', 'income');
        if (error) throw error;
        return data || [];
    }, [ownerId]);

    const { data: allManual = [], initialLoading: loadingManual } = useRealtimeData<any>(
        fetchManualTransactions,
        'modular_transactions',
        { related_owner_id: ownerId }
    );

    // Filter payments and manual transactions by selected period
    const periodPayments = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const filteredReceipts = allPayments.filter((payment) => {
            const paymentDate = new Date(payment.payment_date);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate >= start && paymentDate <= end;
        });

        const filteredManual = allManual.filter((m: any) => {
            const d = new Date(m.transaction_date);
            d.setHours(0, 0, 0, 0);
            return d >= start && d <= end;
        });

        return { receipts: filteredReceipts, manual: filteredManual };
    }, [allPayments, allManual, startDate, endDate]);

    // Calculate totals and transaction breakdown
    const calculations = useMemo(() => {
        const transactions: ReversalTransaction[] = [];
        
        // Process Receipts
        periodPayments.receipts.forEach(p => {
            const prop = ownerProperties.find(op => op.id === p.property_id);
            const amount = p.amount_paid || p.total_amount;
            const comm = p.commission_amount || 0;
            
            transactions.push({
                id: p.id,
                date: p.payment_date,
                description: `Quittance - ${p.receipt_number || 'N/A'}`,
                propertyTitle: prop?.title || 'Bien non identifié',
                amount: amount,
                commission: comm,
                type: 'receipt',
                status: p.payment_status || (p.amount_paid && p.amount_paid < p.total_amount ? 'partial' : 'full')
            });
        });

        // Process Manual Transactions
        periodPayments.manual.forEach(m => {
            const prop = ownerProperties.find(op => op.id === m.related_property_id);
            const match = m.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
            const ownerNet = match ? Number(match[1]) : (Number(m.amount) * 0.9);
            const comm = Number(m.amount) - ownerNet;

            transactions.push({
                id: m.id,
                date: m.transaction_date,
                description: m.description || 'Paiement manuel',
                propertyTitle: prop?.title || 'Bien non identifié',
                amount: Number(m.amount),
                commission: comm,
                type: 'manual'
            });
        });

        const totalRent = transactions.reduce((sum, t) => sum + t.amount, 0);
        const totalCommission = transactions.reduce((sum, t) => sum + t.commission, 0);
        const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
        const netAmount = totalRent - totalCommission - totalFees;

        return {
            totalRent,
            totalCommission,
            totalFees,
            netAmount,
            paymentsCount: transactions.length,
            transactions
        };
    }, [periodPayments, fees, ownerProperties]);

    const handleAddFee = () => {
        if (newFee.description && newFee.amount > 0) {
            setFees([
                ...fees,
                {
                    ...newFee,
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                },
            ]);
            setNewFee({ description: '', amount: 0, category: 'autre' });
        }
    };

    const handleRemoveFee = (id: string) => {
        setFees(fees.filter((f) => f.id !== id));
    };

    const handleGenerateReversal = () => {
        const details: ReversalDetails = {
            period: { startDate, endDate },
            totalRent: calculations.totalRent,
            totalCommission: calculations.totalCommission,
            totalFees: calculations.totalFees,
            netAmount: calculations.netAmount,
            paymentsCount: calculations.paymentsCount,
            fees,
            transactions: calculations.transactions,
        };
        onGenerateReversal(calculations.netAmount, details);
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount) + ' FCFA';

    const formatPeriod = () => {
        const start = new Date(startDate).toLocaleDateString('fr-FR');
        const end = new Date(endDate).toLocaleDateString('fr-FR');
        return `${start} - ${end}`;
    };

    if (initialLoading || loadingManual) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" label="Chargement..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Calculateur de reversement</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Période : {formatPeriod()}
                    </p>
                </div>
                <Calculator className="w-8 h-8 text-indigo-600" />
            </div>

            {/* Period Selector */}
            <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700">Période de calcul</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Date de début</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
                {new Date(endDate) < new Date(startDate) && (
                    <p className="text-xs text-red-600 mt-2">
                        ⚠️ La date de fin doit être postérieure à la date de début
                    </p>
                )}
            </Card>

            {/* Detailed Transactions List */}
            {calculations.transactions.length > 0 && (
                <Card className="p-0 overflow-hidden border-slate-200">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="font-semibold text-gray-900 text-sm">Détail des encaissements</h4>
                        <Badge variant="info" className="text-[10px]">{calculations.transactions.length} opérations</Badge>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="sticky top-0 bg-white shadow-sm">
                                <tr>
                                    <th className="px-4 py-2 font-bold text-gray-500">Bien / Description</th>
                                    <th className="px-4 py-2 text-right font-bold text-gray-500">Montant</th>
                                    <th className="px-4 py-2 text-right font-bold text-gray-500">Comm.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {calculations.transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-gray-900">{t.propertyTitle}</div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] text-gray-400">{t.description}</span>
                                                {t.status === 'partial' && (
                                                    <Badge variant="warning" className="text-[8px] py-0 px-1 border-none bg-amber-100 text-amber-700">Partiel</Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-gray-900">
                                            {formatCurrency(t.amount)}
                                        </td>
                                        <td className="px-4 py-2 text-right text-red-500">
                                            -{formatCurrency(t.commission)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Calculation Summary */}
            <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
                <h4 className="font-semibold text-gray-900 mb-4">Récapitulatif du calcul</h4>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">Loyers encaissés ({calculations.paymentsCount} paiements)</span>
                        </div>
                        <span className="font-semibold text-green-600">{formatCurrency(calculations.totalRent)}</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-gray-700">Commission agence</span>
                        </div>
                        <span className="font-semibold text-red-600">- {formatCurrency(calculations.totalCommission)}</span>
                    </div>

                    {calculations.totalFees > 0 && (
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-orange-500" />
                                <span className="text-sm text-gray-700">Frais déductibles ({fees.length})</span>
                            </div>
                            <span className="font-semibold text-orange-600">- {formatCurrency(calculations.totalFees)}</span>
                        </div>
                    )}

                    <div className="border-t-2 border-indigo-300 pt-3 mt-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowRight className="w-5 h-5 text-indigo-600" />
                                <span className="font-semibold text-gray-900">Montant à reverser</span>
                            </div>
                            <span className="text-2xl font-bold text-indigo-600">{formatCurrency(calculations.netAmount)}</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Deductible Fees */}
            <Card className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Frais déductibles</h4>

                {/* Add Fee Form */}
                <div className="grid grid-cols-12 gap-3 mb-4">
                    <input
                        type="text"
                        value={newFee.description}
                        onChange={(e) => setNewFee({ ...newFee, description: e.target.value })}
                        placeholder="Description (ex: Réparation toiture)"
                        className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                    <input
                        type="number"
                        value={newFee.amount || ''}
                        onChange={(e) => setNewFee({ ...newFee, amount: parseFloat(e.target.value) || 0 })}
                        placeholder="Montant"
                        className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        min="0"
                    />
                    <select
                        value={newFee.category}
                        onChange={(e) => setNewFee({ ...newFee, category: e.target.value as any })}
                        className="col-span-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                        <option value="reparation">Réparation</option>
                        <option value="charge">Charge</option>
                        <option value="autre">Autre</option>
                    </select>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddFee}
                        disabled={!newFee.description || newFee.amount <= 0}
                        className="col-span-1"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                {/* Fees List */}
                {fees.length > 0 ? (
                    <div className="space-y-2">
                        {fees.map((fee) => (
                            <div
                                key={fee.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{fee.description}</p>
                                    <p className="text-xs text-gray-500 capitalize">{fee.category}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-900">{formatCurrency(fee.amount)}</span>
                                    <button
                                        onClick={() => handleRemoveFee(fee.id)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                        Aucun frais déductible ajouté
                    </p>
                )}
            </Card>

            {/* Generate Button */}
            <Button
                variant="primary"
                size="lg"
                onClick={handleGenerateReversal}
                disabled={calculations.netAmount <= 0 || calculations.paymentsCount === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
                <DollarSign className="w-5 h-5 mr-2" />
                Générer le reversement de {formatCurrency(calculations.netAmount)}
            </Button>

            {calculations.paymentsCount === 0 && (
                <p className="text-sm text-amber-600 text-center">
                    Aucun paiement trouvé pour la période sélectionnée
                </p>
            )}
        </div>
    );
};
