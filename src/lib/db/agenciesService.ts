import { supabase } from '../config';
import { normalizeAgency } from '../normalizers';
import { formatSbError } from '../helpers';
import { Agency } from "../../types/db";

interface GetAllParams {
  agency_id?: string;
}

export const agenciesService = {
  async getAll({ agency_id }: GetAllParams = {}): Promise<Agency[]> {
    let query = supabase
      .from('agencies')
      .select('*, subscription:agency_subscriptions(*)')
      .order('created_at', { ascending: false });

    if (agency_id) {
      query = query.eq('id', agency_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(formatSbError('❌ agencies.select', error));
    return (data as any) ?? [];
  },
  async getById(id: string): Promise<Agency | null> {
    const { data, error } = await supabase
      .from('agencies')
      .select('*, subscription:agency_subscriptions(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(formatSbError('❌ agencies.select (by id)', error));
    return data as any;
  },
  async create(agency: Partial<Agency>): Promise<Agency> {
    const clean = normalizeAgency(agency);
    const { data, error } = await supabase.from('agencies').insert(clean).select('*').single();
    if (error) throw new Error(formatSbError('❌ agencies.insert', error));
    return data;
  },
  async update(id: string, updates: Partial<Agency>): Promise<Agency> {
    console.log('🔧 agenciesService.update - Début', {
      id,
      updates,
      timestamp: new Date().toISOString()
    });

    const clean = normalizeAgency(updates);

    console.log('🔧 agenciesService.update - Après normalisation', {
      id,
      clean,
      timestamp: new Date().toISOString()
    });

    const { data, error } = await supabase
      .from('agencies')
      .update(clean)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('❌ agenciesService.update - Erreur Supabase', {
        id,
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        timestamp: new Date().toISOString()
      });
      throw new Error(formatSbError('❌ agencies.update', error));
    }

    console.log('✅ agenciesService.update - Succès', {
      id,
      data,
      timestamp: new Date().toISOString()
    });

    return data;
  },
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('agencies').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ agencies.delete', error));
    return true;
  },
  async getRecent(limit: number = 5): Promise<Agency[]> {
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(formatSbError('❌ agencies.select (recent)', error));
    return data ?? [];
  },
};