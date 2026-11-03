@echo off
echo ========================================================
echo   Launching Tank Yard (moo-tanks)
echo ========================================================
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
echo Starting local web server...
npx vite --port 3000 --open
pause
