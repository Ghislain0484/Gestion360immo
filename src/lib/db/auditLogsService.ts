import { supabase } from '../config';
import { normalizeAuditLog } from '../normalizers';
import { formatSbError } from '../helpers';
import { AuditLog } from "../../types/db";

export const auditLogsService = {
    async getAll(): Promise<AuditLog[]> {
        const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (error) throw new Error(formatSbError('❌ audit_logs.select', error));
        return data ?? [];
    },
    async insert(log: Partial<AuditLog>): Promise<AuditLog> {
        const clean = normalizeAuditLog(log);
        const { data, error } = await supabase.from('audit_logs').insert(clean).select('*').single();
        if (error) throw new Error(formatSbError('❌ audit_logs.insert', error));
        return data;
    },
};