import React, { useState, useEffect } from 'react';
import { Key, User, Calendar, MapPin, CheckCircle, ArrowRight, Wallet, CreditCard, Smartphone } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePriceCalculator } from '../../hooks/usePriceCalculator';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { ModularClient } from '../../types/modular';
import toast from 'react-hot-toast';

interface ResidenceBookingModalProps {
    unit: {
        id: string;
        name: string;
        type: string;
        site: string;
        site_id?: string;
        price: number;
    } | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const ResidenceBookingModal: React.FC<ResidenceBookingModalProps> = ({ unit, onClose, onSuccess }) => {
    const { agencyId } = useAuth();
    const [days, setDays] = useState(1);
    const [clients, setClients] = useState<ModularClient[]>([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Dynamic Client Registration & Stay Billing
    const [isNewClient, setIsNewClient] = useState(false);
    const [newClientData, setNewClientData] = useState({
        first_name: '',
        last_name: '',
        phone: ''
    });
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'orange_money' | 'mtn_money' | 'wave' | 'card' | 'bank_transfer'>('cash');

    const { formatPrice, calculateTotal } = usePriceCalculator({
        shortStayPrice: unit?.price || 0,
        longStayThreshold: 15,
        longStayDiscount: 20
    });

    useEffect(() => {
        if (agencyId) {
            fetchClients();
        }
    }, [agencyId]);

    const fetchClients = async () => {
        try {
            const data = await dbService.modular.getClients(agencyId!, 'residences');
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setIsLoadingClients(false);
        }
    };

    if (!unit) return null;

    const totalPrice = calculateTotal(days, unit.price);

    const handleConfirm = async () => {
        let clientId = selectedClientId;

        if (isNewClient) {
            if (!newClientData.first_name || !newClientData.last_name || !newClientData.phone) {
                toast.error('Veuillez remplir toutes les informations du nouveau client');
                return;
            }
        } else if (!selectedClientId) {
            toast.error('Veuillez sélectionner un client');
            return;
        }

        try {
            setIsSaving(true);

            // 1. Create new client if toggled
            if (isNewClient) {
                const newClient = await dbService.modular.createClient({
                    ...newClientData,
                    agency_id: agencyId!,
                    module_type: 'residences',
                    client_type: 'regular'
                });
                if (newClient) clientId = newClient.id;
            }

            // 2. Setup checkin/checkout timestamps
            const checkIn = new Date();
            const checkOut = new Date();
            checkOut.setDate(checkIn.getDate() + days);

            // 3. Insert the stay booking
            const booking = await dbService.modular.createBooking({
                agency_id: agencyId!,
                residence_id: unit.id,
                client_id: clientId,
                check_in: checkIn.toISOString(),
                check_out: checkOut.toISOString(),
                total_amount: totalPrice,
                amount_paid: paymentAmount,
                payment_status: paymentAmount >= totalPrice ? 'paid' : (paymentAmount > 0 ? 'partial' : 'pending'),
                booking_status: 'confirmed'
            });

            // 4. Create financial transaction if payment is collected
            if (paymentAmount > 0 && booking) {
                await dbService.modular.createTransaction({
                    agency_id: agencyId!,
                    module_type: 'residences',
                    type: 'income',
                    category: 'stay_payment',
                    amount: paymentAmount,
                    payment_method: paymentMethod,
                    description: `Encaissement Check-in - Résidence ${unit.name}`,
                    transaction_date: new Date().toISOString(),
                    related_id: booking.id
                });

                // Sync stats and payment balances
                await dbService.modular.syncBookingPaymentStatus(booking.id);
            }

            // 5. Update unit status to occupied
            await dbService.modular.updateUnitStatus(unit.id, 'occupied');

            toast.success('Réservation et contrat de résidence confirmés !');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating residence booking:', error);
            toast.error('Erreur lors de la confirmation de la réservation');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="p-0 border-0 shadow-2xl bg-white overflow-hidden max-w-3xl mx-auto w-full">
            <div className="bg-indigo-900 p-6 text-white relative">
                <div className="absolute right-0 top-0 p-8 opacity-10">
                    <Key size={100} />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2 relative z-10">
                    <Key className="text-amber-400" />
                    Nouveau Contrat de Résidence
                </h3>
                <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mt-1 relative z-10">
                    Finalisation de la réservation pour {unit.name}
                </p>
            </div>

            <div className="p-8 space-y-6">
                {/* Stay Summary Panel */}
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-gray-800 dark:border-gray-700">
                    <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-200 dark:border-gray-700">
                        <span className="text-[10px] font-black opacity-50 leading-none">ID-{unit.id.slice(0,3)}</span>
                        <span className="font-black text-[10px] uppercase text-indigo-600 dark:text-indigo-400 mt-1">{unit.type}</span>
                    </div>
                    <div>
                        <p className="font-black text-slate-800 dark:text-gray-100 leading-none">{unit.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">
                            <MapPin size={10} /> {unit.site}
                        </p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400">Tarif Base</p>
                        <p className="text-sm font-black text-slate-900 dark:text-gray-100">{formatPrice(unit.price)} / nuit</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Form Controls Column */}
                    <div className="space-y-4">
                        {/* Client Selector Header */}
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                <User size={10} /> Locataire (Client)
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsNewClient(!isNewClient)}
                                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase transition-colors"
                            >
                                {isNewClient ? "Utiliser un client existant" : "+ Nouveau Client"}
                            </button>
                        </div>

                        {/* Client Dropdown or New Client Form */}
                        {isNewClient ? (
                            <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/40 space-y-3 animate-in zoom-in-95 duration-200">
                                <div>
                                    <label className="text-[9px] font-black text-slate-450 uppercase">Prénom</label>
                                    <input 
                                        type="text"
                                        placeholder="ex: Jean-Luc"
                                        className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-750 rounded-lg px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none"
                                        value={newClientData.first_name}
                                        onChange={(e) => setNewClientData({...newClientData, first_name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-450 uppercase">Nom de Famille</label>
                                    <input 
                                        type="text"
                                        placeholder="ex: Gbané"
                                        className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-750 rounded-lg px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none"
                                        value={newClientData.last_name}
                                        onChange={(e) => setNewClientData({...newClientData, last_name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-450 uppercase">Téléphone Mobile</label>
                                    <input 
                                        type="text"
                                        placeholder="ex: +225 07 45 89 23 10"
                                        className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-750 rounded-lg px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none"
                                        value={newClientData.phone}
                                        onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                        ) : (
                            <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                            >
                                <option value="">Choisir un client...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                ))}
                                {isLoadingClients && <option disabled>Chargement des clients...</option>}
                            </select>
                        )}

                        {/* Stay Duration */}
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

                    {/* Saisie de Paiement & Totalizer Column */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white relative flex flex-col justify-between space-y-4">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total à encaisser</p>
                            <p className="text-3xl font-black mt-1 text-amber-400">{formatPrice(totalPrice)}</p>
                            {days >= 15 && (
                                <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase">
                                    <CheckCircle size={10} /> Remise Long Séjour (-20%) appliquée
                                </div>
                            )}
                        </div>

                        {/* Billing Controls */}
                        <div className="pt-4 border-t border-white/10 space-y-3">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                    <Wallet size={10} className="text-amber-400" /> Acompte / Versement direct (FCFA)
                                </label>
                                <input 
                                    type="number"
                                    min="0"
                                    max={totalPrice}
                                    placeholder="Saisir montant perçu"
                                    value={paymentAmount || ''}
                                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-black text-white focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            {paymentAmount > 0 && (
                                <div className="animate-in slide-in-from-top-2 duration-250">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                        <CreditCard size={10} className="text-amber-400" /> Mode de Paiement
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('cash')}
                                            className={`py-1.5 rounded-lg text-[10px] font-black uppercase flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'cash' ? 'border-amber-400 bg-amber-400/10 text-amber-400' : 'border-white/10 bg-white/5 text-slate-400'}`}
                                        >
                                            <Wallet size={12} /> Espèces
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('wave')}
                                            className={`py-1.5 rounded-lg text-[10px] font-black uppercase flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'wave' ? 'border-sky-400 bg-sky-400/10 text-sky-400' : 'border-white/10 bg-white/5 text-slate-400'}`}
                                        >
                                            🌊 Wave CI
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('orange_money')}
                                            className={`py-1.5 rounded-lg text-[10px] font-black uppercase flex flex-col items-center gap-1 border transition-all ${paymentMethod === 'orange_money' ? 'border-orange-400 bg-orange-400/10 text-orange-400' : 'border-white/10 bg-white/5 text-slate-400'}`}
                                        >
                                            🍊 Orange
                                        </button>
                                    </div>
                                </div>
                            )}
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
