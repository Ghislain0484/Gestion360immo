import React, { useState, useEffect } from 'react';
import { Building, Users, Plane, Smartphone, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePriceCalculator } from '../../hooks/usePriceCalculator';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { HotelRoom, ModularBooking } from '../../types/modular';
import { HotelBookingModal } from './HotelBookingModal';
import { HotelRoomDetailsModal } from './HotelRoomDetailsModal';
import { RoomForm } from './RoomForm';
import { Modal } from '../ui/Modal';
import { ShuttleRequestModal, MobileMoneyModal, PricingPolicyModal } from '../residences/ResidenceServiceModals';
import { RoomManager } from './RoomManager';
import { ClientCRM } from '../modular/management/ClientCRM';
import { FinanceManager } from '../modular/management/FinanceManager';
import { getCalendarDate, isSameDay } from '../../lib/utils/dateUtils';
import toast from 'react-hot-toast';

export const HotelDashboard: React.FC = () => {
    const { agencyId } = useAuth();
    const [view, setView] = useState<'dashboard' | 'management' | 'finances' | 'crm'>('dashboard');
    const [rooms, setRooms] = useState<HotelRoom[]>([]);
    const [recentBookings, setRecentBookings] = useState<ModularBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);
    const [selectedOccupiedRoom, setSelectedOccupiedRoom] = useState<HotelRoom | null>(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showRoomForm, setShowRoomForm] = useState(false);
    
    // Service Modals State
    const [showShuttle, setShowShuttle] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [showPolicy, setShowPolicy] = useState(false);

    const { formatPrice: localFormatPrice } = usePriceCalculator({
        shortStayPrice: 45000,
        longStayThreshold: 7,
        longStayDiscount: 15
    });
    // Use the formatter to avoid unused warning
    const priceText = (price: number) => localFormatPrice(price);

    useEffect(() => {
        if (agencyId) {
            fetchData();
        }
    }, [agencyId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [roomsData, bookingsData] = await Promise.all([
                dbService.modular.getHotelRooms(agencyId!),
                dbService.modular.getRecentBookings(agencyId!, 5)
            ]);
            setRooms(roomsData);
            setRecentBookings(bookingsData.filter(b => b.room_id !== null));
        } catch (error) {
            console.error('Error fetching hotel data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'occupied': return 'bg-red-50 text-red-700 border-red-200';
            case 'available': return 'bg-green-50 text-green-700 border-green-200';
            case 'cleaning': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'maintenance': return 'bg-gray-50 text-gray-700 border-gray-200';
            case 'reserved': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-gray-50 text-gray-700';
        }
    };

    const handleRoomClick = (room: HotelRoom) => {
        if (room.status === 'available') {
            setSelectedRoom(room);
            setShowBookingModal(true);
        } else if (room.status === 'occupied') {
            setSelectedOccupiedRoom(room);
        } else if (room.status === 'cleaning') {
            if (confirm('Voulez-vous marquer cette chambre comme Prête ?')) {
                dbService.modular.updateRoomStatus(room.id, 'available').then(() => fetchData());
            }
        } else {
            toast.error(`La chambre ${room.room_number} est actuellement ${room.status}`);
        }
    };

    const renderHeader = () => (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 italic">
                    <Building className="text-primary-600" />
                    GESTION HÔTELIÈRE
                </h2>
                <p className="text-gray-500 mt-1 uppercase text-[10px] font-bold tracking-widest">Expertise Côte d'Ivoire • {rooms.length} Chambres</p>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-2xl border-2 border-slate-200">
                <button 
                    onClick={() => setView('dashboard')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Tableau de Bord
                </button>
                <button 
                    onClick={() => setView('management')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'management' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Suivi du Parc
                </button>
                <button 
                    onClick={() => setView('finances')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'finances' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Flux de Trésorerie
                </button>
                <button 
                    onClick={() => setView('crm')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'crm' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Clients
                </button>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-blue-600 shadow-sm">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Taux d'occupation</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-3xl font-black text-gray-900">
                            {rooms.length > 0 ? Math.round((rooms.filter(r => r.status === 'occupied').length / rooms.length) * 100) : 0}%
                        </p>
                        <span className="text-xs text-green-600 font-bold mb-1">Direct</span>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-green-600 shadow-sm">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Arrivées / Départs</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-3xl font-black text-gray-900">{recentBookings.length}</p>
                        <span className="text-[10px] text-gray-400 font-bold mb-1 italic">Mouvements récents</span>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-amber-600 shadow-sm">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Disponibilité immédiate</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-3xl font-black text-amber-600">{rooms.filter(r => r.status === 'available').length}</p>
                        <span className="text-xs text-gray-400 font-bold mb-1">Chambres libres</span>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-indigo-600 shadow-sm">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Services VIP</p>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-3xl font-black text-indigo-600">Active</p>
                        <div className="flex gap-1 mb-1 ml-2">
                            <Plane size={14} className="text-indigo-400" />
                            <Smartphone size={14} className="text-green-500" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 shadow-md border-0 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight italic">État de l'hôtel</h3>
                        <div className="hidden md:flex items-center gap-3 text-[10px] font-black uppercase tracking-tighter text-gray-400">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Libre</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Occupé</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Ménage</span>
                        </div>
                    </div>
                    
                    {rooms.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <Building className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">Aucune chambre configurée</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowRoomForm(true)}>Ajouter la première chambre</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {rooms.map(room => (
                                <div 
                                    key={room.id}
                                    onClick={() => handleRoomClick(room)}
                                    className={`p-4 rounded-2xl border-2 transition-all hover:scale-[1.03] cursor-pointer shadow-sm relative overflow-hidden group ${getStatusColor(room.status)} ${
                                        room.status === 'occupied' && room.current_booking?.[0]?.check_out && getCalendarDate(room.current_booking[0].check_out).getTime() <= getCalendarDate(new Date().toISOString()).getTime()
                                            ? 'ring-2 ring-rose-500 ring-offset-2'
                                            : ''
                                    }`}
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-150 transition-transform">
                                        <Building size={32} />
                                    </div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <span className="font-black text-2xl tracking-tighter leading-none">{room.room_number}</span>
                                            {room.status === 'occupied' && room.current_booking?.[0]?.check_out && (
                                                <span className={`text-[8px] font-black uppercase mt-1 flex items-center gap-1 ${
                                                    getCalendarDate(room.current_booking[0].check_out).getTime() <= getCalendarDate(new Date().toISOString()).getTime() 
                                                        ? 'text-rose-600 animate-pulse' 
                                                        : 'text-slate-500'
                                                }`}>
                                                    {isSameDay(getCalendarDate(room.current_booking[0].check_out), new Date()) ? (
                                                        <><AlertTriangle size={10} /> DÉPART AUJOURD'HUI</>
                                                    ) : getCalendarDate(room.current_booking[0].check_out) < getCalendarDate(new Date().toISOString()) ? (
                                                        <><AlertTriangle size={10} /> SÉJOUR ÉCHU</>
                                                    ) : (
                                                        <><Clock size={10} /> J-{Math.ceil((getCalendarDate(room.current_booking[0].check_out).getTime() - getCalendarDate(new Date().toISOString()).getTime()) / (1000 * 60 * 60 * 24))}</>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/50 font-black uppercase tracking-tighter">{room.room_type}</span>
                                    </div>
                                    <div className="text-xs font-bold truncate mb-1 uppercase">
                                        {room.status}
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <div className="w-16 bg-white/30 h-1 rounded-full overflow-hidden">
                                            <div className={`h-full ${room.status === 'occupied' ? 'w-full bg-red-400' : 'w-0'}`} />
                                        </div>
                                        <span className="text-[8px] font-black opacity-40">{priceText(room.base_price_per_night)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <div className="space-y-6">
                    <Card className="p-6 shadow-md border-0 border-t-4 border-green-600 bg-green-50/30">
                        <h3 className="text-md font-black text-gray-800 uppercase tracking-tight mb-4 flex items-center justify-between italic text-[12px]">
                            Check-in Rapide
                            <Users size={18} className="text-green-600" />
                        </h3>
                        <Button variant="primary" size="sm" className="w-full text-[10px] font-black" onClick={() => setShowBookingModal(true)}>NOUVELLE RÉSERVATION</Button>
                    </Card>

                    <Card className="p-6 shadow-md border-0 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            Services VIP
                            <Plane size={20} className="text-primary-400" />
                        </h3>
                        <div className="space-y-3">
                            <div 
                                onClick={() => setShowShuttle(true)}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <Plane size={18} className="text-primary-400 group-hover:animate-bounce" />
                                    <div>
                                        <p className="text-xs font-bold">Navette Aéroport</p>
                                        <p className="text-[9px] text-gray-400 italic">Prestation de luxe</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-primary-400">À la demande</span>
                            </div>
                            <div 
                                onClick={() => setShowPayment(true)}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <Smartphone size={18} className="text-green-400" />
                                    <div>
                                        <p className="text-xs font-bold">Paiement Mobile</p>
                                        <p className="text-[9px] text-gray-400">Solution intégrée</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin h-10 w-10 text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {renderHeader()}
            
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {view === 'dashboard' && renderDashboard()}
                {view === 'management' && <RoomManager />}
                {view === 'finances' && <FinanceManager moduleType="hotel" />}
                {view === 'crm' && <ClientCRM moduleType="hotel" />}
            </div>

            {/* Modals */}
            <Modal isOpen={!!selectedOccupiedRoom} onClose={() => setSelectedOccupiedRoom(null)} title="" noPadding>
                {selectedOccupiedRoom && (
                    <HotelRoomDetailsModal 
                        room={selectedOccupiedRoom}
                        onClose={() => setSelectedOccupiedRoom(null)} 
                        onSuccess={fetchData} 
                    />
                )}
            </Modal>

            {showBookingModal && (
                <HotelBookingModal 
                    room={selectedRoom} 
                    onClose={() => {
                        setShowBookingModal(false);
                        setSelectedRoom(null);
                    }}
                    onSuccess={() => {
                        setShowBookingModal(false);
                        setSelectedRoom(null);
                        fetchData();
                    }}
                />
            )}

            {showRoomForm && (
                <RoomForm 
                    onClose={() => setShowRoomForm(false)}
                    onSuccess={() => {
                        setShowRoomForm(false);
                        fetchData();
                    }}
                />
            )}

            {showShuttle && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl"><ShuttleRequestModal onClose={() => setShowShuttle(false)} /></div>}
            {showPayment && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl"><MobileMoneyModal onClose={() => setShowPayment(false)} /></div>}
            {showPolicy && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl"><PricingPolicyModal onClose={() => setShowPolicy(false)} /></div>}
        </div>
    );
};
