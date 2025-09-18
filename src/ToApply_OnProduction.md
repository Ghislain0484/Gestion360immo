1. Fix Multiple GoTrueClient Instances
The config.ts creates two clients, which is causing the warning. While supabaseAnon is intended for unauthenticated uploads, it’s still initialized with the same URL and key, triggering the GoTrueClient warning. To fix this:

Solution: Use a single Supabase client (supabase) for all operations, including uploads, and handle authentication state explicitly in components or services that need anonymous access. Supabase supports anonymous operations with the same client by not requiring a session for public tables or storage buckets.
Alternative: If supabaseAnon is strictly needed for specific upload scenarios, configure it with a different storageKey or disable its auth module entirely.

Updated config.ts:
tsimport { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants');
  throw new Error('Configuration Supabase manquante');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
  },
});

// Note: Removed supabaseAnon to avoid multiple GoTrueClient instances
// Use `supabase` for all operations, including anonymous uploads

Rationale: The supabase client can handle both authenticated and anonymous operations (e.g., uploads to public storage buckets). Removing supabaseAnon eliminates the warning and simplifies the codebase.
Action: Update dbService or any upload-related code (e.g., ImageUploader in PropertyForm.tsx) to use supabase instead of supabaseAnon. Ensure public storage buckets or tables have appropriate permissions for anonymous access.



2. Document Upload in ContractForm:

Add a file input for documents using supabase.storage:
tsx
<Card>
  <div className="flex items-center mb-4">
    <Upload className="h-5 w-5 text-purple-600 mr-2" />
    <h3 className="text-lg font-medium text-gray-900">Documents</h3>
  </div>
  <div>
    <label htmlFor="documents" className="block text-sm font-medium text-gray-700 mb-2">
      Télécharger des documents
    </label>
    <input
      id="documents"
      type="file"
      multiple
      onChange={async (e) => {
        const files = e.target.files;
        if (!files) return;
        const uploadedUrls: string[] = [];
        for (const file of files) {
          const filePath = `contracts/${formData.agency_id}/${Date.now()}_${file.name}`;
          const { error } = await supabase.storage.from('contract-documents').upload(filePath, file);
          if (error) {
            toast.error('Erreur lors du téléchargement du document');
            return;
          }
          const { data: { publicUrl } } = supabase.storage.from('contract-documents').getPublicUrl(filePath);
          uploadedUrls.push(publicUrl);
        }
        updateFormData({ documents: [...(formData.documents || []), ...uploadedUrls] });
      }}
      className="w-full"
    />
  </div>
</Card>

Ensure the contract-documents bucket has an RLS policy:

create policy "Authenticated users upload" on storage.objects
for insert
with check (
  bucket_id = 'contract-documents' and
  auth.role() = 'authenticated'
);
create policy "Authenticated users read" on storage.objects
for select
using (
  bucket_id = 'contract-documents' and
  auth.role() = 'authenticated'
);



3. Verify RLS policies:

create policy "Agency users read" on contracts
for select
using (agency_id in (select agency_id from agency_users where user_id = auth.uid()));
create policy "Agency users insert" on contracts
for insert
with check (agency_id in (select agency_id from agency_users where user_id = auth.uid()));
create policy "Agency users update" on contracts
for update
using (agency_id in (select agency_id from agency_users where user_id = auth.uid()));
create policy "Agency users delete" on contracts
for delete
using (agency_id in (select agency_id from agency_users where user_id = auth.uid()));