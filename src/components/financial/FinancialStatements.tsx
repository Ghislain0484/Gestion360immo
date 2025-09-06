import React, { useState, useCallback } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, Pencil } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { utils, write } from 'xlsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FinancialStatement, FinancialTransaction } from '../../types/db';
import { useDebounce } from 'use-debounce';

interface FinancialStatementsProps {
  entityId: string;
  entityType: 'owner' | 'tenant';
  entityName: string;
}

const isValidEntityType = (type: string): type is 'owner' | 'tenant' =>
  ['owner', 'tenant'].includes(type);

interface EditTransactionState {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

const TransactionItem: React.FC<{
  transaction: FinancialTransaction;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  onEdit: (transaction: FinancialTransaction) => void;
}> = ({ transaction, formatCurrency, formatDate, onEdit }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" role="listitem">
    <div className="flex items-center space-x-3">
      <div
        className={`w-3 h-3 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}
        aria-hidden="true"
      />
      <div>
        <p className="font-medium text-gray-900">{transaction.description}</p>
        <p className="text-sm text-gray-500">
          {formatDate(transaction.date)} • {transaction.category}
        </p>
        {transaction.property_id && <p className="text-xs text-gray-400">Propriété: {transaction.property_id}</p>}
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
        {transaction.type === 'income' ? '+' : '-'}
        {formatCurrency(transaction.amount)}
      </p>
      <Button size="sm" variant="ghost" onClick={() => onEdit(transaction)} aria-label="Modifier transaction">
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export const FinancialStatements: React.FC<FinancialStatementsProps> = ({ entityId, entityType, entityName }) => {
  if (!isValidEntityType(entityType)) {
    return <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">Type d'entité invalide : "{entityType}"</div>;
  }

  const [selectedPeriod, setSelectedPeriod] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [debouncedPeriod] = useDebounce(selectedPeriod.toISOString().slice(0, 7), 500);

  const { data: statements, loading, error } = useRealtimeData<FinancialStatement>(
    async () => await dbService.financialStatements.getByEntity(entityId, entityType, debouncedPeriod),
    `financial_statements_${entityId}_${entityType}_${debouncedPeriod}`
  );

  const singleStatement = statements?.[0] ?? null;
  const [showDetails, setShowDetails] = useState(false);
  const [editTransaction, setEditTransaction] = useState<EditTransactionState | null>(null);

  const formatCurrency = useCallback((amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount), []);
  const formatDate = useCallback((date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan' }), []);

  const handleEditTransaction = (tr: FinancialTransaction) => {
    setEditTransaction({
      id: tr.id,
      description: tr.description,
      amount: tr.amount,
      type: tr.type,
      category: tr.category,
    });
  };

  const handleSaveTransaction = async () => {
    if (!editTransaction) return;
    try {
      await dbService.financialStatements.update(editTransaction.id, editTransaction);
      setEditTransaction(null);
    } catch (err) {
      console.error(err);
      alert('Échec mise à jour de la transaction');
    }
  };

  const generatePDF = useCallback(() => {
    if (!singleStatement) return alert('Aucune donnée disponible pour générer le PDF.');
    try {
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(20).text(`État Financier - ${entityName}`, 105, y, { align: 'center' });
      y += 10;
      doc.setFontSize(12).text(
        `Période: ${formatDate(singleStatement.period.start_date)} - ${formatDate(singleStatement.period.end_date)}`,
        105, y, { align: 'center' }
      );
      y += 20;
      doc.setFontSize(14).text('Résumé', 20, y);
      y += 10;
      doc.setFontSize(12).text(`Revenus: ${formatCurrency(singleStatement.summary.total_income)}`, 20, y);
      y += 10;
      doc.text(`Dépenses: ${formatCurrency(singleStatement.summary.total_expenses)}`, 20, y);
      y += 10;
      doc.text(`Solde: ${formatCurrency(singleStatement.summary.balance)}`, 20, y);
      y += 10;
      doc.text(`Paiements en attente: ${formatCurrency(singleStatement.summary.pending_payments)}`, 20, y);
      y += 20;
      doc.setFontSize(14).text('Transactions', 20, y);
      y += 10;
      if (!singleStatement.transactions.length) {
        doc.setFontSize(12).text('Aucune transaction pour cette période.', 20, y);
      } else {
        singleStatement.transactions.forEach(tr => {
          if (y > doc.internal.pageSize.height - 20) { doc.addPage(); y = 20; }
          doc.setFontSize(12).text(`${formatDate(tr.date)} - ${tr.description} (${tr.category}): ${tr.type === 'income' ? '+' : '-'}${formatCurrency(tr.amount)}`, 20, y);
          y += 10;
        });
      }
      doc.save(`FinancialStatement_${entityName}_${debouncedPeriod}.pdf`);
    } catch (err) { console.error(err); alert('Échec génération PDF'); }
  }, [singleStatement, entityName, formatCurrency, formatDate, debouncedPeriod]);

  const exportExcel = useCallback(() => {
    if (!singleStatement) return alert('Aucune donnée disponible pour Excel.');
    try {
      const wb = utils.book_new();
      const summaryWs = utils.json_to_sheet([{
        'Période Début': formatDate(singleStatement.period.start_date),
        'Période Fin': formatDate(singleStatement.period.end_date),
        Revenus: singleStatement.summary.total_income,
        Dépenses: singleStatement.summary.total_expenses,
        Solde: singleStatement.summary.balance,
        'Paiements en attente': singleStatement.summary.pending_payments,
      }]);
      utils.book_append_sheet(wb, summaryWs, 'Résumé');
      const txWs = utils.json_to_sheet(singleStatement.transactions.map(tr => ({
        Date: formatDate(tr.date),
        Description: tr.description,
        Catégorie: tr.category,
        Type: tr.type === 'income' ? 'Revenu' : 'Dépense',
        Montant: tr.amount,
        Propriété: tr.property_id ?? 'N/A',
      })));
      utils.book_append_sheet(wb, txWs, 'Transactions');
      const buf = write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `FinancialStatement_${entityName}_${debouncedPeriod}.xlsx`);
    } catch (err) { console.error(err); alert('Échec export Excel'); }
  }, [singleStatement, entityName, formatDate, debouncedPeriod]);

  if (loading) return <div className="flex items-center justify-center h-64" aria-live="polite"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">{error}</div>;
  if (!singleStatement) return <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg" role="alert">Aucune donnée financière disponible</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">État Financier - {entityName}</h3>
          <p className="text-sm text-gray-500">{entityType === 'owner' ? 'Propriétaire' : 'Locataire'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <DatePicker selected={selectedPeriod} onChange={(d: Date | null) => d && setSelectedPeriod(d)} dateFormat="MM/yyyy" showMonthYearPicker className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          <Button variant="outline" size="sm" onClick={generatePDF}><Download className="h-4 w-4 mr-1" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" /> Excel</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" role="list">
        <Card role="listitem">
          <div className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-2" />
            <div className="text-lg font-semibold text-green-600">{formatCurrency(singleStatement.summary.total_income)}</div>
            <p className="text-sm text-gray-500">Revenus</p>
          </div>
        </Card>
        <Card role="listitem">
          <div className="p-4 text-center">
            <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-2" />
            <div className="text-lg font-semibold text-red-600">{formatCurrency(singleStatement.summary.total_expenses)}</div>
            <p className="text-sm text-gray-500">Dépenses</p>
          </div>
        </Card>
        <Card role="listitem">
          <div className="p-4 text-center">
            <BarChart3 className={`h-5 w-5 mx-auto mb-2 ${singleStatement.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <div className={`text-lg font-semibold ${singleStatement.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(singleStatement.summary.balance)}
            </div>
            <p className="text-sm text-gray-500">Solde</p>
          </div>
        </Card>
        <Card role="listitem">
          <div className="p-4 text-center">
            <Calendar className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
            <div className="text-lg font-semibold text-yellow-600">{formatCurrency(singleStatement.summary.pending_payments)}</div>
            <p className="text-sm text-gray-500">En attente</p>
          </div>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Transactions</h4>
            <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>Voir détails</Button>
          </div>
          <div className="space-y-3" role="list">
            {singleStatement.transactions.length === 0 ? <p className="text-sm text-gray-500">Aucune transaction</p> :
              singleStatement.transactions.map(tr => (
                <TransactionItem key={tr.id} transaction={tr} formatCurrency={formatCurrency} formatDate={formatDate} onEdit={handleEditTransaction} />
              ))}
          </div>
        </div>
      </Card>

      {/* Detailed Modal */}
      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} title={`État financier détaillé - ${entityName}`} size="lg">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><h5 className="font-medium text-gray-900 mb-2">Période</h5>
              <p className="text-sm text-gray-600">Du {formatDate(singleStatement.period.start_date)} au {formatDate(singleStatement.period.end_date)}</p>
            </div>
            <div><h5 className="font-medium text-gray-900 mb-2">Généré le</h5>
              <p className="text-sm text-gray-600">{formatDate(singleStatement.generated_at)} à {new Date(singleStatement.generated_at).toLocaleTimeString('fr-FR')}</p>
            </div>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-3">Toutes les transactions</h5>
            <div className="max-h-[400px] overflow-y-auto space-y-2" role="list">
              {singleStatement.transactions.length === 0 ? <p className="text-sm text-gray-500">Aucune transaction</p> :
                singleStatement.transactions.map(tr => (
                  <div key={tr.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg" role="listitem">
                    <div>
                      <p className="font-medium text-gray-900">{tr.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(tr.date)} • {tr.category}</p>
                      {tr.property_id && <p className="text-xs text-gray-400">Propriété: {tr.property_id}</p>}
                    </div>
                    <div className="text-right">
                      <Badge variant={tr.type === 'income' ? 'success' : 'danger'} size="sm">
                        {tr.type === 'income' ? '+' : '-'}{formatCurrency(tr.amount)}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-2"/>Exporter Excel</Button>
            <Button onClick={generatePDF}><Download className="h-4 w-4 mr-2"/>Télécharger PDF</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTransaction} onClose={() => setEditTransaction(null)} title="Modifier transaction" size="md">
        {editTransaction && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input type="text" value={editTransaction.description} onChange={e => setEditTransaction({...editTransaction, description: e.target.value})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Montant</label>
              <input type="number" value={editTransaction.amount} onChange={e => setEditTransaction({...editTransaction, amount: Number(e.target.value)})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select value={editTransaction.type} onChange={e => setEditTransaction({...editTransaction, type: e.target.value as 'income'|'expense'})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="income">Revenu</option>
                <option value="expense">Dépense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Catégorie</label>
              <input type="text" value={editTransaction.category} onChange={e => setEditTransaction({...editTransaction, category: e.target.value})} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditTransaction(null)}>Annuler</Button>
              <Button onClick={handleSaveTransaction}>Enregistrer</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/**
 * TEST A FAIRE
 * 
import React, { useState, useCallback, useMemo } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, Pencil } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { utils, write } from 'xlsx';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FinancialStatement, FinancialTransaction } from '../../types/db';
import { useDebounce } from 'use-debounce';

interface FinancialStatementsProps {
  entityId: string;
  entityType: 'owner' | 'tenant';
  entityName: string;
}

const isValidEntityType = (type: string): type is 'owner' | 'tenant' =>
  ['owner', 'tenant'].includes(type);

const PAGE_SIZE = 20; // nombre de transactions par "page"

export const FinancialStatements: React.FC<FinancialStatementsProps> = ({ entityId, entityType, entityName }) => {
  if (!isValidEntityType(entityType)) {
    return <div className="p-4 bg-red-50 text-red-800 rounded-lg" role="alert">Type d'entité invalide : "{entityType}"</div>;
  }

  const [selectedPeriod, setSelectedPeriod] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [debouncedPeriod] = useDebounce(selectedPeriod.toISOString().slice(0, 7), 500);
  const [showDetails, setShowDetails] = useState(false);
  const [page, setPage] = useState(1);

  const { data: statements, loading, error } = useRealtimeData<FinancialStatement>(
    async () => await dbService.financialStatements.getByEntity(entityId, entityType, debouncedPeriod),
    `financial_statements_${entityId}_${entityType}_${debouncedPeriod}`
  );

  const singleStatement = statements?.[0] ?? null;

  const formatCurrency = useCallback((amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount), []);
  const formatDate = useCallback((date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan' }), []);

  // Transactions "paginated"
  const paginatedTransactions = useMemo(() => {
    if (!singleStatement) return [];
    const start = 0;
    const end = page * PAGE_SIZE;
    return singleStatement.transactions.slice(start, end);
  }, [singleStatement, page]);

  const hasMore = useMemo(() => {
    if (!singleStatement) return false;
    return page * PAGE_SIZE < singleStatement.transactions.length;
  }, [singleStatement, page]);

  const loadMore = () => setPage(prev => prev + 1);

  const generatePDF = useCallback(() => {
    if (!singleStatement) return alert('Aucune donnée disponible pour générer le PDF.');
    try {
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(20).text(`État Financier - ${entityName}`, 105, y, { align: 'center' });
      y += 10;
      doc.setFontSize(12).text(
        `Période: ${formatDate(singleStatement.period.start_date)} - ${formatDate(singleStatement.period.end_date)}`,
        105, y, { align: 'center' }
      );
      y += 20;
      doc.setFontSize(14).text('Résumé', 20, y);
      y += 10;
      doc.setFontSize(12).text(`Revenus: ${formatCurrency(singleStatement.summary.total_income)}`, 20, y);
      y += 10;
      doc.text(`Dépenses: ${formatCurrency(singleStatement.summary.total_expenses)}`, 20, y);
      y += 10;
      doc.text(`Solde: ${formatCurrency(singleStatement.summary.balance)}`, 20, y);
      y += 10;
      doc.text(`Paiements en attente: ${formatCurrency(singleStatement.summary.pending_payments)}`, 20, y);
      y += 20;
      doc.setFontSize(14).text('Transactions', 20, y);
      y += 10;
      if (!singleStatement.transactions.length) {
        doc.setFontSize(12).text('Aucune transaction pour cette période.', 20, y);
      } else {
        singleStatement.transactions.forEach(tr => {
          if (y > doc.internal.pageSize.height - 20) { doc.addPage(); y = 20; }
          doc.setFontSize(12).text(`${formatDate(tr.date)} - ${tr.description} (${tr.category}): ${tr.type === 'income' ? '+' : '-'}${formatCurrency(tr.amount)}`, 20, y);
          y += 10;
        });
      }
      doc.save(`FinancialStatement_${entityName}_${debouncedPeriod}.pdf`);
    } catch (err) { console.error(err); alert('Échec génération PDF'); }
  }, [singleStatement, entityName, formatCurrency, formatDate, debouncedPeriod]);

  const exportExcel = useCallback(() => {
    if (!singleStatement) return alert('Aucune donnée disponible pour Excel.');
    try {
      const wb = utils.book_new();
      const summaryWs = utils.json_to_sheet([{
        'Période Début': formatDate(singleStatement.period.start_date),
        'Période Fin': formatDate(singleStatement.period.end_date),
        Revenus: singleStatement.summary.total_income,
        Dépenses: singleStatement.summary.total_expenses,
        Solde: singleStatement.summary.balance,
        'Paiements en attente': singleStatement.summary.pending_payments,
      }]);
      utils.book_append_sheet(wb, summaryWs, 'Résumé');
      const txWs = utils.json_to_sheet(singleStatement.transactions.map(tr => ({
        Date: formatDate(tr.date),
        Description: tr.description,
        Catégorie: tr.category,
        Type: tr.type === 'income' ? 'Revenu' : 'Dépense',
        Montant: tr.amount,
        Propriété: tr.property_id ?? 'N/A',
      })));
      utils.book_append_sheet(wb, txWs, 'Transactions');
      const buf = write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `FinancialStatement_${entityName}_${debouncedPeriod}.xlsx`);
    } catch (err) { console.error(err); alert('Échec export Excel'); }
  }, [singleStatement, entityName, formatDate, debouncedPeriod]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-800 rounded-lg">{error}</div>;
  if (!singleStatement) return <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">Aucune donnée financière disponible</div>;

  return (
    <div className="space-y-6">
      {/* Header *_/}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">État Financier - {entityName}</h3>
          <p className="text-sm text-gray-500">{entityType === 'owner' ? 'Propriétaire' : 'Locataire'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <DatePicker selected={selectedPeriod} onChange={(d: Date | null) => d && setSelectedPeriod(d)} dateFormat="MM/yyyy" showMonthYearPicker className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          <Button variant="outline" size="sm" onClick={generatePDF}><Download className="h-4 w-4 mr-1" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" /> Excel</Button>
        </div>
      </div>

      {/* Summary Cards *_/}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><div className="p-4 text-center"><TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-2"/><div className="text-lg font-semibold text-green-600">{formatCurrency(singleStatement.summary.total_income)}</div><p className="text-sm text-gray-500">Revenus</p></div></Card>
        <Card><div className="p-4 text-center"><TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-2"/><div className="text-lg font-semibold text-red-600">{formatCurrency(singleStatement.summary.total_expenses)}</div><p className="text-sm text-gray-500">Dépenses</p></div></Card>
        <Card><div className="p-4 text-center"><BarChart3 className={`h-5 w-5 mx-auto mb-2 ${singleStatement.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}/><div className={`text-lg font-semibold ${singleStatement.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(singleStatement.summary.balance)}</div><p className="text-sm text-gray-500">Solde</p></div></Card>
        <Card><div className="p-4 text-center"><Calendar className="h-5 w-5 text-yellow-600 mx-auto mb-2"/><div className="text-lg font-semibold text-yellow-600">{formatCurrency(singleStatement.summary.pending_payments)}</div><p className="text-sm text-gray-500">En attente</p></div></Card>
      </div>

      {/* Transactions *_/}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Transactions</h4>
            <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>Voir détails</Button>
          </div>
          <div className="space-y-3" role="list">
            {paginatedTransactions.map(tr => (
              <div key={tr.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{tr.description}</p>
                  <p className="text-sm text-gray-500">{formatDate(tr.date)} • {tr.category}</p>
                </div>
                <div className="text-right">{formatCurrency(tr.amount)}</div>
              </div>
            ))}
          </div>
          {hasMore && <Button variant="outline" size="sm" onClick={loadMore} className="mt-3">Charger plus</Button>}
        </div>
      </Card>

      {/* Modal détaillé *_/}
      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} title={`État financier détaillé - ${entityName}`} size="lg">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><h5 className="font-medium text-gray-900 mb-2">Période</h5><p className="text-sm text-gray-600">Du {formatDate(singleStatement.period.start_date)} au {formatDate(singleStatement.period.end_date)}</p></div>
            <div><h5 className="font-medium text-gray-900 mb-2">Généré le</h5><p className="text-sm text-gray-600">{formatDate(singleStatement.generated_at)}</p></div>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {paginatedTransactions.map(tr => (
              <div key={tr.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{tr.description}</p>
                  <p className="text-sm text-gray-500">{formatDate(tr.date)} • {tr.category}</p>
                </div>
                <div className="text-right">{formatCurrency(tr.amount)}</div>
              </div>
            ))}
            {hasMore && <Button variant="outline" size="sm" onClick={loadMore} className="mt-3">Charger plus</Button>}
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-2"/>Exporter Excel</Button>
            <Button onClick={generatePDF}><Download className="h-4 w-4 mr-2"/>Télécharger PDF</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

 */