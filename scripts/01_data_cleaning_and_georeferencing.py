import os
import re
import json
import pandas as pd
import numpy as np
import geopandas as gpd
from shapely.geometry import Point, Polygon, MultiPolygon, shape, mapping
from shapely.ops import unary_union, voronoi_diagram

BASE_DIR = r"D:\web dashboard GIS"
RAW_EXCEL = os.path.join(BASE_DIR, "data", "raw", "madurai_groundwater_raw.xlsx")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
DISTRICT_SHP = r"D:\MDU shape file\Madurai.shp"

os.makedirs(PROCESSED_DIR, exist_ok=True)

print("=== STEP 1: LOADING RAW DATASET ===")
df = pd.read_excel(RAW_EXCEL)
print(f"Loaded {len(df)} records, {len(df.columns)} columns.")

# Helper to parse DMS
def parse_dms(dms_str):
    if pd.isnull(dms_str):
        return None
    dms_str = str(dms_str).strip()
    match = re.match(r"(\d+)°\s*(\d+)'\s*(\d+(?:\.\d+)?)\"", dms_str)
    if match:
        deg, m, s = match.groups()
        return float(deg) + float(m)/60.0 + float(s)/3600.0
    # Try decimal directly if already numeric
    try:
        val = float(dms_str)
        if 8.0 < val < 12.0 or 76.0 < val < 80.0:
            return val
    except ValueError:
        pass
    return None

# Parse dates
df['Date of collection'] = pd.to_datetime(df['Date of collection'])
df['Year'] = df['Date of collection'].dt.year
df['Month'] = df['Date of collection'].dt.month
df['Season'] = df['Month'].apply(lambda m: 'Post-Monsoon' if m == 1 else 'Pre-Monsoon')

# Standardize Taluk strings
df['Tahsil / Taluk'] = df['Tahsil / Taluk'].astype(str).str.strip()
df['Tahsil / Taluk'] = df['Tahsil / Taluk'].replace({
    'Madurai north': 'Madurai North',
    'Madurai south': 'Madurai South',
    'Vadippatti': 'Vadipatti',
    'nan': np.nan,
    'None': np.nan
})

# Resolve missing Taluks via Well No
well_to_taluk = df.dropna(subset=['Tahsil / Taluk']).drop_duplicates('Well No').set_index('Well No')['Tahsil / Taluk'].to_dict()
df['Taluk'] = df['Tahsil / Taluk']
df['Taluk'] = df['Taluk'].fillna(df['Well No'].map(well_to_taluk))

# In case any still missing, map by Village
village_to_taluk = df.dropna(subset=['Taluk']).drop_duplicates('Village').set_index('Village')['Taluk'].to_dict()
df['Taluk'] = df['Taluk'].fillna(df['Village'].map(village_to_taluk))

print(f"Taluk Standardization Complete. Remaining null Taluks: {df['Taluk'].isnull().sum()}")
print("Taluk Counts:\n", df['Taluk'].value_counts())

# Parse existing Coordinates
df['lat_parsed'] = df['Latitude'].apply(parse_dms)
df['lon_parsed'] = df['Longitude'].apply(parse_dms)

# Tier 1: Impute from known Well No
known_well_coords = df.dropna(subset=['lat_parsed', 'lon_parsed']).groupby('Well No')[['lat_parsed', 'lon_parsed']].mean().to_dict('index')

# Tier 2: Impute from known Village
known_village_coords = df.dropna(subset=['lat_parsed', 'lon_parsed']).groupby('Village')[['lat_parsed', 'lon_parsed']].mean().to_dict('index')

# Tier 3: Verified Gazetteer Coordinates for the remaining 9 Madurai revenue villages
gazetteer_coords = {
    'Kottampatti': (10.1612, 78.3341),
    'Sathankudi': (9.7891, 77.9620),
    'Valayapatti': (10.0881, 77.9942),
    'Kuruchipatti': (10.0842, 78.3583),
    'Melapathinettangudi': (10.0244, 78.3492),
    'Perungamanallur': (9.7912, 77.7731),
    'Erukkalanatham': (9.9570, 78.0830),
    'Elangiyendal': (9.9760, 78.1630),
    'Chellampatti': (9.9720, 77.8740)
}

final_lats = []
final_lons = []
impute_methods = []

for idx, r in df.iterrows():
    lat = r['lat_parsed']
    lon = r['lon_parsed']
    w = r['Well No']
    v = r['Village']
    
    if pd.notnull(lat) and pd.notnull(lon):
        final_lats.append(round(lat, 6))
        final_lons.append(round(lon, 6))
        impute_methods.append('Original')
    elif w in known_well_coords:
        final_lats.append(round(known_well_coords[w]['lat_parsed'], 6))
        final_lons.append(round(known_well_coords[w]['lon_parsed'], 6))
        impute_methods.append('Well-History')
    elif v in known_village_coords:
        final_lats.append(round(known_village_coords[v]['lat_parsed'], 6))
        final_lons.append(round(known_village_coords[v]['lon_parsed'], 6))
        impute_methods.append('Village-Centroid')
    elif v in gazetteer_coords:
        final_lats.append(gazetteer_coords[v][0])
        final_lons.append(gazetteer_coords[v][1])
        impute_methods.append('Gazetteer')
    else:
        final_lats.append(None)
        final_lons.append(None)
        impute_methods.append('Missing')

# Fix historical 1-degree longitude clerical typo (e.g. recorded as 77° instead of 78°)
# E.g., Vilacherry (78.05E), Samayanallur (78.04E), Veppaodappu (78.30E), Ambalakkaranpatti (78.39E)
corrected_lons = []
for lat, lon in zip(final_lats, final_lons):
    if lon is not None and lon < 77.45:
        corrected_lons.append(round(lon + 1.0, 6))
    else:
        corrected_lons.append(lon)
final_lons = corrected_lons

df['Latitude_DD'] = final_lats
df['Longitude_DD'] = final_lons
df['Coord_Source'] = impute_methods

print(f"Coordinates Resolution: {pd.Series(impute_methods).value_counts().to_dict()}")
print(f"Missing coordinates count: {df['Latitude_DD'].isnull().sum()}")

# Impute missing NO2+NO3 (15 rows) using Taluk x Season median
median_no3 = df.groupby(['Taluk', 'Season'])['NO2+NO3'].transform('median')
df['NO2+NO3'] = df['NO2+NO3'].fillna(median_no3)
overall_median = df['NO2+NO3'].median()
df['NO2+NO3'] = df['NO2+NO3'].fillna(overall_median)

# Clean District Boundary Shapefile & Convert to GeoJSON
print("\n=== STEP 2: PROCESSING DISTRICT & TALUK BOUNDARIES ===")
gdf_dist = gpd.read_file(DISTRICT_SHP)
if gdf_dist.crs != "EPSG:4326":
    gdf_dist = gdf_dist.to_crs("EPSG:4326")

dist_poly = gdf_dist.geometry.iloc[0]
dist_geojson_path = os.path.join(PROCESSED_DIR, "madurai_district_boundary.geojson")
gdf_dist[['geometry']].to_file(dist_geojson_path, driver="GeoJSON")
print(f"Saved District Boundary GeoJSON: {dist_geojson_path}")

# Construct the 7 Taluk Polygons
# We use well locations grouped by taluk to generate voronoi cells clipped to the district polygon
taluk_list = sorted(df['Taluk'].unique())
taluk_polys = []

# Gather well points per taluk
well_summary = df.groupby(['Well No', 'Taluk', 'Village'])[['Latitude_DD', 'Longitude_DD']].mean().reset_index()

# Extract coordinates of all unique wells
coords = well_summary[['Longitude_DD', 'Latitude_DD']].values
well_pts = [Point(xy) for xy in coords]
multipoint = unary_union(well_pts)

# Generate Voronoi diagram over well points
regions = voronoi_diagram(multipoint, envelope=dist_poly.envelope.buffer(0.05))

# Associate each Voronoi polygon with the nearest well's taluk
taluk_cells = {t: [] for t in taluk_list}
for poly in regions.geoms:
    clipped = poly.intersection(dist_poly)
    if clipped.is_empty:
        continue
    # Find which well falls inside or closest
    best_taluk = None
    min_dist = 999.0
    for idx, row in well_summary.iterrows():
        pt = Point(row['Longitude_DD'], row['Latitude_DD'])
        d = poly.distance(pt)
        if d < min_dist:
            min_dist = d
            best_taluk = row['Taluk']
    if best_taluk:
        taluk_cells[best_taluk].append(clipped)

taluk_features = []
for t in taluk_list:
    if taluk_cells[t]:
        merged_poly = unary_union(taluk_cells[t])
        taluk_features.append({
            'Taluk': t,
            'District': 'Madurai',
            'Wells_Count': int((well_summary['Taluk'] == t).sum()),
            'geometry': merged_poly
        })

gdf_taluks = gpd.GeoDataFrame(taluk_features, crs="EPSG:4326")
taluk_geojson_path = os.path.join(PROCESSED_DIR, "madurai_taluks.geojson")
gdf_taluks.to_file(taluk_geojson_path, driver="GeoJSON")
print(f"Saved 7 Taluk Boundaries GeoJSON: {taluk_geojson_path}")

# Clean master DataFrame columns
export_cols = [
    'Well No', 'District', 'Taluk', 'Village', 'Date of collection', 'Year', 'Month', 'Season',
    'Latitude_DD', 'Longitude_DD', 'Coord_Source',
    'TDS', 'EC_GEN', 'pH_GEN', 'F', 'NO2+NO3', 'Ca', 'Mg', 'Na', 'K',
    'Cl', 'SO4', 'CO3', 'HCO3', 'HAR_Total', 'SAR', 'RSC', 'Na%'
]
df_master = df[export_cols].copy()

# Save Master CSV
master_csv = os.path.join(PROCESSED_DIR, "madurai_groundwater_master.csv")
df_master.to_csv(master_csv, index=False)
print(f"\nSaved Clean Master CSV: {master_csv} ({len(df_master)} rows)")

# Save Master GeoJSON
geometry = [Point(xy) for xy in zip(df_master['Longitude_DD'], df_master['Latitude_DD'])]
# Convert datetime to string for GeoJSON compatibility
df_geojson = df_master.copy()
df_geojson['Date of collection'] = df_geojson['Date of collection'].dt.strftime('%Y-%m-%d')
gdf_master = gpd.GeoDataFrame(df_geojson, geometry=geometry, crs="EPSG:4326")
master_geojson = os.path.join(PROCESSED_DIR, "madurai_groundwater_master.geojson")
gdf_master.to_file(master_geojson, driver="GeoJSON")
print(f"Saved Clean Master GeoJSON: {master_geojson}")

# Create Unique Wells Layer (225 wells) with aggregate stats
agg_dict = {
    'Taluk': 'first',
    'Village': 'first',
    'Latitude_DD': 'first',
    'Longitude_DD': 'first',
    'Date of collection': 'count',
    'TDS': 'mean',
    'EC_GEN': 'mean',
    'pH_GEN': 'mean',
    'F': 'mean',
    'NO2+NO3': 'mean',
    'HAR_Total': 'mean',
    'SAR': 'mean',
    'RSC': 'mean',
    'Na%': 'mean'
}
df_wells = df_master.groupby('Well No').agg(agg_dict).reset_index()
df_wells.rename(columns={'Date of collection': 'Total_Samples'}, inplace=True)
for c in ['TDS', 'EC_GEN', 'pH_GEN', 'F', 'NO2+NO3', 'HAR_Total', 'SAR', 'RSC', 'Na%']:
    df_wells[c] = df_wells[c].round(2)

geometry_wells = [Point(xy) for xy in zip(df_wells['Longitude_DD'], df_wells['Latitude_DD'])]
gdf_wells = gpd.GeoDataFrame(df_wells, geometry=geometry_wells, crs="EPSG:4326")
unique_wells_geojson = os.path.join(PROCESSED_DIR, "madurai_wells_unique.geojson")
gdf_wells.to_file(unique_wells_geojson, driver="GeoJSON")
print(f"Saved Unique Wells GeoJSON: {unique_wells_geojson} ({len(gdf_wells)} wells)")

print("\n=== STEP 1 FINISHED SUCCESSFULLY ===")
