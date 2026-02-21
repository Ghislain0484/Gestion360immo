// @refresh skip
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { LoginForm } from './components/auth/LoginForm';
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
import { PasswordResetRequest } from './components/auth/PasswordResetRequest';
import { PasswordResetConfirm } from './components/auth/PasswordResetConfirm';
import { CaissePage } from './components/caisse/CaissePage';
import { TicketsPage } from './components/tickets/TicketsPage';
import { InventoryList } from './components/inventory/InventoryList';
import { AgencyPicker } from './components/layout/AgencyPicker';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Erreur</h1>
            <p className="text-gray-600">Une erreur est survenue. Veuillez recharger la page.</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => window.location.reload()}
            >
              Recharger
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

const AppContent: React.FC = () => {
  const { user, admin } = useAuth();

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
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginForm />} />
        <Route path="/admin/login" element={admin ? <Navigate to="/admin" replace /> : <AdminLoginForm />} />
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
          <Route path="/collaboration" element={<CollaborationHub />} />
          <Route path="/rapports" element={<ReportsHub />} />
          <Route path="/notifications" element={<NotificationsCenter />} />
          <Route path="/parametres" element={<SettingsHub />} />

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
        <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />

        {/* Redirect default */}
        {/* Redirect default - handled by specific routes now, fallback to login if no match */}
        <Route path="*" element={<Navigate to={user ? "/" : admin ? "/admin" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;
