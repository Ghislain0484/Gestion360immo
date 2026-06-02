import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, Key, RefreshCw, Save, HelpCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

type GatewayType = 'flutterwave' | 'cinetpay' | 'paydunya' | 'fineopay';

export const PaymentGatewaySettings: React.FC = () => {
  const { agencyId, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  // Selected gateway type for settings display
  const [selectedTab, setSelectedTab] = useState<GatewayType>('flutterwave');
  
  // Active gateway chosen by agency for checkouts
  const [activeGateway, setActiveGateway] = useState<GatewayType>('flutterwave');

  // Credentials States
  // 1. Flutterwave
  const [fwPublicKey, setFwPublicKey] = useState('');
  const [fwSecretKey, setFwSecretKey] = useState('');
  const [showFwSecret, setShowFwSecret] = useState(false);

  // 2. CinetPay
  const [cpSiteId, setCpSiteId] = useState('');
  const [cpApiKey, setCpApiKey] = useState('');
  const [showCpSecret, setShowCpSecret] = useState(false);

  // 3. Paydunya
  const [pdMasterKey, setPdMasterKey] = useState('');
  const [pdPublicKey, setPdPublicKey] = useState('');
  const [pdPrivateKey, setPdPrivateKey] = useState('');
  const [pdToken, setPdToken] = useState('');
  const [showPdSecret, setShowPdSecret] = useState(false);

  // 4. FineoPay
  const [fpClientId, setFpClientId] = useState('');
  const [fpClientSecret, setFpClientSecret] = useState('');
  const [showFpSecret, setShowFpSecret] = useState(false);

  // Load existing payment gateway credentials
  useEffect(() => {
    const loadSettings = async () => {
      if (!agencyId) return;
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from('agencies')
          .select('settings')
          .eq('id', agencyId)
          .single();

        if (error) throw error;

        const gateways = data?.settings?.payment_gateways;
        if (gateways) {
          // Set active gateway
          if (gateways.active_gateway) {
            setActiveGateway(gateways.active_gateway as GatewayType);
            setSelectedTab(gateways.active_gateway as GatewayType);
          }

          // Load Flutterwave
          if (gateways.flutterwave) {
            setFwPublicKey(gateways.flutterwave.public_key || '');
            setFwSecretKey(gateways.flutterwave.secret_key || '');
          }

          // Load CinetPay
          if (gateways.cinetpay) {
            setCpSiteId(gateways.cinetpay.site_id || '');
            setCpApiKey(gateways.cinetpay.api_key || '');
          }

          // Load Paydunya
          if (gateways.paydunya) {
            setPdMasterKey(gateways.paydunya.master_key || '');
            setPdPublicKey(gateways.paydunya.public_key || '');
            setPdPrivateKey(gateways.paydunya.private_key || '');
            setPdToken(gateways.paydunya.token || '');
          }

          // Load FineoPay
          if (gateways.fineopay) {
            setFpClientId(gateways.fineopay.client_id || '');
            setFpClientSecret(gateways.fineopay.client_secret || '');
          }
        }
      } catch (err) {
        console.error('Erreur chargement des passerelles de paiement:', err);
      } finally {
        setFetching(false);
      }
    };
    loadSettings();
  }, [agencyId]);

  const handleSave = async () => {
    if (!agencyId) return;
    setLoading(true);
    try {
      // Safely update agency settings via the update_agency_settings RPC
      const { error } = await supabase.rpc('update_agency_settings', {
        p_agency_id: agencyId,
        p_settings: {
          payment_gateways: {
            active_gateway: activeGateway,
            flutterwave: {
              public_key: fwPublicKey.trim(),
              secret_key: fwSecretKey.trim(),
            },
            cinetpay: {
              site_id: cpSiteId.trim(),
              api_key: cpApiKey.trim(),
            },
            paydunya: {
              master_key: pdMasterKey.trim(),
              public_key: pdPublicKey.trim(),
              private_key: pdPrivateKey.trim(),
              token: pdToken.trim(),
            },
            fineopay: {
              client_id: fpClientId.trim(),
              client_secret: fpClientSecret.trim(),
            }
          },
        },
      });

      if (error) throw error;

      toast.success('Moyens de paiement agence mis à jour avec succès !');
      await refreshAuth();
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      toast.error('Erreur lors de la sauvegarde : ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-600 text-sm font-semibold">Chargement des moyens de paiement...</p>
      </Card>
    );
  }

  const gatewayList = [
    { id: 'flutterwave', name: 'Flutterwave', desc: 'OM, Wave, MTN, Moov & Carte', color: 'orange' },
    { id: 'cinetpay', name: 'CinetPay', desc: 'Spécialiste OM, Wave, MTN CI', color: 'blue' },
    { id: 'paydunya', name: 'Paydunya', desc: 'Passerelle Mobile Money Afrique', color: 'green' },
    { id: 'fineopay', name: 'FineoPay', desc: 'Intégration Mobile Money Locale', color: 'purple' },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Header Info */}
      <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 relative">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-10 rounded-full bg-white/40" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/90">Configuration Encaissements</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Moyens de Paiement Dédiés (Côte d'Ivoire)</h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-xl">
            Permettez à vos locataires de régler leurs loyers en ligne en utilisant la passerelle Mobile Money de votre choix. Les fonds seront versés directement sur votre compte marchand d'agence.
          </p>
        </div>
      </Card>

      {/* Gateway selector grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gatewayList.map((g) => {
          const isSelected = selectedTab === g.id;
          const isActive = activeGateway === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setSelectedTab(g.id as GatewayType)}
              className={`p-4 border-2 rounded-2xl text-left transition-all duration-300 relative flex flex-col justify-between h-32 hover:scale-[1.02] ${
                isSelected 
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md dark:bg-indigo-950/20' 
                  : 'border-gray-150 bg-white hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700/60'
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider block text-slate-400">Passerelle</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-white">{g.name}</span>
                <span className="text-[10px] text-gray-500 block leading-tight">{g.desc}</span>
              </div>
              
              <div className="flex justify-between items-center w-full mt-2">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                  isActive 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' 
                    : 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {isActive ? 'Active' : 'Désactivée'}
                </span>
                
                {isActive && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* active selector trigger */}
      <Card className="p-4 bg-slate-50 border border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h4 className="text-sm font-bold">Définir comme moyen d'encaissement actif ?</h4>
          <p className="text-xs text-gray-500">La passerelle sélectionnée sera proposée aux locataires lors du checkout.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Actif :</span>
          <select
            value={activeGateway}
            onChange={(e) => {
              const val = e.target.value as GatewayType;
              setActiveGateway(val);
              setSelectedTab(val);
            }}
            className="px-4 py-2 border border-gray-300 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="flutterwave">Flutterwave</option>
            <option value="cinetpay">CinetPay</option>
            <option value="paydunya">Paydunya</option>
            <option value="fineopay">FineoPay</option>
          </select>
        </div>
      </Card>

      {/* Settings Input Cards */}
      <Card className="p-6 border-slate-100 shadow-md">
        
        {/* 1. Flutterwave panel */}
        {selectedTab === 'flutterwave' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Flutterwave Gateway</h3>
                <p className="text-xs text-gray-500">Supporte OM, Wave, MTN CI et Cartes de crédit</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-500" />
                  Clé Publique Flutterwave (Public Key)
                </label>
                <input
                  type="text"
                  placeholder="FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X"
                  value={fwPublicKey}
                  onChange={(e) => setFwPublicKey(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-pink-500" />
                  Clé Secrète Flutterwave (Secret Key)
                </label>
                <div className="relative">
                  <input
                    type={showFwSecret ? 'text' : 'password'}
                    placeholder="FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X"
                    value={fwSecretKey}
                    onChange={(e) => setFwSecretKey(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono dark:bg-slate-800 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFwSecret(!showFwSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showFwSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. CinetPay panel */}
        {selectedTab === 'cinetpay' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">CinetPay Gateway</h3>
                <p className="text-xs text-gray-500">Solution très populaire en Côte d'Ivoire pour Orange Money, Wave et MTN CI</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-blue-500" />
                  Site ID CinetPay
                </label>
                <input
                  type="text"
                  placeholder="Ex: 123456"
                  value={cpSiteId}
                  onChange={(e) => setCpSiteId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-purple-500" />
                  Clé d'API CinetPay (API Key)
                </label>
                <div className="relative">
                  <input
                    type={showCpSecret ? 'text' : 'password'}
                    placeholder="Ex: 198273645.api.cinetpay.com"
                    value={cpApiKey}
                    onChange={(e) => setCpApiKey(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono dark:bg-slate-800 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCpSecret(!showCpSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showCpSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Paydunya panel */}
        {selectedTab === 'paydunya' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Paydunya Gateway</h3>
                <p className="text-xs text-gray-500">Supporte le paiement Mobile Money (OM, Wave) dans toute la sous-région</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Clé Publique Paydunya</label>
                <input
                  type="text"
                  placeholder="paydunya_public_xxxxxx"
                  value={pdPublicKey}
                  onChange={(e) => setPdPublicKey(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Master Key Paydunya</label>
                <input
                  type="text"
                  placeholder="paydunya_master_xxxxxx"
                  value={pdMasterKey}
                  onChange={(e) => setPdMasterKey(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Token d'API de paiement Paydunya</label>
                <div className="relative">
                  <input
                    type={showPdSecret ? 'text' : 'password'}
                    placeholder="paydunya_token_xxxxxx"
                    value={pdToken}
                    onChange={(e) => setPdToken(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-mono dark:bg-slate-800 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPdSecret(!showPdSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPdSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. FineoPay panel */}
        {selectedTab === 'fineopay' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">FineoPay Gateway</h3>
                <p className="text-xs text-gray-500">Acteur local ivoirien d'interopérabilité Mobile Money et Wave</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Client ID FineoPay</label>
                <input
                  type="text"
                  placeholder="Ex: fineo_client_xxxxx"
                  value={fpClientId}
                  onChange={(e) => setFpClientId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">Client Secret FineoPay</label>
                <div className="relative">
                  <input
                    type={showFpSecret ? 'text' : 'password'}
                    placeholder="Ex: fineo_secret_xxxxx"
                    value={fpClientSecret}
                    onChange={(e) => setFpClientSecret(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-mono dark:bg-slate-800 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFpSecret(!showFpSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showFpSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guidelines / Help */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex gap-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-6">
          <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200">Comment configurer votre compte marchand agence ?</span>
            <p className="mt-1">
              Sélectionnez d'abord le logo de la passerelle que vous souhaitez paramétrer, puis remplissez ses clés d'API. Assurez-vous de définir cette passerelle comme <strong>Moyen d'encaissement actif</strong> dans le sélecteur pour qu'elle soit opérationnelle pour vos locataires. Si vous ne configurez rien, la plateforme utilisera le compte par défaut configuré par l'administrateur système.
            </p>
          </div>
        </div>
      </Card>

      {/* Security Seal */}
      <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-400">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="font-medium">
          Vos informations d'API sont cryptées de manière sécurisée et stockées confidentiellement en base de données.
        </p>
      </Card>

      {/* Actions */}
      <div className="flex justify-end items-center gap-3">
        <Button
          onClick={handleSave}
          isLoading={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Enregistrer tous les identifiants
        </Button>
      </div>
    </div>
  );
};
export default PaymentGatewaySettings;
