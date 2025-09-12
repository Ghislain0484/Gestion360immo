import { supabase } from '../config';
import { normalizeAgencyRanking } from '../normalizers';
import { formatSbError, logAuthContext } from '../helpers';
import { AgencyRanking } from "../../types/db";

export const agencyRankingsService = {
    async getAll(): Promise<AgencyRanking[]> {
        const { data, error } = await supabase.from('agency_rankings').select('*').order('year', { ascending: false });
        if (error) throw new Error(formatSbError('❌ agency_rankings.select', error));
        return data ?? [];
    },
    async create(ranking: Partial<AgencyRanking>): Promise<AgencyRanking> {
        const clean = normalizeAgencyRanking(ranking);
        const { data, error } = await supabase.from('agency_rankings').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ agency_rankings.insert', error));
        return data;
    },
    async update(id: string, updates: Partial<AgencyRanking>): Promise<AgencyRanking> {
        const clean = normalizeAgencyRanking(updates);
        const { data, error } = await supabase.from('agency_rankings').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ agency_rankings.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('agency_rankings').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ agency_rankings.delete', error));
        return true;
    },
    async getByPeriod(year: number): Promise<AgencyRanking[]> {
        const { data, error } = await supabase
            .from('agency_rankings')
            .select('*')
            .eq('year', year)
            .order('rank', { ascending: true });
        if (error) throw new Error(formatSbError('❌ agency_rankings.select (by year)', error));
        return data ?? [];
    },
    async generate(year: number): Promise<void> {
        const { user } = await logAuthContext('generateAgencyRankings');
        if (!user) throw new Error('Utilisateur non authentifié');

        // Vérifier si l'utilisateur est admin
        const { data: admin, error: adminError } = await supabase
            .from('platform_admins')
            .select('role')
            .eq('user_id', user.id)
            .single();
        if (adminError || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            throw new Error('Permissions insuffisantes');
        }

        const { error } = await supabase.rpc('generate_agency_rankings', { p_year: year });
        if (error) throw new Error(formatSbError('❌ agency_rankings.generate', error));
    },
};