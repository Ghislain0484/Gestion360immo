import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, ClipboardCheck, Receipt, Search, 
  Download, Eye, Calendar, ChevronRight, 
  ShieldCheck, ArrowUpRight, Info, Filter
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { motion, AnimatePresence } from 'framer-motion';

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export const OwnerDocuments: React.FC = () => {
  const { owner } = useAuth();
  const [activeTab, setActiveTab] = useState<'contracts' | 'inventories' | 'receipts'>('contracts');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    contracts: any[];
    inventories: any[];
    receipts: any[];
  }>({ contracts: [], inventories: [], receipts: [] });
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!owner?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: props } = await supabase.from('properties').select('id').eq('owner_id', owner.id);
        const propIds = (props || []).map((p: any) => p.id);

        if (propIds.length === 0) { setLoading(false); return; }

        // Fetch Contracts
        const { data: ctrs } = await supabase
          .from('contracts')
          .select('*, property:properties(title), tenant:tenants(first_name, last_name)')
          .in('property_id', propIds);

        // Fetch Inventories
        const { data: invs } = await supabase
          .from('inventories')
          .select('*, property:properties(title)')
          .in('property_id', propIds);

        // Fetch Receipts
        const contractIds = (ctrs || []).map((c: any) => c.id);
        const { data: rcts } = contractIds.length > 0 ? await supabase
          .from('rent_receipts')
          .select('*, contract:contracts(id, property:properties(title))')
          .in('contract_id', contractIds)
          .order('payment_date', { ascending: false }) : { data: [] };

        setData({
          contracts: ctrs || [],
          inventories: invs || [],
          receipts: rcts || []
        });
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [owner?.id]);

  const filteredData = useMemo(() => {
    const s = search.toLowerCase();
    const currentList = data[activeTab] || [];
    return currentList.filter((item: any) => {
      const propTitle = (item.property?.title || item.contract?.property?.title || '').toLowerCase();
      const tenantName = activeTab === 'contracts' 
        ? `${item.tenant?.first_name} ${item.tenant?.last_name}`.toLowerCase()
        : '';
      return propTitle.includes(s) || tenantName.includes(s) || (item.receipt_number || '').toLowerCase().includes(s);
    });
  }, [data, activeTab, search]);

  if (loading) return (
    <div className="space-y-8 animate-pulse text-slate-900">
       <div className="h-10 bg-slate-200 rounded-xl w-1/4" />
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-900">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-3xl" />)}
       </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vue Documentaire</h1>
          <p className="text-slate-500 mt-1 font-medium">Votre coffre-fort numérique sécurisé</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input
              type="text"
              placeholder="Rechercher un document..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
            />
          </div>
          <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-slate-100 shadow-sm">
            {[
              { id: 'contracts', label: 'Contrats', icon: FileText },
              { id: 'inventories', label: 'États', icon: ClipboardCheck },
              { id: 'receipts', label: 'Quittances', icon: Receipt },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {filteredData.map((item: any) => (
              <div key={item.id} className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-emerald-100 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                   <div className="w-12 h-12 bg-slate-50 group-hover:bg-emerald-50 rounded-2xl flex items-center justify-center transition-colors">
                      <FileText className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                   </div>
                </div>

                <div className="mb-6">
                  <span className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-colors">
                    {activeTab === 'contracts' ? 'Bail de Location' : activeTab === 'inventories' ? 'État des Lieux' : 'Reçu de Loyer'}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-3 group-hover:text-emerald-700 transition-colors">
                    {item.property?.title || item.contract?.property?.title || 'Document Immobilier'}
                  </h3>
                  {item.tenant && (
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                       {item.tenant.first_name} {item.tenant.last_name}
                    </p>
                  )}
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <div className="flex items-center justify-between text-xs">
                     <span className="flex items-center gap-2 text-slate-400 font-medium">
                        <Calendar className="w-4 h-4" /> {formatDate(item.start_date || item.date || item.payment_date)}
                     </span>
                     <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-black uppercase tracking-widest text-[8px]">
                        Validé
                     </span>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                   <button 
                     onClick={() => alert("Chargement du document sécurisé...")}
                     className="flex-1 flex items-center justify-center gap-2 h-12 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/10"
                   >
                      <Eye className="w-4 h-4" /> Voir
                   </button>
                   <button 
                     onClick={() => alert("Téléchargement en cours...")}
                     className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm"
                   >
                      <Download className="w-5 h-5" />
                   </button>
                </div>
              </div>
            ))}

            {filteredData.length === 0 && (
              <div className="col-span-full py-32 bg-slate-50/50 rounded-[3.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center px-8">
                 <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <Info className="w-10 h-10 text-slate-200" />
                 </div>
                 <h3 className="text-xl font-black text-slate-800 mb-2">Aucun document trouvé</h3>
                 <p className="text-sm text-slate-400 max-w-sm mx-auto">
                    Il se peut que vos documents soient en cours de validation par votre gestionnaire.
                 </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-10 bg-gradient-to-br from-slate-900 to-slate-950 rounded-[3rem] text-white overflow-hidden relative group">
         <div className="absolute top-0 right-0 p-12">
            <ShieldCheck className="w-24 h-24 text-white/5 group-hover:text-emerald-500/10 transition-colors duration-700" />
         </div>
         <div className="relative z-10 max-w-2xl">
            <h3 className="text-2xl font-black mb-4 text-white">Sécurité & Confidentialité</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
               Tous vos documents sont cryptés et stockés sur des serveurs sécurisés. L'accès est strictement réservé à vous et à votre agence gestionnaire. 
               Les quittances et contrats font foi de justificatifs officiels.
            </p>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-full">
                  <ShieldCheck className="w-4 h-4" /> Certification de Signature
               </div>
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full">
                  <ArrowUpRight className="w-4 h-4" /> Archivage Légal
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
