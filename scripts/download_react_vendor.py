import os
import urllib.request

vendor_dir = r"D:\web dashboard GIS\dashboard\assets\vendor"
os.makedirs(vendor_dir, exist_ok=True)

files = {
    "react.production.min.js": "https://unpkg.com/react@18/umd/react.production.min.js",
    "react-dom.production.min.js": "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
    "babel.min.js": "https://unpkg.com/@babel/standalone/babel.min.js"
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
