
// Diagnostic RPC sans dependances
const URL = "https://jedknkbevxiyytsypjrv.supabase.co/rest/v1/rpc/approve_agency_request";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGtua2JldnhpeXl0c3lwanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzM0NzIsImV4cCI6MjA3MzI0OTQ3Mn0.uFtctOXUMOrxvgK2iLsdy2FSeO_C1uNNVfcMIh4sbIU";

async function runDebug() {
    console.log("🔍 Tentative de recuperation des demandes...");
    
    // 1. Trouver une demande en attente
    const listRes = await fetch("https://jedknkbevxiyytsypjrv.supabase.co/rest/v1/agency_registration_requests?status=eq.pending&limit=1", {
        headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
    });
    const requests = await listRes.json();
    
    if (!requests || requests.length === 0) {
        console.log("❓ Aucune demande en attente trouvée.");
        return;
    }
    
    const targetId = requests[0].id;
    console.log(`⏳ Test d'approbation pour la demande : ${targetId} (${requests[0].agency_name})`);
    
    // 2. Tenter l'approbation et lire l'erreur
    const approveRes = await fetch(URL, {
        method: "POST",
        headers: { 
            "apikey": ANON_KEY, 
            "Authorization": `Bearer ${ANON_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify({ p_request_id: targetId })
    });
    
    const result = await approveRes.json();
    console.log("📩 Reponse du serveur :");
    console.log(JSON.stringify(result, null, 2));
}

runDebug();
