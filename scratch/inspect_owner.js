
import { supabase } from './src/lib/config';

async function inspectOwnerData() {
    const ownerSlug = 'PROP260302-00002-bile-akohi';
    const ownerId = ownerSlug.split('-').slice(0, 2).join('-'); // Usually the ID is the prefix before name?
    // Wait, idSystem.ts extractIdFromSlug might do something else.
    
    console.log("Searching for owner with slug/business_id:", ownerSlug);
    
    const { data: owners } = await supabase.from('owners').select('*').or(`id.eq.${ownerSlug},business_id.eq.${ownerSlug}`);
    if (!owners || owners.length === 0) {
        console.log("Owner not found");
        return;
    }
    const owner = owners[0];
    console.log("Found Owner:", owner.id, owner.first_name, owner.last_name);

    const { data: properties } = await supabase.from('properties').select('*').eq('owner_id', owner.id);
    console.log(`Found ${properties?.length} properties for this owner.`);

    if (properties) {
        for (const prop of properties) {
            const { data: contracts } = await supabase.from('contracts').select('*, tenants(*)').eq('property_id', prop.id).eq('status', 'active');
            console.log(`Property ${prop.title} (${prop.id}): ${contracts?.length} active contracts.`);
            if (contracts) {
                contracts.forEach(c => {
                    console.log(`  - Contract ${c.id}: Tenant ${c.tenants?.first_name} ${c.tenants?.last_name} (owner_id in contract: ${c.owner_id})`);
                });
            }
        }
    }
}

inspectOwnerData();
