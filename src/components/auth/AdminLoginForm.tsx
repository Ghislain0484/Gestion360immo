import React, { useState, useCallback } from 'react';
import { Shield, Eye, EyeOff, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { dbService } from '../../lib/supabase';
import { AuditLog } from '../../types/db';
import { Toaster, toast } from 'react-hot-toast';

export const AdminLoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginAdmin, admin } = useAuth();

  const logAudit = useCallback(
    async (action: string, userId: string | null, details: any) => {
      try {
        const auditLog: Partial<AuditLog> = {
          user_id: userId,
          action,
          table_name: 'platform_admins', // Corrected to match table
          record_id: userId,
          old_values: null,
          new_values: details,
          ip_address: null, // Use null for invalid IP
          user_agent: navigator.userAgent || null,
        };
        await dbService.auditLogs.insert(auditLog);
      } catch (err: any) {
        console.error('Erreur lors de l’enregistrement de l’audit:', {
          message: err.message,
          code: err.code,
          details: err.details,
        });
      }
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Format d’email invalide');
      }
      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      await loginAdmin(email, password);
      await logAudit('admin_login_success', admin?.user_id || null, {
        email,
        timestamp: new Date().toISOString(),
      });
      toast.success('Connexion réussie ! Bienvenue, administrateur.');
    } catch (err: any) {
      const errorMessage = err.message.includes('Identifiants invalides')
        ? 'Email ou mot de passe incorrect'
        : err.message || 'Erreur lors de la connexion';
      setError(errorMessage);
      // Log failed attempts only for specific cases, avoid sensitive data
      await logAudit('admin_login_failure', null, {
        email,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-red-600 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Gestion360Immo Admin
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Accès réservé aux administrateurs système
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
              label="Email administrateur"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@immoplatform.ci"
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value.trim())}
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
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <a href="/password-reset" className="font-medium text-red-600 hover:text-red-500">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
              isLoading={isLoading}
            >
              <Shield className="h-4 w-4 mr-2" />
              Accéder au Dashboard Admin
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Accès agences
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-500 flex items-center justify-center">
                <Building2 className="h-4 w-4 mr-2" />
                Connexion Agences
              </a>
            </div>
          </div>
        </Card>
        <Toaster position="bottom-right" />
      </div>
    </div>
  );
};