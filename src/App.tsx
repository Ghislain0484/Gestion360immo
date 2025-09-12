// @refresh skip
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { AdminLoginForm } from './components/auth/AdminLoginForm';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { PropertiesList } from './components/properties/PropertiesList';
import { OwnersList } from './components/owners/OwnersList';
import { TenantsList } from './components/tenants/TenantsList';
import { ContractsList } from './components/contracts/ContractsList';
import { CollaborationHub } from './components/collaboration/CollaborationHub';
import { ReportsHub } from './components/reports/ReportsHub';
import { NotificationsCenter } from './components/notifications/NotificationsCenter';
import { SettingsHub } from './components/settings/SettingsHub';
import { ReceiptsList } from './components/receipts/ReceiptsList';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PasswordResetRequest } from './components/auth/PasswordResetRequest';
import { PasswordResetConfirm } from './components/auth/PasswordResetConfirm';

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
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
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

  return (
    <Router>
      <Routes>
        {/* Login routes */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginForm />} />
        <Route path="/admin/login" element={admin ? <Navigate to="/admin" replace /> : <AdminLoginForm />} />
        <Route path="/password-reset" element={<PasswordResetRequest />} />
        <Route path="/reset-password" element={<PasswordResetConfirm />} />

        {/* User protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/properties" element={<ProtectedRoute><Layout><PropertiesList /></Layout></ProtectedRoute>} />
        <Route path="/owners" element={<ProtectedRoute><Layout><OwnersList /></Layout></ProtectedRoute>} />
        <Route path="/tenants" element={<ProtectedRoute><Layout><TenantsList /></Layout></ProtectedRoute>} />
        <Route path="/contracts" element={<ProtectedRoute><Layout><ContractsList /></Layout></ProtectedRoute>} />
        <Route path="/receipts" element={<ProtectedRoute><Layout><ReceiptsList /></Layout></ProtectedRoute>} />
        <Route path="/collaboration" element={<ProtectedRoute><Layout><CollaborationHub /></Layout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Layout><ReportsHub /></Layout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsCenter /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><SettingsHub /></Layout></ProtectedRoute>} />

        {/* Admin protected route */}
        <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />

        {/* Redirect default */}
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;