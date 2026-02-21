import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AgencySwitcher: React.FC = () => {
    const { user, agencyId, agencies, switchAgency } = useAuth();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Fermer lorsqu'on clique en dehors
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // N'afficher que si le directeur a plusieurs agences
    if (!user || agencies.length < 2) return null;

    const activeAgency = agencies.find((a) => a.agency_id === agencyId) ?? agencies[0];

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                title="Changer d'agence"
            >
                <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="hidden sm:block max-w-[160px] truncate">
                    {activeAgency?.name ?? 'Agence'}
                </span>
                {activeAgency?.city && (
                    <span className="hidden lg:block text-xs text-gray-400 truncate">
                        — {activeAgency.city}
                    </span>
                )}
                <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-700 mb-1">
                        Mes agences ({agencies.length})
                    </p>
                    {agencies.map((agency) => {
                        const isActive = agency.agency_id === agencyId;
                        return (
                            <button
                                key={agency.agency_id}
                                onClick={() => {
                                    switchAgency(agency.agency_id);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <div
                                    className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${isActive
                                            ? 'bg-blue-100 dark:bg-blue-800'
                                            : 'bg-gray-100 dark:bg-gray-700'
                                        }`}
                                >
                                    <Building2
                                        className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500'}`}
                                    />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="font-medium truncate">{agency.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{agency.city} · {agency.role}</p>
                                </div>
                                {isActive && (
                                    <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
