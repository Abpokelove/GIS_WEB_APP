import os
import json
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point, Polygon, MultiPolygon, box
from scipy.spatial.distance import cdist

BASE_DIR = r"D:\web dashboard GIS"
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
ENRICHED_CSV = os.path.join(PROCESSED_DIR, "madurai_groundwater_enriched.csv")
DISTRICT_GEOJSON = os.path.join(PROCESSED_DIR, "madurai_district_boundary.geojson")

print("=== STEP 3: SPATIAL INTERPOLATION & TEMPORAL CHANGE ENGINE ===")
df = pd.read_csv(ENRICHED_CSV)
gdf_dist = gpd.read_file(DISTRICT_GEOJSON)
dist_poly = gdf_dist.geometry.iloc[0]

# Define regular interpolation grid over Madurai district bounds
minx, miny, maxx, maxy = dist_poly.bounds
grid_res = 75  # 75x75 grid cells over the district
gx = np.linspace(minx, maxx, grid_res)
gy = np.linspace(miny, maxy, grid_res)
grid_x, grid_y = np.meshgrid(gx, gy)
grid_pts = np.vstack([grid_x.ravel(), grid_y.ravel()]).T

# Create mask for points inside district polygon
inside_mask = np.array([dist_poly.contains(Point(x, y)) for x, y in grid_pts])
print(f"Grid generated: {grid_res}x{grid_res} = {len(grid_pts)} cells. Cells inside Madurai: {inside_mask.sum()}")

def compute_idw(known_xy, known_vals, target_xy, power=2.0):
    """Fast vectorized IDW interpolation"""
    dists = cdist(target_xy, known_xy)
    # Check for zero distance
    zero_mask = dists == 0
    with np.errstate(divide='ignore'):
        weights = 1.0 / (dists ** power)
    
    # Where zero distance, set weight to 0 and handle directly
    weights[zero_mask] = 0.0
    sum_weights = np.sum(weights, axis=1)
    
    # Handle normal points
    val_interp = np.sum(weights * known_vals, axis=1) / np.where(sum_weights == 0, 1.0, sum_weights)
    
    # Replace zero distance points with exact known value
    zero_rows, zero_cols = np.where(zero_mask)
    if len(zero_rows) > 0:
        val_interp[zero_rows] = known_vals[zero_cols]
        
    return val_interp

# Target points inside district
target_valid_xy = grid_pts[inside_mask]

# 1. PARAMETER INTERPOLATION (Overall average / latest representative)
params_to_interpolate = ['TDS', 'EC_GEN', 'pH_GEN', 'F', 'NO2+NO3', 'HAR_Total', 'GWQI', 'SAR']
surfaces_dict = {
    'meta': {
        'grid_res': grid_res,
        'bounds': [float(minx), float(miny), float(maxx), float(maxy)],
        'gx': [float(x) for x in gx],
        'gy': [float(y) for y in gy]
    },
    'parameters': {}
}

# Aggregate by well for general surface
well_avg = df.groupby(['Well No', 'Longitude_DD', 'Latitude_DD'])[params_to_interpolate].mean().reset_index()
known_coords = well_avg[['Longitude_DD', 'Latitude_DD']].values

for p in params_to_interpolate:
    vals = well_avg[p].values
    interp_valid = compute_idw(known_coords, vals, target_valid_xy)
    
    # Reconstruct 2D array
    full_grid = np.full(len(grid_pts), None, dtype=object)
    full_grid[inside_mask] = np.round(interp_valid, 2)
    grid_2d = full_grid.reshape((grid_res, grid_res))
    
    surfaces_dict['parameters'][p] = {
        'min': float(np.min(interp_valid)),
        'max': float(np.max(interp_valid)),
        'mean': float(np.mean(interp_valid)),
        'grid': [[float(v) if v is not None else None for v in row] for row in grid_2d]
    }
    print(f"Interpolated {p}: range [{surfaces_dict['parameters'][p]['min']:.2f}, {surfaces_dict['parameters'][p]['max']:.2f}]")

# 2. TEMPORAL CHANGE DETECTION (2007-2011 Baseline vs 2017-2021 Contemporary)
print("\nComputing Temporal Change Detection Surfaces...")
baseline_df = df[(df['Year'] >= 2007) & (df['Year'] <= 2011)].groupby(['Well No', 'Longitude_DD', 'Latitude_DD'])[['TDS', 'GWQI', 'NO2+NO3', 'F']].mean().reset_index()
recent_df = df[(df['Year'] >= 2017) & (df['Year'] <= 2021)].groupby(['Well No', 'Longitude_DD', 'Latitude_DD'])[['TDS', 'GWQI', 'NO2+NO3', 'F']].mean().reset_index()

temporal_dict = {}
for p in ['TDS', 'GWQI', 'NO2+NO3', 'F']:
    base_interp = compute_idw(baseline_df[['Longitude_DD', 'Latitude_DD']].values, baseline_df[p].values, target_valid_xy)
    rec_interp = compute_idw(recent_df[['Longitude_DD', 'Latitude_DD']].values, recent_df[p].values, target_valid_xy)
    
    delta = rec_interp - base_interp
    pct_change = (delta / np.where(base_interp == 0, 1.0, base_interp)) * 100.0
    
    # Classify into Degraded, Stable, Improved
    std_d = np.std(delta)
    cat = np.where(delta > 0.5 * std_d, 'Degraded', np.where(delta < -0.5 * std_d, 'Improved', 'Stable'))
    
    grid_delta = np.full(len(grid_pts), None, dtype=object)
    grid_delta[inside_mask] = np.round(delta, 2)
    
    grid_cat = np.full(len(grid_pts), None, dtype=object)
    grid_cat[inside_mask] = cat
    
    temporal_dict[p] = {
        'mean_baseline': float(np.mean(base_interp)),
        'mean_recent': float(np.mean(rec_interp)),
        'mean_delta': float(np.mean(delta)),
        'degraded_pct': round(float((cat == 'Degraded').sum() / len(cat) * 100), 1),
        'stable_pct': round(float((cat == 'Stable').sum() / len(cat) * 100), 1),
        'improved_pct': round(float((cat == 'Improved').sum() / len(cat) * 100), 1),
        'delta_grid': [[float(v) if v is not None else None for v in row] for row in grid_delta.reshape((grid_res, grid_res))],
        'cat_grid': [[str(v) if v is not None else None for v in row] for row in grid_cat.reshape((grid_res, grid_res))]
    }
    print(f"Temporal Change {p}: Degraded {temporal_dict[p]['degraded_pct']}%, Stable {temporal_dict[p]['stable_pct']}%, Improved {temporal_dict[p]['improved_pct']}%")

# 3. SEASONAL COMPARISON (Post-Monsoon Jan vs Pre-Monsoon Jul)
seasonal_dict = {}
for p in ['TDS', 'GWQI', 'F', 'NO2+NO3']:
    post_df = df[df['Season'] == 'Post-Monsoon'].groupby(['Well No', 'Longitude_DD', 'Latitude_DD'])[p].mean().reset_index()
    pre_df = df[df['Season'] == 'Pre-Monsoon'].groupby(['Well No', 'Longitude_DD', 'Latitude_DD'])[p].mean().reset_index()
    
    post_interp = compute_idw(post_df[['Longitude_DD', 'Latitude_DD']].values, post_df[p].values, target_valid_xy)
    pre_interp = compute_idw(pre_df[['Longitude_DD', 'Latitude_DD']].values, pre_df[p].values, target_valid_xy)
    
    seasonal_dict[p] = {
        'post_monsoon_mean': round(float(np.mean(post_interp)), 2),
        'pre_monsoon_mean': round(float(np.mean(pre_interp)), 2),
        'seasonal_diff': round(float(np.mean(pre_interp - post_interp)), 2)
    }

# Save interpolation surfaces payload
surfaces_payload = {
    'surfaces': surfaces_dict,
    'temporal_change': temporal_dict,
    'seasonal_trends': seasonal_dict
}

surfaces_json = os.path.join(PROCESSED_DIR, "interpolation_surfaces.json")
with open(surfaces_json, 'w') as f:
    json.dump(surfaces_payload, f)
print(f"\nSaved Interpolation Surfaces Payload: {surfaces_json}")

print("\n=== STEP 3 FINISHED SUCCESSFULLY ===")
