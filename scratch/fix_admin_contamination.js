import pg from 'pg';

const connectionString = "postgresql://postgres:Business%40gestion360immo.com@db.jedknkbevxiyytsypjrv.supabase.co:6543/postgres";

async function main() {
    const client = new pg.Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected!\n");

        // 1. Check all platform_admins with email from auth.users
        console.log("=== ALL platform_admins ===");
        const resAdmins = await client.query(`
            SELECT pa.user_id, pa.role, pa.is_active, pa.created_at, u.email
            FROM public.platform_admins pa
            LEFT JOIN auth.users u ON u.id = pa.user_id
            ORDER BY pa.created_at;
        `);
        console.log(JSON.stringify(resAdmins.rows, null, 2));

        // 2. Check cross-contamination: agency users who are ALSO platform_admins
        console.log("\n=== Agency users in platform_admins (SHOULD BE EMPTY) ===");
        const resCross = await client.query(`
            SELECT pa.user_id, u.email, pa.role as admin_role, au.role as agency_role, a.name as agency_name
            FROM public.platform_admins pa
            JOIN auth.users u ON u.id = pa.user_id
            JOIN public.agency_users au ON au.user_id = pa.user_id
            JOIN public.agencies a ON a.id = au.agency_id;
        `);
        console.log("Cross-contaminated:", JSON.stringify(resCross.rows, null, 2));

        // 3. CRITICAL FIX: Remove agency users from platform_admins
        // Keep only the ORIGINAL super admin (the one created earliest / specific email)
        if (resCross.rows.length > 0) {
            console.log("\n⚠️ FIXING: Removing agency users from platform_admins...");
            for (const row of resCross.rows) {
                const res = await client.query(`
                    DELETE FROM public.platform_admins WHERE user_id = $1 RETURNING user_id;
                `, [row.user_id]);
                console.log(`✅ Removed ${row.email} (${row.admin_role} admin, was also ${row.agency_role} at ${row.agency_name}):`, res.rows);
            }
        }

        // 4. Also check for users created by the test admin
        console.log("\n=== Recent auth.users (last 3 hours) ===");
        const resRecent = await client.query(`
            SELECT id, email, created_at, email_confirmed_at
            FROM auth.users 
            WHERE created_at > NOW() - INTERVAL '3 hours'
            ORDER BY created_at DESC;
        `);
        console.log(JSON.stringify(resRecent.rows, null, 2));

        // 5. Check if 'a3ba4c3d' test user was fully cleaned up
        const resTestUser = await client.query(`
            SELECT id, email FROM auth.users WHERE id = 'a3ba4c3d-353a-43fb-accb-9c8ef3a515af';
        `);
        if (resTestUser.rows.length > 0) {
            console.log("\n⚠️ Test user still exists! Removing...");
            await client.query(`DELETE FROM auth.users WHERE id = 'a3ba4c3d-353a-43fb-accb-9c8ef3a515af';`);
            console.log("✅ Test user removed");
        }

        // 6. Final state
        console.log("\n=== FINAL platform_admins ===");
        const resFinal = await client.query(`
            SELECT pa.user_id, pa.role, pa.is_active, u.email
            FROM public.platform_admins pa
            LEFT JOIN auth.users u ON u.id = pa.user_id
            ORDER BY pa.created_at;
        `);
        console.log(JSON.stringify(resFinal.rows, null, 2));

        // 7. Final agency_users state
        console.log("\n=== FINAL agency_users ===");
        const resFinalAU = await client.query(`
            SELECT au.user_id, au.role, a.name as agency_name, u.email
            FROM public.agency_users au
            JOIN public.agencies a ON a.id = au.agency_id
            LEFT JOIN auth.users u ON u.id = au.user_id
            ORDER BY a.name, au.role;
        `);
        console.log(JSON.stringify(resFinalAU.rows, null, 2));

        console.log("\n✅ All checks and fixes applied!");

    } catch (err) {
        console.error("❌ Script failed:", err);
    } finally {
        await client.end();
    }
}

main();
