with open(r'd:\web dashboard GIS\dashboard\assets\vendor\react-dom.production.min.js', 'r', encoding='utf-8') as f:
    text = f.read()

print("File size:", len(text))
print("createRoot count:", text.count("createRoot"))
print("Is ReactDOM defined globally:", "ReactDOM=" in text)
