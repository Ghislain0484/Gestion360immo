import React, { useState, useCallback } from 'react';
import { Building2, Upload, Shield, Users, Save, CheckCircle2, ChevronRight, Mail } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Toaster, toast } from 'react-hot-toast';
import { AgencyRegistrationRequest, AuditLog, AgencyFormData, UserFormData } from '../../types/db';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

import { usePlatformSettings } from '../../hooks/useAdminQueries';

interface AgencyRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (agency: AgencyFormData, director: UserFormData, registrationId: string) => Promise<void>;
}

export const AgencyRegistration: React.FC<AgencyRegistrationProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { admin } = useAuth();
  const { data: settings } = usePlatformSettings();

  if (settings?.platform_allow_new_registrations === false && !admin) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md" title="Inscriptions fermées">
        <div className="p-6 text-center">
          <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Inscriptions Temporairement Suspendues</h3>
          <p className="text-slate-500">
            Les nouvelles inscriptions sont actuellement désactivées. Veuillez réessayer plus tard ou contacter le support.
          </p>
          <Button variant="primary" className="mt-6 w-full" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </Modal>
    );
  }

  const [currentStep, setCurrentStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | 'enterprise'>('basic');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [agencyData, setAgencyData] = useState<AgencyFormData>({
    name: '',
    commercialRegister: '',
    logo_url: null,
    isAccredited: false,
    accreditationNumber: null,
    address: '',
    city: '',
    phone: '',
    email: '',
  });

  const [directorData, setDirectorData] = useState<UserFormData>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'director',
    agency_id: undefined,
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
    is_active: true,
    password: '',
  });

  const updateAgencyData = (updates: Partial<AgencyFormData>) => {
    setAgencyData((prev) => ({ ...prev, ...updates }));
  };

  const updateDirectorData = (updates: Partial<UserFormData>) => {
    setDirectorData((prev) => ({ ...prev, ...updates }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier doit être inférieur à 5 Mo');
      return;
    }
    setLogoFile(file);

    try {
      const fileName = `temp-registration/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('agency-logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) {
        console.error('Logo upload error:', error);
        toast.error(`Erreur lors du téléchargement du logo: ${error.message}`);
        return;
      }
      const publicUrl = supabase.storage.from('agency-logos').getPublicUrl(fileName).data.publicUrl;
      updateAgencyData({ logo_url: publicUrl });
      toast.success('Logo téléchargé avec succès');
    } catch (err) {
      console.error('Logo upload failed:', err);
      toast.error('Erreur lors du téléchargement du logo');
    }
  };

  const logAudit = useCallback(
    async (action: string, details: any, registrationId?: string) => {
      try {
        const ip_address = '0.0.0.0';
        const auditLog: Partial<AuditLog> = {
          user_id: admin?.id ?? null,
          action,
          table_name: 'agency_registration_requests',
          record_id: registrationId ?? null,
          old_values: null,
          new_values: details,
          ip_address,
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?\d{10,15}$/;

    if (!agencyData.name.trim() || !agencyData.commercialRegister.trim()) {
      toast.error('Le nom de l’agence et le registre de commerce sont obligatoires');
      return;
    }
    if (!directorData.first_name.trim() || !directorData.last_name.trim() || !directorData.email.trim()) {
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

    try {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('email')
        .eq('email', directorData.email.toLowerCase());
      if (existingUsers?.length) {
        toast.error('Cet email est déjà utilisé');
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: directorData.email.toLowerCase(),
        password: directorData.password,
        options: {
          data: {
            first_name: directorData.first_name,
            last_name: directorData.last_name,
            role: directorData.role,
            permissions: directorData.permissions,
          },
        },
      });
      if (authError || !authData.user) {
        throw new Error(authError?.message || "Erreur lors de la création de l'utilisateur");
      }

      const registrationId = uuidv4();

      const requestData: Partial<AgencyRegistrationRequest> = {
        id: registrationId,
        agency_name: agencyData.name,
        commercial_register: agencyData.commercialRegister,
        director_first_name: directorData.first_name,
        director_last_name: directorData.last_name,
        director_email: directorData.email.toLowerCase(),
        phone: agencyData.phone,
        city: agencyData.city,
        address: agencyData.address,
        logo_url: agencyData.logo_url || null,
        is_accredited: agencyData.isAccredited,
        accreditation_number: agencyData.isAccredited ? agencyData.accreditationNumber : null,
        status: 'pending',
        director_auth_user_id: authData.user.id,
        selected_plan: selectedPlan,
        billing_cycle: billingCycle,
        created_at: new Date().toISOString(),
      };

      const { error: requestError } = await supabase
        .from('agency_registration_requests')
        .insert([requestData]);

      if (requestError) {
        throw new Error(`agency_registration_requests.insert | code=${requestError.code} | msg=${requestError.message}`);
      }

      await logAudit(
        'registration_request_submitted',
        {
          ...requestData,
          registration_id: registrationId,
          user_id: authData.user.id,
          timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
        },
        registrationId
      );

      await onSubmit(agencyData, directorData, registrationId);
      
      setSubmittedId(registrationId);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('❌ Erreur inscription agence:', err.message, err.stack);
      const errorMessage = err.message.includes('duplicate key')
        ? 'Cette agence ou cet email est déjà enregistré'
        : err.message || 'Erreur lors de l’inscription';
      await logAudit('registration_request_failed', {
        agency_name: agencyData.name,
        director_email: directorData.email.toLowerCase(),
        error: errorMessage,
        timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
      });
      toast.error(errorMessage);
    }
  };

  const steps = [
    { id: 1, title: "Informations de l'agence", icon: Building2 },
    { id: 2, title: 'Compte directeur', icon: Users },
    { id: 3, title: 'Choix du Plan', icon: Save },
    { id: 4, title: 'Vérification', icon: Shield },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Inscription de l'agence">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${currentStep >= step.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-500'}`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <span
                className={`ml-2 text-sm font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'}`}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Agency Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center mb-4">
                <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Informations de l'agence</h3>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nom de l'agence"
                    value={agencyData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ name: e.target.value })}
                    required
                    placeholder="Ex: Immobilier Excellence"
                    autoComplete="organization"
                  />
                  <Input
                    label="Registre de commerce"
                    value={agencyData.commercialRegister}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateAgencyData({ commercialRegister: e.target.value })
                    }
                    required
                    placeholder="Ex: CI-ABJ-2024-B-12345"
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Téléphone"
                    type="tel"
                    value={agencyData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ phone: e.target.value })}
                    required
                    placeholder="Ex: +225 XX XX XX XX XX"
                    autoComplete="tel"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={agencyData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ email: e.target.value })}
                    required
                    placeholder="contact@agence.com"
                    autoComplete="email"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Adresse"
                    value={agencyData.address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ address: e.target.value })}
                    required
                    placeholder="Adresse complète"
                    autoComplete="street-address"
                  />
                  <Input
                    label="Ville"
                    value={agencyData.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAgencyData({ city: e.target.value })}
                    required
                    placeholder="Ex: Abidjan"
                    autoComplete="address-level2"
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
                    autoComplete="off"
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

        {/* Step 2: Director Account */}
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
                    value={directorData.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateDirectorData({ first_name: e.target.value })
                    }
                    required
                    placeholder="Ex: Jean"
                    autoComplete="given-name"
                  />
                  <Input
                    label="Nom"
                    value={directorData.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateDirectorData({ last_name: e.target.value })
                    }
                    required
                    placeholder="Ex: Kouadio"
                    autoComplete="family-name"
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
                  autoComplete="email"
                />
                <div className="space-y-1">
                  <Input
                    label="Mot de passe"
                    type="password"
                    value={directorData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateDirectorData({ password: e.target.value })
                    }
                    required
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-gray-500 ml-1">Minimum 8 caractères</p>
                </div>
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

        {/* Step 3: Plan Selection */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="flex items-center gap-4 p-1.5 bg-gray-100 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={clsx(
                    "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                    billingCycle === 'monthly' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={clsx(
                    "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                    billingCycle === 'yearly' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Annuel (-20%)
                </button>
              </div>
              <p className="text-[10px] text-blue-600 font-bold mt-2 uppercase tracking-widest">
                60 jours d'essai gratuits inclus
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: 'basic',
                  name: 'Basic',
                  price: settings?.subscription_basic_price || 25000,
                  features: ['10 propriétés', '2 utilisateurs', 'Support email']
                },
                {
                  id: 'premium',
                  name: 'Premium',
                  price: settings?.subscription_premium_price || 50000,
                  popular: true,
                  features: ['50 propriétés', '5 utilisateurs', 'Support prioritaire']
                },
                {
                  id: 'enterprise',
                  name: 'Enterprise',
                  price: settings?.subscription_enterprise_price || 100000,
                  features: ['Illimité', 'Illimité', 'Support 24/7']
                }
              ].map((plan) => {
                const displayPrice = billingCycle === 'yearly' ? plan.price * 0.8 : plan.price;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id as any)}
                    className={clsx(
                      "relative cursor-pointer flex flex-col rounded-2xl p-5 border-2 transition-all duration-300",
                      selectedPlan === plan.id
                        ? "border-blue-600 bg-blue-50/50 shadow-md"
                        : "border-gray-100 bg-white hover:border-blue-200"
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-0.5 rounded-full text-[9px] font-bold uppercase">
                        Populaire
                      </div>
                    )}
                    <h4 className="font-bold text-gray-900 mb-2">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-2xl font-black">{new Intl.NumberFormat('fr-FR').format(displayPrice)}</span>
                      <span className="text-[10px] text-gray-500 uppercase">XOF/mois</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-grow">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center text-xs text-gray-600">
                          <Shield className="h-3 w-3 text-blue-500 mr-2 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className={clsx(
                      "mt-auto py-2 rounded-lg text-xs font-bold text-center transition-colors",
                      selectedPlan === plan.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                    )}>
                      {selectedPlan === plan.id ? 'Sélectionné' : 'Choisir'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Verification */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Vérification</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-3">
                  <h4 className="font-bold text-blue-600 uppercase text-[10px] tracking-widest">📋 Agence & Directeur</h4>
                  <div>
                    <p className="font-medium text-gray-400 text-[10px] uppercase">Nom Agence</p>
                    <p className="text-gray-900 font-semibold">{agencyData.name}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-400 text-[10px] uppercase">Directeur</p>
                    <p className="text-gray-900 font-semibold">{directorData.first_name} {directorData.last_name}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-400 text-[10px] uppercase">Email de contact</p>
                    <p className="text-gray-900 font-semibold">{directorData.email}</p>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h4 className="font-bold text-indigo-600 uppercase text-[10px] tracking-widest">💳 Abonnement Choisi</h4>
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-indigo-50">
                    <div>
                      <p className="font-black text-slate-900 text-lg">{selectedPlan.toUpperCase()}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase transition-all">
                        {billingCycle === 'yearly' ? 'Facturation Annuelle' : 'Facturation Mensuelle'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-600 font-black text-xl">
                        {billingCycle === 'yearly' ? '-20%' : 'Standard'}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-600 text-white rounded-lg text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Période de grâce</p>
                    <p className="text-sm font-black">60 JOURS OFFERTS</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

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
            {currentStep < 4 ? (
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

      {/* --- Success View Overlay --- */}
      {isSuccess && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 text-center mb-2">
            Demande Envoyée !
          </h2>
          <p className="text-gray-500 text-center mb-8 max-w-sm">
            Bienvenue dans l'écosystème <span className="text-blue-600 font-bold">Gestion360</span>. Votre demande est en cours de traitement.
          </p>

          <div className="w-full max-w-md bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8 space-y-4 shadow-sm">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 font-medium">Agence</span>
              <span className="text-gray-900 font-bold">{agencyData.name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 font-medium">Directeur</span>
              <span className="text-gray-900 font-bold">{directorData.first_name} {directorData.last_name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400 font-medium">Identifiant unique</span>
              <code className="bg-white px-2 py-1 rounded border border-gray-200 text-blue-600 font-mono text-xs">
                {submittedId}
              </code>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl">
                <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Un email de confirmation vous sera envoyé dès que votre compte sera validé par nos administrateurs (sous 24-48h).
                </p>
              </div>
            </div>
          </div>

          <Button 
            className="w-full max-w-xs h-12 text-lg font-bold shadow-lg shadow-blue-200 group"
            onClick={onClose}
          >
            Terminer
            <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      )}

      <Toaster position="bottom-right" />
    </Modal>
  );
};