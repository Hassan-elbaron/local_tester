# ─── Start MySQL for AI Marketing OS (local dev) ──────────────────────────────
# Run this script once to set up and start MySQL.
# Requirements: Docker Desktop OR winget (Windows 11+)

$DB_NAME = "ai_marketing_os"
$DB_PASS = "password"

Write-Host "🔍 Checking for MySQL..." -ForegroundColor Cyan

# ── Option 1: Docker ──────────────────────────────────────────────────────────
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✅ Docker found. Starting MySQL container..." -ForegroundColor Green
    Set-Location $PSScriptRoot\..
    docker compose up -d
    Write-Host "⏳ Waiting for MySQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    Write-Host "🚀 Running migrations..." -ForegroundColor Cyan
    pnpm db:push
    Write-Host "✅ Done! Run 'pnpm dev' to start the app." -ForegroundColor Green
    exit 0
}

# ── Option 2: MySQL already installed as a Windows service ────────────────────
$mysqlService = Get-Service -Name "MySQL*","mysql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($mysqlService) {
    Write-Host "✅ MySQL service found: $($mysqlService.Name)" -ForegroundColor Green
    if ($mysqlService.Status -ne "Running") {
        Write-Host "▶️  Starting MySQL service..." -ForegroundColor Yellow
        Start-Service $mysqlService.Name
        Start-Sleep -Seconds 3
    }
    Write-Host "🚀 Running migrations..." -ForegroundColor Cyan
    Set-Location $PSScriptRoot\..
    pnpm db:push
    Write-Host "✅ Done! Run 'pnpm dev' to start the app." -ForegroundColor Green
    exit 0
}

# ── Option 3: Install via winget ──────────────────────────────────────────────
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "📦 Installing MySQL via winget..." -ForegroundColor Yellow
    winget install Oracle.MySQL --silent --accept-package-agreements --accept-source-agreements
    Write-Host "⏳ Waiting for MySQL to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    Set-Location $PSScriptRoot\..
    pnpm db:push
    Write-Host "✅ Done! Run 'pnpm dev' to start the app." -ForegroundColor Green
    exit 0
}

# ── Fallback: Manual instructions ────────────────────────────────────────────
Write-Host ""
Write-Host "❌ MySQL not found. Please install one of:" -ForegroundColor Red
Write-Host ""
Write-Host "  Option A — Docker Desktop (recommended):" -ForegroundColor White
Write-Host "    https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
Write-Host "    Then run: docker compose up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "  Option B — MySQL Community Server:" -ForegroundColor White
Write-Host "    https://dev.mysql.com/downloads/mysql/" -ForegroundColor Cyan
Write-Host "    Password: $DB_PASS  |  Database: $DB_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "  Option C — XAMPP (includes MySQL + phpMyAdmin):" -ForegroundColor White
Write-Host "    https://www.apachefriends.org/" -ForegroundColor Cyan
Write-Host ""
