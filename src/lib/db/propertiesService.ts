import { supabase } from '../config';
import { normalizeProperty } from '../normalizers';
import { formatSbError } from '../helpers';
import { Property, Contract, Tenant } from "../../types/db";
import { auditLogsService } from './auditLogsService';

interface GetAllParams {
  agency_id?: string;
  owner_id?: string;
  search?: string;
  standing?: string;
  limit?: number;
  offset?: number;
  includeOwner?: boolean;
}

export const propertiesService = {
  async getAll({
    agency_id,
    owner_id,
    search,
    standing,
    limit = 100,
    offset = 0,
    includeOwner = false,
  }: GetAllParams = {}): Promise<Property[]> {
    if (agency_id === '00000000-0000-0000-0000-000000000000') {
      const { MOCK_PROPERTIES, MOCK_OWNERS, MOCK_CONTRACTS, MOCK_TENANTS } = await import('../mockData');
      let result = [...MOCK_PROPERTIES];
      if (owner_id) result = result.filter(p => p.owner_id === owner_id);
      if (search) {
        const s = search.toLowerCase();
        result = result.filter(p => p.title.toLowerCase().includes(s));
      }
      if (standing) result = result.filter(p => p.standing === standing);

      // Join owner if requested
      if (includeOwner) {
        result = result.map(p => ({
          ...p,
          owner: MOCK_OWNERS.find(o => o.id === p.owner_id)
        }));
      }

      // Add basic contracts/tenants join as seen in useSupabaseData
      result = result.map(p => {
        const property_contracts = MOCK_CONTRACTS.filter(c => c.property_id === p.id).map(c => ({
          ...c,
          tenant: MOCK_TENANTS.find(t => t.id === c.tenant_id)
        }));
        return { ...p, contracts: property_contracts };
      });

      return result as any[];
    }

    let query = supabase
      .from('properties')
      .select(includeOwner ? '*, owner:owners(first_name, last_name)' : '*')
      .order('created_at', { ascending: false });

    if (agency_id) {
      query = query.eq('agency_id', agency_id);
    }
    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,location->>commune.ilike.%${search}%,location->>quartier.ilike.%${search}%`);
    }
    if (standing) {
      query = query.eq('standing', standing);
    }
    if (limit !== undefined && offset !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) throw new Error(formatSbError('❌ properties.select', error));
    return (data as any) as Property[];
  },
  async create(property: Partial<Property>): Promise<Property> {
    const clean = normalizeProperty(property);
    const { data, error } = await supabase.from('properties').insert(clean).select('*').single();
    if (error) throw new Error(formatSbError('❌ properties.insert', error));
    
    // Log action
    await auditLogsService.insert({
      action: 'Création du bien',
      table_name: 'properties',
      record_id: data.id,
      new_values: data,
    });
    
    return data;
  },
  async update(id: string, updates: Partial<Property>): Promise<Property> {
    const clean = normalizeProperty(updates);
    
    // Fetch old values for audit
    const oldData = await this.getById(id);
    
    const { data, error } = await supabase.from('properties').update(clean).eq('id', id).select('*').single();
    if (error) throw new Error(formatSbError('❌ properties.update', error));
    
    // Log action
    await auditLogsService.insert({
      action: 'Mise à jour du bien',
      table_name: 'properties',
      record_id: id,
      old_values: oldData,
      new_values: data,
    });
    
    return data;
  },
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) throw new Error(formatSbError('❌ properties.delete', error));
    return true;
  },
  async findOne(id: string, agencyId?: string): Promise<Property | null> {
    if (agencyId === '00000000-0000-0000-0000-000000000000' || id.startsWith('demo-')) {
      const { MOCK_PROPERTIES } = await import('../mockData');
      return MOCK_PROPERTIES.find(p => p.id === id) || null;
    }

    let query = supabase
      .from('properties')
      .select('*')
      .eq('id', id);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(formatSbError('❌ properties.findOne', error));
    }
    return data;
  },
  async getByOwnerId(
    ownerId: string,
    agencyId: string
  ): Promise<{
    data: (Property & { contracts: (Contract & { tenants: Tenant })[] })[] | null;
    error: any;
  }> {
    if (agencyId === '00000000-0000-0000-0000-000000000000') {
      const data = await this.getAll({ agency_id: agencyId, owner_id: ownerId });
      return { data: data as any[], error: null };
    }

    const { data, error } = await supabase
      .from('properties')
      .select('*, contracts(*, tenants(*))')
      .eq('owner_id', ownerId)
      .eq('agency_id', agencyId);
    if (error) throw new Error(formatSbError('❌ properties.select', error));
    return { data: data ?? [], error: null };
  },
  async getById(id: string, agencyId?: string): Promise<Property> {
    if (agencyId === '00000000-0000-0000-0000-000000000000' || id.startsWith('demo-')) {
      const { MOCK_PROPERTIES, MOCK_CONTRACTS, MOCK_TENANTS } = await import('../mockData');
      const property = MOCK_PROPERTIES.find(p => p.id === id);
      if (property) {
        // Enforce join for getById consistency
        const property_contracts = MOCK_CONTRACTS.filter(c => c.property_id === property.id).map(c => ({
          ...c,
          tenant: MOCK_TENANTS.find(t => t.id === c.tenant_id)
        }));
        return { ...property, contracts: property_contracts } as any;
      }
    }

    let query = supabase
      .from('properties')
      .select('*, owner_id, agency_id')
      .eq('id', id);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query.single();
    if (error) throw new Error(formatSbError('❌ properties.select', error));
    return (data as any) as Property;
  },

  async getBySlugId(id: string, agencyId?: string): Promise<Property | null> {
    if (agencyId === '00000000-0000-0000-0000-000000000000' || id.startsWith('demo-')) {
      const { MOCK_PROPERTIES } = await import('../mockData');
      return MOCK_PROPERTIES.find(p => p.id === id || p.business_id === id) || null;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabase.from('properties').select('*');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('business_id', id);
    }

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(formatSbError('❌ properties.getBySlugId', error));
    }
    return data as Property;
  },

  /**
   * Upload une image de propriété vers Supabase Storage
   * @param file - Fichier image à uploader
   * @param propertyId - ID de la propriété
   * @returns URL publique de l'image uploadée
   */
  async uploadImage(file: File, propertyId: string): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log('🔄 Upload image vers Supabase Storage:', fileName);

      const { error } = await supabase.storage
        .from('property-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erreur upload image:', error);
        throw new Error(formatSbError('❌ storage.upload', error));
      }

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      console.log('✅ Image uploadée avec succès:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'upload de l\'image:', error);
      throw new Error(`Erreur upload image: ${error.message}`);
    }
  },

  /**
   * Supprime une image de propriété de Supabase Storage
   * @param imageUrl - URL de l'image à supprimer
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      console.log('🔄 Suppression image:', imageUrl);

      // Extraire le chemin du fichier depuis l'URL
      const urlParts = imageUrl.split('/property-images/');
      if (urlParts.length < 2) {
        console.warn('⚠️ URL image invalide:', imageUrl);
        return;
      }

      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from('property-images')
        .remove([filePath]);

      if (error) {
        console.error('❌ Erreur suppression image:', error);
        throw new Error(formatSbError('❌ storage.delete', error));
      }

      console.log('✅ Image supprimée avec succès');
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression de l\'image:', error);
      // Ne pas bloquer si la suppression échoue
    }
  },
};