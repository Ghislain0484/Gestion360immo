import React, { useState } from 'react';
import { Shield, Key, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const OwnerSecurity: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const { updatePasswordWithSession } = useAuth();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      await updatePasswordWithSession(passwordData.newPassword);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Erreur handlePasswordChange:', error);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return 'bg-red-500';
    if (strength < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 2) return 'Faible';
    if (strength < 4) return 'Moyen';
    return 'Fort';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sécurité</h2>
        <p className="text-slate-500 font-medium">Gérez votre mot de passe et protégez votre compte.</p>
      </div>

      <Card className="overflow-hidden border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <Key className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Changer le mot de passe
              </h3>
              <p className="text-sm text-slate-500 font-medium italic">
                Définissez un nouveau mot de passe pour vos prochaines connexions.
              </p>
            </div>
          </div>
          
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value.trim() }))}
                  required
                  placeholder="••••••••"
                  className="rounded-2xl border-slate-200 h-12"
                />
                
                {passwordData.newPassword && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Force du mot de passe</span>
                      <span className="text-xs font-black text-slate-900">
                        {getStrengthText(passwordStrength(passwordData.newPassword))}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getStrengthColor(passwordStrength(passwordData.newPassword))}`}
                        style={{ width: `${(passwordStrength(passwordData.newPassword) / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <Input
                  label="Confirmer le nouveau mot de passe"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value.trim() }))}
                  required
                  placeholder="••••••••"
                  className="rounded-2xl border-slate-200 h-12"
                  error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword ? 'Les mots de passe ne correspondent pas' : undefined}
                />
              </div>

              <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6">
                <div className="flex items-center gap-2 mb-4 text-slate-900">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <h4 className="font-black text-xs uppercase tracking-widest">Conseils de sécurité</h4>
                </div>
                <ul className="space-y-4">
                  {[
                    { test: passwordData.newPassword.length >= 8, label: 'Au moins 8 caractères' },
                    { test: /[A-Z]/.test(passwordData.newPassword), label: 'Une lettre majuscule' },
                    { test: /[a-z]/.test(passwordData.newPassword), label: 'Une lettre minuscule' },
                    { test: /[0-9]/.test(passwordData.newPassword), label: 'Au moins un chiffre' },
                  ].map((req, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-bold">
                      {req.test ? (
                        <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-3 w-3 text-slate-400" />
                        </div>
                      )}
                      <span className={req.test ? "text-slate-900" : "text-slate-400"}>{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t border-slate-100">
              <Button 
                type="submit" 
                isLoading={loading}
                className="bg-slate-900 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all duration-300"
              >
                Mettre à jour mon mot de passe
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};
