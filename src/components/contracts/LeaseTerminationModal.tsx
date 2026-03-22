import React, { useState } from 'react';
import { X, AlertTriangle, Calculator } from 'lucide-react';
import { dbService } from '../../lib/supabase';
import { Contract } from '../../types/db';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { toast } from 'react-hot-toast';

interface LeaseTerminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  onSuccess: () => void;
}

export const LeaseTerminationModal: React.FC<LeaseTerminationModalProps> = ({
  isOpen,
  onClose,
  contract,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [unpaidRent, setUnpaidRent] = useState(0);
  const [repairDeductions, setRepairDeductions] = useState(0);
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Caution versée initialement
  const initialDeposit = contract.deposit || 0;
  
  // Calcul du remboursement net
  const netRefund = initialDeposit - unpaidRent - repairDeductions;

  const handleTerminate = async () => {
    setLoading(true);
    try {
      // 1. Mettre à jour le statut du contrat
      await dbService.contracts.update(contract.id, {
        status: 'terminated',
        end_date: terminationDate,
        extra_data: {
          ...(contract.extra_data || {}),
          termination: {
            date: terminationDate,
            initial_deposit: initialDeposit,
            unpaid_rent_deduction: unpaidRent,
            repairs_deduction: repairDeductions,
            net_refund: netRefund,
            notes: notes
          }
        }
      });

      // 2. Libérer le bien si besoin? (Property.is_available = true)
      await dbService.properties.update(contract.property_id, {
        is_available: true
      });

      toast.success('Bail clôturé avec succès');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Erreur lors de la clôture: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 bg-red-50 border-b border-red-100">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-bold">Clôture de Bail & Liquidation</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 text-sm border border-gray-100">
            <p className="text-gray-500 uppercase text-[10px] font-bold tracking-wider mb-2">Résumé du Bail</p>
            <div className="flex justify-between items-center py-1">
              <span>Caution encaissée (Dépôt de garantie) :</span>
              <span className="font-bold text-gray-900">{initialDeposit.toLocaleString()} FCFA</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date de sortie effective</label>
              <input 
                type="date"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                value={terminationDate}
                onChange={e => setTerminationDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Reliquat de loyer impayé</label>
                <input 
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="0"
                  value={unpaidRent || ''}
                  onChange={e => setUnpaidRent(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Retenues pour travaux / dégâts</label>
                <input 
                  type="number"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="0"
                  value={repairDeductions || ''}
                  onChange={e => setRepairDeductions(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Justificatifs / Notes</label>
              <textarea 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
                rows={3}
                placeholder="Ex : Peinture salon dégradée, 15 jours de loyer au prorata..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Card className="p-4 bg-gray-900 text-white overflow-hidden relative">
             <Calculator className="absolute right-2 top-2 w-16 h-16 text-white/5" />
             <p className="text-xs text-gray-400 uppercase font-black mb-3">Calcul de Liquidation Finale</p>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Dépôt de garantie (+)</span>
                  <span>{initialDeposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Impayés / Prorata (-)</span>
                  <span>{unpaidRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span>Dégâts / Travaux (-)</span>
                  <span>{repairDeductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-3 mt-2 border-t border-white/10 text-xl font-bold">
                  <span className="text-amber-400">CAUTION À RESTITUER</span>
                  <span className={netRefund >= 0 ? 'text-green-400' : 'text-red-500'}>
                    {netRefund.toLocaleString()} FCFA
                  </span>
                </div>
             </div>
          </Card>

          <div className="flex gap-3">
             <Button variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>Annuler</Button>
             <Button 
               className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-lg"
               onClick={handleTerminate}
               isLoading={loading}
             >
                Confirmer la Sortie
             </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
