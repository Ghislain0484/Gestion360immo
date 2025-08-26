// src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { AgencyRegistration } from './AgencyRegistration';
import { BibleVerseCard } from '../ui/BibleVerse';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');       // ⬅️ PAS DE trim()
  const [password, setPassword] = useState(''); // ⬅️ PAS DE trim()
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);

  // On supporte les deux noms pour éviter “x is not a function”
  const { signIn, login } = useAuth() as any;
  const doSignIn = signIn ?? login;
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (typeof doSignIn !== 'function') {
        throw new Error('Fonction de connexion manquante dans AuthContext');
      }

      // ⬇️ on envoie tel quel, sans trim
      const emailToUse = email;
      const passwordToUse = password;

      console.log('🔐 Tentative login...', { email: emailToUse });
      await doSignIn(emailToUse, passwordToUse);

      console.log('✅ Login OK, redirection…');
      navigate('/'); // adapte si besoin
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.error_description ||
        err?.error ||
        'Email ou mot de passe incorrect';
      console.error('❌ Login error:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <BibleVerseCard compact />

        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Gestion360Immo</h2>
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
              onChange={(e) => setEmail(e.target.value)} // ⬅️ PAS DE trim()
              required
              placeholder="votre@email.com"
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)} // ⬅️ PAS DE trim()
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

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Se connecter
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Pas encore de compte ?</span>
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
          onSubmit={() => {
            /* la modale gère déjà son submit + fallback si RLS bloque */
          }}
        />
      </div>
    </div>
  );
};
