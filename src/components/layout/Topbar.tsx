import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Moon, Sun, Menu, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GlobalSearch } from '../ui/GlobalSearch';
import toast from 'react-hot-toast';

interface TopbarProps {
    onMenuClick: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem(`theme_${user?.agency_id}`);
        return saved === 'dark';
    });
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // 🔹 Debug: Afficher les données utilisateur
    useEffect(() => {
        console.log('🔍 Topbar: Données utilisateur:', {
            user,
            first_name: user?.first_name,
            last_name: user?.last_name,
            email: user?.email,
            phone: user?.phone,
            role: user?.role,
            agency_id: user?.agency_id
        });
    }, [user]);

    // Keyboard shortcut for search (Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Apply dark mode on mount
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        document.documentElement.classList.toggle('dark', newMode);
        localStorage.setItem(`theme_${user?.agency_id}`, newMode ? 'dark' : 'light');
        toast.success(newMode ? '🌙 Mode sombre activé' : '☀️ Mode clair activé');
    };

    const handleSignOut = async () => {
        try {
            await logout();
            navigate('/login');
            toast.success('Déconnexion réussie');
        } catch (error) {
            toast.error('Erreur lors de la déconnexion');
        }
    };

    return (
        <>
            <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                <div className="flex items-center justify-between h-16 px-4 lg:px-6">
                    {/* Left: Mobile menu + Search */}
                    <div className="flex items-center gap-3 flex-1">
                        {/* Mobile menu button */}
                        <button
                            onClick={onMenuClick}
                            className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Ouvrir le menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Search button */}
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200 w-full max-w-md group"
                        >
                            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                            <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200">
                                Rechercher...
                            </span>
                            <kbd className="ml-auto hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs text-gray-500 dark:text-gray-400">
                                <span>Ctrl</span>
                                <span>K</span>
                            </kbd>
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        {/* Dark mode toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Basculer le mode sombre"
                            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                        >
                            {isDarkMode ? (
                                <Sun className="w-5 h-5" />
                            ) : (
                                <Moon className="w-5 h-5" />
                            )}
                        </button>

                        {/* Notifications */}
                        <button
                            onClick={() => navigate('/notifications')}
                            className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            aria-label="Notifications"
                            title="Notifications"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
                        </button>

                        {/* User menu */}
                        <div className="relative flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700" ref={profileMenuRef}>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <div className="hidden sm:block text-right">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {user?.first_name} {user?.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {user?.role || 'Agent'}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-primary-600 to-indigo-600 text-white rounded-full font-semibold text-sm shadow-md hover:shadow-lg transition-shadow">
                                    {user?.first_name?.[0]}
                                    {user?.last_name?.[0]}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {showProfileMenu && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {user?.first_name} {user?.last_name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {user?.email}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            navigate('/parametres');
                                            setShowProfileMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        Mon profil
                                    </button>

                                    <button
                                        onClick={() => {
                                            navigate('/parametres');
                                            setShowProfileMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Paramètres
                                    </button>

                                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Déconnexion
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Global Search Modal */}
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        </>
    );
};

export default Topbar;
