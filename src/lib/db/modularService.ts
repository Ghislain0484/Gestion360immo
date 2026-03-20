import { supabase } from '../config';
import { formatSbError } from '../helpers';
import { OfflineSyncManager } from '../offlineSync';
import { 
    ModuleType,
    ResidenceSite, 
    ResidenceUnit, 
    ModularBooking, 
    ResidenceExpense, 
    SiteFinancialSummary,
    HotelRoom,
    ModularClient,
    ModularTransaction,
    FinanceStats
} from '../../types/modular';

export const modularService = {
    /**
     * Helper pour exécuter une mutation avec support Hors-ligne
     */
    async performMutation(
        table: string,
        action: 'insert' | 'update' | 'delete',
        payload: any,
        recordId?: string
    ): Promise<any> {
        if (!OfflineSyncManager.isOnline()) {
            await OfflineSyncManager.queueMutation({ table, action, payload, record_id: recordId });
            return null; // On retourne null car l'opération est différée
        }

        let result;
        if (action === 'insert') {
            result = await supabase.from(table).insert(payload).select().single();
        } else if (action === 'update') {
            result = await supabase.from(table).update(payload).eq('id', recordId).select().single();
        } else if (action === 'delete') {
            result = await supabase.from(table).delete().eq('id', recordId);
        }

        if (result?.error) throw new Error(formatSbError(`performMutation:${table}:${action}`, result.error));
        return result?.data;
    },

    // --- HOTEL ROOMS ---
    async getHotelRooms(agencyId: string): Promise<HotelRoom[]> {
        const { data, error } = await supabase
            .from('hotel_rooms')
            .select('*, current_booking:modular_bookings(check_out, booking_status)')
            .eq('agency_id', agencyId)
            .eq('current_booking.booking_status', 'active')
            .order('room_number');
        
        if (error) throw new Error(formatSbError('getHotelRooms', error));
        return data || [];
    },

    async updateRoomStatus(roomId: string, status: HotelRoom['status']): Promise<void> {
        await this.performMutation('hotel_rooms', 'update', { status, updated_at: new Date().toISOString() }, roomId);
    },

    async syncBookingPaymentStatus(bookingId: string): Promise<void> {
        // Fetch the booking and all related transactions
        const { data: booking } = await supabase.from('modular_bookings').select('total_amount').eq('id', bookingId).single();
        const { data: txs } = await supabase.from('modular_transactions').select('amount').eq('related_id', bookingId).eq('type', 'income');

        if (!booking) return;

        const totalPaid = (txs || []).reduce((sum, tx) => sum + Number(tx.amount), 0);
        const status = totalPaid >= Number(booking.total_amount) ? 'paid' : 'pending';

        await supabase.from('modular_bookings').update({ 
            amount_paid: totalPaid,
            payment_status: status 
        }).eq('id', bookingId);
    },

    async updateRoom(roomId: string, room: Partial<HotelRoom>): Promise<HotelRoom | null> {
        return await this.performMutation('hotel_rooms', 'update', { ...room, updated_at: new Date().toISOString() }, roomId);
    },

    async deleteRoom(roomId: string): Promise<void> {
        await this.performMutation('hotel_rooms', 'delete', null, roomId);
    },

    async createRoom(room: Partial<HotelRoom>): Promise<HotelRoom | null> {
        return await this.performMutation('hotel_rooms', 'insert', room);
    },

    // --- SITES ---
    async getSites(agencyId: string): Promise<ResidenceSite[]> {
        const { data, error } = await supabase
            .from('residence_sites')
            .select('*')
            .eq('agency_id', agencyId)
            .order('name');
        
        if (error) throw new Error(formatSbError('getSites', error));
        return data || [];
    },

    async createSite(site: Partial<ResidenceSite>): Promise<ResidenceSite | null> {
        return await this.performMutation('residence_sites', 'insert', site);
    },

    async updateSite(siteId: string, site: Partial<ResidenceSite>): Promise<ResidenceSite | null> {
        return await this.performMutation('residence_sites', 'update', site, siteId);
    },

    async deleteSite(siteId: string): Promise<void> {
        await this.performMutation('residence_sites', 'delete', null, siteId);
    },

    // --- UNITS ---
    async getUnits(agencyId: string, siteId?: string): Promise<ResidenceUnit[]> {
        let query = supabase
            .from('residence_units')
            .select('*, site:residence_sites(*), current_booking:modular_bookings(check_out, booking_status)')
            .eq('agency_id', agencyId)
            .eq('current_booking.booking_status', 'active');
        
        if (siteId) {
            query = query.eq('site_id', siteId);
        }

        const { data, error } = await query.order('unit_name');
        if (error) throw new Error(formatSbError('getUnits', error));
        return data || [];
    },

    async updateUnitStatus(unitId: string, status: ResidenceUnit['status']): Promise<void> {
        await this.performMutation('residence_units', 'update', { status, updated_at: new Date().toISOString() }, unitId);
    },

    async createUnit(unit: Partial<ResidenceUnit>): Promise<ResidenceUnit> {
        const { data, error } = await supabase
            .from('residence_units')
            .insert([unit])
            .select()
            .single();
        
        if (error) throw new Error(formatSbError('createUnit', error));
        return data;
    },

    // --- BOOKINGS ---
    async createBooking(booking: Partial<ModularBooking>): Promise<ModularBooking | null> {
        const data = await this.performMutation('modular_bookings', 'insert', booking);
        if (!data) return null; // Offline mode handled
        
        // Update unit status if confirmed or checked_in
        if (booking.residence_id && (booking.booking_status === 'confirmed' || booking.booking_status === 'checked_in')) {
            await this.updateUnitStatus(booking.residence_id, 'occupied');
        } else if (booking.room_id && (booking.booking_status === 'confirmed' || booking.booking_status === 'checked_in')) {
            await this.updateRoomStatus(booking.room_id, 'occupied');
        }

        // Update client stats AND ensure they are tagged for this module
        if (booking.client_id) {
            const moduleTag = booking.residence_id ? 'residences' : 'hotel';
            await this.updateClientStats(booking.client_id, booking.total_amount || 0, moduleTag);
        }

        return data;
    },

    async getUnitWithBooking(unitId: string): Promise<{ unit: any, booking: any, client: any } | null> {
        // Fetch unit
        const { data: unit } = await supabase.from('residence_units').select('*, site:residence_sites(*)').eq('id', unitId).single();
        if (!unit) return null;

        // Fetch active booking
        const { data: booking } = await supabase
            .from('modular_bookings')
            .select('*, client:modular_clients(*)')
            .eq('residence_id', unitId)
            .in('booking_status', ['confirmed', 'checked_in'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        // Fetch transactions for this booking
        let transactions: any[] = [];
        if (booking?.id) {
            const { data: txs } = await supabase
                .from('modular_transactions')
                .select('*')
                .eq('related_id', booking.id)
                .order('transaction_date', { ascending: false });
            transactions = txs || [];
        }
        
        return { unit, booking, client: booking?.client, transactions } as any;
    },

    async getRoomWithBooking(roomId: string): Promise<{ room: any, booking: any, client: any } | null> {
        // Fetch room
        const { data: room } = await supabase.from('hotel_rooms').select('*').eq('id', roomId).single();
        if (!room) return null;

        // Fetch active booking
        const { data: booking } = await supabase
            .from('modular_bookings')
            .select('*, client:modular_clients(*)')
            .eq('room_id', roomId)
            .in('booking_status', ['confirmed', 'checked_in'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        // Fetch transactions for this booking
        let transactions: any[] = [];
        if (booking?.id) {
            const { data: txs } = await supabase
                .from('modular_transactions')
                .select('*')
                .eq('related_id', booking.id)
                .order('transaction_date', { ascending: false });
            transactions = txs || [];
        }
        
        return { room, booking, client: booking?.client, transactions } as any;
    },

    async checkoutBooking(bookingId: string, unitId: string, type: 'residence' | 'hotel'): Promise<void> {
        // Update booking status
        await this.performMutation('modular_bookings', 'update', { 
            booking_status: 'checked_out', 
            check_out: new Date().toISOString() 
        }, bookingId);

        // Update unit status to cleaning
        if (type === 'residence') {
            await this.updateUnitStatus(unitId, 'cleaning');
        } else {
            await this.updateRoomStatus(unitId, 'cleaning');
        }
    },

    async getRecentBookings(agencyId: string, limit = 10): Promise<ModularBooking[]> {
        const { data, error } = await supabase
            .from('modular_bookings')
            .select('*, residence:residence_units(*), room:hotel_rooms(*)')
            .eq('agency_id', agencyId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw new Error(formatSbError('getRecentBookings', error));
        return data || [];
    },

    // --- EXPENSES ---
    async getExpenses(agencyId: string, siteId?: string): Promise<ResidenceExpense[]> {
        let query = supabase
            .from('residence_expenses')
            .select('*')
            .eq('agency_id', agencyId);
        
        if (siteId) {
            query = query.eq('site_id', siteId);
        }

        const { data, error } = await query.order('expense_date', { ascending: false });
        if (error) throw new Error(formatSbError('getExpenses', error));
        return data || [];
    },

    async createExpense(expense: Partial<ResidenceExpense>): Promise<ResidenceExpense | null> {
        return await this.performMutation('residence_expenses', 'insert', expense);
    },

    // --- ANALYTICS ---
    async getFinancialSummary(agencyId: string): Promise<SiteFinancialSummary[]> {
        // Query the view we created
        const { data, error } = await supabase
            .from('site_financial_summary')
            .select('*')
            .eq('agency_id', agencyId);
        
        // Note: site_financial_summary is a global view, 
        // we might want to filter by agency_id if the view doesn't include it.
        // But since sites are already agency-specific, selecting from sites in the view usually works.
        // To be safe, let's assume the user wants the overview of ALL their sites.
        
        if (error) throw new Error(formatSbError('getFinancialSummary', error));
        return data || [];
    },

    // --- CRM / CLIENTS ---
    async getClients(agencyId: string, moduleType?: ModuleType): Promise<ModularClient[]> {
        let query = supabase
            .from('modular_clients')
            .select('*')
            .eq('agency_id', agencyId);
        
        if (moduleType) {
            query = query.eq('module_type', moduleType);
        }

        const { data, error } = await query.order('last_name');
        
        if (error) throw new Error(formatSbError('getClients', error));
        return data || [];
    },

    async createClient(client: Partial<ModularClient>): Promise<ModularClient | null> {
        return await this.performMutation('modular_clients', 'insert', client);
    },

    async updateClient(clientId: string, client: Partial<ModularClient>): Promise<ModularClient | null> {
        return await this.performMutation('modular_clients', 'update', { ...client, updated_at: new Date().toISOString() }, clientId);
    },

    async updateClientStats(clientId: string, _amount?: number, moduleTag?: ModuleType): Promise<void> {
        // Fetch all bookings for this client
        const { data: bookings } = await supabase
            .from('modular_bookings')
            .select('id, total_amount')
            .eq('client_id', clientId);
        
        if (!bookings || bookings.length === 0) return;

        const bookingIds = bookings.map(b => b.id);
        const totalStays = bookings.length;

        // Fetch all income transactions for these bookings
        const { data: transactions } = await supabase
            .from('modular_transactions')
            .select('amount')
            .in('related_id', bookingIds)
            .eq('type', 'income');
        
        const totalSpent = (transactions || []).reduce((sum, t) => sum + Number(t.amount), 0);

        // Get last stay date
        const { data: lastBooking } = await supabase
            .from('modular_bookings')
            .select('check_in')
            .eq('client_id', clientId)
            .order('check_in', { ascending: false })
            .limit(1)
            .single();

        const updates: any = {
            total_stays: totalStays,
            total_spent: totalSpent,
            last_stay_at: lastBooking?.check_in || null,
            updated_at: new Date().toISOString()
        };

        if (moduleTag) updates.module_type = moduleTag;

        await supabase
            .from('modular_clients')
            .update(updates)
            .eq('id', clientId);
    },

    async deleteClient(clientId: string): Promise<void> {
        await this.performMutation('modular_clients', 'delete', null, clientId);
    },

    // --- Transactions & Finance ---
    async getTransactions(agencyId: string, filters?: { site_id?: string; type?: string; module_type?: ModuleType }): Promise<ModularTransaction[]> {
        let query = supabase
            .from('modular_transactions')
            .select('*')
            .eq('agency_id', agencyId)
            .order('transaction_date', { ascending: false });

        if (filters?.site_id) query = query.eq('site_id', filters.site_id);
        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.module_type) {
            query = query.eq('module_type', filters.module_type);
        }

        const { data: transactions, error } = await query;
        if (error) throw new Error(formatSbError('getTransactions', error));
        if (!transactions) return [];

        // Fetch related bookings if any
        const relatedIds = transactions
            .filter(t => t.related_id && t.category === 'stay_payment')
            .map(t => t.related_id);

        if (relatedIds.length > 0) {
            const { data: bookings } = await supabase
                .from('modular_bookings')
                .select('*, client:modular_clients(*)')
                .in('id', relatedIds);

            if (bookings) {
                return transactions.map(t => ({
                    ...t,
                    booking: bookings.find(b => b.id === t.related_id)
                }));
            }
        }

        return transactions;
    },

    async createTransaction(transaction: Partial<ModularTransaction>): Promise<ModularTransaction | null> {
        return await this.performMutation('modular_transactions', 'insert', transaction);
    },

    async getClientTransactions(clientId: string): Promise<ModularTransaction[]> {
        // Fetch all bookings for this client
        const { data: bookings } = await supabase
            .from('modular_bookings')
            .select('id')
            .eq('client_id', clientId);
        
        if (!bookings || bookings.length === 0) return [];

        const bookingIds = bookings.map(b => b.id);

        // Fetch all transactions related to these bookings
        const { data, error } = await supabase
            .from('modular_transactions')
            .select('*')
            .in('related_id', bookingIds)
            .order('transaction_date', { ascending: false });

        if (error) throw new Error(formatSbError('getClientTransactions', error));
        return data || [];
    },

    async getFinanceStats(agencyId: string, moduleType?: ModuleType): Promise<FinanceStats> {
        // Aggregate income and expenses
        let incomeQuery = supabase
            .from('modular_transactions')
            .select('amount')
            .eq('agency_id', agencyId)
            .eq('type', 'income');
        
        let expenseQuery = supabase
            .from('modular_transactions')
            .select('amount')
            .eq('agency_id', agencyId)
            .in('type', ['expense', 'salary', 'deposit']);

        if (moduleType) {
            incomeQuery = incomeQuery.eq('module_type', moduleType);
            expenseQuery = expenseQuery.eq('module_type', moduleType);
        }

        const [{ data: incomeData }, { data: expenseData }] = await Promise.all([incomeQuery, expenseQuery]);

        const totalIncome = (incomeData || []).reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpenses = (expenseData || []).reduce((sum, t) => sum + Number(t.amount), 0);

        // Occupancy calculation
        let unitCount = 0;
        let occupiedCount = 0;

        if (!moduleType || moduleType === 'residences') {
            const { data: units } = await supabase
                .from('residence_units')
                .select('status')
                .eq('agency_id', agencyId);
            unitCount += units?.length || 0;
            occupiedCount += units?.filter(u => u.status === 'occupied').length || 0;
        }

        if (!moduleType || moduleType === 'hotel') {
            const { data: rooms } = await supabase
                .from('hotel_rooms')
                .select('status')
                .eq('agency_id', agencyId);
            unitCount += rooms?.length || 0;
            occupiedCount += rooms?.filter(r => r.status === 'occupied').length || 0;
        }

        const occupancyRate = unitCount > 0 ? (occupiedCount / unitCount) * 100 : 0;

        return {
            total_income: totalIncome,
            total_expenses: totalExpenses,
            net_balance: totalIncome - totalExpenses,
            occupancy_rate: occupancyRate,
            revenue_by_site: {}
        };
    }
};

