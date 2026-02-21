import { supabase } from '../config';
import { normalizeAuditLog } from '../normalizers';
import { formatSbError } from '../helpers';
import { AuditLog } from "../../types/db";

export const auditLogsService = {
    async getAll(limit?: number): Promise<AuditLog[]> {
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false });
        if (limit && limit > 0) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw new Error(formatSbError('❌ audit_logs.select', error));
        return data ?? [];
    },
    async insert(log: Partial<AuditLog>): Promise<Partial<AuditLog>> {
        const clean = normalizeAuditLog(log);
        // On ne fait pas de .select('*').single() systématique car les utilisateurs anon
        // peuvent insérer mais pas lire (RLS), ce qui ferait échouer l'action.
        const { data, error } = await supabase.from('audit_logs').insert(clean).select('*').maybeSingle();

        if (error) {
            console.error('⚠️ audit_logs.insert error (continuing anyway):', error);
            // On ne jette pas d'erreur pour l'audit car c'est une action secondaire qui ne doit pas bloquer le login
            return clean;
        }
        return data ?? clean;
    },
};
