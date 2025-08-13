import React, { useState } from 'react';
import { Receipt, Search, Eye, Edit, Printer, Download, Plus, Filter, Calendar, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { ReceiptGenerator } from './ReceiptGenerator';
import { RentReceipt } from '../../types/receipt';

export const ReceiptsList: React.FC = () => {
  const [showGenerator, setShowGenerator] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState<RentReceipt | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Mock receipts data
  const receipts: RentReceipt[] = [
    {
      id: '1',
      receiptNumber: 'IMEX-202403-001',
      agencyId: 'agency1',
      propertyId: 'property1',
      ownerId: 'owner1',
      tenantId: 'tenant1',
      month: 'Mars',
      year: 2024,
      rentAmount: 450000,
      charges: 25000,
      totalAmount: 475000,
      paymentDate: new Date('2024-03-05'),
      paymentMethod: 'virement',
      notes: 'Paiement régulier',
      issuedBy: 'Marie Kouassi',
      createdAt: new Date('2024-03-05')
    },
    {
      id: '2',
      receiptNumber: 'IMEX-202403-002',
      agencyId: 'agency1',
      propertyId: 'property2',
      ownerId: 'owner2',
      tenantId: 'tenant2',
      month: 'Mars',
      year: 2024,
      rentAmount: 320000,
      charges: 15000,
      totalAmount: 335000,
      paymentDate: new Date('2024-03-08'),
      paymentMethod: 'especes',
      notes: '',
      issuedBy: 'Jean Bamba',
      createdAt: new Date('2024-03-08')
    },
    {
      id: '3',
      receiptNumber: 'IMEX-202402-015',
      agencyId: 'agency1',
      propertyId: 'property3',
      ownerId: 'owner3',
      tenantId: 'tenant3',
      month: 'Février',
      year: 2024,
      rentAmount: 280000,
      charges: 20000,
      totalAmount: 300000,
      paymentDate: new Date('2024-02-10'),
      paymentMethod: 'mobile_money',
      notes: 'Paiement via Orange Money',
      issuedBy: 'Marie Kouassi',
      createdAt: new Date('2024-02-10')
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      especes: 'Espèces',
      cheque: 'Chèque',
      virement: 'Virement',
      mobile_money: 'Mobile Money'
    };
    return labels[method as keyof typeof labels] || method;
  };

  const printReceipt = (receipt: RentReceipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quittance de Loyer - ${receipt.receiptNumber}</title>
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
          <div class="receipt-number">N° ${receipt.receiptNumber}</div>
          
          <div class="content">
            <div class="row">
              <span class="label">Période:</span>
              <span>${receipt.month} ${receipt.year}</span>
            </div>
            <div class="row">
              <span class="label">Date de paiement:</span>
              <span>${receipt.paymentDate.toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="row">
              <span class="label">Propriété:</span>
              <span>ID: ${receipt.propertyId}</span>
            </div>
            <div class="row">
              <span class="label">Locataire:</span>
              <span>ID: ${receipt.tenantId}</span>
            </div>
            <div class="row">
              <span class="label">Propriétaire:</span>
              <span>ID: ${receipt.ownerId}</span>
            </div>
            
            <div style="margin: 30px 0;">
              <div class="row">
                <span class="label">Loyer mensuel:</span>
                <span class="amount">${receipt.rentAmount.toLocaleString()} FCFA</span>
              </div>
              ${receipt.charges ? `
                <div class="row">
                  <span class="label">Charges:</span>
                  <span class="amount">${receipt.charges.toLocaleString()} FCFA</span>
                </div>
              ` : ''}
              <div class="row total">
                <span class="label">TOTAL PAYÉ:</span>
                <span class="amount">${receipt.totalAmount.toLocaleString()} FCFA</span>
              </div>
            </div>
            
            <div class="row">
              <span class="label">Mode de paiement:</span>
              <span>${getPaymentMethodLabel(receipt.paymentMethod)}</span>
            </div>
            
            ${receipt.notes ? `
              <div style="margin-top: 20px;">
                <div class="label">Notes:</div>
                <div>${receipt.notes}</div>
              </div>
            ` : ''}
          </div>
          
          <div class="signature">
            <div>Émis par: ${receipt.issuedBy}</div>
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

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.tenantId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.propertyId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || 
                       (filterType === 'rent' && receipt.rentAmount > 0) ||
                       (filterType === 'owner_payment' && false); // Add owner payment logic
    
    const matchesMonth = filterMonth === 'all' || 
                        `${receipt.month.toLowerCase()}-${receipt.year}` === filterMonth;
    
    return matchesSearch && matchesType && matchesMonth;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Quittances</h1>
          <p className="text-gray-600 mt-1">
            Quittances de loyers et reversements propriétaires
          </p>
        </div>
        <Button onClick={() => setShowGenerator(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Nouvelle quittance</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {receipts.length}
            </div>
            <p className="text-sm text-gray-600">Total quittances</p>
          </div>
        </Card>
        
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {formatCurrency(receipts.reduce((sum, r) => sum + r.totalAmount, 0))}
            </div>
            <p className="text-sm text-gray-600">Montant total</p>
          </div>
        </Card>
        
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-2">
              {receipts.filter(r => r.month === 'Mars' && r.year === 2024).length}
            </div>
            <p className="text-sm text-gray-600">Ce mois</p>
          </div>
        </Card>
        
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {formatCurrency(receipts.filter(r => r.month === 'Mars' && r.year === 2024).reduce((sum, r) => sum + r.totalAmount, 0))}
            </div>
            <p className="text-sm text-gray-600">Revenus du mois</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro, locataire ou propriété..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les types</option>
              <option value="rent">Loyers reçus</option>
              <option value="owner_payment">Reversements propriétaires</option>
            </select>
            
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes les périodes</option>
              <option value="mars-2024">Mars 2024</option>
              <option value="février-2024">Février 2024</option>
              <option value="janvier-2024">Janvier 2024</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Receipts List */}
      <div className="space-y-4">
        {filteredReceipts.map((receipt) => (
          <Card key={receipt.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Receipt className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Quittance #{receipt.receiptNumber}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {receipt.month} {receipt.year} • Émise par {receipt.issuedBy}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="success" size="sm">
                    {getPaymentMethodLabel(receipt.paymentMethod)}
                  </Badge>
                  <Badge variant="info" size="sm">
                    Payé
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-500">Date de paiement</p>
                    <p className="text-sm font-medium">
                      {receipt.paymentDate.toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="text-xs text-gray-500">Loyer</p>
                    <p className="text-sm font-medium">
                      {formatCurrency(receipt.rentAmount)}
                    </p>
                  </div>
                </div>

                {receipt.charges > 0 && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-500">Charges</p>
                      <p className="text-sm font-medium">
                        {formatCurrency(receipt.charges)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-sm font-medium">
                      {formatCurrency(receipt.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Propriété</p>
                    <p className="font-medium">ID: {receipt.propertyId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Locataire</p>
                    <p className="font-medium">ID: {receipt.tenantId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Propriétaire</p>
                    <p className="font-medium">ID: {receipt.ownerId}</p>
                  </div>
                </div>
              </div>

              {receipt.notes && (
                <p className="text-sm text-gray-600 mb-4 italic">
                  Note: {receipt.notes}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Créée le {receipt.createdAt.toLocaleDateString('fr-FR')}
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedReceipt(receipt);
                      setShowDetails(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => printReceipt(receipt)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredReceipts.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune quittance trouvée
          </h3>
          <p className="text-gray-600 mb-4">
            Commencez par générer votre première quittance.
          </p>
          <Button onClick={() => setShowGenerator(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle quittance
          </Button>
        </div>
      )}

      <ReceiptGenerator
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
      />

      {/* Receipt Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedReceipt(null);
        }}
        title="Détails de la quittance"
        size="lg"
      >
        {selectedReceipt && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
              <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-900">QUITTANCE DE LOYER</h2>
                <p className="text-gray-600">N° {selectedReceipt.receiptNumber}</p>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="font-medium">Période:</span>
                  <span>{selectedReceipt.month} {selectedReceipt.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date de paiement:</span>
                  <span>{selectedReceipt.paymentDate.toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Mode de paiement:</span>
                  <span>{getPaymentMethodLabel(selectedReceipt.paymentMethod)}</span>
                </div>
              </div>

              <div className="border-t-2 border-gray-300 pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Loyer mensuel:</span>
                  <span className="font-bold">{formatCurrency(selectedReceipt.rentAmount)}</span>
                </div>
                {selectedReceipt.charges > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">Charges:</span>
                    <span className="font-bold">{formatCurrency(selectedReceipt.charges)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-gray-300 pt-2">
                  <span className="font-bold text-lg">TOTAL PAYÉ:</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedReceipt.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <Button onClick={() => printReceipt(selectedReceipt)} variant="secondary">
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};