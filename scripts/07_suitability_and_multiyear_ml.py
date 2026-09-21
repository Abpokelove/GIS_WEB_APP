import os
import json
import numpy as np
import pandas as pd
from scipy.spatial.distance import cdist
from shapely.geometry import Point
import geopandas as gpd
from osgeo import gdal, osr

base_dir = r"D:\web dashboard GIS"
processed_dir = os.path.join(base_dir, "data", "processed")
rasters_dir = os.path.join(processed_dir, "rasters")
dashboard_data = os.path.join(base_dir, "dashboard", "data")
master_csv = os.path.join(processed_dir, "madurai_groundwater_enriched.csv")
dist_geojson = os.path.join(processed_dir, "madurai_district_boundary.geojson")

os.makedirs(rasters_dir, exist_ok=True)
os.makedirs(dashboard_data, exist_ok=True)

print("=== STEP 7: MULTI-YEAR ML PREDICTION & SUITABILITY ZONATION (DRINKING & AGRICULTURE) ===")

df = pd.read_csv(master_csv)
gdf_dist = gpd.read_file(dist_geojson)
dist_poly = gdf_dist.geometry.iloc[0]

# Total Madurai District Area ~ 3,741 sq km
TOTAL_DISTRICT_SQ_KM = 3741.0

# 1. Multi-Year Prediction Horizons
forecast_years = [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2035]
all_params = ['GWQI', 'TDS', 'F', 'NO2+NO3', 'EC_GEN', 'HAR_Total', 'SAR', 'RSC', 'Na%']

wells = df['Well No'].unique()
print(f"Calibrating multi-year ML models for {len(wells)} monitoring wells...")

well_models = {}
for w in wells:
    sub = df[df['Well No'] == w].sort_values('Date of collection')
    if len(sub) < 3:
        continue
    
    village = sub['Village'].iloc[0]
    taluk = sub['Taluk'].iloc[0]
    lat = float(sub['Latitude_DD'].iloc[0])
    lon = float(sub['Longitude_DD'].iloc[0])
    
    rec = sub[sub['Year'] >= 2017]
    if len(rec) == 0: rec = sub
    
    w_model = {
        'well_no': str(w),
        'village': village,
        'taluk': taluk,
        'lat': lat,
        'lon': lon,
        'base_2021': {},
        'slopes': {},
        'forecasts': {}
    }
    
    for p in all_params:
        if p not in sub.columns:
            continue
        y = sub[p].fillna(sub[p].mean()).values
        x = sub['Year'].values - 2007
        
        slope, _ = np.polyfit(x, y, 1)
        base_val = float(rec[p].mean()) if not pd.isna(rec[p].mean()) else float(sub[p].mean())
        
        # Aquifer inertia constraint (+/- 3.5% per year)
        max_annual_drift = 0.035 * max(1.0, abs(base_val))
        slope = float(np.clip(slope, -max_annual_drift, max_annual_drift))
        
        w_model['base_2021'][p] = round(base_val, 2)
        w_model['slopes'][p] = round(slope, 4)
        
    # Generate predictions for all target forecast years
    for fy in forecast_years:
        dt = fy - 2021
        fy_dict = {}
        for p in all_params:
            if p not in w_model['base_2021']:
                continue
            b = w_model['base_2021'][p]
            s = w_model['slopes'][p]
            v = b + (s * dt)
            
            # Physical bounds
            if p == 'GWQI': v = max(35.0, min(480.0, v))
            elif p in ['TDS', 'HAR_Total']: v = max(100.0, min(6500.0, v))
            elif p == 'EC_GEN': v = max(200.0, min(9500.0, v))
            elif p == 'F': v = max(0.1, min(3.5, v))
            elif p == 'NO2+NO3': v = max(1.0, min(190.0, v))
            elif p == 'SAR': v = max(0.2, min(35.0, v))
            elif p == 'RSC': v = max(0.0, min(12.0, v))
            elif p == 'Na%': v = max(5.0, min(95.0, v))
            
            fy_dict[p] = round(float(v), 2)
            
        # Drinking Water Classification (BIS 10500)
        # Safe: GWQI < 100 and F <= 1.0 and NO3 <= 45 and TDS <= 1000
        # Marginal: GWQI <= 150 and F <= 1.5 and NO3 <= 60 and TDS <= 2000
        # Unsuitable: otherwise
        gwqi = fy_dict['GWQI']
        f_val = fy_dict['F']
        no3_val = fy_dict['NO2+NO3']
        tds_val = fy_dict['TDS']
        
        if gwqi < 100 and f_val <= 1.0 and no3_val <= 45 and tds_val <= 1000:
            drinking_status = "Safe Drinking Water"
            drinking_tier = 1
        elif gwqi <= 150 and f_val <= 1.5 and no3_val <= 60 and tds_val <= 2000:
            drinking_status = "Marginal Drinking Water"
            drinking_tier = 2
        else:
            drinking_status = "Unsuitable for Drinking"
            drinking_tier = 3
            
        fy_dict['Drinking_Status'] = drinking_status
        fy_dict['Drinking_Tier'] = drinking_tier
        
        # Agricultural Suitability Classification (USSL & FAO)
        # Prime: SAR < 10 and EC < 1500 and RSC < 1.25 (all crops: paddy, sugarcane, vegetables)
        # Moderate: SAR 10-18 or EC 1500-3000 (salt-tolerant crops: cotton, millets, pulses)
        # Unsuitable: SAR > 18 or EC > 3000 or RSC > 2.5 (severe sodicity & infiltration hazard)
        sar = fy_dict['SAR']
        ec = fy_dict['EC_GEN']
        rsc = fy_dict.get('RSC', 0.0)
        
        if sar < 10 and ec < 1500 and rsc < 1.25:
            agri_status = "Prime Agricultural Land"
            agri_tier = 1
            agri_crops = "Paddy, Sugarcane, Vegetables, Flowers, Banana"
        elif sar <= 18 and ec <= 3000 and rsc <= 2.5:
            agri_status = "Moderate / Salt-Tolerant Land"
            agri_tier = 2
            agri_crops = "Cotton, Millets, Sorghum, Pulses (with good drainage)"
        else:
            agri_status = "Severe Sodicity / Unsuitable"
            agri_tier = 3
            agri_crops = "Unsuitable: Requires Gypsum Amendment & Deep Drainage"
            
        fy_dict['Agri_Status'] = agri_status
        fy_dict['Agri_Tier'] = agri_tier
        fy_dict['Agri_Crops'] = agri_crops
        
        w_model['forecasts'][fy] = fy_dict
        
    well_models[str(w)] = w_model

print(f"Generated models for {len(well_models)} wells.")

# 2. Build Multi-Year Horizon Overview & Taluk Analytics
horizons_summary = {}
taluk_horizons = {}

taluks_list = df['Taluk'].unique().tolist()
for t in taluks_list:
    taluk_horizons[t] = {}

for fy in forecast_years:
    all_w_fy = [m['forecasts'][fy] for m in well_models.values()]
    n_wells = len(all_w_fy)
    
    mean_gwqi = round(float(np.mean([x['GWQI'] for x in all_w_fy])), 1)
    mean_tds = round(float(np.mean([x['TDS'] for x in all_w_fy])), 1)
    mean_f = round(float(np.mean([x['F'] for x in all_w_fy])), 2)
    mean_no3 = round(float(np.mean([x['NO2+NO3'] for x in all_w_fy])), 1)
    mean_sar = round(float(np.mean([x['SAR'] for x in all_w_fy])), 2)
    mean_ec = round(float(np.mean([x['EC_GEN'] for x in all_w_fy])), 1)
    
    # Drinking breakdown
    d_safe_count = sum(1 for x in all_w_fy if x['Drinking_Tier'] == 1)
    d_marg_count = sum(1 for x in all_w_fy if x['Drinking_Tier'] == 2)
    d_uns_count = sum(1 for x in all_w_fy if x['Drinking_Tier'] == 3)
    
    pct_d_safe = round((d_safe_count / n_wells) * 100, 1)
    pct_d_marg = round((d_marg_count / n_wells) * 100, 1)
    pct_d_uns = round((d_uns_count / n_wells) * 100, 1)
    
    # Agri breakdown
    a_prime_count = sum(1 for x in all_w_fy if x['Agri_Tier'] == 1)
    a_mod_count = sum(1 for x in all_w_fy if x['Agri_Tier'] == 2)
    a_uns_count = sum(1 for x in all_w_fy if x['Agri_Tier'] == 3)
    
    pct_a_prime = round((a_prime_count / n_wells) * 100, 1)
    pct_a_mod = round((a_mod_count / n_wells) * 100, 1)
    pct_a_uns = round((a_uns_count / n_wells) * 100, 1)
    
    horizons_summary[fy] = {
        'year': fy,
        'mean_GWQI': mean_gwqi,
        'mean_TDS': mean_tds,
        'mean_F': mean_f,
        'mean_NO3': mean_no3,
        'mean_SAR': mean_sar,
        'mean_EC': mean_ec,
        'drinking_suitability': {
            'safe_pct': pct_d_safe,
            'safe_sq_km': round((pct_d_safe / 100) * TOTAL_DISTRICT_SQ_KM, 1),
            'marginal_pct': pct_d_marg,
            'marginal_sq_km': round((pct_d_marg / 100) * TOTAL_DISTRICT_SQ_KM, 1),
            'unsuitable_pct': pct_d_uns,
            'unsuitable_sq_km': round((pct_d_uns / 100) * TOTAL_DISTRICT_SQ_KM, 1)
        },
        'agri_suitability': {
            'prime_pct': pct_a_prime,
            'prime_sq_km': round((pct_a_prime / 100) * TOTAL_DISTRICT_SQ_KM, 1),
            'moderate_pct': pct_a_mod,
            'moderate_sq_km': round((pct_a_mod / 100) * TOTAL_DISTRICT_SQ_KM, 1),
            'unsuitable_pct': pct_a_uns,
            'unsuitable_sq_km': round((pct_a_uns / 100) * TOTAL_DISTRICT_SQ_KM, 1)
        }
    }
    
    # By taluk
    for t in taluks_list:
        t_wells = [m['forecasts'][fy] for m in well_models.values() if m['taluk'] == t]
        if not t_wells:
            continue
        nt = len(t_wells)
        t_mean_gwqi = round(float(np.mean([x['GWQI'] for x in t_wells])), 1)
        t_mean_tds = round(float(np.mean([x['TDS'] for x in t_wells])), 1)
        t_mean_f = round(float(np.mean([x['F'] for x in t_wells])), 2)
        t_mean_no3 = round(float(np.mean([x['NO2+NO3'] for x in t_wells])), 1)
        t_mean_sar = round(float(np.mean([x['SAR'] for x in t_wells])), 2)
        
        t_d_safe_pct = round((sum(1 for x in t_wells if x['Drinking_Tier'] == 1) / nt) * 100, 1)
        t_a_prime_pct = round((sum(1 for x in t_wells if x['Agri_Tier'] == 1) / nt) * 100, 1)
        
        taluk_horizons[t][fy] = {
            'mean_GWQI': t_mean_gwqi,
            'mean_TDS': t_mean_tds,
            'mean_F': t_mean_f,
            'mean_NO3': t_mean_no3,
            'mean_SAR': t_mean_sar,
            'safe_drinking_pct': t_d_safe_pct,
            'prime_agri_pct': t_a_prime_pct
        }

# 3. SPATIAL INTERPOLATION: DRINKING & AGRI SUITABILITY SURFACES + MULTI-YEAR ML SURFACES
print("Generating continuous spatial IDW suitability rasters and grids...")
surfaces_json = os.path.join(processed_dir, "interpolation_surfaces.json")
with open(surfaces_json, 'r') as f:
    surfaces_data = json.load(f)

grid_res = surfaces_data['surfaces']['meta']['grid_res']
bounds = surfaces_data['surfaces']['meta']['bounds']
minx, miny, maxx, maxy = bounds

gx = np.linspace(minx, maxx, grid_res)
gy = np.linspace(miny, maxy, grid_res)
grid_x, grid_y = np.meshgrid(gx, gy)
grid_pts = np.vstack([grid_x.ravel(), grid_y.ravel()]).T
inside_mask = np.array([dist_poly.contains(Point(x, y)) for x, y in grid_pts])
target_valid_xy = grid_pts[inside_mask]

known_coords = np.array([[m['lon'], m['lat']] for m in well_models.values()])

def compute_idw(vals):
    dists = cdist(target_valid_xy, known_coords)
    weights = 1.0 / np.where(dists == 0, 1e-6, dists ** 2)
    return np.sum(weights * vals, axis=1) / np.sum(weights, axis=1)

def export_geotiff(filename, grid_2d):
    path = os.path.join(rasters_dir, filename)
    driver = gdal.GetDriverByName('GTiff')
    dataset = driver.Create(path, grid_res, grid_res, 1, gdal.GDT_Float32)
    pixel_width = (maxx - minx) / grid_res
    pixel_height = (maxy - miny) / grid_res
    dataset.SetGeoTransform((minx, pixel_width, 0, maxy, 0, -pixel_height))
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    dataset.SetProjection(srs.ExportToWkt())
    band = dataset.GetRasterBand(1)
    band.SetNoDataValue(-9999)
    out_arr = np.where(grid_2d == None, -9999, grid_2d).astype(np.float32)
    band.WriteArray(out_arr)
    band.FlushCache()
    dataset = None

# A) Drinking Suitability Continuous Grid (1.0 = Safe, 2.0 = Marginal, 3.0 = Unsuitable)
drink_tiers = np.array([m['forecasts'][2024]['Drinking_Tier'] for m in well_models.values()])
drink_idw = compute_idw(drink_tiers)
full_drink = np.full(len(grid_pts), None, dtype=object)
full_drink[inside_mask] = np.round(drink_idw, 2)
drink_2d = full_drink.reshape((grid_res, grid_res))

surfaces_data['surfaces']['parameters']['Drinking_Suitability'] = {
    'min': 1.0,
    'max': 3.0,
    'mean': float(np.mean(drink_idw)),
    'grid': [[float(v) if v is not None else None for v in row] for row in drink_2d]
}
export_geotiff("madurai_drinking_suitability.tif", drink_2d)

# B) Agricultural Suitability Continuous Grid (1.0 = Prime, 2.0 = Moderate, 3.0 = Unsuitable)
agri_tiers = np.array([m['forecasts'][2024]['Agri_Tier'] for m in well_models.values()])
agri_idw = compute_idw(agri_tiers)
full_agri = np.full(len(grid_pts), None, dtype=object)
full_agri[inside_mask] = np.round(agri_idw, 2)
agri_2d = full_agri.reshape((grid_res, grid_res))

surfaces_data['surfaces']['parameters']['Agri_Suitability'] = {
    'min': 1.0,
    'max': 3.0,
    'mean': float(np.mean(agri_idw)),
    'grid': [[float(v) if v is not None else None for v in row] for row in agri_2d]
}
export_geotiff("madurai_agri_suitability.tif", agri_2d)

# C) Multi-Year ML GWQI Projections (2026, 2030, 2035)
for yr in [2026, 2030, 2035]:
    yr_gwqi = np.array([m['forecasts'][yr]['GWQI'] for m in well_models.values()])
    yr_idw = compute_idw(yr_gwqi)
    full_yr = np.full(len(grid_pts), None, dtype=object)
    full_yr[inside_mask] = np.round(yr_idw, 2)
    yr_2d = full_yr.reshape((grid_res, grid_res))
    
    surfaces_data['surfaces']['parameters'][f'GWQI_{yr}_ML'] = {
        'min': float(np.min(yr_idw)),
        'max': float(np.max(yr_idw)),
        'mean': float(np.mean(yr_idw)),
        'grid': [[float(v) if v is not None else None for v in row] for row in yr_2d]
    }
    export_geotiff(f"madurai_gwqi_{yr}_ml.tif", yr_2d)

# Save updated surfaces to both processed and dashboard/data
with open(surfaces_json, 'w') as f:
    json.dump(surfaces_data, f)
with open(os.path.join(dashboard_data, "interpolation_surfaces.json"), 'w') as f:
    json.dump(surfaces_data, f)

# 4. Save Master Suitability & ML Payload for React
suitability_ml_payload = {
    'overview': {
        'title': 'Madurai Multi-Year ML Groundwater Forecast & Suitability Zonation Engine',
        'horizons': forecast_years,
        'district_area_sq_km': TOTAL_DISTRICT_SQ_KM,
        'standards': {
            'drinking': 'BIS 10500:2012 Drinking Water Specification',
            'agriculture': 'US Salinity Laboratory (USSL), Wilcox & FAO 29 Guidelines'
        }
    },
    'horizons_summary': horizons_summary,
    'taluk_horizons': taluk_horizons,
    'well_models': well_models
}

out_json = os.path.join(dashboard_data, "suitability_and_ml.json")
with open(out_json, 'w') as f:
    json.dump(suitability_ml_payload, f)

print(f"Successfully generated {out_json} (Size: {os.path.getsize(out_json):,} bytes)")
print("Exported GeoTIFF rasters for QGIS Desktop integration.")
print("=== DONE ===")
