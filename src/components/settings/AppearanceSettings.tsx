import React, { useState, useEffect } from 'react';
import { Palette, Monitor, Sun, Moon, Smartphone, Layout, Type, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

export const AppearanceSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'light',
    fontSize: 'medium',
    density: 'comfortable',
    language: 'fr',
    sidebarCollapsed: false,
    animations: true,
  });

  useEffect(() => {
    // Charger les paramètres sauvegardés pour cette agence
    const settingsKey = `appearance_settings_${user?.agencyId}`;
    const savedSettings = localStorage.getItem(settingsKey);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      applySettings(parsed);
    }
  }, [user?.agencyId]);

  const applySettings = (newSettings: typeof settings) => {
    const root = document.documentElement;
    
    // Appliquer le thème
    if (newSettings.theme === 'dark') {
      root.classList.add('dark');
      document.body.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)';
    } else {
      root.classList.remove('dark');
      document.body.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)';
    }
    
    // Appliquer la taille de police
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.fontSize = fontSizes[newSettings.fontSize as keyof typeof fontSizes];
    
    // Appliquer la densité
    const densities = {
      compact: '0.75rem',
      comfortable: '1rem',
      spacious: '1.5rem'
    };
    root.style.setProperty('--spacing-unit', densities[newSettings.density as keyof typeof densities]);
    
    // Appliquer les animations
    if (!newSettings.animations) {
      root.style.setProperty('--animation-duration', '0s');
    } else {
      root.style.setProperty('--animation-duration', '0.3s');
    }
    
    console.log('✅ Paramètres d\'apparence appliqués:', newSettings);
  };

  const themes = [
    { id: 'light', name: 'Clair', icon: Sun, preview: 'bg-white border-gray-200' },
    { id: 'dark', name: 'Sombre', icon: Moon, preview: 'bg-gray-900 border-gray-700' },
    { id: 'auto', name: 'Automatique', icon: Monitor, preview: 'bg-gradient-to-r from-white to-gray-900' },
  ];

  const fontSizes = [
    { id: 'small', name: 'Petit', size: 'text-sm' },
    { id: 'medium', name: 'Moyen', size: 'text-base' },
    { id: 'large', name: 'Grand', size: 'text-lg' },
  ];

  const densities = [
    { id: 'compact', name: 'Compact', description: 'Plus d\'informations à l\'écran' },
    { id: 'comfortable', name: 'Confortable', description: 'Espacement équilibré' },
    { id: 'spacious', name: 'Spacieux', description: 'Plus d\'espace entre les éléments' },
  ];

  const languages = [
    { id: 'fr', name: 'Français', flag: '🇫🇷' },
    { id: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Appliquer immédiatement les changements
    applySettings(newSettings);
    
    // Sauvegarder automatiquement pour cette agence
    const settingsKey = `appearance_settings_${user?.agencyId}`;
    localStorage.setItem(settingsKey, JSON.stringify(newSettings));
    
    console.log('✅ Paramètres sauvegardés pour agence:', user?.agencyId);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Sauvegarder les paramètres d'apparence pour cette agence
      const settingsKey = `appearance_settings_${user?.agencyId}`;
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      applySettings(settings);
      
      alert('✅ Paramètres d\'apparence appliqués et sauvegardés !');
    } catch (error) {
      console.error('❌ Erreur sauvegarde paramètres:', error);
      alert('❌ Erreur lors de la sauvegarde des paramètres');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Palette className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Thème</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSetting('theme', theme.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.theme === theme.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-full h-20 rounded-lg mb-3 ${theme.preview}`}></div>
                <div className="flex items-center justify-center space-x-2">
                  <theme.icon className="h-4 w-4" />
                  <span className="font-medium">{theme.name}</span>
                </div>
                {settings.theme === theme.id && (
                  <Badge variant="info" size="sm" className="mt-2">
                    Sélectionné
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Typography */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Type className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Typographie</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Taille de police
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {fontSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => updateSetting('fontSize', size.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      settings.fontSize === size.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`font-medium ${size.size}`}>Aa</div>
                    <div className="text-sm mt-1">{size.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Layout Density */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Layout className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Densité d'affichage</h3>
          </div>
          
          <div className="space-y-3">
            {densities.map((density) => (
              <label
                key={density.id}
                className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                  settings.density === density.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="density"
                  value={density.id}
                  checked={settings.density === density.id}
                  onChange={(e) => updateSetting('density', e.target.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{density.name}</div>
                  <div className="text-sm text-gray-500">{density.description}</div>
                </div>
                {settings.density === density.id && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                )}
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Language */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Eye className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Langue</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {languages.map((language) => (
              <button
                key={language.id}
                onClick={() => updateSetting('language', language.id)}
                className={`flex items-center p-4 rounded-lg border transition-all ${
                  settings.language === language.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl mr-3">{language.flag}</span>
                <span className="font-medium">{language.name}</span>
                {settings.language === language.id && (
                  <Badge variant="info" size="sm" className="ml-auto">
                    Actuel
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Interface Options */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Smartphone className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Options d'interface</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Barre latérale réduite</h4>
                <p className="text-sm text-gray-500">Réduire la barre latérale par défaut</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sidebarCollapsed}
                  onChange={(e) => updateSetting('sidebarCollapsed', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Animations</h4>
                <p className="text-sm text-gray-500">Activer les animations et transitions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.animations}
                  onChange={(e) => updateSetting('animations', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Aperçu
          </h3>
          
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className={`${settings.fontSize === 'small' ? 'text-sm' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'}`}>
              <h4 className="font-semibold mb-2">Exemple de contenu</h4>
              <p className="text-gray-600 mb-3">
                Ceci est un aperçu de l'apparence de l'interface avec vos paramètres actuels.
              </p>
              <div className="flex space-x-2">
                <Badge variant="info" size="sm">Étiquette</Badge>
                <Badge variant="success" size="sm">Succès</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3">
        <Button 
          variant="ghost"
          onClick={() => {
            const defaultSettings = {
              theme: 'light',
              fontSize: 'medium',
              density: 'comfortable',
              language: 'fr',
              sidebarCollapsed: false,
              animations: true,
            };
            setSettings(defaultSettings);
            applySettings(defaultSettings);
            const settingsKey = `appearance_settings_${user?.agencyId}`;
            localStorage.setItem(settingsKey, JSON.stringify(defaultSettings));
          }}
        >
          Réinitialiser
        </Button>
        <Button onClick={handleSave} isLoading={loading}>
          Appliquer les changements
        </Button>
      </div>
    </div>
  );
};