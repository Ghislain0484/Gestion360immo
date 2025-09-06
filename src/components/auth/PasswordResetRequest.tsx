// src/components/auth/PasswordResetRequest.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { supabase, dbService } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Toaster, toast } from 'react-hot-toast';
import { getClientIP } from '../../utils/getUserIp';

export const PasswordResetRequest: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Format d’email invalide');
      }

      console.log('Sending password reset for email:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        throw new Error(`Erreur resetPasswordForEmail: ${error.message}`);
      }

      const ip_address = await getClientIP();
      console.log('Logging audit for password reset request');
      await dbService.auditLogs.insert({
        user_id: null,
        action: 'password_reset_requested',
        table_name: 'users',
        record_id: null,
        new_values: {
          email,
          timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
        },
        ip_address,
        user_agent: navigator.userAgent,
      });

      toast.success('Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      console.error('Password reset request error:', err.message, err.stack);
      const errorMessage = err.message || 'Erreur lors de la demande de réinitialisation';
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
            Réinitialiser votre mot de passe
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Entrez votre email pour recevoir un lien de réinitialisation
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

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              isLoading={isLoading}
            >
              Envoyer le lien de réinitialisation
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