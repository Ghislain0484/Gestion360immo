import { useEffect, useState, useCallback } from 'react';
import { dbService } from '../lib/supabase';
import { NotificationSettings, NotificationSettingsUpsert } from '../types/db';

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
        // Provide default values for optional fields to match NotificationSettingsUpsert
        const upsertData: NotificationSettingsUpsert = {
          payment_reminder: updates.payment_reminder ?? true,
          new_message: updates.new_message ?? true,
          rental_alert: updates.rental_alert ?? true,
          property_update: updates.property_update ?? true,
          contract_expiry: updates.contract_expiry ?? true,
          new_interest: updates.new_interest ?? true,
        };
        const data = await dbService.notificationSettings.upsert(userId, upsertData);
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