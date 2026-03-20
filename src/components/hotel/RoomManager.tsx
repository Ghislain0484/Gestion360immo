import React, { useState, useEffect } from 'react';
import { Building, Plus, Search, Filter, Edit3, Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { HotelRoom } from '../../types/modular';
import { RoomForm } from './RoomForm';
import { usePriceCalculator } from '../../hooks/usePriceCalculator';
import toast from 'react-hot-toast';

export const RoomManager: React.FC = () => {
    const { agencyId } = useAuth();
    const [rooms, setRooms] = useState<HotelRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);

    const { formatPrice } = usePriceCalculator({
        shortStayPrice: 0,
        longStayThreshold: 7,
        longStayDiscount: 15
    });

    useEffect(() => {
        if (agencyId) {
            fetchRooms();
        }
    }, [agencyId]);

    const fetchRooms = async () => {
        try {
            setIsLoading(true);
            const data = await dbService.modular.getHotelRooms(agencyId!);
            setRooms(data);
        } catch (error) {
            console.error('Error fetching rooms:', error);
            toast.error('Erreur lors du chargement des chambres');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (room: HotelRoom) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la chambre ${room.room_number} ?`)) return;
        
        try {
            await dbService.modular.deleteRoom(room.id);
            toast.success('Chambre supprimée');
            fetchRooms();
        } catch (error) {
            console.error('Error deleting room:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available': return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><CheckCircle size={10} /> Libre</span>;
            case 'occupied': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><Building size={10} /> Occupé</span>;
            case 'cleaning': return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><AlertTriangle size={10} /> Ménage</span>;
            case 'maintenance': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1"><AlertTriangle size={10} /> Maintenance</span>;
            default: return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-tighter">{status}</span>;
        }
    };

    const filteredRooms = rooms.filter(room => {
        const matchesSearch = room.room_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || room.room_type === typeFilter;
        const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-primary-600 mb-2" size={32} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analyse du parc hôtelier...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-2">
                        <Building className="text-primary-600" size={24} />
                        Suivi du Parc Chambres
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gérez l'inventaire et les tarifs de vos chambres</p>
                </div>
                <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => { setEditingRoom(null); setShowRoomForm(true); }}>
                    NOUVELLE CHAMBRE
                </Button>
            </div>

            <Card className="p-4 border-0 shadow-sm bg-slate-50/50">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Rechercher par numéro..."
                            className="w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-primary-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="text-slate-400" size={16} />
                        <select 
                            className="bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none focus:border-primary-500"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">Tous les types</option>
                            <option value="standard">Standard</option>
                            <option value="suite">Suite</option>
                            <option value="vip">VIP</option>
                        </select>
                        <select 
                            className="bg-white border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-black uppercase outline-none focus:border-primary-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Tous les états</option>
                            <option value="available">Disponible</option>
                            <option value="occupied">Occupé</option>
                            <option value="cleaning">Ménage</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredRooms.map(room => (
                    <Card key={room.id} className="p-0 border-0 shadow-md hover:shadow-xl transition-all bg-white group overflow-hidden">
                        <div className={`h-1.5 w-full ${
                            room.status === 'available' ? 'bg-green-500' : 
                            room.status === 'occupied' ? 'bg-red-500' : 
                            room.status === 'cleaning' ? 'bg-amber-500' : 'bg-slate-500'
                        }`} />
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex flex-col items-center justify-center border border-slate-200 group-hover:bg-primary-900 group-hover:text-white transition-colors duration-300">
                                        <span className="text-[9px] font-black opacity-50 leading-none">ETG-{room.floor}</span>
                                        <span className="font-black text-lg leading-tight">{room.room_number}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm text-slate-800 uppercase italic leading-none">{room.room_type}</h4>
                                        <div className="mt-2">{getStatusBadge(room.status)}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button 
                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary-600 transition-colors"
                                        onClick={() => { setEditingRoom(room); setShowRoomForm(true); }}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button 
                                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                        onClick={() => handleDelete(room)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix nuitée</span>
                                <span className="text-sm font-black text-primary-600 italic underline decoration-primary-200 underline-offset-4">{formatPrice(room.base_price_per_night)}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {filteredRooms.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Building className="mx-auto text-slate-200 mb-4" size={64} />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Aucune chambre ne correspond à vos critères</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all'); }}>VOIR TOUT LE PARC</Button>
                </div>
            )}

            {showRoomForm && (
                <RoomForm 
                    room={editingRoom}
                    onClose={() => { setShowRoomForm(false); setEditingRoom(null); }}
                    onSuccess={() => {
                        setShowRoomForm(false);
                        setEditingRoom(null);
                        fetchRooms();
                    }}
                />
            )}
        </div>
    );
};
