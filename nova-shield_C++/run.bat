@echo off
echo =======================================
echo     Starting Nova Shield Proxy
echo =======================================

SET EXE_PATH=

:: Check where the executable was built (MinGW vs MSVC)
if exist "build\nova-shield.exe" (
    SET EXE_PATH=build\nova-shield.exe
) else if exist "build\Release\nova-shield.exe" (
    SET EXE_PATH=build\Release\nova-shield.exe
) else (
    echo [ERROR] nova-shield.exe not found!
    echo Please build the project first using build.bat or CMake.
    pause
    exit /b 1
)

:: Check if the mock testing backend is present and start it in a separate window
if exist "backend.py" (
    echo [INFO] Found backend.py. Starting mock backend on port 8080 in a new window...
    start "Nova Shield - Mock Backend" python backend.py
)

:: Check if the frontend exists and start it automatically
if exist "frontend\package.json" (
    echo [INFO] Starting React Dashboard...
    start "Nova Shield - React Dashboard" cmd /k "cd frontend && npm run dev -- --open"
    timeout /t 2 /nobreak >nul
    echo [INFO] Dashboard opening in your default browser...
)

echo [INFO] Running %EXE_PATH%
echo [INFO] Press Ctrl+C to stop the proxy.
echo ---------------------------------------
%EXE_PATH%
