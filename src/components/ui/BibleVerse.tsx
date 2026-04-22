import React, { useEffect, useState } from 'react';
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

const normalizeThemeKey = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const BibleVerseCard: React.FC<BibleVerseProps> = ({
  className = '',
  showRefresh = false,
  compact = false,
}) => {
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setVerse(DailyVerseService.getDailyVerse());
  }, []);

  const refreshVerse = async () => {
    setIsLoading(true);
    window.setTimeout(() => {
      setVerse(DailyVerseService.getRandomVerse());
      setIsLoading(false);
    }, 500);
  };

  const getThemeColor = (theme: string) => {
    const colors = {
      espoir: 'success',
      travail: 'info',
      confiance: 'primary',
      courage: 'warning',
      priorites: 'secondary',
      force: 'success',
      protection: 'info',
      soutien: 'primary',
      sagesse: 'warning',
      reconfort: 'success',
      presence: 'info',
      paix: 'primary',
      refuge: 'secondary',
      renouvellement: 'success',
      joie: 'warning',
      benediction: 'success',
      salut: 'primary',
      succes: 'info',
      repos: 'secondary',
      providence: 'success',
      grace: 'primary',
      securite: 'info',
    } as const;

    return colors[normalizeThemeKey(theme) as keyof typeof colors] || 'secondary';
  };

  if (!verse) {
    return (
      <Card
        className={`border border-blue-200/70 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 ${className}`}
      >
        <div className="p-4 text-center">
          <Book className="mx-auto mb-2 h-8 w-8 animate-pulse text-blue-500 dark:text-blue-300" />
          <p className="text-sm text-blue-700 dark:text-slate-300">Chargement de la parole du jour...</p>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card
        className={`border border-blue-200/70 bg-gradient-to-r from-blue-50 via-white to-indigo-50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 ${className}`}
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <Book className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm italic leading-relaxed text-slate-700 dark:text-slate-200">
                "{verse.text}"
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{verse.reference}</p>
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
    <Card
      className={`border border-blue-200/70 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 ${className}`}
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Book className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Verset du jour</h3>
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
                className="text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        <blockquote className="mb-4 border-l-4 border-blue-300 pl-4 text-lg italic leading-relaxed text-slate-700 dark:border-blue-400/50 dark:text-slate-200">
          "{verse.text}"
        </blockquote>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{verse.reference}</p>
          <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-300">
            <Heart className="h-4 w-4" />
            <span className="text-xs">Parole de Dieu</span>
          </div>
        </div>

        <div className="mt-4 border-t border-blue-200/80 pt-4 dark:border-slate-700">
          <p className="text-center text-xs text-blue-700 dark:text-slate-300">
            "Que la parole de Christ habite parmi vous abondamment" - Colossiens 3:16
          </p>
        </div>
      </div>
    </Card>
  );
};
