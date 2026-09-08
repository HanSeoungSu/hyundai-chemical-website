@echo off
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -File "%~dp0start-lan-preview.ps1"
if errorlevel 1 pause

