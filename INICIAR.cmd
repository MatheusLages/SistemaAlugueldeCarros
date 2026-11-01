@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 18 ou superior.
  pause
  exit /b 1
)
if not exist node_modules\json-server (
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Lages Cars - acesse http://127.0.0.1:3000
echo Mantenha esta janela aberta.
call npm.cmd start
pause
