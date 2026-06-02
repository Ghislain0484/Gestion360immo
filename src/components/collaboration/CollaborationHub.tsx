import React, { useState, useEffect } from 'react';
import { Shield, UserCheck, Megaphone } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TenantHistorySearch } from './TenantHistorySearch';
import { CollaborationAds } from './CollaborationAds';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { FintechService } from '../../lib/db/fintechService';
import toast from 'react-hot-toast';

export const CollaborationHub: React.FC = () => {
  const { user, agencyId: authAgencyId } = useAuth();
  const [activeTab, setActiveTab] = useState<'candidature' | 'requests' | 'ads'>('candidature');
  const [collaborationRequests, setCollaborationRequests] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState<Record<string, string>>({});

  // Load wallet and requests
  const loadData = async () => {
    if (!authAgencyId) return;
    setLoading(true);
    try {
      // Wallet
      const w = await FintechService.getWallet(authAgencyId);
      setWallet(w);

      // Requests received
      const { data: requestsData } = await supabase
        .from('collaboration_requests')
        .select('*, requester_agency:agencies!collaboration_requests_requester_agency_id_fkey(name), requester:users!collaboration_requests_requester_id_fkey(first_name, last_name)')
        .eq('target_agency_id', authAgencyId)
        .order('created_at', { ascending: false });

      setCollaborationRequests(requestsData ?? []);
    } catch (err: any) {
      console.error('Erreur de chargement :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authAgencyId]);

  const refreshWallet = () => {
    if (authAgencyId) {
      FintechService.getWallet(authAgencyId)
        .then(setWallet)
        .catch(err => console.error('Erreur chargement portefeuille:', err));
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Collaboration <span className="text-blue-600">Inter-Agences</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Propulsez votre agence grâce au réseau Gestion360immo : partagez, collaborez, gagnez.
          </p>
        </div>

        {/* Wallet / Credits Bar */}
        <div className="flex-shrink-0">
          {wallet ? (
            <div className="card-glass px-5 py-2.5 flex items-center space-x-3 border-amber-200/50 bg-amber-50/50 dark:bg-amber-500/10 dark:border-amber-500/20">
              <div className="bg-amber-400 p-1.5 rounded-lg shadow-inner">
                <Shield className="h-4 w-4 text-amber-950" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-amber-800 dark:text-amber-400 leading-none">Votre Solde</span>
                <span className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  {Number(wallet.bonus_credits || 0) + Math.floor(Number(wallet.balance || 0) / 1000)} Crédits {wallet.balance > 0 && `· ${wallet.balance.toLocaleString('fr-FR')} F`}
                </span>
              </div>
              <button
                onClick={refreshWallet}
                className="p-1.5 hover:bg-amber-200/50 dark:hover:bg-amber-500/20 rounded-full transition-colors text-amber-700 dark:text-amber-400"
                title="Actualiser"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
          ) : (
            <div className="h-10 w-48 bg-slate-100 animate-pulse rounded-full" />
          )}
        </div>
      </div>

      {/* Tabs - Modern Minimalist */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700/50">
        <button
          onClick={() => setActiveTab('candidature')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'candidature'
              ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Candidatures</span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Demandes Reçues</span>
          {collaborationRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
              {collaborationRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'ads'
              ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Megaphone className="h-4 w-4" />
          <span>Annonces</span>
          <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-tighter">NEW</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'candidature' && (
        <TenantHistorySearch onCreditUsed={refreshWallet} />
      )}

      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 gap-6">
          {collaborationRequests.length > 0 ? (
            collaborationRequests.map((request) => (
              <div key={request.id} className="card-glass p-8 group">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <UserCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Dossier Locataire</h3>
                        <p className="text-sm text-slate-500">Référence: {request.tier_id?.slice(0, 12)}...</p>
                      </div>
                    </div>
                    
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      L'agence <span className="font-bold text-blue-600 underline decoration-blue-200 underline-offset-4">{request.requester_agency?.name || 'Inconnue'}</span>{' '}
                      souhaite consulter l'historique de ce candidat pour valider son dossier.
                    </p>
                    
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Par {request.requester?.first_name} {request.requester?.last_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span className={`badge-premium ${
                      request.status === 'pending' ? 'text-amber-600 border-amber-200 bg-amber-50/50' :
                      request.status === 'approved' ? 'text-emerald-600 border-emerald-200 bg-emerald-50/50' :
                      'text-red-600 border-red-200 bg-red-50/50'
                    }`}>
                      {request.status === 'pending' ? 'En attente' :
                       request.status === 'approved' ? 'Approuvée' : 'Refusée'}
                    </span>
                    
                    {request.status === 'approved' && (
                      <div className="bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Commission perçue
                      </div>
                    )}
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl mb-6">
                      <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                        Observation Confidentielle
                      </label>
                      <textarea
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm shadow-inner"
                        rows={3}
                        placeholder="Ex: Excellent locataire, aucun retard en 24 mois. Je recommande vivement."
                        value={observations[request.id] || ''}
                        onChange={(e) => setObservations(prev => ({ ...prev, [request.id]: e.target.value }))}
                      />
                    </div>
                    
                    <div className="flex justify-end items-center gap-4">
                      <button
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('collaboration_requests')
                              .update({ status: 'rejected', updated_at: new Date().toISOString() })
                              .eq('id', request.id);
                            if (error) throw error;
                            toast.success('Demande refusée. Les fonds sont alloués à la plateforme.');
                            loadData();
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                        className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Décliner la demande
                      </button>
                      
                      <Button
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('collaboration_requests')
                              .update({ 
                                status: 'approved', 
                                observation: observations[request.id] || null,
                                updated_at: new Date().toISOString() 
                              })
                              .eq('id', request.id);
                            if (error) throw error;

                            try {
                              const { data: w } = await supabase
                                .from('agency_wallets')
                                .select('balance')
                                .eq('agency_id', authAgencyId)
                                .single();
                              if (w) {
                                const newBalance = (Number(w.balance) || 0) + 500;
                                await supabase.from('agency_wallets')
                                  .update({ balance: newBalance })
                                  .eq('agency_id', authAgencyId);
                                
                                await supabase.from('wallet_transactions').insert([{
                                  agency_id: authAgencyId,
                                  amount: 500,
                                  type: 'referral_bonus',
                                  description: 'Commission de 50% (500 F) pour partage d\'historique locataire',
                                  status: 'completed'
                                }]);
                              }
                            } catch (rewardErr) {
                              console.warn('Erreur commission:', rewardErr);
                            }

                            toast.success('Accès accordé ! Commission de 50% (500 F) créditée sur votre portefeuille.');
                            loadData();
                          } catch (err: any) {
                            toast.error(err.message);
                          }
                        }}
                        className="btn-premium"
                      >
                        Approuver & Gagner 50% (500 F)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-20 text-center">
              <div className="h-24 w-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Aucune demande en attente</h3>
              <p className="text-slate-500">Vos opportunités de commission apparaîtront ici.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ads' && (
        <CollaborationAds />
      )}
    </div>
  );
};