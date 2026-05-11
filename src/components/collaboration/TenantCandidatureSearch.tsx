import React, { useState } from 'react';
import {
  Search, AlertTriangle, CheckCircle, XCircle, Building2,
  Shield, FileText, User, Calendar, Phone, CreditCard, Info
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/config';
import { dbService } from '../../lib/supabase';
import { FintechService } from '../../lib/db/fintechService';
import toast from 'react-hot-toast';

interface CandidatureForm {
  last_name: string;
  first_name: string;
  id_type: 'cni' | 'passport' | 'permis';
  id_number: string;
  birth_date: string;
  phone: string;
  marital_status: 'celibataire' | 'marie' | 'divorce' | 'veuf';
  spouse_name: string;
  profession: string;
  employer: string;
  monthly_income: string;
  previous_agencies: { agency_name: string; from_date: string; to_date: string; reason_leaving: string }[];
  consent_checked: boolean;
}

interface SearchResult {
  id: string;
  redacted_name: string;
  agency_name: string;
  agency_id: string;
  reputation_score: number;
  payment_status: 'bon' | 'irregulier' | 'mauvais';
  contract_count: number;
  last_contract_end: string | null;
}

const LEGAL_DISCLAIMER = `Conformément à la Loi n°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel (République de Côte d'Ivoire), les informations saisies sont traitées dans le cadre strict de la vérification de solvabilité locative. Elles ne seront pas transmises à des tiers non autorisés. L'agence destinataire est responsable du respect de la confidentialité.`;

export const TenantCandidatureSearch: React.FC<{ onCreditUsed?: () => void }> = ({ onCreditUsed }) => {
  const { user, agencyId: authAgencyId } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<'form' | 'results' | 'request'>('form');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [showLegal, setShowLegal] = useState(false);

  const emptyForm: CandidatureForm = {
    last_name: '', first_name: '', id_type: 'cni', id_number: '',
    birth_date: '', phone: '', marital_status: 'celibataire',
    spouse_name: '', profession: '', employer: '', monthly_income: '',
    previous_agencies: [], consent_checked: false,
  };
  const [form, setForm] = useState<CandidatureForm>(emptyForm);

  const setField = (key: keyof CandidatureForm, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── Demandes existantes ───────────────────────────────────────────────────
  React.useEffect(() => {
    if (!authAgencyId) return;
    supabase.from('collaboration_requests').select('*').eq('requester_agency_id', authAgencyId)
      .then(({ data }) => setMyRequests(data || []));
  }, [authAgencyId]);

  // ── Recherche RPC ─────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!form.id_number.trim()) { toast.error('Le numéro de pièce d\'identité est obligatoire'); return; }
    if (!form.consent_checked) { toast.error('Veuillez accepter la clause de confidentialité'); return; }
    if (!authAgencyId) { toast.error('Agence non identifiée'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_tier_reputation_v22', {
        p_search: form.id_number.trim(),
        p_type: 'tenant',
      });
      if (error) throw error;
      setResults(data || []);
      setStep('results');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  // ── Demande d'accès + débit crédit ────────────────────────────────────────
  const handleRequestAccess = async () => {
    if (!user?.id || !authAgencyId || !selectedResult) { toast.error('Session expirée'); return; }

    setRequestingAccess(true);
    try {
      await FintechService.useCollaborationCredit(authAgencyId);

      const { error: reqError } = await supabase.from('collaboration_requests').insert({
        requester_agency_id: authAgencyId,
        target_agency_id: selectedResult.agency_id,
        tier_id: selectedResult.id,
        tier_type: 'tenant',
        requester_id: user.id,
        status: 'pending',
        candidate_form: {
          last_name: form.last_name, first_name: form.first_name,
          id_type: form.id_type, id_number: form.id_number,
          birth_date: form.birth_date, phone: form.phone,
          marital_status: form.marital_status, spouse_name: form.spouse_name,
          profession: form.profession, employer: form.employer,
          monthly_income: form.monthly_income,
          previous_agencies: form.previous_agencies,
        },
      });
      if (reqError) throw reqError;

      // Notifier le directeur de l'agence cible
      const { data: director } = await supabase
        .from('agency_users').select('user_id')
        .eq('agency_id', selectedResult.agency_id).eq('role', 'director').single();

      if (director) {
        await dbService.messages.create({
          sender_id: user.id, receiver_id: director.user_id,
          agency_id: authAgencyId, receiver_agency_id: selectedResult.agency_id,
          subject: `Candidature à la location — Vérification historique`,
          content: `Bonjour,\n\nNous avons un candidat à la location (${form.first_name} ${form.last_name}, ${form.id_type.toUpperCase()} n°${form.id_number}) qui a eu un historique dans votre agence. Nous sollicitons votre retour sur son comportement locatif.\n\nMerci pour votre collaboration.`,
          is_read: false, created_at: new Date().toISOString(),
        });
      }

      toast.success('Demande envoyée ! L\'agence sera notifiée.');
      setStep('form');
      setForm(emptyForm);
      setResults([]);
      setSelectedResult(null);
      onCreditUsed?.();

      const { data } = await supabase.from('collaboration_requests').select('*').eq('requester_agency_id', authAgencyId);
      setMyRequests(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la demande');
    } finally {
      setRequestingAccess(false);
    }
  };

  const addPreviousAgency = () => {
    setForm(prev => ({
      ...prev,
      previous_agencies: [...prev.previous_agencies, { agency_name: '', from_date: '', to_date: '', reason_leaving: '' }],
    }));
  };

  const updatePreviousAgency = (index: number, key: string, value: string) => {
    const updated = [...form.previous_agencies];
    updated[index] = { ...updated[index], [key]: value };
    setForm(prev => ({ ...prev, previous_agencies: updated }));
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' => {
    if (status === 'bon') return 'success';
    if (status === 'irregulier') return 'warning';
    return 'danger';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'bon') return '✅ Bon payeur';
    if (status === 'irregulier') return '⚠️ Payeur irrégulier';
    return '❌ Mauvais payeur';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Formulaire candidature
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 'form') return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-0 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-2xl"><FileText className="h-7 w-7" /></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Candidature à la Location</h2>
            <p className="text-blue-100 text-sm mt-1">
              Vérifiez l'historique locatif d'un candidat via le réseau inter-agences GICO.
              La recherche s'effectue sur la base du numéro de pièce d'identité.
            </p>
          </div>
        </div>
        <button onClick={() => setShowLegal(true)} className="mt-3 flex items-center gap-1 text-xs text-blue-200 hover:text-white underline">
          <Info className="h-3 w-3" /> Clause RGPD / Loi ivoirienne n°2013-450
        </button>
      </Card>

      {/* Formulaire */}
      <Card className="p-6 space-y-6">
        <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" /> Identité du Candidat
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nom *" value={form.last_name} onChange={e => setField('last_name', e.target.value)} placeholder="NOM DE FAMILLE" required />
          <Input label="Prénom(s) *" value={form.first_name} onChange={e => setField('first_name', e.target.value)} placeholder="Prénom(s)" required />
        </div>

        {/* Pièce d'identité */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Type de pièce *</label>
            <select value={form.id_type} onChange={e => setField('id_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium">
              <option value="cni">Carte Nationale d'Identité (CNI)</option>
              <option value="passport">Passeport</option>
              <option value="permis">Permis de Conduire</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Input label="Numéro de pièce d'identité *" value={form.id_number}
              onChange={e => setField('id_number', e.target.value.toUpperCase())}
              placeholder="Ex: CI0123456789" required />
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> Ce champ est le seul utilisé pour la recherche inter-agences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Date de naissance</label>
            <input type="date" value={form.birth_date} onChange={e => setField('birth_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <Input label="Téléphone" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+225 XX XX XX XX XX" />
        </div>

        {/* Situation familiale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Situation matrimoniale</label>
            <select value={form.marital_status} onChange={e => setField('marital_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="celibataire">Célibataire</option>
              <option value="marie">Marié(e)</option>
              <option value="divorce">Divorcé(e)</option>
              <option value="veuf">Veuf/Veuve</option>
            </select>
          </div>
          {form.marital_status === 'marie' && (
            <Input label="Nom du conjoint" value={form.spouse_name} onChange={e => setField('spouse_name', e.target.value)} placeholder="NOM Prénom du conjoint" />
          )}
        </div>

        {/* Situation professionnelle */}
        <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2 pt-2 border-t">
          <Building2 className="h-5 w-5 text-indigo-600" /> Situation Professionnelle
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Profession" value={form.profession} onChange={e => setField('profession', e.target.value)} placeholder="Ex: Ingénieur, Commerçant..." />
          <Input label="Employeur / Entreprise" value={form.employer} onChange={e => setField('employer', e.target.value)} placeholder="Nom de l'employeur" />
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Revenu mensuel estimé (FCFA)</label>
            <input type="number" value={form.monthly_income} onChange={e => setField('monthly_income', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 500000" min={0} />
          </div>
        </div>

        {/* Passages dans d'autres agences */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" /> Historique dans d'autres agences
            </h3>
            <button onClick={addPreviousAgency}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
              + Ajouter une agence
            </button>
          </div>
          {form.previous_agencies.length === 0 && (
            <p className="text-sm text-gray-400 italic">Aucune agence précédente renseignée. Cliquez sur "Ajouter" si le candidat a été locataire ailleurs.</p>
          )}
          {form.previous_agencies.map((ag, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-xl border">
              <input value={ag.agency_name} onChange={e => updatePreviousAgency(i, 'agency_name', e.target.value)}
                placeholder="Nom de l'agence" className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="date" value={ag.from_date} onChange={e => updatePreviousAgency(i, 'from_date', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" title="Date d'entrée" />
              <input type="date" value={ag.to_date} onChange={e => updatePreviousAgency(i, 'to_date', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" title="Date de sortie" />
              <input value={ag.reason_leaving} onChange={e => updatePreviousAgency(i, 'reason_leaving', e.target.value)}
                placeholder="Motif de départ" className="col-span-2 md:col-span-4 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          ))}
        </div>

        {/* Consentement RGPD */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.consent_checked} onChange={e => setField('consent_checked', e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300" />
            <span className="text-sm text-amber-900">
              <span className="font-bold">Déclaration de consentement :</span> Le candidat a été informé et a consenti à la vérification de son historique locatif conformément à la{' '}
              <button onClick={() => setShowLegal(true)} className="underline font-bold text-blue-700">Loi n°2013-450</button>. Je certifie que ces informations sont exactes et collectées dans un cadre légal.
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => setForm(emptyForm)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900">
            Réinitialiser
          </button>
          <Button onClick={handleSearch} disabled={loading || !form.id_number.trim() || !form.consent_checked}>
            {loading ? 'Recherche en cours...' : <><Search className="h-4 w-4 mr-2" />Vérifier le candidat</>}
          </Button>
        </div>
      </Card>

      {/* Modal Légal */}
      <Modal isOpen={showLegal} onClose={() => setShowLegal(false)} title="Cadre légal — Protection des données" size="md">
        <div className="space-y-4 text-sm text-gray-700">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <p className="font-black text-blue-900 mb-2">🇨🇮 Loi n°2013-450 du 19 juin 2013 — République de Côte d'Ivoire</p>
            <p>{LEGAL_DISCLAIMER}</p>
          </div>
          <ul className="space-y-2 list-disc list-inside text-gray-600">
            <li>Seul le <strong>score comportemental</strong> (bon/irrégulier/mauvais) est partagé, jamais les détails financiers</li>
            <li>Les données sont conservées <strong>5 ans maximum</strong> après la fin du contrat</li>
            <li>Le locataire dispose d'un <strong>droit d'accès et de rectification</strong></li>
            <li>Toute utilisation abusive expose l'agence à des sanctions de l'<strong>ARTCI</strong></li>
          </ul>
          <Button onClick={() => setShowLegal(false)} className="w-full">J'ai compris</Button>
        </div>
      </Modal>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Résultats
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === 'results') return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-gray-900">Résultats — Pièce : {form.id_number}</h2>
        <button onClick={() => setStep('form')} className="text-sm font-bold text-blue-600 hover:underline">← Nouvelle recherche</button>
      </div>

      {results.length === 0 ? (
        <Card className="p-10 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-bold text-gray-700">Aucun historique trouvé</h3>
          <p className="text-gray-500 mt-2 text-sm">Ce candidat n'a pas de dossier dans les agences partenaires GICO.</p>
          <Button onClick={() => setStep('form')} className="mt-6" variant="outline">Retour</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {results.map(result => {
            const existingRequest = myRequests.find(r => r.tier_id === result.id);
            return (
              <Card key={result.id} className="p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900">{result.redacted_name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {result.agency_name}
                      </p>
                      <p className="text-xs text-gray-400">{result.contract_count} contrat(s) enregistré(s)</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={getStatusVariant(result.payment_status)} size="sm">
                      {getStatusLabel(result.payment_status)}
                    </Badge>
                    {existingRequest?.status === 'approved' ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">✅ Accès accordé</span>
                    ) : existingRequest?.status === 'pending' ? (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">⏳ Demande en attente</span>
                    ) : (
                      <Button size="sm" onClick={() => { setSelectedResult(result); setStep('request'); }}>
                        Demander le dossier complet
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Confirmation demande + débit crédit
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <button onClick={() => setStep('results')} className="text-sm font-bold text-blue-600 hover:underline">← Retour aux résultats</button>

      <Card className="p-6 space-y-5">
        <h2 className="text-xl font-black text-gray-900">Confirmer la demande d'accès</h2>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 border">
          <p className="text-sm"><span className="font-bold text-gray-600">Candidat :</span> {form.first_name} {form.last_name}</p>
          <p className="text-sm"><span className="font-bold text-gray-600">N° pièce :</span> {form.id_type.toUpperCase()} — {form.id_number}</p>
          <p className="text-sm"><span className="font-bold text-gray-600">Agence cible :</span> {selectedResult?.agency_name}</p>
          <p className="text-sm"><span className="font-bold text-gray-600">Score actuel :</span> {selectedResult ? getStatusLabel(selectedResult.payment_status) : ''}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🎫</span>
          <div>
            <p className="text-sm font-black text-amber-900">1 crédit de collaboration sera débité</p>
            <p className="text-xs text-amber-700">L'agence partenaire sera notifiée et devra approuver votre demande.</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800">
          <p className="font-bold mb-1">📋 Données transmises à l'agence partenaire :</p>
          <p>Nom, prénom, numéro de pièce, situation matrimoniale — <span className="font-bold">aucune donnée financière</span> ne sera échangée dans ce message, conformément à la loi.</p>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t">
          <Button variant="ghost" onClick={() => setStep('results')} disabled={requestingAccess}>Annuler</Button>
          <Button onClick={handleRequestAccess} disabled={requestingAccess}>
            {requestingAccess ? 'Envoi en cours...' : 'Confirmer la demande'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
