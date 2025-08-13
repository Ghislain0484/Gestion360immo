import React, { useState } from 'react';
import { BarChart3, Download, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { FinancialStatement, FinancialTransaction } from '../../types/receipt';

interface FinancialStatementsProps {
  entityId: string;
  entityType: 'owner' | 'tenant';
  entityName: string;
}

export const FinancialStatements: React.FC<FinancialStatementsProps> = ({
  entityId,
  entityType,
  entityName
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('2024-03');
  const [showDetails, setShowDetails] = useState(false);

  // Mock financial data
  const statement: FinancialStatement = {
    id: `statement_${entityId}_${selectedPeriod}`,
    entityId,
    entityType,
    agencyId: 'agency1',
    period: {
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-31')
    },
    summary: {
      totalIncome: entityType === 'owner' ? 450000 : 0,
      totalExpenses: entityType === 'owner' ? 45000 : 450000,
      balance: entityType === 'owner' ? 405000 : -450000,
      pendingPayments: entityType === 'owner' ? 0 : 450000
    },
    transactions: [
      {
        id: '1',
        date: new Date('2024-03-05'),
        type: entityType === 'owner' ? 'income' : 'expense',
        category: 'Loyer',
        description: 'Loyer mensuel Mars 2024',
        amount: 450000,
        propertyId: 'property1',
        contractId: 'contract1'
      },
      {
        id: '2',
        date: new Date('2024-03-05'),
        type: 'expense',
        category: 'Commission',
        description: 'Commission agence (10%)',
        amount: 45000,
        contractId: 'contract1'
      }
    ],
    generatedAt: new Date()
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const generatePDF = () => {
    // Generate PDF statement
    console.log('Generating PDF for:', entityId, selectedPeriod);
  };

  const exportExcel = () => {
    // Export to Excel
    console.log('Exporting to Excel for:', entityId, selectedPeriod);
  };

  const periods = [
    { value: '2024-03', label: 'Mars 2024' },
    { value: '2024-02', label: 'Février 2024' },
    { value: '2024-01', label: 'Janvier 2024' },
    { value: '2023-12', label: 'Décembre 2023' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            État Financier - {entityName}
          </h3>
          <p className="text-sm text-gray-500">
            {entityType === 'owner' ? 'Propriétaire' : 'Locataire'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>{period.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={generatePDF}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(statement.summary.totalIncome)}
            </div>
            <p className="text-sm text-gray-500">Revenus</p>
          </div>
        </Card>

        <Card>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-lg font-semibold text-red-600">
              {formatCurrency(statement.summary.totalExpenses)}
            </div>
            <p className="text-sm text-gray-500">Dépenses</p>
          </div>
        </Card>

        <Card>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className={`h-5 w-5 ${statement.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className={`text-lg font-semibold ${statement.summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(statement.summary.balance)}
            </div>
            <p className="text-sm text-gray-500">Solde</p>
          </div>
        </Card>

        <Card>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-lg font-semibold text-yellow-600">
              {formatCurrency(statement.summary.pendingPayments)}
            </div>
            <p className="text-sm text-gray-500">En attente</p>
          </div>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Transactions</h4>
            <Button variant="outline" size="sm" onClick={() => setShowDetails(true)}>
              Voir détails
            </Button>
          </div>
          
          <div className="space-y-3">
            {statement.transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {transaction.date.toLocaleDateString('fr-FR')} • {transaction.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Detailed View Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={`État financier détaillé - ${entityName}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Période</h5>
              <p className="text-sm text-gray-600">
                Du {statement.period.startDate.toLocaleDateString('fr-FR')} au{' '}
                {statement.period.endDate.toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Généré le</h5>
              <p className="text-sm text-gray-600">
                {statement.generatedAt.toLocaleDateString('fr-FR')} à{' '}
                {statement.generatedAt.toLocaleTimeString('fr-FR')}
              </p>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-3">Toutes les transactions</h5>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {statement.transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {transaction.date.toLocaleDateString('fr-FR')} • {transaction.category}
                    </p>
                    {transaction.propertyId && (
                      <p className="text-xs text-gray-400">Propriété: {transaction.propertyId}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={transaction.type === 'income' ? 'success' : 'danger'} size="sm">
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={exportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exporter Excel
            </Button>
            <Button onClick={generatePDF}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};