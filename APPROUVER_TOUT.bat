@echo off
setlocal
echo ========================================================
echo   GESTION360 - VALIDATION MASSIVE (V3 FORCE BRUTE)
echo ========================================================
echo.
echo Envoi de l'ordre d'approbation massive au serveur...

set "SURL=https://jedknkbevxiyytsypjrv.supabase.co"
set "AKEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZGtua2JldnhpeXl0c3lwanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzM0NzIsImV4cCI6MjA3MzI0OTQ3Mn0.uFtctOXUMOrxvgK2iLsdy2FSeO_C1uNNVfcMIh4sbIU"

powershell -Command "$h=@{'apikey'='%AKEY%';'Authorization'='Bearer %AKEY%';'Content-Type'='application/json'}; try { $res=Invoke-RestMethod -Uri '%SURL%/rest/v1/rpc/mass_approve_agencies' -Method Post -Headers $h; Write-Host ('SUCCES : ' + $res.message) -FG Green } catch { Write-Host ('ERREUR : ' + $_.Exception.Message) -FG Red; Write-Host 'Avez-vous bien execute le code SQL dans Supabase ?' -FG Yellow }"

echo.
echo ========================================================
echo   TERMINE. Rafraichissez votre dashboard.
echo ========================================================
pause
