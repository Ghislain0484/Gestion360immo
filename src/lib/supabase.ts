// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase env vars manquantes. Vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * dbService: helpers minimes utilisés par les écrans (ajuste selon ton schéma)
 */
type OwnerPayload = {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  agency_id?: string | null;
};
type TenantPayload = {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  agency_id?: string | null;
};
type PropertyPayload = {
  title: string;
  address?: string | null;
  rent?: number | null;
  agency_id?: string | null;
};
type ContractPayload = {
  owner_id?: string | null;
  tenant_id?: string | null;
  property_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  amount?: number | null;
  agency_id?: string | null;
};

async function insertOne<T>(table: string, payload: Record<string, any>) {
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data as T;
}

export const dbService = {
  // propriétaires
  async createOwner(payload: OwnerPayload) {
    if (!payload.agency_id) throw new Error('agency_id requis pour createOwner');
    return insertOne('owners', payload);
  },
  // locataires
  async createTenant(payload: TenantPayload) {
    if (!payload.agency_id) throw new Error('agency_id requis pour createTenant');
    return insertOne('tenants', payload);
  },
  // biens
  async createProperty(payload: PropertyPayload) {
    if (!payload.agency_id) throw new Error('agency_id requis pour createProperty');
    return insertOne('properties', payload);
  },
  // contrats
  async createContract(payload: ContractPayload) {
    if (!payload.agency_id) throw new Error('agency_id requis pour createContract');
    return insertOne('contracts', payload);
  },
};
