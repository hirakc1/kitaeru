@echo off
rem Run this BEFORE working on Kitaeru: gets the latest from GitHub (and unfinished work from the other computer).
cd /d "%~dp0"
where python >nul 2>nul || (echo Python is not installed. See docs\TWO_MACHINES.md, Part 1. & pause & exit /b 1)
python tools\session.py start
echo.
pause
