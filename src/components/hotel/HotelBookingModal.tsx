import React, { useState, useEffect } from 'react';
import { Key, User, Calendar, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
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
        if (!selectedClientId) {
            toast.error('Veuillez sélectionner un client');
            return;
        }

        try {
            setIsSaving(true);
            const checkIn = new Date();
            const checkOut = new Date();
            checkOut.setDate(checkIn.getDate() + days);

            await dbService.modular.createBooking({
                agency_id: agencyId!,
                room_id: room.id,
                client_id: selectedClientId,
                check_in: checkIn.toISOString(),
                check_out: checkOut.toISOString(),
                total_amount: totalPrice,
                amount_paid: 0,
                payment_status: 'pending',
                booking_status: 'confirmed'
            });

            // Update room status
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
            <Card className="p-0 border-0 shadow-2xl bg-white overflow-hidden max-w-2xl w-full">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                    <User size={10} /> Client (Hôtel)
                                </label>
                                <select 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary-500 transition-colors"
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                >
                                    <option value="">Sélectionner le client...</option>
                                    {clients.map((c: ModularClient) => (
                                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                    ))}
                                    {isLoadingClients && <option disabled>Chargement...</option>}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                    <Calendar size={10} /> Nombre de nuits
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

                        <div className="bg-primary-900 rounded-2xl p-6 text-white relative flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-primary-200 tracking-widest">Estimation du séjour</p>
                                <p className="text-3xl font-black mt-2 text-white">{formatPrice(totalPrice)}</p>
                                {days >= 7 && (
                                    <div className="mt-2 flex items-center gap-1 text-[9px] font-black text-green-400 uppercase">
                                        <CheckCircle size={10} /> Remise Long Séjour (-15%)
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-primary-300">
                                    <span>Paiement à l'arrivée</span>
                                    <span className="text-white font-black italic">CONSEILLÉ</span>
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
                            className="px-10 font-black italic bg-primary-600 hover:bg-primary-700"
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
