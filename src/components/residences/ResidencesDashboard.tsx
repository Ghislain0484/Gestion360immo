import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Building2, UserCircle, Receipt, Home, 
    Star, Shield, Smartphone, Plane, LayoutDashboard, Info, Loader2
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePriceCalculator } from '../../hooks/usePriceCalculator';
import { ModularFilters } from '../modular/management/ModularFilters';
import { SiteManager } from '../modular/management/SiteManager';
import { UnitForm } from '../modular/management/UnitForm';
import { Modal } from '../ui/Modal';
import { ResidenceBookingModal } from './ResidenceBookingModal';
import { ShuttleRequestModal, MobileMoneyModal, PricingPolicyModal } from './ResidenceServiceModals';
import { ExpenseManager } from '../modular/management/ExpenseManager';
import { ClientCRM } from '../modular/management/ClientCRM';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { ResidenceUnit } from '../../types/modular';
import toast from 'react-hot-toast';

export const ResidencesDashboard: React.FC = () => {
    const { agencyId } = useAuth();
    const [view, setView] = useState<'dashboard' | 'management' | 'finances' | 'crm'>('dashboard');
    const [isAddingUnit, setIsAddingUnit] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<ResidenceUnit | null>(null);
    const [units, setUnits] = useState<ResidenceUnit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [showShuttleModal, setShowShuttleModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    const { formatPrice } = usePriceCalculator({
        shortStayPrice: 85000,
        longStayThreshold: 15,
        longStayDiscount: 20
    });

    useEffect(() => {
        if (agencyId) {
            fetchUnits();
        }
    }, [agencyId]);

    const fetchUnits = async () => {
        try {
            setIsLoading(true);
            const data = await dbService.modular.getUnits(agencyId!);
            setUnits(data);
        } catch (error) {
            console.error('Error fetching units:', error);
            toast.error('Erreur lors du chargement des unités');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate real stats
    const stats = useMemo(() => {
        const totalUnits = units.length;
        const occupiedUnits = units.filter(u => u.status === 'occupied').length;
        const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
        
        return [
            { label: 'Taux Occup.', value: `${occupancyRate}%`, icon: Building2, color: 'text-indigo-600' },
            { label: 'Unités Libres', value: units.filter(u => u.status === 'ready').length.toString(), icon: Home, color: 'text-emerald-600' },
            { label: 'En Nettoyage', value: units.filter(u => u.status === 'cleaning').length.toString(), icon: Shield, color: 'text-amber-600' },
            { label: 'Maintenance', value: units.filter(u => u.status === 'maintenance').length.toString(), icon: Info, color: 'text-rose-600' },
        ];
    }, [units]);

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'ready': return 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:border-emerald-300';
            case 'occupied': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'cleaning': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'reserved': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'maintenance': return 'bg-rose-50 text-rose-700 border-rose-100';
            default: return 'bg-gray-50 text-gray-700';
        }
    };

    const handleUnitClick = (unit: ResidenceUnit) => {
        if (unit.status === 'ready') {
            setSelectedUnit(unit);
        } else {
            toast(`Cette unité est actuellement ${unit.status}`);
        }
    };

    const renderHeader = () => (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 italic uppercase tracking-tighter">
                    <Home className="text-indigo-600" />
                    RÉSIDENCES MEUBLÉES
                </h2>
                <p className="text-slate-500 mt-1 uppercase text-[11px] font-bold tracking-wider underline decoration-indigo-200">Gestion Prestige & Court Séjour • Abidjan</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                    onClick={() => setView('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <LayoutDashboard size={14} /> Opérations
                </button>
                <button 
                    onClick={() => setView('management')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'management' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Building2 size={14} /> Parc
                </button>
                <button 
                    onClick={() => setView('finances')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'finances' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Receipt size={14} /> Finances
                </button>
                <button 
                    onClick={() => setView('crm')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${view === 'crm' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <UserCircle size={14} /> Clients
                </button>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6 bg-slate-900 text-white shadow-xl shadow-slate-200 border-0 relative overflow-hidden group font-sans col-span-1 md:col-span-2">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                        <Shield size={64} />
                    </div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Performance Directe</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-3xl font-black mt-2 tracking-tighter">{stats[0].value}</p>
                        <span className="text-xs font-bold text-emerald-400">Taux d'occupation</span>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-[9px] font-black uppercase bg-white/10 p-2 rounded-lg w-fit border border-white/20">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        Suivi Qualité Premium
                    </div>
                </Card>
                {stats.slice(1).map((stat, i) => (
                    <Card key={i} className="p-5 border-0 shadow-sm bg-white border-l-4 border-indigo-500 flex flex-col justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 border-0 shadow-md">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Suivi du Parc</h3>
                        <Button variant="primary" size="sm" onClick={() => setIsAddingUnit(true)} leftIcon={<Plus size={14} />}>Nouvelle Unité</Button>
                    </div>
                    
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="animate-spin text-indigo-600 mb-2" />
                            <p className="text-[10px] font-black text-slate-400 uppercase">Chargement des unités...</p>
                        </div>
                    ) : units.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs font-bold text-slate-500">Aucune unité configurée dans votre parc.</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setView('management')}>Gérer le Parc</Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {units.map(res => (
                                <div 
                                    key={res.id} 
                                    onClick={() => handleUnitClick(res)}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all hover:scale-[1.01] cursor-pointer shadow-sm ${getStatusStyles(res.status)} group`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                            <span className="text-[9px] font-black opacity-50 leading-none">ID-{res.id.slice(0,3)}</span>
                                            <span className="font-black text-[10px] uppercase">{res.unit_category}</span>
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 leading-none">{res.unit_name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 italic">{res.site?.name || 'Site non défini'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black px-2 py-1 rounded-full bg-white/70 uppercase tracking-widest border border-black/5 block mb-1">
                                            {res.status}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-500 italic block">{formatPrice(res.base_price_per_night)} / nuit</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <div className="space-y-6">
                    <Card className="p-6 bg-slate-50 border-0 shadow-inner">
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center justify-between italic text-indigo-900">
                            Services & Caution
                            <Shield size={20} className="text-indigo-600" />
                        </h3>
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute right-0 top-0 w-1 h-full bg-amber-500" />
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                                        <Shield size={14} className="text-amber-500" />
                                        Caution Immobilière
                                    </p>
                                    <span className="text-[10px] font-black text-amber-600">300.000 F</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium italic">Standard de sécurité appliqué</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <div 
                                    onClick={() => setShowShuttleModal(true)}
                                    className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center hover:bg-slate-900 hover:text-white transition-all cursor-pointer group shadow-sm"
                                >
                                    <Plane size={24} className="text-indigo-500 mb-2 group-hover:scale-110" />
                                    <p className="text-[10px] font-black uppercase">Navette VIP</p>
                                </div>
                                <div 
                                    onClick={() => setShowPaymentModal(true)}
                                    className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col items-center hover:bg-slate-900 hover:text-white transition-all cursor-pointer group shadow-sm"
                                >
                                    <Smartphone size={24} className="text-emerald-500 mb-2 group-hover:scale-110" />
                                    <p className="text-[10px] font-black uppercase">Mobile Money</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-900 text-white border-0 shadow-lg relative overflow-hidden group">
                        <div className="absolute -right-8 -top-8 opacity-10 group-hover:scale-150 transition-transform duration-700">
                            <Info size={160} />
                        </div>
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="p-3 bg-white/20 rounded-2xl">
                                <Info size={28} className="text-white" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-widest mb-2 italic">Règle Long Séjour</h4>
                                <p className="text-xs opacity-90 leading-relaxed font-bold">
                                    Remise de **20%** auto-appliquée après **15 nuitées**.
                                </p>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => setShowPolicyModal(true)}
                                    className="mt-4 border-white/30 text-white hover:bg-white hover:text-indigo-900 border-2 font-black italic"
                                >
                                    CONFIGURER
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );

    return (
        <div className="space-y-6 pb-10">
            {renderHeader()}
            <ModularFilters />

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {view === 'dashboard' && renderDashboard()}
                {view === 'management' && <SiteManager />}
                {view === 'finances' && <ExpenseManager />}
                {view === 'crm' && <ClientCRM />}
            </div>

            <Modal isOpen={isAddingUnit} onClose={() => setIsAddingUnit(false)} title="" noPadding>
                <UnitForm onCancel={() => setIsAddingUnit(false)} onSuccess={fetchUnits} />
            </Modal>

            <Modal isOpen={!!selectedUnit} onClose={() => setSelectedUnit(null)} title="" noPadding>
                {selectedUnit && (
                    <ResidenceBookingModal 
                        unit={{
                            id: selectedUnit.id,
                            name: selectedUnit.unit_name,
                            type: selectedUnit.unit_type,
                            site: selectedUnit.site?.name || 'Site',
                            price: selectedUnit.base_price_per_night
                        }}
                        onClose={() => setSelectedUnit(null)} 
                        onSuccess={() => {
                            setSelectedUnit(null);
                            fetchUnits();
                        }} 
                    />
                )}
            </Modal>

            <Modal isOpen={showShuttleModal} onClose={() => setShowShuttleModal(false)} title="" noPadding>
                <ShuttleRequestModal onClose={() => setShowShuttleModal(false)} />
            </Modal>

            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="" noPadding>
                <MobileMoneyModal onClose={() => setShowPaymentModal(false)} />
            </Modal>

            <Modal isOpen={showPolicyModal} onClose={() => setShowPolicyModal(false)} title="" noPadding>
                <PricingPolicyModal onClose={() => setShowPolicyModal(false)} />
            </Modal>
        </div>
    );
};

