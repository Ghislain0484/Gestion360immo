import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';

interface DemoContextType {
  isDemoMode: boolean;
  isDemoUser: boolean;
  toggleDemoMode: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, owner } = useAuth();
  
  const [isDemoModeManual, setIsDemoModeManual] = useState(() => {
    const saved = localStorage.getItem('demo_mode');
    return saved === 'true';
  });

  // Détection des comptes démo spécifiques
  const isDemoUser = useMemo(() => {
    const email = (user?.email || owner?.email || '').toLowerCase();
    return email === 'demo@gestion360immo.com' || 
           email === 'demo.agence@gestion360immo.com' || 
           email === 'demo.proprio@gestion360immo.com';
  }, [user, owner]);

  const isDemoMode = isDemoModeManual || isDemoUser;

  useEffect(() => {
    localStorage.setItem('demo_mode', String(isDemoModeManual));
  }, [isDemoModeManual]);

  const toggleDemoMode = () => setIsDemoModeManual(prev => !prev);

  return (
    <DemoContext.Provider value={{ isDemoMode, isDemoUser, toggleDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemoMode = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoProvider');
  }
  return context;
};
