import { Search, Filter, MapPin, Layers, DollarSign, X } from 'lucide-react';

interface ModularFiltersProps {
    showZones?: boolean;
    showTypes?: boolean;
}

export const ModularFilters: React.FC<ModularFiltersProps> = ({ 
    showZones = true,
    showTypes = true 
}) => {
    const zones = ['Toutes les zones', 'Cocody', 'Plateau', 'Marcory', 'Assinie', 'Riviera'];
    const types = [
        { id: 'all', name: 'Tous les types' },
        { id: 'studio', name: 'Studio' },
        { id: '2-pieces', name: '2 Pièces' },
        { id: '3-pieces', name: '3 Pièces' },
        { id: 'penthouse', name: 'Penthouse' },
        { id: 'villa', name: 'Villa' },
    ];

    return (
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Chercher par nom, site ou réf..." 
                    className="w-full bg-slate-50 border-0 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-primary-500/20 transition-all"
                />
            </div>

            {showZones && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <MapPin size={14} className="text-primary-600" />
                    <select className="bg-transparent text-[11px] font-black uppercase tracking-tight outline-none border-0 p-0 cursor-pointer">
                        {zones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                </div>
            )}

            {showTypes && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <Layers size={14} className="text-secondary-600" />
                    <select className="bg-transparent text-[11px] font-black uppercase tracking-tight outline-none border-0 p-0 cursor-pointer">
                        {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            )}

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                <DollarSign size={14} className="text-green-600" />
                <select className="bg-transparent text-[11px] font-black uppercase tracking-tight outline-none border-0 p-0 cursor-pointer">
                    <option>Tous les tarifs</option>
                    <option>&lt; 50k FCFA</option>
                    <option>50k - 100k FCFA</option>
                    <option>&gt; 100k FCFA</option>
                </select>
            </div>

            <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
                <X size={16} />
            </button>
            
            <button className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase italic shadow-lg shadow-primary-200 hover:bg-primary-700 transition-colors">
                <Filter size={14} />
                Filtrer
            </button>
        </div>
    );
};
