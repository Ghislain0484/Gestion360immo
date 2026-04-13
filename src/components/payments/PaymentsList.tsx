import React, { useMemo } from 'react';
import { Calendar, Download, Eye, CreditCard, X, Trash2 } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService, supabase } from '../../lib/supabase';
import { RentReceipt } from '../../types/db';
import { ModularTransaction } from '../../types/modular';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { printReceiptHTML, downloadReceiptPDF } from '../../utils/receiptActions';

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

const MONTHS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export const PaymentsList: React.FC<PaymentsListProps> = ({
    tenantId,
    propertyId,
    ownerId,
    limit = 20,
    showActions = true,
}) => {
    const { user, agencyId } = useAuth();
    const [selectedPayment, setSelectedPayment] = React.useState<any | null>(null);
    const [paymentToDelete, setPaymentToDelete] = React.useState<any | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    
    // Check if user can delete
    const canDelete = ['director', 'manager'].includes(user?.role || '');

    // Fetch payments with filters
    const fetchPayments = React.useCallback(async () => {
        const params: any = {};
        if (tenantId) params.tenant_id = tenantId;
        if (propertyId) params.property_id = propertyId;
        if (ownerId) params.owner_id = ownerId;

        // Fetch rent receipts
        const receiptsData = await dbService.rentReceipts.getAll(params);
        
        // Fetch modular transactions
        let modularData: ModularTransaction[] = [];
        if (tenantId) {
            modularData = await dbService.modular.getTenantTransactions(tenantId);
        } else if (ownerId) {
            const { data, error } = await supabase
                .from('modular_transactions')
                .select('*')
                .eq('related_owner_id', ownerId)
                .in('category', ['rent_payment', 'caution']);
            if (error) console.error('Error fetching owner transactions:', error);
            modularData = data || [];
        } else if (agencyId) {
            const startDate = new Date(2020, 0, 1).toISOString();
            const endDate = new Date(2030, 0, 1).toISOString();
            modularData = await dbService.modular.getAgencyTransactions(agencyId, startDate, endDate);
        }

        const normalizedReceipts = (receiptsData || []).map(r => ({
            ...r,
            displayDate: r.payment_date,
            displayAmount: r.amount_paid ?? r.total_amount,
            displayTitle: r.receipt_number,
            displayType: 'receipt',
            owner_payment: r.owner_payment
        }));

        const normalizedModular = (modularData || [])
            .filter(t => t.type === 'income' || t.type === 'credit')
            .map(t => {
                const match = t.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
                const ownerPayment = match ? Number(match[1]) : (Number(t.amount) * 0.9);
                
                return {
                    id: t.id,
                    payment_date: t.transaction_date,
                    total_amount: Number(t.amount),
                    amount_paid: Number(t.amount),
                    payment_method: t.payment_method,
                    receipt_number: 'TXN-' + t.id.slice(0, 8).toUpperCase(),
                    notes: t.description,
                    period_month: new Date(t.transaction_date).getMonth() + 1,
                    period_year: new Date(t.transaction_date).getFullYear(),
                    displayDate: t.transaction_date,
                    displayAmount: Number(t.amount),
                    displayTitle: t.description,
                    displayType: 'transaction',
                    owner_payment: ownerPayment
                };
            });

        return [...normalizedReceipts, ...normalizedModular] as any[];
    }, [tenantId, propertyId, ownerId, agencyId]);

    const { data: payments = [], initialLoading } = useRealtimeData<any>(
        fetchPayments,
        'rent_receipts', // Note: This only listens to one table, might need manual refetch for modular
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

    // Télécharger la quittance en PDF
    const handleDownloadPDF = async (payment: PaymentWithDetails) => {
        if (!user?.agency_id) return;
        await downloadReceiptPDF(payment, user.agency_id, {
            tenantName: payment.tenant ? `${payment.tenant.first_name} ${payment.tenant.last_name}` : undefined,
            propertyTitle: payment.property?.title,
            ownerName: undefined // Would need a separate fetch or join
        });
    };

    // Imprimer la quittance
    const handlePrint = async (payment: PaymentWithDetails) => {
        if (!user?.agency_id) return;
        await printReceiptHTML(payment, user.agency_id, {
            tenantName: payment.tenant ? `${payment.tenant.first_name} ${payment.tenant.last_name}` : undefined,
            propertyTitle: payment.property?.title,
            ownerName: undefined
        });
    };


    const handleDelete = async () => {
        if (!paymentToDelete || !user?.id || !agencyId) return;
        setIsDeleting(true);
        try {
            const tableName = paymentToDelete.displayType === 'receipt' ? 'rent_receipts' : 'modular_transactions';
            
            // 1. Log the deletion in audit logs
            await dbService.auditLogs.logDeletion({
                table_name: tableName,
                record_id: paymentToDelete.id,
                old_values: paymentToDelete,
                userId: user.id,
                agencyId: agencyId
            });

            // 2. Perform the deletion
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', paymentToDelete.id);

            if (error) throw error;

            toast.success('Élément supprimé avec succès');
            setPaymentToDelete(null);
        } catch (error: any) {
            console.error('Error deleting:', error);
            toast.error('Erreur lors de la suppression : ' + error.message);
        } finally {
            setIsDeleting(false);
        }
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quittance</th>
                                {!tenantId && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locataire</th>
                                )}
                                {!propertyId && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propriété</th>
                                )}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Proprio</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                                {showActions && (
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                                        <div className="text-sm font-medium text-gray-900">{payment.displayTitle}</div>
                                        <div className="text-xs text-gray-500">
                                            {payment.displayType === 'receipt' ? `Période: ${MONTHS_FR[payment.period_month] || payment.period_month} ${payment.period_year}` : 'Transaction de Caisse'}
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
                                        <div className="text-sm font-medium text-indigo-600">
                                            {payment.owner_payment ? formatCurrency(payment.owner_payment) : '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-gray-900">
                                            {formatCurrency(payment.amount_paid ?? payment.total_amount)}
                                        </div>
                                        {(payment.amount_paid ?? payment.total_amount) < payment.total_amount && (
                                            <div className="text-xs text-gray-400 line-through">
                                                {formatCurrency(payment.total_amount)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {payment.payment_status === 'partial' || ((payment.amount_paid ?? payment.total_amount) < payment.total_amount) ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                                ⚠ Partiel
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                ✓ Soldé
                                            </span>
                                        )}
                                        {payment.balance_due != null && payment.balance_due > 0 && (
                                            <div className="text-xs text-red-500 mt-1">
                                                Reste : {formatCurrency(payment.balance_due)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <CreditCard className="w-4 h-4" />
                                            {getPaymentMethodLabel(payment.payment_method)}
                                        </div>
                                    </td>
                                    {showActions && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Voir la quittance"
                                                    onClick={() => setSelectedPayment(payment)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Télécharger PDF"
                                                    onClick={() => handleDownloadPDF(payment)}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        title="Supprimer"
                                                        onClick={() => setPaymentToDelete(payment)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
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

            {/* Modal détail quittance */}
            {selectedPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPayment(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        {/* Header modal */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Quittance de loyer</h2>
                                <p className="text-sm text-gray-500 mt-1">N° {selectedPayment.receipt_number}</p>
                            </div>
                            <button onClick={() => setSelectedPayment(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Contenu */}
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Période</span>
                                    <span className="font-medium text-gray-900">{MONTHS_FR[selectedPayment.period_month] || selectedPayment.period_month} {selectedPayment.period_year}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Date de paiement</span>
                                    <span className="font-medium text-gray-900">{new Date(selectedPayment.payment_date).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Mode de paiement</span>
                                    <span className="font-medium text-gray-900">{getPaymentMethodLabel(selectedPayment.payment_method)}</span>
                                </div>
                            </div>

                            {/* Montants */}
                            <div className="space-y-2">
                                {selectedPayment.rent_amount ? (
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Loyer mensuel</span><span>{selectedPayment.rent_amount.toLocaleString('fr-FR')} FCFA</span></div>
                                ) : null}
                                {selectedPayment.charges ? (
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Charges</span><span>{selectedPayment.charges.toLocaleString('fr-FR')} FCFA</span></div>
                                ) : null}
                                <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                                    <span className="text-gray-500">Loyer total dû</span>
                                    <span className="font-medium text-gray-900">{selectedPayment.total_amount.toLocaleString('fr-FR')} FCFA</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Part Propriétaire (Net)</span>
                                    <span className="font-medium text-indigo-600">{selectedPayment.owner_payment?.toLocaleString('fr-FR')} FCFA</span>
                                </div>
                                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                                    <span>MONTANT VERSÉ</span>
                                    <span className={((selectedPayment.amount_paid ?? selectedPayment.total_amount) < selectedPayment.total_amount) ? "text-orange-600" : "text-green-600"}>
                                        {(selectedPayment.amount_paid ?? selectedPayment.total_amount).toLocaleString('fr-FR')} FCFA
                                    </span>
                                </div>
                                {((selectedPayment.amount_paid ?? selectedPayment.total_amount) < selectedPayment.total_amount || (selectedPayment.balance_due ?? 0) > 0) && (
                                    <div className="flex justify-between font-bold text-base bg-red-50 rounded-lg px-3 py-2">
                                        <span className="text-red-600">SOLDE RESTANT</span>
                                        <span className="text-red-600">{(selectedPayment.balance_due ?? (selectedPayment.total_amount - (selectedPayment.amount_paid ?? selectedPayment.total_amount))).toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                )}
                            </div>

                            {selectedPayment.notes && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                                    <strong>Notes :</strong> {selectedPayment.notes}
                                </div>
                            )}
                        </div>

                        {/* Boutons */}
                        <div className="flex gap-3 p-6 pt-0">
                            <Button variant="outline" className="flex-1" onClick={() => handlePrint(selectedPayment)}>
                                Imprimer
                            </Button>
                            <Button className="flex-1" onClick={() => handleDownloadPDF(selectedPayment)}>
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger PDF
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de suppression */}
            <ConfirmDeleteModal
                isOpen={!!paymentToDelete}
                onClose={() => setPaymentToDelete(null)}
                onConfirm={handleDelete}
                itemTitle={paymentToDelete?.displayTitle}
                isLoading={isDeleting}
                message={`Vous allez supprimer ce ${paymentToDelete?.displayType === 'receipt' ? 'paiement de loyer' : 'mouvement de caisse'}. Cette opération sera tracée au nom de l'agence.`}
            />
        </div>
    );
};
