
// Diagnostic de verfication de l'etat des tables
const URL_REQS = "https://jedknkbevxiyytsypjrv.supabase.co/rest/v1/agency_registration_requests";
const URL_AGENCIES = "https://jedknkbevxiyytsypjrv.supabase.co/rest/v1/agencies";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGtua2JldnhpeXl0c3lwanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzM0NzIsImV4cCI6MjA3MzI0OTQ3Mn0.uFtctOXUMOrxvgK2iLsdy2FSeO_C1uNNVfcMIh4sbIU";

async function verifyState() {
    console.log("🔍 Verification de l'état final...");
    
    // 1. Lister les demandes et leur statut
    const reqsRes = await fetch(URL_REQS + "?select=id,agency_name,status", {
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
    });
    const requests = await reqsRes.json();
    console.log("\n📋 Statut des demandes d'inscription :");
    console.table(requests);
    
    // 2. Lister les agences créées récemment
    const agRes = await fetch(URL_AGENCIES + "?select=id,name,status,created_at&order=created_at.desc&limit=5", {
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
    });
    const agencies = await agRes.json();
    console.log("\n🏢 Dernières agences créées :");
    console.table(agencies);
}

verifyState();
