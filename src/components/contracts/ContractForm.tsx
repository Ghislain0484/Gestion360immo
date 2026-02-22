import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, FileText, Calendar, DollarSign, Upload, Printer } from 'lucide-react';
import Select, { SingleValue } from 'react-select';
import AsyncSelect from 'react-select/async';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeData } from '../../hooks/useSupabaseData';
import { dbService } from '../../lib/supabase';
import { Contract, Owner, Property, Tenant, Agency } from '../../types/db';
import { OHADAContractGenerator } from '../../utils/contractTemplates';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/config';

interface ContractFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contract: Partial<Contract>, isUpdate?: boolean) => void;
  initialData?: Partial<Contract>;
  readOnly?: boolean;
}

export const ContractForm = React.memo<ContractFormProps>(
  ({ isOpen, onClose, onSubmit, initialData, readOnly = false }) => {
    const { user } = useAuth();

    const [formData, setFormData] = useState<Partial<Contract>>({
      agency_id: user?.agency_id ?? undefined,
      owner_id: undefined,
      property_id: undefined,
      tenant_id: undefined,
      type: 'location',
      start_date: new Date().toISOString().split('T')[0],
      monthly_rent: undefined,
      deposit: undefined,
      charges: undefined,
      commission_rate: 10,
      commission_amount: 0,
      status: 'draft',
      terms: '',
      documents: [],
      ...initialData,
    });

    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [currentOwner, setCurrentOwner] = useState<Owner | null>(null);
    const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [loadedAgency, setLoadedAgency] = useState<Agency | null>(null);

    // --- Fetch agencies --- 
    const { data: agencies = [], initialLoading: agencyLoading, error: agencyError } =
      useRealtimeData<Agency>(
        () => dbService.agencies.getAll(),
        'agencies'
      );

    // --- Si l'agence de l'user existe mais n'est pas dans la liste, fetchById ---
    useEffect(() => {
      const fetchUserAgency = async () => {
        if (user?.agency_id && agencies.length === 0 && !loadedAgency) {
          try {
            const agency = await dbService.agencies.getById(user.agency_id);
            if (agency) setLoadedAgency(agency);
          } catch (err) {
            console.error('Erreur fetchUserAgency:', err);
          }
        }
      };
      fetchUserAgency();
    }, [user?.agency_id, agencies, loadedAgency]);

    // --- Initialisation agence dans formData ---
    useEffect(() => {
      if (!formData.agency_id) {
        if (agencies.length > 0) setFormData((prev) => ({ ...prev, agency_id: agencies[0].id }));
        else if (loadedAgency) setFormData((prev) => ({ ...prev, agency_id: loadedAgency.id }));
      }
    }, [agencies, loadedAgency, formData.agency_id]);

    // --- Handle errors ---
    useEffect(() => {
      if (agencyError) {
        setError(agencyError);
        toast.error(agencyError);
      }
    }, [agencyError]);

    // --- Fetch initial owner/property/tenant ---
    useEffect(() => {
      const fetchInitialData = async () => {
        try {
          if (initialData?.owner_id) setCurrentOwner(await dbService.owners.findOne(initialData.owner_id));
          else setCurrentOwner(null);

          if (initialData?.property_id) setCurrentProperty(await dbService.properties.findOne(initialData.property_id));
          else setCurrentProperty(null);

          if (initialData?.tenant_id) setCurrentTenant(await dbService.tenants.findOne(initialData.tenant_id));
          else setCurrentTenant(null);
        } catch (err) {
          console.error('Erreur fetching initial data:', err);
          toast.error('Erreur lors du chargement des données initiales');
        }
      };
      fetchInitialData();
    }, [initialData?.owner_id, initialData?.property_id, initialData?.tenant_id]);

    // --- Synchronisation agency_id avec user ---
    useEffect(() => {
      if (user?.agency_id && formData.agency_id !== user.agency_id) {
        setFormData((prev) => ({ ...prev, agency_id: user.agency_id }));
      }
    }, [user?.agency_id]);

    // --- Update formData ---
    const updateFormData = (updates: Partial<Contract>) => {
      setFormData((prev) => {
        const updated = { ...prev, ...updates };
        // Reset property si owner change
        if (updates.owner_id && updates.owner_id !== prev.owner_id) {
          updated.property_id = undefined;
          setCurrentProperty(null);
        }
        // Recalculate commission
        if (updates.monthly_rent !== undefined || updates.commission_rate !== undefined) {
          const rent = updates.monthly_rent ?? prev.monthly_rent ?? 0;
          const rate = updates.commission_rate ?? prev.commission_rate ?? 10;
          updated.commission_amount = (rent * rate) / 100;
        }
        console.log('[formData] updateFormData:', updated); // <-- LOG FORM DATA
        return updated;
      });
    };

    // Reset form
    const resetForm = () => {
      setFormData({
        agency_id: user?.agency_id ?? undefined,
        owner_id: undefined,
        property_id: undefined,
        tenant_id: undefined,
        type: 'location',
        start_date: new Date().toISOString().split('T')[0],
        monthly_rent: undefined,
        deposit: undefined,
        charges: undefined,
        commission_rate: 10,
        commission_amount: 0,
        status: 'draft',
        terms: '',
        documents: [],
      });
      setCurrentOwner(null);
      setCurrentProperty(null);
      setCurrentTenant(null);
      setError(null);
    };

    // --- Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (readOnly) return;
      setSubmitting(true);
      setError(null);

      try {
        // Validation des champs essentiels
        if (!formData.agency_id?.trim()) throw new Error("L'ID de l'agence est requis");
        if (!formData.owner_id?.trim()) throw new Error('Veuillez sélectionner un propriétaire');
        if (!formData.property_id?.trim()) throw new Error('Veuillez sélectionner une propriété');

        // Le locataire est requis pour Location et Vente, mais optionnel pour Gestion
        if (formData.type !== 'gestion' && !formData.tenant_id?.trim()) {
          throw new Error('Veuillez sélectionner un locataire pour ce type de contrat');
        }

        if (!formData.type) throw new Error('Veuillez sélectionner un type de contrat');
        if (!formData.start_date) throw new Error('Veuillez spécifier une date de début');

        // Validation stricte uniquement pour les contrats actifs
        if (formData.status === 'active') {
          if (!formData.terms?.trim()) throw new Error('Veuillez saisir les termes du contrat');
          if (formData.type === 'location' && (!formData.monthly_rent || formData.monthly_rent <= 0))
            throw new Error('Veuillez saisir un loyer mensuel valide');
          if (formData.type === 'vente' && (!formData.sale_price || formData.sale_price <= 0))
            throw new Error('Veuillez saisir un prix de vente valide');
        }

        // Validation taux de commission (toujours requis)
        if (!formData.commission_rate || formData.commission_rate < 0 || formData.commission_rate > 100)
          throw new Error('Veuillez saisir un taux de commission valide (0-100%)');

        await onSubmit(formData, !!initialData?.id);
        resetForm();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
      } finally {
        setSubmitting(false);
      }
    };

    // --- Options pour react-select ---
    const agencyOptions = useMemo(
      () => [...agencies, ...(loadedAgency && !agencies.find(a => a.id === loadedAgency.id) ? [loadedAgency] : [])]
        .map((agency) => ({ value: agency.id, label: agency.name })),
      [agencies, loadedAgency]
    );

    const selectStyles = {
      control: (base: any) => ({ ...base, borderColor: '#d1d5db', borderRadius: '0.375rem', padding: '0.25rem', '&:hover': { borderColor: '#3b82f6' } }),
      menu: (base: any) => ({ ...base, borderRadius: '0.375rem', marginTop: '0.25rem' }),
      option: (base: any, state: any) => ({ ...base, backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white', color: state.isSelected ? 'white' : '#111827' }),
    };

    // --- Async loadOptions ---
    const loadOwnerOptions = useCallback(
      async (inputValue: string) => {
        if (!formData.agency_id) return [];
        try {
          return await dbService.owners.getAll({ agency_id: formData.agency_id, search: inputValue, limit: 10 });
        } catch {
          toast.error('Erreur lors du chargement des propriétaires');
          return [];
        }
      },
      [formData.agency_id]
    );

    const loadPropertyOptions = useCallback(
      async (inputValue: string) => {
        if (!formData.agency_id || !currentOwner?.id) return [];
        try {
          const properties = await dbService.properties.getAll({
            agency_id: formData.agency_id,
            owner_id: currentOwner.id,
            search: inputValue,
            limit: 10
          });
          return properties;
        } catch {
          toast.error('Erreur lors du chargement des propriétés');
          return [];
        }
      },
      [formData.agency_id, currentOwner?.id]
    );

    const loadTenantOptions = useCallback(
      async (inputValue: string) => {
        if (!formData.agency_id) return [];
        try {
          return await dbService.tenants.getAll({ agency_id: formData.agency_id, search: inputValue, limit: 10 });
        } catch {
          toast.error('Erreur lors du chargement des locataires');
          return [];
        }
      },
      [formData.agency_id]
    );

    return (
      <Modal
        isOpen={isOpen}
        onClose={() => { resetForm(); onClose(); }}
        size="lg"
        title={
          <div className="flex items-center gap-3">
            <span>{initialData?.id ? (readOnly ? 'Détails du contrat' : 'Modifier le contrat') : 'Nouveau contrat'}</span>
            {readOnly && (
              <Badge variant="info" size="sm">Mode Lecture Seule</Badge>
            )}
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="p-4 bg-red-50 text-red-800 rounded-lg">{error}</div>}

          {/* Agency Logo for Preview/Branding */}
          {user?.agencies?.find(a => a.agency_id === formData.agency_id)?.logo_url && (
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center justify-center overflow-hidden">
                <img
                  src={user.agencies.find(a => a.agency_id === formData.agency_id)?.logo_url || ''}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* --- Informations générales --- */}
          <Card>
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Informations générales</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="agency_id" className="block text-sm font-medium text-gray-700 mb-2">Agence</label>
                <Select
                  id="agency_id"
                  value={agencyOptions.find((opt) => opt.value === formData.agency_id) || null}
                  options={agencyOptions}
                  onChange={(opt: SingleValue<{ value: string, label: string }>) => updateFormData({ agency_id: opt?.value })}
                  isDisabled
                  placeholder={agencyLoading ? 'Chargement...' : 'Sélectionner une agence'}
                  styles={selectStyles}
                  required
                />
              </div>

              <div>
                <label htmlFor="owner_id" className="block text-sm font-medium text-gray-700 mb-2">Propriétaire</label>
                <AsyncSelect<Owner, false>
                  id="owner_id"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadOwnerOptions}
                  getOptionLabel={(o) => `${o.first_name} ${o.last_name}`}
                  getOptionValue={(o) => o.id}
                  value={currentOwner}
                  onChange={(opt) => { setCurrentOwner(opt); updateFormData({ owner_id: opt?.id }); setCurrentProperty(null); }}
                  isDisabled={!formData.agency_id || readOnly}
                  placeholder="Rechercher un propriétaire..."
                  styles={selectStyles}
                  isClearable
                  required
                />
              </div>

              <div>
                <label htmlFor="property_id" className="block text-sm font-medium text-gray-700 mb-2">Propriété</label>
                <AsyncSelect<Property, false>
                  key={formData.owner_id}
                  id="property_id"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadPropertyOptions}
                  getOptionLabel={(p) => `${p.title} (${p.details?.type || 'N/A'})`}
                  getOptionValue={(p) => p.id}
                  value={currentProperty}
                  onChange={(opt) => { setCurrentProperty(opt); updateFormData({ property_id: opt?.id }); }}
                  isDisabled={!formData.owner_id || readOnly}
                  placeholder="Rechercher une propriété..."
                  styles={selectStyles}
                  isClearable
                  required
                />
              </div>

              <div>
                <label htmlFor="tenant_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Locataire {formData.type === 'gestion' && <span className="text-gray-400 font-normal">(Optionnel pour Gestion)</span>}
                </label>
                <AsyncSelect<Tenant, false>
                  id="tenant_id"
                  cacheOptions
                  defaultOptions
                  loadOptions={loadTenantOptions}
                  getOptionLabel={(t) => `${t.first_name} ${t.last_name}`}
                  getOptionValue={(t) => t.id}
                  value={currentTenant}
                  onChange={(opt) => { setCurrentTenant(opt); updateFormData({ tenant_id: opt?.id }); }}
                  isDisabled={!formData.agency_id || readOnly}
                  placeholder="Rechercher un locataire..."
                  styles={selectStyles}
                  isClearable
                  required={formData.type !== 'gestion'}
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">Type de contrat</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => updateFormData({ type: e.target.value as Contract['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="location">Location</option>
                  <option value="vente">Vente</option>
                  <option value="gestion">Gestion</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => updateFormData({ status: e.target.value as Contract['status'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  required
                  disabled={readOnly}
                >
                  <option value="draft">Brouillon</option>
                  <option value="active">Actif</option>
                  <option value="expired">Expiré</option>
                  <option value="terminated">Résilié</option>
                  <option value="renewed">Renouvelé</option>
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center mb-4">
              <Calendar className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Dates</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="start_date"
                label="Date de début"
                type="date"
                value={formData.start_date ?? ''}
                onChange={(e) => updateFormData({ start_date: e.target.value || undefined })}
                required
              />
              <Input
                id="end_date"
                label="Date de fin (optionnel)"
                type="date"
                value={formData.end_date ?? ''}
                onChange={(e) => updateFormData({ end_date: e.target.value || undefined })}
                disabled={readOnly}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center mb-4">
              <DollarSign className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Montants</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.type === 'location' && (
                <>
                  <Input
                    id="monthly_rent"
                    label="Loyer mensuel (FCFA)"
                    type="number"
                    value={formData.monthly_rent ?? ''}
                    onChange={(e) =>
                      updateFormData({ monthly_rent: parseFloat(e.target.value) || undefined })
                    }
                    min={0}
                    placeholder="450000"
                  />
                  <Input
                    id="deposit"
                    label="Caution (FCFA)"
                    type="number"
                    value={formData.deposit ?? ''}
                    onChange={(e) =>
                      updateFormData({ deposit: parseFloat(e.target.value) || undefined })
                    }
                    min={0}
                    placeholder="900000"
                  />
                  <Input
                    id="charges"
                    label="Charges (FCFA)"
                    type="number"
                    value={formData.charges ?? ''}
                    onChange={(e) =>
                      updateFormData({ charges: parseFloat(e.target.value) || undefined })
                    }
                    min={0}
                    placeholder="25000"
                  />
                </>
              )}

              {formData.type === 'vente' && (
                <Input
                  id="sale_price"
                  label="Prix de vente (FCFA)"
                  type="number"
                  value={formData.sale_price ?? ''}
                  onChange={(e) =>
                    updateFormData({ sale_price: parseFloat(e.target.value) || undefined })
                  }
                  min={0}
                  placeholder="25000000"
                />
              )}

              <Input
                id="commission_rate"
                label="Taux de commission (%)"
                type="number"
                value={formData.commission_rate}
                onChange={(e) =>
                  updateFormData({ commission_rate: parseFloat(e.target.value) || 10 })
                }
                min={0}
                max={100}
                step={0.1}
                placeholder="10"
                disabled={readOnly}
              />
            </div>

            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Commission calculée :</strong>{' '}
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF',
                  minimumFractionDigits: 0,
                }).format(formData.commission_amount || 0)}{' '}
              </p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Termes et conditions</h3>
            </div>

            <div>
              <label htmlFor="terms" className="block text-sm font-medium text-gray-700 mb-2">
                Termes du contrat {formData.status === 'draft' && '(optionnel pour brouillon)'}
              </label>
              <textarea
                id="terms"
                value={formData.terms}
                onChange={(e) => updateFormData({ terms: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Décrivez les termes et conditions du contrat (vous pourrez les compléter plus tard si brouillon)..."
                required={formData.status === 'active'}
                disabled={readOnly}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center mb-4">
              <Upload className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Documents</h3>
            </div>

            <div>
              <label htmlFor="documents" className="block text-sm font-medium text-gray-700 mb-2">
                Télécharger des documents
              </label>
              <input
                id="documents"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || !formData.agency_id) {
                    toast.error("Veuillez sélectionner une agence avant de télécharger des documents");
                    return;
                  }
                  const uploadedUrls: string[] = [];
                  for (const file of files) {
                    const filePath = `contracts/${formData.agency_id}/${Date.now()}_${file.name}`;
                    const { error } = await supabase.storage
                      .from('contract-documents')
                      .upload(filePath, file);
                    if (error) {
                      toast.error(`Erreur lors du téléchargement de ${file.name}: ${error.message}`);
                      continue;
                    }
                    const { data: { publicUrl } } = supabase.storage
                      .from('contract-documents')
                      .getPublicUrl(filePath);
                    uploadedUrls.push(publicUrl);
                  }
                  if (uploadedUrls.length > 0) {
                    updateFormData({ documents: [...(formData.documents || []), ...uploadedUrls] });
                    toast.success(`${uploadedUrls.length} document(s) téléchargé(s) avec succès`);
                  }
                }}
              />
              {formData.documents && formData.documents.length > 0 && (
                <ul className="mt-2 list-disc list-inside">
                  {formData.documents.map((url, idx) => (
                    <li key={idx} className="text-sm text-blue-600">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {url.split('/').pop()?.split('_').slice(1).join('_')}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t font-sans">
            <Button type="button" variant="ghost" onClick={() => { resetForm(); onClose(); }} disabled={submitting}>
              {readOnly ? 'Fermer' : 'Annuler'}
            </Button>

            {readOnly && currentTenant && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!formData.agency_id) {
                    toast.error("Impossible d'identifier l'agence");
                    return;
                  }

                  // Ouvrir la fenêtre immédiatement pour éviter le blocage des pop-ups
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) {
                    toast.error("Pop-up bloqué. Veuillez autoriser les pop-ups pour imprimer.");
                    return;
                  }

                  printWindow.document.write('<div style="font-family: Arial; padding: 20px;">Chargement du contrat en cours...</div>');

                  try {
                    const fullAgency = await dbService.agencies.getById(formData.agency_id);
                    if (fullAgency && currentTenant) {
                      printWindow.document.body.innerHTML = '';
                      await OHADAContractGenerator.printContract(formData, fullAgency, currentTenant, currentProperty, printWindow);
                    } else {
                      printWindow.close();
                      toast.error("Impossible de récupérer les informations de l'agence ou du locataire");
                    }
                  } catch (error) {
                    printWindow.close();
                    console.error("Print error", error);
                    toast.error("Erreur lors de l'impression");
                  }
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimer le contrat
              </Button>
            )}

            {!readOnly && (
              <Button
                type="submit"
                disabled={submitting}
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Enregistrement...' : initialData?.id ? 'Mettre à jour' : 'Enregistrer le contrat'}
              </Button>
            )}
          </div>
        </form>
      </Modal>
    );
  }
);