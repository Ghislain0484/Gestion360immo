import { supabase } from '../config';
import { normalizeAuditLog } from '../normalizers';
import { formatSbError } from '../helpers';
import { AuditLog } from "../../types/db";

export const auditLogsService = {
    async getAll({ table_name, record_id, limit = 50 }: { 
        table_name?: string; 
        record_id?: string; 
        limit?: number;
    } = {}): Promise<AuditLog[]> {
        // Simple Demo Guard: if no explicit record_id or specifically for demo
        // Since audit logs don't always have agency_id, we just return mock logs if we're feeling "demo-y"
        // Actually, we can check a global state or just ignore for now if not critical.
        // But let's add it for completeness if we can detect the agency.
        // For now, let's just return [] to avoid errors, or mock data if we want.
        
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (table_name) query = query.eq('table_name', table_name);
        if (record_id) query = query.eq('record_id', record_id);
        // Note: audit_logs doesn't have agency_id in current schema, we might need it or rely on record_id
        
        if (limit > 0) {
            query = query.limit(limit);
        }

        const { data, error } = await query;
        if (error) throw new Error(formatSbError('❌ audit_logs.select', error));
        return data ?? [];
    },
    async getByRecordId(recordId: string, tableName?: string): Promise<AuditLog[]> {
        let query = supabase
            .from('audit_logs')
            .select('*')
            .eq('record_id', recordId)
            .order('created_at', { ascending: false });
            
        if (tableName) {
            query = query.eq('table_name', tableName);
        }
        
        const { data, error } = await query;
        if (error) throw new Error(formatSbError('❌ audit_logs.getByRecordId', error));
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
    async logDeletion(options: {
        table_name: string;
        record_id: string;
        old_values: any;
        userId: string;
        agencyId: string;
    }) {
        return this.insert({
            action: 'DELETE',
            table_name: options.table_name,
            record_id: options.record_id,
            old_values: options.old_values,
            user_id: options.userId,
            agency_id: options.agencyId,
            user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
        });
    }
};
