import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.caisse': 'Caisse',
    'nav.owners': 'Propriétaires',
    'nav.properties': 'Biens',
    'nav.tenants': 'Locataires',
    'nav.contracts': 'Contrats',
    'nav.reports': 'Rapports',
    'nav.settings': 'Paramètres',
    'collab.title': 'Collaboration Inter-Agences',
    'collab.marketplace': 'Place de marché',
    'stats.total_properties': 'Total des biens',
    'stats.occupancy_rate': "Taux d'occupation",
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    // Ajoutez d'autres clés ici
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.caisse': 'Cash Desk',
    'nav.owners': 'Owners',
    'nav.properties': 'Properties',
    'nav.tenants': 'Tenants',
    'nav.contracts': 'Contracts',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'collab.title': 'Inter-Agency Collaboration',
    'collab.marketplace': 'Marketplace',
    'stats.total_properties': 'Total Properties',
    'stats.occupancy_rate': 'Occupancy Rate',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    // Add other keys here
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguage] = useState<Language>('fr');

  useEffect(() => {
    // Charger la langue depuis les paramètres sauvegardés
    const settingsKey = `appearance_settings_${user?.agency_id}`;
    const savedSettings = localStorage.getItem(settingsKey);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.language) setLanguage(parsed.language);
      } catch (e) {}
    }

    // Écouter les changements de paramètres (si modifiés dans un autre onglet ou composant)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === settingsKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.language) setLanguage(parsed.language);
        } catch (e) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.agency_id]);

  const t = (key: string): string => {
    return translations[language][key] || translations['fr'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
