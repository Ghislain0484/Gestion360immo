import React, { useState, useMemo } from 'react';
import { Calendar, Plus, Trash2, Calculator, DollarSign, TrendingDown, ArrowRight } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { RentReceipt } from '../../types/db';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface OwnerReversalCalculatorProps {
    ownerId: string;
    ownerName: string;
    onGenerateReversal: (amount: number, details: ReversalDetails) => void;
}

export interface DeductibleFee {
    id: string;
    description: string;
    amount: number;
    date: string;
    category: 'reparation' | 'charge' | 'autre';
}

export interface ReversalDetails {
    period: { startDate: string; endDate: string };
    totalRent: number;
    totalCommission: number;
    totalFees: number;
    netAmount: number;
    paymentsCount: number;
    fees: DeductibleFee[];
}

export const OwnerReversalCalculator: React.FC<OwnerReversalCalculatorProps> = ({
    ownerId,
    ownerName,
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

    // Filter payments by selected period
    const periodPayments = useMemo(() => {
        return allPayments.filter((payment) => {
            const paymentDate = new Date(payment.payment_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            // Set time to start of day for consistent comparison
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate >= start && paymentDate <= end;
        });
    }, [allPayments, startDate, endDate]);

    // Calculate totals
    const calculations = useMemo(() => {
        const totalRent = periodPayments.reduce((sum, p) => sum + p.total_amount, 0);
        const totalCommission = periodPayments.reduce((sum, p) => sum + (p.commission_amount || 0), 0);
        const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
        const netAmount = totalRent - totalCommission - totalFees;

        return {
            totalRent,
            totalCommission,
            totalFees,
            netAmount,
            paymentsCount: periodPayments.length,
        };
    }, [periodPayments, fees]);

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

    if (initialLoading) {
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
