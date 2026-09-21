import os
import urllib.request

vendor_dir = r"D:\web dashboard GIS\dashboard\assets\vendor"
os.makedirs(vendor_dir, exist_ok=True)

files = {
    "leaflet.js": "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    "leaflet.css": "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    "chart.umd.js": "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
    "turf.min.js": "https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js"
}

for fname, url in files.items():
    outpath = os.path.join(vendor_dir, fname)
    if not os.path.exists(outpath):
        print(f"Downloading {fname}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp, open(outpath, 'wb') as f:
            f.write(resp.read())
        print(f"Saved {fname} ({os.path.getsize(outpath)} bytes)")
    else:
        print(f"{fname} already exists.")
