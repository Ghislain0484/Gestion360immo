import React, { useState, useCallback } from 'react';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <BibleVerseCard compact={true} />

        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Gestion360Immo
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Connectez-vous à votre espace de gestion immobilière
          </p>
        </div>

        <Card>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value.trim())}
              required
              placeholder="votre@email.com"
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value.trim())}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center top-6"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <a href="/password-reset" className="font-medium text-blue-600 hover:text-blue-500">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              isLoading={isLoading}
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Pas encore de compte ?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShowRegistration(true)}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Demander l'accès à votre agence
              </button>
            </div>
          </div>
        </Card>

        <AgencyRegistration
          isOpen={showRegistration}
          onClose={() => setShowRegistration(false)}
          onSubmit={handleAgencyRegistration}
        />
        <Toaster position="bottom-right" />
      </div>
    </div>
  );
};