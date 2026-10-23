@echo off
rem Baut Waage-Bruecke (Ordner mit Waage-Bruecke.exe, Python wird auf dem Laden-PC nicht gebraucht)
rem und packt ihn als dist\Waage-Bruecke.zip.
rem Voraussetzung auf diesem Rechner: Python 3 und "pip install pyinstaller".
rem Bewusst --onedir: die Einzeldatei-Variante (--onefile) wird von Windows Defender
rem faelschlich als Trojan:Win32/Bearfoos.B!ml gemeldet.
cd /d "%~dp0"
python -m PyInstaller --noconfirm --clean --onedir --console --name Waage-Bruecke ^
  --distpath dist --workpath build --specpath build waage_bruecke.py
if errorlevel 1 exit /b 1
powershell -NoProfile -Command "Compress-Archive -Path 'dist\Waage-Bruecke' -DestinationPath 'dist\Waage-Bruecke.zip' -Force"
echo.
echo Fertig: %~dp0dist\Waage-Bruecke.zip
