import os
import json
import pandas as pd
import geopandas as gpd

BASE_DIR = r"D:\web dashboard GIS"
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
DASHBOARD_DATA = os.path.join(BASE_DIR, "dashboard", "data")
os.makedirs(DASHBOARD_DATA, exist_ok=True)

print("=== STEP 5: PACKAGING DATA FOR WEB-GIS DASHBOARD ===")

# 1. District boundary
dist_geojson = os.path.join(PROCESSED_DIR, "madurai_district_boundary.geojson")
with open(dist_geojson, 'r') as f:
    dist_data = json.load(f)
with open(os.path.join(DASHBOARD_DATA, "madurai_district.json"), 'w') as f:
    json.dump(dist_data, f)
print("Copied madurai_district.json")

# 2. Taluk boundaries with enriched attributes
taluks_geojson = os.path.join(PROCESSED_DIR, "madurai_taluks.geojson")
with open(taluks_geojson, 'r') as f:
    taluks_data = json.load(f)
with open(os.path.join(DASHBOARD_DATA, "madurai_taluks.json"), 'w') as f:
    json.dump(taluks_data, f)
print("Copied madurai_taluks.json")

# 3. Unique wells with average chemistry & hotspots
wells_geojson = os.path.join(PROCESSED_DIR, "madurai_wells_enriched.geojson")
with open(wells_geojson, 'r') as f:
    wells_data = json.load(f)
with open(os.path.join(DASHBOARD_DATA, "madurai_wells.json"), 'w') as f:
    json.dump(wells_data, f)
print("Copied madurai_wells.json")

# 4. Interpolation surfaces & temporal change
surfaces_json = os.path.join(PROCESSED_DIR, "interpolation_surfaces.json")
with open(surfaces_json, 'r') as f:
    surfaces_data = json.load(f)
with open(os.path.join(DASHBOARD_DATA, "interpolation_surfaces.json"), 'w') as f:
    json.dump(surfaces_data, f)
print("Copied interpolation_surfaces.json")

# 5. Hotspots, Taluk stats, and LULC correlation
hotspots_json = os.path.join(PROCESSED_DIR, "hotspots_and_autocorrelation.json")
with open(hotspots_json, 'r') as f:
    hotspots_data = json.load(f)

# 6. Full Longitudinal Time-Series Payload (2007 to 2021)
df = pd.read_csv(os.path.join(PROCESSED_DIR, "madurai_groundwater_enriched.csv"))

time_series_by_year = {}
for y in sorted(df['Year'].unique()):
    sub_y = df[df['Year'] == y]
    time_series_by_year[int(y)] = {
        'count': len(sub_y),
        'mean_TDS': round(float(sub_y['TDS'].mean()), 1),
        'mean_GWQI': round(float(sub_y['GWQI'].mean()), 1),
        'mean_F': round(float(sub_y['F'].mean()), 2),
        'mean_NO3': round(float(sub_y['NO2+NO3'].mean()), 1),
        'mean_EC': round(float(sub_y['EC_GEN'].mean()), 1),
        'mean_HAR': round(float(sub_y['HAR_Total'].mean()), 1),
        'pct_safe': round(float((sub_y['Drinking_Status'] == 'Safe Drinking Water').sum() / len(sub_y) * 100), 1),
        'pct_unsafe': round(float((sub_y['Drinking_Status'] == 'Unsafe for Drinking').sum() / len(sub_y) * 100), 1),
        'wells': sub_y[['Well No', 'Village', 'Taluk', 'Latitude_DD', 'Longitude_DD', 'Month', 'Season', 'TDS', 'EC_GEN', 'pH_GEN', 'F', 'NO2+NO3', 'HAR_Total', 'SAR', 'RSC', 'Na%', 'GWQI', 'GWQI_Class', 'Drinking_Status', 'Irrigation_Suitability']].to_dict('records')
    }

# Well historical timelines (Well No -> array of measurements over time)
well_histories = {}
for w, group in df.groupby('Well No'):
    sorted_group = group.sort_values('Date of collection')
    well_histories[str(w)] = {
        'village': sorted_group['Village'].iloc[0],
        'taluk': sorted_group['Taluk'].iloc[0],
        'lat': float(sorted_group['Latitude_DD'].iloc[0]),
        'lon': float(sorted_group['Longitude_DD'].iloc[0]),
        'dates': sorted_group['Date of collection'].tolist(),
        'years': sorted_group['Year'].tolist(),
        'seasons': sorted_group['Season'].tolist(),
        'TDS': sorted_group['TDS'].tolist(),
        'GWQI': sorted_group['GWQI'].tolist(),
        'F': sorted_group['F'].tolist(),
        'NO3': sorted_group['NO2+NO3'].tolist(),
        'EC': sorted_group['EC_GEN'].tolist(),
        'HAR': sorted_group['HAR_Total'].tolist(),
        'SAR': sorted_group['SAR'].tolist()
    }

time_series_payload = {
    'by_year': time_series_by_year,
    'well_histories': well_histories,
    'available_years': sorted([int(y) for y in df['Year'].unique()])
}

with open(os.path.join(DASHBOARD_DATA, "time_series.json"), 'w') as f:
    json.dump(time_series_payload, f)
print("Saved time_series.json")

# Master Analytics Summary
analytics_summary = {
    'overview': {
        'district': 'Madurai',
        'state': 'Tamil Nadu',
        'years_span': '2007–2021 (15 Years)',
        'total_records': len(df),
        'unique_wells': int(df['Well No'].nunique()),
        'total_taluks': int(df['Taluk'].nunique()),
        'mean_TDS': round(float(df['TDS'].mean()), 1),
        'mean_GWQI': round(float(df['GWQI'].mean()), 1),
        'mean_F': round(float(df['F'].mean()), 2),
        'mean_NO3': round(float(df['NO2+NO3'].mean()), 1),
        'overall_drinking_compliance': {
            'Safe Drinking Water': int((df['Drinking_Status'] == 'Safe Drinking Water').sum()),
            'Permissible / Marginal': int((df['Drinking_Status'] == 'Permissible / Marginal').sum()),
            'Unsafe for Drinking': int((df['Drinking_Status'] == 'Unsafe for Drinking').sum())
        },
        'gwqi_distribution': df['GWQI_Class'].value_counts().to_dict(),
        'irrigation_distribution': df['Irrigation_Suitability'].value_counts().to_dict(),
        'fluoride_distribution': df['Fluoride_Risk'].value_counts().to_dict(),
        'nitrate_distribution': df['Nitrate_Risk'].value_counts().to_dict()
    },
    'taluk_stats': hotspots_data['taluk_stats'],
    'morans_i': hotspots_data['global_morans_i'],
    'lulc_correlation': hotspots_data['lulc_correlation']
}

with open(os.path.join(DASHBOARD_DATA, "analytics_summary.json"), 'w') as f:
    json.dump(analytics_summary, f, indent=2)
print("Saved analytics_summary.json")

print("\n=== STEP 5 FINISHED SUCCESSFULLY ===")
