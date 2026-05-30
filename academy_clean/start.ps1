# Academy - Windows PowerShell Start Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Academy - Starting Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pnpm is not installed." -ForegroundColor Red
    Write-Host "Run: npm install -g pnpm" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Install deps if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pnpm install
}

Write-Host ""
Write-Host "Starting backend  -> http://localhost:8000" -ForegroundColor Green
Write-Host "Starting frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host ""

pnpm run dev
