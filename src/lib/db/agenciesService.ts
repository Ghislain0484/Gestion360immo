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
    let result = (data as any) ?? [];
    
    // Inject Demo Agency for Admin visibility
    if (!agency_id || agency_id === '00000000-0000-0000-0000-000000000000') {
      const demoExists = result.some((a: any) => a.id === '00000000-0000-0000-0000-000000000000');
      if (!demoExists) {
        // Read from localStorage for persistence
        const savedModules = localStorage.getItem('demo_agency_modules');
        const enabled_modules = savedModules ? JSON.parse(savedModules) : ['dashboard', 'properties', 'owners', 'tenants', 'contracts', 'caisse', 'etats-des-lieux', 'travaux'];
        const savedStatus = localStorage.getItem('demo_agency_status');
        const status = savedStatus || 'approved';
        const plan_type = localStorage.getItem('demo_agency_plan') || 'premium';
        const monthly_fee = Number(localStorage.getItem('demo_agency_fee')) || 0;
        
        result.push({
          id: '00000000-0000-0000-0000-000000000000',
          name: 'Agence de Démonstration Expert',
          city: 'Conakry',
          commercial_register: 'RCCM-DEMO-2024',
          status,
          plan_type,
          monthly_fee,
          created_at: new Date().toISOString(),
          enabled_modules
        });
      }
    }
    
    return result;
  },
  async getById(id: string): Promise<Agency | null> {
    if (id === '00000000-0000-0000-0000-000000000000') {
      const savedModules = localStorage.getItem('demo_agency_modules');
      const enabled_modules = savedModules ? JSON.parse(savedModules) : ['dashboard', 'properties', 'owners', 'tenants', 'contracts', 'caisse', 'etats-des-lieux', 'travaux'];
      const savedStatus = localStorage.getItem('demo_agency_status');
      const status = savedStatus || 'approved';
      const plan_type = localStorage.getItem('demo_agency_plan') || 'premium';
      const monthly_fee = Number(localStorage.getItem('demo_agency_fee')) || 0;
      
      return {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Agence de Démonstration Expert',
        city: 'Conakry',
        commercial_register: 'RCCM-DEMO-2024',
        status,
        plan_type,
        monthly_fee,
        enabled_modules
      } as any;
    }
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
    if (id === '00000000-0000-0000-0000-000000000000') {
      console.log('🛡️ agenciesService: Demo agency update intercepted (localStorage)', updates);
      if (updates.enabled_modules) {
        localStorage.setItem('demo_agency_modules', JSON.stringify(updates.enabled_modules));
      }
      if (updates.plan_type) {
        localStorage.setItem('demo_agency_plan', updates.plan_type);
      }
      if (updates.monthly_fee !== undefined) {
        localStorage.setItem('demo_agency_fee', String(updates.monthly_fee));
      }
      if ((updates as any).subscription_status) {
        localStorage.setItem('demo_agency_status', (updates as any).subscription_status);
      } else if (updates.status) {
        localStorage.setItem('demo_agency_status', updates.status);
      }
      
      return {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Agence de Démonstration Expert',
        city: 'Conakry',
        commercial_register: 'RCCM-DEMO-2024',
        status: (updates as any).subscription_status || updates.status || localStorage.getItem('demo_agency_status') || 'approved',
        plan_type: updates.plan_type || localStorage.getItem('demo_agency_plan') || 'premium',
        monthly_fee: updates.monthly_fee !== undefined ? updates.monthly_fee : Number(localStorage.getItem('demo_agency_fee')) || 0,
        enabled_modules: updates.enabled_modules || JSON.parse(localStorage.getItem('demo_agency_modules') || '[]')
      } as any;
    }
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