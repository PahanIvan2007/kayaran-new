param(
  [switch]$Dev,
  [switch]$Go,
  [switch]$SkipDb,
  [switch]$BuildOnly
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:PGPASSWORD = "123"

function Check-Command($cmd, $name) {
  if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "❌ $name не найден" -ForegroundColor Red
    exit 1
  }
  Write-Host "✅ $name $( & $cmd --version 2>$null | Select-Object -First 1 )" -ForegroundColor Green
}

Write-Host "╔═══════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Kayran Platform 🚣      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════╝" -ForegroundColor Cyan

# Проверка зависимостей
Check-Command node "Node.js"
Check-Command npm "npm"
if ($Go) { Check-Command go "Go" } else { Check-Command python "Python" }

# Angular deps + build
if (!(Test-Path "$root\frontend-angular\node_modules")) {
  Write-Host "`n📦 npm install..." -ForegroundColor Yellow
  Set-Location "$root\frontend-angular"; npm install
}
Write-Host "`n🏗️  Angular build..." -ForegroundColor Yellow
Set-Location "$root\frontend-angular"; npx ng build --configuration production

# DB seed
if (!$SkipDb) {
  $dbExists = & psql -U postgres -l 2>$null | Select-String -Pattern " kayran "
  if (!$dbExists) {
    Write-Host "`n🗄️  CREATE DATABASE kayran..." -ForegroundColor Yellow
    & psql -U postgres -c "CREATE DATABASE kayran;"
  }
  $hasData = & psql -U postgres -d kayran -t -c "SELECT COUNT(*) FROM users" 2>$null
  if ($hasData -eq "0" -or !$hasData) {
    Write-Host "`n🌱 Seed data..." -ForegroundColor Yellow
    & psql -U postgres -d kayran -f "$root\db_full_schema.sql"
  }
}

if ($BuildOnly) { Write-Host "`n✅ Build complete"; return }

# Запуск
if ($Go) {
  Write-Host "`n🚀 Go backend (быстро!)..." -ForegroundColor Green
  Set-Location "$root\backend-go"
  $env:DATABASE_URL = "postgres://postgres:123@localhost:5432/kayran"
  Start-Process -NoNewWindow -FilePath ".\kayran-server.exe"
} else {
  Write-Host "`n🚀 Python backend..." -ForegroundColor Yellow
  Set-Location "$root\backend"
  Start-Process -NoNewWindow -FilePath "uvicorn" -ArgumentList "app.main:app --host 0.0.0.0 --port 8000 --reload"
}
Start-Sleep -Seconds 3

try { $r = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing -TimeoutSec 3; "✅ Server OK" } catch { "⚠️ Проверь http://localhost:8000" }

Write-Host "`n📱 http://localhost:8000 — Frontend" -ForegroundColor Green
Write-Host "📖 http://localhost:8000/docs — API" -ForegroundColor Green
if ($Dev) { Write-Host "🔧 http://localhost:4200 — ng serve (hot-reload)" -ForegroundColor Green }
Write-Host "`nНажми Ctrl+C для остановки" -ForegroundColor Yellow

Start-Process "http://localhost:8000"
Read-Host "`nНажми Enter для выхода"
