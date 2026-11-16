// 2D oyunun bölüm başı hikâyelerini 3D sürüm için tek dosyada toplar: 3d/js/story2d.js
// Hikâyeler 2D'de değişince yeniden çalıştır: node tools/build_story3d.js
// Alınanlar: js/story_faces.js, story_scenes.js, story_text.js, story.js, story_chapters.js ve
// gezi.js / saygili.js / selo.js / ekrem.js içindeki "// --- HİKÂYE ---" bölümü ("// --- HABERLER" ya da dosya sonuna kadar).
// Dosya klasik betik olarak yüklenir (modül değil); ihtiyaç duyduğu $, lang, headCanvas, playVoice, stopVoice
// 3d/js/story3d.js tarafından önceden tanımlanır.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, 'js', f), 'utf8');
const parts = ['story_faces.js', 'story_scenes.js', 'story_text.js', 'story.js', 'story_chapters.js'].map(f => `// ===== js/${f} =====\n${read(f)}`);
for (const f of ['selo.js', 'ekrem.js', 'gezi.js', 'saygili.js']) {
    const s = read(f), a = s.indexOf('// --- HİKÂYE ---');
    if (a < 0) throw new Error(f + ': HİKÂYE bölümü yok');
    let b = s.indexOf('// --- HABERLER', a); if (b < 0) b = s.length;
    parts.push(`// ===== js/${f} (HİKÂYE) =====\n${s.slice(a, b)}`);
}
// Hikâye çizimlerinin kullandığı oyun çizimleri (2D dosyalarından fonksiyon olarak kopyalanır)
for (const [f, name] of [['render.js', 'drawBribe'], ['chapters.js', 'drawCassette']]) {
    const s = read(f), a = s.indexOf(`function ${name}(`), b = s.indexOf('\n}', a);
    if (a < 0 || b < 0) throw new Error(`${f}: ${name} yok`);
    parts.push(`// ===== js/${f} (${name}) =====\n${s.slice(a, b + 2)}`);
}
const out =`// OTOMATİK ÜRETİLDİ: node tools/build_story3d.js (elle değiştirme; kaynak 2D js/ klasörü)\n${parts.join('\n')}\n// 3D modülleri için (const tanımları window'a düşmez)\nwindow.__story = { faces: STORY_FACES, T: storyT };\n`;
fs.writeFileSync(path.join(root, '3d', 'js', 'story2d.js'), out);
console.log('3d/js/story2d.js', out.length, 'bayt');
