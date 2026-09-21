import os
from qgis.core import (
    QgsApplication, QgsProject, QgsVectorLayer, QgsRasterLayer,
    QgsCoordinateReferenceSystem
)

qgs = QgsApplication([], False)
qgs.initQgis()

project = QgsProject.instance()
project.clear()
project.setTitle("Madurai District Groundwater Quality Project (2007-2021)")
project.setCrs(QgsCoordinateReferenceSystem("EPSG:4326"))

base_dir = r"D:\web dashboard GIS"
data_dir = os.path.join(base_dir, "data", "processed")
raster_dir = os.path.join(data_dir, "rasters")

# 1. OpenStreetMap Basemap Layer
osm_url = "type=xyz&url=https://tile.openstreetmap.org/{z}/{x}/{y}.png&zmax=19&zmin=0"
osm_layer = QgsRasterLayer(osm_url, "OpenStreetMap Standard", "wms")
if osm_layer.isValid():
    project.addMapLayer(osm_layer)
    print("Added OpenStreetMap Basemap")

# 2. GWQI IDW Raster Layer
gwqi_tif = os.path.join(raster_dir, "madurai_gwqi_idw.tif")
gwqi_raster = QgsRasterLayer(gwqi_tif, "GWQI Continuous Surface (IDW)")
if gwqi_raster.isValid():
    project.addMapLayer(gwqi_raster)
    print("Added GWQI Raster Layer")

# 3. TDS IDW Raster Layer
tds_tif = os.path.join(raster_dir, "madurai_tds_idw.tif")
tds_raster = QgsRasterLayer(tds_tif, "TDS Continuous Surface (IDW)")
if tds_raster.isValid():
    project.addMapLayer(tds_raster)
    print("Added TDS Raster Layer")

# 4. District Boundary Layer
dist_path = os.path.join(data_dir, "madurai_district_boundary.geojson")
dist_layer = QgsVectorLayer(dist_path, "Madurai District Boundary", "ogr")
if dist_layer.isValid():
    project.addMapLayer(dist_layer)
    print("Added District Boundary Layer")

# 5. Taluks Layer
taluk_path = os.path.join(data_dir, "madurai_taluks.geojson")
taluk_layer = QgsVectorLayer(taluk_path, "Madurai 7 Taluks", "ogr")
if taluk_layer.isValid():
    project.addMapLayer(taluk_layer)
    print("Added Taluks Layer")

# 6. Wells Layer
wells_path = os.path.join(data_dir, "madurai_wells_enriched.geojson")
wells_layer = QgsVectorLayer(wells_path, "Groundwater Wells (2007-2021)", "ogr")
if wells_layer.isValid():
    project.addMapLayer(wells_layer)
    print("Added Wells Layer")

# Save project
project_file = os.path.join(base_dir, "Madurai_Groundwater_Project.qgs")
project.write(project_file)
print("Successfully generated and saved QGIS Project File:", project_file)

qgs.exitQgis()
