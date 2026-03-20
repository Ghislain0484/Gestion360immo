import React, { useState, useMemo, useEffect } from 'react';
import { Receipt, Search, Filter, ArrowDownRight, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/config';

const formatCurrency = (amount: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

export const OwnerFinances: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('rent_receipts')
          .select(`
            *,
            contract:contracts (
              property:properties ( title ),
              tenant:tenants ( first_name, last_name )
            )
          `)
          .order('payment_date', { ascending: false })
          .limit(200);
          
        setReceipts(data || []);
      } catch (err) {
        console.error('Error fetching finances', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinances();
  }, []);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const s = searchTerm.toLowerCase();
      const pName = r.contract?.property?.title?.toLowerCase() || '';
      const tName = `${r.contract?.tenant?.first_name} ${r.contract?.tenant?.last_name}`.toLowerCase();
      const rNum = r.receipt_number?.toLowerCase() || '';
      return pName.includes(s) || tName.includes(s) || rNum.includes(s);
    });
  }, [receipts, searchTerm]);

  const totalRevenue = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + (r.owner_payment || (r.total_amount * 0.9)), 0);
  }, [filteredReceipts]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/4 mb-8" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl mt-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finances</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez vos encaissements et paiements reçus.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 border-none text-white shadow-lg shadow-emerald-900/20 p-6 md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-semibold uppercase tracking-wider mb-2">Total Reversé (Filtré)</p>
              <h2 className="text-4xl font-black">{formatCurrency(totalRevenue)}</h2>
            </div>
            <div className="bg-emerald-500/30 p-3 rounded-2xl backdrop-blur-md">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-emerald-100 bg-emerald-900/20 w-max px-3 py-1.5 rounded-lg backdrop-blur-sm border border-emerald-500/20">
            <ArrowDownRight className="w-4 h-4" />
            <span>Paiements après commission d'agence</span>
          </div>
        </Card>
      </div>

      <Card className="shadow-sm border border-slate-100 overflow-hidden bg-white">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher une quittance..."
              className="pl-10 border-slate-200 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white">
            <Filter className="w-4 h-4" />
            <span>Filtrer</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">N° Quittance</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Locataire & Bien</th>
                <th className="p-4 font-semibold">Loyer Total</th>
                <th className="p-4 font-semibold text-right">Montant Reversé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Receipt className="w-8 h-8 text-slate-300 mb-3" />
                      <p>Aucun paiement trouvé.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReceipts.map(receipt => (
                  <tr key={receipt.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4">
                      <span className="font-semibold text-slate-800">{receipt.receipt_number || 'N/A'}</span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {new Date(receipt.payment_date || receipt.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-900">{receipt.contract?.tenant?.first_name} {receipt.contract?.tenant?.last_name}</p>
                      <p className="text-xs text-slate-500 mt-1">{receipt.contract?.property?.title}</p>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">
                      {formatCurrency(receipt.total_amount)}
                    </td>
                    <td className="p-4 text-right">
                      <Badge variant="success" className="bg-emerald-50 text-emerald-700 text-sm px-3 py-1 font-bold">
                        {formatCurrency(receipt.owner_payment || (receipt.total_amount * 0.9))}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
