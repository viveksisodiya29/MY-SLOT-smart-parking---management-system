@echo off
setlocal

if "%~1"=="" goto usage

if /I "%~1"=="install" (
    shift
    npm.cmd install %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %errorlevel%
)

if /I "%~1"=="dev" goto run_dev
if /I "%~1"=="start" goto run_start
if /I "%~1"=="build" goto run_build
if /I "%~1"=="preview" goto run_preview
if /I "%~1"=="lint" goto run_lint
if /I "%~1"=="clean" goto run_clean

npm.cmd %*
exit /b %errorlevel%

:run_dev
npm.cmd run dev %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:run_start
npm.cmd start %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:run_build
npm.cmd run build %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:run_preview
npm.cmd run preview %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:run_lint
npm.cmd run lint %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:run_clean
npm.cmd run clean %2 %3 %4 %5 %6 %7 %8 %9
exit /b %errorlevel%

:usage
echo Usage: run.cmd ^<install^|dev^|start^|build^|preview^|lint^|clean^>
exit /b 1
