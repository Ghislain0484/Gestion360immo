import React, { useMemo } from 'react';
import { Calendar, Download, Eye, CreditCard } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { RentReceipt } from '../../types/db';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';

interface PaymentsListProps {
    tenantId?: string;
    propertyId?: string;
    ownerId?: string;
    limit?: number;
    showActions?: boolean;
}

interface PaymentWithDetails extends RentReceipt {
    tenant?: { first_name: string; last_name: string; business_id: string };
    property?: { title: string; business_id: string };
}

export const PaymentsList: React.FC<PaymentsListProps> = ({
    tenantId,
    propertyId,
    ownerId,
    limit = 20,
    showActions = true,
}) => {
    // Fetch payments with filters
    const fetchPayments = React.useCallback(async () => {
        const params: any = {};
        if (tenantId) params.tenant_id = tenantId;
        if (propertyId) params.property_id = propertyId;
        if (ownerId) params.owner_id = ownerId;

        const data = await dbService.rentReceipts.getAll(params);
        return data || [];
    }, [tenantId, propertyId, ownerId]);

    const { data: payments = [], initialLoading } = useRealtimeData<PaymentWithDetails>(
        fetchPayments,
        'rent_receipts',
        { tenant_id: tenantId, property_id: propertyId, owner_id: ownerId }
    );

    // Sort by payment date (most recent first) and limit
    const sortedPayments = useMemo(() => {
        const sorted = [...payments].sort((a, b) =>
            new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        );
        return limit ? sorted.slice(0, limit) : sorted;
    }, [payments, limit]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            minimumFractionDigits: 0
        }).format(amount);

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            especes: 'Espèces',
            cheque: 'Chèque',
            virement: 'Virement',
            mobile_money: 'Mobile Money',
            bank_transfer: 'Virement bancaire',
            cash: 'Espèces',
            check: 'Chèque',
        };
        return labels[method] || method;
    };

    const getPaymentMethodIcon = () => {
        return <CreditCard className="w-4 h-4" />;
    };

    if (initialLoading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" label="Chargement des paiements..." />
            </div>
        );
    }

    if (sortedPayments.length === 0) {
        return (
            <EmptyState
                icon="💰"
                title="Aucun paiement enregistré"
                description="Les paiements apparaîtront ici une fois enregistrés"
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="text-sm text-gray-500 mb-1">Total paiements</div>
                    <div className="text-2xl font-bold text-gray-900">{sortedPayments.length}</div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-gray-500 mb-1">Montant total</div>
                    <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(sortedPayments.reduce((sum, p) => sum + p.total_amount, 0))}
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="text-sm text-gray-500 mb-1">Dernier paiement</div>
                    <div className="text-lg font-semibold text-gray-900">
                        {sortedPayments[0] ? new Date(sortedPayments[0].payment_date).toLocaleDateString('fr-FR') : '-'}
                    </div>
                </Card>
            </div>

            {/* Payments Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quittance
                                </th>
                                {!tenantId && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Locataire
                                    </th>
                                )}
                                {!propertyId && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Propriété
                                    </th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Montant
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mode
                                </th>
                                {showActions && (
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-sm text-gray-900">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{payment.receipt_number}</div>
                                        <div className="text-xs text-gray-500">
                                            Période: {payment.period_month}/{payment.period_year}
                                        </div>
                                    </td>
                                    {!tenantId && payment.tenant && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {payment.tenant.first_name} {payment.tenant.last_name}
                                            </div>
                                            <div className="text-xs text-gray-500">{payment.tenant.business_id}</div>
                                        </td>
                                    )}
                                    {!propertyId && payment.property && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{payment.property.title}</div>
                                            <div className="text-xs text-gray-500">{payment.property.business_id}</div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-gray-900">
                                            {formatCurrency(payment.total_amount)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            {getPaymentMethodIcon()}
                                            {getPaymentMethodLabel(payment.payment_method)}
                                        </div>
                                    </td>
                                    {showActions && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        // TODO: Open payment details modal
                                                        console.log('View payment:', payment.id);
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        // TODO: Download PDF
                                                        console.log('Download PDF:', payment.id);
                                                    }}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {limit && payments.length > limit && (
                <div className="text-center text-sm text-gray-500">
                    Affichage de {limit} paiements sur {payments.length} au total
                </div>
            )}
        </div>
    );
};
