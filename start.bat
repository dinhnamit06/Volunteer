@echo off
echo ==========================================
echo   PHVMS - Phenikaa Volunteer Management
echo ==========================================

IF NOT EXIST node_modules (
    echo [*] Chua co node_modules, dang cai dat...
    npm install
)

echo [*] Khoi dong server...
echo [*] Mo trinh duyet tai: http://localhost:5000
start http://localhost:5000/auth.html
node index.js
pause
