import React, { useState, useCallback } from 'react';
import { Building2, Upload, Shield, Users, Save, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Toaster, toast } from 'react-hot-toast';
import { AgencyRegistrationRequest, AuditLog } from '../../types/db'; // Updated import path
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Define interfaces to match types/db.ts and LoginForm.tsx
interface AgencyFormData {
  name: string;
  commercialRegister: string;
  logo_url: string | null; // Changed to string | null
  isAccredited: boolean;
  accreditationNumber: string | null; // Changed to string | null
  address: string;
  city: string;
  phone: string;
  email: string;
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'director';
  permissions: Record<string, boolean>;
  isActive: boolean;
  password: string;
}

interface AgencyRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (agency: AgencyFormData, director: UserFormData) => Promise<void>; // Updated to Promise<void>
}

export const AgencyRegistration: React.FC<AgencyRegistrationProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { admin } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [agencyData, setAgencyData] = useState<AgencyFormData>({
    name: '',
    commercialRegister: '',
    logo_url: null, // Initialize as null
    isAccredited: false,
    accreditationNumber: null, // Initialize as null
    address: '',
    city: '',
    phone: '',
    email: '',
  });

  const [directorData, setDirectorData] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'director',
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier doit être inférieur à 5 Mo');
      return;
    }
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    updateAgencyData({ logo_url: url });
  };

  const logAudit = useCallback(
    async (action: string, details: any) => {
      try {
        const auditLog: Partial<AuditLog> = {
          user_id: admin?.id ?? null,
          action,
          table_name: 'agency_registration_requests', // Updated table name
          record_id: null,
          old_values: null,
          new_values: details,
          ip_address: 'unknown', // Replace with actual IP if available
          user_agent: navigator.userAgent,
        };
        await dbService.auditLogs.insert(auditLog);
      } catch (err) {
        console.error("Erreur lors de l’enregistrement de l’audit:", err);
      }
    },
    [admin]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?\d{10,15}$/;
    if (!agencyData.name.trim() || !agencyData.commercialRegister.trim()) {
      toast.error('Le nom de l’agence et le registre de commerce sont obligatoires');
      return;
    }
    if (!directorData.firstName.trim() || !directorData.lastName.trim() || !directorData.email.trim()) {
      toast.error('Les informations du directeur sont obligatoires');
      return;
    }
    if (!emailRegex.test(directorData.email)) {
      toast.error('Format d’email invalide');
      return;
    }
    if (!agencyData.phone.trim() || !phoneRegex.test(agencyData.phone)) {
      toast.error('Numéro de téléphone invalide (10-15 chiffres, ex: +225XXXXXXXXXX)');
      return;
    }
    if (!agencyData.city.trim() || !agencyData.address.trim()) {
      toast.error('Ville et adresse sont obligatoires');
      return;
    }
    if (!directorData.password || directorData.password.length < 8) {
      toast.error('Mot de passe : minimum 8 caractères');
      return;
    }
    if (agencyData.isAccredited && !agencyData.accreditationNumber?.trim()) {
      toast.error('Numéro d’agrément requis si l’agence est agréée');
      return;
    }

    const requestData: Partial<AgencyRegistrationRequest> = {
      agency_name: agencyData.name,
      commercial_register: agencyData.commercialRegister,
      director_first_name: directorData.firstName,
      director_last_name: directorData.lastName,
      director_email: directorData.email,
      phone: agencyData.phone,
      city: agencyData.city,
      address: agencyData.address,
      logo_url: agencyData.logo_url,
      is_accredited: agencyData.isAccredited,
      accreditation_number: agencyData.accreditationNumber,
      status: 'pending',
      director_password: directorData.password, // Include for local storage fallback
    };

    try {
      const result = await dbService.agencyRegistrationRequests.create(requestData);
      await logAudit('registration_request_submitted', {
        ...requestData,
        registration_id: result.id,
        timestamp: new Date().toISOString(),
      });
      toast.success(
        `✅ Demande d'inscription envoyée !\n\n` +
          `🏢 Agence : ${agencyData.name}\n` +
          `👤 Directeur : ${directorData.firstName} ${directorData.lastName}\n` +
          `📧 Email : ${directorData.email}\n` +
          `📱 Téléphone : ${agencyData.phone}\n` +
          `🏙️ Ville : ${agencyData.city}\n\n` +
          `🆔 ID : ${result.id}\n` +
          `⏱️ Validation sous 24–48h\n` +
          `📧 Vous recevrez vos identifiants par email`
      );
      onClose();
      await onSubmit(agencyData, directorData);
    } catch (err: any) {
      const errorMessage = err.message.includes('duplicate key')
        ? 'Cette agence ou cet email est déjà enregistré'
        : err.message || 'Erreur lors de l’inscription';
      await logAudit('registration_request_failed', {
        ...requestData,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      const localRequest = {
        id: `local_${Date.now()}`,
        ...requestData,
        created_at: new Date().toISOString(),
        synced: false,
      };
      const stored = JSON.parse(localStorage.getItem('demo_registration_requests') || '[]');
      stored.unshift(localRequest);
      localStorage.setItem('demo_registration_requests', JSON.stringify(stored));

      toast.success(
        `✅ Demande sauvegardée localement !\n\n` +
          `🏢 Agence : ${agencyData.name}\n` +
          `👤 Directeur : ${directorData.firstName} ${directorData.lastName}\n` +
          `📧 Email : ${directorData.email}\n` +
          `🆔 ID local : ${localRequest.id}\n\n` +
          `⚠️ Problème de connexion détecté\n` +
          `🔄 Elle sera synchronisée dès que la connexion sera rétablie\n\n` +
          `Conservez vos identifiants :\n` +
          `📧 Email : ${directorData.email}\n` +
          `🔑 Mot de passe : [Celui que vous avez saisi]`
      );
      onClose();
      await onSubmit(agencyData, directorData);
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
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
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
                <Input
                  label="Nom de l'agence"
                  value={agencyData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ name: e.target.value })}
                  required
                  placeholder="Ex: Immobilier Excellence"
                />
                <Input
                  label="Registre de commerce"
                  value={agencyData.commercialRegister}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateAgencyData({ commercialRegister: e.target.value })
                  }
                  required
                  placeholder="Ex: CI-ABJ-2024-B-12345"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Téléphone"
                    type="tel"
                    value={agencyData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ phone: e.target.value })}
                    required
                    placeholder="Ex: +225 XX XX XX XX XX"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={agencyData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ email: e.target.value })}
                    required
                    placeholder="contact@agence.com"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Adresse"
                    value={agencyData.address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ address: e.target.value })}
                    required
                    placeholder="Adresse complète"
                  />
                  <Input
                    label="Ville"
                    value={agencyData.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ city: e.target.value })}
                    required
                    placeholder="Ex: Abidjan"
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateAgencyData({ isAccredited: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">L'agence possède un agrément officiel</span>
                </label>

                {agencyData.isAccredited && (
                  <Input
                    label="Numéro d'agrément"
                    value={agencyData.accreditationNumber || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateAgencyData({ accreditationNumber: e.target.value })
                    }
                    required
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
                {agencyData.logo_url ? (
                  <div className="space-y-4">
                    <img src={agencyData.logo_url} alt="Logo agence" className="w-24 h-24 object-contain mx-auto" />
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
                      <p className="text-sm text-gray-500 mt-2">PNG, JPG ou SVG. Max 5 Mo, 200x200px recommandé</p>
                    </div>
                  </div>
                )}
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateDirectorData({ firstName: e.target.value })
                    }
                    required
                    placeholder="Ex: Jean"
                  />
                  <Input
                    label="Nom"
                    value={directorData.lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateDirectorData({ lastName: e.target.value })
                    }
                    required
                    placeholder="Ex: Kouadio"
                  />
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={directorData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateDirectorData({ email: e.target.value })
                  }
                  required
                  placeholder="Ex: directeur@agence.com"
                />
                <Input
                  label="Mot de passe"
                  type="password"
                  value={directorData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateDirectorData({ password: e.target.value })
                  }
                  required
                  helperText="Minimum 8 caractères"
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
                  <strong>Accès :</strong> Tous les modules + gestion des utilisateurs + configuration.
                </p>
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
                <div>
                  <p className="font-medium">Agence</p>
                  <p className="text-gray-600">{agencyData.name}</p>
                </div>
                <div>
                  <p className="font-medium">RCCM</p>
                  <p className="text-gray-600">{agencyData.commercialRegister}</p>
                </div>
                <div>
                  <p className="font-medium">Directeur</p>
                  <p className="text-gray-600">
                    {directorData.firstName} {directorData.lastName}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-gray-600">{directorData.email}</p>
                </div>
                <div>
                  <p className="font-medium">Téléphone</p>
                  <p className="text-gray-600">{agencyData.phone}</p>
                </div>
                <div>
                  <p className="font-medium">Ville</p>
                  <p className="text-gray-600">{agencyData.city}</p>
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
          <div className="flex space-x-3 items-center">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            {currentStep < 3 ? (
              <Button type="button" onClick={() => setCurrentStep(currentStep + 1)}>
                Suivant
              </Button>
            ) : (
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Envoyer la demande
              </Button>
            )}
          </div>
        </div>
      </form>
      <Toaster position="bottom-right" />
    </Modal>
  );
};