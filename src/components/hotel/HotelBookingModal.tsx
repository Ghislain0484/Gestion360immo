import React, { useState, useEffect } from 'react';
import { Key, User, Calendar, MapPin, ArrowRight, CreditCard } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePriceCalculator } from '../../hooks/usePriceCalculator';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { HotelRoom, ModularClient } from '../../types/modular';
import toast from 'react-hot-toast';

interface HotelBookingModalProps {
    room: HotelRoom | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const HotelBookingModal: React.FC<HotelBookingModalProps> = ({ room, onClose, onSuccess }) => {
    const { agencyId } = useAuth();
    const [days, setDays] = useState(1);
    const [clients, setClients] = useState<ModularClient[]>([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isNewClient, setIsNewClient] = useState(false);
    const [newClientData, setNewClientData] = useState({
        first_name: '',
        last_name: '',
        phone: ''
    });
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash');

    const { formatPrice, calculateTotal } = usePriceCalculator({
        shortStayPrice: room?.base_price_per_night || 0,
        longStayThreshold: 7,
        longStayDiscount: 15
    });

    useEffect(() => {
        if (agencyId) {
            fetchClients();
        }
    }, [agencyId]);

    const fetchClients = async () => {
        try {
            const data = await dbService.modular.getClients(agencyId!, 'hotel');
            setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setIsLoadingClients(false);
        }
    };

    if (!room) return null;

    const totalPrice = calculateTotal(days, room.base_price_per_night);

    const handleConfirm = async () => {
        let clientId = selectedClientId;

        if (isNewClient) {
            if (!newClientData.first_name || !newClientData.last_name || !newClientData.phone) {
                toast.error('Veuillez remplir les informations du client');
                return;
            }
        } else if (!selectedClientId) {
            toast.error('Veuillez sélectionner un client');
            return;
        }

        try {
            setIsSaving(true);
            
            // 1. Create client if new
            if (isNewClient) {
                const newClient = await dbService.modular.createClient({
                    ...newClientData,
                    agency_id: agencyId!,
                    module_type: 'hotel',
                    client_type: 'regular'
                });
                if (newClient) clientId = newClient.id;
            }

            // 2. Create Booking
            const checkIn = new Date();
            const checkOut = new Date();
            checkOut.setDate(checkIn.getDate() + days);

            const booking = await dbService.modular.createBooking({
                agency_id: agencyId!,
                room_id: room.id,
                client_id: clientId,
                check_in: checkIn.toISOString(),
                check_out: checkOut.toISOString(),
                total_amount: totalPrice,
                amount_paid: paymentAmount,
                payment_status: paymentAmount >= totalPrice ? 'paid' : (paymentAmount > 0 ? 'partial' : 'pending'),
                booking_status: 'confirmed'
            });

            // 3. Create Transaction if payment made
            if (paymentAmount > 0 && booking) {
                await dbService.modular.createTransaction({
                    agency_id: agencyId!,
                    module_type: 'hotel',
                    type: 'income',
                    category: 'stay_payment',
                    amount: paymentAmount,
                    payment_method: paymentMethod,
                    description: `Paiement Check-in - Chambre ${room.room_number}`,
                    transaction_date: new Date().toISOString(),
                    related_id: booking.id
                });

                // Sync the booking status again to be safe
                await dbService.modular.syncBookingPaymentStatus(booking.id);
            }

            // 4. Update room status
            await dbService.modular.updateRoomStatus(room.id, 'occupied');

            toast.success('Réservation hôtelière confirmée');
            onSuccess();
        } catch (error) {
            console.error('Error creating booking:', error);
            toast.error('Erreur lors de la réservation');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Card className="p-0 border-0 shadow-2xl bg-white overflow-hidden max-w-3xl w-full">
                <div className="bg-slate-900 p-6 text-white relative">
                    <div className="absolute right-0 top-0 p-8 opacity-10">
                        <Key size={100} />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2 relative z-10">
                        <Key className="text-primary-400" />
                        Check-in Hôtelier
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 relative z-10">Chambre {room.room_number} • {room.room_type}</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-200 text-slate-900">
                            <span className="text-[10px] font-black opacity-50 leading-none px-1">CH-</span>
                            <span className="font-black text-lg">{room.room_number}</span>
                        </div>
                        <div>
                            <p className="font-black text-slate-800 leading-none uppercase">{room.room_type}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">
                                <MapPin size={10} /> Étage {room.floor || 0}
                            </p>
                        </div>
                        <div className="ml-auto text-right">
                            <p className="text-[10px] font-black uppercase text-slate-400">Tarif Nuit</p>
                            <p className="text-sm font-black text-slate-900">{formatPrice(room.base_price_per_night)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section Client */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                    <User size={10} /> Gestion du Client
                                </label>
                                <button 
                                    onClick={() => setIsNewClient(!isNewClient)}
                                    className="text-[9px] font-black text-indigo-600 uppercase hover:underline"
                                >
                                    {isNewClient ? "Utiliser un client existant" : "+ Nouveau Client"}
                                </button>
                            </div>
                            
                            {isNewClient ? (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                    <input 
                                        type="text"
                                        placeholder="Prénom"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500"
                                        value={newClientData.first_name}
                                        onChange={e => setNewClientData(prev => ({ ...prev, first_name: e.target.value }))}
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Nom"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500"
                                        value={newClientData.last_name}
                                        onChange={e => setNewClientData(prev => ({ ...prev, last_name: e.target.value }))}
                                    />
                                    <input 
                                        type="tel"
                                        placeholder="Téléphone"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500"
                                        value={newClientData.phone}
                                        onChange={e => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
                                    />
                                </div>
                            ) : (
                                <select 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary-500 transition-colors"
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                >
                                    <option value="">Sélectionner le client...</option>
                                    {clients.map((c: ModularClient) => (
                                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.phone})</option>
                                    ))}
                                    {isLoadingClients && <option disabled>Chargement...</option>}
                                </select>
                            )}

                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                    <Calendar size={10} /> Durée du séjour
                                </label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={days}
                                        onChange={(e) => setDays(Number(e.target.value))}
                                        className="w-24 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-lg font-black focus:border-primary-500 outline-none transition-colors"
                                    />
                                    <span className="text-xs font-black uppercase text-slate-500 italic">nuits</span>
                                </div>
                            </div>
                        </div>

                        {/* Section Paiement */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                <CreditCard size={10} /> Détails du Paiement
                            </label>
                            
                            <div className="bg-slate-50 p-5 rounded-2xl space-y-4 border border-slate-100">
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Montant Versé</p>
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-xl font-black outline-none focus:border-emerald-500"
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(Number(e.target.value))}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">FCFA</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">Mode de Paiement</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['cash', 'mobile_money', 'card'] as const).map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setPaymentMethod(m)}
                                                className={`py-2 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${
                                                    paymentMethod === m 
                                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                }`}
                                            >
                                                {m === 'cash' ? 'Espèces' : m === 'card' ? 'Carte' : 'Mobile'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary-900 rounded-2xl p-6 text-white relative flex flex-col justify-between shadow-xl">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-primary-200 tracking-widest">Total à régler</p>
                                    <p className="text-3xl font-black mt-1 text-white">{formatPrice(totalPrice)}</p>
                                    <div className="mt-2 flex justify-between items-center text-[10px] font-black uppercase">
                                        <span className="text-primary-300">Reste à payer:</span>
                                        <span className={paymentAmount >= totalPrice ? 'text-green-400' : 'text-rose-400'}>
                                            {formatPrice(Math.max(0, totalPrice - paymentAmount))}
                                        </span>
                                    </div>
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
                            className="px-10 font-black italic bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                        >
                            CONFIRMER CHECK-IN
                            <ArrowRight size={16} className="ml-2" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
