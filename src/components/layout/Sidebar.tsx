// @refresh skip
import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Building2, Users, UserCheck, FileText, Receipt, MessageSquare,
  Settings, BarChart3, Bell, Shield, UserCog, LucideProps,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isCollapsed: boolean;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<LucideProps>;
}

const getUserNavigation = (userRole: string | null): NavigationItem[] => [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home },
  { name: 'Propriétaires', href: '/owners', icon: Users },
  { name: 'Propriétés', href: '/properties', icon: Building2 },
  { name: 'Locataires', href: '/tenants', icon: UserCheck },
  { name: 'Contrats', href: '/contracts', icon: FileText },
  { name: 'Quittances', href: '/receipts', icon: Receipt },
  { name: 'Collaboration', href: '/collaboration', icon: MessageSquare },
  ...(userRole !== 'agent' ? [{ name: 'Rapports', href: '/reports', icon: BarChart3 }] : []),
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

const getAdminNavigation = (adminRole: 'super_admin' | 'admin'): NavigationItem[] => [
  { name: 'Tableau de bord Admin', href: '/admin/dashboard', icon: Home },
  { name: 'Utilisateurs', href: '/admin/users', icon: UserCog },
  { name: 'Propriétés', href: '/admin/properties', icon: Building2 },
  { name: 'Rapports', href: '/admin/reports', icon: BarChart3 },
  ...(adminRole === 'super_admin' ? [{ name: 'Paramètres', href: '/admin/settings', icon: Settings }] : []),
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const { user, admin } = useAuth();

  const navigation = useMemo(() => {
    if (admin) {
      return getAdminNavigation(admin.role);
    }
    if (user) {
      return getUserNavigation(user.role);
    }
    return []; // Si ni user ni admin, menu vide
  }, [user, admin]);

  return (
    <div
      className={cn(
        'transition-all duration-300 flex flex-col',
        admin ? 'bg-red-900 text-white' : 'bg-gray-900 text-white',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      aria-label={admin ? 'Barre latérale d’administration' : 'Barre latérale utilisateur'}
    >
      <div className="p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {admin ? (
              <Shield className="h-8 w-8 text-red-400" aria-hidden={true} />
            ) : (
              <Building2 className="h-8 w-8 text-blue-400" aria-hidden={true} />
            )}
          </div>
          {!isCollapsed && (
            <div className="ml-3">
              <h1 className="text-lg font-semibold">
                {admin ? 'Admin Panel' : 'Gestion360Immo'}
              </h1>
              <p className="text-sm text-gray-400">
                {admin ? 'Gestion Plateforme' : 'Gestion Collaborative'}
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1" aria-label="Navigation principale">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }: { isActive: boolean }) =>
              cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? admin
                    ? 'bg-red-800 text-white'
                    : 'bg-gray-800 text-white'
                  : admin
                    ? 'text-red-300 hover:bg-red-700 hover:text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )
            }
            aria-current={item.href ? 'page' : undefined}
            aria-label={`Naviguer vers ${item.name}`}
          >
            <item.icon
              className={cn('mr-3 h-5 w-5 flex-shrink-0', isCollapsed ? 'mx-auto' : '')}
              aria-hidden={true}
            />
            {!isCollapsed && item.name}
          </NavLink>
        ))}
      </nav>

      {!isCollapsed && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center',
                  admin ? 'bg-red-500' : 'bg-blue-500'
                )}
              >
                <span className="text-sm font-medium text-white">
                  {user?.first_name?.[0] || admin?.role?.[0] || 'U'}
                  {user?.last_name?.[0] || 'N'}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                {user ? `${user.first_name} ${user.last_name}` : admin ? 'Administrateur' : 'Utilisateur'}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {user?.role || admin?.role || 'agent'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
