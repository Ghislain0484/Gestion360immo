import React, { useState } from 'react';
import { Eye, Edit, Printer, Download, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import ReceiptGenerator from './ReceiptGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import toast from 'react-hot-toast';
import { RentReceipt, PayMethod } from '../../types/db';

export const ReceiptsList: React.FC = () => {
  const { user } = useAuth();
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<RentReceipt | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [preFillData, setPreFillData] = useState<Partial<RentReceipt> | undefined>(undefined);

  const { data: realReceipts, loading, error } = useRealtimeData<RentReceipt>(
    async () => {
      try {
        const receipts = await dbService.rentReceipts.getAll();
        return receipts;
      } catch (err: any) {
        throw new Error(`❌ rent_receipts.select | ${err.message}`);
      }
    },
    'rent_receipts'
  );

  const addNewReceipt = async (receipt: RentReceipt) => {
    if (!user?.agency_id) {
      toast.error('Utilisateur non authentifié ou agency_id manquant');
      return;
    }

    try {
      await dbService.rentReceipts.create({
        ...receipt,
        agency_id: receipt.agency_id ?? user.agency_id,
        payment_date: new Date(receipt.payment_date).toISOString(),
        created_at: new Date(receipt.created_at).toISOString(),
      });
      toast.success('Quittance ajoutée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l’ajout de la quittance:', error);
      toast.error(error.message || 'Erreur lors de l’ajout de la quittance');
    }
  };

  const openGenerator = (receipt?: RentReceipt) => {
    if (receipt) {
      setPreFillData(receipt);
    } else {
      setPreFillData(undefined);
    }
    setShowGenerator(true);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);

  const getPaymentMethodLabel = (method: PayMethod | string) => {
    const labels: Record<string, string> = {
      especes: 'Espèces',
      cheque: 'Chèque',
      virement: 'Virement',
      mobile_money: 'Mobile Money',
    };
    return labels[method] || method;
  };

  const printReceipt = (receipt: RentReceipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Impossible d’ouvrir la fenêtre d’impression');
      return;
    }

    const agencyData = {
      name: `${user?.first_name} ${user?.last_name} Agency`,
      address: 'Abidjan, Côte d\'Ivoire',
      phone: '+225 XX XX XX XX XX',
      email: 'contact@agence.com',
    };

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quittance de Loyer - ${receipt.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #333; }
            .receipt-title { font-size: 20px; margin: 20px 0; }
            .receipt-number { font-size: 16px; color: #666; }
            .content { margin: 30px 0; }
            .row { display: flex; justify-content: space-between; margin: 10px 0; }
            .label { font-weight: bold; }
            .amount { font-size: 18px; font-weight: bold; }
            .total { border-top: 2px solid #333; padding-top: 10px; margin-top: 20px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
            .signature { margin-top: 50px; text-align: right; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${agencyData.name.toUpperCase()}</div>
            <div>${agencyData.address}</div>
            <div>Tél: ${agencyData.phone}</div>
            <div>Email: ${agencyData.email}</div>
          </div>

          <div class="receipt-title">QUITTANCE DE LOYER</div>
          <div class="receipt-number">N° ${receipt.receipt_number}</div>

          <div class="content">
            <div class="row">
              <span class="label">Période:</span>
              <span>${receipt.period_month} ${receipt.period_year}</span>
            </div>
            <div class="row">
              <span class="label">Date de paiement:</span>
              <span>${new Date(receipt.payment_date).toLocaleDateString('fr-FR')}</span>
            </div>

            <div style="margin: 30px 0;">
              <div class="row">
                <span class="label">Loyer mensuel:</span>
                <span class="amount">${formatCurrency(receipt.rent_amount)}</span>
              </div>
              ${receipt.charges ? `
                <div class="row">
                  <span class="label">Charges:</span>
                  <span class="amount">${formatCurrency(receipt.charges)}</span>
                </div>` : ''}
              <div class="row total">
                <span class="label">TOTAL PAYÉ:</span>
                <span class="amount">${formatCurrency(receipt.total_amount)}</span>
              </div>
            </div>

            <div class="row">
              <span class="label">Mode de paiement:</span>
              <span>${getPaymentMethodLabel(receipt.payment_method)}</span>
            </div>

            ${receipt.notes ? `
              <div style="margin-top: 20px;">
                <div class="label">Notes:</div>
                <div>${receipt.notes}</div>
              </div>` : ''}
          </div>

          <div class="signature">
            <div>Émis par: ${receipt.issued_by}</div>
            <div style="margin-top: 30px;">Signature: ________________</div>
          </div>

          <div class="footer">
            <div>Cette quittance fait foi du paiement du loyer pour la période indiquée.</div>
            <div>Générée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadReceipt = (receipt: RentReceipt) => {
    const dataStr = JSON.stringify(receipt, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `quittance-${receipt.receipt_number}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
  if (error) return <Card className="p-6"><p className="text-red-600">{error}</p></Card>;

  return (
    <div className="space-y-6">
      {/* Header + Bouton nouvelle quittance */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Quittances</h1>
          <p className="text-gray-600 mt-1">Quittances de loyers et reversements propriétaires</p>
        </div>
        <Button onClick={() => openGenerator()} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Nouvelle quittance</span>
        </Button>
      </div>

      {/* Carte récap */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">{realReceipts.length}</div>
            <p className="text-sm text-gray-600">Total quittances</p>
          </div>
        </Card>
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {formatCurrency(realReceipts.reduce((sum, r) => sum + r.total_amount, 0))}
            </div>
            <p className="text-sm text-gray-600">Montant total</p>
          </div>
        </Card>
      </div>

      {/* Liste des quittances */}
      <div className="space-y-4">
        {realReceipts.map(receipt => (
          <Card key={receipt.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-900">Quittance #{receipt.receipt_number}</h3>
                <p className="text-sm text-gray-500">{receipt.period_month} {receipt.period_year} • Émise par {receipt.issued_by}</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedReceipt(receipt); setShowDetails(true); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openGenerator(receipt)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => printReceipt(receipt)}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => downloadReceipt(receipt)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Générateur de quittance */}
      <ReceiptGenerator
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onReceiptGenerated={addNewReceipt}
        contractId={selectedReceipt?.contract_id || ''}
        tenantId={selectedReceipt?.tenant_id || ''}
        propertyId={selectedReceipt?.property_id || ''}
        ownerId={selectedReceipt?.owner_id || ''}
        preFilledData={preFillData}
      />

      {/* Modal détails */}
      <Modal
        isOpen={showDetails}
        onClose={() => { setShowDetails(false); setSelectedReceipt(null); }}
        title="Détails de la quittance"
        size="lg"
      >
        {selectedReceipt && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900">QUITTANCE DE LOYER</h2>
              <p>N° {selectedReceipt.receipt_number}</p>
              <p>Période: {selectedReceipt.period_month} {selectedReceipt.period_year}</p>
              <p>Mode de paiement: {getPaymentMethodLabel(selectedReceipt.payment_method)}</p>
              <p>Total: {formatCurrency(selectedReceipt.total_amount)}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
