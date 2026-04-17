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
        // 🚀 EXTREME BYPASS (XHR vs KASPERSKY)
        // On utilise XHR car Kaspersky enveloppe fetch() mais ignore souvent XHR,
        // ce qui evite les erreurs 400 (Bad Request) dues a la corruption du flux.
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            // Utilisation d'une URL absolue pour eviter toute interference
            const url = "https://jedknkbevxiyytsypjrv.supabase.co/rest/v1/rpc/approve_agency_request";
            const apiKey = (supabase as any).supabaseKey;

            xhr.open("POST", url, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("apikey", apiKey);
            xhr.setRequestHeader("Authorization", `Bearer ${apiKey}`);
            xhr.setRequestHeader("Prefer", "return=representation");

            xhr.onreadystatechange = async () => {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            if (result && (result.success || result.agency_id)) {
                                const agencyId = result.agency_id || "TRANSITION_OK";
                                // On tente le deplacement du logo apres le succes
                                this.moveLogo(requestId, agencyId).catch(() => {});
                                resolve({ agencyId });
                            } else {
                                reject(new Error(result.error || "Échec de l'approbation RPC"));
                            }
                        } catch (e) {
                            // Verif de secours
                            const { data: check } = await supabase.from('agency_registration_requests').select('status').eq('id', requestId).single();
                            if (check?.status === 'approved') resolve({ agencyId: 'TRANSITION_OK' });
                            else reject(new Error("Réponse serveur malformée"));
                        }
                    } else {
                        // Verif de secours
                        const { data: check } = await supabase.from('agency_registration_requests').select('status').eq('id', requestId).single();
                        if (check?.status === 'approved') {
                            resolve({ agencyId: 'TRANSITION_OK' });
                        } else {
                            try {
                                const errObj = JSON.parse(xhr.responseText);
                                reject(new Error(errObj.message || `Erreur ${xhr.status}`));
                            } catch (e) {
                                reject(new Error(`Erreur XHR ${xhr.status}`));
                            }
                        }
                    }
                }
            };

            xhr.onerror = () => reject(new Error("Erreur reseau XHR (Antivirus ?)"));
            xhr.send(JSON.stringify({ p_request_id: requestId }));
        });
    },

    async moveLogo(requestId: string, agencyId: string): Promise<void> {
        try {
            const { data: req } = await supabase
                .from('agency_registration_requests')
                .select('logo_url')
                .eq('id', requestId)
                .single();

            if (req?.logo_url) {
                const bucket = 'agency-logos';
                const parts = req.logo_url.split(`/storage/v1/object/public/${bucket}/`);
                const rawUrlPath = parts[parts.length - 1];
                if (rawUrlPath) {
                    const decodedOldPath = decodeURIComponent(rawUrlPath);
                    const originalFileName = decodedOldPath.split('/').pop() ?? `logo_${Date.now()}.png`;
                    const newPath = `logos/${agencyId}/${originalFileName}`;

                    const { error: moveError } = await supabase.storage.from(bucket).move(decodedOldPath, newPath);
                    if (!moveError) {
                        const finalLogoUrl = supabase.storage.from(bucket).getPublicUrl(newPath).data.publicUrl;
                        await supabase.from('agencies').update({ logo_url: finalLogoUrl }).eq('id', agencyId);
                    }
                }
            }
        } catch (e) {
            console.warn("Logo move failed (non-blocking):", e);
        }
    },

    async reject(requestId: string, notes?: string): Promise<boolean> {
        const { user } = await logAuthContext('rejectAgencyRequest');
        if (!user) throw new Error('Utilisateur non authentifié');

        const { data: admin, error: adminError } = await supabase
            .from('platform_admins')
            .select('role')
            .eq('user_id', user.id)
            .single();
        if (adminError || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            throw new Error('Permissions insuffisantes');
        }

        const { data: req, error: reqError } = await supabase
            .from('agency_registration_requests')
            .select('logo_url')
            .eq('id', requestId)
            .single();
        if (reqError || !req) throw new Error(formatSbError('❌ agency_registration_requests.select', reqError));

        if (req.logo_url) {
            const bucket = 'agency-logos';
            const rawPath = req.logo_url.split(`/storage/v1/object/public/${bucket}/`)[1];
            const decodedPath = rawPath ? decodeURIComponent(rawPath) : null;
            if (decodedPath) {
                await supabase.storage.from(bucket).remove([decodedPath]);
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
        } catch (_auditErr) {}

        return true;
    },
};
