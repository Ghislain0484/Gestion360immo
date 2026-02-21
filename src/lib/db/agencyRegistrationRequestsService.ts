import { supabase } from '../config';
import { normalizeAgencyRegistrationRequest } from '../normalizers';
import { formatSbError, logAuthContext } from '../helpers';
import { AgencyRegistrationRequest } from "../../types/db";


export const agencyRegistrationRequestsService = {
    async getAll({ status, limit }: { status?: string; limit?: number } = {}): Promise<AgencyRegistrationRequest[]> {
        let query = supabase
            .from('agency_registration_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }
        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw new Error(formatSbError('❌ agency_registration_requests.select', error));
        return data ?? [];
    },
    async getById(id: string): Promise<AgencyRegistrationRequest | null> {
        const { data, error } = await supabase
            .from('agency_registration_requests')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(formatSbError('❌ agency_registration_requests.select (by id)', error));
        }
        return data;
    },
    async create(request: Partial<AgencyRegistrationRequest>): Promise<{ id: string }> {
        const clean = normalizeAgencyRegistrationRequest(request);
        const { data, error } = await supabase
            .from('agency_registration_requests')
            .insert(clean)
            .select('id')
            .single();
        if (error) throw new Error(formatSbError('❌ agency_registration_requests.insert', error));
        return { id: data.id };
    },
    async update(id: string, updates: Partial<AgencyRegistrationRequest>): Promise<AgencyRegistrationRequest> {
        const clean = normalizeAgencyRegistrationRequest(updates);
        const { data, error } = await supabase.from('agency_registration_requests').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('❌ agency_registration_requests.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('agency_registration_requests').delete().eq('id', id);
        if (error) throw new Error(formatSbError('❌ agency_registration_requests.delete', error));
        return true;
    },
    async approve(requestId: string): Promise<{ agencyId: string }> {
        // 🚀 Appel RPC SECURITY DEFINER — bypass RLS, logique côté PostgreSQL
        const { data, error } = await supabase.rpc('approve_agency_request', {
            p_request_id: requestId,
        });

        if (error) {
            throw new Error(formatSbError('❌ RPC approve_agency_request', error));
        }

        const result = data as { success?: boolean; agency_id?: string; error?: string; detail?: string };

        if (result.error) {
            throw new Error(`❌ Approbation échouée : ${result.error}${result.detail ? ` (${result.detail})` : ''}`);
        }

        if (!result.success || !result.agency_id) {
            throw new Error('❌ Réponse inattendue de la RPC approve_agency_request');
        }

        // 📦 Déplacement du logo (nécessite le token Auth — fait côté client)
        try {
            const { data: req } = await supabase
                .from('agency_registration_requests')
                .select('logo_url')
                .eq('id', requestId)
                .single();

            if (req?.logo_url) {
                const bucket = 'agency-logos';
                const rawUrlPath = req.logo_url.split(`/storage/v1/object/public/${bucket}/`)[1];
                if (rawUrlPath) {
                    const decodedOldPath = decodeURIComponent(rawUrlPath);
                    const normalize = (name: string) =>
                        name.replace(/%20/g, ' ').replace(/[^A-Za-z0-9._-]/g, '_');
                    const originalFileName = decodedOldPath.split('/').pop() ?? `logo_${Date.now()}.png`;
                    const safeFileName = normalize(originalFileName);
                    const newPath = `logos/${result.agency_id}/${safeFileName}`;

                    const { error: moveError } = await supabase.storage.from(bucket).move(decodedOldPath, newPath);
                    if (!moveError) {
                        const finalLogoUrl = supabase.storage.from(bucket).getPublicUrl(newPath).data.publicUrl;
                        await supabase.from('agencies').update({ logo_url: finalLogoUrl }).eq('id', result.agency_id);
                    }
                }
            }
        } catch (_logoErr) {
            // Le déplacement du logo est non-bloquant
        }

        return { agencyId: result.agency_id };
    },

    async reject(requestId: string, notes?: string): Promise<boolean> {
        const { user } = await logAuthContext('rejectAgencyRequest');
        if (!user) throw new Error('Utilisateur non authentifié');

        // Vérifier si l'utilisateur est admin
        // platform_admins.user_id référence public.users.id = auth.uid()
        const { data: admin, error: adminError } = await supabase
            .from('platform_admins')
            .select('role')
            .eq('user_id', user.id)
            .single();
        if (adminError || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            throw new Error('Permissions insuffisantes');
        }

        // Récupérer la demande pour obtenir logo_url
        const { data: req, error: reqError } = await supabase
            .from('agency_registration_requests')
            .select('logo_url')
            .eq('id', requestId)
            .single();
        if (reqError || !req) throw new Error(formatSbError('❌ agency_registration_requests.select', reqError));

        // Supprimer le logo si présent (de temp-registration/)
        if (req.logo_url) {
            const bucket = 'agency-logos';
            const rawPath = req.logo_url.split(`/storage/v1/object/public/${bucket}/`)[1];
            const decodedPath = rawPath ? decodeURIComponent(rawPath) : null;
            if (decodedPath) {
                const { error: deleteError } = await supabase.storage.from(bucket).remove([decodedPath]);
                if (deleteError) {
                    console.error('Erreur lors de la suppression du logo:', deleteError);
                    // Log l'erreur mais ne bloque pas le rejet
                }
            }
        }

        const updates = {
            status: 'rejected',
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            admin_notes: notes ?? null,
        };

        const { error } = await supabase
            .from('agency_registration_requests')
            .update(updates)
            .eq('id', requestId);
        if (error) throw new Error(formatSbError('❌ agency_registration_requests.reject', error));

        // 📝 Enregistrer un log d'audit (non-bloquant)
        try {
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'agency_rejected',
                table_name: 'agency_registration_requests',
                record_id: requestId,
                new_values: {
                    status: 'rejected',
                    admin_notes: notes,
                    timestamp: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
                },
                ip_address: '0.0.0.0',
                user_agent: navigator.userAgent,
            });
        } catch (_auditErr) {
            // Audit log optionnel — ne doit pas bloquer le rejet
        }

        return true;
    },
};


