import React, { useState } from 'react';
import { Shield, Key, Smartphone, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const SecuritySettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      // Update password logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      alert('Mot de passe mis à jour avec succès !');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      alert('Erreur lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const toggle2FA = async () => {
    setLoading(true);
    try {
      // Toggle 2FA logic here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setTwoFactorEnabled(!twoFactorEnabled);
      alert(`Authentification à deux facteurs ${!twoFactorEnabled ? 'activée' : 'désactivée'} !`);
    } catch (error) {
      alert('Erreur lors de la configuration de l\'authentification à deux facteurs');
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
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Key className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Changer le mot de passe
            </h3>
          </div>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Mot de passe actuel"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              required
              placeholder="••••••••"
            />
            
            <div>
              <Input
                label="Nouveau mot de passe"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                placeholder="••••••••"
              />
              {passwordData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getStrengthColor(passwordStrength(passwordData.newPassword))}`}
                        style={{ width: `${(passwordStrength(passwordData.newPassword) / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {getStrengthText(passwordStrength(passwordData.newPassword))}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              required
              placeholder="••••••••"
              error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword ? 'Les mots de passe ne correspondent pas' : undefined}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Critères de sécurité</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li className="flex items-center">
                  {passwordData.newPassword.length >= 8 ? 
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" /> : 
                    <AlertTriangle className="h-4 w-4 text-gray-400 mr-2" />
                  }
                  Au moins 8 caractères
                </li>
                <li className="flex items-center">
                  {/[A-Z]/.test(passwordData.newPassword) ? 
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" /> : 
                    <AlertTriangle className="h-4 w-4 text-gray-400 mr-2" />
                  }
                  Une lettre majuscule
                </li>
                <li className="flex items-center">
                  {/[a-z]/.test(passwordData.newPassword) ? 
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" /> : 
                    <AlertTriangle className="h-4 w-4 text-gray-400 mr-2" />
                  }
                  Une lettre minuscule
                </li>
                <li className="flex items-center">
                  {/[0-9]/.test(passwordData.newPassword) ? 
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" /> : 
                    <AlertTriangle className="h-4 w-4 text-gray-400 mr-2" />
                  }
                  Un chiffre
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="ghost">
                Annuler
              </Button>
              <Button type="submit" isLoading={loading}>
                Mettre à jour le mot de passe
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Smartphone className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Authentification à deux facteurs
            </h3>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900">2FA</h4>
                <Badge variant={twoFactorEnabled ? 'success' : 'secondary'} size="sm">
                  {twoFactorEnabled ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                {twoFactorEnabled 
                  ? 'Votre compte est protégé par l\'authentification à deux facteurs'
                  : 'Sécurisez votre compte avec une authentification à deux facteurs'
                }
              </p>
            </div>
            <Button 
              variant={twoFactorEnabled ? 'danger' : 'secondary'} 
              size="sm"
              onClick={toggle2FA}
              isLoading={loading}
            >
              {twoFactorEnabled ? 'Désactiver' : 'Activer'}
            </Button>
          </div>

          {twoFactorEnabled && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">
                    Authentification à deux facteurs activée
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    Votre compte est maintenant protégé par une couche de sécurité supplémentaire.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Security Tips */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Conseils de sécurité
            </h3>
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p>Utilisez un mot de passe unique et complexe pour votre compte</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p>Activez l'authentification à deux facteurs pour une sécurité renforcée</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p>Ne partagez jamais vos identifiants avec d'autres personnes</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <p>Déconnectez-vous toujours après utilisation sur un ordinateur partagé</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};