$ErrorActionPreference = "Stop"
$root = Split-Path $PSCommandPath -Parent

Write-Host "=== Building React frontend ==="
Set-Location "$root\frontend-react"
npm run build
if (-not $?) { throw "React build failed" }

Write-Host "=== Copying dist to Go embed dir ==="
$dist = "$root\frontend-react\dist\browser"
$embed = "$root\backend-go\frontend-dist"
if (Test-Path $embed) { Remove-Item -Recurse -Force $embed }
New-Item -ItemType Directory -Path $embed -Force | Out-Null
Copy-Item -Recurse "$dist\*" $embed

Write-Host "=== Building Go backend ==="
Set-Location "$root\backend-go"
go build -ldflags="-s -w" -o kayran-server.exe .
if (-not $?) { throw "Go build failed" }

Write-Host "=== Build OK ==="
