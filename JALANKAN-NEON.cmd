@echo off
setlocal
cd /d "%~dp0"
title MLBB Shop - Neon
if not exist "scripts\start.mjs" (
 echo Ekstrak SELURUH ZIP dahulu. Jangan menjalankan file dari dalam ZIP.
 pause
 exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js belum ditemukan. Pasang Node.js 24 lalu buka kembali file ini.
 pause
 exit /b 1
)
node scripts\start.mjs --neon
if errorlevel 1 echo Baca pesan di atas. Log: logs\startup.log
pause
