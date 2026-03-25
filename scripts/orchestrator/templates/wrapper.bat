@echo off
chcp 65001 >nul
title q-orchestrator — __PROJECT_SLUG__

:: ══════════════════════════════════════════════════════════════
:: Wrapper de q-orchestrator para: __PROJECT_SLUG__
:: ══════════════════════════════════════════════════════════════
::
:: Este archivo se genera una vez y apunta al orquestador central.
:: No necesitás volver a descargarlo.
::

:: ── Configuración ──
set "PROJECT_SLUG=__PROJECT_SLUG__"
set "ORCHESTRATOR_PATH=__ORCHESTRATOR_PATH__"

:: ── Buscar Git Bash ──
set "GITBASH="
if exist "C:\Program Files\Git\bin\bash.exe" (
    set "GITBASH=C:\Program Files\Git\bin\bash.exe"
) else if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    set "GITBASH=C:\Program Files (x86)\Git\bin\bash.exe"
) else (
    for /f "delims=" %%i in ('where bash 2^>nul') do set "GITBASH=%%i"
)

if "%GITBASH%"=="" (
    echo.
    echo   [ERROR] Git Bash no encontrado. Instalá Git desde git-scm.com
    echo.
    pause
    exit /b 1
)

:: ── Verificar que el orquestador existe ──
if not exist "%ORCHESTRATOR_PATH%\q-orchestrator.sh" (
    echo.
    echo   [ERROR] Orquestador no encontrado en: %ORCHESTRATOR_PATH%
    echo.
    echo   Opciones:
    echo     1. Cloná q-saas-template si no lo tenés
    echo     2. Editá este archivo y corregí ORCHESTRATOR_PATH
    echo.
    pause
    exit /b 1
)

:: ── Ejecutar ──
"%GITBASH%" -c "bash '%ORCHESTRATOR_PATH:\=/%/q-orchestrator.sh' --project '%PROJECT_SLUG%' %*"

pause
