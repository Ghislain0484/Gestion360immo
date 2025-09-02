import React, { useState, useEffect } from 'react';
import { Book, RefreshCw, Heart } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { DailyVerseService, BibleVerse } from '../../utils/bibleVerses';

interface BibleVerseProps {
  className?: string;
  showRefresh?: boolean;
  compact?: boolean;
}

export const BibleVerseCard: React.FC<BibleVerseProps> = ({ 
  className = '',
  showRefresh = false,
  compact = false 
}) => {
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Charger le verset du jour au montage du composant
    const dailyVerse = DailyVerseService.getDailyVerse();
    setVerse(dailyVerse);
  }, []);

  const refreshVerse = async () => {
    setIsLoading(true);
    // Petit délai pour l'effet visuel
    setTimeout(() => {
      const randomVerse = DailyVerseService.getRandomVerse();
      setVerse(randomVerse);
      setIsLoading(false);
    }, 500);
  };

  const getThemeColor = (theme: string) => {
    const colors = {
      espoir: 'success',
      travail: 'info',
      confiance: 'primary',
      courage: 'warning',
      priorités: 'secondary',
      force: 'success',
      protection: 'info',
      soutien: 'primary',
      sagesse: 'warning',
      réconfort: 'success',
      présence: 'info',
      paix: 'primary',
      refuge: 'secondary',
      renouvellement: 'success',
      joie: 'warning',
      bénédiction: 'success',
      salut: 'primary',
      succès: 'info',
      repos: 'secondary',
      providence: 'success',
      grâce: 'primary',
      sécurité: 'info'
    };
    return colors[theme as keyof typeof colors] || 'secondary';
  };

  if (!verse) {
    return (
      <Card className={`bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200 ${className}`}>
        <div className="p-4 text-center">
          <Book className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-pulse" />
          <p className="text-sm text-blue-600">Chargement du verset du jour...</p>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 ${className}`}>
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <Book className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 italic leading-relaxed">
                "{verse.text}"
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-medium text-blue-700">
                  — {verse.reference}
                </p>
                <Badge variant={getThemeColor(verse.theme)} size="sm">
                  {verse.theme}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Book className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Verset du Jour</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getThemeColor(verse.theme)} size="sm">
              {verse.theme}
            </Badge>
            {showRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshVerse}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        
        <blockquote className="text-gray-700 italic text-lg leading-relaxed mb-4 pl-4 border-l-4 border-blue-300">
          "{verse.text}"
        </blockquote>
        
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-blue-700">
            — {verse.reference}
          </p>
          <div className="flex items-center space-x-1 text-blue-600">
            <Heart className="h-4 w-4" />
            <span className="text-xs">Parole de Dieu</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs text-blue-600 text-center">
            "Que la Parole de Christ habite parmi vous abondamment" - Colossiens 3:16
          </p>
        </div>
      </div>
    </Card>
  );
};