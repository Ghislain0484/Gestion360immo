import React, { useState } from 'react';
import { Hammer, CheckCircle2, XCircle, Clock, Plus, Trash2, Home } from 'lucide-react';
import { PropertyExpense, Property } from '../../types/db';
import { dbService } from '../../lib/supabase';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import toast from 'react-hot-toast';

interface MaintenanceManagerProps {
  ownerId: string;
  properties: Property[];
}

export const MaintenanceManager: React.FC<MaintenanceManagerProps> = ({ ownerId, properties }) => {
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'director';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    description: '',
    amount: '',
    category: 'maintenance' as const,
    expense_date: new Date().toISOString().split('T')[0],
  });

  const { data: expenses = [], refetch } = useRealtimeData<PropertyExpense>(
    async () => {
      // Fetch all expenses for all properties of this owner
      const allExpenses: PropertyExpense[] = [];
      for (const prop of properties) {
        const propExpenses = await dbService.propertyExpenses.getAll({ property_id: prop.id });
        allExpenses.push(...propExpenses.filter(e => e.category === 'maintenance'));
      }
      return allExpenses.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
    },
    'property_expenses',
    { owner_id: ownerId }
  );

  const handleStatusUpdate = async (id: string, status: PropertyExpense['status']) => {
    try {
      await dbService.propertyExpenses.update(id, { status });
      toast.success(status === 'approved' ? 'Travaux approuvés' : 'Travaux rejetés');
      refetch();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette demande ?')) return;
    try {
      await dbService.propertyExpenses.delete(id);
      toast.success('Supprimé');
      refetch();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_id || !formData.amount || !formData.description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      await dbService.propertyExpenses.create({
        ...formData,
        amount: Number(formData.amount),
        agency_id: user?.agency_id || '',
        status: isManager ? 'approved' : 'pending_validation',
      });
      toast.success('Demande enregistrée');
      setIsModalOpen(false);
      setFormData({
        property_id: '',
        description: '',
        amount: '',
        category: 'maintenance',
        expense_date: new Date().toISOString().split('T')[0],
      });
      refetch();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const getStatusBadge = (status: PropertyExpense['status']) => {
    switch (status) {
      case 'pending_validation': return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</Badge>;
      case 'approved': return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approuvé</Badge>;
      case 'rejected': return <Badge variant="info" className="px-3 py-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejeté</Badge>;
      case 'deducted': return <Badge variant="secondary" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Déduit</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Hammer className="w-5 h-5 text-blue-600" />
            Entretien & Embellissement
          </h3>
          <p className="text-sm text-gray-500">Planifiez les travaux périodiques pour vos biens</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Demander des travaux
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {expenses.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Hammer className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aucun historique de travaux pour ce parc.</p>
          </div>
        ) : (
          expenses.map(expense => {
            const property = properties.find(p => p.id === expense.property_id);
            return (
              <Card key={expense.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Hammer className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{expense.description}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Home className="w-3 h-3" /> {property?.title || 'Bien inconnu'}
                      </p>
                      <div className="mt-2 text-sm font-bold text-blue-700">
                        {expense.amount.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(expense.status)}
                    <span className="text-[10px] text-gray-400">Demandé le {new Date(expense.expense_date).toLocaleDateString()}</span>
                    
                    <div className="flex gap-2 mt-2">
                      {isManager && expense.status === 'pending_validation' && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 px-2 py-1 h-7 text-xs" onClick={() => handleStatusUpdate(expense.id, 'approved')}>
                            Approuver
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 px-2 py-1 h-7 text-xs" onClick={() => handleStatusUpdate(expense.id, 'rejected')}>
                            Rejeter
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-600 px-2 h-7" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouvelle Demande de Travaux" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bien concerné</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.property_id}
              onChange={e => setFormData({ ...formData, property_id: e.target.value })}
              required
            >
              <option value="">Sélectionner un bien</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description des travaux</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Peinture salon, Réparation clim..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimation du coût (FCFA)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              required
              min="0"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button type="submit" className="flex-1">Envoyer la demande</Button>
          </div>
          <p className="text-[10px] text-gray-500 text-center italic">
            * Les travaux seront planifiés et déduits après validation par le gestionnaire.
          </p>
        </form>
      </Modal>
    </div>
  );
};
