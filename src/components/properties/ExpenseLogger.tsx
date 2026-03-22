import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Wrench, Zap, Scale, Receipt, AlertCircle } from 'lucide-react';
import { dbService } from '../../lib/supabase';
import { PropertyExpense } from '../../types/db';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface ExpenseLoggerProps {
  propertyId: string;
}

export const ExpenseLogger: React.FC<ExpenseLoggerProps> = ({ propertyId }) => {
  const { agencyId } = useAuth();
  const [expenses, setExpenses] = useState<PropertyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'maintenance' as PropertyExpense['category'],
    expense_date: new Date().toISOString().split('T')[0]
  });

  const loadExpenses = async () => {
    try {
      const data = await dbService.propertyExpenses.getAll({ property_id: propertyId });
      setExpenses(data);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [propertyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyId) return;

    try {
      await dbService.propertyExpenses.create({
        ...newExpense,
        amount: Number(newExpense.amount),
        property_id: propertyId,
        agency_id: agencyId,
        status: 'pending_deduction'
      });
      setNewExpense({
        description: '',
        amount: '',
        category: 'maintenance',
        expense_date: new Date().toISOString().split('T')[0]
      });
      setShowAddForm(false);
      loadExpenses();
    } catch (err) {
      console.error('Error creating expense:', err);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'utilities': return <Zap className="w-4 h-4" />;
      case 'legal': return <Scale className="w-4 h-4" />;
      case 'tax': return <Receipt className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber-500" />
          Dépenses & Travaux Propriétaire
        </h3>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle dépense
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 bg-amber-50 border-amber-200 animate-fade-in">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Description des travaux</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Ex: Réparation fuite évier cuisine..."
                value={newExpense.description}
                onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Montant (FCFA)</label>
              <input
                type="number"
                required
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                value={newExpense.amount}
                onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Catégorie</label>
              <select
                className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                value={newExpense.category}
                onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
              >
                <option value="maintenance">Maintenance / Travaux</option>
                <option value="utilities">Charges / Factures</option>
                <option value="legal">Frais Juridiques</option>
                <option value="tax">Taxes / Impôts</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Annuler</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Enregistrer</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-400">Chargement...</div>
      ) : expenses.length === 0 ? (
        <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
          <p>Aucune dépense enregistrée sur ce bien.</p>
        </div>
      ) : (
        <div className="overflow-hidden border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-500 tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(expense.expense_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">{getCategoryIcon(expense.category)}</span>
                      <span className="text-sm font-medium text-gray-900">{expense.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                    {expense.amount.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={expense.status === 'deducted' ? 'success' : 'warning'}>
                      {expense.status === 'deducted' ? 'Déduit' : 'À déduire'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
