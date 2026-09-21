import os
import json
import numpy as np
from osgeo import gdal, osr

base_dir = r"D:\web dashboard GIS"
surfaces_json = os.path.join(base_dir, "data", "processed", "interpolation_surfaces.json")
raster_dir = os.path.join(base_dir, "data", "processed", "rasters")
os.makedirs(raster_dir, exist_ok=True)

with open(surfaces_json, 'r') as f:
    data = json.load(f)

meta = data['surfaces']['meta']
bounds = meta['bounds'] # [minx, miny, maxx, maxy]
grid_res = meta['grid_res']
minx, miny, maxx, maxy = bounds

pixel_width = (maxx - minx) / grid_res
pixel_height = (maxy - miny) / grid_res

srs = osr.SpatialReference()
srs.ImportFromEPSG(4326)

for param, pdata in data['surfaces']['parameters'].items():
    grid = np.array(pdata['grid'], dtype=float)
    # Replace None/NaN with -9999
    grid = np.nan_to_num(grid, nan=-9999.0)
    
    # Flip grid upside down for standard raster coordinate origin (North-Up)
    grid = np.flipud(grid)
    
    out_tif = os.path.join(raster_dir, f"madurai_{param.lower()}_idw.tif")
    
    driver = gdal.GetDriverByName('GTiff')
    ds = driver.Create(out_tif, grid_res, grid_res, 1, gdal.GDT_Float32)
    ds.SetGeoTransform([minx, pixel_width, 0, maxy, 0, -pixel_height])
    ds.SetProjection(srs.ExportToWkt())
    
    band = ds.GetRasterBand(1)
    band.WriteArray(grid)
    band.SetNoDataValue(-9999.0)
    band.FlushCache()
    ds = None
    print(f"Generated GeoTIFF: {out_tif}")

print("All GeoTIFF rasters successfully generated for QGIS!")
