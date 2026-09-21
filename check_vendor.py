with open(r'd:\web dashboard GIS\dashboard\assets\vendor\react.production.min.js', 'r', encoding='utf-8') as f:
    r = f.read(300)
    print('React header:', r[:150])

with open(r'd:\web dashboard GIS\dashboard\assets\vendor\react-dom.production.min.js', 'r', encoding='utf-8') as f:
    rd = f.read(300)
    print('ReactDOM header:', rd[:150])
    print('Has createRoot:', 'createRoot' in rd)

with open(r'd:\web dashboard GIS\dashboard\assets\vendor\babel.min.js', 'r', encoding='utf-8') as f:
    b = f.read(300)
    print('Babel header:', b[:150])
