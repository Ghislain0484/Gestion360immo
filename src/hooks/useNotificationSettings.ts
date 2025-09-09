import { useEffect, useState, useCallback } from 'react';
import { dbService } from '../lib/supabase';
import { NotificationSettings } from '../types/db';

export function useNotificationSettings(userId?: string) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await dbService.notificationSettings.getByUser(userId);
      setSettings(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveSettings = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      if (!userId) return;
      try {
        const data = await dbService.notificationSettings.upsert(userId, updates);
        setSettings(data);
        return data;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, error, saveSettings, refresh: fetchSettings };
}
