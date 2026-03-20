import React, { useState } from 'react';
import { Building, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { dbService } from '../../lib/supabase';
import { HotelRoom } from '../../types/modular';
import toast from 'react-hot-toast';

interface RoomFormProps {
    room?: HotelRoom | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const RoomForm: React.FC<RoomFormProps> = ({ room, onClose, onSuccess }) => {
    const { agencyId } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        room_number: room?.room_number || '',
        room_type: room?.room_type || 'standard' as HotelRoom['room_type'],
        floor: room?.floor || 1,
        base_price_per_night: room?.base_price_per_night || 45000,
        status: room?.status || 'available' as HotelRoom['status']
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agencyId) return;

        try {
            setIsSaving(true);
            if (room) {
                await dbService.modular.updateRoom(room.id, {
                    ...formData,
                    agency_id: agencyId
                });
                toast.success('Chambre modifiée avec succès');
            } else {
                await dbService.modular.createRoom({
                    ...formData,
                    agency_id: agencyId
                });
                toast.success('Chambre ajoutée avec succès');
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving room:', error);
            toast.error('Erreur lors de la sauvegarde de la chambre');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Card className="p-0 border-0 shadow-2xl bg-white overflow-hidden max-w-md w-full">
                <div className="bg-primary-900 p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase tracking-tight italic flex items-center gap-2">
                        <Building size={20} className="text-primary-400" />
                        {room ? `Modifier Chambre ${room.room_number}` : 'Nouvelle Chambre'}
                    </h3>
                    <button onClick={onClose} className="hover:rotate-90 transition-transform">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Numéro" 
                            placeholder="ex: 101" 
                            required 
                            value={formData.room_number}
                            onChange={e => setFormData(prev => ({ ...prev, room_number: e.target.value }))}
                        />
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">État Actuel</label>
                            <select 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary-500 transition-colors"
                                value={formData.status}
                                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                            >
                                <option value="available">Disponible</option>
                                <option value="occupied">Occupé</option>
                                <option value="cleaning">Ménage</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="reserved">Réservé</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type de chambre</label>
                        <select 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary-500 transition-colors"
                            value={formData.room_type}
                            onChange={e => setFormData(prev => ({ ...prev, room_type: e.target.value as any }))}
                        >
                            <option value="standard">Standard</option>
                            <option value="suite">Suite</option>
                            <option value="vip">VIP (Luxe)</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Étage" 
                            type="number" 
                            min="0"
                            required 
                            value={formData.floor}
                            onChange={e => setFormData(prev => ({ ...prev, floor: Number(e.target.value) }))}
                        />
                        <Input 
                            label="Tarif / Nuit" 
                            type="number" 
                            min="0"
                            required 
                            value={formData.base_price_per_night}
                            onChange={e => setFormData(prev => ({ ...prev, base_price_per_night: Number(e.target.value) }))}
                        />
                    </div>

                    <div className="pt-6 flex gap-3">
                        <Button variant="outline" type="button" onClick={onClose} className="flex-1 font-black italic uppercase">Annuler</Button>
                        <Button 
                            variant="primary" 
                            type="submit" 
                            isLoading={isSaving} 
                            className="flex-1 font-black italic uppercase bg-primary-600 hover:bg-primary-700"
                        >
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};
