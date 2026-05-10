import React, { useState, useEffect } from 'react';
import { FileText, Plus, Save, Trash2, Info, Copy } from 'lucide-react';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  content: string;
  variables: string[];
}

const TEMPLATE_TYPES = [
  { id: 'bail', name: 'Contrat de Bail' },
  { id: 'mandat', name: 'Mandat de Gestion' },
  { id: 'bail_pro', name: 'Bail Professionnel' },
  { id: 'engagement', name: 'Engagement de Location' },
];

const AVAILABLE_VARIABLES = [
  { tag: '{{agence_nom}}', desc: 'Nom de l\'agence' },
  { tag: '{{agence_adresse}}', desc: 'Adresse de l\'agence' },
  { tag: '{{agence_telephone}}', desc: 'Contact agence' },
  { tag: '{{proprietaire_nom}}', desc: 'Nom complet du propriétaire' },
  { tag: '{{proprietaire_adresse}}', desc: 'Adresse du propriétaire' },
  { tag: '{{locataire_nom}}', desc: 'Nom complet du locataire' },
  { tag: '{{locataire_telephone}}', desc: 'Contact du locataire' },
  { tag: '{{bien_titre}}', desc: 'Titre/Désignation du bien' },
  { tag: '{{bien_adresse}}', desc: 'Localisation précise du bien' },
  { tag: '{{bien_loyer}}', desc: 'Montant du loyer mensuel' },
  { tag: '{{contrat_debut}}', desc: 'Date de début du contrat' },
  { tag: '{{contrat_fin}}', desc: 'Date de fin (si applicable)' },
  { tag: '{{contrat_caution}}', desc: 'Montant du dépôt de garantie' },
];

export const ContractTemplates: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [user?.agency_id]);

  const fetchTemplates = async () => {
    if (!user?.agency_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('agency_id', user.agency_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast.error('Erreur lors du chargement des modèles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newTemplate: Template = {
      id: '',
      name: 'Nouveau Modèle',
      description: '',
      type: 'bail',
      content: 'ENTRE LES SOUSSIGNÉS :\n\nL\'agence {{agence_nom}}, agissant pour le compte du propriétaire {{proprietaire_nom}}...\n\nET\n\nLe locataire {{locataire_nom}}...',
      variables: AVAILABLE_VARIABLES.map(v => v.tag)
    };
    setSelectedTemplate(newTemplate);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate || !user?.agency_id) return;
    setSaving(true);
    try {
      const templateData = {
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        type: selectedTemplate.type,
        content: selectedTemplate.content,
        variables: selectedTemplate.variables,
        agency_id: user.agency_id,
        is_active: true
      };

      if (selectedTemplate.id) {
        const { error } = await supabase
          .from('contract_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);
        if (error) throw error;
        toast.success('Modèle mis à jour');
      } else {
        const { data, error } = await supabase
          .from('contract_templates')
          .insert([templateData])
          .select()
          .single();
        if (error) throw error;
        setSelectedTemplate(data);
        toast.success('Nouveau modèle créé');
      }
      fetchTemplates();
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce modèle définitivement ?')) return;
    try {
      const { error } = await supabase.from('contract_templates').delete().eq('id', id);
      if (error) throw error;
      toast.success('Modèle supprimé');
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        setIsEditing(false);
      }
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const insertVariable = (tag: string) => {
    if (!isEditing || !selectedTemplate) return;
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedTemplate.content;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    setSelectedTemplate({
      ...selectedTemplate,
      content: before + tag + after
    });

    // Reset focus and cursor position after React update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  if (loading) return <div className="flex justify-center p-12"><LoadingSpinner size="lg" color="blue" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left List */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-800">Mes Modèles</h2>
          <button 
            onClick={handleCreateNew}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
            title="Nouveau modèle"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {templates.length === 0 ? (
            <Card className="p-6 text-center text-gray-500 border-dashed border-2">
              Aucun modèle personnalisé. Utilisez les modèles par défaut ou créez-en un.
            </Card>
          ) : (
            templates.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTemplate(t); setIsEditing(false); }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedTemplate?.id === t.id 
                  ? 'bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-500' 
                  : 'bg-white border-gray-100 hover:border-blue-100 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">{t.type}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Editor */}
      <div className="lg:col-span-8">
        {selectedTemplate ? (
          <Card className="flex flex-col h-full min-h-[600px] shadow-xl border-t-4 border-t-blue-600">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex-1">
                {isEditing ? (
                  <input 
                    value={selectedTemplate.name}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, name: e.target.value})}
                    className="text-xl font-black text-gray-900 bg-transparent border-b-2 border-blue-300 focus:border-blue-600 outline-none w-full max-w-md px-1"
                    placeholder="Nom du modèle..."
                  />
                ) : (
                  <h3 className="text-xl font-black text-gray-900">{selectedTemplate.name}</h3>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md font-bold transition-all disabled:opacity-50"
                    >
                      {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
                      Enregistrer
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-bold border border-blue-100"
                    >
                      Modifier
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedTemplate.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {isEditing ? (
                <div className="flex flex-col gap-6 h-full">
                  {/* Variable Picker */}
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-xs font-black text-amber-800 uppercase mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Insérer une variable (cliquez pour insérer)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_VARIABLES.map(v => (
                        <button
                          key={v.tag}
                          onClick={() => insertVariable(v.tag)}
                          className="px-3 py-1.5 bg-white text-gray-700 text-xs font-bold rounded-lg border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all shadow-sm flex items-center gap-1.5"
                          title={v.desc}
                        >
                          <Copy className="w-3 h-3 text-amber-500" />
                          {v.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Contenu du contrat</label>
                    <textarea 
                      id="template-content"
                      value={selectedTemplate.content}
                      onChange={(e) => setSelectedTemplate({...selectedTemplate, content: e.target.value})}
                      className="w-full h-[400px] p-6 font-mono text-sm border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none resize-none leading-relaxed"
                      placeholder="Écrivez votre contrat ici..."
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-8 border border-gray-100 rounded-xl shadow-inner min-h-[500px] overflow-auto prose prose-blue max-w-none">
                  <div className="whitespace-pre-wrap font-serif text-gray-800 leading-loose">
                    {selectedTemplate.content}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 min-h-[600px]">
            <FileText className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Sélectionnez un modèle à éditer ou créez-en un nouveau</p>
          </div>
        )}
      </div>
    </div>
  );
};
