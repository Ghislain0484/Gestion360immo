import React, { useEffect, useState } from 'react';
import { Building2, Users, FileText, Wallet, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { Card } from '../ui/Card';

const formatCurrency = (amount: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount ?? 0);

interface OwnerStats {
  totalProperties: number;
  totalTenants: number;
  activeContracts: number;
  monthlyRevenue: number;
}

export const OwnerDashboard: React.FC = () => {
  const { owner } = useAuth();
  const [stats, setStats] = useState<OwnerStats>({
    totalProperties: 0,
    totalTenants: 0,
    activeContracts: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!owner) return;
      try {
        setLoading(true);
        // Properties count
        const { count: propCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true });

        // Tenants count
        const { count: tenantCount } = await supabase
          .from('tenants')
          .select('*', { count: 'exact', head: true });

        // Active contracts count
        const { count: contractCount } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .in('status', ['active', 'renewed']);

        // Recent Rent Receipts & Monthly Revenue (Current Month)
        const date = new Date();
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        
        const { data: receipts } = await supabase
          .from('rent_receipts')
          .select(`
            *,
            contract:contracts (
              property:properties ( title, reference ),
              tenant:tenants ( first_name, last_name )
            )
          `)
          .order('payment_date', { ascending: false })
          .limit(10);

        const currentMonthReceipts = receipts?.filter((r: any) => new Date(r.payment_date || r.created_at) >= new Date(startOfMonth)) || [];
        // The owner receives the rent minus the agency commission.
        // If owner_payment is tracked in rent_receipts, we sum that up.
        // Otherwise, total_amount * 0.9 (assuming 10% commission). Let's use owner_payment if it exists, else calculate 90%.
        const revenue = currentMonthReceipts.reduce((sum: number, r: any) => sum + (r.owner_payment || (r.total_amount * 0.9)), 0);

        setStats({
          totalProperties: propCount || 0,
          totalTenants: tenantCount || 0,
          activeContracts: contractCount || 0,
          monthlyRevenue: revenue,
        });

        setRecentReceipts(receipts || []);
      } catch (err) {
        console.error('Error fetching owner stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [owner]);

  const metrics = [
    { label: 'Mes Biens', value: stats.totalProperties, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100/50' },
    { label: 'Locataires', value: stats.totalTenants, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100/50' },
    { label: 'Contrats Actifs', value: stats.activeContracts, icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100/50' },
    { label: 'Revenus du Mois', value: formatCurrency(stats.monthlyRevenue), icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-100/50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vue d'ensemble</h1>
        <p className="text-slate-500 mt-2 text-lg">Bienvenue dans votre espace sécurisé. Voici le résumé de vos actifs.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse shadow-sm" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${m.bg}`}>
                  <m.icon className={`w-7 h-7 ${m.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{m.label}</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{m.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Derniers Paiements Reçus</h2>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
            </div>
          ) : recentReceipts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl">
              Aucun paiement récent trouvé.
            </div>
          ) : (
            <div className="space-y-4">
              {recentReceipts.map(receipt => (
                <div key={receipt.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                      {receipt.contract?.tenant?.first_name?.[0] || 'L'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {receipt.contract?.property?.title || 'Propriété inconnue'}
                      </p>
                      <p className="text-sm text-slate-500">
                        Locataire: {receipt.contract?.tenant?.first_name} {receipt.contract?.tenant?.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(receipt.total_amount)}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(receipt.payment_date || receipt.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Placeholder for future maintenance chart or quick actions */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Besoin d'aide ?</h2>
            <p className="text-slate-300">Votre agence est à votre disposition pour toute question concernant la gestion de vos biens.</p>
          </div>
          <div className="mt-8">
            <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <p className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-1">Contact Agence</p>
              <p className="text-lg font-bold">Votre Agence</p>
              <p className="text-slate-300 text-sm mt-1">Disponibles du Lundi au Vendredi</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
