const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src/components/styles/lfrs.module.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Extract variables from .lfrsContainer
const containerMatch = css.match(/\.lfrsContainer\s*{([^}]+)}/);
if (!containerMatch) {
  console.log('No .lfrsContainer found');
  process.exit(1);
}

const vars = {};
const lines = containerMatch[1].split('\n');
for (const line of lines) {
  const match = line.match(/(--lfrs-[a-zA-Z0-9-]+)\s*:\s*([^;]+);/);
  if (match) {
    vars[match[1]] = match[2].trim();
  }
}

// 2. Remove .lfrsContainer block completely
css = css.replace(/\.lfrsContainer\s*{[^}]+}\s*/, '');

// 3. Replace all var(--lfrs-X) with var(--lfrs-X, fallback)
for (const [key, value] of Object.entries(vars)) {
  const regex = new RegExp(`var\\(${key}\\)`, 'g');
  css = css.replace(regex, `var(${key}, ${value})`);
}

fs.writeFileSync(cssPath, css);
console.log('Successfully added fallbacks to all CSS variables');
