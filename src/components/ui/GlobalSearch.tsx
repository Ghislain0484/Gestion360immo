import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Building2, User, Key, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../../lib/supabase';
import { generateUrlSlug } from '../../utils/businessIdGenerator';

export interface SearchResult {
    id: string;
    business_id: string;
    type: 'proprietaire' | 'bien' | 'locataire';
    title: string;
    subtitle?: string;
    url: string;
}

export interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Search function with debounce
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setIsLoading(true);

        try {
            const searchTerm = `%${searchQuery}%`;
            const results: SearchResult[] = [];

            // Search owners
            const { data: owners } = await supabase
                .from('owners')
                .select('id, business_id, first_name, last_name, phone')
                .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},business_id.ilike.${searchTerm},phone.ilike.${searchTerm}`)
                .limit(5);

            if (owners) {
                owners.forEach((owner) => {
                    const name = `${owner.first_name} ${owner.last_name}`;
                    results.push({
                        id: owner.id,
                        business_id: owner.business_id,
                        type: 'proprietaire',
                        title: name,
                        subtitle: owner.business_id,
                        url: `/proprietaires/${generateUrlSlug(owner.business_id, name)}`,
                    });
                });
            }

            // Search properties
            const { data: properties } = await supabase
                .from('properties')
                .select('id, business_id, title, location')
                .or(`title.ilike.${searchTerm},business_id.ilike.${searchTerm}`)
                .limit(5);

            if (properties) {
                properties.forEach((property) => {
                    const location = typeof property.location === 'object' && property.location
                        ? `${(property.location as any).quartier || ''}, ${(property.location as any).commune || ''}`
                        : '';
                    results.push({
                        id: property.id,
                        business_id: property.business_id,
                        type: 'bien',
                        title: property.title,
                        subtitle: location || property.business_id,
                        url: `/proprietes/${generateUrlSlug(property.business_id, property.title)}`,
                    });
                });
            }

            // Search tenants
            const { data: tenants } = await supabase
                .from('tenants')
                .select('id, business_id, first_name, last_name, phone')
                .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},business_id.ilike.${searchTerm},phone.ilike.${searchTerm}`)
                .limit(5);

            if (tenants) {
                tenants.forEach((tenant) => {
                    const name = `${tenant.first_name} ${tenant.last_name}`;
                    results.push({
                        id: tenant.id,
                        business_id: tenant.business_id,
                        type: 'locataire',
                        title: name,
                        subtitle: tenant.business_id,
                        url: `/locataires/${generateUrlSlug(tenant.business_id, name)}`,
                    });
                });
            }

            setResults(results);
            setSelectedIndex(0);
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, performSearch]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && results[selectedIndex]) {
                e.preventDefault();
                handleSelect(results[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    const handleSelect = (result: SearchResult) => {
        navigate(result.url);
        onClose();
        setQuery('');
        setResults([]);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'proprietaire':
                return User;
            case 'bien':
                return Building2;
            case 'locataire':
                return Key;
            default:
                return Search;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'proprietaire':
                return 'Propriétaire';
            case 'bien':
                return 'Bien';
            case 'locataire':
                return 'Locataire';
            default:
                return '';
        }
    };

    if (!isOpen) return null;

    // Group results by type
    const groupedResults = results.reduce((acc, result) => {
        if (!acc[result.type]) {
            acc[result.type] = [];
        }
        acc[result.type].push(result);
        return {};
    }, {} as Record<string, SearchResult[]>);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-fade-in"
                onClick={onClose}
            />

            {/* Search Modal */}
            <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4 animate-fade-in-down">
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-premium overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Rechercher propriétaire, bien, locataire..."
                            className="flex-1 text-base outline-none placeholder-gray-400"
                        />
                        {isLoading && <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />}
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Results */}
                    <div className="max-h-96 overflow-y-auto">
                        {query.length < 2 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                Tapez au moins 2 caractères pour rechercher
                            </div>
                        ) : results.length === 0 && !isLoading ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                Aucun résultat trouvé pour "{query}"
                            </div>
                        ) : (
                            <div className="py-2">
                                {Object.entries(groupedResults).map(([type, typeResults]) => (
                                    <div key={type} className="mb-4 last:mb-0">
                                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                                            {getTypeLabel(type as any)}
                                        </div>
                                        {typeResults.map((result, index) => {
                                            const Icon = getIcon(result.type);
                                            const globalIndex = results.indexOf(result);
                                            const isSelected = globalIndex === selectedIndex;

                                            return (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleSelect(result)}
                                                    className={clsx(
                                                        'w-full flex items-center gap-3 px-4 py-3 transition-colors',
                                                        isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                                                    )}
                                                >
                                                    <div
                                                        className={clsx(
                                                            'flex items-center justify-center w-10 h-10 rounded-lg',
                                                            isSelected ? 'bg-primary-100' : 'bg-gray-100'
                                                        )}
                                                    >
                                                        <Icon
                                                            className={clsx(
                                                                'w-5 h-5',
                                                                isSelected ? 'text-primary-600' : 'text-gray-600'
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <div className="font-medium text-gray-900">{result.title}</div>
                                                        {result.subtitle && (
                                                            <div className="text-sm text-gray-500">{result.subtitle}</div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↑</kbd>
                                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↓</kbd>
                                <span>Naviguer</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↵</kbd>
                                <span>Sélectionner</span>
                            </span>
                        </div>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd>
                            <span>Fermer</span>
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GlobalSearch;
