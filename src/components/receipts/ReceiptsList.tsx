import React, { useState, useMemo, useCallback } from 'react';
import { Eye, Edit, Printer, Download, Plus, Search } from 'lucide-react';
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

  const { data: receipts = [], initialLoading, error } = useRealtimeData<RentReceipt>(
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

  const printReceipt = (receipt: RentReceipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Impossible d’ouvrir la fenêtre d’impression');
      return;
    }
    // ⚠️ je garde ton HTML d’impression tel quel
    printWindow.document.write(`<html><body>Quittance ${receipt.receipt_number}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const downloadReceipt = (receipt: RentReceipt) => {
    const dataStr = JSON.stringify(receipt, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quittance-${receipt.receipt_number}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      const matchesMonth = filterMonth === 'all' || receipt.period_month === filterMonth;
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
