// src/components/auth/PasswordResetConfirm.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { supabase, dbService } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Toaster, toast } from 'react-hot-toast';
import { getClientIP } from '../../utils/getUserIp';

export const PasswordResetConfirm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.hash.substring(1));
    const accessToken = params.get('access_token');
    if (!accessToken) {
      setError('Lien de réinitialisation invalide');
      console.error('No access_token in URL');
    } else {
      console.log('Access token received:', accessToken);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }
      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      const params = new URLSearchParams(location.hash.substring(1));
      const accessToken = params.get('access_token');
      if (!accessToken) {
        throw new Error('Lien de réinitialisation invalide');
      }

      console.log('Updating password for user');
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('Password update error:', error);
        throw new Error(`Erreur updateUser: ${error.message}`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      const ip_address = await getClientIP();
      console.log('Logging audit for password reset');
      await dbService.auditLogs.insert({
        user_id: user?.id || null,
        action: 'password_reset_completed',
        table_name: 'users',
        record_id: user?.id || null,
        new_values: {
          timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
        },
        ip_address,
        user_agent: navigator.userAgent,
      });

      toast.success('Mot de passe réinitialisé avec succès ! Connectez-vous avec votre nouveau mot de passe.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      console.error('Password reset confirm error:', err.message, err.stack);
      const errorMessage = err.message || 'Erreur lors de la réinitialisation du mot de passe';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Choisir un nouveau mot de passe
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Entrez votre nouveau mot de passe pour votre compte
          </p>
        </div>

        <Card>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="relative">
              <Input
                label="Nouveau mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value.trim())}
                required
                placeholder="••••••••"
                autoComplete="new-password"
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

            <Input
              label="Confirmer le mot de passe"
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value.trim())}
              required
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              isLoading={isLoading}
            >
              Réinitialiser le mot de passe
            </Button>

            <div className="text-center">
              <a
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Retour à la connexion
              </a>
            </div>
          </form>
        </Card>
        <Toaster position="bottom-right" />
      </div>
    </div>
  );
};