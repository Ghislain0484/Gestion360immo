import { supabase } from '../config';
import { normalizeOwner } from '../normalizers';
import { formatSbError } from '../helpers';
import { Owner } from "../../types/db";

interface GetAllParams {
  agency_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}


export const ownersService = {
  async findOne(id: string, agencyId?: string): Promise<Owner | null> {
    let query = supabase
      .from('owners')
      .select('*')
      .eq('id', id);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(formatSbError('❌ owners.findOne', error));
    }
    return data;
  },
  async getAll({
    agency_id,
    search,
    limit = 10,
    offset = 0,
  }: GetAllParams = {}): Promise<Owner[]> {
    let query = supabase
      .from('owners')
      .select('*')
      .order('created_at', { ascending: false });

    if (agency_id) {
      query = query.eq('agency_id', agency_id);
    }
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }
    if (limit !== undefined && offset !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) throw new Error(formatSbError('❌ owners.select', error));
    return data ?? [];
  },
  async getById(id: string, agencyId?: string): Promise<Owner> {
    let query = supabase
      .from('owners')
      .select('*')
      .eq('id', id);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query.single();
    if (error) throw new Error(formatSbError('❌ owners.select', error));
    return data;
  },
  async getBySlugId(id: string, agencyId?: string): Promise<Owner | null> {
    // Check if ID is UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from('owners').select('*');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      // Assume Business ID
      query = query.eq('business_id', id);
    }

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(formatSbError('❌ owners.getBySlugId', error));
    }
    return data;
  },
  async create(owner: Partial<Owner>): Promise<Owner> {
    const cleanOwner = normalizeOwner(owner);
    const { data, error } = await supabase
      .from('owners')
      .insert(cleanOwner)
      .select('*')
      .single();
    if (error) throw new Error(formatSbError('❌ owners.insert', error));
    return data;
  },
  async update(id: string, updates: Partial<Owner>): Promise<Owner> {
    const cleanUpdates = normalizeOwner(updates);
    const { data, error } = await supabase
      .from('owners')
      .update(cleanUpdates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(formatSbError('❌ owners.update', error));
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('owners').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ owners.delete', error));
  },
  async safeDelete(ownerId: string, agencyId?: string): Promise<void> {
    const { propertiesService } = await import('./propertiesService');
    const { contractsService } = await import('./contractsService');
    const { rentReceiptsService } = await import('./rentReceiptsService');
    const { financialStatementsService } = await import('./financialStatementsService');

    // 1. Get all properties for this owner
    const { data: properties } = await propertiesService.getByOwnerId(ownerId, agencyId || '');

    if (properties && properties.length > 0) {
      for (const property of properties) {
        // 2. For each property, clean up contracts and receipts
        const propertyContracts = await contractsService.getAll({ property_id: property.id, agency_id: agencyId });
        for (const contract of propertyContracts) {
          const receipts = await rentReceiptsService.getAll({ contract_id: contract.id, agency_id: agencyId });
          for (const receipt of receipts) {
            await rentReceiptsService.delete(receipt.id);
          }
          await contractsService.delete(contract.id);
        }

        // 3. Clean up transactions
        const { data: transactions } = await financialStatementsService.getTransactionsByProperty(property.id);
        if (transactions) {
          for (const tx of transactions) {
            await financialStatementsService.deleteTransaction(tx.tx_id || tx.id);
          }
        }

        // 4. Clean up images
        if (property.images) {
          for (const img of property.images) {
            if (img.url) await propertiesService.deleteImage(img.url);
          }
        }

        // 5. Delete property
        await propertiesService.delete(property.id);
      }
    }

    // 6. Finally delete the owner
    await this.delete(ownerId);
  },
};