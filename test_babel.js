const fs = require('fs');
const path = require('path');

const babelCode = fs.readFileSync(path.join(__dirname, 'dashboard', 'assets', 'vendor', 'babel.min.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, 'dashboard', 'js', 'react_app.js'), 'utf8');

// evaluate babel
const vm = require('vm');
const sandbox = { console, window: {}, exports: {} };
vm.createContext(sandbox);
vm.runInContext(babelCode, sandbox);

const Babel = sandbox.Babel || sandbox.window.Babel;
console.log("Babel loaded successfully:", !!Babel);

try {
    const res = Babel.transform(appCode, { presets: ['react'] });
    console.log("Transpilation SUCCESS! Length:", res.code.length);
} catch (err) {
    console.error("BABEL ERROR:", err.message);
    if (err.loc) console.error("Line:", err.loc.line, "Col:", err.loc.column);
}
