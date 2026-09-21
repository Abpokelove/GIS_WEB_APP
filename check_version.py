with open(r'd:\web dashboard GIS\dashboard\assets\vendor\react.production.min.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
m = re.search(r'version\s*:\s*["\']([^"\']+)["\']', text)
if m:
    print("React version:", m.group(1))
else:
    print("Version not found in react.production.min.js")

with open(r'd:\web dashboard GIS\dashboard\assets\vendor\react-dom.production.min.js', 'r', encoding='utf-8') as f:
    text2 = f.read()
m2 = re.search(r'version\s*:\s*["\']([^"\']+)["\']', text2)
if m2:
    print("ReactDOM version:", m2.group(1))
