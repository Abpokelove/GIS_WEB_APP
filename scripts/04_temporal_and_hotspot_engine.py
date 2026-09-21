import os
import json
import numpy as np
import pandas as pd
import geopandas as gpd
from scipy.spatial.distance import cdist
from scipy import stats

BASE_DIR = r"D:\web dashboard GIS"
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
ENRICHED_CSV = os.path.join(PROCESSED_DIR, "madurai_groundwater_enriched.csv")
WELLS_GEOJSON = os.path.join(PROCESSED_DIR, "madurai_wells_enriched.geojson")
TALUKS_GEOJSON = os.path.join(PROCESSED_DIR, "madurai_taluks.geojson")

print("=== STEP 4: HOTSPOTS, SPATIAL AUTOCORRELATION & TALUK STATS ENGINE ===")
df = pd.read_csv(ENRICHED_CSV)
gdf_wells = gpd.read_file(WELLS_GEOJSON)
gdf_taluks = gpd.read_file(TALUKS_GEOJSON)

# -------------------------------------------------------------
# 1. SPATIAL AUTOCORRELATION (MORAN'S I) & GETIS-ORD Gi*
# -------------------------------------------------------------
coords = gdf_wells[['Longitude_DD', 'Latitude_DD']].values
N = len(coords)
dists = cdist(coords, coords)

# Build spatial weights matrix W (inverse distance with threshold bandwidth)
bandwidth = 0.20  # ~22 km
W = np.where((dists > 0) & (dists <= bandwidth), 1.0 / dists, 0.0)
row_sums = W.sum(axis=1)
# Row-standardize W
W_std = np.zeros_like(W)
for i in range(N):
    if row_sums[i] > 0:
        W_std[i] = W[i] / row_sums[i]

def compute_morans_i(values):
    """Compute Global Moran's I and z-score"""
    z = values - np.mean(values)
    s2 = np.sum(z ** 2) / N
    if s2 == 0:
        return 0.0, 0.0, 1.0
    
    numerator = np.sum(W_std * np.outer(z, z))
    I = numerator / np.sum(z ** 2)
    
    # Expected value and theoretical variance under randomization
    EI = -1.0 / (N - 1)
    S1 = 0.5 * np.sum((W_std + W_std.T) ** 2)
    S2 = np.sum((W_std.sum(axis=1) + W_std.sum(axis=0)) ** 2)
    b2 = (np.sum(z ** 4) / N) / (s2 ** 2)
    
    A = N * ((N**2 - 3*N + 3)*S1 - N*S2 + 3*(W_std.sum()**2))
    B = b2 * ((N**2 - N)*S1 - 2*N*S2 + 6*(W_std.sum()**2))
    C = (N - 1) * (N - 2) * (N - 3) * (W_std.sum()**2)
    var_I = (A - B) / C - (EI ** 2) if C > 0 else 0.001
    
    se_I = np.sqrt(max(1e-6, var_I))
    z_score = (I - EI) / se_I
    p_value = 2.0 * (1.0 - stats.norm.cdf(abs(z_score)))
    
    return round(float(I), 4), round(float(z_score), 2), float(p_value)

moran_results = {}
for param in ['TDS', 'F', 'NO2+NO3', 'GWQI', 'EC_GEN']:
    I, z_sc, p_val = compute_morans_i(gdf_wells[param].values)
    interpretation = "Statistically Significant Clustering (Hotspots present)" if p_val < 0.05 and I > 0 else "Random Distribution"
    moran_results[param] = {
        'morans_i': I,
        'z_score': z_sc,
        'p_value': round(p_val, 6),
        'interpretation': interpretation
    }
    print(f"Global Moran's I ({param}): I={I}, z={z_sc}, p={p_val:.5f} -> {interpretation}")

# Compute Getis-Ord Gi* for each well
def compute_getis_ord(values):
    """Compute local Getis-Ord Gi* z-scores"""
    x_bar = np.mean(values)
    s = np.std(values)
    gi_z = np.zeros(N)
    for i in range(N):
        w_i = W[i]
        sum_w = np.sum(w_i)
        sum_w_sq = np.sum(w_i ** 2)
        sum_wx = np.sum(w_i * values)
        
        numerator = sum_wx - (x_bar * sum_w)
        denom = s * np.sqrt((N * sum_w_sq - (sum_w ** 2)) / (N - 1)) if s > 0 and (N * sum_w_sq - (sum_w ** 2)) > 0 else 1.0
        gi_z[i] = numerator / denom
    return gi_z

# Compute Gi* for Fluoride, Nitrate, GWQI, TDS
gdf_wells['Gi_Z_F'] = np.round(compute_getis_ord(gdf_wells['F'].values), 2)
gdf_wells['Gi_Z_NO3'] = np.round(compute_getis_ord(gdf_wells['NO2+NO3'].values), 2)
gdf_wells['Gi_Z_GWQI'] = np.round(compute_getis_ord(gdf_wells['GWQI'].values), 2)
gdf_wells['Gi_Z_TDS'] = np.round(compute_getis_ord(gdf_wells['TDS'].values), 2)

def classify_gi(z):
    if z >= 2.58:
        return 'Hotspot (99% Confidence)'
    elif z >= 1.96:
        return 'Hotspot (95% Confidence)'
    elif z >= 1.65:
        return 'Hotspot (90% Confidence)'
    elif z <= -2.58:
        return 'Coldspot (99% Confidence)'
    elif z <= -1.96:
        return 'Coldspot (95% Confidence)'
    elif z <= -1.65:
        return 'Coldspot (90% Confidence)'
    else:
        return 'Not Significant'

gdf_wells['Hotspot_F'] = gdf_wells['Gi_Z_F'].apply(classify_gi)
gdf_wells['Hotspot_NO3'] = gdf_wells['Gi_Z_NO3'].apply(classify_gi)
gdf_wells['Hotspot_GWQI'] = gdf_wells['Gi_Z_GWQI'].apply(classify_gi)

# Save updated wells GeoJSON with hotspot attributes
gdf_wells.to_file(WELLS_GEOJSON, driver="GeoJSON")
print(f"Updated Wells GeoJSON with Hotspots and Gi* statistics: {WELLS_GEOJSON}")

# -------------------------------------------------------------
# 2. TALUK-WISE COMPARATIVE STATISTICAL & CHOROPLETH ENGINE
# -------------------------------------------------------------
print("\nComputing Taluk-level comparative statistics...")
taluk_stats = {}
taluk_names = sorted(df['Taluk'].unique())

for t in taluk_names:
    sub = df[df['Taluk'] == t]
    total = len(sub)
    
    # Exceedance counts
    tds_exceed = int((sub['TDS'] > 2000).sum())
    f_exceed = int((sub['F'] > 1.5).sum())
    no3_exceed = int((sub['NO2+NO3'] > 45).sum())
    gwqi_poor = int((sub['GWQI'] >= 100).sum())
    unsuitable_irr = int((sub['Irrigation_Suitability'] == 'Unsuitable').sum())
    
    taluk_stats[t] = {
        'total_samples': total,
        'unique_wells': int(sub['Well No'].nunique()),
        'mean_TDS': round(float(sub['TDS'].mean()), 2),
        'median_TDS': round(float(sub['TDS'].median()), 2),
        'mean_EC': round(float(sub['EC_GEN'].mean()), 2),
        'mean_pH': round(float(sub['pH_GEN'].mean()), 2),
        'mean_F': round(float(sub['F'].mean()), 2),
        'max_F': round(float(sub['F'].max()), 2),
        'mean_NO3': round(float(sub['NO2+NO3'].mean()), 2),
        'max_NO3': round(float(sub['NO2+NO3'].max()), 2),
        'mean_HAR': round(float(sub['HAR_Total'].mean()), 2),
        'mean_GWQI': round(float(sub['GWQI'].mean()), 2),
        'median_GWQI': round(float(sub['GWQI'].median()), 2),
        'mean_SAR': round(float(sub['SAR'].mean()), 2),
        'pct_TDS_exceed': round(float(tds_exceed / total * 100), 1),
        'pct_F_exceed': round(float(f_exceed / total * 100), 1),
        'pct_NO3_exceed': round(float(no3_exceed / total * 100), 1),
        'pct_GWQI_poor': round(float(gwqi_poor / total * 100), 1),
        'pct_irr_unsuitable': round(float(unsuitable_irr / total * 100), 1)
    }

# Composite Vulnerability Ranking (1 = Best, 7 = Worst)
# Rank by mean_GWQI + pct_F_exceed + pct_NO3_exceed
rank_scores = {}
for t, st in taluk_stats.items():
    score = st['mean_GWQI'] + (st['pct_F_exceed'] * 3.0) + (st['pct_NO3_exceed'] * 2.0)
    rank_scores[t] = score

ranked_taluks = sorted(rank_scores.items(), key=lambda x: x[1], reverse=True)
for rank, (t, score) in enumerate(ranked_taluks, 1):
    taluk_stats[t]['Vulnerability_Rank'] = rank
    print(f"Rank {rank}: Taluk {t} (Vulnerability Score: {score:.1f}, Mean GWQI: {taluk_stats[t]['mean_GWQI']})")

# Save taluk_statistics.json
taluk_stats_file = os.path.join(PROCESSED_DIR, "taluk_statistics.json")
with open(taluk_stats_file, 'w') as f:
    json.dump(taluk_stats, f, indent=2)
print(f"Saved Taluk Statistics JSON: {taluk_stats_file}")

# Enrich madurai_taluks.geojson with attributes for choropleth mapping
for idx, row in gdf_taluks.iterrows():
    t = row['Taluk']
    if t in taluk_stats:
        for k, v in taluk_stats[t].items():
            gdf_taluks.at[idx, k] = v

gdf_taluks.to_file(TALUKS_GEOJSON, driver="GeoJSON")
print(f"Enriched Taluk Boundaries GeoJSON: {TALUKS_GEOJSON}")

# -------------------------------------------------------------
# 3. TOPIC 8: LULC CORRELATION SUMMARY
# -------------------------------------------------------------
# Synthetic classification based on Taluk rural/urban profiles and well chemical signatures:
# 1: Built-up / Urban (High Madurai North/South centers)
# 2: Intensive Agriculture (Paddy/Canal irrigated along Vaigai, Melur, Thirumangalam)
# 3: Dry Agriculture / Rainfed (Peraiyur, Usilampatti)
# 4: Scrub / Barren Land (Vadipatti foothills)
def assign_lulc(row):
    if row['Taluk'] in ['Madurai North', 'Madurai South'] and row['TDS'] > 1200:
        return 'Urban / Built-up'
    elif row['Taluk'] in ['Melur', 'Thirumangalam']:
        return 'Intensive Agriculture (Irrigated)'
    elif row['Taluk'] in ['Peraiyur', 'Usilampatti']:
        return 'Rainfed Cropland / Fallow'
    else:
        return 'Scrub / Semi-Arid Land'

df['LULC_Class'] = df.apply(assign_lulc, axis=1)

lulc_summary = {}
for lulc, group in df.groupby('LULC_Class'):
    lulc_summary[lulc] = {
        'count': len(group),
        'mean_TDS': round(float(group['TDS'].mean()), 1),
        'mean_NO3': round(float(group['NO2+NO3'].mean()), 1),
        'mean_F': round(float(group['F'].mean()), 2),
        'mean_GWQI': round(float(group['GWQI'].mean()), 1),
        'pct_poor_gwqi': round(float((group['GWQI'] >= 100).sum() / len(group) * 100), 1)
    }

print("\nLULC vs Groundwater Summary:")
print(pd.DataFrame(lulc_summary).T)

# Save hotspots and autocorrelation package
payload = {
    'global_morans_i': moran_results,
    'taluk_stats': taluk_stats,
    'lulc_correlation': lulc_summary
}

output_payload = os.path.join(PROCESSED_DIR, "hotspots_and_autocorrelation.json")
with open(output_payload, 'w') as f:
    json.dump(payload, f, indent=2)
print(f"\nSaved Autocorrelation & Hotspots Payload: {output_payload}")

print("\n=== STEP 4 FINISHED SUCCESSFULLY ===")
