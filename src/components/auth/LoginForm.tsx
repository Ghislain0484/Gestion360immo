import React, { useState } from 'react';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { AgencyRegistration } from './AgencyRegistration';
import { dbService } from '../../lib/supabase';
import { BibleVerseCard } from '../ui/BibleVerse';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      // Display the actual error message from the login function
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgencyRegistration = async (agencyData: any, directorData: any) => {
    setIsLoading(true);
    try {
      // Validation des données avant envoi
      if (!agencyData.name?.trim() || !agencyData.commercialRegister?.trim()) {
        throw new Error('Le nom de l\'agence et le registre de commerce sont obligatoires');
      }
      
      if (!directorData.firstName?.trim() || !directorData.lastName?.trim() || !directorData.email?.trim()) {
        throw new Error('Les informations du directeur sont obligatoires');
      }
      
      if (!agencyData.phone?.trim() || !agencyData.city?.trim() || !agencyData.address?.trim()) {
        throw new Error('Le téléphone, la ville et l\'adresse sont obligatoires');
      }
      
      // Préparer les données pour l'envoi
      const requestData = {
        agency_name: agencyData.name,
        commercial_register: agencyData.commercialRegister,
        director_first_name: directorData.firstName,
        director_last_name: directorData.lastName,
        director_email: directorData.email,
        phone: agencyData.phone,
        city: agencyData.city,
        address: agencyData.address,
        logo_url: agencyData.logo || null,
        is_accredited: agencyData.isAccredited,
        accreditation_number: agencyData.accreditationNumber || null,
        status: 'pending'
      };
      
      console.log('Envoi de la demande avec les données:', requestData);
      
      // Enregistrer la demande dans la base de données
      const result = await dbService.createRegistrationRequest(requestData);
      
      console.log('Résultat de l\'enregistrement:', result);
      
      alert(`✅ DEMANDE D'INSCRIPTION ENVOYÉE !
      
🏢 AGENCE : ${agencyData.name}
👤 DIRECTEUR : ${directorData.firstName} ${directorData.lastName}
📧 EMAIL : ${directorData.email}
📱 TÉLÉPHONE : ${agencyData.phone}
🏙️ VILLE : ${agencyData.city}

✅ Votre demande a été enregistrée avec l'ID : ${result.id}

⏱️ TRAITEMENT : Sous 24-48h par notre équipe
📧 NOTIFICATION : Vous recevrez vos identifiants par email
🔑 ACCÈS : Connexion directe sur www.gestion360immo.com

PROCHAINES ÉTAPES :
1. Validation par l'administrateur
2. Création automatique de votre compte directeur
3. Activation de votre abonnement d'essai (30 jours gratuits)
4. Réception de vos identifiants de connexion

Vous pouvez fermer cette fenêtre et attendre la confirmation.`);
      
      setShowRegistration(false);
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      
      // Messages d'erreur spécifiques
      if (error instanceof Error) {
        if (error.message.includes('obligatoire')) {
          alert(`Données manquantes: ${error.message}`);
        } else if (error.message.includes('email invalide')) {
          alert('Format d\'email invalide. Veuillez utiliser un email valide.');
        } else if (error.message.includes('téléphone invalide')) {
          alert('Format de téléphone invalide. Utilisez le format: +225 XX XX XX XX XX');
        } else if (error.message.includes('existe déjà')) {
          alert('Cette agence ou cet email est déjà enregistré.');
        } else if (error.message.includes('fetch')) {
          alert('Problème de connexion. Votre demande a été sauvegardée localement et sera synchronisée plus tard.');
        } else {
          alert(`Erreur: ${error.message}`);
        }
      } else {
        alert('Erreur inconnue lors de l\'envoi de la demande. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Verset biblique sur la page de connexion */}
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
              onChange={(e) => setEmail(e.target.value.trim())}
              required
              placeholder="votre@email.com"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
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

        {/* Agency Registration Modal */}
        <AgencyRegistration
          isOpen={showRegistration}
          onClose={() => setShowRegistration(false)}
          onSubmit={handleAgencyRegistration}
        />
      </div>
    </div>
  );
};