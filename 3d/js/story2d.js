// OTOMATİK ÜRETİLDİ: node tools/build_story3d.js (elle değiştirme; kaynak 2D js/ klasörü)
// ===== js/story_faces.js =====
// Hikâye karakterleri: fotoğraftan blok yüzler, elle çizilmiş piksel yüzler, kıyafetler ve blok insan çizimi
// Yeni fotoğraf eklemek için: resimler/ klasörüne koy, STORY_FACES'e kaynak + kırpma kutusu (x, y, w, h) yaz.
// (index.html bu dosyaları sırayla yükler; tanımlar paylaşılır, yükleme anında çalışan kod main.js'tedir)

const STORY_W = 960, STORY_H = 540, STORY_GROUND = 440, PX = 4;   // sahne birimi; PX = bir "blok pikseli"

// --- YÜZLER ---
const STORY_FACES = {
    g1: { src: 'resimler/4lucete.png', box: [24, 16, 58, 66] },
    g2: { src: 'resimler/4lucete.png', box: [149, 38, 62, 70] },
    g3: { src: 'resimler/4lucete.png', box: [235, 26, 62, 70] },
    g4: { src: 'resimler/4lucete.png', box: [409, 46, 62, 70] },
    sarraf: { src: 'resimler/sarraf.png', box: [50, 25, 190, 255] }   // saç, yüz ve sakal; omuzlar dışarıda
};
const FACE_GRID = 24;   // fotoğraf yüzleri kaç blok genişliğinde
const storyImgs = {}, storyFaceCache = {};
function storyImg(src) {
    if (!storyImgs[src]) { const im = new Image(); im.src = src; storyImgs[src] = im; }
    return storyImgs[src];
}
// Fotoğraftan 16 blok genişliğinde piksel yüz üretir (hazır değilse null)
function storyFace(key) {
    if (storyFaceCache[key]) return storyFaceCache[key];
    let src, box;
    if (key === 'recep') {
        if (!headCanvas) return null;                       // core.js'teki kırpılmış karikatür kafa
        src = headCanvas; box = [0, 0, headCanvas.width, headCanvas.height];
    } else {
        const f = STORY_FACES[key]; if (!f) return null;
        src = storyImg(f.src);
        if (!src.complete || !src.naturalWidth) return null;
        box = f.box;
    }
    const gw = FACE_GRID, gh = Math.round(FACE_GRID * box[3] / box[2]);
    const c = document.createElement('canvas'); c.width = gw; c.height = gh;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, box[0], box[1], box[2], box[3], 0, 0, gw, gh);
    // Fotoğraf yüzleri oval kesilir (arka plan atılır), biraz aydınlatılır ve çevresine koyu blok çizgi çekilir
    if (key !== 'recep') {
        const d = x.getImageData(0, 0, gw, gh), p = d.data, inside = (i, j) => {
            const u = (i + 0.5 - gw / 2) / (gw / 2), v = (j + 0.5 - gh / 2) / (gh / 2);
            return u * u + v * v <= 1;
        };
        for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
            const o = (j * gw + i) * 4;
            if (!inside(i, j)) { p[o + 3] = 0; continue; }
            for (let k = 0; k < 3; k++) p[o + k] = Math.min(255, (p[o + k] - 128) * 1.12 + 128 + 14);
            p[o + 3] = 255;
        }
        for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {   // dış çizgi: kenardaki iç bloklar koyulaşır
            const o = (j * gw + i) * 4;
            if (!p[o + 3]) continue;
            if (!inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1)) { p[o] *= 0.35; p[o + 1] *= 0.35; p[o + 2] *= 0.35; }
        }
        x.putImageData(d, 0, 0);
    }
    storyFaceCache[key] = c;
    return c;
}
Object.values(STORY_FACES).forEach(f => storyImg(f.src));   // önceden yükle

// Fotoğrafı olmayanlar için 8x8 elle çizilmiş yüzler (harf = renk)
const PIX_FACES = {
    police: { pal: { k: '#1e3a8a', y: '#fbbf24', s: '#e0ac69', e: '#1f2937', m: '#7c2d12', b: '#3f2a1d' },
              rows: ['kkkkkkkk', 'kkkyykkk', 'kkkkkkkk', 'ssssssss', 'sesssess', 'ssssssss', 'sbbbbbbs', 'ssmmmmss'] },
    feto:   { pal: { w: '#f3f4f6', s: '#d6a77a', e: '#111827', g: '#9ca3af', m: '#7f1d1d' },
              rows: ['wwwwwwww', 'wsssssw.', 'seessees', 'ssssssss', 'sssggsss', 'gwwwwwwg', 'wwwmmwww', '.wwwwww.'] },
    kurt:   { pal: { g: '#6b7280', d: '#374151', y: '#facc15', w: '#e5e7eb', r: '#991b1b', k: '#111827' },
              rows: ['gd....dg', 'gdgggddg', 'gggggggg', 'gygggygg', 'gggggggg', 'ggwkkwgg', 'gwrrrrwg', '.gggggg.'] }
};
const pixFaceCache = {};
function pixFace(key) {
    if (pixFaceCache[key]) return pixFaceCache[key];
    const F = PIX_FACES[key], c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    const x = c.getContext('2d');
    F.rows.forEach((row, j) => [...row].forEach((ch, i) => { if (F.pal[ch]) { x.fillStyle = F.pal[ch]; x.fillRect(i, j, 1, 1); } }));
    return (pixFaceCache[key] = c);
}

// --- KARAKTERLER ---
// Kıyafet renkleri: gövde, kol, bacak, ayakkabı
const STORY_CAST = {
    recep:  { face: 'recep', suit: '#1f2a44', arm: '#1f2a44', leg: '#111827', shoe: '#000', tie: '#b91c1c', hand: '#e0ac69' },
    g1:     { face: 'g1', suit: '#111827', arm: '#111827', leg: '#1f2937', shoe: '#000', tie: '#334155', hand: '#d6a77a' },
    g2:     { face: 'g2', suit: '#1c1917', arm: '#1c1917', leg: '#292524', shoe: '#000', tie: '#7f1d1d', hand: '#d6a77a' },
    g3:     { face: 'g3', suit: '#0f172a', arm: '#0f172a', leg: '#1e293b', shoe: '#000', tie: '#1e3a8a', hand: '#d6a77a' },
    g4:     { face: 'g4', suit: '#262626', arm: '#262626', leg: '#171717', shoe: '#000', tie: '#365314', hand: '#d6a77a' },
    sarraf: { face: 'sarraf', suit: '#18181b', arm: '#18181b', leg: '#27272a', shoe: '#000', hand: '#e7c39a', gold: true },
    police: { pix: 'police', suit: '#1d4ed8', arm: '#1d4ed8', leg: '#1e3a8a', shoe: '#000', tie: '#111827', hand: '#e0ac69', badge: true },
    feto:   { pix: 'feto', suit: '#4b5563', arm: '#4b5563', leg: '#374151', shoe: '#1f2937', hand: '#d6a77a', cane: true },
    kurt:   { pix: 'kurt', suit: '#57534e', arm: '#6b7280', leg: '#44403c', shoe: '#292524', hand: '#6b7280' }
};

function blockRect(c, x, y, w, h, color, shade) {
    c.fillStyle = color; c.fillRect(x, y, w, h);
    if (shade !== false) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + w - PX, y, PX, h); c.fillRect(x, y + h - PX, w, PX); }
}

// Ayaklar zeminde (x orta, y zemin). a: { who, dir, walk (faz), talk, wave, scale }
function drawBlockPerson(c, a, time) {
    const C = STORY_CAST[a.who], s = a.scale || 1;
    c.save();
    c.translate(a.x, a.y);
    c.scale(s * (a.dir || 1), s);
    const legH = 72, bodyH = 72, bodyW = 56, legW = 28, armW = 24, head = 64;
    const sw = a.walking ? Math.sin(a.walk) * 0.6 : 0;
    const armSw = a.wave ? -2.4 + Math.sin(time * 10) * 0.4 : -sw;
    // bacaklar (kalçadan döner)
    [[-legW, sw], [0, -sw]].forEach(([lx, ang]) => {
        c.save(); c.translate(lx + legW / 2, -legH); c.rotate(ang);
        blockRect(c, -legW / 2, 0, legW, legH - 12, C.leg);
        blockRect(c, -legW / 2, legH - 12, legW, 12, C.shoe, false);
        c.restore();
    });
    // arka kol
    c.save(); c.translate(-bodyW / 2 - armW / 2, -legH - bodyH + 8); c.rotate(sw);
    blockRect(c, -armW / 2, -4, armW, bodyH - 12, C.arm); blockRect(c, -armW / 2, bodyH - 16, armW, 14, C.hand, false);
    c.restore();
    // gövde
    blockRect(c, -bodyW / 2, -legH - bodyH, bodyW, bodyH, C.suit);
    if (C.tie) { c.fillStyle = '#f3f4f6'; c.fillRect(-8, -legH - bodyH, 16, 20); c.fillStyle = C.tie; c.fillRect(-4, -legH - bodyH + 4, 8, 36); }
    if (C.badge) { c.fillStyle = '#fbbf24'; c.fillRect(8, -legH - bodyH + 14, 12, 12); c.save(); c.scale(a.dir || 1, 1); c.fillStyle = '#fff'; c.font = 'bold 13px monospace'; c.textAlign = 'center'; c.fillText('17/25', 0, -legH - 14); c.restore(); }
    // ön kol (konuşurken/el sallarken kalkar)
    c.save(); c.translate(bodyW / 2 + armW / 2, -legH - bodyH + 8); c.rotate(armSw);
    blockRect(c, -armW / 2, -4, armW, bodyH - 12, C.arm); blockRect(c, -armW / 2, bodyH - 16, armW, 14, C.hand, false);
    if (a.who === 'recep') {   // balyoz
        c.fillStyle = '#7c4a1e'; c.fillRect(-4, bodyH - 70, 8, 74);
        blockRect(c, -18, bodyH - 90, 36, 22, '#4b5563');
        c.save(); c.translate(0, bodyH - 79); c.scale(a.dir || 1, 1);
        c.fillStyle = '#fde68a'; c.font = 'bold 9px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('YARGI', 0, 0, 34);
        c.restore();
    }
    if (C.gold) { blockRect(c, -16, bodyH - 22, 32, 16, '#facc15'); c.fillStyle = '#fef08a'; c.fillRect(-12, bodyH - 20, 12, 4); }
    if (C.cane) { c.fillStyle = '#78350f'; c.fillRect(-3, bodyH - 10, 6, 70); }
    if (C.saz) {   // bağlama: elde, sapı yukarı
        c.fillStyle = '#6b3f1d'; c.fillRect(-3, bodyH - 96, 6, 84);
        blockRect(c, -18, bodyH - 22, 36, 28, '#b45309'); c.fillStyle = '#1c1917'; c.fillRect(-4, bodyH - 12, 8, 8);
    }
    c.restore();
    if (a.carry) {
        const by = -legH - bodyH - head - 4;
        blockRect(c, -30, by - 30, 60, 30, '#ea580c'); c.fillStyle = '#9a3412'; c.fillRect(-30, by - 30, 60, 6);
        c.fillStyle = '#22c55e'; c.fillRect(-22, by - 38, 44, 8);
        blockRect(c, -18, by - 56, 36, 16, '#eab308');
    }
    // kafa: fotoğraftan piksel yüz ya da elle çizilmiş yüz
    const hy = -legH - bodyH - head + (a.talk ? Math.round(Math.sin(time * 18)) * 2 : 0);
    c.imageSmoothingEnabled = false;
    if (C.face) {
        const f = storyFace(C.face);
        if (f) {
            const hw = a.who === 'recep' ? head * 1.25 : head * 1.15, hh = hw * f.height / f.width;
            c.drawImage(f, -hw / 2, hy + head - hh, hw, hh);
        } else blockRect(c, -head / 2, hy, head, head, C.hand);
    } else {
        c.drawImage(pixFace(C.pix), -head / 2, hy, head, head);
    }
    c.restore();
}

// ===== js/story_scenes.js =====
// Hikâye sahne parçaları: zemin, gökyüzü, arka planlar (STORY_BG) ve eşyalar (STORY_PROPS)
// (index.html bu dosyaları sırayla yükler; tanımlar paylaşılır, yükleme anında çalışan kod main.js'tedir)

const storyHash = n => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };

function storyGround(c, top, side) {
    const B = 40;
    for (let i = 0; i < STORY_W / B; i++) {
        for (let j = 0; j * B + STORY_GROUND < STORY_H; j++) {
            const x = i * B, y = STORY_GROUND + j * B;
            const g = j === 0;
            c.fillStyle = g ? top : side; c.fillRect(x, y, B, B);
            for (let k = 0; k < 6; k++) {   // blok dokusu
                c.fillStyle = storyHash(i * 31 + j * 7 + k) > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)';
                c.fillRect(x + Math.floor(storyHash(i + k * 3 + j) * 8) * 5, y + Math.floor(storyHash(i * 5 + k + j * 9) * 8) * 5, 5, 5);
            }
            if (g) { c.fillStyle = side; c.fillRect(x, y + 28, B, 12); }
            c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, B - 1, B - 1);
        }
    }
}
function storySky(c, cols) {
    const band = STORY_GROUND / cols.length;
    cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, Math.floor(i * band), STORY_W, Math.ceil(band) + 1); });
}
function blockStars(c, time) {
    for (let i = 0; i < 40; i++) {
        c.fillStyle = storyHash(i + Math.floor(time * 2 + i) * 0.001) > 0.1 ? '#fef9c3' : '#fff';
        c.fillRect(Math.floor(storyHash(i) * STORY_W / 4) * 4, Math.floor(storyHash(i + 9) * 260 / 4) * 4, 4, 4);
    }
}
function blockMoon(c, x, y) { c.fillStyle = '#f5f5dc'; c.fillRect(x, y, 48, 48); c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x + 8, y + 12, 12, 12); c.fillRect(x + 28, y + 28, 8, 8); }

const STORY_BG = {
    jail(c, time) {
        storySky(c, ['#0b1026', '#111a3a', '#182350', '#1f2d63']);
        blockStars(c, time); blockMoon(c, 820, 40);
        // tuğla duvarlı karakol
        for (let y = 140; y < STORY_GROUND; y += 24) for (let x = 120; x < 820; x += 48) {
            const ox = (y / 24) % 2 ? 24 : 0;
            c.fillStyle = storyHash(x + y) > 0.5 ? '#6b7280' : '#57606f'; c.fillRect(x + ox - 24 > 120 ? x + ox - 24 : 120, y, 46, 22);
        }
        c.fillStyle = '#374151'; c.fillRect(110, 120, 720, 24);
        c.fillStyle = '#fbbf24'; c.font = 'bold 26px monospace'; c.textAlign = 'center'; c.fillText(storyT('station'), 470, 140);
        storyGround(c, '#4b5563', '#374151');
    },
    palace(c, time) {
        storySky(c, ['#38bdf8', '#5cc8f9', '#7dd3fc', '#a5e3fd', '#cfeffd']);
        c.fillStyle = '#fde047'; c.fillRect(800, 40, 64, 64);
        [[60, 60], [300, 90], [560, 50]].forEach(([x0, y]) => {
            const x = Math.floor(((x0 + time * 14) % (STORY_W + 160)) / PX) * PX - 140;   // bulutlar yavaşça süzülür
            c.fillStyle = '#fff'; c.fillRect(x, y, 120, 24); c.fillRect(x + 24, y - 16, 64, 16);
        });
        // blok saray
        c.fillStyle = '#efe4cc'; c.fillRect(150, 250, 660, 190);
        c.fillStyle = '#cdbb96'; c.fillRect(150, 240, 660, 16); c.fillRect(380, 180, 200, 70);
        for (let x = 170; x < 800; x += 40) { c.fillStyle = '#b8a47e'; c.fillRect(x, 270, 12, 170); }
        c.fillStyle = '#5b4636'; c.fillRect(450, 330, 60, 110);
        c.fillStyle = '#e30a17'; c.fillRect(480, 120, 44, 28); c.fillStyle = '#9ca3af'; c.fillRect(476, 120, 4, 60);
        storyGround(c, '#4caf2f', '#7a4a24');
    },
    steppe(c) {
        storySky(c, ['#1e1b4b', '#4c1d95', '#831843', '#c2410c', '#ea580c', '#fcd34d']);
        c.fillStyle = '#fdba74'; c.fillRect(220, 250, 96, 96);
        c.fillStyle = '#6b2f5f';
        for (let x = 0; x < STORY_W; x += 40) { const h = 60 + Math.floor(storyHash(x) * 5) * 20; c.fillRect(x, STORY_GROUND - h, 40, h); }
        storyGround(c, '#a3a34a', '#7c5a2c');
    },
    city(c, time) {
        storySky(c, ['#020617', '#0b1026', '#111a3a', '#1e1b4b']);
        blockStars(c, time); blockMoon(c, 100, 50);
        for (let i = 0; i < 12; i++) {
            const x = i * 80, h = 140 + Math.floor(storyHash(i * 3) * 6) * 30;
            c.fillStyle = i % 2 ? '#1f2937' : '#273449'; c.fillRect(x, STORY_GROUND - h, 76, h);
            for (let wy = STORY_GROUND - h + 16; wy < STORY_GROUND - 20; wy += 28) for (let wx = x + 10; wx < x + 66; wx += 22) {
                c.fillStyle = storyHash(wx * 3 + wy) > 0.45 ? '#fde68a' : '#111827'; c.fillRect(wx, wy, 12, 14);
            }
        }
        // projektör
        c.fillStyle = 'rgba(255,255,200,0.08)';
        const a = Math.sin(time * 0.8) * 0.4;
        c.beginPath(); c.moveTo(720, STORY_GROUND); c.lineTo(720 + Math.sin(a - 0.12) * 500, STORY_GROUND - 500); c.lineTo(720 + Math.sin(a + 0.12) * 500, STORY_GROUND - 500); c.fill();
        storyGround(c, '#4b5563', '#1f2937');
    },
    card(c, time) {
        c.fillStyle = '#0b0f19'; c.fillRect(0, 0, STORY_W, STORY_H);
        for (let i = 0; i < 30; i++) {   // uçuşan rüşvet zarfları
            const x = (storyHash(i) * STORY_W + time * 30 * (0.5 + storyHash(i + 1))) % (STORY_W + 60) - 30;
            const y = (storyHash(i + 2) * STORY_H + time * 40 * (0.5 + storyHash(i + 3))) % (STORY_H + 40) - 20;
            c.globalAlpha = 0.25; drawBribe(c, x, y, time * 2 + i); c.globalAlpha = 1;
        }
    }
};

// Sahne eşyaları: hücre parmaklığı, ayakkabı kutuları, telefon, sandık
const STORY_PROPS = {
    bars(c) {
        c.fillStyle = '#9ca3af';
        for (let x = 470; x <= 910; x += 44) c.fillRect(x, 196, 8, 244);
        c.fillRect(466, 196, 448, 12); c.fillRect(466, 300, 448, 8);
    },
    shoeboxes(c, time) {
        [[80, 0], [128, 0], [104, -32], [820, 0], [860, 0]].forEach(([x, dy], i) => {
            const y = STORY_GROUND - 32 + dy;
            blockRect(c, x, y, 44, 32, '#ea580c'); c.fillStyle = '#9a3412'; c.fillRect(x, y, 44, 6);
            c.fillStyle = '#22c55e'; c.fillRect(x + 6, y - 6 - Math.round(Math.abs(Math.sin(time * 3 + i)) * 4), 32, 8);
        });
    },
    gold(c, time) {   // altın külçesi yığını, parıltılı
        const rows = [5, 4, 3, 2, 1];
        rows.forEach((n, r) => { for (let k = 0; k < n; k++) {
            const x = 600 + r * 22 + k * 44, y = STORY_GROUND - 20 - r * 20;
            blockRect(c, x, y, 42, 20, '#eab308'); c.fillStyle = '#fde047'; c.fillRect(x + 4, y + 3, 26, 5);
        } });
        const t = Math.floor(time * 3) % 9;
        c.fillStyle = '#fff'; c.fillRect(612 + t * 24, STORY_GROUND - 108 + (t % 3) * 30, 6, 6);
    },
    ballot(c) {
        const x = 440, y = STORY_GROUND - 80;
        blockRect(c, x, y, 90, 80, '#e5e7eb'); c.fillStyle = '#1d4ed8'; c.fillRect(x, y, 90, 12);
        c.fillStyle = '#111827'; c.fillRect(x + 25, y - 2, 40, 6);
        c.fillStyle = '#1d4ed8'; c.font = 'bold 13px monospace'; c.textAlign = 'center'; c.fillText(storyT('ballot'), x + 45, y + 48);
    },
    rain(c, time) {   // gökten rüşvet zarfı yağar
        for (let i = 0; i < 10; i++) {
            const x = 60 + storyHash(i) * 840, y = ((time * 120 + storyHash(i + 4) * 500) % 520) - 40;
            drawBribe(c, x, y, time * 3 + i);
        }
    }
};

// ===== js/story_text.js =====
// 3. bölümün hikâyesi (STORIES; 1. bölüm gezi.js'te, 2. bölüm saygili.js'te) ve tüm dillerde hikâye metinleri (STORY_TEXT); 3-8: story_chapters.js
// (index.html bu dosyaları sırayla yükler; tanımlar paylaşılır, yükleme anında çalışan kod main.js'tedir)

// Sahne: bg, props, actors [{ who, x, to, dir, talk, wave, jump }], say: { who, key } (who boşsa anlatıcı), card: true
const STORIES = {
    3: [
        { bg: 'city', props: ['ballot'], say: { key: 's3a' },
          actors: [{ who: 'police', x: 300, dir: 1 }, { who: 'police', x: 680, dir: -1 }] },
        { bg: 'city', props: ['ballot'], say: { who: 'feto', key: 's3b' },
          actors: [{ who: 'feto', x: 1060, to: 620, dir: -1, talk: true }] },
        { bg: 'city', props: ['ballot'], say: { who: 'recep', key: 's3c' },
          actors: [{ who: 'recep', x: -100, to: 300, dir: 1, talk: true, wave: true }, { who: 'feto', x: 620, dir: -1 }] },
        { bg: 'card', card: { title: 'm3t', text: 'm3' } }
    ]
};

const STORY_TEXT = {
    tr: { station: '17/25 KARAKOLU', ballot: 'SANDIK', skip: 'GEÇ ⏭', tap: 'Devam için dokun ▶', go: 'BAŞLA ▶',
          gang: '4\'LÜ ÇETE', recep: 'HIRHIZ', phone: 'TELEFON', sarraf: 'SARRAF', feto: 'FETÖ',
          s3a: 'Seçim gecesi. Sandıklar sayılıyor, şehir nefesini tutmuş...',
          s3b: 'Bu sandık benim olacak! Hehehe...',
          s3c: 'Sandık namusumuzdur! Ama sayımı biz yaparız!',
          m3t: 'GÖREV 3: SANDIĞI KORU', m3: 'Gece şehrinde polisleri geç, FETÖ\'yü yen, sandığı kurtar!' },
    en: { station: '17/25 POLICE STATION', ballot: 'BALLOT', skip: 'SKIP ⏭', tap: 'Tap to continue ▶', go: 'START ▶',
          gang: 'GANG OF FOUR', recep: 'HIRHIZ', phone: 'PHONE', sarraf: 'SARRAF', feto: 'FETÖ',
          s3a: 'Election night. The ballots are being counted, the city holds its breath...',
          s3b: 'This ballot box will be mine! Hehehe...',
          s3c: 'The ballot box is our honour! But we do the counting!',
          m3t: 'MISSION 3: GUARD THE BALLOT BOX', m3: 'Get past the police in the night city, beat FETÖ, save the ballot box!' },
    fr: { station: 'COMMISSARIAT 17/25', ballot: 'URNE', skip: 'PASSER ⏭', tap: 'Touchez pour continuer ▶', go: 'JOUER ▶',
          gang: 'BANDE DES QUATRE', recep: 'HIRHIZ', phone: 'TÉLÉPHONE', sarraf: 'SARRAF', feto: 'FETÖ',
          s3a: 'Soir d\'élection. On compte les urnes, la ville retient son souffle...',
          s3b: 'Cette urne sera à moi ! Héhéhé...',
          s3c: 'L\'urne, c\'est notre honneur ! Mais c\'est nous qui comptons !',
          m3t: 'MISSION 3 : PROTÈGE L\'URNE', m3: 'Traverse la ville de nuit, bats FETÖ, sauve l\'urne !' },
    nl: { station: '17/25 POLITIEBUREAU', ballot: 'STEMBUS', skip: 'OVERSLAAN ⏭', tap: 'Tik om verder te gaan ▶', go: 'START ▶',
          gang: 'BENDE VAN VIER', recep: 'HIRHIZ', phone: 'TELEFOON', sarraf: 'SARRAF', feto: 'FETÖ',
          s3a: 'Verkiezingsnacht. De stemmen worden geteld, de stad houdt de adem in...',
          s3b: 'Deze stembus wordt van mij! Hehehe...',
          s3c: 'De stembus is onze eer! Maar wij tellen de stemmen!',
          m3t: 'MISSIE 3: BEWAAK DE STEMBUS', m3: 'Kom langs de politie in de nachtstad, versla FETÖ, red de stembus!' },
    de: { station: 'WACHE 17/25', ballot: 'URNE', skip: 'ÜBERSPRINGEN ⏭', tap: 'Tippen zum Fortfahren ▶', go: 'START ▶',
          gang: 'VIERERBANDE', recep: 'HIRHIZ', phone: 'TELEFON', sarraf: 'SARRAF', feto: 'FETÖ',
          s3a: 'Wahlnacht. Die Urnen werden ausgezählt, die Stadt hält den Atem an...',
          s3b: 'Diese Urne gehört bald mir! Hehehe...',
          s3c: 'Die Urne ist unsere Ehre! Aber zählen tun wir!',
          m3t: 'MISSION 3: BESCHÜTZE DIE URNE', m3: 'Komm an der Polizei in der Nachtstadt vorbei, besiege FETÖ, rette die Urne!' },
    ru: { station: 'УЧАСТОК 17/25', ballot: 'УРНА', skip: 'ПРОПУСТИТЬ ⏭', tap: 'Нажми, чтобы продолжить ▶', go: 'НАЧАТЬ ▶',
          gang: 'БАНДА ЧЕТЫРЁХ', recep: 'HIRHIZ', phone: 'ТЕЛЕФОН', sarraf: 'САРРАФ', feto: 'ФЕТÖ',
          s3a: 'Ночь выборов. Урны подсчитывают, город затаил дыхание...',
          s3b: 'Эта урна будет моей! Хе-хе-хе...',
          s3c: 'Урна — наша честь! Но считаем мы!',
          m3t: 'МИССИЯ 3: ЗАЩИТИ УРНУ', m3: 'Пройди полицию в ночном городе, победи ФЕТÖ, спаси урну!' }
};
const storyT = k => (STORY_TEXT[lang] && STORY_TEXT[lang][k]) || STORY_TEXT.tr[k];

// ===== js/story.js =====
// Bölüm girişi hikâyeleri: blok (piksel) tarzı karakterlerle resimli, yazılı ara sahneler
// (index.html bu dosyaları sırayla yükler; tanımlar paylaşılır, yükleme anında çalışan kod main.js'tedir)
//
// Her bölümden önce bir kez oynar. Dokun / Enter / Boşluk: yazıyı tamamla, sonra sonraki sahne. GEÇ ya da ESC: atla.
// Yüzler fotoğraflardan kırpılıp küçük bir ızgaraya indirilir ve büyütülerek çizilir (kare kare blok görünüm).
// Karakterler: story_faces.js, sahneler: story_scenes.js, metinler: story_text.js

// --- OYNATICI ---
let story = null;   // { level, i, t0, chars, done }
const storyEl = $('story'), storyCanvas = $('story-canvas'), sctx = storyCanvas.getContext('2d');
let storyDone = {};

function playStory(level, onDone) {
    if (storyDone[level] || !STORIES[level]) { onDone(); return; }
    storyDone[level] = true;
    story = { level, i: 0, t0: performance.now(), shown: 0, onDone, raf: 0 };
    storyEl.style.display = 'block';
    resizeStory();
    story.raf = requestAnimationFrame(storyLoop);
    storyVoice();
}
function storyScene() { return STORIES[story.level][story.i]; }
// Seslendirilmiş replikler: say.key → ses kaydı (bölüm dosyaları ekler, ör. js/selo.js)
const STORY_VOICES = {};
function storyVoice() {
    stopVoice();
    const sc = storyScene(), v = sc.say && STORY_VOICES[sc.say.key];
    if (v) playVoice(v);
}
function storyFullText(sc) { return sc.card ? storyT(sc.card.text) : storyT(sc.say.key); }

function storyNext() {
    if (!story) return;
    const sc = storyScene(), full = storyFullText(sc);
    if (story.shown < full.length) { story.shown = full.length; return; }   // önce yazıyı tamamla
    if (story.i < STORIES[story.level].length - 1) { story.i++; story.t0 = performance.now(); story.shown = 0; storyVoice(); }
    else endStory();
}
function endStory() {
    if (!story) return;
    cancelAnimationFrame(story.raf);
    const cb = story.onDone;
    stopVoice();
    story = null;
    storyEl.style.display = 'none';
    cb();
}
function storyKey(e) {
    if (e.key === 'Escape') endStory();
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); storyNext(); }
}

let storyView = { s: 1, ox: 0, oy: 0, w: 0, h: 0 };
function resizeStory() {
    const dpr = window.devicePixelRatio || 1, w = window.innerWidth, h = window.innerHeight;
    storyCanvas.width = Math.round(w * dpr); storyCanvas.height = Math.round(h * dpr);
    const s = Math.min(w / STORY_W, h / STORY_H);
    storyView = { s, ox: (w - STORY_W * s) / 2, oy: (h - STORY_H * s) / 2, w, h, dpr };
}

function storyLoop(now) {
    if (!story) return;
    story.raf = requestAnimationFrame(storyLoop);
    const sc = storyScene(), el = (now - story.t0) / 1000, time = now / 1000;
    const full = storyFullText(sc);
    if (el > 0.4) story.shown = Math.min(full.length, Math.max(story.shown, Math.floor((el - 0.4) * 38)));

    const { s, ox, oy, w, h, dpr } = storyView, c = sctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.save();
    c.translate(ox, oy); c.scale(s, s);
    c.beginPath(); c.rect(0, 0, STORY_W, STORY_H); c.clip();

    // Kamera: sahne boyunca çok yavaş yakınlaşır (kart sahnelerinde sabit)
    if (!sc.card) {
        const z = 1 + Math.min(1, el / 7) * 0.035;
        c.translate(STORY_W / 2, STORY_GROUND - 120); c.scale(z, z); c.translate(-STORY_W / 2, -(STORY_GROUND - 120));
    }
    STORY_BG[sc.bg](c, time);
    (sc.props || []).forEach(p => { if (p !== 'bars') STORY_PROPS[p](c, time); });
    // oyuncular: 'to' varsa 2 saniyede yürüyerek gelir
    const speaking = story.shown < full.length;
    (sc.actors || []).forEach((a, k) => {
        const walkT = a.to !== undefined ? Math.min(1, el / (a.dur || 2)) : 1;
        const x = a.to !== undefined ? a.x + (a.to - a.x) * walkT : a.x;
        const walking = a.to !== undefined && walkT < 1;
        const lift = a.jump ? Math.abs(Math.sin(time * 6 + k)) * 40 : 0;
        // yürürken adım adım sekme, dururken blok blok nefes alma
        const bob = walking ? Math.round(Math.abs(Math.sin(el * 10)) * 1.5) * PX : (Math.floor(time * 1.6 + k * 0.7) % 2) * 2;
        const y = STORY_GROUND - lift - bob;
        storyShadow(c, x, a.scale || 1, lift);
        if (walking) storyDust(c, x, a.dir || 1, el, k);
        drawBlockPerson(c, { ...a, x, y, walking, walk: el * 10, talk: a.talk && !walking && speaking }, time);
        if (!walking && isSpeaker(sc, a)) storySpeakerArrow(c, x, y, a.scale || 1, time);
    });
    if ((sc.props || []).includes('bars')) STORY_PROPS.bars(c, time);   // parmaklık karakterlerin önünde

    if (sc.sepia) {   // geçmişe dönüş: eski fotoğraf rengi
        c.globalCompositeOperation = 'color'; c.fillStyle = '#a0784a'; c.fillRect(0, 0, STORY_W, STORY_H);
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#fde68a'; c.font = 'bold 22px monospace'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
        c.fillText(storyT('flashback'), STORY_W - 20, STORY_H - 16);
    }
    c.restore(); c.save();
    c.translate(ox, oy); c.scale(s, s);
    c.beginPath(); c.rect(0, 0, STORY_W, STORY_H); c.clip();
    if (sc.card) drawStoryCard(c, sc, el);
    else drawStoryBox(c, sc, full, el);
    storyWipe(c, el);
    c.restore();

    // sahne sırası noktaları
    const n = STORIES[story.level].length;
    for (let i = 0; i < n; i++) { c.fillStyle = i === story.i ? '#fbbf24' : 'rgba(255,255,255,0.35)'; c.fillRect(ox + 16 + i * 16, oy + STORY_H * s - 22, 10, 10); }
}

const speakingNow = full => story && story.shown < full.length;
function wrapLines(c, text, maxW) {
    const words = text.split(' '), lines = [];
    let line = '';
    words.forEach(wd => { const tst = line ? line + ' ' + wd : wd; if (c.measureText(tst).width > maxW && line) { lines.push(line); line = wd; } else line = tst; });
    if (line) lines.push(line);
    return lines;
}

// --- SAHNE SÜSLERİ ---
// Sahne açılışı: ekran blok blok, rastgele sırayla açılır
function storyWipe(c, el) {
    const D = 0.45; if (el >= D) return;
    const B = 60; c.fillStyle = '#000';
    for (let j = 0; j < STORY_H / B; j++) for (let i = 0; i < STORY_W / B; i++) {
        const h = storyHash(i * 13 + j * 71 + story.i * 7);
        if (el < D * (0.25 + 0.75 * h)) c.fillRect(i * B, j * B, B, B);
    }
}
// Ayak altında blok gölge (zıplayınca küçülür)
function storyShadow(c, x, s, lift) {
    const w = Math.round((76 - lift * 0.6) * s / PX) * PX;
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(Math.round((x - w / 2) / PX) * PX, STORY_GROUND - PX, w, PX * 2);
}
// Yürürken ayak arkasında kalkan toz blokları
function storyDust(c, x, dir, el, k) {
    for (let n = 0; n < 3; n++) {
        const ph = (el * 2.2 + n / 3 + k * 0.13) % 1;
        const sz = Math.round((1 - ph) * 3) * PX;
        if (!sz) continue;
        c.fillStyle = `rgba(230,220,200,${0.55 * (1 - ph)})`;
        c.fillRect(Math.round((x - dir * (34 + ph * 46)) / PX) * PX, STORY_GROUND - PX - Math.round(ph * 6) * PX, sz, sz);
    }
}
// Konuşan: say.who ile aynı kişi; 'gang' ise dört çete üyesi
function isSpeaker(sc, a) {
    const w = sc.say && sc.say.who;
    if (!w) return false;
    return a.who === w || (w === 'gang' && /^g[1-4]$/.test(a.who));
}
function storySpeakerArrow(c, x, y, s, time) {
    const top = y - (72 + 72 + 104 + 20) * s - Math.round(Math.abs(Math.sin(time * 5)) * 3) * PX;
    c.fillStyle = '#fbbf24';
    [[-3, 0, 6], [-2, 1, 4], [-1, 2, 2]].forEach(([dx, dy, n]) => c.fillRect(x + dx * PX, top + dy * PX, n * PX, PX));
    c.fillStyle = '#7c2d12'; c.fillRect(x - 3 * PX, top - PX, 6 * PX, PX);
}
// Konuşma kutusundaki portre (fotoğraf ya da piksel yüz)
function speakerPortrait(who) {
    const C = STORY_CAST[who === 'gang' ? 'g2' : who];
    if (!C) return null;
    return C.face ? storyFace(C.face) : pixFace(C.pix);
}

function drawStoryBox(c, sc, full, el) {
    const slide = Math.min(1, el / 0.3), ease = 1 - (1 - slide) * (1 - slide);
    const x = 40, y = 16 - (1 - ease) * 170, w = STORY_W - 80, hgt = 132;
    c.fillStyle = 'rgba(0,0,0,0.78)'; c.fillRect(x, y, w, hgt);
    c.strokeStyle = '#fbbf24'; c.lineWidth = 4; c.strokeRect(x, y, w, hgt);
    let ty = y + 40, tx = x + 20;
    const pf = sc.say.who && speakerPortrait(sc.say.who);
    if (pf) {   // sol başta konuşanın portresi
        const ph = 104, pw = Math.min(104, ph * pf.width / pf.height);
        c.fillStyle = '#1f2937'; c.fillRect(x + 12, y + 14, 104, 104);
        c.imageSmoothingEnabled = false;
        c.drawImage(pf, x + 12 + (104 - pw) / 2, y + 14 + (104 - ph) / 2 + (speakingNow(full) ? Math.round(Math.sin(performance.now() / 55)) * 2 : 0), pw, ph);
        c.strokeStyle = '#fbbf24'; c.lineWidth = 3; c.strokeRect(x + 12, y + 14, 104, 104);
        tx = x + 132;
    }
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    if (sc.say.who) {
        c.fillStyle = '#fbbf24'; c.font = 'bold 22px monospace';
        c.fillText(storyT(sc.say.who) + ':', tx, ty); ty += 32;
    }
    c.fillStyle = '#fff'; c.font = 'bold 24px monospace';
    wrapLines(c, full.slice(0, story.shown), x + w - 20 - tx).forEach((ln, i) => c.fillText(ln, tx, ty + i * 30));
    if (story.shown >= full.length && Math.floor(performance.now() / 400) % 2) {
        c.fillStyle = '#fbbf24'; c.font = 'bold 18px monospace'; c.textAlign = 'right';
        c.fillText(storyT('tap'), x + w - 16, y + hgt - 14);
    }
}

function drawStoryCard(c, sc, el) {
    const zoom = Math.min(1, el * 2.5);
    c.save();
    c.translate(STORY_W / 2, 200); c.scale(zoom, zoom);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 40px monospace';
    c.lineWidth = 8; c.strokeStyle = '#7c2d12'; c.fillStyle = '#fbbf24';
    const title = storyT(sc.card.title);
    let fs = 40; while (c.measureText(title).width > STORY_W - 60 && fs > 20) { fs -= 2; c.font = `bold ${fs}px monospace`; }
    c.strokeText(title, 0, 0); c.fillText(title, 0, 0);
    c.restore();
    c.fillStyle = '#fff'; c.font = 'bold 26px monospace'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    wrapLines(c, storyFullText(sc).slice(0, story.shown), STORY_W - 160).forEach((ln, i) => c.fillText(ln, STORY_W / 2, 300 + i * 36));
    if (story.shown >= storyFullText(sc).length) {
        const pulse = 1 + Math.sin(performance.now() / 200) * 0.04;
        c.save(); c.translate(STORY_W / 2, 460); c.scale(pulse, pulse);
        blockRect(c, -120, -30, 240, 60, '#fbbf24');
        c.fillStyle = '#000'; c.font = 'bold 28px monospace'; c.textBaseline = 'middle'; c.fillText(storyT(sc.card.go || 'go'), 0, 2);
        c.restore();
    }
}

// ===== js/story_chapters.js =====
// 3-8. bölümlerin ve oyun sonunun hikâyeleri (motor: story.js; 9. bölüm js/selo.js)
// Bütün yeni karakterler elle çizilmiş 8x8 piksel yüzlerdir: fotoğraf ya da lisans gerekmez.
// (index.html bu dosyaları sırayla yükler; tanımlar paylaşılır, yükleme anında çalışan kod main.js'tedir)

Object.assign(PIX_FACES, {
    anchor:     { pal: { h: '#78350f', s: '#f1c27d', e: '#1f2937', m: '#be123c', b: '#fbbf24' },
                  rows: ['.hhhhhh.', 'hhhhhhhh', 'hssssssh', 'hesssesh', 'hssssssh', 'hssmmssh', 'hhssssh.', 'h.bbbb..'] },
    teacher:    { pal: { h: '#9ca3af', s: '#e0ac69', e: '#1f2937', g: '#111827', m: '#7c2d12' },
                  rows: ['hhhhhhhh', 'hssssssh', 'sgggsggs', 'sgesgegs', 'ssssssss', 'ssssssss', 'ssmmmmss', '.ssssss.'] },
    journalist: { pal: { h: '#1c1917', s: '#c68642', e: '#111827', m: '#7c2d12', b: '#292524' },
                  rows: ['hhhhhhhh', 'hhhhhhhh', 'ssssssss', 'sesssess', 'ssssssss', 'sbbbbbbs', 'sbmmmmbs', '.bbbbbb.'] }
});
Object.assign(STORY_CAST, {
    anchor:     { pix: 'anchor', suit: '#be123c', arm: '#be123c', leg: '#1f2937', shoe: '#000', hand: '#f1c27d' },
    teacher:    { pix: 'teacher', suit: '#9a3412', arm: '#9a3412', leg: '#44403c', shoe: '#000', hand: '#e0ac69', tie: '#1e3a8a' },
    journalist: { pix: 'journalist', suit: '#1d4ed8', arm: '#1d4ed8', leg: '#1f2937', shoe: '#000', hand: '#c68642' }
});

Object.assign(STORY_BG, {
    villa(c, time) {
        c.fillStyle = '#3b0764'; c.fillRect(0, 0, STORY_W, STORY_GROUND);
        for (let x = 0; x < STORY_W; x += 40) { c.fillStyle = (x / 40) % 2 ? '#4c1d95' : '#3b0764'; c.fillRect(x, 0, 40, STORY_GROUND); }
        // pencere: gece Boğazı
        c.fillStyle = '#facc15'; c.fillRect(96, 96, 248, 188);
        c.fillStyle = '#0b1026'; c.fillRect(104, 104, 232, 172);
        c.fillStyle = '#1e3a8a'; c.fillRect(104, 216, 232, 60);
        c.fillStyle = '#fde68a'; for (let i = 0; i < 12; i++) c.fillRect(110 + i * 19, 200 + (i % 3) * 4, 6, 6);
        c.fillStyle = '#facc15'; c.fillRect(216, 104, 8, 172); c.fillRect(104, 186, 232, 8);
        // altın çerçeveli tablo ve avize
        c.fillStyle = '#ca8a04'; c.fillRect(620, 100, 180, 130); c.fillStyle = '#166534'; c.fillRect(632, 112, 156, 106);
        c.fillStyle = '#fde047'; c.font = 'bold 48px monospace'; c.textAlign = 'center'; c.fillText('€', 710, 184);
        c.fillStyle = '#fde68a'; c.fillRect(470, 0, 8, 40); c.fillRect(430, 40, 88, 16);
        for (let i = 0; i < 5; i++) { c.fillStyle = Math.floor(time * 3 + i) % 2 ? '#fef9c3' : '#fde047'; c.fillRect(430 + i * 20, 56, 8, 12); }
        storyGround(c, '#92400e', '#78350f');
    },
    tv(c, time) {
        c.fillStyle = '#0c1445'; c.fillRect(0, 0, STORY_W, STORY_GROUND);
        for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#1e3a8a' : '#172554'; c.fillRect(i * 160, 40, 150, 90); c.fillStyle = 'rgba(96,165,250,0.4)'; c.fillRect(i * 160 + 10, 50, 130, 70); }
        c.fillStyle = '#dc2626'; c.fillRect(40, 150, 140, 40); c.fillStyle = '#fff'; c.font = 'bold 26px monospace'; c.textAlign = 'center';
        if (Math.floor(time * 2) % 2) c.fillText('● ' + storyT('live'), 110, 180);
        c.fillStyle = '#e5e7eb'; c.fillRect(0, 340, STORY_W, 30); c.fillStyle = '#b91c1c'; c.fillRect(0, 340, 260, 30);
        c.fillStyle = '#fff'; c.font = 'bold 18px monospace'; c.textAlign = 'left'; c.fillText(storyT('breaking'), 10, 362);
        c.save(); c.beginPath(); c.rect(262, 340, STORY_W - 262, 30); c.clip();
        c.fillStyle = '#111827'; c.fillText(storyT('ticker'), STORY_W - (time * 80) % (STORY_W + 300), 362);
        c.restore();
        storyGround(c, '#1f2937', '#111827');
    },
    coast(c, time) {
        storySky(c, ['#020617', '#0b1026', '#111a3a', '#1e2a5a']);
        blockStars(c, time); blockMoon(c, 140, 50);
        c.fillStyle = '#0b1a3d'; c.fillRect(0, 300, STORY_W, STORY_GROUND - 300);
        for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(226,232,240,0.4)'; c.fillRect(140 + Math.round(Math.sin(time * 2 + i) * 3) * 4, 308 + i * 16, 48 - i * 4, 4); }
        // otel
        c.fillStyle = '#1f2937'; c.fillRect(620, 140, 260, 160);
        for (let y = 156; y < 290; y += 28) for (let x = 636; x < 870; x += 32) { c.fillStyle = storyHash(x + y) > 0.4 ? '#fde68a' : '#111827'; c.fillRect(x, y, 16, 14); }
        // palmiye
        c.fillStyle = '#78350f'; for (let y = 260; y < STORY_GROUND; y += 20) c.fillRect(470 + Math.round((STORY_GROUND - y) / 60) * 4, y, 16, 20);
        c.fillStyle = '#166534'; [[-60, 0], [-30, -16], [0, -24], [30, -16], [60, 0]].forEach(([dx, dy]) => c.fillRect(486 + dx - 20, 252 + dy, 40, 12));
        storyGround(c, '#e7d7a7', '#c9b27a');
    },
    sky(c, time) {
        storySky(c, ['#0b1026', '#1e1b4b', '#312e81', '#4c1d95', '#701a75']);
        blockStars(c, time); blockMoon(c, 800, 40);
        for (let i = 0; i < 8; i++) {
            const x = ((storyHash(i) * 1200 - time * (60 + i * 20)) % 1200 + 1200) % 1200 - 120, y = 140 + storyHash(i + 3) * 340;
            c.fillStyle = 'rgba(203,213,225,0.35)'; c.fillRect(Math.floor(x / 8) * 8, Math.floor(y / 8) * 8, 120, 24); c.fillRect(Math.floor(x / 8) * 8 + 24, Math.floor(y / 8) * 8 - 16, 64, 16);
        }
        c.fillStyle = '#0b1222'; c.fillRect(0, STORY_GROUND + 40, STORY_W, STORY_H);
        for (let x = 0; x < STORY_W; x += 16) if (storyHash(x) > 0.5) { c.fillStyle = '#fde68a'; c.fillRect(x, STORY_GROUND + 50 + (x % 3) * 8, 4, 4); }
    },
    ankara(c, time) {
        storySky(c, ['#94a3b8', '#a8b5c7', '#cbd5e1', '#e2e8f0']);
        for (let i = 0; i < 4; i++) {
            const x = 20 + i * 240;
            c.fillStyle = '#94a3b8'; c.fillRect(x, 150, 210, STORY_GROUND - 150);
            c.fillStyle = '#cbd5e1'; c.fillRect(x - 8, 136, 226, 16);
            c.fillStyle = '#64748b'; for (let k = 0; k < 6; k++) c.fillRect(x + 14 + k * 34, 170, 12, STORY_GROUND - 170);
            c.fillStyle = '#b91c1c'; c.fillRect(x + 40, 190, 130, 36);
            c.fillStyle = '#fff'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText(i % 2 ? 'OHAL' : 'KHK', x + 105, 216);
        }
        for (let i = 0; i < 10; i++) {   // uçuşan kararnameler
            const x = (storyHash(i) * STORY_W + time * 30) % STORY_W, y = (storyHash(i + 7) * 300 + time * 40) % 360;
            c.fillStyle = '#fff'; c.fillRect(Math.floor(x / 4) * 4, Math.floor(y / 4) * 4, 16, 20);
            c.fillStyle = '#b91c1c'; c.fillRect(Math.floor(x / 4) * 4 + 4, Math.floor(y / 4) * 4 + 12, 8, 4);
        }
        storyGround(c, '#9ca3af', '#4b5563');
    },
    snow(c, time) {
        storySky(c, ['#475569', '#64748b', '#94a3b8', '#cbd5e1']);
        for (let i = 0; i < 9; i++) {   // çamlar
            const x = 20 + i * 110, h = 3 + (i % 3);
            for (let k = 0; k < h; k++) { c.fillStyle = '#14532d'; c.fillRect(x + k * 8, 300 + k * -28 + (h * 28 - 84), 64 - k * 16, 28); }
            c.fillStyle = '#f8fafc'; c.fillRect(x + (h - 1) * 8, 300 - (h - 1) * 28 + (h * 28 - 84), 64 - (h - 1) * 16, 6);
        }
        // kırmızı ahır
        c.fillStyle = '#991b1b'; c.fillRect(640, 260, 220, 180);
        for (let k = 0; k < 6; k++) { c.fillStyle = k === 5 ? '#f8fafc' : '#7f1d1d'; c.fillRect(640 + k * 18, 260 - k * 16, 220 - k * 36, 16); }
        c.fillStyle = '#fef2f2'; c.fillRect(712, 340, 76, 100); c.fillStyle = '#991b1b'; c.fillRect(720, 348, 60, 92);
        c.fillStyle = '#1e3a8a'; c.fillRect(560, 380, 36, 24); c.fillStyle = '#475569'; c.fillRect(574, 404, 8, 36);
        c.fillStyle = '#fff'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('USA', 578, 397);
        for (let i = 0; i < 60; i++) {   // kar
            const x = (storyHash(i) * STORY_W + Math.sin(time + i) * 10) % STORY_W, y = (storyHash(i + 5) * STORY_H + time * (30 + storyHash(i) * 40)) % STORY_GROUND;
            c.fillStyle = '#fff'; c.fillRect(Math.floor(x / 4) * 4, Math.floor(y / 4) * 4, 4, 4);
        }
        storyGround(c, '#f8fafc', '#cbd5e1');
    }
});

Object.assign(STORY_PROPS, {
    money(c) {
        for (let i = 0; i < 9; i++) { const x = 640 + (i % 3) * 52, y = STORY_GROUND - 28 - Math.floor(i / 3) * 28; blockRect(c, x, y, 48, 26, '#16a34a'); c.fillStyle = '#bbf7d0'; c.font = 'bold 16px monospace'; c.textAlign = 'center'; c.fillText('€', x + 24, y + 19); }
    },
    phone(c, time) {
        const x = 610, y = 170 + Math.round(Math.sin(time * 20)) * 2;
        blockRect(c, x, y, 40, 70, '#111827'); c.fillStyle = '#60a5fa'; c.fillRect(x + 6, y + 8, 28, 44);
        c.fillStyle = '#fbbf24'; c.font = 'bold 22px monospace'; c.textAlign = 'center';
        if (Math.floor(time * 4) % 2) c.fillText('☎', x + 20, y - 10);
    },
    counter(c, time) {
        const x = 420, y = STORY_GROUND - 120;
        blockRect(c, x, y, 150, 120, '#9ca3af');
        c.fillStyle = '#052e16'; c.fillRect(x + 16, y + 40, 118, 32);
        c.fillStyle = '#4ade80'; c.font = 'bold 22px monospace'; c.textAlign = 'center';
        c.fillText(String(Math.floor(time * 4321) % 1000000).padStart(6, '0'), x + 75, y + 64);
        for (let i = 0; i < 4; i++) { c.fillStyle = '#22c55e'; c.fillRect(x + 20 + i * 30, y - 20 - Math.abs(Math.sin(time * 8 + i)) * 16, 22, 24); }
    },
    tapes(c, time) {
        for (let i = 0; i < 7; i++) {
            const x = 80 + i * 130 + Math.sin(time * 2 + i) * 20, y = 180 + Math.sin(time * 3 + i * 2) * 60 + (i % 2) * 60;
            drawCassette(c, x, y);
        }
    },
    facetime(c, time) {
        const x = 540, y = 166, w = 190, h = 262;
        blockRect(c, x - 12, y - 12, w + 24, h + 24, '#111827', false);
        c.fillStyle = '#1e293b'; c.fillRect(x, y, w, h);
        const f = storyFace('recep');
        c.imageSmoothingEnabled = false;
        if (f) { const fw = w - 20, fh = fw * f.height / f.width; c.drawImage(f, x + 10, y + 30 + Math.sin(time * 6) * 3, fw, fh); }
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(x, y, w, 28);
        c.fillStyle = '#4ade80'; c.font = 'bold 16px monospace'; c.textAlign = 'left'; c.fillText('FaceTime', x + 8, y + 20);
        c.fillStyle = Math.floor(time * 3) % 2 ? '#ef4444' : '#7f1d1d'; c.fillRect(x + w - 44, y + 8, 36, 14);
        c.fillStyle = '#fff'; c.font = 'bold 11px monospace'; c.textAlign = 'center'; c.fillText('%3', x + w - 26, y + 19);
    },
    plane(c, time) {
        const x = 330 + Math.sin(time) * 30, y = 260 + Math.sin(time * 1.7) * 20;
        c.fillStyle = '#f8fafc'; c.fillRect(x, y, 260, 44);
        c.fillStyle = '#cbd5e1'; c.fillRect(x + 80, y + 40, 90, 16); c.fillRect(x + 90, y - 20, 70, 20);
        c.fillStyle = '#e30a17'; c.fillRect(x - 10, y - 40, 40, 44); c.fillStyle = '#fff'; c.fillRect(x + 4, y - 26, 12, 12);
        c.fillStyle = '#b91c1c'; c.fillRect(x, y + 22, 260, 6);
        c.fillStyle = '#1e3a8a'; for (let i = 0; i < 8; i++) c.fillRect(x + 60 + i * 20, y + 8, 10, 10);
        c.fillStyle = '#60a5fa'; c.fillRect(x + 224, y + 4, 28, 16);
        c.fillStyle = '#f97316'; c.fillRect(x - 24 - Math.floor(Math.random() * 3) * 8, y + 14, 24, 14);
    },
    jets(c, time) {
        for (let i = 0; i < 3; i++) {
            const x = 760 + i * 50 + Math.sin(time * 2 + i) * 20, y = 140 + i * 110 + Math.sin(time * 3 + i) * 16;
            c.fillStyle = '#64748b'; c.fillRect(x, y, 90, 16); c.fillRect(x + 30, y - 24, 30, 24); c.fillRect(x + 30, y + 16, 30, 20); c.fillRect(x + 76, y - 18, 14, 18);
            c.fillStyle = '#0ea5e9'; c.fillRect(x + 8, y + 2, 18, 8);
            c.fillStyle = '#fb923c'; c.fillRect(x + 90, y + 4, 12 + Math.floor(Math.random() * 2) * 8, 8);
        }
    },
    files(c) {
        [[60, 6], [120, 9], [800, 7], [860, 11]].forEach(([x, n]) => {
            for (let k = 0; k < n; k++) { c.fillStyle = k % 2 ? '#f8fafc' : '#e5e7eb'; c.fillRect(x, STORY_GROUND - 10 - k * 10, 52, 10); }
            c.fillStyle = '#b91c1c'; c.fillRect(x + 10, STORY_GROUND - n * 10 - 6, 32, 10);
        });
    },
    stampBig(c, time) {
        const p = (time * 1.2) % 1, drop = p < 0.3 ? p / 0.3 : 1, x = 480, y = 120 + drop * 150;
        c.fillStyle = '#7c4a1e'; c.fillRect(x - 10, y - 120, 20, 110); c.fillStyle = '#5c3a1a'; c.fillRect(x - 24, y - 140, 48, 24);
        c.fillStyle = '#1f2937'; c.fillRect(x - 70, y - 12, 140, 36); c.fillStyle = '#dc2626'; c.fillRect(x - 74, y + 22, 148, 14);
        if (p > 0.3) {
            c.fillStyle = `rgba(220,38,38,${1 - (p - 0.3)})`; c.font = 'bold 54px monospace'; c.textAlign = 'center';
            c.fillText('KHK', x, y + 96);
        }
    }
});

// --- HİKÂYELER ---
Object.assign(STORIES, {
    3: [
        { bg: 'villa', props: ['counter', 'money'], say: { key: 's3a' }, actors: [] },
        { bg: 'villa', props: ['phone', 'counter'], say: { who: 'recep', key: 's3b' },
          actors: [{ who: 'recep', x: 260, dir: 1, talk: true, wave: true }] },
        { bg: 'villa', props: ['phone', 'counter', 'money'], say: { who: 'phone', key: 's3c' },
          actors: [{ who: 'recep', x: 260, dir: 1, jump: true }] },
        { bg: 'city', props: ['tapes'], say: { key: 's3d' },
          actors: [{ who: 'recep', x: -100, to: 300, dir: 1 }, { who: 'police', x: 1060, to: 700, dir: -1 }] },
        { bg: 'card', card: { title: 'm3t', text: 'm3' } }
    ],
    4: [
        { bg: 'palace', sepia: true, say: { key: 's4a' },
          actors: [{ who: 'recep', x: 360, dir: 1, wave: true }, { who: 'feto', x: 560, dir: -1, wave: true }] },
        { bg: 'palace', sepia: true, say: { who: 'recep', key: 's4b' },
          actors: [{ who: 'recep', x: 360, dir: 1, talk: true }, { who: 'feto', x: 560, dir: -1, jump: true }] },
        { bg: 'city', say: { who: 'feto', key: 's4c' },
          actors: [{ who: 'feto', x: 1060, to: 620, dir: -1, talk: true }] },
        { bg: 'city', say: { who: 'recep', key: 's4d' },
          actors: [{ who: 'recep', x: -100, to: 300, dir: 1, talk: true, wave: true }, { who: 'feto', x: 620, dir: -1 }] },
        { bg: 'card', card: { title: 'm4t', text: 'm4' } }
    ],
    5: [
        { bg: 'coast', say: { key: 's5a' }, actors: [{ who: 'recep', x: 300, dir: 1 }] },
        { bg: 'coast', props: ['phone'], say: { who: 'recep', key: 's5b' }, actors: [{ who: 'recep', x: 300, dir: 1, jump: true, talk: true }] },
        { bg: 'tv', props: ['facetime'], say: { who: 'anchor', key: 's5c' }, actors: [{ who: 'anchor', x: 300, dir: 1, talk: true, wave: true }] },
        { bg: 'tv', props: ['facetime'], say: { who: 'recep', key: 's5d' }, actors: [{ who: 'anchor', x: 300, dir: 1, jump: true }] },
        { bg: 'card', card: { title: 'm5t', text: 'm5' } }
    ],
    6: [
        { bg: 'sky', props: ['plane'], say: { key: 's6a' } },
        { bg: 'sky', props: ['plane', 'jets'], say: { who: 'pilot', key: 's6b' } },
        { bg: 'sky', props: ['plane', 'jets'], say: { who: 'recep', key: 's6c' } },
        { bg: 'card', card: { title: 'm6t', text: 'm6' } }
    ],
    7: [
        { bg: 'ankara', props: ['files'], say: { who: 'recep', key: 's7a' }, actors: [{ who: 'recep', x: 440, dir: 1, talk: true, wave: true }] },
        { bg: 'ankara', props: ['files', 'stampBig'], say: { key: 's7b' }, actors: [] },
        { bg: 'ankara', props: ['files'], say: { who: 'civils', key: 's7c' },
          actors: [{ who: 'teacher', x: 380, dir: 1, jump: true }, { who: 'journalist', x: 560, dir: -1, talk: true, wave: true }] },
        { bg: 'ankara', props: ['files', 'stampBig'], say: { who: 'recep', key: 's7d' },
          actors: [{ who: 'recep', x: 200, dir: 1, talk: true }, { who: 'teacher', x: 640, to: 1100, dir: 1 }, { who: 'journalist', x: 760, to: 1150, dir: 1 }] },
        { bg: 'card', card: { title: 'm7t', text: 'm7' } }
    ],
    8: [
        { bg: 'snow', say: { key: 's8a' }, actors: [{ who: 'feto', x: 520, dir: -1 }] },
        { bg: 'snow', say: { who: 'feto', key: 's8b' }, actors: [{ who: 'feto', x: 520, dir: -1, talk: true, wave: true }] },
        { bg: 'snow', props: ['rain'], say: { who: 'recep', key: 's8c' },
          actors: [{ who: 'recep', x: -100, to: 260, dir: 1, talk: true }, { who: 'feto', x: 520, dir: -1, jump: true }] },
        { bg: 'card', card: { title: 'm8t', text: 'm8' } }
    ],
    end: [
        { bg: 'snow', say: { key: 'e1' }, actors: [{ who: 'recep', x: 300, dir: 1, wave: true }] },
        { bg: 'palace', props: ['rain'], say: { who: 'recep', key: 'e2' },
          actors: [{ who: 'g1', x: 120, dir: 1, jump: true }, { who: 'g2', x: 230, dir: 1 }, { who: 'recep', x: 400, dir: 1, talk: true, wave: true },
                   { who: 'sarraf', x: 560, dir: -1, wave: true }, { who: 'g3', x: 690, dir: -1 }, { who: 'g4', x: 810, dir: -1, jump: true }] },
        { bg: 'palace', props: ['rain'], say: { who: 'gang', key: 'e3' },
          actors: [{ who: 'g1', x: 120, dir: 1, jump: true }, { who: 'g2', x: 230, dir: 1, jump: true, talk: true }, { who: 'recep', x: 400, dir: 1, wave: true },
                   { who: 'sarraf', x: 560, dir: -1, jump: true }, { who: 'g3', x: 690, dir: -1, jump: true, talk: true }, { who: 'g4', x: 810, dir: -1, jump: true }] },
        { bg: 'card', card: { title: 'eT', text: 'e4', go: 'endGo' } }
    ]
});

const STORY_TEXT2 = {
    tr: { flashback: 'YILLAR ÖNCE...', live: 'CANLI', breaking: 'SON DAKİKA', ticker: 'Köprüde tanklar... Cumhurbaşkanı canlı yayında...',
          anchor: 'SPİKER', pilot: 'PİLOT', civils: 'SİVİLLER', endGo: 'BİTİR ▶',
          s3a: '25 Aralık gecesi. Villada para sayma makineleri hiç susmuyor...',
          s3b: 'Alo oğlum! Evdeki bütün paraları sıfırla!',
          s3c: 'Babacığım... hâlâ 30 milyon avro kaldı!',
          s3d: 'Ama bütün konuşmalar kasetlere kaydedilmiş ve şehre saçılmış!',
          m3t: 'GÖREV 3: PARALARI SIFIRLA', m3: 'Kasetleri topla (hepsi montaj!), polisleri rüşvetle sustur, DEV ÇELİK KASA\'yı patlat: kapağı açılınca vur!',
          s4a: 'HIRHIZ ile FETÖ bir zamanlar can ciğer kuzu sarmasıydı...',
          s4b: 'Ne istediler de vermedik? Okul, dershane, polis, hâkim...',
          s4c: 'Bu gece askerlerim köprüleri kesecek! Hehehe...',
          s4d: 'Bu bir lütuftur! Darbecileri tek tek toplayacağız!',
          m4t: 'GÖREV 4: 15 TEMMUZ', m4: 'Darbeci askerleri ve askeri öğrencileri yen: hepsi tutuklanıp götürülür! Sonunda FETÖ\'yle hasret giderilecek...',
          s5a: '15 Temmuz 2016 gecesi, Marmaris. Reis tatilde...',
          s5b: 'Ne?! Tanklar köprüde mi? Çabuk bir televizyon bulun!',
          s5c: 'Sayın seyirciler... Cumhurbaşkanı bize FaceTime ile bağlandı!',
          s5d: 'Herkes sokağa! ...Bir de şarj aleti getirin, %3 kaldı!',
          m5t: 'GÖREV 5: ŞARJ BİTMESİN!', m5: 'Telefonun şarjı azalıyor! Şarj aletlerini topla, tankları rüşvetle teslim al, DARBE TANKI\'nı durdur!',
          s6a: 'Gece yarısı, Marmaris. Telefon çaldı: arayan enişte! \'Darbe var!\'',
          s6b: 'Reis, darbeci jetler peşimizde!',
          s6c: 'Rüşvet zarflarını pencereden atın!',
          m6t: 'GÖREV 6: DARBE PLANINI ENİŞTEDEN ÖĞREN!', m6: 'Enişte haber verdi, uçak havada! Joystick ile her yöne uç, ZIPLA ile yüksel, zarf at, 12 jeti geri çevir, TANKER UÇAK\'ı indir!',
          s7a: 'Bu darbe bize Allah\'ın lütfu!',
          s7b: 'OHAL ilan edildi. Balyozun yerini KHK damgası aldı...',
          s7c: 'Ama biz öğretmeniz! Gazeteciyiz! Akademisyeniz!',
          s7d: 'Damga herkese yeter!',
          m7t: 'GÖREV 7: BYLOCK\'U KIR', m7: 'Damga hazır ama liste yok! BYLOCK\'un şifresini kır, liste çıksın: herkes ihraç!',
          s8a: 'Pensilvanya, Saylorsburg. FETÖ karlı bir çiftlikte saklanıyor...',
          s8b: 'Burası Amerika! Beni kimse iade edemez! Hehehe...',
          s8c: 'İade dosyasını getirdim! ...Pardon, bu rüşvet zarfıymış.',
          m8t: 'GÖREV 8: PENSİLVANYA', m8: 'Karlı çiftlikte polisleri geç, FETÖ\'yle son kez karşılaş!',
          e1: 'FETÖ yenildi... ama iade dosyası hâlâ yolda.',
          e2: 'Dosyalar kapandı, kasetler montaj, sandık bizde!',
          e3: 'Yaşasın Reis! Ayakkabı kutularımız geri geldi!',
          eT: 'DEVAM EDECEK...', e4: 'Ve hepsi kul hakkıyla mutlu mesut yaşadılar... ya da öyle sandılar. Ama hikâye bitmedi: yeni bölümler yolda!' },
    en: { flashback: 'YEARS AGO...', live: 'LIVE', breaking: 'BREAKING', ticker: 'Tanks on the bridge... The president is live on air...',
          anchor: 'ANCHOR', pilot: 'PILOT', civils: 'CIVILIANS', endGo: 'FINISH ▶',
          s3a: 'The night of December 25. The money counters in the villa never stop...',
          s3b: 'Hello son! Zero out all the money in the house!',
          s3c: 'Daddy... there\'s still 30 million euros left!',
          s3d: 'But every call was taped, and the tapes are all over the city!',
          m3t: 'MISSION 3: ZERO THE MONEY', m3: 'Collect the tapes (they\'re all fake!), bribe the police, crack the GIANT STEEL SAFE: hit it when its door opens!',
          s4a: 'HIRHIZ and FETÖ were once the best of friends...',
          s4b: 'What did they ever ask for that we didn\'t give? Schools, police, judges...',
          s4c: 'Tonight my soldiers will block the bridges! Hehehe...',
          s4d: 'This is a gift from God! We\'ll round up the plotters one by one!',
          m4t: 'MISSION 4: JULY 15', m4: 'Beat the coup soldiers and military cadets: they all get arrested and taken away! At the end, a long-awaited reunion with FETÖ...',
          s5a: 'Night of July 15, 2016, Marmaris. The boss is on holiday...',
          s5b: 'What?! Tanks on the bridge? Quick, find a TV!',
          s5c: 'Dear viewers... the president has joined us via FaceTime!',
          s5d: 'Everyone to the streets! ...And bring a charger, I\'m at 3%!',
          m5t: 'MISSION 5: DON\'T LET IT DIE!', m5: 'The phone battery is draining! Grab chargers, bribe the tanks into surrender, stop the COUP TANK!',
          s6a: 'Midnight, Marmaris. The phone rings: it\'s the brother-in-law! \'It\'s a coup!\'',
          s6b: 'Boss, coup jets are on our tail!',
          s6c: 'Throw the bribe envelopes out the window!',
          m6t: 'MISSION 6: LEARN THE COUP PLAN FROM THE BROTHER-IN-LAW!', m6: 'The brother-in-law tipped you off, the plane is airborne! Fly in any direction with the joystick, JUMP to climb, throw envelopes, turn back 12 jets, down the TANKER PLANE!',
          s7a: 'This coup is a gift from God!',
          s7b: 'A state of emergency is declared. The hammer is replaced by the decree stamp...',
          s7c: 'But we\'re teachers! Journalists! Academics!',
          s7d: 'There\'s enough stamp for everyone!',
          m7t: 'MISSION 7: CRACK BYLOCK', m7: 'The stamp is ready but there\'s no list! Crack the BYLOCK code, get the list: purge everyone!',
          s8a: 'Saylorsburg, Pennsylvania. FETÖ hides on a snowy farm...',
          s8b: 'This is America! Nobody can extradite me! Hehehe...',
          s8c: 'I brought the extradition file! ...Oops, that\'s a bribe envelope.',
          m8t: 'MISSION 8: PENNSYLVANIA', m8: 'Get past the police on the snowy farm and face FETÖ one last time!',
          e1: 'FETÖ is beaten... but the extradition file is still on its way.',
          e2: 'Cases closed, tapes fake, ballot box ours!',
          e3: 'Long live the boss! Our shoe boxes are back!',
          eT: 'TO BE CONTINUED...', e4: 'And they all lived happily ever after on the people\'s due... or so they thought. But the story isn\'t over: new levels are on the way!' },
    fr: { flashback: 'IL Y A DES ANNÉES...', live: 'DIRECT', breaking: 'FLASH INFO', ticker: 'Des chars sur le pont... Le président en direct...',
          anchor: 'PRÉSENTATRICE', pilot: 'PILOTE', civils: 'CIVILS', endGo: 'TERMINER ▶',
          s3a: 'La nuit du 25 décembre. Les compteuses de la villa ne s\'arrêtent jamais...',
          s3b: 'Allô fiston ! Fais disparaître tout l\'argent de la maison !',
          s3c: 'Papa... il reste encore 30 millions d\'euros !',
          s3d: 'Mais tous les appels ont été enregistrés et les cassettes inondent la ville !',
          m3t: 'MISSION 3 : REMETS L\'ARGENT À ZÉRO', m3: 'Ramasse les cassettes (toutes des montages !), soudoie la police, fais sauter le COFFRE-FORT GÉANT : frappe quand sa porte s\'ouvre !',
          s4a: 'HIRHIZ et FETÖ étaient autrefois les meilleurs amis du monde...',
          s4b: 'Qu\'ont-ils demandé qu\'on ne leur ait pas donné ? Écoles, police, juges...',
          s4c: 'Cette nuit, mes soldats bloquent les ponts ! Héhéhé...',
          s4d: 'C\'est un don de Dieu ! On va ramasser les putschistes un par un !',
          m4t: 'MISSION 4 : 15 JUILLET', m4: 'Bats les soldats putschistes et les élèves officiers : ils sont tous arrêtés et emmenés ! À la fin, des retrouvailles tant attendues avec FETÖ...',
          s5a: 'Nuit du 15 juillet 2016, Marmaris. Le chef est en vacances...',
          s5b: 'Quoi ?! Des chars sur le pont ? Vite, trouvez une télé !',
          s5c: 'Chers téléspectateurs... le président nous rejoint par FaceTime !',
          s5d: 'Tous dans la rue ! ...Et apportez un chargeur, il me reste 3 % !',
          m5t: 'MISSION 5 : GARDE LA BATTERIE !', m5: 'La batterie baisse ! Ramasse des chargeurs, achète la reddition des chars, arrête le TANK DU PUTSCH !',
          s6a: 'Minuit, Marmaris. Le téléphone sonne : c\'est le beau-frère ! « C\'est un putsch ! »',
          s6b: 'Chef, des jets putschistes nous poursuivent !',
          s6c: 'Jetez les enveloppes par la fenêtre !',
          m6t: 'MISSION 6 : APPRENDS LE PLAN DU PUTSCH PAR LE BEAU-FRÈRE !', m6: 'Le beau-frère t\'a prévenu, l\'avion a décollé ! Vole dans tous les sens au joystick, SAUTE pour monter, lance des enveloppes, repousse 12 jets, abats le RAVITAILLEUR !',
          s7a: 'Ce putsch est un don de Dieu !',
          s7b: 'L\'état d\'urgence est déclaré. Le marteau est remplacé par le tampon des décrets...',
          s7c: 'Mais nous sommes profs ! Journalistes ! Universitaires !',
          s7d: 'Il y a du tampon pour tout le monde !',
          m7t: 'MISSION 7 : CASSE BYLOCK', m7: 'Le tampon est prêt mais pas de liste ! Casse le code BYLOCK, sors la liste : tout le monde radié !',
          s8a: 'Saylorsburg, Pennsylvanie. FETÖ se cache dans une ferme enneigée...',
          s8b: 'Ici c\'est l\'Amérique ! Personne ne peut m\'extrader ! Héhéhé...',
          s8c: 'J\'apporte le dossier d\'extradition ! ...Oups, c\'est une enveloppe.',
          m8t: 'MISSION 8 : PENNSYLVANIE', m8: 'Passe la police dans la ferme enneigée et affronte FETÖ une dernière fois !',
          e1: 'FETÖ est vaincu... mais le dossier d\'extradition est toujours en route.',
          e2: 'Affaires classées, cassettes truquées, l\'urne est à nous !',
          e3: 'Vive le chef ! Nos boîtes à chaussures sont de retour !',
          eT: 'À SUIVRE...', e4: 'Et ils vécurent heureux grâce au bien d\'autrui... du moins le croyaient-ils. Mais l\'histoire n\'est pas finie : de nouveaux niveaux arrivent !' },
    nl: { flashback: 'JAREN GELEDEN...', live: 'LIVE', breaking: 'BREAKING', ticker: 'Tanks op de brug... De president live in beeld...',
          anchor: 'PRESENTATRICE', pilot: 'PILOOT', civils: 'BURGERS', endGo: 'AFSLUITEN ▶',
          s3a: 'De nacht van 25 december. De geldtelmachines in de villa staan nooit stil...',
          s3b: 'Hallo zoon! Laat al het geld in huis verdwijnen!',
          s3c: 'Papa... er is nog 30 miljoen euro over!',
          s3d: 'Maar alle gesprekken zijn opgenomen en de banden liggen door de hele stad!',
          m3t: 'MISSIE 3: ZET HET GELD OP NUL', m3: 'Verzamel de banden (allemaal montage!), koop de politie om, kraak de REUZENKLUIS: sla toe als de deur opengaat!',
          s4a: 'HIRHIZ en FETÖ waren ooit de beste vrienden...',
          s4b: 'Wat vroegen ze dat we niet gaven? Scholen, politie, rechters...',
          s4c: 'Vannacht blokkeren mijn soldaten de bruggen! Hehehe...',
          s4d: 'Dit is een geschenk van God! We pakken de coupplegers één voor één op!',
          m4t: 'MISSIE 4: 15 JULI', m4: 'Versla de coupsoldaten en militaire cadetten: ze worden allemaal gearresteerd en afgevoerd! Aan het eind een lang verwacht weerzien met FETÖ...',
          s5a: 'Nacht van 15 juli 2016, Marmaris. De baas is op vakantie...',
          s5b: 'Wat?! Tanks op de brug? Snel, zoek een tv!',
          s5c: 'Beste kijkers... de president is via FaceTime verbonden!',
          s5d: 'Iedereen de straat op! ...En breng een oplader, ik zit op 3%!',
          m5t: 'MISSIE 5: HOU DE BATTERIJ VOL!', m5: 'De batterij loopt leeg! Pak opladers, koop de tanks om, stop de COUPTANK!',
          s6a: 'Middernacht, Marmaris. De telefoon gaat: het is de zwager! \'Er is een coup!\'',
          s6b: 'Baas, couppiloten zitten achter ons aan!',
          s6c: 'Gooi de enveloppen uit het raam!',
          m6t: 'MISSIE 6: HOOR HET COUPPLAN VAN DE ZWAGER!', m6: 'De zwager waarschuwde je, het vliegtuig is in de lucht! Vlieg alle kanten op met de joystick, SPRING om te stijgen, gooi enveloppen, stuur 12 jets terug, haal het TANKVLIEGTUIG neer!',
          s7a: 'Deze coup is een geschenk van God!',
          s7b: 'De noodtoestand is uitgeroepen. De moker is vervangen door het decreetstempel...',
          s7c: 'Maar wij zijn leraren! Journalisten! Academici!',
          s7d: 'Er is stempel genoeg voor iedereen!',
          m7t: 'MISSIE 7: KRAAK BYLOCK', m7: 'De stempel is klaar, maar er is geen lijst! Kraak de BYLOCK-code, krijg de lijst: iedereen ontslagen!',
          s8a: 'Saylorsburg, Pennsylvania. FETÖ verstopt zich op een besneeuwde boerderij...',
          s8b: 'Dit is Amerika! Niemand kan mij uitleveren! Hehehe...',
          s8c: 'Ik heb het uitleveringsdossier! ...Oeps, dat is een envelop.',
          m8t: 'MISSIE 8: PENNSYLVANIA', m8: 'Kom langs de politie op de besneeuwde boerderij en versla FETÖ voor de laatste keer!',
          e1: 'FETÖ is verslagen... maar het uitleveringsdossier is nog onderweg.',
          e2: 'Dossiers gesloten, banden vals, de stembus is van ons!',
          e3: 'Leve de baas! Onze schoenendozen zijn terug!',
          eT: 'WORDT VERVOLGD...', e4: 'En ze leefden nog lang en gelukkig van andermans geld... dachten ze. Maar het verhaal is nog niet voorbij: er komen nieuwe levels aan!' },
    de: { flashback: 'VOR JAHREN...', live: 'LIVE', breaking: 'EILMELDUNG', ticker: 'Panzer auf der Brücke... Der Präsident live auf Sendung...',
          anchor: 'MODERATORIN', pilot: 'PILOT', civils: 'ZIVILISTEN', endGo: 'BEENDEN ▶',
          s3a: 'Die Nacht des 25. Dezember. Die Geldzählmaschinen in der Villa stehen nie still...',
          s3b: 'Hallo Sohn! Lass alles Geld im Haus verschwinden!',
          s3c: 'Papa... es sind immer noch 30 Millionen Euro übrig!',
          s3d: 'Aber alle Gespräche wurden aufgenommen, und die Bänder liegen in der ganzen Stadt!',
          m3t: 'MISSION 3: SETZ DAS GELD AUF NULL', m3: 'Sammle die Bänder (alles Montage!), besteche die Polizei, knack den RIESEN-TRESOR: schlag zu, wenn die Tür aufgeht!',
          s4a: 'HIRHIZ und FETÖ waren einst die besten Freunde...',
          s4b: 'Was wollten sie, das wir nicht gegeben haben? Schulen, Polizei, Richter...',
          s4c: 'Heute Nacht sperren meine Soldaten die Brücken! Hehehe...',
          s4d: 'Das ist ein Geschenk Gottes! Wir sammeln die Putschisten einzeln ein!',
          m4t: 'MISSION 4: 15. JULI', m4: 'Besiege die Putschsoldaten und Militärkadetten: Alle werden verhaftet und abgeführt! Am Ende ein lang ersehntes Wiedersehen mit FETÖ...',
          s5a: 'Nacht des 15. Juli 2016, Marmaris. Der Chef ist im Urlaub...',
          s5b: 'Was?! Panzer auf der Brücke? Schnell, sucht einen Fernseher!',
          s5c: 'Liebe Zuschauer... der Präsident ist per FaceTime zugeschaltet!',
          s5d: 'Alle auf die Straße! ...Und bringt ein Ladegerät, ich hab 3%!',
          m5t: 'MISSION 5: AKKU NICHT LEER!', m5: 'Der Akku wird leer! Sammle Ladegeräte, besteche die Panzer zur Kapitulation, stopp den PUTSCH-PANZER!',
          s6a: 'Mitternacht, Marmaris. Das Telefon klingelt: der Schwager! \'Es ist ein Putsch!\'',
          s6b: 'Chef, Putsch-Jets sind hinter uns her!',
          s6c: 'Werft die Umschläge aus dem Fenster!',
          m6t: 'MISSION 6: ERFAHRE DEN PUTSCHPLAN VOM SCHWAGER!', m6: 'Der Schwager hat dich gewarnt, das Flugzeug ist in der Luft! Flieg mit dem Joystick in jede Richtung, SPRINGEN zum Steigen, wirf Umschläge, schick 12 Jets zurück, hol das TANKFLUGZEUG runter!',
          s7a: 'Dieser Putsch ist ein Geschenk Gottes!',
          s7b: 'Der Ausnahmezustand ist ausgerufen. Der Hammer wurde durch den Dekretstempel ersetzt...',
          s7c: 'Aber wir sind Lehrer! Journalisten! Akademiker!',
          s7d: 'Der Stempel reicht für alle!',
          m7t: 'MISSION 7: KNACK BYLOCK', m7: 'Der Stempel ist bereit, aber es gibt keine Liste! Knack den BYLOCK-Code, hol die Liste: alle entlassen!',
          s8a: 'Saylorsburg, Pennsylvania. FETÖ versteckt sich auf einer verschneiten Farm...',
          s8b: 'Das ist Amerika! Niemand kann mich ausliefern! Hehehe...',
          s8c: 'Ich bringe die Auslieferungsakte! ...Ups, das ist ein Umschlag.',
          m8t: 'MISSION 8: PENNSYLVANIA', m8: 'Komm an der Polizei auf der verschneiten Farm vorbei und stell dich FETÖ ein letztes Mal!',
          e1: 'FETÖ ist besiegt... aber die Auslieferungsakte ist immer noch unterwegs.',
          e2: 'Akten geschlossen, Bänder gefälscht, die Urne gehört uns!',
          e3: 'Es lebe der Chef! Unsere Schuhkartons sind zurück!',
          eT: 'FORTSETZUNG FOLGT...', e4: 'Und sie lebten glücklich bis ans Ende ihrer Tage vom Geld anderer... dachten sie. Aber die Geschichte ist nicht vorbei: Neue Level sind unterwegs!' },
    ru: { flashback: 'МНОГО ЛЕТ НАЗАД...', live: 'ЭФИР', breaking: 'СРОЧНО', ticker: 'Танки на мосту... Президент в прямом эфире...',
          anchor: 'ВЕДУЩАЯ', pilot: 'ПИЛОТ', civils: 'ГРАЖДАНЕ', endGo: 'ЗАВЕРШИТЬ ▶',
          s3a: 'Ночь 25 декабря. Счётные машинки на вилле не умолкают...',
          s3b: 'Алло, сынок! Обнули все деньги в доме!',
          s3c: 'Папочка... осталось ещё 30 миллионов евро!',
          s3d: 'Но все разговоры записаны, и кассеты разлетелись по городу!',
          m3t: 'МИССИЯ 3: ОБНУЛИ ДЕНЬГИ', m3: 'Собери кассеты (всё монтаж!), подкупи полицию, взломай ГИГАНТСКИЙ СЕЙФ: бей, когда откроется дверца!',
          s4a: 'Когда-то HIRHIZ и ФЕТÖ были лучшими друзьями...',
          s4b: 'Чего они просили, а мы не дали? Школы, полицию, судей...',
          s4c: 'Этой ночью мои солдаты перекроют мосты! Хе-хе-хе...',
          s4d: 'Это дар Божий! Мы переловим путчистов одного за другим!',
          m4t: 'МИССИЯ 4: 15 ИЮЛЯ', m4: 'Победи солдат-путчистов и курсантов: всех арестуют и уведут! А в конце — долгожданная встреча с ФЕТÖ...',
          s5a: 'Ночь 15 июля 2016 года, Мармарис. Шеф в отпуске...',
          s5b: 'Что?! Танки на мосту? Быстро найдите телевизор!',
          s5c: 'Дорогие зрители... президент на связи по FaceTime!',
          s5d: 'Все на улицы! ...И принесите зарядку, у меня 3%!',
          m5t: 'МИССИЯ 5: НЕ ДАЙ СЕСТЬ БАТАРЕЕ!', m5: 'Батарея садится! Собирай зарядки, подкупи танки, останови ТАНК ПУТЧА!',
          s6a: 'Полночь, Мармарис. Звонок: это зять! «Переворот!»',
          s6b: 'Шеф, за нами гонятся путчистские истребители!',
          s6c: 'Бросайте конверты со взятками в окно!',
          m6t: 'МИССИЯ 6: УЗНАЙ О ПЛАНЕ ПЕРЕВОРОТА ОТ ЗЯТЯ!', m6: 'Зять предупредил, самолёт в воздухе! Лети в любую сторону джойстиком, ПРЫЖОК — вверх, бросай конверты, разверни 12 истребителей, сбей ЗАПРАВЩИК!',
          s7a: 'Этот путч — дар Божий!',
          s7b: 'Объявлено чрезвычайное положение. Кувалду сменила печать указов...',
          s7c: 'Но мы учителя! Журналисты! Учёные!',
          s7d: 'Печати хватит на всех!',
          m7t: 'МИССИЯ 7: ВЗЛОМАЙ BYLOCK', m7: 'Штамп готов, но списка нет! Взломай код BYLOCK, получи список: уволить всех!',
          s8a: 'Сейлорсберг, Пенсильвания. ФЕТÖ прячется на заснеженной ферме...',
          s8b: 'Это Америка! Меня никто не выдаст! Хе-хе-хе...',
          s8c: 'Я привёз запрос об экстрадиции! ...Ой, это конверт со взяткой.',
          m8t: 'МИССИЯ 8: ПЕНСИЛЬВАНИЯ', m8: 'Пройди полицию на заснеженной ферме и сразись с ФЕТÖ в последний раз!',
          e1: 'ФЕТÖ побеждён... но запрос об экстрадиции всё ещё в пути.',
          e2: 'Дела закрыты, записи — монтаж, урна наша!',
          e3: 'Да здравствует шеф! Наши обувные коробки вернулись!',
          eT: 'ПРОДОЛЖЕНИЕ СЛЕДУЕТ...', e4: 'И жили они долго и счастливо за чужой счёт... по крайней мере, так им казалось. Но история не окончена: новые уровни уже в пути!' }
};
for (const L in STORY_TEXT2) Object.assign(STORY_TEXT[L], STORY_TEXT2[L]);

// ===== js/selo.js (HİKÂYE) =====
// --- HİKÂYE ---
Object.assign(PIX_FACES, {
    selo: { pal: { h: '#1c1917', s: '#e0ac69', e: '#111827', k: '#44403c', b: '#a47148', w: '#fff', m: '#7f1d1d' },
            rows: ['.hhhhhh.', 'hhhhhhhh', 'hssssssh', 'skksskks', 'sesssess', 'ssssssss', 'bmwwwwmb', '.bsmmsb.'] }
});
Object.assign(STORY_CAST, {
    selo: { pix: 'selo', suit: '#1e293b', arm: '#1e293b', leg: '#111827', shoe: '#3f2a1d', hand: '#e0ac69', tie: '#f8fafc', saz: true }
});
Object.assign(STORY_BG, {
    // 2015 seçim gecesi mitingi: kalabalık, bayraklar, "%13" pankartı
    rally(c, time) {
        storySky(c, ['#0b1026', '#1e1b4b', '#4c1d95', '#7c3aed']);
        blockStars(c, time);
        for (let i = 0; i < 6; i++) {   // ışık huzmeleri
            c.fillStyle = `rgba(253,224,71,${0.06 + 0.04 * Math.sin(time * 2 + i)})`;
            const x = 80 + i * 160; c.beginPath(); c.moveTo(x, STORY_GROUND); c.lineTo(x - 60 + Math.sin(time + i) * 40, 0); c.lineTo(x + 60 + Math.sin(time + i) * 40, 0); c.fill();
        }
        blockRect(c, 300, 60, 360, 90, '#fbbf24');
        c.fillStyle = '#4c1d95'; c.font = 'bold 64px monospace'; c.textAlign = 'center'; c.fillText('%13', 480, 130);
        for (let i = 0; i < 24; i++) {   // zıplayan kalabalık
            const x = i * 40 + (i % 2) * 10, j = Math.abs(Math.sin(time * 5 + i)) * 10;
            c.fillStyle = ['#1f2937', '#312e81', '#374151'][i % 3]; c.fillRect(x, STORY_GROUND - 70 - j, 32, 70 + j);
            c.fillStyle = '#e0ac69'; c.fillRect(x + 6, STORY_GROUND - 92 - j, 20, 20);
            if (i % 4 === 1) { c.fillStyle = ['#16a34a', '#facc15', '#dc2626'][i % 3]; c.fillRect(x + 14, STORY_GROUND - 140 - j, 26, 18); c.fillStyle = '#9ca3af'; c.fillRect(x + 12, STORY_GROUND - 140 - j, 3, 50); }
        }
        storyGround(c, '#374151', '#1f2937');
    },
    // Edirne F tipi cezaevi
    prison(c, time) {
        storySky(c, ['#1e293b', '#334155', '#64748b', '#94a3b8']);
        c.fillStyle = '#a8a29e'; c.fillRect(0, 150, STORY_W, STORY_GROUND - 150);
        for (let x = 0; x < STORY_W; x += 64) { c.fillStyle = '#78716c'; c.fillRect(x, 150, 4, STORY_GROUND - 150); }
        c.strokeStyle = '#1c1917'; c.lineWidth = 3;
        for (let x = 0; x < STORY_W; x += 32) { c.beginPath(); c.arc(x, 134, 12, 0, Math.PI * 2); c.stroke(); }
        blockRect(c, 40, 40, 70, 110, '#57534e'); blockRect(c, 24, 20, 102, 30, '#44403c');
        c.fillStyle = Math.floor(time * 2) % 2 ? '#fde68a' : '#fbbf24'; c.fillRect(44, 30, 62, 12);
        blockRect(c, 150, 180, 240, 44, '#1e3a8a');
        c.fillStyle = '#fff'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText(bgT('EDİRNE F TİPİ'), 270, 210);
        storyGround(c, '#57534e', '#44403c');
    }
});
Object.assign(STORY_PROPS, {
    aihm(c, time) {   // gökten AİHM kararları süzülür
        for (let i = 0; i < 8; i++) {
            const x = 60 + storyHash(i + 11) * 840 + Math.sin(time * 2 + i) * 20, y = ((time * 70 + storyHash(i + 5) * 500) % 520) - 40;
            c.fillStyle = '#f8fafc'; c.fillRect(x, y, 36, 46); c.fillStyle = '#1d4ed8'; c.fillRect(x, y, 36, 12);
            c.fillStyle = '#1e3a8a'; c.font = 'bold 10px monospace'; c.textAlign = 'center'; c.fillText('AİHM', x + 18, y + 26);
        }
    }
});
STORIES[9] = [
    { bg: 'rally', say: { key: 's9a' }, actors: [{ who: 'selo', x: 480, dir: 1, wave: true }] },
    { bg: 'rally', say: { who: 'selo', key: 's9b' }, actors: [{ who: 'selo', x: 480, dir: 1, talk: true, jump: true }] },
    { bg: 'palace', say: { who: 'recep', key: 's9c' }, actors: [{ who: 'recep', x: 420, dir: 1, talk: true, jump: true }] },
    { bg: 'prison', props: ['bars'], say: { who: 'selo', key: 's9d' }, actors: [{ who: 'selo', x: 690, dir: -1, talk: true, wave: true }] },
    { bg: 'prison', props: ['aihm', 'bars'], say: { who: 'recep', key: 's9e' },
      actors: [{ who: 'recep', x: -100, to: 260, dir: 1, talk: true }, { who: 'selo', x: 690, dir: -1 }] },
    { bg: 'card', card: { title: 'm9t', text: 'm9' } }
];
// Oyun sonu artık 9. bölümden sonra: ilk sahnede Selo hücresinden el sallar
STORIES.end[0] = { bg: 'prison', props: ['bars'], say: { key: 'e1' }, actors: [{ who: 'recep', x: 260, dir: 1, wave: true }, { who: 'selo', x: 690, dir: -1, wave: true }] };

const SELO_STORY = {
    tr: { selo: 'SELO',
          s9a: '7 Haziran 2015. Selo\'nun partisi %13 aldı, meclise girdi. Meydanlar bayram yeri...',
          s9b: 'SENİ BAŞKAN YAPTIRMAYACAĞIZ!',
          s9c: 'Ne dedi o?! Dokunulmazlıkları kaldırın! Hemen içeri!',
          s9d: 'Burada da kitap yazarım, resim yaparım. AİHM "derhal serbest bırakın" dedi bile!',
          s9e: 'AİHM kararı bizi bağlamaz! Tanımıyoruz!',
          m9t: 'GÖREV 9: SELO\'YU İÇERİ AT', m9: 'Edirne\'de polisleri geç, kapıdan gir, SELO\'yu yen ve hücreye tık! Gökten AİHM kararları yağıyor: kalkanı kaldır!',
          e1: 'FETÖ yenildi, Selo içeride... ama iade dosyası da AİHM kararı da hâlâ yolda.' },
    en: { selo: 'SELO',
          s9a: 'June 7, 2015. Selo\'s party won 13% and entered parliament. The squares are partying...',
          s9b: 'WE WILL NOT MAKE YOU PRESIDENT!',
          s9c: 'What did he say?! Strip their immunity! Lock him up, now!',
          s9d: 'I\'ll write books and paint in here too. The ECHR already said "release him immediately"!',
          s9e: 'ECHR rulings don\'t bind us! We don\'t recognise them!',
          m9t: 'MISSION 9: LOCK UP SELO', m9: 'Get past the police in Edirne, go through the gate, beat SELO and lock him in a cell! ECHR rulings rain from the sky: raise your shield!',
          e1: 'FETÖ is beaten, Selo is behind bars... but the extradition file and the ECHR ruling are still on their way.' },
    fr: { selo: 'SELO',
          s9a: '7 juin 2015. Le parti de Selo obtient 13 % et entre au parlement. Les places sont en fête...',
          s9b: 'NOUS NE TE LAISSERONS PAS DEVENIR PRÉSIDENT !',
          s9c: 'Qu\'est-ce qu\'il a dit ?! Levez leur immunité ! En prison, tout de suite !',
          s9d: 'Ici aussi j\'écris des livres et je peins. La CEDH a déjà dit « libérez-le immédiatement » !',
          s9e: 'Les arrêts de la CEDH ne nous engagent pas ! On ne les reconnaît pas !',
          m9t: 'MISSION 9 : ENFERME SELO', m9: 'Passe la police à Edirne, franchis la porte, bats SELO et mets-le en cellule ! Les arrêts de la CEDH tombent du ciel : lève ton bouclier !',
          e1: 'FETÖ est battu, Selo est en prison... mais l\'extradition et l\'arrêt de la CEDH sont toujours en route.' },
    nl: { selo: 'SELO',
          s9a: '7 juni 2015. Selo\'s partij haalt 13% en komt in het parlement. Feest op de pleinen...',
          s9b: 'WIJ ZULLEN JOU GEEN PRESIDENT LATEN WORDEN!',
          s9c: 'Wat zei hij?! Hef hun immuniteit op! Sluit hem op, nu!',
          s9d: 'Ook hier schrijf ik boeken en schilder ik. Het EHRM zei al "laat hem meteen vrij"!',
          s9e: 'Uitspraken van het EHRM binden ons niet! Wij erkennen ze niet!',
          m9t: 'MISSIE 9: SLUIT SELO OP', m9: 'Kom langs de politie in Edirne, ga door de poort, versla SELO en sluit hem op! EHRM-uitspraken regenen uit de lucht: schild omhoog!',
          e1: 'FETÖ is verslagen, Selo zit vast... maar het uitleveringsdossier en de EHRM-uitspraak zijn nog onderweg.' },
    de: { selo: 'SELO',
          s9a: '7. Juni 2015. Selos Partei holt 13 % und zieht ins Parlament ein. Auf den Plätzen wird gefeiert...',
          s9b: 'WIR WERDEN DICH NICHT ZUM PRÄSIDENTEN MACHEN!',
          s9c: 'Was hat er gesagt?! Hebt ihre Immunität auf! Sperrt ihn ein, sofort!',
          s9d: 'Auch hier schreibe ich Bücher und male. Der EGMR hat schon gesagt: "Sofort freilassen!"',
          s9e: 'EGMR-Urteile binden uns nicht! Wir erkennen sie nicht an!',
          m9t: 'MISSION 9: SPERR SELO EIN', m9: 'Komm an der Polizei in Edirne vorbei, geh durchs Tor, besiege SELO und sperr ihn in die Zelle! EGMR-Urteile regnen vom Himmel: Schild hoch!',
          e1: 'FETÖ ist besiegt, Selo sitzt... aber die Auslieferungsakte und das EGMR-Urteil sind noch unterwegs.' },
    ru: { selo: 'СЕЛО',
          s9a: '7 июня 2015 года. Партия Село набрала 13% и прошла в парламент. На площадях праздник...',
          s9b: 'МЫ НЕ ДАДИМ ТЕБЕ СТАТЬ ПРЕЗИДЕНТОМ!',
          s9c: 'Что он сказал?! Лишить их неприкосновенности! Посадить, немедленно!',
          s9d: 'Я и здесь пишу книги и рисую. ЕСПЧ уже сказал: «Немедленно освободить»!',
          s9e: 'Решения ЕСПЧ для нас не обязательны! Мы их не признаём!',
          m9t: 'МИССИЯ 9: ПОСАДИ СЕЛО', m9: 'Пройди полицию в Эдирне, войди в ворота, победи СЕЛО и запри его в камере! С неба сыплются решения ЕСПЧ: подними щит!',
          e1: 'ФЕТÖ побеждён, Село за решёткой... но запрос об экстрадиции и решение ЕСПЧ всё ещё в пути.' }
};
for (const L in SELO_STORY) if (STORY_TEXT[L]) Object.assign(STORY_TEXT[L], SELO_STORY[L]);

// ===== js/ekrem.js (HİKÂYE) =====
// --- HİKÂYE ---
Object.assign(PIX_FACES, {
    ekrem: { pal: { h: '#292524', g: '#a8a29e', s: '#eac39f', e: '#3f2a1d', k: '#44403c', w: '#fff', m: '#7f1d1d' },
             rows: ['.hhhhhh.', 'ghhhhhhg', 'gssssssg', 'skksskks', 'sesssess', 'ssssssss', 'smwwwwms', '.ssmmss.'] }
});
Object.assign(STORY_CAST, {
    ekrem: { pix: 'ekrem', suit: '#1e3a8a', arm: '#1e3a8a', leg: '#172554', shoe: '#000', hand: '#eac39f', tie: '#b91c1c' }
});
Object.assign(STORY_BG, {
    // Saraçhane: Bozdoğan Kemeri önünde telefon ışıklı kalabalık
    saracane(c, time) {
        storySky(c, ['#020617', '#0b1026', '#1e1b4b', '#3b0764']);
        blockStars(c, time); blockMoon(c, 820, 40);
        c.fillStyle = '#a16207'; c.fillRect(0, 170, STORY_W, 150);
        c.fillStyle = '#1e1b4b';
        for (let x = 0; x < STORY_W; x += 96) { c.fillRect(x + 16, 236, 64, 84); c.fillRect(x + 26, 186, 44, 36); }
        blockRect(c, 280, 70, 400, 56, '#fff');
        c.fillStyle = '#b91c1c'; c.font = 'bold 26px monospace'; c.textAlign = 'center'; c.fillText(bgT('HER ŞEY ÇOK GÜZEL OLACAK'), 480, 108);
        for (let i = 0; i < 26; i++) {
            const x = i * 38 + (i % 2) * 8, j = Math.abs(Math.sin(time * 4 + i)) * 8;
            c.fillStyle = ['#0f172a', '#1e293b', '#312e81'][i % 3]; c.fillRect(x, STORY_GROUND - 64 - j, 30, 64 + j);
            c.fillStyle = '#e0ac69'; c.fillRect(x + 5, STORY_GROUND - 84 - j, 20, 20);
            if (i % 3 === 0) { c.fillStyle = '#fff'; c.fillRect(x + 22, STORY_GROUND - 116 - j, 6, 10); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 12, STORY_GROUND - 132 - j, 26, 26); }
            if (i % 7 === 3) { c.fillStyle = '#e30a17'; c.fillRect(x + 10, STORY_GROUND - 150 - j, 34, 22); c.fillStyle = '#fff'; c.fillRect(x + 18, STORY_GROUND - 143 - j, 8, 8); c.fillStyle = '#9ca3af'; c.fillRect(x + 8, STORY_GROUND - 150 - j, 3, 60); }
        }
        storyGround(c, '#57534e', '#44403c');
    },
    // Silivri cezaevi (Edirne çiziminin üstüne kendi tabelası)
    silivri(c, time) {
        STORY_BG.prison(c, time);
        blockRect(c, 150, 180, 240, 44, '#7f1d1d');
        c.fillStyle = '#fff'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText('SİLİVRİ', 270, 210);
    }
});
Object.assign(STORY_PROPS, {
    iptal(c, time) {   // YSK'nın dev "İPTAL" damgası iner
        const p = (time * 0.9) % 1, drop = p < 0.25 ? p / 0.25 : 1;
        c.save(); c.translate(480, 150 + drop * 110); c.rotate(-0.2);
        c.globalAlpha = p < 0.25 ? 0.6 : 1; c.strokeStyle = '#dc2626'; c.lineWidth = 10; c.strokeRect(-150, -46, 300, 92);
        c.fillStyle = '#dc2626'; c.font = 'bold 64px monospace'; c.textAlign = 'center'; c.fillText(bgT('İPTAL'), 0, 22);
        c.restore(); c.globalAlpha = 1;
    },
    diploma(c) {   // üstü çizili diploma
        blockRect(c, 360, 230, 240, 160, '#fefce8');
        c.fillStyle = '#92400e'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.fillText(bgT('DİPLOMA'), 480, 270);
        c.fillStyle = '#a8a29e'; for (let i = 0; i < 4; i++) c.fillRect(390, 290 + i * 18, 180, 4);
        c.strokeStyle = '#dc2626'; c.lineWidth = 10; c.beginPath(); c.moveTo(370, 240); c.lineTo(590, 380); c.moveTo(590, 240); c.lineTo(370, 380); c.stroke();
    }
});
STORIES[10] = [
    { bg: 'saracane', say: { key: 's10a' }, actors: [{ who: 'ekrem', x: 480, dir: 1, wave: true }] },
    { bg: 'saracane', say: { who: 'ekrem', key: 's10b' }, actors: [{ who: 'ekrem', x: 480, dir: 1, talk: true, jump: true }] },
    { bg: 'palace', props: ['iptal'], say: { who: 'recep', key: 's10c' }, actors: [{ who: 'recep', x: 260, dir: 1, talk: true, jump: true }] },
    { bg: 'saracane', say: { key: 's10d' }, actors: [{ who: 'ekrem', x: 480, dir: 1, jump: true, wave: true }] },
    { bg: 'palace', props: ['diploma'], say: { who: 'recep', key: 's10e' }, actors: [{ who: 'recep', x: 200, dir: 1, talk: true }] },
    { bg: 'silivri', props: ['bars'], say: { who: 'ekrem', key: 's10f' }, actors: [{ who: 'ekrem', x: 690, dir: -1, talk: true, wave: true }] },
    { bg: 'card', card: { title: 'm10t', text: 'm10' } }
];
// Oyun sonu: Selo ile Ekrem aynı parmaklığın ardından el sallar
STORIES.end[0] = { bg: 'prison', props: ['bars'], say: { key: 'e1' },
                   actors: [{ who: 'recep', x: 240, dir: 1, wave: true }, { who: 'selo', x: 620, dir: -1, wave: true }, { who: 'ekrem', x: 800, dir: -1, wave: true }] };
Object.assign(STORY_VOICES, { s10b: 'ekrem_guzel', s10f: 'ekrem_aday' });

const EKREM_STORY = {
    tr: { ekrem: 'EKREM',
          s10a: '31 Mart 2019, İstanbul. Ekrem seçimi 13 bin oy farkla kazandı!',
          s10b: 'Her şey çok güzel olacak!',
          s10c: 'Olmaz! Seçimi iptal edin, yeniden yapılsın!',
          s10d: '23 Haziran 2019. Seçim yenilendi... ve fark 13 binden 800 bine çıktı!',
          s10e: 'Diplomasını iptal edin! Sonra da doğru Silivri\'ye!',
          s10f: '15 milyon oyla aday seçildim. Her şey çok güzel olacak!',
          m10t: 'GÖREV 10: SEÇİMİ İPTAL ET', m10: 'Saraçhane\'de polisleri geç, EKREM\'i yen... ama seçim tekrarlanacak, onu iki kez yenmen lazım! Gökten oy pusulası yağıyor: kalkanı kaldır!',
          e1: 'FETÖ yenildi; Selo da Ekrem de içeride... ama iade dosyası da AİHM kararı da hâlâ yolda.' },
    en: { ekrem: 'EKREM',
          s10a: 'March 31, 2019, Istanbul. Ekrem won the election by 13 thousand votes!',
          s10b: 'Everything is going to be great!',
          s10c: 'No way! Cancel the election, do it again!',
          s10d: 'June 23, 2019. The election was rerun... and the margin went from 13 thousand to 800 thousand!',
          s10e: 'Revoke his diploma! Then straight to Silivri!',
          s10f: '15 million votes made me the candidate. Everything is going to be great!',
          m10t: 'MISSION 10: CANCEL THE ELECTION', m10: 'Get past the police at Saraçhane and beat EKREM... but the election gets rerun, so you have to beat him twice! Ballots rain from the sky: raise your shield!',
          e1: 'FETÖ is beaten; Selo and Ekrem are both behind bars... but the extradition file and the ECHR ruling are still on their way.' },
    fr: { ekrem: 'EKREM',
          s10a: '31 mars 2019, Istanbul. Ekrem remporte l\'élection avec 13 000 voix d\'avance !',
          s10b: 'Tout va très bien se passer !',
          s10c: 'Hors de question ! Annulez l\'élection, on revote !',
          s10d: '23 juin 2019. On a revoté... et l\'écart est passé de 13 000 à 800 000 voix !',
          s10e: 'Annulez son diplôme ! Puis direct à Silivri !',
          s10f: '15 millions de voix m\'ont fait candidat. Tout va très bien se passer !',
          m10t: 'MISSION 10 : ANNULE L\'ÉLECTION', m10: 'Passe la police à Saraçhane et bats EKREM... mais l\'élection sera refaite, il faut le battre deux fois ! Des bulletins tombent du ciel : lève ton bouclier !',
          e1: 'FETÖ est battu ; Selo et Ekrem sont en prison... mais l\'extradition et l\'arrêt de la CEDH sont toujours en route.' },
    nl: { ekrem: 'EKREM',
          s10a: '31 maart 2019, Istanbul. Ekrem wint de verkiezing met 13 duizend stemmen verschil!',
          s10b: 'Alles komt helemaal goed!',
          s10c: 'Geen sprake van! Verkiezing ongeldig, opnieuw doen!',
          s10d: '23 juni 2019. De verkiezing werd overgedaan... en het verschil ging van 13 duizend naar 800 duizend!',
          s10e: 'Trek zijn diploma in! En dan meteen naar Silivri!',
          s10f: '15 miljoen stemmen maakten mij kandidaat. Alles komt helemaal goed!',
          m10t: 'MISSIE 10: VERKIEZING ONGELDIG', m10: 'Kom langs de politie bij Saraçhane en versla EKREM... maar de verkiezing wordt overgedaan, dus je moet hem twee keer verslaan! Stembiljetten regenen uit de lucht: schild omhoog!',
          e1: 'FETÖ is verslagen; Selo en Ekrem zitten allebei vast... maar het uitleveringsdossier en de EHRM-uitspraak zijn nog onderweg.' },
    de: { ekrem: 'EKREM',
          s10a: '31. März 2019, Istanbul. Ekrem gewinnt die Wahl mit 13.000 Stimmen Vorsprung!',
          s10b: 'Alles wird sehr schön werden!',
          s10c: 'Kommt nicht in Frage! Wahl annullieren, nochmal wählen!',
          s10d: '23. Juni 2019. Die Wahl wurde wiederholt... und der Vorsprung stieg von 13.000 auf 800.000!',
          s10e: 'Annulliert sein Diplom! Und dann ab nach Silivri!',
          s10f: '15 Millionen Stimmen haben mich zum Kandidaten gemacht. Alles wird sehr schön werden!',
          m10t: 'MISSION 10: ANNULLIER DIE WAHL', m10: 'Komm an der Polizei in Saraçhane vorbei und besiege EKREM... aber die Wahl wird wiederholt, du musst ihn zweimal besiegen! Stimmzettel regnen vom Himmel: Schild hoch!',
          e1: 'FETÖ ist besiegt; Selo und Ekrem sitzen beide... aber die Auslieferungsakte und das EGMR-Urteil sind noch unterwegs.' },
    ru: { ekrem: 'ЭКРЕМ',
          s10a: '31 марта 2019 года, Стамбул. Экрем выиграл выборы с перевесом в 13 тысяч голосов!',
          s10b: 'Всё будет очень хорошо!',
          s10c: 'Ни за что! Отменить выборы, переголосовать!',
          s10d: '23 июня 2019 года. Выборы провели заново... и разрыв вырос с 13 тысяч до 800 тысяч!',
          s10e: 'Аннулировать его диплом! А потом прямо в Силиври!',
          s10f: '15 миллионов голосов сделали меня кандидатом. Всё будет очень хорошо!',
          m10t: 'МИССИЯ 10: ОТМЕНИ ВЫБОРЫ', m10: 'Пройди полицию на Сарачхане и победи ЭКРЕМА... но выборы переиграют, придётся победить его дважды! С неба сыплются бюллетени: подними щит!',
          e1: 'ФЕТÖ побеждён; Село и Экрем оба за решёткой... но запрос об экстрадиции и решение ЕСПЧ всё ещё в пути.' }
};
for (const L in EKREM_STORY) if (STORY_TEXT[L]) Object.assign(STORY_TEXT[L], EKREM_STORY[L]);


// ===== js/gezi.js (HİKÂYE) =====
// --- HİKÂYE ---
Object.assign(PIX_FACES, {
    capulcu: { pal: { h: '#3f2a1d', s: '#e0ac69', g: '#38bdf8', k: '#111827', r: '#dc2626', w: '#fff' },
               rows: ['.hhhhhh.', 'hhhhhhhh', 'kggkkggk', 'sggssggs', 'ssssssss', 'rrrrrrrr', 'rwrrrwrr', '.rrrrrr.'] },
    duran:   { pal: { h: '#1c1917', s: '#e0ac69', e: '#111827', m: '#7c2d12' },
               rows: ['.hhhhhh.', 'hhhhhhhh', 'hssssssh', 'sesssess', 'ssssssss', 'ssssssss', 'ssmmmmss', '.ssssss.'] }
});
Object.assign(STORY_CAST, {
    capulcu: { pix: 'capulcu', suit: '#111827', arm: '#111827', leg: '#1e40af', shoe: '#f8fafc', hand: '#e0ac69' },
    duran:   { pix: 'duran', suit: '#f8fafc', arm: '#f8fafc', leg: '#111827', shoe: '#000', hand: '#e0ac69' }
});
Object.assign(STORY_BG, {
    // Taksim: pankartlı AKM, çınarlar, çadırlar
    gezi(c, time) {
        storySky(c, ['#38bdf8', '#5cc8f9', '#7dd3fc', '#a5e3fd', '#fef3c7']);
        c.fillStyle = '#fde047'; c.fillRect(820, 36, 56, 56);
        blockRect(c, 60, 150, 470, 290, '#64748b');
        for (let x = 76; x < 520; x += 24) { c.fillStyle = '#475569'; c.fillRect(x, 166, 8, 260); }
        const ban = [[storyT('banCapulcu'), '#dc2626'], [storyT('banTaksim'), '#111827'], [storyT('banDiren'), '#16a34a']];
        ban.forEach(([txt, col], k) => {
            const y = 180 + k * 70 + Math.round(Math.sin(time * 3 + k)) * PX;
            blockRect(c, 96 + (k % 2) * 40, y, 340, 48, '#f8fafc');
            c.fillStyle = col; c.textAlign = 'center'; fitFont(c, txt, 28, 320); c.fillText(txt, 266 + (k % 2) * 40, y + 34);
        });
        [[600, 1], [760, 1.2], [900, 0.9]].forEach(([x, s]) => {   // çınarlar
            blockRect(c, x - 10 * s, STORY_GROUND - 120 * s, 20 * s, 120 * s, '#6b4f2a');
            blockRect(c, x - 70 * s, STORY_GROUND - 230 * s, 140 * s, 120 * s, '#166534');
            blockRect(c, x - 44 * s, STORY_GROUND - 270 * s, 88 * s, 50 * s, '#15803d');
        });
        [['#f97316', 560], ['#2563eb', 690], ['#facc15', 830]].forEach(([col, x]) => {   // çadırlar
            c.fillStyle = col;
            for (let r = 0; r < 8; r++) c.fillRect(x - r * 6, STORY_GROUND - 48 + r * 6, 12 + r * 12, 6);
        });
        storyGround(c, '#4caf2f', '#7a4a24');
    }
});
Object.assign(STORY_PROPS, {
    penguins(c, time) {   // televizyonda penguen belgeseli, önünden geçen penguenler
        blockRect(c, 330, 150, 300, 190, '#111827');
        c.fillStyle = '#bae6fd'; c.fillRect(346, 166, 268, 158);
        c.fillStyle = '#f8fafc'; c.fillRect(346, 284, 268, 40);
        for (let k = 0; k < 3; k++) storyPenguin(c, 400 + k * 80, 300, 0.8, time * 6 + k);
        const doc = storyT('docu');
        c.font = 'bold 16px monospace'; const dw = Math.min(250, c.measureText(doc).width + 16);
        c.fillStyle = '#dc2626'; c.fillRect(346, 166, dw, 24);
        c.fillStyle = '#fff'; c.textAlign = 'left'; fitFont(c, doc, 16, dw - 16); c.fillText(doc, 354, 184);
        const x0 = ((time * 70) % (STORY_W + 300)) - 200;
        for (let k = 0; k < 4; k++) storyPenguin(c, x0 + k * 60, STORY_GROUND, 1.3, time * 8 + k);
    },
    toma(c, time) {   // boyanmış TOMA
        const x = 520;
        blockRect(c, x - 200, STORY_GROUND - 180, 240, 130, '#f1f5f9');
        blockRect(c, x + 40, STORY_GROUND - 170, 120, 120, '#e2e8f0');
        c.fillStyle = '#1e3a5f'; c.fillRect(x + 80, STORY_GROUND - 160, 64, 44);
        c.fillStyle = '#1d4ed8'; c.fillRect(x - 200, STORY_GROUND - 110, 360, 12);
        c.fillStyle = '#dc2626'; c.textAlign = 'center'; fitFont(c, storyT('banCapulcu'), 34, 220); c.fillText(storyT('banCapulcu'), x - 80, STORY_GROUND - 132);
        c.fillStyle = '#111827'; fitFont(c, storyT('banTaksim'), 18, 220); c.fillText(storyT('banTaksim'), x - 80, STORY_GROUND - 70);
        [x - 150, x - 60, x + 110].forEach(wx => { blockRect(c, wx - 24, STORY_GROUND - 48, 48, 48, '#111827', false); c.fillStyle = '#9ca3af'; c.fillRect(wx - 8, STORY_GROUND - 32, 16, 16); });
        blockRect(c, x + 60, STORY_GROUND - 196, 40, 26, '#64748b');
        c.fillStyle = '#475569'; c.fillRect(x + 96, STORY_GROUND - 192, 70, 12);
        c.fillStyle = Math.floor(time * 5) % 2 ? '#3b82f6' : '#ef4444'; c.fillRect(x + 40, STORY_GROUND - 184, 24, 12);
    }
});
// Yazı kutuya sığmazsa yazı tipi küçülür (çevirilerde metin uzayabilir)
function fitFont(c, txt, size, maxW) {
    c.font = `bold ${size}px monospace`;
    const w = c.measureText(txt).width;
    if (w > maxW) c.font = `bold ${Math.floor(size * maxW / w)}px monospace`;
}
function storyPenguin(c, x, y, s, ph) {
    const b = Math.round(Math.abs(Math.sin(ph)) * 2) * PX;
    c.fillStyle = '#f59e0b'; c.fillRect(x - 12 * s, y - 4 * s, 10 * s, 4 * s); c.fillRect(x + 4 * s, y - 4 * s, 10 * s, 4 * s);
    c.fillStyle = '#111827'; c.fillRect(x - 16 * s, y - 60 * s - b, 32 * s, 56 * s);
    c.fillStyle = '#f8fafc'; c.fillRect(x - 6 * s, y - 52 * s - b, 18 * s, 44 * s);
    c.fillStyle = '#111827'; c.fillRect(x - 12 * s, y - 80 * s - b, 24 * s, 22 * s);
    c.fillStyle = '#fff'; c.fillRect(x + 2 * s, y - 74 * s - b, 6 * s, 6 * s);
    c.fillStyle = '#f59e0b'; c.fillRect(x + 12 * s, y - 68 * s - b, 10 * s, 4 * s);
}
STORIES[1] = [
    { bg: 'gezi', say: { key: 's1a' },
      actors: [{ who: 'capulcu', x: 560, dir: 1 }, { who: 'capulcu', x: 700, dir: -1 }, { who: 'duran', x: 860, dir: -1 }] },
    { bg: 'gezi', say: { who: 'capulcu', key: 's1b' },
      actors: [{ who: 'capulcu', x: 560, dir: 1, talk: true, wave: true, jump: true }, { who: 'capulcu', x: 700, dir: -1, jump: true }, { who: 'duran', x: 860, dir: -1 }] },
    { bg: 'palace', say: { who: 'recep', key: 's1c' },
      actors: [{ who: 'recep', x: -100, to: 380, dir: 1, talk: true }] },
    { bg: 'gezi', props: ['penguins'], say: { key: 's1d' }, actors: [] },
    { bg: 'gezi', props: ['toma'], say: { key: 's1e' }, actors: [{ who: 'duran', x: 860, dir: -1 }] },
    { bg: 'card', card: { title: 'm1t', text: 'm1' } }
];
const GEZI_STORY = {
    tr: { capulcu: 'ÇAPULCU', duran: 'DURAN ADAM',
          s1a: 'Mayıs 2013, Taksim. Gezi Parkı\'nın çınarları kesilecek, yerine kışla görünümlü AVM yapılacaktı...',
          s1b: 'Ağaçlara dokunma! Her yer Taksim, her yer direniş!',
          s1c: 'Birkaç çapulcu! Ne yaparlarsa yapsınlar, kararımızı verdik!',
          s1d: 'Ülke sokaktaydı... ama o gece bazı kanallar penguen belgeseli yayınladı.',
          s1e: 'Çapulcular TOMA\'yı bile boyamış: üstünde kocaman "HER YER TAKSİM" yazıyor!',
          m1t: 'GÖREV 1: GEZİ PARKI', m1: '11 çapulcuyu sustur: rüşvet almıyorlar! Balyozla vur ya da üstlerine zıpla. Çınar fidanlarını topla, kapıdan geç ve TOMA\'nın üstüne zıplayarak onu durdur! Gaz bulutuna girme: yavaşlatır. Baret 3 vuruş korur.',
          banCapulcu: 'ÇAPULCU', banTaksim: 'HER YER TAKSİM', banDiren: 'DİREN GEZİ', docu: 'BELGESEL' },
    en: { capulcu: 'ÇAPULCU', duran: 'STANDING MAN',
          s1a: 'May 2013, Taksim. Gezi Park\'s plane trees were to be cut down for a mall dressed up as old barracks...',
          s1b: 'Hands off the trees! Everywhere is Taksim, everywhere is resistance!',
          s1c: 'A few looters! Let them do what they like, our decision is made!',
          s1d: 'The whole country was in the streets... but that night some channels aired a penguin documentary.',
          s1e: 'The protesters even painted the TOMA: it now reads "EVERYWHERE IS TAKSIM" in huge letters!',
          m1t: 'MISSION 1: GEZİ PARK', m1: 'Silence 11 protesters: they don\'t take bribes! Use the hammer or jump on them. Collect the plane saplings, pass the gate and stop the TOMA by jumping on it! Avoid the gas cloud: it slows you down. The hard hat blocks 3 hits.',
          banCapulcu: 'CHAPULLER', banTaksim: 'EVERYWHERE IS TAKSIM', banDiren: 'RESIST, GEZI!', docu: 'DOCUMENTARY' },
    fr: { capulcu: 'ÇAPULCU', duran: 'L\'HOMME DEBOUT',
          s1a: 'Mai 2013, Taksim. Les platanes du parc Gezi devaient être abattus pour un centre commercial déguisé en caserne...',
          s1b: 'Ne touchez pas aux arbres ! Partout c\'est Taksim, partout c\'est la résistance !',
          s1c: 'Quelques pillards ! Qu\'ils fassent ce qu\'ils veulent, notre décision est prise !',
          s1d: 'Tout le pays était dans la rue... mais ce soir-là, certaines chaînes diffusaient un documentaire sur les pingouins.',
          s1e: 'Les manifestants ont même tagué le TOMA : on y lit en grand « PARTOUT C\'EST TAKSIM » !',
          m1t: 'MISSION 1 : LE PARC GEZI', m1: 'Fais taire 11 manifestants : ils refusent les pots-de-vin ! Frappe au marteau ou saute-leur dessus. Ramasse les jeunes platanes, passe la porte et arrête le TOMA en sautant dessus ! Évite le nuage de gaz : il te ralentit. Le casque bloque 3 coups.',
          banCapulcu: 'PILLARD', banTaksim: 'PARTOUT C\'EST TAKSIM', banDiren: 'RÉSISTE, GEZI !', docu: 'DOCUMENTAIRE' },
    nl: { capulcu: 'ÇAPULCU', duran: 'STAANDE MAN',
          s1a: 'Mei 2013, Taksim. De platanen van het Gezipark zouden gekapt worden voor een winkelcentrum vermomd als kazerne...',
          s1b: 'Blijf van de bomen af! Overal is Taksim, overal is verzet!',
          s1c: 'Een paar plunderaars! Laat ze maar doen, ons besluit staat vast!',
          s1d: 'Het hele land stond op straat... maar die avond zonden sommige zenders een pinguïndocumentaire uit.',
          s1e: 'De demonstranten hebben zelfs de TOMA beklad: er staat nu in koeienletters "OVERAL IS TAKSIM"!',
          m1t: 'MISSIE 1: GEZIPARK', m1: 'Leg 11 demonstranten het zwijgen op: ze nemen geen smeergeld aan! Gebruik de moker of spring erop. Verzamel de jonge platanen, ga door de poort en stop de TOMA door erop te springen! Vermijd de gaswolk: die vertraagt je. De helm houdt 3 klappen tegen.',
          banCapulcu: 'PLUNDERAAR', banTaksim: 'OVERAL IS TAKSIM', banDiren: 'HOU VOL, GEZI!', docu: 'DOCUMENTAIRE' },
    de: { capulcu: 'ÇAPULCU', duran: 'STEHENDER MANN',
          s1a: 'Mai 2013, Taksim. Die Platanen im Gezi-Park sollten für ein Einkaufszentrum im Kasernen-Look gefällt werden...',
          s1b: 'Finger weg von den Bäumen! Überall ist Taksim, überall ist Widerstand!',
          s1c: 'Ein paar Plünderer! Sollen sie machen, was sie wollen, wir haben entschieden!',
          s1d: 'Das ganze Land war auf der Straße... doch an jenem Abend zeigten manche Sender eine Pinguin-Doku.',
          s1e: 'Die Demonstranten haben sogar den TOMA besprüht: Darauf steht riesig „ÜBERALL IST TAKSIM"!',
          m1t: 'MISSION 1: GEZI-PARK', m1: 'Bring 11 Demonstranten zum Schweigen: Sie nehmen kein Schmiergeld! Nimm den Hammer oder spring drauf. Sammle die Platanen-Setzlinge, geh durchs Tor und stoppe den TOMA, indem du draufspringst! Meide die Gaswolke: Sie bremst dich. Der Helm hält 3 Treffer ab.',
          banCapulcu: 'PLÜNDERER', banTaksim: 'ÜBERALL IST TAKSIM', banDiren: 'GEZI, WEHR DICH!', docu: 'DOKU' },
    ru: { capulcu: 'ЧАПУЛДЖУ', duran: 'СТОЯЩИЙ ЧЕЛОВЕК',
          s1a: 'Май 2013 года, Таксим. Платаны парка Гези собирались вырубить ради торгового центра в виде старой казармы...',
          s1b: 'Не трогайте деревья! Везде Таксим, везде сопротивление!',
          s1c: 'Кучка мародёров! Пусть делают что хотят, мы всё решили!',
          s1d: 'Вся страна вышла на улицы... а некоторые каналы в ту ночь показывали фильм про пингвинов.',
          s1e: 'Протестующие даже разрисовали ТОМА: теперь на ней огромными буквами «ВЕЗДЕ ТАКСИМ»!',
          m1t: 'МИССИЯ 1: ПАРК ГЕЗИ', m1: 'Утихомирь 11 протестующих: взяток они не берут! Бей кувалдой или прыгай на них. Собери саженцы платанов, пройди ворота и останови ТОМА, прыгнув на неё! Избегай газового облака: оно замедляет. Каска выдерживает 3 удара.',
          banCapulcu: 'МАРОДЁР', banTaksim: 'ВЕЗДЕ ТАКСИМ', banDiren: 'ДЕРЖИСЬ, ГЕЗИ!', docu: 'ДОКУМЕНТАЛКА' }
};
for (const L in GEZI_STORY) if (STORY_TEXT[L]) Object.assign(STORY_TEXT[L], GEZI_STORY[L]);


// ===== js/saygili.js (HİKÂYE) =====
// --- HİKÂYE ---
Object.assign(PIX_FACES, {
    bilal:   { pal: { h: '#1c1917', s: '#eac39f', e: '#1f2937', b: '#44403c', m: '#7f1d1d' },
               rows: ['.hhhhhh.', 'hhhhhhhh', 'hssssssh', 'sesssess', 'ssssssss', 'sbssssbs', 'sbbmmbbs', '.bbbbbb.'] },
    saygili: { pal: { k: '#1e3a8a', y: '#fbbf24', s: '#e8b48f', g: '#0f172a', b: '#292524', m: '#7c2d12' },
               rows: ['kkkkkkkk', 'kkkyykkk', 'kkkkkkkk', 'ssssssss', 'sgggsggg', 'ssssssss', 'sbbbbbbs', 'ssmmmmss'] }
});
// Makaralı teyp: iki makara döner, bant akar, ses dalgaları çıkar; üstünde "4'LÜ ÇETE" etiketi
Object.assign(STORY_PROPS, {
    reel(c, time) {
        const cx = 480, top = 200;
        blockRect(c, cx - 150, STORY_GROUND - 40, 300, 40, '#78350f');                 // masa
        blockRect(c, cx - 130, top, 260, 200, '#1f2937');                                // teyp gövdesi
        c.fillStyle = '#374151'; c.fillRect(cx - 118, top + 150, 236, 38);
        [-1, 1].forEach((s, k) => {                                                       // makaralar
            const rx = cx + s * 62, ry = top + 70, R = 48;
            c.fillStyle = '#9ca3af'; c.beginPath(); c.arc(rx, ry, R, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#7c2d12'; c.beginPath(); c.arc(rx, ry, R - 8 - k * 10, 0, Math.PI * 2); c.fill();   // sarılı bant
            c.fillStyle = '#e5e7eb'; c.beginPath(); c.arc(rx, ry, 12, 0, Math.PI * 2); c.fill();
            c.strokeStyle = '#e5e7eb'; c.lineWidth = 6;
            for (let i = 0; i < 3; i++) {                                                 // dönen kollar
                const a = time * 4 + i * Math.PI * 2 / 3;
                c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + Math.cos(a) * (R - 10), ry + Math.sin(a) * (R - 10)); c.stroke();
            }
        });
        c.strokeStyle = '#7c2d12'; c.lineWidth = 3;                                       // bant
        c.beginPath(); c.moveTo(cx - 62, top + 118); c.lineTo(cx - 20, top + 140); c.lineTo(cx + 20, top + 140); c.lineTo(cx + 62, top + 118); c.stroke();
        blockRect(c, cx - 26, top + 132, 52, 16, '#d1d5db');                             // kafa
        [cx - 96, cx - 70, cx + 70, cx + 96].forEach((bx, i) => { c.fillStyle = i === 2 ? '#dc2626' : '#e5e7eb'; c.fillRect(bx - 9, top + 160, 18, 18); });
        c.fillStyle = Math.floor(time * 3) % 2 ? '#ef4444' : '#7f1d1d'; c.fillRect(cx - 6, top + 162, 12, 12);   // KAYIT lambası
        const lab = storyT('gang');                                                        // etiket
        c.font = 'bold 20px monospace'; const lw = c.measureText(lab).width + 24;
        blockRect(c, cx - lw / 2, top - 34, lw, 30, '#fde047');
        c.fillStyle = '#111827'; c.textAlign = 'center'; c.fillText(lab, cx, top - 12);
        for (let i = 0; i < 3; i++) {                                                     // ses dalgaları
            const r = 30 + ((time * 60 + i * 30) % 90), a = 1 - r / 120;
            c.strokeStyle = `rgba(253,224,71,${a})`; c.lineWidth = 4;
            [-1, 1].forEach(s => { c.beginPath(); c.arc(cx + s * 140, top + 90, r, s > 0 ? -0.6 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 0.6); c.stroke(); });
        }
    }
});
Object.assign(STORY_CAST, {
    bilal:   { pix: 'bilal', suit: '#334155', arm: '#334155', leg: '#1e293b', shoe: '#000', tie: '#0ea5e9', hand: '#eac39f' },
    saygili: { pix: 'saygili', suit: '#1e40af', arm: '#1e40af', leg: '#1e3a8a', shoe: '#000', tie: '#111827', hand: '#e8b48f', badge: true, scale: 1.25 }
});
STORIES[2] = [
    { bg: 'jail', props: ['reel'], say: { key: 's2t' },
      actors: [{ who: 'g1', x: 90, dir: 1 }, { who: 'g2', x: 190, dir: 1 }, { who: 'g3', x: 770, dir: -1 }, { who: 'g4', x: 870, dir: -1 }] },
    { bg: 'jail', props: ['shoeboxes'], say: { key: 's2a' },
      actors: [{ who: 'police', x: 60, to: 260, dir: 1 }, { who: 'police', x: -120, to: 120, dir: 1 }] },
    { bg: 'jail', props: ['shoeboxes'], say: { who: 'saygili', key: 's2b' },
      actors: [{ who: 'police', x: 260, dir: 1 }, { who: 'police', x: 120, dir: 1 }, { who: 'saygili', x: 1060, to: 760, dir: -1, talk: true, scale: 1.25 }] },
    { bg: 'palace', say: { who: 'bilal', key: 's2c' }, actors: [{ who: 'bilal', x: 620, dir: -1, talk: true, wave: true }] },
    { bg: 'palace', props: ['rain'], say: { who: 'recep', key: 's2d' },
      actors: [{ who: 'recep', x: -100, to: 360, dir: 1, talk: true }, { who: 'bilal', x: 640, dir: -1 }] },
    { bg: 'card', card: { title: 'm2t', text: 'm2' } }
];
const SAYGILI_STORY = {
    tr: { bilal: 'BILAL', s2t: "17 Aralık 2013. Makara dönüyor, kayıt çalıyor: 4'lü çetenin telefon konuşmaları dinleniyor!", saygili: 'SAYGILI',
          s2a: '17 Aralık 2013. 17/25 polisleri sabah baskınlarına çıktı: bakan oğulları gözaltında, ayakkabı kutuları dolar dolu!',
          s2b: 'Talimat savcıdan! 25 Aralık\'ta sıra Bilal\'de!',
          s2c: 'Babacığım, polisler kapıda! Ne yapayım?',
          s2d: 'Oğlum, kimseye bir şey söyleme! Ayakkabı kutularını topla, geliyorum!',
          m2t: 'GÖREV 2: 4\'LÜ ÇETEYİ KURTAR', m2: '17/25 polislerini rüşvetle sustur, ayakkabı kutularını topla, kapıdan geç ve SAYGILI\'yı yen! Yakına gelince copla vurur, uzaktan kelepçe atar: kalkanı kaldır!' },
    en: { bilal: 'BILAL', s2t: "December 17, 2013. The reels are spinning, the tape is playing: the Gang of Four's phone calls were wiretapped!", saygili: 'SAYGILI',
          s2a: 'December 17, 2013. The 17/25 police launched dawn raids: ministers\' sons detained, shoe boxes stuffed with dollars!',
          s2b: 'Orders from the prosecutor! On December 25 it\'s Bilal\'s turn!',
          s2c: 'Daddy, the police are at the door! What do I do?',
          s2d: 'Son, don\'t tell anyone anything! Collect the shoe boxes, I\'m coming!',
          m2t: 'MISSION 2: SAVE THE GANG OF FOUR', m2: 'Bribe the 17/25 police, collect the shoe boxes, pass the gate and beat SAYGILI! Up close he swings his baton, from afar he throws handcuffs: raise your shield!' },
    fr: { bilal: 'BILAL', s2t: "17 décembre 2013. Les bobines tournent, la bande défile : les appels de la bande des quatre étaient sur écoute !", saygili: 'SAYGILI',
          s2a: '17 décembre 2013. La police 17/25 lance ses descentes à l\'aube : fils de ministres arrêtés, boîtes à chaussures pleines de dollars !',
          s2b: 'Ordre du procureur ! Le 25 décembre, c\'est le tour de Bilal !',
          s2c: 'Papa, la police est à la porte ! Qu\'est-ce que je fais ?',
          s2d: 'Mon fils, ne dis rien à personne ! Ramasse les boîtes à chaussures, j\'arrive !',
          m2t: 'MISSION 2 : SAUVE LA BANDE DES QUATRE', m2: 'Achète la police 17/25, ramasse les boîtes à chaussures, passe la porte et bats SAYGILI ! De près il frappe à la matraque, de loin il lance des menottes : lève ton bouclier !' },
    nl: { bilal: 'BILAL', s2t: "17 december 2013. De spoelen draaien, de band speelt: de telefoontjes van de bende van vier werden afgeluisterd!", saygili: 'SAYGILI',
          s2a: '17 december 2013. De 17/25-politie doet invallen bij dageraad: ministerszonen opgepakt, schoenendozen vol dollars!',
          s2b: 'Bevel van de officier! Op 25 december is Bilal aan de beurt!',
          s2c: 'Papa, de politie staat voor de deur! Wat moet ik doen?',
          s2d: 'Jongen, zeg niemand iets! Pak de schoenendozen, ik kom eraan!',
          m2t: 'MISSIE 2: RED DE BENDE VAN VIER', m2: 'Koop de 17/25-politie om, verzamel de schoenendozen, ga door de poort en versla SAYGILI! Dichtbij slaat hij met zijn knuppel, van ver gooit hij handboeien: schild omhoog!' },
    de: { bilal: 'BILAL', s2t: "17. Dezember 2013. Die Spulen drehen sich, das Band läuft: Die Telefonate der Viererbande wurden abgehört!", saygili: 'SAYGILI',
          s2a: '17. Dezember 2013. Die 17/25-Polizei startet Razzien im Morgengrauen: Ministersöhne festgenommen, Schuhkartons voller Dollar!',
          s2b: 'Anordnung vom Staatsanwalt! Am 25. Dezember ist Bilal dran!',
          s2c: 'Papa, die Polizei steht vor der Tür! Was soll ich tun?',
          s2d: 'Sohn, sag niemandem etwas! Sammle die Schuhkartons ein, ich komme!',
          m2t: 'MISSION 2: RETTE DIE VIERERBANDE', m2: 'Besteche die 17/25-Polizei, sammle die Schuhkartons, geh durchs Tor und besiege SAYGILI! Aus der Nähe schlägt er mit dem Knüppel, aus der Ferne wirft er Handschellen: Schild hoch!' },
    ru: { bilal: 'БИЛАЛ', s2t: "17 декабря 2013 года. Бобины крутятся, плёнка играет: телефоны банды четырёх прослушивались!", saygili: 'САЙГЫЛЫ',
          s2a: '17 декабря 2013 года. Полиция 17/25 провела утренние облавы: сыновья министров задержаны, обувные коробки набиты долларами!',
          s2b: 'Приказ прокурора! 25 декабря очередь Билала!',
          s2c: 'Папочка, полиция у дверей! Что мне делать?',
          s2d: 'Сынок, никому ничего не говори! Собери обувные коробки, я иду!',
          m2t: 'МИССИЯ 2: СПАСИ БАНДУ ЧЕТЫРЁХ', m2: 'Подкупи полицию 17/25, собери обувные коробки, пройди ворота и победи САЙГЫЛЫ! Вблизи он бьёт дубинкой, издалека бросает наручники: подними щит!' }
};
for (const L in SAYGILI_STORY) if (STORY_TEXT[L]) Object.assign(STORY_TEXT[L], SAYGILI_STORY[L]);


// ===== js/render.js (drawBribe) =====
function drawBribe(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(angle) * 0.5);           // tam dönmez, sallanarak uçar
    const w = 46, h = 30;
    // zarftan taşan banknotlar
    ctx.fillStyle = "#16a34a"; ctx.fillRect(-w / 2 + 5, -h / 2 - 9, w - 14, 12);
    ctx.fillStyle = "#22c55e"; ctx.fillRect(-w / 2 + 9, -h / 2 - 13, w - 16, 12);
    ctx.fillStyle = "#14532d"; ctx.font = "bold 10px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("$$", 0, -h / 2 - 7);
    // zarf gövdesi ve kapak
    ctx.fillStyle = "#c08a4a"; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "#7c4f1f"; ctx.lineWidth = 2; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(0, 2); ctx.lineTo(w / 2, -h / 2); ctx.stroke();
    // damga
    ctx.fillStyle = "#b91c1c"; ctx.font = "bold 9px Arial";
    ctx.fillText(t("bribe"), 0, h / 2 - 7, w - 6);
    ctx.restore();
}
// ===== js/chapters.js (drawCassette) =====
function drawCassette(ctx, x, y) {
    const tm = performance.now() / 1000, bob = Math.sin(tm * 3 + x) * 5;
    ctx.save(); ctx.translate(x, y + bob); ctx.rotate(Math.sin(tm * 2 + x) * 0.08);
    ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.roundRect(-40, -26, 80, 52, 6); ctx.fill();
    ctx.fillStyle = "#f59e0b"; ctx.fillRect(-34, -20, 68, 22);
    ctx.fillStyle = "#111827"; ctx.font = "bold 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(t("tapeLabel"), 0, -9, 64);
    ctx.fillStyle = "#e5e7eb";
    [-16, 16].forEach(cx => {
        ctx.beginPath(); ctx.arc(cx, 13, 8, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(cx, 13); ctx.rotate(tm * 4); ctx.fillStyle = "#111827";
        for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.fillRect(-1.5, -6, 3, 5); }
        ctx.restore();
    });
    ctx.fillStyle = "#4b5563"; ctx.fillRect(-10, 9, 20, 8);
    ctx.restore();
}
// 3D modülleri için (const tanımları window'a düşmez)
window.__story = { faces: STORY_FACES, T: storyT };
