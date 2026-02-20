import React, { useMemo } from 'react';
import { Calendar, Download, Eye, CreditCard, X } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { RentReceipt } from '../../types/db';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { jsPDF } from 'jspdf';
import { getAgencyBranding, renderPDFHeader, renderPDFFooter } from '../../utils/agencyBranding';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

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
    const { user } = useAuth();
    const [selectedPayment, setSelectedPayment] = React.useState<PaymentWithDetails | null>(null);

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

    // Télécharger la quittance en PDF
    const handleDownloadPDF = async (payment: PaymentWithDetails) => {
        try {
            const branding = await getAgencyBranding(user?.agency_id ?? undefined);
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            let y = renderPDFHeader(doc, branding, 15);

            // Titre
            doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
            doc.text('QUITTANCE DE LOYER', pageWidth / 2, y, { align: 'center' }); y += 7;
            doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
            doc.text(`N° ${payment.receipt_number}`, pageWidth / 2, y, { align: 'center' }); y += 14;
            doc.setDrawColor(220, 220, 220); doc.line(20, y, pageWidth - 20, y); y += 10;

            const drawRow = (label: string, value: string, bold = false) => {
                doc.setFontSize(10);
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setTextColor(100, 100, 100);
                doc.text(label, 22, y);
                doc.setTextColor(30, 30, 30);
                doc.text(value, pageWidth / 2, y);
                y += 8;
            };

            // Période
            const periodStr = `${MONTHS_FR[payment.period_month] || payment.period_month} ${payment.period_year}`;
            const pmLabel = ({ especes: 'Espèces', cheque: 'Chèque', virement: 'Virement bancaire', mobile_money: 'Mobile Money', bank_transfer: 'Virement bancaire', cash: 'Espèces', check: 'Chèque' } as Record<string, string>)[payment.payment_method] || payment.payment_method;

            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(59, 130, 246);
            doc.text('INFORMATIONS DU PAIEMENT', 22, y); y += 8;
            doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.5); doc.line(22, y, pageWidth - 22, y); doc.setLineWidth(0.2); y += 6;

            drawRow('Période :', periodStr);
            drawRow('Date de paiement :', new Date(payment.payment_date).toLocaleDateString('fr-FR'));
            drawRow('Mode de paiement :', pmLabel);
            if (payment.notes) drawRow('Notes :', payment.notes);

            y += 4;
            // Totaux
            doc.setFillColor(246, 250, 255);
            doc.rect(20, y - 3, pageWidth - 40, 30, 'F');
            doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
            if (payment.rent_amount) { doc.text('Loyer :', 22, y); doc.setTextColor(30, 30, 30); doc.text(`${payment.rent_amount.toLocaleString('fr-FR')} FCFA`, pageWidth - 22, y, { align: 'right' }); y += 8; }
            if (payment.charges) { doc.text('Charges :', 22, y); doc.setTextColor(30, 30, 30); doc.text(`${payment.charges.toLocaleString('fr-FR')} FCFA`, pageWidth - 22, y, { align: 'right' }); y += 8; }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
            doc.text('TOTAL PAYÉ :', 22, y);
            doc.setTextColor(22, 163, 74);
            doc.text(`${payment.total_amount.toLocaleString('fr-FR')} FCFA`, pageWidth - 22, y, { align: 'right' }); y += 14;

            // Mention légale
            doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 140, 140);
            doc.text('Ce document atteste du paiement du loyer pour la période mentionnée ci-dessus.', pageWidth / 2, y, { align: 'center' });

            renderPDFFooter(doc, branding);
            doc.save(`quittance-${payment.receipt_number}.pdf`);
            toast.success('Quittance téléchargée !');
        } catch (err: any) {
            toast.error('Erreur PDF : ' + err.message);
        }
    };

    // Imprimer la quittance
    const handlePrint = async (payment: PaymentWithDetails) => {
        try {
            const branding = await getAgencyBranding(user?.agency_id ?? undefined);
            const logoHtml = branding.logo ? `<img src="${branding.logo}" alt="Logo" style="max-height:60px;object-fit:contain;">` : '';
            const periodStr = `${MONTHS_FR[payment.period_month] || payment.period_month} ${payment.period_year}`;
            const pmLabel = ({ especes: 'Espèces', cheque: 'Chèque', virement: 'Virement bancaire', mobile_money: 'Mobile Money', bank_transfer: 'Virement bancaire', cash: 'Espèces', check: 'Chèque' } as Record<string, string>)[payment.payment_method] || payment.payment_method;
            const win = window.open('', '_blank');
            if (!win) { toast.error("Fenêtre bloquée"); return; }
            win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Quittance ${payment.receipt_number}</title>
            <style>
              body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111;font-size:13px}
              .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #3B82F6;padding-bottom:14px;margin-bottom:16px}
              .agency-name{font-size:18px;font-weight:bold;color:#3B82F6}
              .agency-contact{font-size:10px;color:#666;margin-top:4px}
              h1{text-align:center;font-size:20px;margin:10px 0 4px}
              .receipt-num{text-align:center;color:#666;margin-bottom:16px;font-size:12px}
              table{width:100%;border-collapse:collapse;margin:12px 0}
              tr:nth-child(even){background:#f8faff}
              td{padding:7px 10px}td:first-child{color:#555;width:45%}
              .total{background:#f0f9ff;border-top:2px solid #3B82F6;font-weight:bold;font-size:15px}
              .footer{text-align:center;margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#888;font-style:italic}
            </style></head><body>
            <div class="header"><div>${logoHtml}</div><div style="text-align:right"><div class="agency-name">${branding.name}</div><div class="agency-contact">${branding.address}<br>${branding.phone}<br>${branding.email}</div></div></div>
            <h1>QUITTANCE DE LOYER</h1><div class="receipt-num">N° ${payment.receipt_number}</div>
            <table>
              <tr><td>Période</td><td>${periodStr}</td></tr>
              <tr><td>Date de paiement</td><td>${new Date(payment.payment_date).toLocaleDateString('fr-FR')}</td></tr>
              <tr><td>Mode de paiement</td><td>${pmLabel}</td></tr>
              ${payment.rent_amount ? `<tr><td>Loyer</td><td>${payment.rent_amount.toLocaleString('fr-FR')} FCFA</td></tr>` : ''}
              ${payment.charges ? `<tr><td>Charges</td><td>${payment.charges.toLocaleString('fr-FR')} FCFA</td></tr>` : ''}
              <tr class="total"><td>TOTAL PAYÉ</td><td style="color:#16a34a">${payment.total_amount.toLocaleString('fr-FR')} FCFA</td></tr>
            </table>
            ${payment.notes ? `<p><strong>Notes :</strong> ${payment.notes}</p>` : ''}
            <div class="footer">Ce document atteste du paiement du loyer pour la période mentionnée ci-dessus.</div>
            <script>window.onload=function(){window.print()}<\/script></body></html>`);
            win.document.close();
        } catch (err: any) {
            toast.error('Erreur impression : ' + err.message);
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
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
                                        <div className="text-sm font-medium text-gray-900">{payment.receipt_number}</div>
                                        <div className="text-xs text-gray-500">
                                            Période: {MONTHS_FR[payment.period_month] || payment.period_month} {payment.period_year}
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
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Loyer</span><span>{selectedPayment.rent_amount.toLocaleString('fr-FR')} FCFA</span></div>
                                ) : null}
                                {selectedPayment.charges ? (
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Charges</span><span>{selectedPayment.charges.toLocaleString('fr-FR')} FCFA</span></div>
                                ) : null}
                                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
                                    <span>TOTAL PAYÉ</span>
                                    <span className="text-green-600">{selectedPayment.total_amount.toLocaleString('fr-FR')} FCFA</span>
                                </div>
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
        </div>
    );
};
