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
    current_booking?: { check_out: string; booking_status: string }[];
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
    current_booking?: { check_out: string; booking_status: string }[];
}

export interface ModularBooking {
    id: string;
    agency_id: string;
    tenant_id?: string;
    client_id?: string;
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
    client?: ModularClient; // Joined data
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

export interface ModularClient {
    id: string;
    agency_id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
    client_type: 'regular' | 'vip' | 'corporate';
    loyalty_points: number;
    preferences: string[];
    nationality?: string;
    id_card_number?: string;
    id_card_url?: string;
    total_stays: number;
    total_spent: number;
    total_engaged?: number;
    last_stay_at?: string;
    module_type: ModuleType;
    created_at: string;
    updated_at: string;
}

export type ModularClientFormData = Omit<ModularClient, 'id' | 'created_at' | 'updated_at' | 'total_stays' | 'total_spent' | 'last_stay_at'>;

export interface ModularTransaction {
    id: string;
    agency_id: string;
    site_id?: string;
    type: 'income' | 'expense' | 'deposit' | 'transfer' | 'salary' | 'credit' | 'debit';
    category: string;
    amount: number;
    description?: string;
    transaction_date: string;
    payment_method: string;
    related_id?: string;
    module_type?: ModuleType;
    created_at: string;
    updated_at: string;

    // Joined relations (optional)
    booking?: ModularBooking & { client?: ModularClient };
    client?: ModularClient;
}

export interface FinanceStats {
    total_income: number;
    total_expenses: number;
    net_balance: number;
    occupancy_rate: number;
    revenue_by_site: Record<string, number>;
}

