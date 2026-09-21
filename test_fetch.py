import urllib.request
import json

urls = [
    'http://localhost:8080/index.html',
    'http://localhost:8080/js/react_app.js',
    'http://localhost:8080/js/map_layers.js',
    'http://localhost:8080/js/charts.js',
    'http://localhost:8080/js/water_ripple.js',
    'http://localhost:8080/data/madurai_district.json',
    'http://localhost:8080/data/madurai_taluks.json',
    'http://localhost:8080/data/madurai_wells.json',
    'http://localhost:8080/data/interpolation_surfaces.json',
    'http://localhost:8080/data/time_series.json',
    'http://localhost:8080/data/analytics_summary.json',
    'http://localhost:8080/data/ml_predictions_2030.json',
    'http://localhost:8080/data/suitability_and_ml.json'
]

for u in urls:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req)
        print(f"{res.status} OK ({len(res.read())} bytes): {u}")
    except Exception as e:
        print(f"FAILED {u}: {e}")
