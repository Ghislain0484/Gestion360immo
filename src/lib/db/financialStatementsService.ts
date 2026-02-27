import { supabase } from '../config';
import { normalizeFinancialStatement } from '../normalizers';
import { formatSbError } from '../helpers';
import { FinancialStatement } from "../../types/db";
import { v4 as uuidv4 } from 'uuid';

export const financialStatementsService = {
    async getAll(): Promise<FinancialStatement[]> {
        const { data, error } = await supabase
            .from("financial_statements")
            .select(`
                id,
                agency_id,
                owner_id,
                tenant_id,
                period_start,
                period_end,
                total_income,
                total_expenses,
                net_balance,
                pending_payments,
                generated_by,
                generated_at,
                created_at,
                updated_at,
                transactions:financial_transactions (
                    id,
                    agency_id,
                    owner_id,
                    entity_type,
                    type,
                    amount,
                    description,
                    category,
                    date,
                    property_id,
                    created_at,
                    updated_at
                )
            `);

        if (error) throw new Error(formatSbError("❌ financial_statements.select", error));
        return data?.map(normalizeFinancialStatement) ?? [];
    },
    async getByEntity(
        entityId: string,
        entityType: "owner" | "tenant",
        period: string
    ): Promise<FinancialStatement[]> {
        const [year, month] = period.split("-").map(Number);
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0).toISOString();

        const { data, error } = await supabase
            .from("financial_statements")
            .select(`
                id,
                agency_id,
                owner_id,
                tenant_id,
                period_start,
                period_end,
                total_income,
                total_expenses,
                net_balance,
                pending_payments,
                generated_by,
                generated_at,
                created_at,
                updated_at,
                transactions:financial_transactions (
                    id,
                    agency_id,
                    owner_id,
                    entity_type,
                    type,
                    amount,
                    description,
                    category,
                    date,
                    property_id,
                    created_at,
                    updated_at
                )
            `)
            .eq(entityType === "owner" ? "owner_id" : "tenant_id", entityId)
            .gte("period_start", startDate)
            .lte("period_end", endDate);

        if (error) throw new Error(formatSbError("❌ financial_statements.select", error));
        return data?.map(normalizeFinancialStatement) ?? [];
    },
    async create(statement: Partial<FinancialStatement>): Promise<FinancialStatement> {
        const normalizedStatement = normalizeFinancialStatement({
            ...statement,
            id: statement.id ?? uuidv4(),
            generated_at: statement.generated_at ?? new Date().toISOString(),
            created_at: statement.created_at ?? new Date().toISOString(),
            updated_at: statement.updated_at ?? new Date().toISOString(),
        });

        const { data, error } = await supabase
            .from("financial_statements")
            .insert({
                id: normalizedStatement.id,
                agency_id: normalizedStatement.agency_id,
                owner_id: normalizedStatement.entity_type === "owner" ? normalizedStatement.owner_id : null,
                tenant_id: normalizedStatement.entity_type === "tenant" ? normalizedStatement.tenant_id : null,
                period_start: normalizedStatement.period.start_date,
                period_end: normalizedStatement.period.end_date,
                total_income: normalizedStatement.summary.total_income,
                total_expenses: normalizedStatement.summary.total_expenses,
                net_balance: normalizedStatement.summary.balance,
                pending_payments: normalizedStatement.summary.pending_payments,
                generated_by: normalizedStatement.generated_by,
                generated_at: normalizedStatement.generated_at,
                created_at: normalizedStatement.created_at,
                updated_at: normalizedStatement.updated_at,
            })
            .select()
            .single();

        if (error) throw new Error(formatSbError("❌ financial_statements.insert", error));

        // Insert transactions if any
        if (normalizedStatement.transactions?.length) {
            const transactions = normalizedStatement.transactions.map(t => ({
                ...t,
                financial_statement_id: normalizedStatement.id,
            }));
            const { error: transactionError } = await supabase
                .from("financial_transactions")
                .insert(transactions);
            if (transactionError) throw new Error(formatSbError("❌ financial_transactions.insert", transactionError));
        }

        return normalizeFinancialStatement({
            ...data,
            transactions: normalizedStatement.transactions || [],
        });
    },
    async update(id: string, updates: Partial<FinancialStatement>): Promise<FinancialStatement> {
        const normalizedUpdates = normalizeFinancialStatement({
            ...updates,
            id,
            updated_at: updates.updated_at ?? new Date().toISOString(),
        });

        const { data, error } = await supabase
            .from("financial_statements")
            .update({
                agency_id: normalizedUpdates.agency_id,
                owner_id: normalizedUpdates.entity_type === "owner" ? normalizedUpdates.owner_id : null,
                tenant_id: normalizedUpdates.entity_type === "tenant" ? normalizedUpdates.tenant_id : null,
                period_start: normalizedUpdates.period.start_date,
                period_end: normalizedUpdates.period.end_date,
                total_income: normalizedUpdates.summary.total_income,
                total_expenses: normalizedUpdates.summary.total_expenses,
                net_balance: normalizedUpdates.summary.balance,
                pending_payments: normalizedUpdates.summary.pending_payments,
                generated_by: normalizedUpdates.generated_by,
                generated_at: normalizedUpdates.generated_at,
                updated_at: normalizedUpdates.updated_at,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw new Error(formatSbError("❌ financial_statements.update", error));

        // Update transactions if provided
        if (normalizedUpdates.transactions?.length) {
            const { error: deleteError } = await supabase
                .from("financial_transactions")
                .delete()
                .eq("financial_statement_id", id);
            if (deleteError) throw new Error(formatSbError("❌ financial_transactions.delete", deleteError));

            const transactions = normalizedUpdates.transactions.map(t => ({
                ...t,
                financial_statement_id: id,
            }));
            const { error: transactionError } = await supabase
                .from("financial_transactions")
                .insert(transactions);
            if (transactionError) throw new Error(formatSbError("❌ financial_transactions.insert", transactionError));
        }

        return normalizeFinancialStatement({
            ...data,
            transactions: normalizedUpdates.transactions || [],
        });
    },
    async delete(id: string): Promise<boolean> {
        const { error: transactionError } = await supabase
            .from("financial_transactions")
            .delete()
            .eq("financial_statement_id", id);
        if (transactionError) throw new Error(formatSbError("❌ financial_transactions.delete", transactionError));

        const { error } = await supabase
            .from("financial_statements")
            .delete()
            .eq("id", id);
        if (error) throw new Error(formatSbError("❌ financial_statements.delete", error));
        return true;
    },

    // Specific methods for property and transaction cleanup
    async getTransactionsByProperty(propertyId: string): Promise<{ data: any[] | null; error: any }> {
        const { data, error } = await supabase
            .from("financial_transactions")
            .select("*")
            .eq("property_id", propertyId);
        return { data, error };
    },

    async deleteTransaction(id: string): Promise<boolean> {
        const { error } = await supabase
            .from("financial_transactions")
            .delete()
            .eq("id", id);
        if (error) throw new Error(formatSbError("❌ financial_transactions.delete", error));
        return true;
    }
};