@echo off
echo =========================================================================
echo   STARTING MADURAI GROUNDWATER QUALITY GIS DASHBOARD
echo   Coverage: Madurai District (7 Taluks, 225 Wells, 2,059 Records, 2007-2021)
echo =========================================================================
echo.
echo Opening browser at http://localhost:8080/index.html ...
start http://localhost:8080/index.html
echo.
echo Starting HTTP Server on Port 8080 (Press Ctrl+C to stop)...
"C:\Program Files\QGIS 3.44.8\bin\python-qgis-ltr.bat" -m http.server 8080 -d "d:\web dashboard GIS\dashboard"
pause
