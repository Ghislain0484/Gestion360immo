import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, ArrowLeft, Loader2, Building2, ShieldCheck, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/config';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Badge } from '../ui/Badge';

export const OwnerSignup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      toast.success('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
      navigate('/connexion?tab=owner');
    } catch (err: any) {
      console.error('Error during signup:', err);
      if (err.message?.includes('already registered')) {
        setError('Cet email est déjà utilisé. Veuillez vous connecter.');
      } else {
        setError(err.message || 'Une erreur est survenue lors de la création du compte.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto relative z-10">
          <Link to="/connexion" className="inline-flex items-center text-slate-500 hover:text-slate-900 transition-colors mb-8 group font-medium">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Retour à la connexion
          </Link>

          <div className="mb-10">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-slate-900/20">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Activer mon espace</h1>
            <p className="text-slate-500 mt-3 text-lg">
              Créez vos identifiants à l'aide de l'adresse email communiquée à votre agence de gestion.
            </p>
          </div>

          {error && (
            <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-rose-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Adresse Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Créer un mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700">Confirmer le mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-4 rounded-xl transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Activation en cours...</span>
                </>
              ) : (
                'Activer mon compte propriétaire'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium tracking-tight">
            Plateforme sécurisée propulsée par Gestion360Immo
          </p>
        </div>
      </div>

      {/* Right Column - Image & Context */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden isolate">
        <img 
          src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=2074" 
          alt="Propriétaire immobilier serein" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-multiply z-10"></div>
        
        <div className="relative z-20 flex flex-col justify-end p-16 xl:p-24 h-full text-white w-full">
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
            <Badge className="bg-white/10 text-white border-white/20 px-3 py-1.5 text-sm backdrop-blur-md mb-6 font-semibold inline-flex shadow-xl shadow-black/20">
              Espace Partenaire
            </Badge>
            <h2 className="text-5xl font-black mb-6 leading-[1.1] tracking-tight text-white drop-shadow-md">
              Gérez votre patrimoine l'esprit tranquille.
            </h2>
            <p className="text-xl text-slate-200 leading-relaxed max-w-lg mb-10 drop-shadow">
              Suivez en temps réel la gestion de vos biens, vos encaissements, et l'entretien de votre investissement depuis notre portail 100% transparent.
            </p>
            
            <div className="grid grid-cols-2 gap-6 mt-8 border-t border-white/20 pt-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center shrink-0 backdrop-blur-sm shadow-inner shadow-white/10">
                  <TrendingUp className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Rentabilité Suivie</h4>
                  <p className="text-sm text-slate-300">Vos loyers encaissés et disponibles en un clin d'œil.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600/30 flex items-center justify-center shrink-0 backdrop-blur-sm shadow-inner shadow-white/10">
                  <ShieldCheck className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">Gérance Sécurisée</h4>
                  <p className="text-sm text-slate-300">Mise en relation avec vos professionnels certifiés.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
