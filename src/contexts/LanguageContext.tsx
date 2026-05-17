import React, { createContext, useContext, useState, useEffect } from 'react';

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

// Smart automatic translation dictionary for raw French strings
const commonTranslations: Record<string, string> = {
  // PMS and Hotel/Residences Modules Custom Strings
  "GESTION HÔTELIÈRE": "Hotel Management",
  "RÉSIDENCES MEUBLÉES": "Furnished Residences",
  "Gestion Prestige & Court Séjour • Abidjan": "Prestige & Short Stay Management • Abidjan",
  "Expertise Côte d'Ivoire": "Ivory Coast Expertise",
  "Chambres": "Rooms",
  "CHAMBRES": "Rooms",
  "Opérations": "Operations",
  "Parc": "Inventory",
  "Finances": "Finances",
  "FINANCES": "Finances",
  "Clients": "Clients",
  "CLIENTS": "Clients",
  "Taux Occup.": "Occupancy Rate",
  "Unités Libres": "Free Units",
  "En Nettoyage": "Cleaning",
  "Maintenance": "Maintenance",
  "CONFIGURER": "Configure",
  "Règle Long Séjour": "Long Stay Rule",
  "Remise de": "Discount of",
  "auto-appliquée après": "auto-applied after",
  "nuitées": "nights",

  // Navigation & Sidebars
  "Tableau de bord": "Dashboard",
  "Caisse": "Cash Desk",
  "Propriétaires": "Property Owners",
  "Biens": "Properties",
  "Locataires": "Tenants",
  "Contrats": "Contracts",
  "Rapports": "Reports",
  "Paramètres": "Settings",
  "Journal d'Audit": "Audit Logs",
  "Journal d’Audit": "Audit Logs",
  "Notifications": "Notifications",
  "États des lieux": "Property Inventories",
  "Travaux": "Maintenance & Repairs",
  "G. Hôtelière": "Hotel Management",
  "Résidences": "Furnished Residences",
  "Matrice des Loyers": "Rent Roll Matrix",
  "Collaboration Inter-Agences": "B2B Collaboration",
  "Place de marché": "Marketplace",

  // Main UI Buttons & Actions
  "Enregistrer": "Save",
  "Annuler": "Cancel",
  "Chargement...": "Loading...",
  "Rechercher...": "Search...",
  "Ajouter": "Add",
  "Modifier": "Edit",
  "Supprimer": "Delete",
  "Imprimer": "Print",
  "Fermer": "Close",
  "Confirmer": "Confirm",
  "Suivant": "Next",
  "Précédent": "Previous",
  "Action": "Action",
  "Détails": "Details",
  "Statistiques": "Statistics",
  "Filtrer": "Filter",
  "Tous": "All",
  "Quitter": "Exit",
  
  // Dashboard Metrics & Indicators
  "Total des biens": "Total Properties",
  "Taux d'occupation": "Occupancy Rate",
  "Loyer Attendu": "Expected Rent",
  "Loyer Perçu": "Collected Rent",
  "Revenu Global": "Total Income",
  "Disponible": "Available",
  "Disponibles": "Available",
  "Occupé": "Occupied",
  "Occupés": "Occupied",
  "Réservé": "Reserved",
  "Réservés": "Reserved",
  "Hors service": "Out of Service",
  "Nettoyage": "Cleaning",
  "En maintenance": "In maintenance",
  "Type d'unité": "Unit Type",
  "Tarif nuité": "Nightly Rate",
  "Nuitées": "Nights",
  "Client": "Client",
  "Nouveau Client": "New Client",
  "Nom": "Last Name",
  "Prénom": "First Name",
  "Téléphone": "Phone",
  "Montant": "Amount",
  "Date": "Date",
  "Statut": "Status",
  "Type": "Type",
  "Description": "Description",
  "Catégorie": "Category",
  "Paiement": "Payment",
  "Mode de Paiement": "Payment Method",
  
  // Stays & Pricing Modals
  "Total à encaisser": "Total to Collect",
  "Acompte / Versement direct (FCFA)": "Deposit / Direct Payment (FCFA)",
  "Saisir montant perçu": "Enter amount collected",
  "Remise Long Séjour": "Long Stay Discount",
  "appliquée": "applied",
  "Règles automatiques de réduction": "Automatic discount rules",
  "Seuil Long Séjour": "Long Stay Threshold",
  "Réduction (%)": "Discount (%)",
  "Appliquée si seuil atteint": "Applied when threshold met",
  "Nombres de nuitées minimum": "Minimum number of nights",
  "Aperçu de la règle": "Rule Preview",
  "Configuration PMS": "PMS Configuration",
  "Politique de Prix": "Pricing Policy",
  
  // Demo Mode Switch & Header elements
  "Mode Démo": "Demo Mode",
  "Mode Réel": "Live DB Mode",
  "Mode Réel DB": "Live DB Mode",
  "Mode démonstration activé (données fictives)": "Demo mode activated (mock data)",
  "Mode réel activé (données de la base)": "Live mode activated (real database)",
  "Ajout rapide": "Quick Add",
  "Rechercher (Ctrl+K)...": "Search (Ctrl+K)...",
  "Déconnexion": "Logout",
  "Mon Profil": "My Profile",
  "Changer d'agence": "Switch Agency",
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'en' || saved === 'fr') ? (saved as Language) : 'fr';
  });

  const setLanguage = (lang: Language) => {
    const prev = language;
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    if (prev === 'en' && lang === 'fr') {
      window.location.reload();
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('language');
    if (saved === 'en' || saved === 'fr') {
      setLanguageState(saved as Language);
    }
  }, []);

  // --- DYNAMIC GLOBAL TRANSLATOR OBSERVER (PREMIUM AUTO-TRANSLATION) ---
  useEffect(() => {
    if (language !== 'en') return;

    const translateText = (text: string): string => {
      if (!text) return text;
      const trimmed = text.trim();
      if (!trimmed) return text;

      // Clean lookupKey by stripping leading bullet points
      let lookupKey = trimmed;
      const hasBullet = lookupKey.startsWith('•');
      if (hasBullet) {
        lookupKey = lookupKey.slice(1).trim();
      }

      // Check exact match in dictionary
      if (commonTranslations[lookupKey]) {
        const val = commonTranslations[lookupKey];
        const res = hasBullet ? `• ${val}` : val;
        return text.replace(trimmed, res);
      }

      // Check case-insensitive match
      const lowercaseKey = lookupKey.toLowerCase();
      const match = Object.keys(commonTranslations).find(k => k.toLowerCase() === lowercaseKey);
      if (match) {
        const val = commonTranslations[match];
        const res = hasBullet ? `• ${val}` : val;
        return text.replace(trimmed, res);
      }

      // Fallback check for substrings: if the text contains longer phrases, replace keys
      let result = text;
      const sortedKeys = Object.keys(commonTranslations).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (key.length > 5 && lookupKey.includes(key)) {
          result = result.replace(key, commonTranslations[key]);
        }
      }
      return result;
    };

    const translateNode = (node: Node) => {
      // Node type 3 is Text node
      if (node.nodeType === 3 && node.nodeValue) {
        const original = node.nodeValue;
        const translated = translateText(original);
        if (translated !== original) {
          node.nodeValue = translated;
        }
      } else {
        const el = node as Element;
        const tagName = el.tagName;
        if (tagName === 'SCRIPT' || tagName === 'STYLE') return;

        // Translate inputs placeholders
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
          const inputEl = node as HTMLInputElement;
          if (inputEl.placeholder) {
            const transPlaceholder = translateText(inputEl.placeholder);
            if (transPlaceholder !== inputEl.placeholder) {
              inputEl.placeholder = transPlaceholder;
            }
          }
          return;
        }

        // Recursively translate child nodes
        for (let i = 0; i < node.childNodes.length; i++) {
          translateNode(node.childNodes[i]);
        }
      }
    };

    // Initial translation
    translateNode(document.body);

    // Setup MutationObserver to translate new/updated nodes dynamically
    const observer = new MutationObserver((mutations) => {
      observer.disconnect(); // prevent loops
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            translateNode(node);
          });
        } else if (mutation.type === 'characterData') {
          translateNode(mutation.target);
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => {
      observer.disconnect();
    };
  }, [language]);

  const t = (key: string): string => {
    if (!key) return '';

    // Normalisation de la clé : on retire les puces, les espaces superflus et retours à la ligne
    let lookupKey = key.trim();
    const hasBullet = lookupKey.startsWith('•');
    if (hasBullet) {
      lookupKey = lookupKey.slice(1).trim();
    }

    // 1. Exact translation key check (e.g. 'nav.dashboard')
    if (translations[language] && translations[language][lookupKey]) {
      const val = translations[language][lookupKey];
      return hasBullet ? `• ${val}` : val;
    }
    if (translations['fr'][lookupKey]) {
      const val = language === 'en' 
        ? (translations['en'][lookupKey] || translations['fr'][lookupKey]) 
        : translations['fr'][lookupKey];
      return hasBullet ? `• ${val}` : val;
    }

    // 2. Dynamic dictionary fallback translation if language is English
    if (language === 'en') {
      if (commonTranslations[lookupKey]) {
        const val = commonTranslations[lookupKey];
        return hasBullet ? `• ${val}` : val;
      }

      // Case-insensitive fallback
      const lowercaseKey = lookupKey.toLowerCase();
      const match = Object.keys(commonTranslations).find(k => k.toLowerCase() === lowercaseKey);
      if (match) {
        const val = commonTranslations[match];
        return hasBullet ? `• ${val}` : val;
      }
    }

    return key;
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

// <T> Helper Component for inline React nodes translation
export const T: React.FC<{ children: string }> = ({ children }) => {
  const { t } = useLanguage();
  return <>{t(children)}</>;
};
