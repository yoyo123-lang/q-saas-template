@echo off
chcp 65001 >nul
title Qontabiliza - Orquestador de Sesiones
color 0F

:: ── Detectar carpeta del repo ──
set "REPO_DIR=%~dp0.."
cd /d "%REPO_DIR%"

:: ── Buscar Git Bash ──
set "GITBASH="
if exist "C:\Program Files\Git\bin\bash.exe" (
    set "GITBASH=C:\Program Files\Git\bin\bash.exe"
) else if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    set "GITBASH=C:\Program Files (x86)\Git\bin\bash.exe"
) else (
    for /f "delims=" %%i in ('where bash 2^>nul') do set "GITBASH=%%i"
)

:: ══════════════════════════════════════════════════════════════
:: MENÚ PRINCIPAL
:: ══════════════════════════════════════════════════════════════

:MENU
cls
echo.
echo   ╔════════════════════════════════════════════════════════╗
echo   ║                                                        ║
echo   ║        Q O N T A B I L I Z A                           ║
echo   ║        Orquestador de Sesiones                         ║
echo   ║                                                        ║
echo   ╚════════════════════════════════════════════════════════╝
echo.

:: ── Mostrar estado actual ──
call :SHOW_STATUS

echo.
echo   ┌────────────────────────────────────────────────────────┐
echo   │                     OPCIONES                           │
echo   ├────────────────────────────────────────────────────────┤
echo   │                                                        │
echo   │   [1] Iniciar / Continuar sesiones                     │
echo   │   [2] Retomar desde una sesion especifica              │
echo   │   [3] Ver diagnostico del entorno                      │
echo   │   [4] Ver logs de la ultima sesion                     │
echo   │   [5] Configurar GITHUB_TOKEN                          │
echo   │   [6] Salir                                            │
echo   │                                                        │
echo   └────────────────────────────────────────────────────────┘
echo.
set "CHOICE="
set /p CHOICE="  Elegir opcion [1-6]: "

if "%CHOICE%"=="1" goto RUN_CONTINUE
if "%CHOICE%"=="2" goto RUN_FROM
if "%CHOICE%"=="3" goto DIAGNOSTIC
if "%CHOICE%"=="4" goto VIEW_LOGS
if "%CHOICE%"=="5" goto SET_TOKEN
if "%CHOICE%"=="6" goto EXIT
goto MENU

:: ══════════════════════════════════════════════════════════════
:: MOSTRAR ESTADO
:: ══════════════════════════════════════════════════════════════

:SHOW_STATUS
echo   ┌────────────────────────────────────────────────────────┐
echo   │                 ESTADO ACTUAL                          │
echo   ├────────────────────────────────────────────────────────┤

if not exist "scripts\state.json" (
    echo   │                                                        │
    echo   │   Sesion: 1 de 11                                      │
    echo   │   Estado: No iniciado                                  │
    echo   │                                                        │
    echo   └────────────────────────────────────────────────────────┘
    goto :SHOW_PROGRESS
)

:: Leer state.json con PowerShell
for /f "delims=" %%a in ('powershell -Command "try { $j = Get-Content 'scripts\state.json' | ConvertFrom-Json; Write-Output $j.session } catch { Write-Output '1' }"') do set "CUR_SESSION=%%a"
for /f "delims=" %%a in ('powershell -Command "try { $j = Get-Content 'scripts\state.json' | ConvertFrom-Json; Write-Output $j.step } catch { Write-Output 'start' }"') do set "CUR_STEP=%%a"
for /f "delims=" %%a in ('powershell -Command "try { $j = Get-Content 'scripts\state.json' | ConvertFrom-Json; Write-Output $j.status } catch { Write-Output 'pending' }"') do set "CUR_STATUS=%%a"
for /f "delims=" %%a in ('powershell -Command "try { $j = Get-Content 'scripts\state.json' | ConvertFrom-Json; Write-Output $j.updated_at } catch { Write-Output '' }"') do set "CUR_TIME=%%a"

:: Traducir paso
set "STEP_NAME=%CUR_STEP%"
if "%CUR_STEP%"=="start" set "STEP_NAME=Por iniciar"
if "%CUR_STEP%"=="implement" set "STEP_NAME=Implementando"
if "%CUR_STEP%"=="roles" set "STEP_NAME=Revision por roles"
if "%CUR_STEP%"=="fix" set "STEP_NAME=Corrigiendo hallazgos"
if "%CUR_STEP%"=="document" set "STEP_NAME=Documentando"
if "%CUR_STEP%"=="push" set "STEP_NAME=Build + Push"
if "%CUR_STEP%"=="ci-wait" set "STEP_NAME=Esperando CI"
if "%CUR_STEP%"=="ci-failed" set "STEP_NAME=CI FALLO"

:: Traducir estado
set "STATUS_NAME=%CUR_STATUS%"
if "%CUR_STATUS%"=="pending" set "STATUS_NAME=Pendiente"
if "%CUR_STATUS%"=="running" set "STATUS_NAME=En ejecucion"
if "%CUR_STATUS%"=="completed" set "STATUS_NAME=Completado"
if "%CUR_STATUS%"=="error" set "STATUS_NAME=ERROR"

echo   │                                                        │
echo   │   Sesion:      %CUR_SESSION% de 11
echo   │   Paso:        %STEP_NAME%
echo   │   Estado:      %STATUS_NAME%
echo   │   Actualizado: %CUR_TIME%
echo   │                                                        │
echo   └────────────────────────────────────────────────────────┘

:SHOW_PROGRESS
echo.
echo   ┌────────────────────────────────────────────────────────┐
echo   │                 PROGRESO                               │
echo   ├────────────────────────────────────────────────────────┤
echo   │                                                        │

:: Mostrar cada sesión con su estado
set "COMPLETED_UP_TO=0"
if defined CUR_SESSION (
    if "%CUR_STATUS%"=="completed" (
        set /a "COMPLETED_UP_TO=%CUR_SESSION%-1"
    ) else (
        set /a "COMPLETED_UP_TO=%CUR_SESSION%-1"
    )
)

set "S1=[ ]" & set "S2=[ ]" & set "S3=[ ]" & set "S4=[ ]" & set "S5=[ ]"
set "S6=[ ]" & set "S7=[ ]" & set "S8=[ ]" & set "S9=[ ]" & set "S10=[ ]" & set "S11=[ ]"

if %COMPLETED_UP_TO% geq 1 set "S1=[X]"
if %COMPLETED_UP_TO% geq 2 set "S2=[X]"
if %COMPLETED_UP_TO% geq 3 set "S3=[X]"
if %COMPLETED_UP_TO% geq 4 set "S4=[X]"
if %COMPLETED_UP_TO% geq 5 set "S5=[X]"
if %COMPLETED_UP_TO% geq 6 set "S6=[X]"
if %COMPLETED_UP_TO% geq 7 set "S7=[X]"
if %COMPLETED_UP_TO% geq 8 set "S8=[X]"
if %COMPLETED_UP_TO% geq 9 set "S9=[X]"
if %COMPLETED_UP_TO% geq 10 set "S10=[X]"
if %COMPLETED_UP_TO% geq 11 set "S11=[X]"

echo   │   %S1%  S1  Schema + Multi-tenancy BE                 │
echo   │   %S2%  S2  Multi-tenancy FE + Onboarding             │
echo   │   %S3%  S3  Productos y catalogo                      │
echo   │   %S4%  S4  Precios + Clientes                        │
echo   │   %S5%  S5  Facturacion ARCA BE                       │
echo   │   %S6%  S6  Facturacion ARCA FE + PDF                 │
echo   │   %S7%  S7  Stock basico                              │
echo   │   %S8%  S8  Ventas + POS BE                           │
echo   │   %S9%  S9  POS Frontend                              │
echo   │   %S10%  S10 Reportes + Dashboard                      │
echo   │   %S11%  S11 QA + Deploy                               │
echo   │                                                        │
echo   └────────────────────────────────────────────────────────┘

goto :eof

:: ══════════════════════════════════════════════════════════════
:: OPCIÓN 1: INICIAR / CONTINUAR
:: ══════════════════════════════════════════════════════════════

:RUN_CONTINUE
cls
echo.
echo   Iniciando orquestador (continua donde quedo)...
echo.
call :CHECK_DEPS
if %errorlevel% neq 0 goto MENU
call :DISABLE_SLEEP
echo.
echo   Para detener: Ctrl+C
echo   ─────────────────────────────────────────────
echo.

"%GITBASH%" -c "cd '%cd:\=/%' && bash scripts/orchestrate.sh"

call :RESTORE_SLEEP
echo.
echo   Orquestador finalizado.
echo.
pause
goto MENU

:: ══════════════════════════════════════════════════════════════
:: OPCIÓN 2: RETOMAR DESDE SESIÓN ESPECÍFICA
:: ══════════════════════════════════════════════════════════════

:RUN_FROM
cls
echo.
echo   ┌────────────────────────────────────────────────────────┐
echo   │              RETOMAR SESION                            │
echo   ├────────────────────────────────────────────────────────┤
echo   │                                                        │
echo   │   S1  Schema + Multi-tenancy BE                        │
echo   │   S2  Multi-tenancy FE + Onboarding                    │
echo   │   S3  Productos y catalogo                             │
echo   │   S4  Precios + Clientes                               │
echo   │   S5  Facturacion ARCA BE                              │
echo   │   S6  Facturacion ARCA FE + PDF                        │
echo   │   S7  Stock basico                                     │
echo   │   S8  Ventas + POS BE                                  │
echo   │   S9  POS Frontend                                     │
echo   │   S10 Reportes + Dashboard                             │
echo   │   S11 QA + Deploy                                      │
echo   │                                                        │
echo   └────────────────────────────────────────────────────────┘
echo.
set "SESSION_NUM="
set /p SESSION_NUM="  Desde que sesion? (1-11, 0 para volver): "

if "%SESSION_NUM%"=="0" goto MENU
if "%SESSION_NUM%"=="" goto MENU

:: Validar rango
set /a "SNUM=%SESSION_NUM%" 2>nul
if %SNUM% lss 1 (
    echo   [ERROR] Numero invalido. Debe ser entre 1 y 11.
    pause
    goto RUN_FROM
)
if %SNUM% gtr 11 (
    echo   [ERROR] Numero invalido. Debe ser entre 1 y 11.
    pause
    goto RUN_FROM
)

echo.
echo   Retomando desde sesion %SESSION_NUM%...
echo.
call :CHECK_DEPS
if %errorlevel% neq 0 goto MENU
call :DISABLE_SLEEP
echo.
echo   Para detener: Ctrl+C
echo   ─────────────────────────────────────────────
echo.

"%GITBASH%" -c "cd '%cd:\=/%' && bash scripts/orchestrate.sh --from %SESSION_NUM%"

call :RESTORE_SLEEP
echo.
echo   Orquestador finalizado.
echo.
pause
goto MENU

:: ══════════════════════════════════════════════════════════════
:: OPCIÓN 3: DIAGNÓSTICO
:: ══════════════════════════════════════════════════════════════

:DIAGNOSTIC
cls
echo.
echo   ┌────────────────────────────────────────────────────────┐
echo   │              DIAGNOSTICO DEL ENTORNO                   │
echo   ├────────────────────────────────────────────────────────┤
echo   │                                                        │

:: Git Bash
if "%GITBASH%"=="" (
    echo   │   [X] Git Bash no encontrado                          │
) else (
    echo   │   [OK] Git Bash encontrado                             │
)

:: Node.js
set "NODE_OK=0"
for /f "delims=" %%v in ('node --version 2^>nul') do (
    echo   │   [OK] Node.js %%v                                  │
    set "NODE_OK=1"
)
if "%NODE_OK%"=="0" echo   │   [X] Node.js no encontrado                          │

:: npm
set "NPM_OK=0"
for /f "delims=" %%v in ('npm --version 2^>nul') do (
    echo   │   [OK] npm %%v                                       │
    set "NPM_OK=1"
)
if "%NPM_OK%"=="0" echo   │   [X] npm no encontrado                               │

:: Claude CLI
set "CLAUDE_OK=0"
for /f "delims=" %%v in ('claude --version 2^>nul') do (
    echo   │   [OK] Claude CLI %%v              │
    set "CLAUDE_OK=1"
)
if "%CLAUDE_OK%"=="0" echo   │   [X] Claude CLI no encontrado                        │

:: Git
set "GIT_OK=0"
for /f "delims=" %%v in ('git --version 2^>nul') do (
    echo   │   [OK] %%v                              │
    set "GIT_OK=1"
)
if "%GIT_OK%"=="0" echo   │   [X] Git no encontrado                               │

:: Python3
set "PY_OK=0"
for /f "delims=" %%v in ('python3 --version 2^>nul') do (
    echo   │   [OK] %%v                                       │
    set "PY_OK=1"
)
if "%PY_OK%"=="0" (
    for /f "delims=" %%v in ('python --version 2^>nul') do (
        echo   │   [OK] %%v                                       │
        set "PY_OK=1"
    )
)
if "%PY_OK%"=="0" echo   │   [!!] Python no encontrado (opcional)                │

:: Repo
if exist ".git" (
    echo   │   [OK] Repositorio Git valido                         │
) else (
    echo   │   [X] No es un repositorio Git                        │
)

:: node_modules
if exist "node_modules" (
    echo   │   [OK] node_modules instalados                        │
) else (
    echo   │   [!!] node_modules no instalados (se instalan al iniciar^) │
)

:: GITHUB_TOKEN
if "%GITHUB_TOKEN%"=="" (
    echo   │   [!!] GITHUB_TOKEN no configurado (opcional^)         │
) else (
    echo   │   [OK] GITHUB_TOKEN configurado                       │
)

:: Session files
set "SESS_COUNT=0"
for %%f in (scripts\sessions\session-*.md) do set /a SESS_COUNT+=1
echo   │   [OK] %SESS_COUNT% archivos de sesion                        │

:: Prompt files
set "PROMPT_COUNT=0"
for %%f in (scripts\prompts\*.md) do set /a PROMPT_COUNT+=1
echo   │   [OK] %PROMPT_COUNT% archivos de prompts                        │

echo   │                                                        │
echo   └────────────────────────────────────────────────────────┘
echo.
pause
goto MENU

:: ══════════════════════════════════════════════════════════════
:: OPCIÓN 4: VER LOGS
:: ══════════════════════════════════════════════════════════════

:VIEW_LOGS
cls
echo.
echo   ┌────────────────────────────────────────────────────────┐
echo   │              LOGS RECIENTES                            │
echo   ├────────────────────────────────────────────────────────┤
echo   │                                                        │

if not exist "scripts\logs\*.log" (
    echo   │   No hay logs todavia.                                 │
    echo   │                                                        │
    echo   └────────────────────────────────────────────────────────┘
    echo.
    pause
    goto MENU
)

:: Listar últimos 10 logs
set "LOG_NUM=0"
for /f "delims=" %%f in ('dir /b /o-d scripts\logs\*.log 2^>nul') do (
    set /a LOG_NUM+=1
    if !LOG_NUM! leq 10 (
        echo   │   %%f  │
    )
)

echo   │                                                        │
echo   └────────────────────────────────────────────────────────┘
echo.
set "LOG_FILE="
set /p LOG_FILE="  Nombre del log a ver (Enter para volver): "

if "%LOG_FILE%"=="" goto MENU

if exist "scripts\logs\%LOG_FILE%" (
    cls
    echo.
    echo   === %LOG_FILE% ===
    echo.
    more "scripts\logs\%LOG_FILE%"
    echo.
    pause
) else (
    echo   [ERROR] Archivo no encontrado.
    pause
)
goto VIEW_LOGS

:: ══════════════════════════════════════════════════════════════
:: OPCIÓN 5: CONFIGURAR TOKEN
:: ══════════════════════════════════════════════════════════════

:SET_TOKEN
cls
echo.
echo   ┌────────────────────────────────────────────────────────┐
echo   │              CONFIGURAR GITHUB TOKEN                   │
echo   ├────────────────────────────────────────────────────────┤
echo   │                                                        │
echo   │   El token se usa para consultar el estado de CI.      │
echo   │   Sin el, las sesiones corren igual pero no            │
echo   │   esperan a que los tests de GitHub pasen.             │
echo   │                                                        │
echo   │   Genera uno en:                                       │
echo   │   GitHub ^> Settings ^> Developer Settings ^>              │
echo   │   Personal Access Tokens ^> Tokens (classic)            │
echo   │   Permisos necesarios: repo                            │
echo   │                                                        │
echo   └────────────────────────────────────────────────────────┘
echo.

if not "%GITHUB_TOKEN%"=="" (
    echo   Token actual: %GITHUB_TOKEN:~0,10%...
    echo.
)

set "NEW_TOKEN="
set /p NEW_TOKEN="  Pegar token (Enter para volver): "

if "%NEW_TOKEN%"=="" goto MENU

set "GITHUB_TOKEN=%NEW_TOKEN%"
echo.
echo   [OK] Token configurado para esta sesion.
echo   [INFO] Para que persista, agregar a variables de entorno de Windows:
echo          setx GITHUB_TOKEN "%NEW_TOKEN%"
echo.

set "PERSIST="
set /p PERSIST="  Guardar permanentemente? (y/n): "
if /i "%PERSIST%"=="y" (
    setx GITHUB_TOKEN "%NEW_TOKEN%" >nul 2>&1
    echo   [OK] Token guardado permanentemente.
)
echo.
pause
goto MENU

:: ══════════════════════════════════════════════════════════════
:: FUNCIONES AUXILIARES
:: ══════════════════════════════════════════════════════════════

:CHECK_DEPS
if "%GITBASH%"=="" (
    echo   [ERROR] Git Bash no encontrado. Instala Git.
    pause
    exit /b 1
)
where claude >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Claude CLI no encontrado.
    echo   Instala con: npm install -g @anthropic-ai/claude-code
    pause
    exit /b 1
)
if not exist ".git" (
    echo   [ERROR] No es un repositorio Git.
    pause
    exit /b 1
)
exit /b 0

:DISABLE_SLEEP
echo   [INFO] Deshabilitando suspension de Windows...
powershell -Command "& {Add-Type -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint esFlags);' -Name W32 -Namespace Pk -PassThru | Out-Null; [Pk.W32]::SetThreadExecutionState(0x80000003) | Out-Null}" >nul 2>&1
goto :eof

:RESTORE_SLEEP
powershell -Command "& {Add-Type -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint esFlags);' -Name W32 -Namespace Pk -PassThru | Out-Null; [Pk.W32]::SetThreadExecutionState(0x80000000) | Out-Null}" >nul 2>&1
goto :eof

:: ══════════════════════════════════════════════════════════════
:: SALIR
:: ══════════════════════════════════════════════════════════════

:EXIT
cls
echo.
echo   Hasta luego!
echo.
exit /b 0
