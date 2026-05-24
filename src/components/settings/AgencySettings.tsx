import React, { useState, useEffect } from 'react';
import { Building2, Upload, Trash2, CheckCircle, AlertTriangle, FileSignature, HelpCircle, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { dbService, supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export const AgencySettings: React.FC = () => {
  const { user, agencyId, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  
  // Find current agency
  const currentAgency = user?.agencies?.find(a => a.agency_id === agencyId);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    logo_url: '',
    signature_url: '',
    signatory_name: '',
    signatory_title: '',
    with_signature: false
  });

  // Load current agency details on mount/change
  useEffect(() => {
    if (currentAgency) {
      setFormData({
        name: currentAgency.name || '',
        address: currentAgency.address || '',
        city: currentAgency.city || '',
        phone: currentAgency.phone || '',
        email: currentAgency.email || '',
        logo_url: currentAgency.logo_url || '',
        signature_url: currentAgency.settings?.signature_url || '',
        signatory_name: currentAgency.settings?.signatory_name || '',
        signatory_title: currentAgency.settings?.signatory_title || '',
        with_signature: currentAgency.settings?.with_signature === true
      });
    }
  }, [currentAgency, agencyId]);

  // Handle Logo File Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier doit être inférieur à 2 Mo');
      return;
    }
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, logo_url: url }));
  };

  // Handle Signature File Upload
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier doit être inférieur à 2 Mo');
      return;
    }
    setSignatureFile(file);
    const url = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, signature_url: url }));
  };

  // Remove Logo
  const removeLogo = () => {
    setLogoFile(null);
    setFormData(prev => ({ ...prev, logo_url: '' }));
  };

  // Remove Signature
  const removeSignature = () => {
    setSignatureFile(null);
    setFormData(prev => ({ ...prev, signature_url: '' }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAgencyId = agencyId || user?.agency_id;
    if (!targetAgencyId) {
      toast.error('Impossible de localiser votre agence.');
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Le nom de l'agence est obligatoire.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Enregistrement des paramètres de l'agence...");

    try {
      let finalLogoUrl = formData.logo_url;
      let finalSignatureUrl = formData.signature_url;

      // 1. Upload Logo if changed
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const fileName = `logos/${targetAgencyId}_${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('agency-logos')
          .upload(fileName, logoFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          throw new Error("Erreur d'upload du logo: " + uploadError.message);
        }

        finalLogoUrl = supabase.storage.from('agency-logos').getPublicUrl(fileName).data.publicUrl;
      }

      // 2. Upload Signature if changed
      if (signatureFile) {
        const ext = signatureFile.name.split('.').pop();
        const fileName = `signatures/${targetAgencyId}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('agency-logos')
          .upload(fileName, signatureFile, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          throw new Error("Erreur d'upload de la signature: " + uploadError.message);
        }

        finalSignatureUrl = supabase.storage.from('agency-logos').getPublicUrl(fileName).data.publicUrl;
      }

      // 3. Save Agency details (logo, name, etc.)
      const cleanDetails = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        email: formData.email,
        logo_url: finalLogoUrl || null
      };

      await dbService.agencies.update(targetAgencyId, cleanDetails);

      // 4. Save JSONB settings (signature URL, signature status, etc.)
      const cleanSettings = {
        signature_url: finalSignatureUrl || null,
        signatory_name: formData.signatory_name || null,
        signatory_title: formData.signatory_title || null,
        with_signature: formData.with_signature
      };

      const { error: rpcError } = await supabase.rpc('update_agency_settings', {
        p_agency_id: targetAgencyId,
        p_settings: cleanSettings
      });

      if (rpcError) {
        console.warn("Interception update_agency_settings RPC fallback:", rpcError);
        // Fallback to direct settings JSONB column update if RPC fails
        const currentSettings = currentAgency?.settings || {};
        const mergedSettings = { ...currentSettings, ...cleanSettings };
        await supabase.from('agencies').update({ settings: mergedSettings }).eq('id', targetAgencyId);
      }

      toast.success("Paramètres de l'agence enregistrés avec succès !", { id: toastId });
      
      // Update auth context state
      await refreshAuth();
    } catch (error: any) {
      console.error("Error saving agency settings:", error);
      toast.error("Erreur lors de la sauvegarde : " + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Contact Info Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center mb-6 border-b pb-4 border-slate-100">
              <Building2 className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-bold text-gray-900">
                Profil & Identité de l'Agence
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nom officiel de l'agence"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="Ex: Immobilier Prestige SARL"
              />
              <Input
                label="E-mail de contact"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="contact@monagence.com"
              />
              <Input
                label="Téléphone principal"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Ex: +225 07 00 00 00 00"
              />
              <Input
                label="Ville"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Ex: Abidjan"
              />
              <div className="md:col-span-2">
                <Input
                  label="Adresse Géographique Complète"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Ex: Cocody Angré 7ème tranche, Carrefour après le pont, Immeuble Horizon"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Logo & Signature Assets Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Logo Card */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100">
                <h4 className="font-bold text-gray-900 text-sm">Logo de l'agence</h4>
                {formData.logo_url && (
                  <button 
                    type="button" 
                    onClick={removeLogo}
                    className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                )}
              </div>
              
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                {formData.logo_url ? (
                  <div className="space-y-4">
                    <img 
                      src={formData.logo_url} 
                      alt="Logo agence" 
                      className="w-32 h-32 object-contain mx-auto bg-white rounded-xl p-2 shadow-sm border border-slate-100" 
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('agency-logo-upload')?.click()}
                    >
                      Changer le logo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-10 w-10 mx-auto text-slate-400" />
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('agency-logo-upload')?.click()}
                      >
                        Télécharger le logo
                      </Button>
                      <p className="text-xs text-slate-400 mt-2">Format PNG ou JPG. Max 2 Mo. Arrière-plan transparent recommandé.</p>
                    </div>
                  </div>
                )}
                <input
                  id="agency-logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>
          </Card>

          {/* Signature Card */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100">
                <h4 className="font-bold text-gray-900 text-sm">Signature Électronique & Sceau</h4>
                {formData.signature_url && (
                  <button 
                    type="button" 
                    onClick={removeSignature}
                    className="text-red-500 hover:text-red-700 flex items-center gap-1 text-xs font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                )}
              </div>
              
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
                {formData.signature_url ? (
                  <div className="space-y-4">
                    <div className="relative inline-block bg-white rounded-xl p-2 shadow-sm border border-slate-100">
                      <img 
                        src={formData.signature_url} 
                        alt="Signature électronique" 
                        className="w-32 h-32 object-contain mx-auto" 
                      />
                    </div>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('agency-signature-upload')?.click()}
                      >
                        Changer la signature
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileSignature className="h-10 w-10 mx-auto text-slate-400 animate-pulse" />
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => document.getElementById('agency-signature-upload')?.click()}
                      >
                        Télécharger la signature
                      </Button>
                      <p className="text-xs text-slate-400 mt-2">Format PNG Transparent obligatoire. Max 2 Mo. Signature noire sur fond vide.</p>
                    </div>
                  </div>
                )}
                <input
                  id="agency-signature-upload"
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={handleSignatureUpload}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Signature Parameters Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center mb-6 border-b pb-4 border-slate-100">
              <FileSignature className="h-5 w-5 text-emerald-600 mr-2" />
              <h3 className="text-lg font-bold text-gray-900">
                Paramètres de Signature sur les Documents
              </h3>
            </div>
            
            <div className="space-y-6">
              
              {/* Dynamic Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1 pr-4">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    Signature automatique
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Si activé, la signature électronique et le sceau configurés ci-dessus seront automatiquement incrustés au bas de vos quittances de loyers, bordereaux de reversement et ordres de virement générés en PDF.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.with_signature}
                    onChange={(e) => setFormData(prev => ({ ...prev, with_signature: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Signatory details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom complet du signataire officiel"
                  value={formData.signatory_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, signatory_name: e.target.value }))}
                  placeholder="Ex: M. Jean Kouadio"
                  required={formData.with_signature}
                />
                <Input
                  label="Titre / Qualité du signataire"
                  value={formData.signatory_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, signatory_title: e.target.value }))}
                  placeholder="Ex: Le Directeur Général"
                  required={formData.with_signature}
                />
              </div>

              {/* Warnings & Help */}
              <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <span className="font-bold block">💡 Exigences légales importantes :</span>
                  <p>La signature électronique est une pièce à forte valeur probatoire. Assurez-vous d'avoir téléchargé un tracé propre de signature manuscrite sur **fond transparent (sans fond blanc)** pour une incrustation esthétique sur vos quittances de loyer.</p>
                  <p>L'activation de cette option engage la responsabilité légale du signataire désigné pour chaque document généré.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button 
            type="submit" 
            isLoading={loading} 
            className="px-6 py-2.5 shadow-lg shadow-blue-200"
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer les paramètres
          </Button>
        </div>

      </form>
    </div>
  );
};
