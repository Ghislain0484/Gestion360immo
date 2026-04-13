// @refresh skip
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { LoginForm } from './components/auth/LoginForm';
import { OwnerSignup } from './components/auth/OwnerSignup';
import { AdminLoginForm } from './components/auth/AdminLoginForm';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { PropertiesList } from './components/properties/PropertiesList';
import { OwnersList } from './components/owners/OwnersList';
import { OwnerDetails } from './components/owners/OwnerDetails';
import { TenantsList } from './components/tenants/TenantsList';
import { TenantDetails } from './components/tenants/TenantDetails';
import { PropertyDetails } from './components/properties/PropertyDetails';
import { ContractsList } from './components/contracts/ContractsList';
import { CollaborationHub } from './components/collaboration/CollaborationHub';
import { ReportsHub } from './components/reports/ReportsHub';
import { NotificationsCenter } from './components/notifications/NotificationsCenter';
import { SettingsHub } from './components/settings/SettingsHub';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuditLogsPage } from './components/admin/AuditLogsPage';
import { PasswordResetRequest } from './components/auth/PasswordResetRequest';
import { PasswordResetConfirm } from './components/auth/PasswordResetConfirm';
import { CaissePage } from './components/caisse/CaissePage';
import { TicketsPage } from './components/tickets/TicketsPage';
import { InventoryList } from './components/inventory/InventoryList';
import { AgencyPicker } from './components/layout/AgencyPicker';
import { HotelDashboard } from './components/hotel/HotelDashboard';
import { ResidencesDashboard } from './components/residences/ResidencesDashboard';
import { DemoProvider } from './contexts/DemoContext';

import { OwnerLayout } from './components/owner-portal/OwnerLayout';
import { OwnerDashboard } from './components/owner-portal/OwnerDashboard';
import { OwnerProperties } from './components/owner-portal/OwnerProperties';
import { OwnerTenants } from './components/owner-portal/OwnerTenants';
import { OwnerFinances } from './components/owner-portal/OwnerFinances';
import { OwnerMaintenance } from './components/owner-portal/OwnerMaintenance';
import { OwnerDocuments } from './components/owner-portal/OwnerDocuments';
import { OwnerSecurity } from './components/owner-portal/OwnerSecurity';
import { OwnerPortfolio } from './components/owner-portal/OwnerPortfolio';
import { OwnerEnhancement } from './components/owner-portal/OwnerEnhancement';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null, errorInfo: React.ErrorInfo | null }> {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">CRASH DE RENDU REACT</h1>
            <p className="text-gray-600 mb-4 font-bold">L'application a planté pour la raison suivante :</p>
            <div className="bg-red-50 text-red-900 border border-red-200 p-4 rounded text-left overflow-auto mb-6 text-sm">
              <p className="font-mono font-bold mb-2 break-all">
                {this.state.error && (this.state.error as Error).toString()}
              </p>
              <pre className="text-xs text-red-700 whitespace-pre-wrap">
                {this.state.errorInfo && (this.state.errorInfo as React.ErrorInfo).componentStack}
              </pre>
            </div>
            <button
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
              onClick={() => window.location.reload()}
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


// Route protégée pour utilisateurs
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading, agencyId } = useAuth();
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  // Si l'utilisateur est connecté mais qu'aucune agence n'est résolue (choix requis ou erreur)
  if (!agencyId && user) {
    return <AgencyPicker />;
  }
  return <>{children}</>;
};

// Route protégée pour admins
const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

// Route protégée pour propriétaires
const OwnerProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { owner, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  if (!owner) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

import { APP_NAME, IS_STANDALONE, APP_EDITION, HIDE_PLATFORM_ADMIN } from './lib/constants';

// Guard for modular features
const ModuleGuard: React.FC<{ children: React.ReactNode; module: string }> = ({ children, module }) => {
  const { agencies, agencyId } = useAuth();
  const currentAgency = agencies.find(a => a.agency_id === agencyId);
  const enabledModules = IS_STANDALONE 
    ? ['base', 'hotel', 'residences', 'collaboration'] 
    : (currentAgency?.enabled_modules || ['base']);

  const isEditionAllowed = APP_EDITION === 'full' || (module !== 'hotel' && module !== 'residences');
  const isModuleEnabled = enabledModules.includes(module);

  if (!isEditionAllowed || !isModuleEnabled) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, admin, owner } = useAuth();

  React.useEffect(() => {
    if (user?.agency_id && user.id) {
      // Check for payment reminders on app load
      import('./services/paymentReminderService').then(({ paymentReminderService }) => {
        if (user.id) {
          paymentReminderService.checkAndSendReminders(user.agency_id as string, user.id);
        }
      });
    }
  }, [user]);

  return (
    <Router>
      <Routes>
        {/* Login routes */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : admin ? <Navigate to="/admin" replace /> : owner ? <Navigate to="/espace-proprietaire" replace /> : <LoginForm />} />
        <Route path="/admin/login" element={admin ? <Navigate to="/admin" replace /> : <AdminLoginForm />} />
        <Route path="/inscription-proprietaire" element={<OwnerSignup />} />
        <Route path="/password-reset" element={<PasswordResetRequest />} />
        <Route path="/reset-password" element={<PasswordResetConfirm />} />

        {/* User protected routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* New French Routes */}
          <Route path="/proprietaires" element={<OwnersList />} />
          <Route path="/proprietaires/:id" element={<OwnerDetails />} />
          <Route path="/proprietes" element={<PropertiesList />} />
          <Route path="/proprietes/:id" element={<PropertyDetails />} />
          <Route path="/locataires" element={<TenantsList />} />
          <Route path="/locataires/:id" element={<TenantDetails />} />
          <Route path="/etats-des-lieux" element={<InventoryList />} />
          <Route path="/travaux" element={<TicketsPage />} />
          <Route path="/caisse" element={<CaissePage />} />
          <Route path="/contrats" element={<ContractsList />} />
          <Route 
            path="/collaboration" 
            element={<ModuleGuard module="collaboration"><CollaborationHub /></ModuleGuard>} 
          />
          <Route path="/rapports" element={<ReportsHub />} />
          <Route path="/notifications" element={<NotificationsCenter />} />
          <Route path="/parametres" element={<SettingsHub />} />
          <Route path="/admin/audit" element={<AuditLogsPage />} />
          
          {/* Modular Routes */}
          <Route 
            path="/hotel" 
            element={<ModuleGuard module="hotel"><HotelDashboard /></ModuleGuard>} 
          />
          <Route 
            path="/residences" 
            element={<ModuleGuard module="residences"><ResidencesDashboard /></ModuleGuard>} 
          />

          {/* Legacy Routes Redirects or Aliases */}
          <Route path="/owners" element={<Navigate to="/proprietaires" replace />} />
          <Route path="/properties" element={<Navigate to="/proprietes" replace />} />
          <Route path="/tenants" element={<Navigate to="/locataires" replace />} />
          <Route path="/receipts" element={<Navigate to="/caisse" replace />} />
          <Route path="/settings" element={<Navigate to="/parametres" replace />} />

          {/* Legacy Routes Redirects */}
          <Route path="/contracts" element={<Navigate to="/contrats" replace />} />
          <Route path="/reports" element={<Navigate to="/rapports" replace />} />
        </Route>

        {/* Admin protected route */}
        {!HIDE_PLATFORM_ADMIN && (
          <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        )}

        {/* Owner protected routes */}
        <Route path="/espace-proprietaire" element={<OwnerProtectedRoute><OwnerLayout /></OwnerProtectedRoute>}>
          <Route index element={<OwnerDashboard />} />
          <Route path="proprietes" element={<OwnerProperties />} />
          <Route path="locataires" element={<OwnerTenants />} />
          <Route path="finances" element={<OwnerFinances />} />
          <Route path="documents" element={<OwnerDocuments />} />
          <Route path="travaux" element={<OwnerMaintenance />} />
          <Route path="patrimoine" element={<OwnerPortfolio />} />
          <Route path="embellissement" element={<OwnerEnhancement />} />
          <Route path="securite" element={<OwnerSecurity />} />
        </Route>

        {/* Redirect default */}
        {/* Redirect default - handled by specific routes now, fallback to login if no match */}
        <Route path="*" element={<Navigate to={user ? "/" : admin ? "/admin" : owner ? "/espace-proprietaire" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <AuthProvider>
          <DemoProvider>
            <AdminProvider>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </AdminProvider>
          </DemoProvider>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
