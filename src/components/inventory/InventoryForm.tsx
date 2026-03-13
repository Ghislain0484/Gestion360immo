import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Home, User, CheckCircle, Plus, Trash2, 
  Camera, Droplets, Zap, Key, Save, ChevronRight, ClipboardCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Inventory, Property, Tenant, Contract } from '../../types/db';
import { dbService } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface InventoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Inventory>) => Promise<void>;
  initialData?: Partial<Inventory>;
  isLoading?: boolean;
}

const CONDITIONS = [
  { value: 'neuf', label: 'Neuf', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'bon', label: 'Bon état', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'usage', label: 'Usage / Moyen', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'mauvais', label: 'Mauvais état', color: 'text-rose-600 bg-rose-50 border-rose-200' },
] as const;

export const InventoryForm: React.FC<InventoryFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Inventory>>({
    agency_id: user?.agency_id || '',
    type: 'entry',
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
    rooms: [],
    meter_readings: {
      electricity: { index: 0 },
      water: { index: 0 }
    },
    keys_count: 0,
    ...initialData
  });

  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch essential data
  useEffect(() => {
    if (isOpen && user?.agency_id) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          const [props, ts, cs] = await Promise.all([
            dbService.properties.getAll({ agency_id: user.agency_id, limit: 1000 }),
            dbService.tenants.getAll({ agency_id: user.agency_id, limit: 1000 }),
            dbService.contracts.getAll({ agency_id: user.agency_id, limit: 1000 })
          ]);
          setProperties(props);
          setTenants(ts);
          setContracts(cs);

          // If editing and no rooms, try to pre-fill rooms from property
          if (formData.property_id && (!formData.rooms || formData.rooms.length === 0)) {
            const prop = props.find(p => p.id === formData.property_id);
            if (prop?.rooms) {
              setFormData(prev => ({
                ...prev,
                rooms: prop.rooms.map(r => ({
                  name: r.nom || (r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) : 'Pièce'),
                  elements: [
                    { name: 'Murs', condition: 'bon' },
                    { name: 'Plafond', condition: 'bon' },
                    { name: 'Sol', condition: 'bon' },
                    { name: 'Menuiserie', condition: 'bon' },
                    { name: 'Serrure', condition: 'bon' },
                  ]
                }))
              }));
            }
          }
        } catch (error) {
          toast.error('Erreur lors du chargement des données');
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    }
  }, [isOpen, user?.agency_id]);

  const activeContract = useMemo(() => {
    if (!formData.property_id) return null;
    return contracts.find(c => c.property_id === formData.property_id && c.status === 'active' && c.type === 'location');
  }, [formData.property_id, contracts]);

  const propertyTenants = useMemo(() => {
    if (!formData.property_id) return tenants;
    // Current property active tenant
    const contract = contracts.find(c => c.property_id === formData.property_id && c.status === 'active');
    if (contract) {
      return tenants.filter(t => t.id === contract.tenant_id);
    }
    return tenants;
  }, [formData.property_id, tenants, contracts]);

  const tenantProperties = useMemo(() => {
    if (!formData.tenant_id) return properties;
    const tenantContracts = contracts.filter(c => c.tenant_id === formData.tenant_id && c.status === 'active');
    if (tenantContracts.length > 0) {
      const propIds = tenantContracts.map(c => c.property_id);
      return properties.filter(p => propIds.includes(p.id));
    }
    return properties;
  }, [formData.tenant_id, properties, contracts]);

  useEffect(() => {
    if (activeContract && !formData.tenant_id) {
      setFormData(prev => ({ ...prev, tenant_id: activeContract.tenant_id, contract_id: activeContract.id }));
    }
  }, [activeContract]);

  const handleAddRoom = () => {
    setFormData(prev => ({
      ...prev,
      rooms: [...(prev.rooms || []), { 
        name: 'Nouvelle pièce', 
        elements: [{ name: 'Murs', condition: 'bon' }] 
      }]
    }));
  };

  const handleRemoveRoom = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rooms: (prev.rooms || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddElement = (roomIndex: number) => {
    setFormData(prev => {
      const newRooms = [...(prev.rooms || [])];
      newRooms[roomIndex].elements.push({ name: '', condition: 'bon' });
      return { ...prev, rooms: newRooms };
    });
  };

  const handleRemoveElement = (roomIndex: number, elementIndex: number) => {
    setFormData(prev => {
      const newRooms = [...(prev.rooms || [])];
      newRooms[roomIndex].elements = newRooms[roomIndex].elements.filter((_, i) => i !== elementIndex);
      return { ...prev, rooms: newRooms };
    });
  };

  const updateElement = (roomIndex: number, elementIndex: number, field: string, value: any) => {
    setFormData(prev => {
      const newRooms = [...(prev.rooms || [])];
      newRooms[roomIndex].elements[elementIndex] = {
        ...newRooms[roomIndex].elements[elementIndex],
        [field]: value
      };
      return { ...prev, rooms: newRooms };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_id) {
      toast.error('Veuillez sélectionner un bien');
      setCurrentStep(1);
      return;
    }
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      toast.error('Erreur lors de l’enregistrement');
    }
  };

  const steps = [
    { num: 1, label: 'Général', icon: ClipboardCheck },
    { num: 2, label: 'Pièces', icon: Home },
    { num: 3, label: 'Technique', icon: Zap },
    { num: 4, label: 'Validation', icon: CheckCircle },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? "Modifier l'état des lieux" : "Nouvel état des lieux professionnel"}
      size="xl"
    >
      <div className="flex flex-col h-full bg-slate-50/50 -m-6 rounded-b-xl">
        {/* Progress Tracker */}
        <div className="bg-white border-b px-8 py-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((s, idx) => (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => setCurrentStep(s.num)}
                  disabled={idx + 1 > currentStep && !formData.property_id}
                  className="flex flex-col items-center group relative cursor-pointer disabled:cursor-not-allowed"
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                    currentStep === s.num ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100" :
                    currentStep > s.num ? "bg-emerald-500 border-emerald-500 text-white" :
                    "bg-white border-slate-200 text-slate-400"
                  )}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <span className={clsx(
                    "text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors",
                    currentStep === s.num ? "text-blue-600" : "text-slate-400"
                  )}>{s.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={clsx(
                    "flex-1 h-0.5 mx-4 transition-colors duration-500",
                    currentStep > s.num ? "bg-emerald-500" : "bg-slate-200"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-8">
          {/* STEP 1: GENERAL INFO */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-slate-100 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Home className="w-4 h-4 text-blue-500" />
                    Classification du constat
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type d'état des lieux</label>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, type: 'entry' }))}
                          className={clsx(
                            "py-2 rounded-md text-sm font-bold transition-all",
                            formData.type === 'entry' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                          )}
                        >
                          Entrée
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, type: 'exit' }))}
                          className={clsx(
                            "py-2 rounded-md text-sm font-bold transition-all",
                            formData.type === 'exit' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"
                          )}
                        >
                          Sortie
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date du constat *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          required
                          value={formData.date?.split('T')[0]}
                          onChange={e => setFormData(p => ({ ...p, date: new Date(e.target.value).toISOString() }))}
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-slate-100 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    Parties prenantes
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Propriété *</label>
                      <select
                        required
                        value={formData.property_id || ''}
                        onChange={async e => {
                          const id = e.target.value;
                          const prop = properties.find(p => p.id === id);
                          const relatedContract = contracts.find(c => c.property_id === id && c.status === 'active');
                          
                          setFormData(p => ({ 
                            ...p, 
                            property_id: id,
                            tenant_id: relatedContract?.tenant_id || p.tenant_id, // Auto-select tenant if active contract exists
                            contract_id: relatedContract?.id || p.contract_id,
                            rooms: prop?.rooms ? prop.rooms.map(r => ({
                                name: r.nom || (r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) : 'Pièce'),
                                elements: [
                                  { name: 'Murs', condition: 'bon' },
                                  { name: 'Plafond', condition: 'bon' },
                                  { name: 'Sol', condition: 'bon' },
                                  { name: 'Menuiserie', condition: 'bon' },
                                  { name: 'Serrure', condition: 'bon' },
                                ]
                              })) : p.rooms
                          }));
                        }}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="">Sélectionner un bien</option>
                        {tenantProperties.map(p => (
                          <option key={p.id} value={p.id}>{p.title} - {p.location.quartier}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Locataire</label>
                      <select
                        value={formData.tenant_id || ''}
                        onChange={e => {
                          const tId = e.target.value;
                          const relatedContract = contracts.find(c => c.tenant_id === tId && c.status === 'active');
                          
                          setFormData(p => ({ 
                            ...p, 
                            tenant_id: tId,
                            property_id: relatedContract?.property_id || p.property_id, // Auto-select property if tenant has active contract
                            contract_id: relatedContract?.id || p.contract_id
                          }));

                          // If we just auto-selected a property, load its rooms
                          if (relatedContract?.property_id) {
                            const prop = properties.find(p => p.id === relatedContract.property_id);
                            if (prop?.rooms) {
                              setFormData(p => ({
                                ...p,
                                rooms: prop.rooms.map(r => ({
                                  name: r.nom || (r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) : 'Pièce'),
                                  elements: [
                                    { name: 'Murs', condition: 'bon' },
                                    { name: 'Plafond', condition: 'bon' },
                                    { name: 'Sol', condition: 'bon' },
                                    { name: 'Menuiserie', condition: 'bon' },
                                    { name: 'Serrure', condition: 'bon' },
                                  ]
                                }))
                              }));
                            }
                          }
                        }}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="">Sélectionner le locataire</option>
                        {propertyTenants.map(t => (
                          <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                        ))}
                      </select>
                      {activeContract && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Locataire actuel détecté via le bail en cours</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* STEP 2: ROOMS & ELEMENTS */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn pb-20">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Description détaillée par pièce</h3>
                <Button type="button" size="sm" onClick={handleAddRoom} className="bg-blue-600 text-white hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Ajouter une pièce
                </Button>
              </div>

              {(formData.rooms || []).map((room, rIdx) => (
                <Card key={rIdx} className="overflow-hidden border-slate-200 shadow-sm mb-4">
                  <div className="bg-slate-50 border-b px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-white border shadow-sm flex items-center justify-center text-blue-600 font-bold text-sm">
                        {rIdx + 1}
                      </div>
                      <input
                        type="text"
                        value={room.name}
                        onChange={e => {
                          const newRooms = [...(formData.rooms || [])];
                          newRooms[rIdx].name = e.target.value;
                          setFormData(p => ({ ...p, rooms: newRooms }));
                        }}
                        placeholder="Nom de la pièce..."
                        className="bg-transparent font-bold text-slate-900 border-none outline-none focus:ring-0 p-0 text-sm w-full max-w-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoom(rIdx)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4 space-y-4">
                    {room.elements.map((el, eIdx) => (
                      <div key={eIdx} className="flex flex-col md:flex-row items-start gap-4 p-3 bg-white rounded-xl border border-slate-100">
                        <div className="flex-1 w-full space-y-2">
                          <input
                            type="text"
                            value={el.name}
                            onChange={e => updateElement(rIdx, eIdx, 'name', e.target.value)}
                            placeholder="Élément (ex: Murs, Plafond...)"
                            className="w-full text-xs font-bold text-slate-700 uppercase border-b border-transparent focus:border-blue-400 outline-none pb-1 transition-all"
                          />
                          <textarea
                            value={el.comment || ''}
                            onChange={e => updateElement(rIdx, eIdx, 'comment', e.target.value)}
                            placeholder="Observations, marques, dégradations éventuelles..."
                            className="w-full text-sm text-slate-600 border-none bg-slate-50 rounded-lg p-2 outline-none focus:ring-1 focus:ring-blue-200 h-16 resize-none"
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-48">
                          <div className="flex flex-wrap gap-1">
                            {CONDITIONS.map(c => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => updateElement(rIdx, eIdx, 'condition', c.value)}
                                className={clsx(
                                  "px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex-1",
                                  el.condition === c.value ? c.color : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                                )}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="flex items-center justify-center gap-2 py-1.5 border border-dashed border-slate-300 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-all"
                          >
                            <Camera className="w-3 h-3 text-blue-500" />
                            Ajouter photos
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveElement(rIdx, eIdx)}
                          className="self-center p-1 text-slate-300 hover:text-rose-500"
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddElement(rIdx)}
                      className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all bg-slate-50/50"
                    >
                      + Ajouter un élément dans cette pièce
                    </button>
                  </div>
                </Card>
              ))}
              
              {(!formData.rooms || formData.rooms.length === 0) && !loadingData && (
                <div className="text-center py-20 bg-white border border-dashed rounded-2xl">
                  <ClipboardCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Commencez par ajouter une pièce pour décrire son état.</p>
                  <Button type="button" onClick={handleAddRoom} className="mt-4 bg-blue-600 text-white">Ajouter une pièce</Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: TECHNIQUE */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-b pb-3">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Relevés des compteurs
                  </h3>
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-3 mb-3">
                        <Zap className="w-5 h-5 text-amber-600" />
                        <span className="font-bold text-slate-900 text-sm">Électricité (CIE)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Index du compteur"
                          type="number"
                          value={formData.meter_readings?.electricity?.index || 0}
                          onChange={e => setFormData(p => ({
                            ...p,
                            meter_readings: {
                              ...p.meter_readings,
                              electricity: { ...(p.meter_readings?.electricity || { index: 0 }), index: parseFloat(e.target.value) }
                            }
                          }))}
                        />
                        <Input
                          label="Numéro du compteur"
                          value={formData.meter_readings?.electricity?.number || ''}
                          onChange={e => setFormData(p => ({
                            ...p,
                            meter_readings: {
                              ...p.meter_readings,
                              electricity: { ...(p.meter_readings?.electricity || { index: 0 }), number: e.target.value }
                            }
                          }))}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-3 mb-3">
                        <Droplets className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-slate-900 text-sm">Eau (SODECI)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Index du compteur"
                          type="number"
                          value={formData.meter_readings?.water?.index || 0}
                          onChange={e => setFormData(p => ({
                            ...p,
                            meter_readings: {
                              ...p.meter_readings,
                              water: { ...(p.meter_readings?.water || { index: 0 }), index: parseFloat(e.target.value) }
                            }
                          }))}
                        />
                        <Input
                          label="Numéro du compteur"
                          value={formData.meter_readings?.water?.number || ''}
                          onChange={e => setFormData(p => ({
                            ...p,
                            meter_readings: {
                              ...p.meter_readings,
                              water: { ...(p.meter_readings?.water || { index: 0 }), number: e.target.value }
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 border-b pb-3">
                    <Key className="w-4 h-4 text-indigo-500" />
                    Remise des clés
                  </h3>
                  <div className="space-y-4">
                    <Input
                      label="Nombre total de clés remises"
                      type="number"
                      value={formData.keys_count || 0}
                      onChange={e => setFormData(p => ({ ...p, keys_count: parseInt(e.target.value) }))}
                    />
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Détails des clés / badges</p>
                      <textarea
                        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                        placeholder="Ex: 2 clés portail, 3 clés porte principale, 1 badge ascenseur..."
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* STEP 4: VALIDATION */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn pb-10">
              <Card className="p-8 border-slate-200 shadow-xl bg-white">
                <div className="text-center max-w-md mx-auto mb-8">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
                    <Save className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Validation & Conclusion</h3>
                  <p className="text-sm text-slate-500 mt-2">Vérifiez les points suivants avant d'enregistrer le constat définitif.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Commentaires de fin de constat</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Résumer l'état général, noter les réserves ou les accords particuliers..."
                    />
                  </div>

                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Statut de l'inventaire</p>
                      <p className="text-xs text-slate-500">Un document signé ne pourra plus être modifié.</p>
                    </div>
                    <select
                      value={formData.status}
                      onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}
                      className="bg-white px-4 py-2 border rounded-lg text-sm font-bold shadow-sm outline-none"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="completed">Terminé (Prêt pour signature)</option>
                      <option value="signed">Signé & Verrouillé</option>
                    </select>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-center gap-3">
                  <Home className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">BIEN</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{properties.find(p => p.id === formData.property_id)?.title || '...'}</p>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">LOCATAIRE</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{tenants.find(t => t.id === formData.tenant_id)?.first_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">DATE</p>
                    <p className="text-xs font-bold text-slate-700">{new Date(formData.date || '').toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="bg-white border-t px-8 py-5 rounded-b-xl">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-6"
            >
              Précédent
            </Button>
            
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={onClose} className="text-slate-500">Annuler</Button>
              {currentStep < 4 ? (
                <Button 
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && !formData.property_id) {
                      toast.error('Sélectionnez d’abord un bien');
                      return;
                    }
                    setCurrentStep(prev => prev + 1);
                  }}
                  className="bg-blue-600 text-white px-8 hover:bg-blue-700"
                >
                  Continuer <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isLoading || !formData.property_id}
                  className="bg-emerald-600 text-white px-10 hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                >
                  {isLoading ? 'Enregistrement...' : 'Finaliser le constat'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
