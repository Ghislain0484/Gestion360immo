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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="pointer-events-none absolute right-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-indigo-200/20 blur-[120px] dark:bg-indigo-500/10" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-purple-200/20 blur-[120px] dark:bg-purple-500/10" />

      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-600/30 rounded-2xl transition-transform duration-500 hover:scale-105">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Gestion360Immo
          </h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Console Administrateur
          </p>
        </div>

        <Card className="border border-slate-200/60 dark:border-slate-800 shadow-2xl shadow-indigo-950/5 dark:shadow-black/40 p-8 rounded-[32px] bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl transition-all duration-300">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 animate-shake">
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>
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
              className="rounded-2xl"
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
                className="rounded-2xl"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center top-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 rounded transition-colors"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-slate-600 dark:text-slate-400">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <a href="/password-reset" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all duration-300 border-none"
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
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-full font-medium">
                  Accès agences
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center justify-center gap-2 transition-colors">
                <Building2 className="h-4 w-4" />
                Connexion Agences
              </a>
            </div>
          </div>
        </Card>
        <Toaster position="bottom-right" />
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 2;
        }
      `}</style>
    </div>
  );
};