
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUnit() {
    console.log('--- Debugging Residence 101 ---');
    
    const { data: unit, error: unitError } = await supabase
        .from('modular_units')
        .select(`
            *,
            current_booking:modular_bookings(
                *,
                client:modular_clients(*)
            )
        `)
        .eq('unit_name', '101')
        .single();

    if (unitError) {
        console.error('Error fetching unit:', unitError);
        return;
    }

    console.log('Unit Name:', unit.unit_name);
    console.log('Status:', unit.status);
    
    if (unit.current_booking && unit.current_booking.length > 0) {
        const booking = unit.current_booking[0];
        console.log('Booking ID:', booking.id);
        console.log('Check-in:', booking.check_in);
        console.log('Check-out:', booking.check_out);
        console.log('Now (UTC):', new Date().toISOString());
        
        const checkOutDate = new Date(booking.check_out);
        const todayDate = new Date();
        
        console.log('Parsed Check-out:', checkOutDate.toString());
        console.log('Parsed Today:', todayDate.toString());
        
        const isToday = new Date(new Date(booking.check_out).setHours(0,0,0,0)).getTime() === new Date(new Date().setHours(0,0,0,0)).getTime();
        console.log('Is Today (Current Logic):', isToday);
    } else {
        console.log('No current booking found.');
    }
}

debugUnit();
