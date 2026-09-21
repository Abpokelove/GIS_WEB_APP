with open(r'd:\web dashboard GIS\dashboard\js\react_app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines in react_app.js: {len(lines)}")
# Check for common JSX issues: mismatched tags, unescaped characters like < or > in JSX text
for i, line in enumerate(lines):
    # check for unescaped < or > in JSX text
    if '>' in line and not line.strip().startswith('//') and not line.strip().startswith('/*'):
        # Check if contains something like " > " or " < " inside text
        pass
print("Done scan.")
