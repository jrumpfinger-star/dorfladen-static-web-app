@echo off
rem Startet die Waage-Bruecke. Zugangsdaten stehen in config.json (nicht im Repo).
cd /d "%~dp0"
if not exist config.json (
  echo Erstmalige Einrichtung: IP der Waage, FTP-Zugang und Kiosk-Passwort eingeben.
  python waage_bruecke.py --einrichten
)
:neu
python waage_bruecke.py
echo Bruecke beendet. Neustart in 5 Sekunden (Strg+C bricht ab) ...
timeout /t 5 >nul
goto neu
