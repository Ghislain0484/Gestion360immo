import React, { useState } from 'react';
import { X, DollarSign, CreditCard, Banknote, Receipt } from 'lucide-react';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (paymentData: PaymentData) => void;
    contractData: {
        tenant_name: string;
        property_title: string;
        montant: number;
        type: 'location' | 'caution' | 'frais_agence';
    };
    ownerName: string;
}

export interface PaymentData {
    montant: number;
    mode_paiement: 'especes' | 'virement' | 'cheque' | 'mobile_money';
    reference?: string;
    notes?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    contractData,
    ownerName,
}) => {
    const [paymentData, setPaymentData] = useState<PaymentData>({
        montant: contractData.montant,
        mode_paiement: 'especes',
        reference: '',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(paymentData);
        onClose();
    };

    if (!isOpen) return null;

    const paymentMethods = [
        { value: 'especes', label: 'Espèces', icon: Banknote },
        { value: 'virement', label: 'Virement', icon: CreditCard },
        { value: 'cheque', label: 'Chèque', icon: Receipt },
        { value: 'mobile_money', label: 'Mobile Money', icon: DollarSign },
    ];

    const typeLabels = {
        location: 'Loyer',
        caution: 'Caution',
        frais_agence: "Frais d'agence",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-indigo-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Encaissement Paiement</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Signature du contrat - {contractData.tenant_name}
                        </p>
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
                    {/* Contract Info */}
                    <div className="bg-gradient-to-br from-primary-50 to-indigo-50 rounded-lg p-4 border border-primary-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Détails du Paiement</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Locataire:</span>
                                <p className="font-medium text-gray-900">{contractData.tenant_name}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Propriété:</span>
                                <p className="font-medium text-gray-900">{contractData.property_title}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Propriétaire:</span>
                                <p className="font-medium text-gray-900">{ownerName}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Type:</span>
                                <p className="font-medium text-gray-900">{typeLabels[contractData.type]}</p>
                            </div>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Montant à encaisser
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="number"
                                value={paymentData.montant}
                                onChange={(e) => setPaymentData({ ...paymentData, montant: parseFloat(e.target.value) })}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-semibold"
                                required
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 font-medium">FCFA</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Mode de paiement
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map((method) => {
                                const Icon = method.icon;
                                const isSelected = paymentData.mode_paiement === method.value;
                                return (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setPaymentData({ ...paymentData, mode_paiement: method.value as any })}
                                        className={clsx(
                                            'flex items-center gap-3 p-4 border-2 rounded-lg transition-all duration-200',
                                            isSelected
                                                ? 'border-primary-600 bg-primary-50 shadow-md'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        )}
                                    >
                                        <Icon className={clsx('w-5 h-5', isSelected ? 'text-primary-600' : 'text-gray-400')} />
                                        <span className={clsx('font-medium', isSelected ? 'text-primary-900' : 'text-gray-700')}>
                                            {method.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reference (for non-cash payments) */}
                    {paymentData.mode_paiement !== 'especes' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Référence {paymentData.mode_paiement === 'cheque' ? 'du chèque' : 'de la transaction'}
                            </label>
                            <input
                                type="text"
                                value={paymentData.reference}
                                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                                placeholder={`Ex: ${paymentData.mode_paiement === 'cheque' ? 'N° 123456' : 'TXN-20260203-001'}`}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (optionnel)
                        </label>
                        <textarea
                            value={paymentData.notes}
                            onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                            rows={3}
                            placeholder="Informations complémentaires..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between text-lg font-semibold">
                            <span className="text-gray-700">Total à encaisser:</span>
                            <span className="text-primary-600">{paymentData.montant.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Ce montant sera crédité dans la caisse de <span className="font-medium">{ownerName}</span>
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-medium rounded-lg hover:from-primary-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            Confirmer l'encaissement
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default PaymentModal;
