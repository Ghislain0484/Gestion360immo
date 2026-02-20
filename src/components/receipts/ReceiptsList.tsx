import React, { useState, useMemo, useCallback } from 'react';
import { Eye, Printer, Download, Plus, Search, FileText } from 'lucide-react';
import { debounce } from 'lodash';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import ReceiptGenerator from './ReceiptGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import toast from 'react-hot-toast';
import { RentReceipt } from '../../types/db';
import { PayMethod } from '../../types/enums';
import { getAgencyBranding, renderPDFHeader, renderPDFFooter } from '../../utils/agencyBranding';
import { jsPDF } from 'jspdf';

export const ReceiptsList: React.FC = () => {
  const { user } = useAuth();
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<RentReceipt | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [preFillData, setPreFillData] = useState<Partial<RentReceipt> | undefined>(undefined);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<'all' | string>('all');
  const [filterYear, setFilterYear] = useState<'all' | string>('all');
  const [filterMethod, setFilterMethod] = useState<'all' | PayMethod>('all');

  const { data: receipts = [] } = useRealtimeData<RentReceipt>(
    async () => dbService.rentReceipts.getAll(),
    'rent_receipts'
  );

  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => setSearchTerm(value), 300),
    []
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
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l’ajout de la quittance');
    }
  };

  const openGenerator = (receipt?: RentReceipt) => {
    setPreFillData(receipt ?? undefined);
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

  const MONTHS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const printReceipt = async (receipt: RentReceipt) => {
    try {
      const branding = await getAgencyBranding(user?.agency_id ?? undefined);
      const logoHtml = branding.logo ? `<img src="${branding.logo}" alt="Logo" style="max-height:70px; object-fit:contain;">` : '';
      const periodStr = `${MONTHS_FR[receipt.period_month] || receipt.period_month} ${receipt.period_year}`;
      const pmLabel = ({ especes: 'Espèces', cheque: 'Chèque', virement: 'Virement bancaire', mobile_money: 'Mobile Money' } as Record<string, string>)[receipt.payment_method] || receipt.payment_method;
      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error("Fenêtre d'impression bloquée"); return; }
      printWindow.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Quittance ${receipt.receipt_number}</title>
<style>body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#1a1a1a;font-size:12px;}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #3B82F6;padding-bottom:15px;margin-bottom:15px;}.agency-name{font-size:18px;font-weight:bold;color:#3B82F6;}.agency-contact{font-size:10px;color:#666;margin-top:4px;}h1{text-align:center;font-size:20px;margin:10px 0 4px;}.receipt-num{text-align:center;color:#666;margin-bottom:15px;}.period-row{display:flex;justify-content:space-between;background:#f1f5f9;padding:8px 12px;border-radius:6px;margin-bottom:15px;font-weight:bold;}.section-title{color:#3B82F6;font-weight:bold;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin:12px 0 8px;}.section-content{padding-left:15px;color:#444;line-height:1.7;}table{width:100%;border-collapse:collapse;margin:15px 0;}td{padding:6px 10px;}tr:nth-child(even){background:#f8fafc;}.total-row td{border-top:2px solid #3B82F6;font-weight:bold;font-size:14px;padding-top:8px;}.mention{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;text-align:center;font-style:italic;color:#555;margin:15px 0;}.sig-row{display:flex;justify-content:space-between;margin-top:25px;}.sig-box{border-top:1px solid #aaa;padding-top:5px;width:45%;text-align:center;color:#666;font-size:11px;}.footer{border-top:1px solid #ddd;margin-top:20px;padding-top:8px;text-align:center;color:#999;font-size:9px;}@media print{body{padding:10px;}}</style></head><body>
<div class="header"><div>${logoHtml}</div><div style="text-align:right"><div class="agency-name">${branding.name}</div><div class="agency-contact">${[branding.address, branding.phone ? 'Tél: ' + branding.phone : '', branding.email].filter(Boolean).join(' | ')}</div></div></div>
<h1>QUITTANCE DE LOYER</h1><div class="receipt-num">N° ${receipt.receipt_number}</div>
<div class="period-row"><span>Période : ${periodStr}</span><span>Date émission : ${new Date().toLocaleDateString('fr-FR')}</span></div>
<div class="section-title">DÉTAIL DU PAIEMENT</div>
<table><tr><td>Loyer mensuel</td><td style="text-align:right">${receipt.rent_amount.toLocaleString('fr-FR')} FCFA</td></tr><tr><td>Charges</td><td style="text-align:right">${(receipt.charges || 0).toLocaleString('fr-FR')} FCFA</td></tr><tr class="total-row"><td>TOTAL PAYÉ</td><td style="text-align:right">${receipt.total_amount.toLocaleString('fr-FR')} FCFA</td></tr><tr><td>Date de paiement</td><td style="text-align:right">${new Date(receipt.payment_date).toLocaleDateString('fr-FR')}</td></tr><tr><td>Mode de paiement</td><td style="text-align:right">${pmLabel}</td></tr></table>
<div class="mention">Certifie avoir reçu la somme ci-dessus à titre de loyer pour ${periodStr}.</div>
<div class="sig-row"><div class="sig-box">Signature du locataire</div><div class="sig-box">Signature et cachet de l'agence</div></div>
<div class="footer">${branding.name} &bull; ${branding.email || ''} &bull; Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
      printWindow.document.close();
    } catch (err: any) { toast.error('Erreur impression : ' + err.message); }
  };

  const downloadReceipt = async (receipt: RentReceipt) => {
    try {
      const branding = await getAgencyBranding(user?.agency_id ?? undefined);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let y = renderPDFHeader(doc, branding, 15);
      const MONTHS_LOCAL = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
      doc.text('QUITTANCE DE LOYER', pageWidth / 2, y, { align: 'center' }); y += 8;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
      doc.text(`N° ${receipt.receipt_number}`, pageWidth / 2, y, { align: 'center' }); y += 10;
      doc.setFontSize(10); doc.setTextColor(30, 30, 30);
      doc.text(`Période : ${MONTHS_LOCAL[receipt.period_month] || receipt.period_month} ${receipt.period_year}`, 20, y);
      doc.text(`Date : ${new Date(receipt.payment_date).toLocaleDateString('fr-FR')}`, pageWidth - 20, y, { align: 'right' }); y += 12;
      doc.setDrawColor(200, 200, 200); doc.line(20, y, pageWidth - 20, y); y += 8;
      const rows = [['Loyer', `${receipt.rent_amount.toLocaleString('fr-FR')} FCFA`], ['Charges', `${(receipt.charges || 0).toLocaleString('fr-FR')} FCFA`], ['TOTAL', `${receipt.total_amount.toLocaleString('fr-FR')} FCFA`], ['Mode', ({ especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', mobile_money: 'Mobile Money' } as Record<string, string>)[receipt.payment_method] || receipt.payment_method]];
      rows.forEach(([label, val], i) => { const isBold = i === 2; doc.setFont('helvetica', isBold ? 'bold' : 'normal'); doc.text(label + ' :', 20, y); doc.text(val, 130, y); y += 8; });
      renderPDFFooter(doc, branding);
      doc.save(`quittance-${receipt.receipt_number}.pdf`);
      toast.success('PDF téléchargé !');
    } catch (err: any) { toast.error('Erreur PDF : ' + err.message); }
  };

  const totalAmount = useMemo(
    () => receipts.reduce((sum, r) => sum + r.total_amount, 0),
    [receipts]
  );

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const matchesSearch =
        receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receipt.issued_by || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = filterMonth === 'all' || receipt.period_month === Number(filterMonth);
      const matchesYear = filterYear === 'all' || receipt.period_year.toString() === filterYear;
      const matchesMethod = filterMethod === 'all' || receipt.payment_method === filterMethod;
      return matchesSearch && matchesMonth && matchesYear && matchesMethod;
    });
  }, [receipts, searchTerm, filterMonth, filterYear, filterMethod]);

  const uniqueYears = Array.from(new Set(receipts.map(r => r.period_year))).sort();
  const uniqueMonths = Array.from(new Set(receipts.map(r => r.period_month)));

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Quittances</h1>
          <p className="text-gray-600 mt-1">Quittances de loyers et reversements propriétaires ({receipts.length})</p>
        </div>
        <Button onClick={() => openGenerator()} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Nouvelle quittance</span>
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro ou émetteur..."
              onChange={(e) => debouncedSetSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Tous mois</option>
            {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Toutes années</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Tous moyens</option>
            <option value="especes">Espèces</option>
            <option value="cheque">Chèque</option>
            <option value="virement">Virement</option>
            <option value="mobile_money">Mobile Money</option>
          </select>
        </div>
      </Card>

      {/* Cartes récap */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">{receipts.length}</div>
            <p className="text-sm text-gray-600">Total quittances</p>
          </div>
        </Card>
        <Card>
          <div className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">{formatCurrency(totalAmount)}</div>
            <p className="text-sm text-gray-600">Montant total</p>
          </div>
        </Card>
      </div>

      {/* Liste */}
      <div className="space-y-4">
        {filteredReceipts.map(receipt => (
          <Card key={receipt.id} className="hover:shadow-lg transition-shadow">
            <div className="p-6 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-900">Quittance #{receipt.receipt_number}</h3>
                <p className="text-sm text-gray-500">
                  {MONTHS_FR[receipt.period_month] || receipt.period_month} {receipt.period_year} &bull; {receipt.total_amount.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm" title="Voir détails" onClick={() => { setSelectedReceipt(receipt); setShowDetails(true); }}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Imprimer" onClick={() => printReceipt(receipt)}>
                  <Printer className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Télécharger PDF" onClick={() => downloadReceipt(receipt)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Générateur */}
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
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">QUITTANCE DE LOYER</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Numéro :</span><p className="font-semibold">{selectedReceipt.receipt_number}</p></div>
                <div><span className="text-gray-500">Période :</span><p className="font-semibold">{MONTHS_FR[selectedReceipt.period_month] || selectedReceipt.period_month} {selectedReceipt.period_year}</p></div>
                <div><span className="text-gray-500">Loyer :</span><p className="font-semibold">{formatCurrency(selectedReceipt.rent_amount)}</p></div>
                <div><span className="text-gray-500">Charges :</span><p className="font-semibold">{formatCurrency(selectedReceipt.charges || 0)}</p></div>
                <div><span className="text-gray-500">Total payé :</span><p className="font-bold text-blue-700 text-base">{formatCurrency(selectedReceipt.total_amount)}</p></div>
                <div><span className="text-gray-500">Mode :</span><p className="font-semibold capitalize">{getPaymentMethodLabel(selectedReceipt.payment_method)}</p></div>
                <div><span className="text-gray-500">Date paiement :</span><p className="font-semibold">{new Date(selectedReceipt.payment_date).toLocaleDateString('fr-FR')}</p></div>
                {selectedReceipt.notes && <div className="col-span-2"><span className="text-gray-500">Notes :</span><p className="font-semibold">{selectedReceipt.notes}</p></div>}
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => printReceipt(selectedReceipt)} className="flex-1" variant="outline">
                <Printer className="w-4 h-4 mr-2" />Imprimer
              </Button>
              <Button onClick={() => downloadReceipt(selectedReceipt)} className="flex-1">
                <FileText className="w-4 h-4 mr-2" />Télécharger PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
