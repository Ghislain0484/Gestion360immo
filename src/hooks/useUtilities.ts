import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook pour détecter les clics en dehors d'un élément
 */
export const useClickOutside = <T extends HTMLElement>(
    callback: () => void
): React.RefObject<T> => {
    const ref = useRef<T>(null);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [callback]);

    return ref;
};

/**
 * Hook pour debounce (optimisation des recherches)
 */
export const useDebounce = <T,>(value: T, delay: number = 500): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

/**
 * Hook pour intersection observer (lazy loading images)
 */
export const useIntersectionObserver = (
    options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement>, boolean] => {
    const ref = useRef<HTMLDivElement>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            setIsIntersecting(entry.isIntersecting);
        }, options);

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [options]);

    return [ref, isIntersecting];
};

/**
 * Hook pour gérer le localStorage avec TypeScript
 */
export const useLocalStorage = <T,>(
    key: string,
    initialValue: T
): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.error(`Error setting localStorage key "${key}":`, error);
            }
        },
        [key, storedValue]
    );

    return [storedValue, setValue];
};

/**
 * Hook pour gérer les raccourcis clavier
 */
export const useKeyboardShortcut = (
    key: string,
    callback: () => void,
    modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const { ctrl = false, shift = false, alt = false } = modifiers;

            if (
                event.key.toLowerCase() === key.toLowerCase() &&
                event.ctrlKey === ctrl &&
                event.shiftKey === shift &&
                event.altKey === alt
            ) {
                event.preventDefault();
                callback();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [key, callback, modifiers]);
};

/**
 * Hook pour copier dans le presse-papier
 */
export const useCopyToClipboard = (): [(text: string) => Promise<boolean>, boolean] => {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async (text: string): Promise<boolean> => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            return true;
        } catch (error) {
            console.error('Failed to copy:', error);
            setIsCopied(false);
            return false;
        }
    };

    return [copyToClipboard, isCopied];
};

/**
 * Hook pour gérer le scroll
 */
export const useScrollPosition = () => {
    const [scrollPosition, setScrollPosition] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            setScrollPosition(window.pageYOffset);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return scrollPosition;
};

/**
 * Hook pour gérer le media query
 */
export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }

        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [matches, query]);

    return matches;
};

import { useState } from 'react';
