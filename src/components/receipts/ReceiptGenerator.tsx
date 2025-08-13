import React, { useState } from 'react';
import { FileText, Printer, Download, Calendar, DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { RentReceipt } from '../../types/receipt';
import { AgencyIdGenerator } from '../../utils/idGenerator';

interface ReceiptGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  tenantId?: string;
  ownerId?: string;
}

export const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  isOpen,
  onClose,
  propertyId,
  tenantId,
  ownerId
}) => {
  const [receiptData, setReceiptData] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    rentAmount: 0,
    charges: 0,
    paymentMethod: 'especes' as const,
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const [generatedReceipt, setGeneratedReceipt] = useState<RentReceipt | null>(null);

  const generateReceipt = () => {
    const [year, month] = receiptData.month.split('-');
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const receipt: RentReceipt = {
      id: `receipt_${Date.now()}`,
      receiptNumber: AgencyIdGenerator.generateReceiptNumber('agency1', 'Immobilier Excellence', monthNames[parseInt(month) - 1], parseInt(year)),
      agencyId: 'agency1',
      propertyId: propertyId || 'property1',
      ownerId: ownerId || 'owner1',
      tenantId: tenantId || 'tenant1',
      month: monthNames[parseInt(month) - 1],
      year: parseInt(year),
      rentAmount: receiptData.rentAmount,
      charges: receiptData.charges,
      totalAmount: receiptData.rentAmount + receiptData.charges,
      paymentDate: new Date(receiptData.paymentDate),
      paymentMethod: receiptData.paymentMethod,
      notes: receiptData.notes,
      issuedBy: 'Marie Kouassi',
      createdAt: new Date()
    };

    setGeneratedReceipt(receipt);
  };

  const printReceipt = () => {
    if (!generatedReceipt) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quittance de Loyer - ${generatedReceipt.receiptNumber}</title>
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
            <div class="company-name">IMMOBILIER EXCELLENCE</div>
            <div>Abidjan, Côte d'Ivoire</div>
            <div>Tél: +225 01 02 03 04 05</div>
          </div>
          
          <div class="receipt-title">QUITTANCE DE LOYER</div>
          <div class="receipt-number">N° ${generatedReceipt.receiptNumber}</div>
          
          <div class="content">
            <div class="row">
              <span class="label">Période:</span>
              <span>${generatedReceipt.month} ${generatedReceipt.year}</span>
            </div>
            <div class="row">
              <span class="label">Date de paiement:</span>
              <span>${generatedReceipt.paymentDate.toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="row">
              <span class="label">Propriété:</span>
              <span>ID: ${generatedReceipt.propertyId}</span>
            </div>
            <div class="row">
              <span class="label">Locataire:</span>
              <span>ID: ${generatedReceipt.tenantId}</span>
            </div>
            <div class="row">
              <span class="label">Propriétaire:</span>
              <span>ID: ${generatedReceipt.ownerId}</span>
            </div>
            
            <div style="margin: 30px 0;">
              <div class="row">
                <span class="label">Loyer mensuel:</span>
                <span class="amount">${generatedReceipt.rentAmount.toLocaleString()} FCFA</span>
              </div>
              ${generatedReceipt.charges ? `
                <div class="row">
                  <span class="label">Charges:</span>
                  <span class="amount">${generatedReceipt.charges.toLocaleString()} FCFA</span>
                </div>
              ` : ''}
              <div class="row total">
                <span class="label">TOTAL PAYÉ:</span>
                <span class="amount">${generatedReceipt.totalAmount.toLocaleString()} FCFA</span>
              </div>
            </div>
            
            <div class="row">
              <span class="label">Mode de paiement:</span>
              <span>${generatedReceipt.paymentMethod === 'especes' ? 'Espèces' : 
                     generatedReceipt.paymentMethod === 'cheque' ? 'Chèque' :
                     generatedReceipt.paymentMethod === 'virement' ? 'Virement' : 'Mobile Money'}</span>
            </div>
            
            ${generatedReceipt.notes ? `
              <div style="margin-top: 20px;">
                <div class="label">Notes:</div>
                <div>${generatedReceipt.notes}</div>
              </div>
            ` : ''}
          </div>
          
          <div class="signature">
            <div>Émis par: ${generatedReceipt.issuedBy}</div>
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

  const downloadReceipt = () => {
    if (!generatedReceipt) return;
    
    const receiptData = {
      receiptNumber: generatedReceipt.receiptNumber,
      period: `${generatedReceipt.month} ${generatedReceipt.year}`,
      paymentDate: generatedReceipt.paymentDate.toLocaleDateString('fr-FR'),
      rentAmount: generatedReceipt.rentAmount,
      charges: generatedReceipt.charges,
      totalAmount: generatedReceipt.totalAmount,
      paymentMethod: generatedReceipt.paymentMethod,
      notes: generatedReceipt.notes
    };

    const dataStr = JSON.stringify(receiptData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `quittance-${generatedReceipt.receiptNumber}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const paymentMethods = [
    { value: 'especes', label: 'Espèces' },
    { value: 'cheque', label: 'Chèque' },
    { value: 'virement', label: 'Virement bancaire' },
    { value: 'mobile_money', label: 'Mobile Money' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Générer une quittance de loyer">
      <div className="space-y-6">
        {!generatedReceipt ? (
          <form onSubmit={(e) => { e.preventDefault(); generateReceipt(); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Période (mois/année)"
                type="month"
                value={receiptData.month}
                onChange={(e) => setReceiptData(prev => ({ ...prev, month: e.target.value }))}
                required
              />
              <Input
                label="Date de paiement"
                type="date"
                value={receiptData.paymentDate}
                onChange={(e) => setReceiptData(prev => ({ ...prev, paymentDate: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Montant du loyer (FCFA)"
                type="number"
                value={receiptData.rentAmount || ''}
                onChange={(e) => setReceiptData(prev => ({ ...prev, rentAmount: parseInt(e.target.value) || 0 }))}
                required
                min="0"
              />
              <Input
                label="Charges (FCFA)"
                type="number"
                value={receiptData.charges || ''}
                onChange={(e) => setReceiptData(prev => ({ ...prev, charges: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode de paiement
              </label>
              <select
                value={receiptData.paymentMethod}
                onChange={(e) => setReceiptData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {paymentMethods.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optionnel)
              </label>
              <textarea
                value={receiptData.notes}
                onChange={(e) => setReceiptData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notes additionnelles..."
              />
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900">Total à payer:</span>
                <span className="text-xl font-bold text-blue-900">
                  {(receiptData.rentAmount + receiptData.charges).toLocaleString()} FCFA
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit">
                <FileText className="h-4 w-4 mr-2" />
                Générer la quittance
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Receipt Preview */}
            <Card className="bg-white border-2 border-gray-300">
              <div className="p-8">
                <div className="text-center border-b-2 border-gray-300 pb-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">IMMOBILIER EXCELLENCE</h2>
                  <p className="text-gray-600">Abidjan, Côte d'Ivoire</p>
                  <p className="text-gray-600">Tél: +225 01 02 03 04 05</p>
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">QUITTANCE DE LOYER</h3>
                  <p className="text-gray-600">N° {generatedReceipt.receiptNumber}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="font-medium">Période:</span>
                    <span>{generatedReceipt.month} {generatedReceipt.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Date de paiement:</span>
                    <span>{generatedReceipt.paymentDate.toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Propriété:</span>
                    <span>ID: {generatedReceipt.propertyId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Locataire:</span>
                    <span>ID: {generatedReceipt.tenantId}</span>
                  </div>
                </div>

                <div className="border-t-2 border-gray-300 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Loyer mensuel:</span>
                    <span className="font-bold">{generatedReceipt.rentAmount.toLocaleString()} FCFA</span>
                  </div>
                  {generatedReceipt.charges > 0 && (
                    <div className="flex justify-between">
                      <span className="font-medium">Charges:</span>
                      <span className="font-bold">{generatedReceipt.charges.toLocaleString()} FCFA</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-gray-300 pt-2">
                    <span className="font-bold text-lg">TOTAL PAYÉ:</span>
                    <span className="font-bold text-lg">{generatedReceipt.totalAmount.toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="mt-6 text-right">
                  <p>Émis par: {generatedReceipt.issuedBy}</p>
                  <p className="mt-8">Signature: ________________</p>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-center space-x-4">
              <Button onClick={printReceipt} variant="secondary">
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button onClick={downloadReceipt} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
              <Button onClick={() => setGeneratedReceipt(null)} variant="ghost">
                Nouvelle quittance
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};