import React, { useState } from 'react';
import { Building2, Upload, Shield, Users, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { AgencyFormData, UserFormData } from '../../types/agency';
import { dbService } from '../../lib/supabase';

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
    setAgencyData(prev => ({ ...prev, ...updates }));
  };
  const updateDirectorData = (updates: Partial<UserFormData>) => {
    setDirectorData(prev => ({ ...prev, ...updates }));
  };

  const handleLogoUpload = (file: File) => {
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    updateAgencyData({ logo: url });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations basiques
    if (!agencyData.name.trim() || !agencyData.commercialRegister.trim()) {
      alert('Le nom de l’agence et le registre de commerce sont obligatoires');
      return;
    }
    if (!directorData.firstName.trim() || !directorData.lastName.trim() || !directorData.email.trim()) {
      alert('Les informations du directeur sont obligatoires');
      return;
    }
    if (!agencyData.phone.trim() || !agencyData.city.trim() || !agencyData.address.trim()) {
      alert('Téléphone, ville et adresse sont obligatoires');
      return;
    }
    if (!directorData.password || directorData.password.length < 8) {
      alert('Mot de passe : minimum 8 caractères');
      return;
    }

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
      status: 'pending',
    };

    try {
      // 1) on tente Supabase d’abord
      const result = await dbService.createRegistrationRequest(requestData);

      alert(
        `✅ DEMANDE D'INSCRIPTION ENVOYÉE !\n\n` +
        `🏢 AGENCE : ${agencyData.name}\n` +
        `👤 DIRECTEUR : ${directorData.firstName} ${directorData.lastName}\n` +
        `📧 EMAIL : ${directorData.email}\n` +
        `📱 TÉLÉPHONE : ${agencyData.phone}\n` +
        `🏙️ VILLE : ${agencyData.city}\n\n` +
        `ID enregistrement : ${result.id ?? 'non communiqué (RLS)'}\n\n` +
        `⏱️ Validation sous 24–48h.`
      );

      onClose();
      onSubmit(agencyData, directorData);
    } catch (err) {
      console.warn('⚠️ Erreur Supabase, backup local activé:', err);

      // 2) backup local UNIQUEMENT en cas d’échec Supabase
      const localRequest = {
        id: `local_${Date.now()}`,
        ...requestData,
        director_password: directorData.password,
        created_at: new Date().toISOString(),
        synced: false,
      };
      const stored = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      stored.unshift(localRequest);
      localStorage.setItem('demo_registration_requests', JSON.stringify(stored));

      alert(
        `✅ DEMANDE SAUVEGARDÉE LOCALEMENT (mode secours) !\n\n` +
        `🏢 AGENCE : ${agencyData.name}\n` +
        `👤 DIRECTEUR : ${directorData.firstName} ${directorData.lastName}\n` +
        `📧 EMAIL : ${directorData.email}\n` +
        `🆔 ID local : ${localRequest.id}\n\n` +
        `Elle sera synchronisée automatiquement dès que la connexion/autorisation sera rétablie.`
      );

      onClose();
      onSubmit(agencyData, directorData);
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
        {/* Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-500'
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'}`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'}`} />
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
                <Input label="Nom de l'agence" value={agencyData.name} onChange={(e) => updateAgencyData({ name: e.target.value })} required placeholder="Ex: Immobilier Excellence" />
                <Input label="Registre de commerce" value={agencyData.commercialRegister} onChange={(e) => updateAgencyData({ commercialRegister: e.target.value })} required placeholder="Ex: CI-ABJ-2024-B-12345" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Téléphone" type="tel" value={agencyData.phone} onChange={(e) => updateAgencyData({ phone: e.target.value })} required placeholder="+225 XX XX XX XX XX" />
                  <Input label="Email" type="email" value={agencyData.email} onChange={(e) => updateAgencyData({ email: e.target.value })} required placeholder="contact@agence.com" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Adresse" value={agencyData.address} onChange={(e) => updateAgencyData({ address: e.target.value })} required placeholder="Adresse complète" />
                  <Input label="Ville" value={agencyData.city} onChange={(e) => updateAgencyData({ city: e.target.value })} required placeholder="Abidjan" />
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
                  <span className="text-sm text-gray-700">L'agence possède un agrément officiel</span>
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
                    <img src={agencyData.logo} alt="Logo agence" className="w-24 h-24 object-contain mx-auto" />
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('logo-upload')?.click()}>
                      Changer le logo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <Button type="button" variant="outline" onClick={() => document.getElementById('logo-upload')?.click()}>
                        Télécharger un logo
                      </Button>
                      <p className="text-sm text-gray-500 mt-2">PNG, JPG ou SVG. Taille recommandée: 200x200px</p>
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
                  <Input label="Prénom" value={directorData.firstName} onChange={(e) => updateDirectorData({ firstName: e.target.value })} required />
                  <Input label="Nom" value={directorData.lastName} onChange={(e) => updateDirectorData({ lastName: e.target.value })} required />
                </div>
                <Input label="Email" type="email" value={directorData.email} onChange={(e) => updateDirectorData({ email: e.target.value })} required />
                <Input label="Mot de passe" type="password" value={directorData.password} onChange={(e) => updateDirectorData({ password: e.target.value })} required helperText="Minimum 8 caractères" />
              </div>
            </Card>

            <Card className="bg-blue-50">
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Permissions du directeur</h3>
              </div>
              <div className="text-sm text-blue-800">
                <p className="mb-2"><strong>Accès :</strong> Tous les modules + gestion des utilisateurs + configuration.</p>
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
                <h3 className="text-lg font-medium text-gray-900">Vérification</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><p className="font-medium">Agence</p><p className="text-gray-600">{agencyData.name}</p></div>
                <div><p className="font-medium">RCCM</p><p className="text-gray-600">{agencyData.commercialRegister}</p></div>
                <div><p className="font-medium">Directeur</p><p className="text-gray-600">{directorData.firstName} {directorData.lastName}</p></div>
                <div><p className="font-medium">Email</p><p className="text-gray-600">{directorData.email}</p></div>
                <div><p className="font-medium">Téléphone</p><p className="text-gray-600">{agencyData.phone}</p></div>
                <div><p className="font-medium">Ville</p><p className="text-gray-600">{agencyData.city}</p></div>
              </div>
            </Card>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Précédent
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            {currentStep < 3 ? (
              <Button type="button" onClick={() => setCurrentStep(currentStep + 1)}>Suivant</Button>
            ) : (
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Envoyer la demande
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
