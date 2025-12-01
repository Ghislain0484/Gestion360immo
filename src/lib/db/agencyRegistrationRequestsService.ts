import { supabase } from '../config';
import { normalizeAgencyRegistrationRequest, normalizeAgency, normalizeAgencyUser, normalizeAgencySubscription } from '../normalizers';
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
        if (error) throw new Error(formatSbError('�?O agency_registration_requests.select', error));
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
            throw new Error(formatSbError('âŒ agency_registration_requests.select (by id)', error));
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
        if (error) throw new Error(formatSbError('âŒ agency_registration_requests.insert', error));
        return { id: data.id };
    },
    async update(id: string, updates: Partial<AgencyRegistrationRequest>): Promise<AgencyRegistrationRequest> {
        const clean = normalizeAgencyRegistrationRequest(updates);
        const { data, error } = await supabase.from('agency_registration_requests').update(clean).eq('id', id).select('*').single();
        if (error) throw new Error(formatSbError('âŒ agency_registration_requests.update', error));
        return data;
    },
    async delete(id: string): Promise<boolean> {
        const { error } = await supabase.from('agency_registration_requests').delete().eq('id', id);
        if (error) throw new Error(formatSbError('âŒ agency_registration_requests.delete', error));
        return true;
    },
    async approve(requestId: string): Promise<{ agencyId: string }> {
        const { user } = await logAuthContext('approveAgencyRequest');
        if (!user) throw new Error('Utilisateur non authentifiÃ©');

        // âš™ï¸ VÃ©rifier si l'utilisateur est admin
        const { data: admin, error: adminError } = await supabase
            .from('platform_admins').select('role')
            .eq('user_id', user.id).single();
        if (adminError || !admin || !['admin', 'super_admin'].includes(admin.role))
            throw new Error('Permissions insuffisantes');

        const created: { table: string; id: string }[] = [];
        let finalLogoUrl: string | null = null;

        try {
            // ðŸ“¥ RÃ©cup demande
            const { data: req, error: reqError } = await supabase
                .from('agency_registration_requests').select('*')
                .eq('id', requestId).single();
            if (reqError || !req) throw new Error(formatSbError('âŒ agency_registration_requests.select', reqError));
            if (req.status === 'approved') throw new Error('Demande dÃ©jÃ  approuvÃ©e');

            // âš ï¸ VÃ©rif agence existante
            const { data: existingAgency } = await supabase
                .from('agencies').select('id')
                .eq('commercial_register', req.commercial_register).maybeSingle();
            if (existingAgency) throw new Error(`Agence dÃ©jÃ  existante (${existingAgency.id})`);

            // ðŸ¢ CrÃ©ation agence
            const { data: agency, error: agencyError } = await supabase
                .from('agencies').insert(normalizeAgency({
                    name: req.agency_name,
                    commercial_register: req.commercial_register,
                    logo_url: req.logo_url,
                    is_accredited: req.is_accredited,
                    accreditation_number: req.accreditation_number,
                    address: req.address,
                    city: req.city,
                    phone: req.phone,
                    email: req.director_email,
                    director_id: req.director_auth_user_id,
                    status: 'approved'
                })).select('id').single();
            if (agencyError || !agency) throw new Error(formatSbError('âŒ agencies.insert', agencyError));
            created.push({ table: 'agencies', id: agency.id });

            // ðŸ“¦ DÃ©placement logo
            
            if (req.logo_url) {
                const bucket = 'agency-logos';
                const rawUrlPath = req.logo_url.split(`/storage/v1/object/public/${bucket}/`)[1];
                const decodedOldPath = rawUrlPath ? decodeURIComponent(rawUrlPath) : null;
                if (!decodedOldPath) throw new Error('Chemin logo invalide');

                // On decode le chemin pour retirer les %20 puis on assainit le nom
                const originalFileName = decodedOldPath.split('/').pop() ?? `logo_${Date.now()}.png`;
                const safeFileName = originalFileName.replace(/[^A-Za-z0-9._-]/g, '_');
                const newPath = `logos/${agency.id}/${safeFileName}`;

                const { error: moveError } = await supabase.storage.from(bucket).move(decodedOldPath, newPath);
                if (moveError) throw new Error(formatSbError('storage.move (logo)', moveError));

                finalLogoUrl = supabase.storage.from(bucket).getPublicUrl(newPath).data.publicUrl;
                const { error: updError } = await supabase.from('agencies').update({ logo_url: finalLogoUrl }).eq('id', agency.id);
                if (updError) throw new Error(formatSbError('agencies.update.logo', updError));
            }
            // ðŸ‘¤ Ajout agency_user (directeur)
            if (!req.director_auth_user_id) throw new Error('directeur_auth_user_id manquant');
            const { data: exists } = await supabase
                .from('agency_users').select('user_id')
                .eq('user_id', req.director_auth_user_id).maybeSingle();
            if (!exists) {
                const { error: auError } = await supabase.from('agency_users').insert(normalizeAgencyUser({
                    user_id: req.director_auth_user_id,
                    agency_id: agency.id,
                    role: 'director',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }));
                if (auError) throw new Error(formatSbError('âŒ agency_users.insert', auError));
                created.push({ table: 'agency_users', id: req.director_auth_user_id });
            }

            // ðŸ’³ Abonnement par dÃ©faut
            const { error: subError } = await supabase.from('agency_subscriptions').insert(normalizeAgencySubscription({
                agency_id: agency.id,
                plan_type: 'basic',
                status: 'trial',
                monthly_fee: 25000,
                start_date: new Date().toISOString().split('T')[0],
                next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                trial_days_remaining: 30
            }));
            if (subError) throw new Error(formatSbError('âŒ agency_subscriptions.insert', subError));
            created.push({ table: 'agency_subscriptions', id: agency.id });

            // âœ… Mettre Ã  jour la demande
            await supabase.from('agency_registration_requests').update({
                status: 'approved', processed_by: user.id, processed_at: new Date().toISOString()
            }).eq('id', requestId);

            // ðŸ“ Audit log
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'agency_approved',
                table_name: 'agency_registration_requests',
                record_id: requestId,
                new_values: { agency_id: agency.id, director_id: req.director_auth_user_id, logo_url: finalLogoUrl },
                ip_address: '0.0.0.0',
                user_agent: navigator.userAgent
            });

            return { agencyId: agency.id };

        } catch (err) {
            console.error('âŒ Erreur approve(), rollback...', err);

            // ðŸ§¨ rollback (suppression des entitÃ©s crÃ©Ã©es)
            for (const c of created.reverse()) {
                await supabase.from(c.table).delete().eq('id', c.id);
            }

            throw err;
        }
    },
    async reject(requestId: string, notes?: string): Promise<boolean> {
        const { user } = await logAuthContext('rejectAgencyRequest');
        if (!user) throw new Error('Utilisateur non authentifiÃ©');

        // VÃ©rifier si l'utilisateur est admin
        const { data: admin, error: adminError } = await supabase
            .from('platform_admins')
            .select('role')
            .eq('user_id', user.id)
            .single();
        if (adminError || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            throw new Error('Permissions insuffisantes');
        }

        // RÃ©cupÃ©rer la demande pour obtenir logo_url
        const { data: req, error: reqError } = await supabase
            .from('agency_registration_requests')
            .select('logo_url')
            .eq('id', requestId)
            .single();
        if (reqError || !req) throw new Error(formatSbError('âŒ agency_registration_requests.select', reqError));

        // Supprimer le logo si prÃ©sent (de temp-registration/)
        
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
        if (error) throw new Error(formatSbError('âŒ agency_registration_requests.reject', error));

        // Enregistrer un log d'audit
        const auditLogData = {
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
        };
        const { error: auditError } = await supabase.from('audit_logs').insert(auditLogData);
        if (auditError) throw new Error(formatSbError('âŒ audit_logs.insert', auditError));

        return true;
    },
};


