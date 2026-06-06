# Run this ONCE to authenticate Tailscale
$ErrorActionPreference = "Stop"
$ts = "C:\Program Files\Tailscale"
$env:Path = "$ts;$env:Path"

# Add to PATH permanently for current user
[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";$ts", "User")

Write-Host "=== Logging in to Tailscale ===" -ForegroundColor Cyan
Write-Host "A browser will open. Log in with any account (Google/GitHub/etc)." -ForegroundColor Yellow
Write-Host "After login, come back here." -ForegroundColor Yellow
Write-Host ""
Start-Process "https://login.tailscale.com/start"
tailscale up
