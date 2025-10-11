import React, { useState, useCallback } from 'react';
import { Building2, Eye, EyeOff, ShieldCheck, PieChart, Sparkles, Headphones } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AgencyRegistration } from './AgencyRegistration';
import { dbService } from '../../lib/supabase';
import { BibleVerseCard } from '../ui/BibleVerse';
import { Toaster, toast } from 'react-hot-toast';
import { AuditLog, AgencyFormData, UserFormData } from '../../types/db';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);

  const { login } = useAuth();

  const highlights = [
    {
      title: 'Pilotage unifié',
      description: 'Centralisez propriétaire, locataire et patrimoine avec une vue synthétique.',
      icon: PieChart,
    },
    {
      title: 'Sécurité Supabase',
      description: 'Connexion chiffrée, journaux d’audit et gestion fine des autorisations.',
      icon: ShieldCheck,
    },
    {
      title: 'Automatisation avancée',
      description: 'Générez contrats, quittances et rapports en quelques clics.',
      icon: Sparkles,
    },
    {
      title: 'Support expert',
      description: 'Accompagnement dédié et ressources premium pour vos équipes.',
      icon: Headphones,
    },
  ];

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '0.0.0.0';
    } catch {
      return '0.0.0.0';
    }
  };

  const logAudit = useCallback(async (action: string, userId: string | null, details: any) => {
    try {
      const ip_address = await getClientIP();
      const auditLog: Partial<AuditLog> = {
        user_id: userId,
        action,
        table_name: 'users',
        record_id: userId,
        old_values: null,
        new_values: details,
        ip_address,
        user_agent: navigator.userAgent,
      };
      await dbService.auditLogs.insert(auditLog);
    } catch (err) {
      console.error('Erreur lors de l’enregistrement de l’audit:', err);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Format d’email invalide');
      }

      await login(email, password);
      await logAudit('user_login_success', null, {
        email,
        timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
      });
      toast.success('Connexion réussie ! Bienvenue.');
    } catch (err: any) {
      const errorMessage = err.message.includes('Invalid login credentials')
        ? 'Email ou mot de passe incorrect'
        : err.message.includes('Compte non activé')
        ? 'Compte non activé. Contactez votre administrateur.'
        : err.message || 'Erreur lors de la connexion';
      setError(errorMessage);
      await logAudit('user_login_failure', null, {
        email,
        error: errorMessage,
        timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgencyRegistration = async (agencyData: AgencyFormData, directorData: UserFormData, registrationId: string) => {
    setIsLoading(true);
    try {
      await logAudit('registration_request_submitted', null, {
        agency_name: agencyData.name,
        director_email: directorData.email,
        registration_id: registrationId,
        timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
      });
      toast.success(
        `✅ Demande d'inscription envoyée à ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}!\n\n` +
        `🏢 Agence : ${agencyData.name}\n` +
        `👤 Directeur : ${directorData.first_name} ${directorData.last_name}\n` +
        `📧 Email : ${directorData.email}\n` +
        `📱 Téléphone : ${agencyData.phone}\n` +
        `🏙️ Ville : ${agencyData.city}\n\n` +
        `🆔 ID : ${registrationId}\n` +
        `⏱️ Validation sous 24–48h\n` +
        `📧 Vous recevrez vos identifiants par email`
      );
      setShowRegistration(false);
    } catch (err: any) {
      console.error('Erreur inscription agence:', err);
      const errorMessage = err.message.includes('duplicate key')
        ? 'Cette agence ou cet email est déjà enregistré'
        : err.message || 'Erreur lors de l’inscription';
      await logAudit('registration_request_failed', null, {
        agency_name: agencyData.name,
        director_email: directorData.email,
        error: errorMessage,
        timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />
      <div className="absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full bg-blue-600/20 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-[-25%] right-[-15%] h-[32rem] w-[32rem] rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center">
        <div className="w-full space-y-8 text-white lg:w-7/12">
          <Badge variant="info" className="bg-white/10 text-white shadow shadow-blue-500/30">
            Votre espace professionnel
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Gestion360Immo</h1>
          <p className="max-w-xl text-lg text-slate-200/90">
            La plateforme pensée pour les agences immobilières africaines : supervision des biens, automatisation documentaire et reporting instantané.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20"
              >
                <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="relative space-y-1">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-slate-200/80">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="max-w-md">
            <BibleVerseCard compact showRefresh className="border-none bg-white/10 text-white backdrop-blur" />
          </div>
        </div>

        <div className="w-full lg:w-5/12">
          <Card className="border-none bg-white/95 shadow-2xl shadow-slate-900/25 backdrop-blur">
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Connexion agence</h2>
                  <p className="text-sm text-slate-500">
                    Accédez à votre console et poursuivez vos opérations en toute confiance.
                  </p>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-rose-700">
                    <div className="flex-1 text-sm">{error}</div>
                  </div>
                )}

                <Input
                  label="Email professionnel"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value.trim())}
                  required
                  placeholder="contact@agence.ci"
                  autoComplete="email"
                  className="rounded-xl border-slate-200 bg-white/80"
                />

                <div className="space-y-1">
                  <Input
                    label="Mot de passe"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value.trim())}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="rounded-xl border-slate-200 bg-white/80 pr-12"
                  />
                  <button
                    type="button"
                    className="absolute -mt-11 right-3 text-slate-400 transition-colors hover:text-slate-600"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <label className="inline-flex items-center gap-2">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Se souvenir de moi</span>
                  </label>
                  <a href="/password-reset" className="font-medium text-blue-600 hover:text-blue-500">
                    Mot de passe oublié ?
                  </a>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700"
                >
                  Se connecter
                </Button>
              </form>

              <div className="space-y-4 rounded-2xl bg-slate-50 px-5 py-4 text-center">
                <p className="text-sm text-slate-600">Pas encore d’accès à la plateforme ?</p>
                <Button variant="ghost" className="text-blue-600 hover:text-blue-500" onClick={() => setShowRegistration(true)}>
                  Demander l’activation de mon agence
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <AgencyRegistration
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onSubmit={handleAgencyRegistration}
      />
      <Toaster position="bottom-right" />
    </div>
  );
};
