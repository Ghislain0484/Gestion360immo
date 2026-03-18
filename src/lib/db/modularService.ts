import { supabase } from '../config';
import { formatSbError } from '../helpers';
import { 
    ResidenceSite, 
    ResidenceUnit, 
    ModularBooking, 
    ResidenceExpense, 
    SiteFinancialSummary,
    HotelRoom
} from '../../types/modular';

export const modularService = {
    // --- HOTEL ROOMS ---
    async getHotelRooms(agencyId: string): Promise<HotelRoom[]> {
        const { data, error } = await supabase
            .from('hotel_rooms')
            .select('*')
            .eq('agency_id', agencyId)
            .order('room_number');
        
        if (error) throw new Error(formatSbError('getHotelRooms', error));
        return data || [];
    },

    async updateRoomStatus(roomId: string, status: HotelRoom['status']): Promise<void> {
        const { error } = await supabase
            .from('hotel_rooms')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', roomId);
        
        if (error) throw new Error(formatSbError('updateRoomStatus', error));
    },

    async createRoom(room: Partial<HotelRoom>): Promise<HotelRoom> {
        const { data, error } = await supabase
            .from('hotel_rooms')
            .insert([room])
            .select()
            .single();
        
        if (error) throw new Error(formatSbError('createRoom', error));
        return data;
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

    async createSite(site: Partial<ResidenceSite>): Promise<ResidenceSite> {
        const { data, error } = await supabase
            .from('residence_sites')
            .insert([site])
            .select()
            .single();
        
        if (error) throw new Error(formatSbError('createSite', error));
        return data;
    },

    // --- UNITS ---
    async getUnits(agencyId: string, siteId?: string): Promise<ResidenceUnit[]> {
        let query = supabase
            .from('residence_units')
            .select('*, site:residence_sites(*)')
            .eq('agency_id', agencyId);
        
        if (siteId) {
            query = query.eq('site_id', siteId);
        }

        const { data, error } = await query.order('unit_name');
        if (error) throw new Error(formatSbError('getUnits', error));
        return data || [];
    },

    async updateUnitStatus(unitId: string, status: ResidenceUnit['status']): Promise<void> {
        const { error } = await supabase
            .from('residence_units')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', unitId);
        
        if (error) throw new Error(formatSbError('updateUnitStatus', error));
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
    async createBooking(booking: Partial<ModularBooking>): Promise<ModularBooking> {
        const { data, error } = await supabase
            .from('modular_bookings')
            .insert([booking])
            .select()
            .single();
        
        if (error) throw new Error(formatSbError('createBooking', error));
        
        // Update unit status if confirmed or checked_in
        if (booking.residence_id && (booking.booking_status === 'confirmed' || booking.booking_status === 'checked_in')) {
            await this.updateUnitStatus(booking.residence_id, 'occupied');
        }

        return data;
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

    async createExpense(expense: Partial<ResidenceExpense>): Promise<ResidenceExpense> {
        const { data, error } = await supabase
            .from('residence_expenses')
            .insert([expense])
            .select()
            .single();
        
        if (error) throw new Error(formatSbError('createExpense', error));
        return data;
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
    }
};
