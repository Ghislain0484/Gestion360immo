
import { supabase } from '../config';
import { Inventory } from '../../types/db';
import { formatSbError } from '../helpers';

export const inventoriesService = {
    async getAll({ agency_id }: { agency_id?: string } = {}): Promise<Inventory[]> {
        let query = supabase
            .from('inventories')
            .select('*')
            .order('date', { ascending: false });

        if (agency_id) {
            query = query.eq('agency_id', agency_id);
        }

        const { data, error } = await query;
        if (error) throw new Error(formatSbError('❌ inventories.getAll', error));
        return data ?? [];
    },

    async getById(id: string): Promise<Inventory | null> {
        const { data, error } = await supabase
            .from('inventories')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw new Error(formatSbError('❌ inventories.getById', error));
        return data;
    },

    async create(inventory: Partial<Inventory>): Promise<Inventory> {
        const { data, error } = await supabase
            .from('inventories')
            .insert(inventory)
            .select()
            .single();

        if (error) throw new Error(formatSbError('❌ inventories.create', error));
        return data;
    },

    async update(id: string, updates: Partial<Inventory>): Promise<Inventory> {
        const { data, error } = await supabase
            .from('inventories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(formatSbError('❌ inventories.update', error));
        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('inventories')
            .delete()
            .eq('id', id);

        if (error) throw new Error(formatSbError('❌ inventories.delete', error));
    },

    async getByPropertyId(propertyId: string) {
        const { data, error } = await supabase
            .from('inventories')
            .select('*')
            .eq('property_id', propertyId)
            .order('date', { ascending: false });

        if (error) throw new Error(formatSbError('❌ inventories.getByPropertyId', error));
        return data as Inventory[];
    }
};
