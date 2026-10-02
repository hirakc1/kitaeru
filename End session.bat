@echo off
rem Run this when you FINISH working on this computer: saves your work to GitHub (not to the live app).
cd /d "%~dp0"
where python >nul 2>nul || (echo Python is not installed. See docs\TWO_MACHINES.md, Part 1. & pause & exit /b 1)
python tools\session.py end
echo.
pause
