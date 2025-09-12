import React, { useMemo } from 'react';
import { Menu, Search, Bell, LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { BibleVerseCard } from '../ui/BibleVerse';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, admin, logout } = useAuth();
  const [showVerse, setShowVerse] = React.useState(false);

  const isAdmin = useMemo(() => !!admin, [admin]);
  const displayName = useMemo(
    () => (user ? `${user.first_name} ${user.last_name}` : admin ? 'Administrateur' : 'Utilisateur'),
    [user, admin]
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Recherche:', e.target.value);
  };

  const handleNotifications = () => {
    console.log('Afficher les notifications');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="mr-4"
            aria-label="Ouvrir ou fermer la barre latérale"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              onChange={handleSearch}
              aria-label="Rechercher des propriétés, contrats ou utilisateurs"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNotifications}
            aria-label="Voir les notifications"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVerse(!showVerse)}
            aria-label={showVerse ? 'Masquer le verset du jour' : 'Afficher le verset du jour'}
          >
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </Button>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div
                className={`h-8 w-8 rounded-full ${
                  isAdmin ? 'bg-red-500' : 'bg-blue-500'
                } flex items-center justify-center`}
                aria-hidden="true"
              >
                <span className="text-sm font-medium text-white">
                  {user?.first_name?.[0] || admin?.role?.[0] || 'U'}
                  {user?.last_name?.[0] || 'N'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">{displayName}</span>
                {isAdmin && (
                  <span className="text-xs text-red-600 block capitalize">{admin?.role}</span>
                )}
                {user && (
                  <span className="text-xs text-gray-400 block capitalize">{user.role || 'agent'}</span>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-red-600 hover:text-red-700"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {showVerse && (
        <div className="px-4 pb-4">
          <BibleVerseCard compact={true} />
        </div>
      )}
    </header>
  );
};