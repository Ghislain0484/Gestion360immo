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
    'nav.audit': "Journal d'Audit",
    'nav.notifications': 'Notifications',
    'nav.inventory': 'États des lieux',
    'nav.maintenance': 'Travaux',
    'nav.hotel': 'G. Hôtelière',
    'nav.residences': 'Résidences',
    'nav.rent_matrix': 'Matrice des Loyers',
    'nav.audit_logs': "Journal d'Audit",
    'collab.title': 'Collaboration Inter-Agences',
    'collab.marketplace': 'Place de marché',
    'stats.total_properties': 'Total des biens',
    'stats.occupancy_rate': "Taux d'occupation",
    'stats.expected_rent': 'Loyer Attendu',
    'stats.collected_rent': 'Loyer Perçu',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    'common.search': 'Rechercher...',
    'common.add': 'Ajouter',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.print': 'Imprimer',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.caisse': 'Cash Desk',
    'nav.owners': 'Property Owners',
    'nav.properties': 'Properties',
    'nav.tenants': 'Tenants',
    'nav.contracts': 'Contracts',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.audit': 'Audit Logs',
    'nav.notifications': 'Notifications',
    'nav.inventory': 'Property Inventories',
    'nav.maintenance': 'Maintenance & Repairs',
    'nav.hotel': 'Hotel Management',
    'nav.residences': 'Furnished Residences',
    'nav.rent_matrix': 'Rent Roll Matrix',
    'nav.audit_logs': 'Audit Logs',
    'collab.title': 'B2B Collaboration',
    'collab.marketplace': 'Marketplace',
    'stats.total_properties': 'Total Properties',
    'stats.occupancy_rate': 'Occupancy Rate',
    'stats.expected_rent': 'Expected Rent',
    'stats.collected_rent': 'Collected Rent',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.search': 'Search...',
    'common.add': 'Add New',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.print': 'Print',
  }

};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'fr') ? (saved as Language) : 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  useEffect(() => {
    const saved = localStorage.getItem('language');
    if (saved === 'en' || saved === 'fr') {
      setLanguageState(saved as Language);
    }
  }, []);

  const t = (key: string): string => {
    if (!translations[language]) return translations['fr'][key] || key;
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
