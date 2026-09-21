@echo off
echo =========================================================================
echo   LAUNCHING MADURAI GROUNDWATER PROJECT IN QGIS 3.44.8
echo =========================================================================
echo Loading layers:
echo  - OpenStreetMap Basemap
echo  - GWQI & TDS IDW Interpolated Rasters (.tif)
echo  - Madurai District & 7 Taluks Boundaries (.geojson)
echo  - 225 Groundwater Monitoring Wells with Enriched Chemistry
echo.
start "" "C:\Program Files\QGIS 3.44.8\bin\qgis-ltr.bat" "D:\web dashboard GIS\Madurai_Groundwater_Project.qgs"
exit
