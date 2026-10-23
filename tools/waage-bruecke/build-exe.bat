@echo off
rem Baut Waage-Bruecke.exe (eine Datei, Python wird auf dem Laden-PC nicht gebraucht).
rem Voraussetzung auf diesem Rechner: Python 3 und "pip install pyinstaller".
cd /d "%~dp0"
python -m PyInstaller --noconfirm --clean --onefile --console --name Waage-Bruecke ^
  --distpath dist --workpath build --specpath build waage_bruecke.py
if errorlevel 1 exit /b 1
echo.
echo Fertig: %~dp0dist\Waage-Bruecke.exe
