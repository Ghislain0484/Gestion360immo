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

interface PropertyLocationMeta {
  quartier?: string;
  commune?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const searchTerm = `%${searchQuery}%`;
      const nextResults: SearchResult[] = [];

      const { data: owners } = await supabase
        .from('owners')
        .select('id, business_id, first_name, last_name, phone')
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},business_id.ilike.${searchTerm},phone.ilike.${searchTerm}`)
        .limit(5);

      owners?.forEach((owner) => {
        const name = `${owner.first_name} ${owner.last_name}`;
        nextResults.push({
          id: owner.id,
          business_id: owner.business_id,
          type: 'proprietaire',
          title: name,
          subtitle: owner.business_id,
          url: `/proprietaires/${generateUrlSlug(owner.business_id, name)}`,
        });
      });

      const { data: properties } = await supabase
        .from('properties')
        .select('id, business_id, title, location')
        .or(`title.ilike.${searchTerm},business_id.ilike.${searchTerm}`)
        .limit(5);

      properties?.forEach((property) => {
        const locationMeta = typeof property.location === 'object' && property.location
          ? property.location as PropertyLocationMeta
          : null;
        const location = typeof property.location === 'object' && property.location
          ? `${locationMeta?.quartier || ''}, ${locationMeta?.commune || ''}`
          : '';

        nextResults.push({
          id: property.id,
          business_id: property.business_id,
          type: 'bien',
          title: property.title,
          subtitle: location || property.business_id,
          url: `/proprietes/${generateUrlSlug(property.business_id, property.title)}`,
        });
      });

      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, business_id, first_name, last_name, phone')
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},business_id.ilike.${searchTerm},phone.ilike.${searchTerm}`)
        .limit(5);

      tenants?.forEach((tenant) => {
        const name = `${tenant.first_name} ${tenant.last_name}`;
        nextResults.push({
          id: tenant.id,
          business_id: tenant.business_id,
          type: 'locataire',
          title: name,
          subtitle: tenant.business_id,
          url: `/locataires/${generateUrlSlug(tenant.business_id, name)}`,
        });
      });

      setResults(nextResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.url);
    onClose();
    setQuery('');
    setResults([]);
  }, [navigate, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter' && results[selectedIndex]) {
        event.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelect, isOpen, onClose, results, selectedIndex]);

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
        return 'Proprietaire';
      case 'bien':
        return 'Bien';
      case 'locataire':
        return 'Locataire';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4 animate-fade-in-down">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-premium dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher proprietaire, bien, locataire..."
              className="flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary-600 dark:text-primary-400" />}
            <button
              onClick={onClose}
              className="rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Tapez au moins 2 caracteres pour rechercher
              </div>
            ) : results.length === 0 && !isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Aucun resultat trouve pour "{query}"
              </div>
            ) : (
              <div className="py-2">
                {Object.entries(groupedResults).map(([type, typeResults]) => (
                  <div key={type} className="mb-4 last:mb-0">
                    <div className="px-4 py-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      {getTypeLabel(type)}
                    </div>
                    {typeResults.map((result) => {
                      const Icon = getIcon(result.type);
                      const globalIndex = results.indexOf(result);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className={clsx(
                            'flex w-full items-center gap-3 px-4 py-3 transition-colors',
                            isSelected
                              ? 'bg-primary-50 dark:bg-primary-500/10'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                          )}
                        >
                          <div
                            className={clsx(
                              'flex h-10 w-10 items-center justify-center rounded-lg',
                              isSelected
                                ? 'bg-primary-100 dark:bg-primary-500/20'
                                : 'bg-slate-100 dark:bg-slate-800'
                            )}
                          >
                            <Icon
                              className={clsx(
                                'h-5 w-5',
                                isSelected
                                  ? 'text-primary-600 dark:text-primary-300'
                                  : 'text-slate-600 dark:text-slate-300'
                              )}
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-slate-900 dark:text-slate-100">{result.title}</div>
                            {result.subtitle && (
                              <div className="text-sm text-slate-500 dark:text-slate-400">{result.subtitle}</div>
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

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 dark:border-slate-600 dark:bg-slate-800">↑</kbd>
                <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 dark:border-slate-600 dark:bg-slate-800">↓</kbd>
                <span>Naviguer</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 dark:border-slate-600 dark:bg-slate-800">↵</kbd>
                <span>Selectionner</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 dark:border-slate-600 dark:bg-slate-800">Esc</kbd>
              <span>Fermer</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalSearch;
