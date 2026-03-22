import React, { useState } from 'react';
import { Download, CheckCircle2, FileText, Layout, Building2, Users as UsersIcon, Wallet, Loader2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { dbService } from '../../../lib/supabase';
import { PdfReportService, ReportSection } from '../../../utils/PdfReportService';
import { toast } from 'react-hot-toast';

interface MultiSectionReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MultiSectionReportModal: React.FC<MultiSectionReportModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedSections, setSelectedSections] = useState<string[]>(['finance', 'properties', 'tenants']);

    const toggleSection = (id: string) => {
        setSelectedSections(prev => 
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        if (selectedSections.length === 0) {
            toast.error('Veuillez sélectionner au moins une section');
            return;
        }

        setIsGenerating(true);
        try {
            const sections: ReportSection[] = [];
            const agencyId = user?.agency_id;

            if (selectedSections.includes('finance')) {
                // Fetch basic finance stats for current month
                const receipts = await dbService.rentReceipts.getAll({ agency_id: agencyId });
                const totalIncome = (receipts as any[]).reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
                
                sections.push({
                    title: 'RÉSUMÉ FINANCIER (CAISSE)',
                    type: 'stats',
                    data: [],
                    summary: [
                        { label: 'Total Encaissé', value: `${totalIncome.toLocaleString()} FCFA` },
                        { label: 'Transactions', value: receipts.length }
                    ]
                });
            }

            if (selectedSections.includes('properties')) {
                const properties = await dbService.properties.getAll({ agency_id: agencyId });
                sections.push({
                    title: 'INVENTAIRE DES BIENS',
                    type: 'table',
                    data: properties.map(p => ({
                        ref: p.business_id,
                        title: p.title,
                        type: p.details?.type || 'N/A',
                        status: p.is_available ? 'Libre' : 'Occupé',
                        price: `${(p.monthly_rent || 0).toLocaleString()} FCFA`
                    })),
                    columns: [
                        { header: 'Réf', dataKey: 'ref' },
                        { header: 'Désignation', dataKey: 'title' },
                        { header: 'Type', dataKey: 'type' },
                        { header: 'Statut', dataKey: 'status' },
                        { header: 'Prix', dataKey: 'price' }
                    ]
                });
            }

            if (selectedSections.includes('tenants')) {
                const tenants = await dbService.tenants.getAll({ agency_id: agencyId });
                sections.push({
                    title: 'LISTE DES LOCATAIRES',
                    type: 'table',
                    data: tenants.map(t => ({
                        name: `${t.first_name} ${t.last_name}`,
                        phone: t.phone,
                        status: t.payment_status === 'bon' ? 'Bon Payeur' : 'Inconnu'
                    })),
                    columns: [
                        { header: 'Nom & Prénoms', dataKey: 'name' },
                        { header: 'Téléphone', dataKey: 'phone' },
                        { header: 'Statut Paiement', dataKey: 'status' }
                    ]
                });
            }

            await PdfReportService.generateCombinedReport({
                agencyId,
                title: 'Rapport d\'Activité Consolidé',
                subtitle: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
                sections
            });

            toast.success('Rapport généré avec succès');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors de la génération du rapport');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Générateur de Rapport Multi-Section" size="lg">
            <div className="p-6 space-y-6">
                <div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">CONTENU DU RAPPORT</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { id: 'finance', label: 'Résumé Financier', desc: 'Encaissements et solde global', icon: Wallet },
                            { id: 'properties', label: 'Parc Immobilier', desc: 'Listing complet et statuts', icon: Building2 },
                            { id: 'tenants', label: 'Registre Locataires', desc: 'Coordonnées et statuts de paiement', icon: UsersIcon },
                            { id: 'crm', label: 'Synthèse CRM', desc: 'Fidélité et séjours (Modular)', icon: FileText },
                        ].map((section) => (
                            <div 
                                key={section.id}
                                onClick={() => toggleSection(section.id)}
                                className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${
                                    selectedSections.includes(section.id) 
                                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    selectedSections.includes(section.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    <section.icon size={24} />
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-black text-[10px] uppercase text-slate-800">{section.label}</h5>
                                    <p className="text-[10px] text-slate-400 font-bold leading-tight">{section.desc}</p>
                                </div>
                                {selectedSections.includes(section.id) && (
                                    <CheckCircle2 size={16} className="text-indigo-600" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <Card className="p-4 bg-amber-50 border-amber-100">
                    <div className="flex gap-3">
                        <Layout className="text-amber-600 flex-shrink-0" size={18} />
                        <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed">
                            Ce rapport sera généré au format PDF avec l'en-tête et les couleurs de votre agence. Il regroupe toutes les données sélectionnées en un seul document structuré.
                        </p>
                    </div>
                </Card>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>
                        Annuler
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleGenerate} 
                        disabled={isGenerating || selectedSections.length === 0}
                        leftIcon={isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                    >
                        {isGenerating ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER LE RAPPORT PDF'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
