import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Download, ArrowRightLeft, Wallet, Eye, X, Printer, Edit, Trash2, Share2 } from 'lucide-react';
import { supabase, dbService } from '../../lib/supabase';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import { useAuth } from '../../contexts/AuthContext';
import { useDemoMode } from '../../contexts/DemoContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { useCanDelete } from '../../hooks/useCanDelete';
import { Tabs } from '../ui/Tabs';
import { FilterBar } from '../shared/FilterBar';
import { NewTransactionModal } from './NewTransactionModal';
import { PayoutModal } from './PayoutModal';
import { TenantCollectionModal } from './TenantCollectionModal';
import { CaisseMetrics } from './CaisseMetrics';
import { fetchCaisseData, Transaction, CaisseFilters, TRANSACTION_CATEGORIES } from './caisseService';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { getAgencyBranding, renderPDFHeader, renderPDFFooter } from '../../utils/agencyBranding';
import { printReceiptHTML, downloadReceiptPDF } from '../../utils/receiptActions';
import { PaymentLinkModal } from './PaymentLinkModal';

interface Owner {
    id: string;
    business_id?: string;
    first_name: string;
    last_name: string;
}

export const CaissePage: React.FC = () => {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, agencies, agencyId } = useAuth();
    const { isDemoMode } = useDemoMode();

    const currentAgency = agencies.find(a => a.agency_id === agencyId);
    const enabledModules = currentAgency?.enabled_modules || ['dashboard', 'properties', 'owners', 'tenants', 'contracts', 'caisse', 'etats-des-lieux', 'travaux'];
    const hasTraditionalRealEstate = enabledModules.some(m => ['properties', 'owners', 'tenants', 'contracts'].includes(m));
    const hasHotel = enabledModules.includes('hotel');
    const hasResidences = enabledModules.includes('residences');


    const [activeTab, setActiveTab] = useState('journal');
    const [owners, setOwners] = useState<Owner[]>([]);
    const canDelete = useCanDelete();
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Owner Balance Component
    const OwnerBalanceBadge: React.FC<{ ownerId: string }> = ({ ownerId }) => {
        const [balance, setBalance] = useState<number>(0);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            const fetchBalance = async () => {
                if (isDemoMode) {
                    setBalance(Math.floor(Math.random() * 5000000) + 1000000);
                    setLoading(false);
                    return;
                }
                const { data: receipts } = await supabase.from('rent_receipts').select('owner_payment, total_amount, contract_id, property_id').eq('owner_id', ownerId);
                const { data: manualTrans } = await supabase.from('modular_transactions')
                    .select('amount, category, type, description, related_property_id')
                    .eq('related_owner_id', ownerId);
                const { data: contracts } = await supabase.from('contracts').select('id, property_id, commission_rate').eq('status', 'active');
                const { data: maintenance } = await supabase.from('tickets').select('cost').eq('owner_id', ownerId).eq('charge_to', 'owner').eq('status', 'resolved');
                
                const getCommissionRate = (contractId?: string, propertyId?: string) => {
                    if (contractId && contracts) {
                        const contract = contracts.find(c => c.id === contractId);
                        if (contract?.commission_rate !== undefined) return contract.commission_rate;
                    }
                    if (propertyId && contracts) {
                        const contract = contracts.find(c => c.property_id === propertyId);
                        if (contract?.commission_rate !== undefined) return contract.commission_rate;
                    }
                    return 10;
                };

                const earnedFromReceipts = receipts?.reduce((s, r) => {
                    const commRate = getCommissionRate(r.contract_id, r.property_id);
                    const ownerPart = Number(r.owner_payment) || ((Number(r.total_amount) || 0) * (1 - commRate / 100));
                    return s + ownerPart;
                }, 0) || 0;
                
                // Add modular transactions (Rent)
                const earnedFromManual = manualTrans?.reduce((s, t) => {
                    if (t.type === 'debit') return s; // Skip payouts here
                    if (t.category === 'rent_payment') {
                        // Try to parse [Part Proprio: XXX] from description (newly added in TenantCollectionModal)
                        const match = t.description?.match(/\[Part Proprio:\s*(\d+\.?\d*)\]/);
                        if (match) return s + Number(match[1]);
                        // Fallback: dynamic commission
                        const commRate = getCommissionRate(undefined, t.related_property_id);
                        return s + (Number(t.amount) * (1 - commRate / 100));
                    }
                    return s;
                }, 0) || 0;

                const paid = manualTrans?.filter(t => t.category === 'owner_payout' && t.type === 'debit')
                    .reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0;
                    
                const repairs = maintenance?.reduce((s, m) => s + (Number(m.cost) || 0), 0) || 0;
                
                setBalance(earnedFromReceipts + earnedFromManual - paid - repairs);
                setLoading(false);
            };
            fetchBalance();
        }, [ownerId]);

        if (loading) return <div className="h-4 w-12 bg-gray-100 animate-pulse rounded"></div>;
        return (
            <span className={clsx(
                "font-bold",
                balance > 0 ? "text-indigo-600" : "text-gray-400"
            )}>
                {balance.toLocaleString('fr-FR')} FCFA
            </span>
        );
    };

    const [filters, setFilters] = useState({
        ownerId: searchParams.get('proprietaire') || 'all',
        period: searchParams.get('periode') || 'all', // Defaults to 'all' for complete visibility
        type: 'all',
        category: 'all',
    });

    const handleFilterChange = (id: string, value: any) => {
        setFilters(prev => ({ ...prev, [id]: value }));
        if (id === 'ownerId') {
            if (value !== 'all') searchParams.set('proprietaire', value);
            else searchParams.delete('proprietaire');
            setSearchParams(searchParams);
        }
        if (id === 'period') {
            if (value) searchParams.set('periode', value);
            else searchParams.delete('periode');
            setSearchParams(searchParams);
        }
    };

    const clearFilters = () => {
        setFilters({
            ownerId: 'all',
            period: 'all',
            type: 'all',
            category: 'all',
        });
        searchParams.delete('proprietaire');
        searchParams.delete('periode');
        setSearchParams(searchParams);
    };

    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [selectedOwnerForPayout, setSelectedOwnerForPayout] = useState<Owner | null>(null);
    const [transactionToEdit, setTransactionToEdit] = useState<any>(null);

    // Payment Link Share states
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [selectedReceiptForLink, setSelectedReceiptForLink] = useState<any>(null);
    const [linkModalData, setLinkModalData] = useState({
        tenantName: '',
        tenantPhone: '',
        amount: 0,
        periodName: ''
    });

    const MONTHS_FR = [
        '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    const handleSharePaymentLink = async (t: Transaction) => {
        if (t.source !== 'rent_receipt' || !t.details) return;
        
        const receiptDetail = t.details;
        const tenantId = receiptDetail.tenant_id;
        
        const toastId = toast.loading('Chargement du contact locataire...');
        try {
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('phone, first_name, last_name')
                .eq('id', tenantId)
                .single();
                
            if (!tenantData) throw new Error("Impossible de charger le contact du locataire");
            
            const tenantName = `${tenantData.first_name} ${tenantData.last_name}`;
            const periodName = `${MONTHS_FR[receiptDetail.period_month]} ${receiptDetail.period_year}`;
            
            setLinkModalData({
                tenantName,
                tenantPhone: tenantData.phone || '',
                amount: receiptDetail.balance_due ?? receiptDetail.total_amount,
                periodName
            });
            setSelectedReceiptForLink(receiptDetail);
            setIsLinkModalOpen(true);
            toast.dismiss(toastId);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Erreur de chargement", { id: toastId });
        }
    };
    
    // Deletion states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

    const [metrics, setMetrics] = useState({
        potential: 0,
        expected: 0,
        collected: 0,
        remaining: 0,
        balance: 0
    });

    // Fetch owners
    useEffect(() => {
        const fetchOwners = async () => {
            if (isDemoMode) {
                const { MOCK_OWNERS } = await import('../../lib/mockData');
                setOwners(MOCK_OWNERS);
                return;
            }
            const { data } = await supabase
                .from('owners')
                .select('id, business_id, first_name, last_name')
                .eq('agency_id', user?.agency_id)
                .order('first_name');

            if (data) setOwners(data);
        };

        fetchOwners();
    }, [user]);

    // Fetch data — using parallel queries via caisseService
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (isDemoMode) {
                // Demo mode: load mock data
                const { MOCK_RECEIPTS, MOCK_TRANSACTIONS, MOCK_PROPERTIES, MOCK_TENANTS, MOCK_CONTRACTS } = await import('../../lib/mockData');

                const mockReceipts: Transaction[] = MOCK_RECEIPTS.map((r: any) => {
                    const prop = MOCK_PROPERTIES.find((p: any) => p.id === r.property_id);
                    const tenant = MOCK_TENANTS.find((t: any) => t.id === r.tenant_id);
                    return {
                        id: `mock-r-${r.id}`, date: r.payment_date, type: 'credit',
                        amount: r.total_amount, category: 'rent_payment',
                        description: `[DÉMO] Loyer - ${prop?.title || 'N/A'} (${tenant?.first_name} ${tenant?.last_name})`,
                        payment_method: r.payment_method, source: 'rent_receipt', reference_id: r.receipt_number, details: r,
                    };
                });
                const mockManual: Transaction[] = MOCK_TRANSACTIONS.map((t: any) => ({
                    id: `mock-t-${t.id}`, date: t.transaction_date,
                    type: (t.type === 'income' || t.type === 'deposit') ? 'credit' : 'debit',
                    amount: t.amount, category: t.category,
                    description: `[DÉMO] ${t.description || 'N/A'}`,
                    payment_method: t.payment_method, source: 'modular_transaction', reference_id: '', details: t,
                }));
                const all = [...mockReceipts, ...mockManual].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setTransactions(all);
                const potential = MOCK_PROPERTIES.reduce((s: number, p: any) => s + (Number(p.monthly_rent) || 0), 0);
                const expected = MOCK_CONTRACTS.filter((c: any) => c.status === 'active').reduce((s: number, c: any) => s + (Number(c.monthly_rent) || 0), 0);
                const collected = mockReceipts.filter(t => t.category === 'rent_payment').reduce((s, t) => s + Number(t.amount || 0), 0);
                const allCredits = all.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount || 0), 0);
                const allDebits = all.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount || 0), 0);
                setMetrics({ potential, expected, collected, remaining: Math.max(0, expected - collected), balance: allCredits - allDebits });
                return;
            }

            if (!user?.agency_id) return;

            const { transactions: txns, globalCredits, globalDebits, potential, expected, collected, collectedThisMonth } =
                await fetchCaisseData(user.agency_id, filters);

            setTransactions(txns);
            setMetrics({
                potential,
                expected,
                collected,
                remaining: Math.max(0, expected - (collectedThisMonth || 0)),
                balance: globalCredits - globalDebits,
            });
        } catch (error) {
            console.error('CaissePage fetchData error:', error);
            toast.error('Erreur lors du chargement des données de caisse');
        } finally {
            setIsLoading(false);
        }
    }, [filters.ownerId, filters.period, user?.agency_id, isDemoMode]);

    useEffect(() => {
        fetchData();
    }, [filters.ownerId, filters.period, user]);

    // Financial Summary
    const summary = useMemo(() => {
        const filteredTrans = transactions.filter(t => {
            const matchesType = filters.type === 'all' || t.type === filters.type;
            const matchesCategory = filters.category === 'all' || t.category === filters.category;
            return matchesType && matchesCategory;
        });

        const totalCredit = filteredTrans
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDebit = filteredTrans
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            totalCredit,
            totalDebit,
            balance: totalCredit - totalDebit,
            count: filteredTrans.length,
            filteredTransactions: filteredTrans
        };
    }, [transactions, filters.type, filters.category]);

    // Pagination logic
    const [page, setPage] = useState(1);
    const pageSize = 50;

    useEffect(() => {
        setPage(1); // Reset page to 1 when filters change
    }, [filters]);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (page - 1) * pageSize;
        return summary.filteredTransactions.slice(startIndex, startIndex + pageSize);
    }, [summary.filteredTransactions, page, pageSize]);



    const openPayoutModal = (owner: Owner) => {
        setSelectedOwnerForPayout(owner);
        setIsPayoutModalOpen(true);
    };

    // Modal de prévisualisation quittance
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const handleViewReceipt = (t: Transaction) => {
        setSelectedTransaction(t);
    };

    const handleDownloadReceiptFromTransaction = async (t: Transaction, autoPrint = false) => {
        if (t.source === 'rent_receipt' && t.details) {
            if (autoPrint) {
                await printReceiptHTML(t.details, user?.agency_id ?? '', {
                    tenantName: t.details.tenant ? `${t.details.tenant.first_name} ${t.details.tenant.last_name}` : undefined,
                    propertyTitle: t.details.property?.title,
                });
            } else {
                await downloadReceiptPDF(t.details, user?.agency_id ?? '', {
                    tenantName: t.details.tenant ? `${t.details.tenant.first_name} ${t.details.tenant.last_name}` : undefined,
                    propertyTitle: t.details.property?.title,
                });
            }
            return;
        }

        // For other transactions, use the existing basic template
        try {
            const { jsPDF } = await import('jspdf');
            const branding = await getAgencyBranding(user?.agency_id ?? undefined);
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            let y = renderPDFHeader(doc, branding, 15);

            const title = t.source === 'rent_receipt' ? 'QUITTANCE DE LOYER' : 'RECU D\'OPERATION';
            doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
            doc.text(title, pageWidth / 2, y, { align: 'center' }); y += 10;
            doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
            doc.text(`Date : ${new Date(t.date).toLocaleDateString('fr-FR')}`, pageWidth / 2, y, { align: 'center' }); y += 6;
            const ref = t.source === 'rent_receipt' ? t.reference_id : `REF-${t.id.slice(0, 8).toUpperCase()}`;
            doc.text(`Référence : ${ref}`, pageWidth / 2, y, { align: 'center' }); y += 12;
            doc.setDrawColor(220, 220, 220); doc.line(20, y, pageWidth - 20, y); y += 8;

            const writeRow = (label: string, value: string) => {
                doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
                doc.text(label, 22, y); doc.setTextColor(30, 30, 30); doc.text(value, pageWidth / 2, y); y += 8;
            };
            writeRow('Description :', t.description);
            writeRow('Catégorie :', t.category === 'rent_payment' ? 'Loyer' : t.category);
            writeRow('Mode de paiement :', t.payment_method);
            y += 4;
            doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(t.type === 'credit' ? 22 : 220, t.type === 'credit' ? 163 : 38, t.type === 'credit' ? 74 : 38);
            doc.text(`${t.type === 'credit' ? 'MONTANT RECU' : 'MONTANT PAYE'} : ${t.amount.toLocaleString('fr-FR')} FCFA`, pageWidth / 2, y, { align: 'center' }); y += 12;

            renderPDFFooter(doc, branding);
            
            if (autoPrint) {
                doc.autoPrint();
                window.open(doc.output('bloburl'), '_blank');
            } else {
                doc.save(`recu-${ref}-${new Date(t.date).toLocaleDateString('fr-FR').replace(/\//g, '-')}.pdf`);
                toast.success('Reçu téléchargé !');
            }
        } catch (err: any) {
            toast.error('Erreur PDF : ' + err.message);
        }
    };

    const handleEditTransaction = (t: Transaction) => {
        if (t.source === 'modular_transaction') {
            setTransactionToEdit(t.details);
            setIsTransactionModalOpen(true);
        } else {
            toast.error("Les quittances de loyer doivent être modifiées depuis le menu Locations");
        }
    };

    const handleDeleteTransaction = async () => {
        if (!transactionToDelete || !user?.id || !user?.agency_id) return;
        
        setIsDeleting(true);
        const toastId = toast.loading('Suppression en cours...');

        try {
            const isReceipt = transactionToDelete.source === 'rent_receipt';
            const table = isReceipt ? 'rent_receipts' : 'modular_transactions';
            const recordId = isReceipt ? transactionToDelete.id.replace('receipt-', '') : transactionToDelete.id;

            // 1. Audit Log Snapshot
            await dbService.auditLogs.logDeletion({
                table_name: table,
                record_id: recordId,
                old_values: transactionToDelete.details || transactionToDelete,
                userId: user.id,
                agencyId: user.agency_id
            });

            // 2. Supprimer de Supabase
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', recordId);
            
            if (error) throw error;
            
            toast.success("Opération supprimée avec succès", { id: toastId });
            setShowDeleteModal(false);
            setTransactionToDelete(null);
            fetchData();
        } catch (error: any) {
            console.error('Error deleting transaction:', error);
            toast.error("Erreur lors de la suppression: " + (error.message || ''), { id: toastId });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExport = async () => {
        try {
            const branding = await getAgencyBranding(user?.agency_id ?? undefined);
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            let y = renderPDFHeader(doc, branding, 15);

            doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
            doc.text('RAPPORT DE CAISSE & TRÉSORERIE', pageWidth / 2, y, { align: 'center' }); y += 8;
            doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
            doc.text(`Période : ${filters.period} | Généré le : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, y, { align: 'center' }); y += 12;
            doc.setDrawColor(200, 200, 200); doc.line(20, y, pageWidth - 20, y); y += 8;

            // Résumé financier
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
            doc.text('RÉSUMÉ FINANCIER', 20, y); y += 8;
            const writeRow = (label: string, val: string, bold = false) => {
                doc.setFontSize(10);
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setTextColor(80, 80, 80);
                doc.text(label, 20, y);
                doc.setTextColor(30, 30, 30);
                doc.text(val, pageWidth - 20, y, { align: 'right' });
                y += 7;
            };
            writeRow('Total Encaissé :', `${summary.totalCredit.toLocaleString('fr-FR')} FCFA`);
            writeRow('Total Décaissé :', `${summary.totalDebit.toLocaleString('fr-FR')} FCFA`);
            writeRow('Solde Période :', `${summary.balance.toLocaleString('fr-FR')} FCFA`, true);
            writeRow('Nombre Total Opérations :', String(summary.count));
            y += 4;
            doc.setDrawColor(200, 200, 200); doc.line(20, y, pageWidth - 20, y); y += 8;

            // Tableau des transactions
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
            doc.text('DÉTAIL DES TRANSACTIONS', 20, y); y += 8;
            // En-tête tableau
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.setFillColor(59, 130, 246);
            doc.rect(20, y - 4, pageWidth - 40, 7, 'F');
            doc.text('Date', 22, y); doc.text('Description', 55, y); doc.text('Catégorie', 110, y); doc.text('Montant', pageWidth - 22, y, { align: 'right' }); y += 7;

            // Lignes
            doc.setFont('helvetica', 'normal');
            summary.filteredTransactions.forEach((t, i) => {
                if (y > 265) { doc.addPage(); y = 20; }
                if (i % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(20, y - 4, pageWidth - 40, 6, 'F'); }
                doc.setTextColor(t.type === 'credit' ? 22 : 220, t.type === 'credit' ? 163 : 38, t.type === 'credit' ? 74 : 38);
                doc.text(new Date(t.date).toLocaleDateString('fr-FR'), 22, y);
                doc.setTextColor(50, 50, 50);
                doc.text(t.description.slice(0, 35), 55, y);
                doc.text(t.category.slice(0, 20), 110, y);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(t.type === 'credit' ? 22 : 220, t.type === 'credit' ? 163 : 38, t.type === 'credit' ? 74 : 38);
                doc.text(`${t.type === 'credit' ? '+' : '-'}${t.amount.toLocaleString('fr-FR')} FCFA`, pageWidth - 22, y, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                y += 6;
            });

            renderPDFFooter(doc, branding);
            doc.save(`caisse-${filters.period}.pdf`);
            toast.success('Rapport de caisse exporté !');
        } catch (err: any) {
            toast.error('Erreur export PDF : ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t("Caisse & Trésorerie")}</h1>
                    <p className="text-gray-500 mt-1">
                        {!hasTraditionalRealEstate && (hasHotel || hasResidences)
                            ? t("Suivi de caisse pour vos réservations, locations meublées et prestations")
                            : t("Gestion des encaissements, décaissements et reversements")
                        }
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsTransactionModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>{t("Mouvement")}</span>
                    </button>
                    
                    {hasTraditionalRealEstate && (
                        <button
                            onClick={() => setIsCollectionModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
                        >
                            <Wallet className="w-4 h-4" />
                            <span>{t("Encaissement Locataire")}</span>
                        </button>
                    )}

                    {!hasTraditionalRealEstate && hasResidences && (
                        <Link
                            to="/residences"
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
                        >
                            <Wallet className="w-4 h-4" />
                            <span>{t("Gérer Résidences")}</span>
                        </Link>
                    )}

                    {!hasTraditionalRealEstate && hasHotel && (
                        <Link
                            to="/hotel"
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-md hover:shadow-lg"
                        >
                            <Wallet className="w-4 h-4" />
                            <span>{t("Gérer Hôtels")}</span>
                        </Link>
                    )}

                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg">
                        <Download className="w-4 h-4" />
                        <span>{t("Exporter PDF")}</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <CaisseMetrics metrics={metrics} isLoading={isLoading} />

            <Tabs
                tabs={[
                    { id: 'journal', label: t('Journal des opérations') },
                    { id: 'payouts', label: t('Reversements Propriétaires') },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {activeTab === 'journal' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <Card className="p-4">
                        <FilterBar
                            fields={[
                                {
                                    id: 'ownerId',
                                    label: t('Propriétaire'),
                                    type: 'select',
                                    options: [
                                        { value: 'all', label: t('Tous les propriétaires') },
                                        ...owners.map(o => ({ value: o.id, label: `${o.first_name} ${o.last_name}` }))
                                    ]
                                },
                                {
                                    id: 'period',
                                    label: t('Période'),
                                    type: 'date',
                                    dateType: 'month'
                                },
                                {
                                    id: 'type',
                                    label: t('Type'),
                                    type: 'select',
                                    options: [
                                        { value: 'all', label: t('Tous les types') },
                                        { value: 'credit', label: t('Credits (+)') },
                                        { value: 'debit', label: t('Debits (-)') },
                                    ]
                                },
                                {
                                    id: 'category',
                                    label: t('Catégorie'),
                                    type: 'select',
                                    options: [
                                        { value: 'all', label: t('Toutes les catégories') },
                                        { value: 'rent_payment', label: t('Loyer') },
                                        { value: 'owner_payout', label: t('Reversement') },
                                        { value: 'caution', label: t('Caution') },
                                        { value: 'agency_fees', label: t('Honoraires') },
                                        { value: 'maintenance', label: t('Travaux / Maintenance') },
                                        { value: 'expense', label: t('Autre Dépense') },
                                        { value: 'income', label: t('Autre Revenu') },
                                    ]
                                }
                            ]}
                            values={filters}
                            onChange={handleFilterChange}
                            onClear={clearFilters}
                            stats={[
                                {
                                    label: t('Entrées (+)'),
                                    count: summary.totalCredit.toLocaleString('fr-FR') + ' F',
                                    active: true,
                                    colorClass: 'bg-green-100 text-green-700',
                                    activeColorClass: 'text-green-600',
                                    onClick: () => {}
                                },
                                {
                                    label: t('Sorties (-)'),
                                    count: summary.totalDebit.toLocaleString('fr-FR') + ' F',
                                    active: true,
                                    colorClass: 'bg-red-100 text-red-700',
                                    activeColorClass: 'text-red-600',
                                    onClick: () => {}
                                },
                                {
                                    label: t('Solde Net'),
                                    count: summary.balance.toLocaleString('fr-FR') + ' F',
                                    active: true,
                                    colorClass: summary.balance >= 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700',
                                    activeColorClass: summary.balance >= 0 ? 'text-indigo-600' : 'text-red-600',
                                    onClick: () => {}
                                }
                            ]}
                        />
                    </Card>

                    {/* Table */}
                    <Card className="overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 flex justify-center">
                                <LoadingSpinner size="lg" label={t("Chargement...")} />
                            </div>
                        ) : summary.filteredTransactions.length === 0 ? (
                            <EmptyState
                                icon="banknote"
                                title={t("Aucune transaction")}
                                description={t("Aucun mouvement de caisse trouvé pour cette sélection.")}
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Date")}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Type")}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Provenance")}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Catégorie")}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Description")}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("Moyen")}</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("Part Proprio")}</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("Montant Total")}</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t("Actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedTransactions.map((tTrans) => (
                                            <tr key={tTrans.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(tTrans.date).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={clsx(
                                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                        tTrans.type === 'credit' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                    )}>
                                                        {tTrans.type === 'credit' ? t('Crédit') : t('Débit')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={clsx(
                                                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                                                        tTrans.source === 'rent_receipt' 
                                                            ? "bg-blue-50 text-blue-700 border border-blue-100" 
                                                            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                    )}>
                                                        {tTrans.source === 'rent_receipt' ? t('Quittance') : t('Opération')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {tTrans.category === 'rent_payment' ? t('Loyer') :
                                                        tTrans.category === 'owner_payout' ? t('Reversement') :
                                                            tTrans.category === 'caution' ? t('Caution') :
                                                                tTrans.category === 'agency_fees' ? t('Honoraires Agence') :
                                                                    t(tTrans.category)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                    {tTrans.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {t(tTrans.payment_method)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium text-right">
                                                    {tTrans.source === 'rent_receipt' ? `${(tTrans.details?.owner_payment || 0).toLocaleString('fr-FR')}` : '-'}
                                                </td>
                                                <td className={clsx(
                                                    "px-6 py-4 whitespace-nowrap text-sm font-semibold text-right",
                                                    tTrans.type === 'credit' ? "text-green-600" : "text-red-600"
                                                )}>
                                                    <div className="flex flex-col items-end">
                                                        <span>{tTrans.type === 'credit' ? '+' : '-'}{tTrans.amount.toLocaleString('fr-FR')}</span>
                                                        {tTrans.details?.payment_status === 'partial' && (
                                                            <div className="flex flex-col items-end mt-1">
                                                                <span className="text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 rounded border border-orange-100 mb-0.5">{t("PARTIEL")}</span>
                                                                <span className="text-[10px] text-gray-400 font-normal">{t("sur")} {tTrans.details.total_amount.toLocaleString('fr-FR')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {tTrans.source === 'rent_receipt' && tTrans.details?.payment_status === 'partial' && (
                                                            <button title={t("Partager le lien de paiement")} onClick={() => handleSharePaymentLink(tTrans)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors">
                                                                <Share2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button title={t("Voir détail")} onClick={() => handleViewReceipt(tTrans)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button title={t("Télécharger PDF")} onClick={() => handleDownloadReceiptFromTransaction(tTrans)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors">
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button title={t("Imprimer")} onClick={() => handleDownloadReceiptFromTransaction(tTrans, true)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        {(user?.role === 'director' || user?.role === 'manager') && (
                                                            <>
                                                                {tTrans.source === 'modular_transaction' && (
                                                                    <button title={t("Modifier")} onClick={() => handleEditTransaction(tTrans)} className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600 transition-colors">
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                {canDelete && (
                                                                    <button 
                                                                        title={t("Supprimer")} 
                                                                        onClick={() => {
                                                                            setTransactionToDelete(tTrans);
                                                                            setShowDeleteModal(true);
                                                                        }} 
                                                                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {summary.filteredTransactions.length > 0 && (
                            <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                                <Button
                                    variant="secondary"
                                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                                    disabled={page === 1}
                                >
                                    {t("Précédent")}
                                </Button>
                                <span className="text-sm text-gray-600">
                                    Page {page} / {Math.max(1, Math.ceil(summary.filteredTransactions.length / pageSize))}
                                </span>
                                <Button
                                    variant="secondary"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * pageSize >= summary.filteredTransactions.length}
                                >
                                    {t("Suivant")}
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {activeTab === 'payouts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {owners.map(owner => (
                        <Card key={owner.id} className="p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{owner.first_name} {owner.last_name}</h3>
                                    <p className="text-sm text-gray-500">{owner.business_id}</p>
                                </div>
                                <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                    {owner.first_name[0]}{owner.last_name[0]}
                                </div>
                            </div>

                            <div className="mt-4 flex justify-between items-center text-sm">
                                <span className="text-gray-500">{t("Solde à reverser")} :</span>
                                <OwnerBalanceBadge ownerId={owner.id} />
                            </div>

                            <div className="border-t border-gray-100 pt-4 mt-4">
                                <button
                                    onClick={() => openPayoutModal(owner)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    {t("Faire un reversement")}
                                </button>
                            </div>
                        </Card>
                    ))}
                    {owners.length === 0 && (
                        <div className="col-span-full">
                            <EmptyState
                                title={t("Aucun propriétaire")}
                                description={t("Ajoutez des propriétaires pour gérer leurs reversements.")}
                            />
                        </div>
                    )}
                </div>
            )}

            <NewTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => {
                    setIsTransactionModalOpen(false);
                    setTransactionToEdit(null);
                }}
                onSuccess={fetchData}
                transaction={transactionToEdit}
            />

            <TenantCollectionModal
                isOpen={isCollectionModalOpen}
                onClose={() => setIsCollectionModalOpen(false)}
                onSuccess={fetchData}
            />

            {selectedOwnerForPayout && (
                <PayoutModal
                    isOpen={isPayoutModalOpen}
                    onClose={() => {
                        setIsPayoutModalOpen(false);
                        setSelectedOwnerForPayout(null);
                    }}
                    onSuccess={fetchData}
                    ownerId={selectedOwnerForPayout.id}
                    ownerName={`${selectedOwnerForPayout.first_name} ${selectedOwnerForPayout.last_name}`}
                />
            )}

            {/* Modal de prévisualisation quittance */}
            {selectedTransaction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTransaction(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">{t("Détail de la transaction")}</h2>
                            <button onClick={() => setSelectedTransaction(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-gray-500">{t("N° Quittance")}</span><span className="font-medium">{selectedTransaction.details?.receipt_number || '-'}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">{t("Date")}</span><span className="font-medium">{new Date(selectedTransaction.date).toLocaleDateString('fr-FR')}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">{t("Catégorie")}</span><span className="font-medium">{selectedTransaction.category === 'rent_payment' ? t('Loyer') : t(selectedTransaction.category)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">{t("Description")}</span><span className="font-medium">{selectedTransaction.description}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">{t("Mode de paiement")}</span><span className="font-medium">{t(selectedTransaction.payment_method)}</span></div>
                            </div>

                            {selectedTransaction.category === 'rent_payment' && selectedTransaction.details?.total_amount && (
                                <div className="space-y-2 border-t border-gray-100 pt-3 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>{t("Loyer total dû")}</span>
                                        <span>{selectedTransaction.details.total_amount.toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                    <div className="flex justify-between text-green-600 font-medium">
                                        <span>{t("Montant versé")}</span>
                                        <span>{selectedTransaction.amount.toLocaleString('fr-FR')} FCFA</span>
                                    </div>
                                    {selectedTransaction.details.payment_status === 'partial' && (
                                        <div className="flex justify-between text-red-600 font-bold bg-red-50 p-2 rounded-lg mt-2">
                                            <span>{t("SOLDE RESTANT")}</span>
                                            <span>{(selectedTransaction.details.balance_due || (selectedTransaction.details.total_amount - selectedTransaction.amount)).toLocaleString('fr-FR')} FCFA</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-3">
                                <span>{selectedTransaction.category === 'rent_payment' ? t('Total Encaissé') : t('Montant')}</span>
                                <span className={selectedTransaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                                    {selectedTransaction.type === 'credit' ? '+' : '-'}{selectedTransaction.amount.toLocaleString('fr-FR')} FCFA
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button onClick={() => setSelectedTransaction(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">{t("Fermer")}</button>
                            <button onClick={() => handleDownloadReceiptFromTransaction(selectedTransaction)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <Download className="w-4 h-4" />{t("Télécharger PDF")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDeleteModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteTransaction}
                itemTitle={transactionToDelete?.description || t("cette opération")}
                isLoading={isDeleting}
                message={t("Vous allez supprimer définitivement cette opération. Cette action sera enregistrée dans le journal d'audit.", {
                    op: transactionToDelete?.source === 'rent_receipt' ? t('cette quittance de loyer') : t('ce mouvement de caisse')
                })}
            />

            <PaymentLinkModal
                isOpen={isLinkModalOpen}
                onClose={() => {
                    setIsLinkModalOpen(false);
                    setSelectedReceiptForLink(null);
                }}
                receipt={selectedReceiptForLink}
                tenantName={linkModalData.tenantName}
                tenantPhone={linkModalData.tenantPhone}
                amount={linkModalData.amount}
                periodName={linkModalData.periodName}
            />
        </div>
    );
};

export default CaissePage;
