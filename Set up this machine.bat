@echo off
rem One-time setup for Kitaeru on a new Windows computer. Safe to run again.
cd /d "%~dp0"
where python >nul 2>nul || (echo Python is not installed. See docs\TWO_MACHINES.md, Part 1. & pause & exit /b 1)
python tools\session.py setup
echo.
pause
