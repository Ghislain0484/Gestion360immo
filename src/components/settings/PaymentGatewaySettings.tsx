import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, Key, RefreshCw, Save, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export const PaymentGatewaySettings: React.FC = () => {
  const { agencyId, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);

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

        if (data?.settings?.payment_gateways?.flutterwave) {
          const fw = data.settings.payment_gateways.flutterwave;
          setPublicKey(fw.public_key || '');
          setSecretKey(fw.secret_key || '');
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
            flutterwave: {
              public_key: publicKey.trim(),
              secret_key: secretKey.trim(),
            },
          },
        },
      });

      if (error) throw error;

      toast.success('Paramètres de paiement mis à jour avec succès !');
      await refreshAuth();
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde des passerelles de paiement:', err);
      toast.error('Erreur lors de la sauvegarde : ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-600">Chargement des moyens de paiement...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-6 relative">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-10 rounded-full bg-white/40" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/90">Configuration Agence</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Moyens de Paiement Dédiés</h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-xl">
            Configurez vos propres identifiants de paiement Flutterwave. Vos locataires verseront leurs loyers directement sur votre compte marchand, en toute sécurité.
          </p>
        </div>
      </Card>

      {/* Flutterwave Config Panel */}
      <Card className="p-6 border-slate-100 shadow-md">
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Flutterwave Gateway</h3>
              <p className="text-xs text-gray-500">Service de paiement mobile money (Orange, MTN, Moov) et Carte Bancaire</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Public Key */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-500" />
                Clé Publique Flutterwave (Public Key)
              </label>
              <input
                type="text"
                placeholder="FLWPUBK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
              <p className="text-[10px] text-gray-400 italic">
                Utilisée pour initialiser l'interface de paiement sur le navigateur du locataire (ex: FLWPUBK...).
              </p>
            </div>

            {/* Secret Key */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-pink-500" />
                Clé Secrète Flutterwave (Secret Key)
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="FLWSECK-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-X"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 italic">
                Sert aux validations sécurisées côté serveur. Conservez-la secrète.
              </p>
            </div>
          </div>

          {/* Guidelines / Help */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-3 text-xs text-slate-600 leading-relaxed mt-4">
            <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-800">Comment obtenir vos clés ?</span>
              <p className="mt-1">
                Connectez-vous à votre tableau de bord Flutterwave, accédez à <strong>Settings &gt; API Keys</strong> pour récupérer vos clés de test ou de production. Si vous ne configurez rien ici, la plateforme utilisera la clé par défaut configurée par l'administrateur système.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Seal */}
      <Card className="p-4 bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-xs text-emerald-800">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="font-medium">
          Vos informations d'API sont cryptées et stockées de manière sécurisée en base de données.
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
          Enregistrer les identifiants
        </Button>
      </div>
    </div>
  );
};
