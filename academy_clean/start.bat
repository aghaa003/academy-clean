@echo off
echo ========================================
echo   Academy - Starting Development Server
echo ========================================

:: Check if pnpm is installed
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: pnpm is not installed.
  echo Run: npm install -g pnpm
  pause
  exit /b 1
)

:: Install dependencies if node_modules missing
if not exist "node_modules" (
  echo Installing dependencies...
  pnpm install
)

:: Start both servers
echo Starting backend on http://localhost:8000
echo Starting frontend on http://localhost:5173
echo.
pnpm run dev
