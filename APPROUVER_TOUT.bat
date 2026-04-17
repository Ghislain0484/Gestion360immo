@echo off
setlocal
echo ========================================================
echo   GESTION360 - VALIDATION EXPRESS DES AGENCES
echo ========================================================
echo.
echo Tentative de bypass du navigateur et de Kaspersky...
echo.

set "SUPABASE_URL=https://jedknkbevxiyytsypjrv.supabase.co"
set "ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGtua2JldnhpeXl0c3lwanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzM0NzIsImV4cCI6MjA3MzI0OTQ3Mn0.uFtctOXUMOrxvgK2iLsdy2FSeO_C1uNNVfcMIh4sbIU"

powershell -Command ^
    "$headers = @{ 'apikey' = '%ANON_KEY%'; 'Authorization' = 'Bearer %ANON_KEY%'; 'Content-Type' = 'application/json' }; ^
    $requests = Invoke-RestMethod -Uri '%SUPABASE_URL%/rest/v1/agency_registration_requests?status=eq.pending' -Headers $headers; ^
    if ($requests.Count -eq 0) { Write-Host 'Aucune demande en attente.' -ForegroundColor Yellow; } ^
    else { ^
        foreach ($req in $requests) { ^
            Write-Host ('Approbation de : ' + $req.agency_name + ' (' + $req.id + ')...'); ^
            try { ^
                $res = Invoke-RestMethod -Uri '%SUPABASE_URL%/rest/v1/rpc/approve_agency_request' -Method Post -Headers $headers -Body (ConvertTo-Json @{ p_request_id = $req.id }); ^
                Write-Host '  OK : Success!' -ForegroundColor Green; ^
            } catch { ^
                Write-Host ('  ERREUR : ' + $_.Exception.Message) -ForegroundColor Red; ^
            } ^
        } ^
    }"

echo.
echo ========================================================
echo   TERMINE. Vous pouvez rafraichir votre navigateur.
echo ========================================================
pause
