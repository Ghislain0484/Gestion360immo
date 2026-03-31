import React, { useState, useMemo, useCallback } from 'react';
import { Eye, Printer, Download, Plus, Search, FileText, TrendingUp, AlertCircle } from 'lucide-react';
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
import { printReceiptHTML, downloadReceiptPDF } from '../../utils/receiptActions';

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

  const { data: receiptsData = [] } = useRealtimeData<RentReceipt>(
    async () => dbService.rentReceipts.getAll({ agency_id: user?.agency_id ?? undefined }),
    'rent_receipts',
    { agency_id: user?.agency_id ?? undefined }
  );

  // Cast to include joined data
  const receipts = receiptsData as (RentReceipt & {
    property?: { title: string; business_id: string };
    tenant?: { first_name: string; last_name: string; business_id: string };
  })[];

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

  const printReceipt = async (receipt: any) => {
    if (!user?.agency_id) return;
    await printReceiptHTML(receipt, user.agency_id, {
      tenantName: receipt.tenant ? `${receipt.tenant.first_name} ${receipt.tenant.last_name}` : undefined,
      propertyTitle: receipt.property?.title
    });
  };

  const downloadReceipt = async (receipt: any) => {
    if (!user?.agency_id) return;
    await downloadReceiptPDF(receipt, user.agency_id, {
      tenantName: receipt.tenant ? `${receipt.tenant.first_name} ${receipt.tenant.last_name}` : undefined,
      propertyTitle: receipt.property?.title
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quittances de Loyer</h1>
          <p className="text-sm text-gray-500 mt-0.5">Historique des paiements encaissés ({receipts.length})</p>
        </div>
        <Button onClick={() => openGenerator()} className="flex items-center space-x-2 shadow-md hover:shadow-lg transition-all">
          <Plus className="h-4 w-4" />
          <span>Nouvelle quittance</span>
        </Button>
      </div>

      {/* Cartes récap - Style Premium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none overflow-hidden relative group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <FileText className="w-24 h-24" />
          </div>
          <div className="p-6">
            <p className="text-blue-100 text-sm font-medium mb-1 uppercase tracking-wider">Total Quittances</p>
            <div className="text-3xl font-bold">{receipts.length}</div>
            <div className="mt-4 flex items-center text-xs text-blue-100">
              <div className="h-1 w-12 bg-white/30 rounded-full mr-2">
                <div className="h-full bg-white rounded-full w-2/3" />
              </div>
              Activité globale
            </div>
          </div>
        </Card>

        <Card className="bg-white border-blue-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-24 h-24 text-blue-600" />
          </div>
          <div className="p-6">
            <p className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wider">Montant Encaissé</p>
            <div className="text-3xl font-bold text-slate-900">{formatCurrency(totalAmount)}</div>
            <div className="mt-4 text-xs font-medium text-emerald-600 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Volume validé
            </div>
          </div>
        </Card>

        <Card className="bg-white border-orange-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <AlertCircle className="w-24 h-24 text-orange-600" />
          </div>
          <div className="p-6">
            <p className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wider">Paiements Partiels</p>
            <div className="text-3xl font-bold text-slate-900">
              {receipts.filter(r => r.payment_status === 'partial' || (r.balance_due ?? 0) > 0).length}
            </div>
            <div className="mt-4 text-xs font-medium text-orange-600 flex items-center">
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-1.5" />
              Soldes en attente
            </div>
          </div>
        </Card>
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
        {filteredReceipts.map(receipt => {
          const isPartialReceipt =
            receipt.payment_status === 'partial' ||
            (receipt.balance_due ?? 0) > 0 ||
            (receipt.amount_paid != null && receipt.amount_paid < receipt.total_amount);
          return (
            <Card key={receipt.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-transparent hover:border-l-blue-500 group">
              <div className="p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPartialReceipt ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">#{receipt.receipt_number}</h3>
                      {isPartialReceipt ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 uppercase tracking-tight">PAIEMENT PARTIEL</span>
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-tight">SOLDÉ</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                      <span className="text-gray-900">{receipt.tenant ? `${receipt.tenant.first_name} ${receipt.tenant.last_name}` : 'N/A'}</span> &bull; {receipt.property?.title || 'Bien'}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {MONTHS_FR[receipt.period_month] || receipt.period_month} {receipt.period_year} &bull; {(receipt.amount_paid ?? receipt.total_amount).toLocaleString('fr-FR')} FCFA encaissé
                      {isPartialReceipt && (receipt.balance_due ?? 0) > 0 && (
                        <span className="ml-2 inline-flex items-center bg-orange-50 rounded px-1.5 py-0.5">
                          <span className="text-orange-600 font-bold uppercase text-[9px] mr-1">Reste :</span>
                          <span className="text-orange-700 font-black">{(receipt.balance_due ?? 0).toLocaleString('fr-FR')} FCFA</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedReceipt(receipt); setShowDetails(true); }} className="hover:bg-blue-50 hover:text-blue-600">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => printReceipt(receipt)} className="hover:bg-blue-50 hover:text-blue-600">
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => downloadReceipt(receipt)} className="hover:bg-blue-50 hover:text-blue-600">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
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
        {selectedReceipt && (() => {
          const isPartialSel =
            selectedReceipt.payment_status === 'partial' ||
            (selectedReceipt.balance_due ?? 0) > 0 ||
            (selectedReceipt.amount_paid != null && selectedReceipt.amount_paid < selectedReceipt.total_amount);
          const paidAmt = selectedReceipt.amount_paid ?? selectedReceipt.total_amount;
          const balAmt = selectedReceipt.balance_due ?? (isPartialSel ? selectedReceipt.total_amount - paidAmt : 0);
          return (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">QUITTANCE DE LOYER</h2>
                {isPartialSel ? (
                  <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-300 font-bold text-sm">⚠ PAIEMENT PARTIEL</span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-300 font-bold text-sm">✓ SOLDÉ</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Numéro :</span><p className="font-semibold">{selectedReceipt.receipt_number}</p></div>
                <div><span className="text-gray-500">Période :</span><p className="font-semibold">{MONTHS_FR[selectedReceipt.period_month] || selectedReceipt.period_month} {selectedReceipt.period_year}</p></div>
                <div><span className="text-gray-500">Loyer :</span><p className="font-semibold">{formatCurrency(selectedReceipt.rent_amount)}</p></div>
                <div><span className="text-gray-500">Charges :</span><p className="font-semibold">{formatCurrency(selectedReceipt.charges || 0)}</p></div>
                <div><span className="text-gray-500">Total dû :</span><p className="font-semibold">{formatCurrency(selectedReceipt.total_amount)}</p></div>
                <div><span className="text-gray-500">Montant versé :</span><p className={`font-bold text-base ${isPartialSel ? 'text-orange-600' : 'text-green-600'}`}>{formatCurrency(paidAmt)}</p></div>
                {isPartialSel && balAmt > 0 && (
                  <div className="col-span-2 bg-orange-50 border border-orange-200 rounded p-2">
                    <span className="text-orange-600 font-bold">Solde restant : {formatCurrency(balAmt)}</span>
                  </div>
                )}
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
          );
        })()}
      </Modal>
    </div>
  );
};
