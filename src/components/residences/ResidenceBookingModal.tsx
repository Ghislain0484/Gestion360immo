import React, { useState, useEffect } from 'react';
import { Key, User, Calendar, MapPin, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePriceCalculator } from '../../hooks/usePriceCalculator';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { Tenant } from '../../types/db';
import toast from 'react-hot-toast';

interface ResidenceBookingModalProps {
    unit: {
        id: string;
        name: string;
        type: string;
        site: string;
        price: number;
    } | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const ResidenceBookingModal: React.FC<ResidenceBookingModalProps> = ({ unit, onClose, onSuccess }) => {
    const { agencyId } = useAuth();
    const [days, setDays] = useState(1);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [isLoadingTenants, setIsLoadingTenants] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { formatPrice, calculateTotal } = usePriceCalculator({
        shortStayPrice: unit?.price || 0,
        longStayThreshold: 15,
        longStayDiscount: 20
    });

    useEffect(() => {
        if (agencyId) {
            fetchTenants();
        }
    }, [agencyId]);

    const fetchTenants = async () => {
        try {
            const data = await dbService.tenants.getAll({ agency_id: agencyId! });
            setTenants(data);
        } catch (error) {
            console.error('Error fetching tenants:', error);
        } finally {
            setIsLoadingTenants(false);
        }
    };

    if (!unit) return null;

    const totalPrice = calculateTotal(days, unit.price);

    const handleConfirm = async () => {
        if (!selectedTenantId) {
            toast.error('Veuillez sélectionner un locataire');
            return;
        }

        try {
            setIsSaving(true);
            const checkIn = new Date();
            const checkOut = new Date();
            checkOut.setDate(checkIn.getDate() + days);

            await dbService.modular.createBooking({
                agency_id: agencyId!,
                residence_id: unit.id,
                tenant_id: selectedTenantId,
                check_in: checkIn.toISOString(),
                check_out: checkOut.toISOString(),
                total_amount: totalPrice,
                amount_paid: 0,
                payment_status: 'pending',
                booking_status: 'confirmed'
            });

            toast.success('Réservation confirmée avec succès');
            onSuccess();
        } catch (error) {
            console.error('Error creating booking:', error);
            toast.error('Erreur lors de la réservation');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="p-0 border-0 shadow-2xl bg-white overflow-hidden max-w-2xl mx-auto">
            <div className="bg-indigo-900 p-6 text-white relative">
                <div className="absolute right-0 top-0 p-8 opacity-10">
                    <Key size={100} />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2 relative z-10">
                    <Key className="text-amber-400" />
                    Nouveau Contrat de Résidence
                </h3>
                <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mt-1 relative z-10">Finalisation de la réservation pour {unit.name}</p>
            </div>

            <div className="p-8 space-y-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-200">
                        <span className="text-[10px] font-black opacity-50 leading-none">ID-{unit.id.slice(0,3)}</span>
                        <span className="font-black text-[10px] uppercase">{unit.type}</span>
                    </div>
                    <div>
                        <p className="font-black text-slate-800 leading-none">{unit.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">
                            <MapPin size={10} /> {unit.site}
                        </p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400">Tarif Base</p>
                        <p className="text-sm font-black text-slate-900">{formatPrice(unit.price)} / nuit</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                <User size={10} /> Locataire (Client)
                            </label>
                            <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                                value={selectedTenantId}
                                onChange={(e) => setSelectedTenantId(e.target.value)}
                            >
                                <option value="">Choisir un client...</option>
                                {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                                ))}
                                {isLoadingTenants && <option disabled>Chargement des clients...</option>}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                <Calendar size={10} /> Durée du séjour
                            </label>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number" 
                                    min="1"
                                    value={days}
                                    onChange={(e) => setDays(Number(e.target.value))}
                                    className="w-24 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-lg font-black focus:border-indigo-500 outline-none transition-colors"
                                />
                                <span className="text-xs font-black uppercase text-slate-500 italic">nuits</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 text-white relative flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total à encaisser</p>
                            <p className="text-3xl font-black mt-2 text-amber-400">{formatPrice(totalPrice)}</p>
                            {days >= 15 && (
                                <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase">
                                    <CheckCircle size={10} /> Remise Long Séjour (-20%) appliquée
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                                <span>Caution (Garantie)</span>
                                <span className="text-white">A définir</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                    <Button variant="outline" onClick={onClose} className="font-black italic">ANNULER</Button>
                    <Button 
                        variant="primary" 
                        onClick={handleConfirm}
                        isLoading={isSaving}
                        className="px-10 font-black italic bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                    >
                        VALIDER LE CONTRAT
                        <ArrowRight size={16} className="ml-2" />
                    </Button>
                </div>
            </div>
        </Card>
    );
};
