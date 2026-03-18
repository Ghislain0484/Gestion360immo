-- Modular Business Logic for Hotel and Furnished Residences
-- Context: Côte d'Ivoire (Mobile Money, Luxury Services, Long/Short Stay Pricing)

-- 1. Pricing Policies (Dynamic Pricing Engine)
CREATE TABLE IF NOT EXISTS booking_pricing_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    module_type TEXT CHECK (module_type IN ('hotel', 'residences')),
    short_stay_price_per_night DECIMAL(12,2) NOT NULL,
    long_stay_threshold_days INTEGER DEFAULT 7,
    long_stay_discount_rate DECIMAL(5,2) DEFAULT 10.00, -- percentage
    currency TEXT DEFAULT 'XOF',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agency_id, module_type)
);

-- 2. Hotel Rooms
CREATE TABLE IF NOT EXISTS hotel_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_type TEXT NOT NULL, -- Standard, Suite, VIP
    floor INTEGER,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance', 'reserved')),
    base_price_per_night DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agency_id, room_number)
);

-- 3. Furnished Residence Units
CREATE TABLE IF NOT EXISTS residence_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    unit_name TEXT NOT NULL,
    unit_type TEXT NOT NULL, -- Studio, 2-Pièces, Penthouse
    status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'occupied', 'cleaning', 'reserved')),
    rating DECIMAL(2,1) DEFAULT 5.0,
    base_price_per_night DECIMAL(12,2),
    caution_amount DECIMAL(12,2), -- Security deposit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agency_id, unit_name)
);

-- 4. Concierge & Luxury Services
CREATE TABLE IF NOT EXISTS modular_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL, -- Navette Aéroport, Petit-déjeuner Ivoirien, Sécurité VIP
    category TEXT DEFAULT 'conciergerie',
    price DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Unit Inventories (For Furnished Residences)
CREATE TABLE IF NOT EXISTS unit_inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES residence_units(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL, -- Ex: Climatiseur Split, TV 4K, Kit Draps
    quantity INTEGER DEFAULT 1,
    condition TEXT DEFAULT 'good',
    last_check TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Unified Bookings
CREATE TABLE IF NOT EXISTS modular_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id), -- Or a guest_id if we want external guests
    guest_name TEXT, -- Fallback for non-local occupants
    room_id UUID REFERENCES hotel_rooms(id),
    residence_id UUID REFERENCES residence_units(id),
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ NOT NULL,
    total_amount DECIMAL(12,2),
    amount_paid DECIMAL(12,2) DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'orange_money', 'mtn_money', 'wave', 'bank_transfer')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
    booking_status TEXT DEFAULT 'confirmed' CHECK (booking_status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (room_id IS NOT NULL AND residence_id IS NULL) OR 
        (residence_id IS NOT NULL AND room_id IS NULL)
    )
);

-- RLS Policies
ALTER TABLE booking_pricing_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE residence_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE modular_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE modular_bookings ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies (assuming current_setting('request.jwt.claims')::jsonb->>'sub' is the userId)
-- Simplified for brevity, usually linked via agency_users
CREATE POLICY "Users can see their agency pricing" ON booking_pricing_policies FOR SELECT USING (agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid()));
CREATE POLICY "Directors can manage pricing" ON booking_pricing_policies FOR ALL USING (agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid() AND role = 'director'));

-- Note: In Standalone Mode, RLS might be simpler if there's only one agency.
