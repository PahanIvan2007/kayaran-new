$ErrorActionPreference = "Stop"
$root = Split-Path $PSCommandPath -Parent

Write-Host "=== Building Angular ===" -ForegroundColor Cyan
Set-Location "$root\frontend-angular"
ng build
if (-not $?) { throw "Angular build failed" }

Write-Host "=== Copying dist ===" -ForegroundColor Cyan
$dist = "$root\frontend-angular\dist\frontend-angular\browser"
$embed = "$root\backend-go\frontend-dist"
if (Test-Path $embed) { Remove-Item -Recurse -Force $embed }
New-Item -ItemType Directory -Path $embed -Force | Out-Null
Copy-Item -Recurse "$dist\*" $embed

Write-Host "=== Building Go ===" -ForegroundColor Cyan
Set-Location "$root\backend-go"
go build -ldflags="-s -w" -o kayran-server.exe .
if (-not $?) { throw "Go build failed" }

Get-Process -Name kayran-server -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

Write-Host "=== Starting server ===" -ForegroundColor Cyan
$env:DATABASE_URL = "postgres://postgres:123@localhost:5432/kayran?sslmode=disable"
$ps = Start-Process -FilePath "$root\backend-go\kayran-server.exe" -WindowStyle Hidden -PassThru
Write-Host "Server PID: $($ps.Id)" -ForegroundColor Green
Start-Sleep -Seconds 3

try {
  $r = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing -TimeoutSec 5
  Write-Host "Server OK (HTTP $($r.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "Server check failed: $_" -ForegroundColor Yellow
}

Write-Host "=== Starting tunnel (localhost.run) ===" -ForegroundColor Cyan
$log = "$env:TEMP\tunnel.txt"
$job = Start-Job -Name Tunnel -ScriptBlock {
  param($port, $logFile)
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:$port nokey@localhost.run 2>&1 | ForEach-Object { "$_" | Out-File $logFile -Append }
} -ArgumentList 8000, $log

Start-Sleep -Seconds 6
$url = Select-String -Path $log -Pattern 'https://[a-z0-9]+\.lhr\.life' | ForEach-Object { $_.Matches.Value } | Select-Object -First 1

if ($url) {
  Write-Host ""
  Write-Host "+----------------------------------------------------------" -ForegroundColor Green
  Write-Host "|  PHONE URL: $url " -ForegroundColor Green
  Write-Host "+----------------------------------------------------------" -ForegroundColor Green
  Write-Host ""
  Write-Host "Login: +79990001122 / Anna Sportswoman" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Press Ctrl+C to stop server and tunnel." -ForegroundColor Gray
  Wait-Job -Name Tunnel
} else {
  Write-Host "Tunnel URL not found. Check log: $log" -ForegroundColor Red
  Get-Job -Name Tunnel | Stop-Job; Remove-Job -Name Tunnel -Force
  Read-Host "Press Enter to exit"
}
