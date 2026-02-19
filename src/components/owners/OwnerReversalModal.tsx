import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Banknote, Receipt, ArrowDownLeft, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import { ReversalDetails } from './OwnerReversalCalculator';

interface OwnerReversalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    ownerId: string;
    ownerName: string;
    initialAmount?: number;
    details?: ReversalDetails | null;
}

export interface ReversalData {
    montant: number;
    mode_paiement: 'especes' | 'virement' | 'cheque' | 'mobile_money';
    reference?: string;
    notes?: string;
}

export const OwnerReversalModal: React.FC<OwnerReversalModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    ownerId,
    ownerName,
    initialAmount,
    details,
}) => {
    const { user } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [reversalData, setReversalData] = useState<ReversalData>({
        montant: 0,
        mode_paiement: 'virement',
        reference: '',
        notes: '',
    });

    // Pre-fill amount when initialAmount is provided
    useEffect(() => {
        if (initialAmount && initialAmount > 0) {
            setReversalData(prev => ({ ...prev, montant: initialAmount }));
        }
    }, [initialAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            if (!user?.agency_id) {
                alert('Impossible de déterminer l\'agence');
                return;
            }

            // Record owner reversal transaction
            const { error } = await supabase
                .from('owner_transactions')
                .insert({
                    owner_id: ownerId,
                    agency_id: user.agency_id,
                    type: 'debit',
                    montant: reversalData.montant,
                    mode_paiement: reversalData.mode_paiement,
                    reference: reversalData.reference,
                    description: `Reversement au propriétaire ${ownerName}`,
                    notes: reversalData.notes,
                    date_transaction: new Date().toISOString(),
                    created_by: user?.id,
                });

            if (error) throw error;

            if (onSuccess) onSuccess();
            onClose();

            // Reset form
            setReversalData({
                montant: 0,
                mode_paiement: 'virement',
                reference: '',
                notes: '',
            });
        } catch (error) {
            console.error('Error recording reversal:', error);
            alert('Erreur lors de l\'enregistrement du reversement');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const paymentMethods = [
        { value: 'virement', label: 'Virement', icon: CreditCard },
        { value: 'cheque', label: 'Chèque', icon: Receipt },
        { value: 'especes', label: 'Espèces', icon: Banknote },
        { value: 'mobile_money', label: 'Mobile Money', icon: DollarSign },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <ArrowDownLeft className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Reversement Propriétaire</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Enregistrer un paiement à {ownerName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Calculation Details (if provided) */}
                    {details && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <div className="flex items-start gap-2 mb-3">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-blue-900 mb-2">Détail du calcul</h4>
                                    <div className="text-sm space-y-1 text-blue-800">
                                        <div className="flex justify-between">
                                            <span>Période:</span>
                                            <span className="font-medium">
                                                {new Date(details.period.startDate).toLocaleDateString('fr-FR')} - {new Date(details.period.endDate).toLocaleDateString('fr-FR')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Paiements encaissés:</span>
                                            <span className="font-medium">{details.paymentsCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total loyers:</span>
                                            <span className="font-medium">{details.totalRent.toLocaleString('fr-FR')} FCFA</span>
                                        </div>
                                        <div className="flex justify-between text-red-700">
                                            <span>Commission agence:</span>
                                            <span className="font-medium">- {details.totalCommission.toLocaleString('fr-FR')} FCFA</span>
                                        </div>
                                        {details.totalFees > 0 && (
                                            <div className="flex justify-between text-orange-700">
                                                <span>Frais déductibles ({details.fees.length}):</span>
                                                <span className="font-medium">- {details.totalFees.toLocaleString('fr-FR')} FCFA</span>
                                            </div>
                                        )}
                                        <div className="border-t border-blue-300 pt-2 mt-2 flex justify-between font-semibold text-blue-900">
                                            <span>Montant net:</span>
                                            <span>{details.netAmount.toLocaleString('fr-FR')} FCFA</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                        <h3 className="font-semibold text-gray-900 mb-2">Informations</h3>
                        <div className="text-sm space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Propriétaire:</span>
                                <p className="font-medium text-gray-900">{ownerName}</p>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Type de transaction:</span>
                                <p className="font-medium text-gray-900">Reversement (Débit)</p>
                            </div>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Montant à reverser *
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="number"
                                value={reversalData.montant}
                                onChange={(e) => setReversalData({ ...reversalData, montant: parseFloat(e.target.value) })}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-semibold"
                                placeholder="0"
                                required
                                min="0"
                                step="0.01"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 font-medium">FCFA</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Mode de paiement *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map((method) => {
                                const Icon = method.icon;
                                const isSelected = reversalData.mode_paiement === method.value;
                                return (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setReversalData({ ...reversalData, mode_paiement: method.value as any })}
                                        className={clsx(
                                            'flex items-center gap-3 p-4 border-2 rounded-lg transition-all duration-200',
                                            isSelected
                                                ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        )}
                                    >
                                        <Icon className={clsx('w-5 h-5', isSelected ? 'text-indigo-600' : 'text-gray-400')} />
                                        <span className={clsx('font-medium', isSelected ? 'text-indigo-900' : 'text-gray-700')}>
                                            {method.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reference */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Référence de la transaction
                        </label>
                        <input
                            type="text"
                            value={reversalData.reference}
                            onChange={(e) => setReversalData({ ...reversalData, reference: e.target.value })}
                            placeholder={`Ex: ${reversalData.mode_paiement === 'cheque' ? 'N° 123456' : 'TXN-20260203-001'}`}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (optionnel)
                        </label>
                        <textarea
                            value={reversalData.notes}
                            onChange={(e) => setReversalData({ ...reversalData, notes: e.target.value })}
                            rows={3}
                            placeholder="Informations complémentaires sur ce reversement..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between text-lg font-semibold">
                            <span className="text-gray-700">Montant total:</span>
                            <span className="text-indigo-600">{reversalData.montant.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Ce montant sera débité de la caisse de <span className="font-medium">{ownerName}</span>
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing || reversalData.montant <= 0}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <LoadingSpinner size="sm" color="white" />
                                    <span>Enregistrement...</span>
                                </>
                            ) : (
                                <>
                                    <ArrowDownLeft className="w-5 h-5" />
                                    <span>Enregistrer le reversement</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default OwnerReversalModal;
