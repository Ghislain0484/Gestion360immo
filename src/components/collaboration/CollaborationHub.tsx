import React, { useState, useEffect } from 'react';
import { Shield, UserCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TenantHistorySearch } from './TenantHistorySearch';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { FintechService } from '../../lib/db/fintechService';
import toast from 'react-hot-toast';

export const CollaborationHub: React.FC = () => {
  const { user, agencyId: authAgencyId } = useAuth();
  const [activeTab, setActiveTab] = useState<'candidature' | 'requests'>('candidature');
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
      {/* Wallet / Credits Bar */}
      <div className="flex justify-end">
        {wallet ? (
          <div className="bg-amber-400 text-amber-950 px-4 py-2 rounded-full font-bold shadow-lg flex items-center space-x-2 border-2 border-amber-500">
            <Shield className="h-5 w-5" />
            <span>🎫 {wallet.bonus_credits} CRÉDIT{wallet.bonus_credits > 1 ? 'S' : ''} OFFERT{wallet.bonus_credits > 1 ? 'S' : ''}</span>
            {wallet.balance > 0 && <span className="ml-2 border-l border-amber-600 pl-2">+ SOLDE: {wallet.balance.toLocaleString('fr-FR')} F</span>}
            <button
              onClick={refreshWallet}
              className="ml-1 text-amber-800 hover:text-amber-950 text-xs underline"
              title="Actualiser le solde"
            >
              ↺
            </button>
          </div>
        ) : (
          <div className="text-amber-600 text-sm animate-pulse">Vérification des crédits...</div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 uppercase">Collaboration Inter-Agences</h1>
        <p className="text-gray-600 mt-1">Gérez vos candidatures locatives et partagez vos historiques pour des commissions.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('candidature')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'candidature'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Candidature à la location</span>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === 'requests'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Shield className="h-4 w-4" />
            <span>Demandes d'infos reçues ({collaborationRequests.length})</span>
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'candidature' && (
        <TenantHistorySearch onCreditUsed={refreshWallet} />
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {collaborationRequests.length > 0 ? (
            collaborationRequests.map((request) => (
              <Card key={request.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Demande d'accès au dossier d'un de vos locataires</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      L'agence <span className="font-bold text-blue-600">{request.requester_agency?.name || 'Inconnue'}</span>{' '}
                      demande l'accès à l'historique du locataire ID : <span className="font-mono bg-gray-100 px-1 rounded">{request.tier_id?.slice(0, 8)}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Demandé par {request.requester?.first_name} {request.requester?.last_name} le{' '}
                      {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      request.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status === 'pending' ? 'En attente' :
                       request.status === 'approved' ? 'Approuvée' : 'Refusée'}
                    </span>
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observation ou note interne (visible uniquement par l'agence demandeuse)
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        rows={2}
                        placeholder="Ex: Excellent locataire, loyers toujours payés à l'avance..."
                        value={observations[request.id] || ''}
                        onChange={(e) => setObservations(prev => ({ ...prev, [request.id]: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('collaboration_requests')
                            .update({ status: 'rejected', updated_at: new Date().toISOString() })
                            .eq('id', request.id);

                          if (error) throw error;
                          toast.success('Demande refusée');
                          loadData();
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                    >
                      Refuser l'accès
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
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

                          // 💰 Commission pour l'agence qui donne l'info (+1 crédit)
                          try {
                            const { data: w } = await supabase
                              .from('agency_wallets')
                              .select('bonus_credits')
                              .eq('agency_id', authAgencyId)
                              .single();
                            if (w) {
                              await supabase.from('agency_wallets')
                                .update({ bonus_credits: (w.bonus_credits || 0) + 1 })
                                .eq('agency_id', authAgencyId);
                              await supabase.from('wallet_transactions').insert([{
                                agency_id: authAgencyId,
                                amount: 0,
                                type: 'reward',
                                description: 'Commission info : partage historique locataire (Candidature)',
                                status: 'completed'
                              }]);
                            }
                          } catch (rewardErr) {
                            console.warn('Erreur commission (non bloquante):', rewardErr);
                          }

                          toast.success('✅ Accès accordé ! Vous avez gagné 1 crédit de commission.');
                          loadData();
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                    >
                      Approuver & Gagner 1 Crédit
                    </Button>
                  </div>
                </div>
                )}
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center border-dashed border-2">
              <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune demande d'information reçue
              </h3>
              <p className="text-gray-600">
                Lorsqu'une agence cherchera un locataire ayant séjourné chez vous, sa demande apparaîtra ici.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};