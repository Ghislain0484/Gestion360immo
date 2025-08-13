import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  Users, 
  UserCheck, 
  FileText, 
  Receipt,
  MessageSquare, 
  Settings,
  BarChart3,
  Bell,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

const getNavigation = (userRole: string) => [
  { name: 'Tableau de bord', href: '/dashboard', icon: Home },
  { name: 'Propriétés', href: '/properties', icon: Building2 },
  { name: 'Propriétaires', href: '/owners', icon: Users },
  { name: 'Locataires', href: '/tenants', icon: UserCheck },
  { name: 'Contrats', href: '/contracts', icon: FileText },
  { name: 'Quittances', href: '/receipts', icon: Receipt },
  { name: 'Collaboration', href: '/collaboration', icon: MessageSquare },
  ...(userRole !== 'agent' ? [{ name: 'Rapports', href: '/reports', icon: BarChart3 }] : []),
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isCollapsed: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed }) => {
  const { user, admin } = useAuth();
  
  // If admin is logged in, show admin navigation
  if (admin) {
    return (
      <div className={cn(
        'bg-red-900 text-white transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}>
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-red-400" />
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <h1 className="text-lg font-semibold">Admin Panel</h1>
                <p className="text-sm text-red-400">Gestion Plateforme</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 px-2 py-4">
          <p className="text-red-300 text-sm px-2 mb-4">
            {!isCollapsed && 'Dashboard Administrateur'}
          </p>
        </div>

        {!isCollapsed && (
          <div className="p-4 border-t border-red-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {admin.firstName?.[0]}{admin.lastName?.[0]}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{admin.firstName} {admin.lastName}</p>
                <p className="text-xs text-red-400 capitalize">{admin.role}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  const navigation = getNavigation(user?.role || 'agent');

  return (
    <div className={cn(
      'bg-gray-900 text-white transition-all duration-300 flex flex-col',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className="p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Building2 className="h-8 w-8 text-blue-400" />
          </div>
          {!isCollapsed && (
            <div className="ml-3">
              <h1 className="text-lg font-semibold">Gestion360Immo</h1>
              <p className="text-sm text-gray-400">Gestion Collaborative</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )
            }
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {!isCollapsed && item.name}
          </NavLink>
        ))}
      </nav>

      {!isCollapsed && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};