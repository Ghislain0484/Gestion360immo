export type ModuleType = 'hotel' | 'residences';

export interface ResidenceSite {
    id: string;
    agency_id: string;
    name: string;
    zone: string;
    address?: string;
    city: string;
    amenities?: string[];
    created_at: string;
    updated_at: string;
}
export interface HotelRoom {
    id: string;
    agency_id: string;
    room_number: string;
    room_type: 'standard' | 'suite' | 'vip';
    floor?: number;
    status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved';
    base_price_per_night: number;
    created_at: string;
    updated_at: string;
}

export interface ResidenceUnit {
    id: string;
    agency_id: string;
    site_id?: string;
    unit_name: string;
    unit_type: string;
    unit_category: 'studio' | '2-pieces' | '3-pieces' | 'penthouse' | 'villa';
    status: 'ready' | 'occupied' | 'cleaning' | 'reserved' | 'maintenance';
    rating: number;
    base_price_per_night: number;
    caution_amount: number;
    description?: string;
    created_at: string;
    updated_at: string;
    site?: ResidenceSite; // Joined data
}

export interface ModularBooking {
    id: string;
    agency_id: string;
    tenant_id?: string;
    guest_name?: string;
    room_id?: string;
    residence_id?: string;
    check_in: string;
    check_out: string;
    total_amount: number;
    amount_paid: number;
    payment_method: 'cash' | 'card' | 'orange_money' | 'mtn_money' | 'wave' | 'bank_transfer';
    payment_status: 'pending' | 'partial' | 'paid';
    booking_status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
    created_at: string;
    residence?: ResidenceUnit; // Joined data
    room?: HotelRoom; // Joined data
}

export interface ResidenceExpense {
    id: string;
    agency_id: string;
    site_id?: string;
    unit_id?: string;
    category: 'utilities' | 'maintenance' | 'staff' | 'marketing' | 'taxes' | 'other';
    amount: number;
    description: string;
    expense_date: string;
    status: 'pending' | 'paid';
    created_at: string;
}

export interface SiteFinancialSummary {
    site_id: string;
    site_name: string;
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
}
