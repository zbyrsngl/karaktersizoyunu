// 3D kodundaki ekranda görünebilecek Türkçe yazıları listeler (çeviri sözlüğü 3d/js/i18n.js için).
// Kullanım: node tools/strings3d.js            → bütün yazılar
//           node tools/strings3d.js --missing  → yalnızca sözlükte karşılığı olmayanlar
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '3d', 'js');
const BS = String.fromCharCode(92);
function strings(src) {
    const out = []; let i = 0;
    while (i < src.length) {
        const c = src[i], n = src[i + 1];
        if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
        if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
        if (c === '"' || c === "'" || c === '`') {
            let j = i + 1, s = '';
            while (j < src.length && src[j] !== c) {
                if (src[j] === BS) { s += src[j + 1]; j += 2; continue; }
                if (c === '`' && src[j] === '$' && src[j + 1] === '{') { let d = 1; j += 2; s += '{}'; while (d && j < src.length) { if (src[j] === '{') d++; else if (src[j] === '}') d--; j++; } continue; }
                if (c !== '`' && src[j] === '\n') break;
                s += src[j]; j++;
            }
            out.push(s); i = j + 1; continue;
        }
        i++;
    }
    return out;
}
let dict = null;
if (process.argv.includes('--missing')) {
    const src = fs.readFileSync(path.join(dir, 'i18n.js'), 'utf8');
    dict = new Set(strings(src));
}
const seen = new Map();
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js') && !['test.js', 'i18n.js', 'story2d.js'].includes(f))) {
    for (const s of strings(fs.readFileSync(path.join(dir, f), 'utf8'))) {
        if (s.length < 2 || /^(\.\.?\/|#|rgba?\()|\.(mp3|png|jpg|js|wav)\b|^[a-z][A-Za-z0-9_]*$|Arial|Impact|Georgia|monospace|^[a-z -]+$/.test(s)) continue;
        if (!/[A-ZÇĞİÖŞÜ]{2}|[çğıöşüÇĞİÖŞÜ]|[a-z] [a-z]/.test(s)) continue;
        if (dict && dict.has(s)) continue;
        if (!seen.has(s)) seen.set(s, f);
    }
}
for (const [s, f] of seen) console.log(f + '\t' + s);
