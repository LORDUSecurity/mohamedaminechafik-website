import { readFileSync, writeFileSync } from 'fs';

const files = process.argv.slice(2);
for (const f of files) {
  let src = readFileSync(f, 'utf8');
  const names = /export \{([^}]*)\};/.exec(src)[1]
    .split(',').map(s => s.trim()).filter(Boolean);
  src = src.replace(/import\s*\{[^}]*\}\s*from\s*'three';\n/g, '');
  src = src.replace(/import\s*\{[^}]*\}\s*from\s*'[.'][^']*';\n/g, '');
  src = src.replace(/export \{[^}]*\};/g,
    () => names.map(n => `THREE.${n} = ${n};`).join('\n'));
  writeFileSync(f, src);
  console.log(f, '->', names.join(','));
}
