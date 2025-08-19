// src/components/auth/AgencyRegistration.tsx
import React, { useState } from 'react';
import { Building2, Upload, Shield, Users, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { AgencyFormData, UserFormData } from '../../types/agency';
import { dbService } from '../../lib/supabase';
import { supabase } from '@/lib/supabase'; // 👈 client supabase (anon) côté front

interface AgencyRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (agency: AgencyFormData, director: UserFormData) => void;
}

export const AgencyRegistration: React.FC<AgencyRegistrationProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [agencyData, setAgencyData] = useState<AgencyFormData>({
    name: '',
    commercialRegister: '',
    logo: '',
    isAccredited: false,
    accreditationNumber: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    directorId: '',
  });

  const [directorData, setDirectorData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'director',
    agencyId: '',
    permissions: {
      dashboard: true,
      properties: true,
      owners: true,
      tenants: true,
      contracts: true,
      collaboration: true,
      reports: true,
      notifications: true,
      settings: true,
      userManagement: true,
    },
    isActive: true,
    password: '',
  });

  const updateAgencyData = (updates: Partial<AgencyFormData>) => {
    setAgencyData((prev) => ({ ...prev, ...updates }));
  };

  const updateDirectorData = (updates: Partial<UserFormData>) => {
    setDirectorData((prev) => ({ ...prev, ...updates }));
  };

  const handleLogoUpload = (file: File) => {
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    updateAgencyData({ logo: url });
  };

  async function uploadLogoIfAny(): Promise<string | null> {
    if (!logoFile) return null;
    const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `logos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('agency_logos') // 👉 crée ce bucket public si pas encore fait
      .upload(filePath, logoFile, {
        contentType: logoFile.type || 'image/png',
        upsert: false,
      });

    if (upErr) {
      console.warn('⚠️ Upload logo échoué:', upErr.message);
      return null;
    }

    const { data: pub } = supabase.storage.from('agency_logos').getPublicUrl(filePath);
    return pub?.publicUrl || null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      // --- 1) Validations de base ---
      if (!agencyData.name.trim() || !agencyData.commercialRegister.trim()) {
        throw new Error("Veuillez remplir le nom de l'agence et le registre de commerce.");
      }
      if (
        !directorData.firstName.trim() ||
        !directorData.lastName.trim() ||
        !directorData.email.trim()
      ) {
        throw new Error('Veuillez remplir les informations du directeur.');
      }
      if (!directorData.password || directorData.password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
      }
      if (!agencyData.phone.trim() || !agencyData.city.trim() || !agencyData.address.trim()) {
        throw new Error("Veuillez remplir le téléphone, la ville et l'adresse.");
      }

      // --- 2) Upload logo (facultatif) ---
      const logoPublicUrl = await uploadLogoIfAny();

      // --- 3) Créer le compte AUTH du directeur (email + password) ---
      const { data: signup, error: signupErr } = await supabase.auth.signUp({
        email: directorData.email,
        password: directorData.password,
        options: {
          emailRedirectTo:
            (window?.location?.origin || 'https://www.gestion360immo.com') + '/login',
          data: {
            first_name: directorData.firstName,
            last_name: directorData.lastName,
            role: 'director',
          },
        },
      });
      if (signupErr) throw signupErr;
      const directorAuthId = signup.user?.id;
      if (!directorAuthId) throw new Error("Création du compte directeur échouée.");

      // --- 4) Construire la demande pour la table agency_registration_requests ---
      // ❗️NE JAMAIS ENREGISTRER LE MOT DE PASSE EN BASE
      const requestData = {
        agency_name: agencyData.name,
        commercial_register: agencyData.commercialRegister,
        phone: agencyData.phone,
        city: agencyData.city,
        address: agencyData.address,
        email: agencyData.email || directorData.email,
        logo_url: logoPublicUrl,
        has_license: agencyData.isAccredited ?? false,
        license_number: agencyData.accreditationNumber || null,

        director_first_name: directorData.firstName,
        director_last_name: directorData.lastName,
        director_email: directorData.email,
        director_auth_user_id: directorAuthId,

        status: 'pending',
        created_at: new Date().toISOString(),
      } as const;

      // --- 5) Sauvegarde localStorage (fallback UX) ---
      const localRequest = { id: `local_${Date.now()}`, ...requestData };
      const stored = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      stored.unshift(localRequest);
      localStorage.setItem('demo_registration_requests', JSON.stringify(stored));

      // --- 6) Enregistrer en base (table agency_registration_requests) ---
      // Si tu préfères utiliser un service centralisé, garde dbService.createRegistrationRequest,
      // mais il ne doit PAS envoyer le mot de passe.
      const { error: insErr } = await supabase
        .from('agency_registration_requests')
        .insert(requestData);
      if (insErr) {
        console.warn('⚠️ Erreur Supabase lors de la création de la demande:', insErr.message);
        // On laisse néanmoins la demande dans le localStorage
      }

      // --- 7) Callback + UI ---
      onSubmit?.(agencyData, directorData);
      alert(
        `✅ DEMANDE ENVOYÉE !
        
🏢 Agence : ${agencyData.name}
👤 Directeur : ${directorData.firstName} ${directorData.lastName}
📧 Email : ${directorData.email}
📱 Téléphone : ${agencyData.phone}
🏙️ Ville : ${agencyData.city}

Votre compte a été créé. Vous pourrez vous connecter avec l'email et le mot de passe saisis
dès l'approbation par l'administrateur. Un email de vérification peut vous être envoyé.`
      );
      onClose();
    } catch (err: any) {
      console.error("Erreur lors de l'enregistrement:", err);
      alert(`❌ ${err?.message || 'Erreur inconnue'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: "Informations de l'agence", icon: Building2 },
    { id: 2, title: 'Compte directeur', icon: Users },
    { id: 3, title: 'Vérification', icon: Shield },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Inscription de l'agence">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center mb-4">
                <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Informations de l'agence</h3>
              </div>

              <div className="space-y-4">
                <Input
                  label="Nom de l'agence"
                  value={agencyData.name}
                  onChange={(e) => updateAgencyData({ name: e.target.value })}
                  required
                  placeholder="Ex: Immobilier Excellence"
                />

                <Input
                  label="Registre de commerce"
                  value={agencyData.commercialRegister}
                  onChange={(e) => updateAgencyData({ commercialRegister: e.target.value })}
                  required
                  placeholder="Ex: CI-ABJ-2024-B-12345"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Téléphone"
                    type="tel"
                    value={agencyData.phone}
                    onChange={(e) => updateAgencyData({ phone: e.target.value })}
                    required
                    placeholder="+225 XX XX XX XX XX"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={agencyData.email}
                    onChange={(e) => updateAgencyData({ email: e.target.value })}
                    required
                    placeholder="contact@agence.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Adresse"
                    value={agencyData.address}
                    onChange={(e) => updateAgencyData({ address: e.target.value })}
                    required
                    placeholder="Adresse complète"
                  />
                  <Input
                    label="Ville"
                    value={agencyData.city}
                    onChange={(e) => updateAgencyData({ city: e.target.value })}
                    required
                    placeholder="Abidjan"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Agrément</h3>
              </div>

              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={agencyData.isAccredited}
                    onChange={(e) => updateAgencyData({ isAccredited: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    L'agence possède un agrément officiel
                  </span>
                </label>

                {agencyData.isAccredited && (
                  <Input
                    label="Numéro d'agrément"
                    value={agencyData.accreditationNumber || ''}
                    onChange={(e) => updateAgencyData({ accreditationNumber: e.target.value })}
                    required={agencyData.isAccredited}
                    placeholder="Ex: AGR-2024-001"
                  />
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center mb-4">
                <Upload className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Logo de l'agence</h3>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {agencyData.logo ? (
                  <div className="space-y-4">
                    <img
                      src={agencyData.logo}
                      alt="Logo de l'agence"
                      className="w-24 h-24 object-contain mx-auto"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      Changer le logo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        Télécharger un logo
                      </Button>
                      <p className="text-sm text-gray-500 mt-2">
                        PNG, JPG ou SVG. Taille recommandée: 200x200px
                      </p>
                    </div>
                  </div>
                )}
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center mb-4">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Compte du directeur</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    value={directorData.firstName}
                    onChange={(e) => updateDirectorData({ firstName: e.target.value })}
                    required
                    placeholder="Prénom du directeur"
                  />
                  <Input
                    label="Nom"
                    value={directorData.lastName}
                    onChange={(e) => updateDirectorData({ lastName: e.target.value })}
                    required
                    placeholder="Nom du directeur"
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  value={directorData.email}
                  onChange={(e) => updateDirectorData({ email: e.target.value })}
                  required
                  placeholder="directeur@agence.com"
                />

                <Input
                  label="Mot de passe"
                  type="password"
                  value={directorData.password}
                  onChange={(e) => updateDirectorData({ password: e.target.value })}
                  required
                  placeholder="••••••••"
                  helperText="Minimum 8 caractères avec majuscules, minuscules et chiffres"
                />
              </div>
            </Card>

            <Card className="bg-blue-50">
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Permissions du directeur</h3>
              </div>

              <div className="text-sm text-blue-800">
                <p className="mb-2">
                  <strong>En tant que directeur, vous aurez accès à :</strong>
                </p>
                <ul className="space-y-1 ml-4">
                  <li>• Tous les modules de la plateforme</li>
                  <li>• Gestion des utilisateurs et permissions</li>
                  <li>• Rapports et statistiques complètes</li>
                  <li>• Configuration de l'agence</li>
                  <li>• Collaboration inter-agences</li>
                </ul>
              </div>
            </Card>
          </div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Vérification des informations</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Agence</p>
                    <p className="text-gray-600">{agencyData.name}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Registre de commerce</p>
                    <p className="text-gray-600">{agencyData.commercialRegister}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Directeur</p>
                    <p className="text-gray-600">
                      {directorData.firstName} {directorData.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-600">{directorData.email}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Téléphone</p>
                    <p className="text-gray-600">{agencyData.phone}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Ville</p>
                    <p className="text-gray-600">{agencyData.city}</p>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <Shield className="h-5 w-5 text-green-400 mt-0.5" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">Inscription sécurisée</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Vos données sont chiffrées et protégées selon les standards de sécurité.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Précédent
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>

            {currentStep < 3 ? (
              <Button type="button" onClick={() => setCurrentStep(currentStep + 1)}>
                Suivant
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Création…' : "Créer l'agence"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
