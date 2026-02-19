import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Filter, Calendar, DollarSign, TrendingUp, AlertCircle, Plus, Wallet, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { Tabs } from '../ui/Tabs';
import { NewTransactionModal } from './NewTransactionModal';
import { PayoutModal } from './PayoutModal';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';

interface Owner {
    id: string;
    business_id: string;
    first_name: string;
    last_name: string;
}

interface Transaction {
    id: string;
    date: string;
    type: 'credit' | 'debit';
    amount: number;
    category: string;
    description: string;
    payment_method: string;
    source: 'rent_receipt' | 'cash_transaction';
    reference_id: string;
    details?: any;
}

export const CaissePage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState('journal');
    const [owners, setOwners] = useState<Owner[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Filters
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>(searchParams.get('proprietaire') || '');
    const [selectedPeriod, setSelectedPeriod] = useState<string>(
        searchParams.get('periode') || new Date().toISOString().slice(0, 7)
    );

    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [selectedOwnerForPayout, setSelectedOwnerForPayout] = useState<Owner | null>(null);

    // Fetch owners
    useEffect(() => {
        const fetchOwners = async () => {
            const { data } = await supabase
                .from('owners')
                .select('id, business_id, first_name, last_name')
                .eq('agency_id', user?.agency_id)
                .order('first_name');

            if (data) setOwners(data);
        };

        fetchOwners();
    }, [user]);

    // Fetch data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Rent Receipts (Credits)
            let receiptsQuery = supabase
                .from('rent_receipts')
                .select(`
                    id,
                    receipt_number,
                    total_amount,
                    payment_date,
                    payment_method,
                    property:properties!inner(title, business_id, owner_id),
                    tenant:tenants(first_name, last_name)
                `)
                .eq('agency_id', user?.agency_id);

            if (selectedOwnerId) {
                receiptsQuery = receiptsQuery.eq('property.owner_id', selectedOwnerId);
            }
            if (selectedPeriod) {
                const [year, month] = selectedPeriod.split('-');
                const startDate = `${year}-${month}-01`;
                const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);
                receiptsQuery = receiptsQuery.gte('payment_date', startDate).lte('payment_date', endDate);
            }

            const { data: receipts } = await receiptsQuery;

            // 2. Fetch Manual Transactions
            let cashQuery = supabase
                .from('cash_transactions')
                .select('*')
                .eq('agency_id', user?.agency_id);

            if (selectedOwnerId) {
                cashQuery = cashQuery.eq('related_owner_id', selectedOwnerId);
            }
            if (selectedPeriod) {
                const [year, month] = selectedPeriod.split('-');
                const startDate = `${year}-${month}-01`;
                const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().slice(0, 10);
                cashQuery = cashQuery.gte('transaction_date', startDate).lte('transaction_date', endDate);
            }

            const { data: cashTrans } = await cashQuery;

            // Merge and Normalize
            const receiptTrans: Transaction[] = (receipts || []).map((r: any) => ({
                id: r.id,
                date: r.payment_date,
                type: 'credit',
                amount: r.total_amount,
                category: 'rent_payment',
                description: `Loyer - ${r.property.title} (${r.tenant?.first_name} ${r.tenant?.last_name})`,
                payment_method: r.payment_method,
                source: 'rent_receipt',
                reference_id: r.receipt_number,
                details: r
            }));

            const manualTrans: Transaction[] = (cashTrans || []).map((t: any) => ({
                id: t.id,
                date: t.transaction_date,
                type: t.type,
                amount: t.amount,
                category: t.category,
                description: t.description || 'N/A',
                payment_method: t.payment_method,
                source: 'cash_transaction',
                reference_id: '',
                details: t
            }));

            const allTrans = [...receiptTrans, ...manualTrans].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setTransactions(allTrans);

        } catch (error) {
            console.error(error);
            toast.error("Erreur lors du chargement des données");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedOwnerId, selectedPeriod, user]);

    // Financial Summary
    const summary = useMemo(() => {
        const totalCredit = transactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDebit = transactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            totalCredit,
            totalDebit,
            balance: totalCredit - totalDebit,
            count: transactions.length
        };
    }, [transactions]);


    const handleOwnerChange = (ownerId: string) => {
        setSelectedOwnerId(ownerId);
        if (ownerId) searchParams.set('proprietaire', ownerId);
        else searchParams.delete('proprietaire');
        setSearchParams(searchParams);
    };

    const handlePeriodChange = (period: string) => {
        setSelectedPeriod(period);
        if (period) searchParams.set('periode', period);
        else searchParams.delete('periode');
        setSearchParams(searchParams);
    };

    const openPayoutModal = (owner: Owner) => {
        setSelectedOwnerForPayout(owner);
        setIsPayoutModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Caisse & Trésorerie</h1>
                    <p className="text-gray-500 mt-1">Gestion des encaissements, décaissements et reversements</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsTransactionModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                        <span>Mouvement</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg">
                        <Download className="w-4 h-4" />
                        <span>Exporter</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-800">Total Encaissé</span>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-700">{summary.totalCredit.toLocaleString('fr-FR')} FCFA</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-red-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-red-800">Total Décaissé</span>
                        <TrendingUp className="w-4 h-4 text-red-600 transform rotate-180" />
                    </div>
                    <p className="text-2xl font-bold text-red-700">{summary.totalDebit.toLocaleString('fr-FR')} FCFA</p>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">Solde Période</span>
                        <Wallet className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{summary.balance.toLocaleString('fr-FR')} FCFA</p>
                </Card>
            </div>

            <Tabs
                tabs={[
                    { id: 'journal', label: 'Journal des opérations' },
                    { id: 'payouts', label: 'Reversements Propriétaires' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {activeTab === 'journal' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <Card className="p-6">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <Filter className="w-4 h-4" />
                                <span>Filtres:</span>
                            </div>

                            <select
                                value={selectedOwnerId}
                                onChange={(e) => handleOwnerChange(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="">Tous les propriétaires</option>
                                {owners.map((owner) => (
                                    <option key={owner.id} value={owner.id}>
                                        {owner.first_name} {owner.last_name}
                                    </option>
                                ))}
                            </select>

                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <input
                                    type="month"
                                    value={selectedPeriod}
                                    onChange={(e) => handlePeriodChange(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Table */}
                    <Card className="overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 flex justify-center">
                                <LoadingSpinner size="lg" label="Chargement..." />
                            </div>
                        ) : transactions.length === 0 ? (
                            <EmptyState
                                icon="banknote"
                                title="Aucune transaction"
                                description="Aucun mouvement de caisse trouvé pour cette période."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Moyen</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {transactions.map((t) => (
                                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(t.date).toLocaleDateString('fr-FR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={clsx(
                                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                        t.type === 'credit' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                    )}>
                                                        {t.type === 'credit' ? 'Crédit' : 'Débit'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {t.category === 'rent_payment' ? 'Loyer' :
                                                        t.category === 'owner_payout' ? 'Reversement' :
                                                            t.category}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                    {t.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {t.payment_method}
                                                </td>
                                                <td className={clsx(
                                                    "px-6 py-4 whitespace-nowrap text-sm font-semibold text-right",
                                                    t.type === 'credit' ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {t.type === 'credit' ? '+' : '-'}{t.amount.toLocaleString('fr-FR')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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

                            <div className="border-t border-gray-100 pt-4 mt-4">
                                <button
                                    onClick={() => openPayoutModal(owner)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    Faire un reversement
                                </button>
                            </div>
                        </Card>
                    ))}
                    {owners.length === 0 && (
                        <div className="col-span-full">
                            <EmptyState
                                title="Aucun propriétaire"
                                description="Ajoutez des propriétaires pour gérer leurs reversements."
                            />
                        </div>
                    )}
                </div>
            )}

            <NewTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
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
        </div>
    );
};

export default CaissePage;
