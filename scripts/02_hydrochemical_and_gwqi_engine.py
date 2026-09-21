import os
import json
import pandas as pd
import numpy as np
import geopandas as gpd
from shapely.geometry import Point

BASE_DIR = r"D:\web dashboard GIS"
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
MASTER_CSV = os.path.join(PROCESSED_DIR, "madurai_groundwater_master.csv")

print("=== STEP 2: HYDROCHEMICAL & GWQI CALCULATION ENGINE ===")
df = pd.read_csv(MASTER_CSV)
print(f"Loaded {len(df)} records.")

# -------------------------------------------------------------
# 1. GROUNDWATER QUALITY INDEX (GWQI) - BIS 10500:2012 STANDARDS
# -------------------------------------------------------------
# Parameters, Standards (Si), and Assigned Weights (wi)
bis_standards = {
    'TDS':       {'Si': 500.0, 'wi': 5, 'V0': 0.0},
    'NO2+NO3':   {'Si': 45.0,  'wi': 5, 'V0': 0.0},
    'F':         {'Si': 1.0,   'wi': 5, 'V0': 0.0},
    'pH_GEN':    {'Si': 7.5,   'wi': 4, 'V0': 7.0},
    'EC_GEN':    {'Si': 750.0, 'wi': 4, 'V0': 0.0},
    'SO4':       {'Si': 200.0, 'wi': 4, 'V0': 0.0},
    'Cl':        {'Si': 250.0, 'wi': 3, 'V0': 0.0},
    'HCO3':      {'Si': 244.0, 'wi': 3, 'V0': 0.0},
    'HAR_Total': {'Si': 200.0, 'wi': 3, 'V0': 0.0},
    'Na':        {'Si': 200.0, 'wi': 3, 'V0': 0.0},
    'Ca':        {'Si': 75.0,  'wi': 2, 'V0': 0.0},
    'Mg':        {'Si': 30.0,  'wi': 2, 'V0': 0.0},
    'K':         {'Si': 12.0,  'wi': 2, 'V0': 0.0}
}

total_w = sum(p['wi'] for p in bis_standards.values())
for param, p in bis_standards.items():
    p['Wi'] = p['wi'] / total_w

# Calculate sub-indices qi and composite GWQI
gwqi_values = np.zeros(len(df))

for param, p in bis_standards.items():
    conc = df[param].values
    if param == 'pH_GEN':
        qi = (np.abs(conc - p['V0']) / (p['Si'] - p['V0'])) * 100.0
    else:
        qi = (conc / p['Si']) * 100.0
    gwqi_values += p['Wi'] * qi

df['GWQI'] = np.round(gwqi_values, 2)

# Classify GWQI
def classify_gwqi(val):
    if val < 50:
        return 'Excellent'
    elif val < 100:
        return 'Good'
    elif val < 200:
        return 'Poor'
    elif val < 300:
        return 'Very Poor'
    else:
        return 'Unsuitable'

df['GWQI_Class'] = df['GWQI'].apply(classify_gwqi)
print("\nGWQI Classification Distribution:")
print(df['GWQI_Class'].value_counts())

# -------------------------------------------------------------
# 2. IRRIGATION SUITABILITY INDICES (SAR, RSC, Na%, USSL, WILCOX)
# -------------------------------------------------------------
# Convert mg/L to meq/L for precise chemical balance verification
# Ca: 20.04, Mg: 12.15, Na: 23.00, K: 39.10, Cl: 35.45, SO4: 48.03, CO3: 30.00, HCO3: 61.02
ca_meq = df['Ca'] / 20.04
mg_meq = df['Mg'] / 12.15
na_meq = df['Na'] / 23.00
k_meq = df['K'] / 39.10
co3_meq = df['CO3'] / 30.00
hco3_meq = df['HCO3'] / 61.02

# Check/Recompute SAR if needed
denom = np.sqrt((ca_meq + mg_meq) / 2.0)
denom = np.where(denom <= 0, 1e-6, denom)
sar_computed = na_meq / denom
df['SAR_Calc'] = np.round(sar_computed, 2)

# Check/Recompute RSC: (CO3 + HCO3) - (Ca + Mg)
rsc_computed = (co3_meq + hco3_meq) - (ca_meq + mg_meq)
df['RSC_Calc'] = np.round(rsc_computed, 2)

# Check/Recompute Na%: ((Na + K) / (Ca + Mg + Na + K)) * 100
cations_sum = ca_meq + mg_meq + na_meq + k_meq
cations_sum = np.where(cations_sum <= 0, 1e-6, cations_sum)
na_pct_computed = ((na_meq + k_meq) / cations_sum) * 100.0
df['Na%_Calc'] = np.round(na_pct_computed, 2)

# SAR Hazard Class (S1 to S4)
def classify_sar(sar):
    if sar < 10:
        return 'S1 (Low)'
    elif sar < 18:
        return 'S2 (Medium)'
    elif sar < 26:
        return 'S3 (High)'
    else:
        return 'S4 (Very High)'

# EC Salinity Hazard Class (C1 to C4)
def classify_ec(ec):
    if ec < 250:
        return 'C1 (Low)'
    elif ec < 750:
        return 'C2 (Medium)'
    elif ec < 2250:
        return 'C3 (High)'
    else:
        return 'C4 (Very High)'

df['SAR_Hazard'] = df['SAR'].apply(classify_sar)
df['EC_Hazard'] = df['EC_GEN'].apply(classify_ec)
df['USSL_Class'] = df['EC_Hazard'].apply(lambda x: x.split()[0]) + '-' + df['SAR_Hazard'].apply(lambda x: x.split()[0])

# RSC Hazard Class
def classify_rsc(rsc):
    if rsc < 1.25:
        return 'Safe (<1.25)'
    elif rsc <= 2.5:
        return 'Marginal (1.25-2.5)'
    else:
        return 'Unsuitable (>2.5)'

df['RSC_Class'] = df['RSC'].apply(classify_rsc)

# Wilcox Diagram Suitability (EC vs Na%)
def classify_wilcox(row):
    ec = row['EC_GEN']
    na = row['Na%']
    if ec < 250 and na < 20:
        return 'Excellent to Good'
    elif ec < 750 and na < 40:
        return 'Good to Permissible'
    elif ec < 2000 and na < 60:
        return 'Permissible to Doubtful'
    elif ec < 3000 and na < 80:
        return 'Doubtful to Unsuitable'
    else:
        return 'Unsuitable'

df['Wilcox_Class'] = df.apply(classify_wilcox, axis=1)

# Combined Irrigation Suitability Rating
def combined_irrigation(row):
    if row['RSC'] > 2.5 or row['SAR'] > 26 or row['EC_GEN'] > 3000 or row['Na%'] > 80:
        return 'Unsuitable'
    elif row['RSC'] > 1.25 or row['SAR'] > 18 or row['EC_GEN'] > 2250 or row['Na%'] > 60:
        return 'Marginal / Moderate'
    elif row['SAR'] > 10 or row['EC_GEN'] > 750 or row['Na%'] > 40:
        return 'Good / Permissible'
    else:
        return 'Excellent'

df['Irrigation_Suitability'] = df.apply(combined_irrigation, axis=1)
print("\nIrrigation Suitability Distribution:")
print(df['Irrigation_Suitability'].value_counts())

# -------------------------------------------------------------
# 3. FLUORIDE CONTAMINATION & HEALTH RISK TIERS (BIS 10500)
# -------------------------------------------------------------
def classify_fluoride(f):
    if f < 1.0:
        return 'Safe (<1.0 mg/L)'
    elif f <= 1.5:
        return 'Permissible (1.0-1.5 mg/L)'
    elif f <= 2.0:
        return 'Dental Fluorosis Risk (1.5-2.0 mg/L)'
    else:
        return 'Skeletal Fluorosis Risk (>2.0 mg/L)'

df['Fluoride_Risk'] = df['F'].apply(classify_fluoride)
print("\nFluoride Health Risk Tiers:")
print(df['Fluoride_Risk'].value_counts())

# -------------------------------------------------------------
# 4. NITRATE CONTAMINATION & SOURCE ATTRIBUTION
# -------------------------------------------------------------
def classify_nitrate(n):
    if n < 10.0:
        return 'Natural Background (<10 mg/L)'
    elif n <= 45.0:
        return 'Acceptable (10-45 mg/L)'
    elif n <= 100.0:
        return 'Anthropogenic High (45-100 mg/L)'
    else:
        return 'Severe Contamination (>100 mg/L)'

df['Nitrate_Risk'] = df['NO2+NO3'].apply(classify_nitrate)

# Anthropogenic source profiling indicator
def attribute_source(row):
    if row['NO2+NO3'] <= 45:
        return 'Within Drinking Norms'
    # High nitrate
    if row['Taluk'] in ['Madurai North', 'Madurai South'] or row['Cl'] > 500:
        return 'Urban Domestic / Septic Leaching'
    else:
        return 'Agricultural Fertilizer Runoff'

df['Nitrate_Source'] = df.apply(attribute_source, axis=1)
print("\nNitrate Health Risk Tiers:")
print(df['Nitrate_Risk'].value_counts())

# -------------------------------------------------------------
# 5. OVERALL DRINKING SUITABILITY BADGE
# -------------------------------------------------------------
def overall_drinking_status(row):
    if row['F'] > 1.5 or row['NO2+NO3'] > 45 or row['TDS'] > 2000 or row['HAR_Total'] > 600 or row['pH_GEN'] < 6.5 or row['pH_GEN'] > 8.5:
        return 'Unsafe for Drinking'
    elif row['F'] > 1.0 or row['TDS'] > 500 or row['HAR_Total'] > 200:
        return 'Permissible / Marginal'
    else:
        return 'Safe Drinking Water'

df['Drinking_Status'] = df.apply(overall_drinking_status, axis=1)
print("\nDrinking Water Status:")
print(df['Drinking_Status'].value_counts())

# -------------------------------------------------------------
# 6. EXPORT ENRICHED DATASETS
# -------------------------------------------------------------
enriched_csv = os.path.join(PROCESSED_DIR, "madurai_groundwater_enriched.csv")
df.to_csv(enriched_csv, index=False)
print(f"\nSaved Enriched Master CSV: {enriched_csv}")

df_geo = df.copy()
geometry = [Point(xy) for xy in zip(df_geo['Longitude_DD'], df_geo['Latitude_DD'])]
gdf_enriched = gpd.GeoDataFrame(df_geo, geometry=geometry, crs="EPSG:4326")
enriched_geojson = os.path.join(PROCESSED_DIR, "madurai_groundwater_enriched.geojson")
gdf_enriched.to_file(enriched_geojson, driver="GeoJSON")
print(f"Saved Enriched Master GeoJSON: {enriched_geojson}")

# Unique Wells Enriched Aggregations (225 Wells)
agg_rules = {
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
    'Ca': 'mean',
    'Mg': 'mean',
    'Na': 'mean',
    'K': 'mean',
    'Cl': 'mean',
    'SO4': 'mean',
    'HCO3': 'mean',
    'SAR': 'mean',
    'RSC': 'mean',
    'Na%': 'mean',
    'GWQI': 'mean'
}
df_wells = df.groupby('Well No').agg(agg_rules).reset_index()
df_wells.rename(columns={'Date of collection': 'Total_Samples'}, inplace=True)

for col in ['TDS', 'EC_GEN', 'pH_GEN', 'F', 'NO2+NO3', 'HAR_Total', 'Ca', 'Mg', 'Na', 'K', 'Cl', 'SO4', 'HCO3', 'SAR', 'RSC', 'Na%', 'GWQI']:
    df_wells[col] = df_wells[col].round(2)

df_wells['GWQI_Class'] = df_wells['GWQI'].apply(classify_gwqi)
df_wells['Irrigation_Suitability'] = df_wells.apply(combined_irrigation, axis=1)
df_wells['Fluoride_Risk'] = df_wells['F'].apply(classify_fluoride)
df_wells['Nitrate_Risk'] = df_wells['NO2+NO3'].apply(classify_nitrate)
df_wells['Drinking_Status'] = df_wells.apply(overall_drinking_status, axis=1)

geom_wells = [Point(xy) for xy in zip(df_wells['Longitude_DD'], df_wells['Latitude_DD'])]
gdf_wells_enriched = gpd.GeoDataFrame(df_wells, geometry=geom_wells, crs="EPSG:4326")
wells_enriched_geojson = os.path.join(PROCESSED_DIR, "madurai_wells_enriched.geojson")
gdf_wells_enriched.to_file(wells_enriched_geojson, driver="GeoJSON")
print(f"Saved Enriched Unique Wells GeoJSON: {wells_enriched_geojson} ({len(gdf_wells_enriched)} wells)")

print("\n=== STEP 2 FINISHED SUCCESSFULLY ===")
