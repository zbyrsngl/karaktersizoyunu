// HIRHIZ 3D — bölüm dünyasını kuran ortak kod. Bölümlerin verisi ve süsü level1.js, level2.js ... içinde.
// Yol -Z yönünde ilerler: zemin parçaları arasındaki boşluklar çukur (düşen 1 can kaybeder).
// Tuğla raflar (T1 = 1.8 m, T2 = 3.2 m), kafayla kırılan tuğlalar, toplanacaklar, yarı yolda kontrol noktası,
// sonunda kapı/barikat (hedef sayıda düşman yenilince iner) ve canavar meydanı.
import * as THREE from 'three';
import { box, mat, canvasTex, fitText, AABB } from './util.js?v=23';
import { tr, tf, lang } from './i18n.js?v=23';
import { buildStreets } from './streets.js?v=23';

export const T1 = 1.8, T2 = 3.2;
export const HW = 8;                                            // yolun yarı genişliği
export const ARENA = { z0: -184, z1: -236, hw: 18, cz: -212 };
export const BRICK_Y = 2.7;                                     // tuğlanın alt yüzü
// Bölümün başına eklenen mahalle (streets.js): yol z = EXT_Z0'dan başlar, oyuncu START_Z'de doğar.
// Mahallede iki kavşak: ara sokaklar yolun iki yanına (deniz/köprü olan tarafa açılmaz) STREET_LEN boyunca uzanır.
export const EXT_Z0 = 100, START_Z = 94;
export const STREET = { hw: 4.5, len: 26, z: [72, 40] };
const DISTRICT_SIDES = { 3: [1], 5: [1] };   // 3 ve 5. bölümde sol taraf deniz
export function districtPlan(L) {
    const sides = L.noOuter ? [] : (DISTRICT_SIDES[L.id] || [-1, 1]);
    const junctions = [];
    STREET.z.forEach(z => sides.forEach(s => junctions.push({ z, s, hw: STREET.hw, len: STREET.len })));
    return { junctions };
}

// --- DOKULAR ---
export const TEX = {};
function textures() {
    if (TEX.pave) return;
    TEX.pave = canvasTex(128, 128, (g) => {
        g.fillStyle = '#cbbfae'; g.fillRect(0, 0, 128, 128);
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
            const o = y % 2 ? 16 : 0;
            g.fillStyle = ['#d6cab8', '#c4b6a2', '#d0c3b0', '#bfb19c'][(x + y * 3) % 4];
            g.fillRect(x * 32 + o + 1, y * 32 + 1, 30, 30); g.fillRect(x * 32 + o - 127, y * 32 + 1, 30, 30);
        }
    }, { repeat: [1, 1], pixel: true });
    TEX.grass = canvasTex(64, 64, (g) => {
        g.fillStyle = '#4d7c32'; g.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 260; i++) { g.fillStyle = ['#3f6b28', '#5a8c3a', '#466f2c'][i % 3]; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 2, 2); }
    }, { repeat: [1, 1], pixel: true });
    TEX.concrete = canvasTex(64, 64, (g) => {
        g.fillStyle = '#8b8f94'; g.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 200; i++) { g.fillStyle = ['#7d8186', '#979ba0', '#85898e'][i % 3]; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 2, 2); }
        g.fillStyle = '#6b6f74'; g.fillRect(0, 0, 64, 1); g.fillRect(0, 0, 1, 64);
    }, { repeat: [1, 1], pixel: true });
    // Asfalt yol + iki yanda kaldırım (enine 16 m: 3 m kaldırım, 10 m yol, 3 m kaldırım), boyuna 4 m'de bir tekrarlar
    TEX.road = canvasTex(256, 64, (g, W, H) => {
        const k = W / 16;
        g.fillStyle = '#c9c3b8'; g.fillRect(0, 0, W, H);
        for (let y = 0; y < H; y += 16) for (let x = 0; x < 3 * k - 8; x += 16) { g.fillStyle = (x + y) % 32 ? '#d4cec3' : '#bdb7ab'; g.fillRect(x + 1, y + 1, 14, 14); g.fillRect(W - x - 15, y + 1, 14, 14); }
        g.fillStyle = '#3f3f46'; g.fillRect(3 * k, 0, 10 * k, H);
        for (let i = 0; i < 300; i++) { g.fillStyle = i % 2 ? '#4b4b53' : '#36363d'; g.fillRect(3 * k + Math.random() * 10 * k, Math.random() * H, 2, 2); }
        g.fillStyle = '#e5e7eb'; g.fillRect(3 * k, 0, 2, H); g.fillRect(13 * k - 2, 0, 2, H);
        g.fillStyle = '#facc15'; g.fillRect(8 * k - 2, 4, 4, H / 2 - 8);
    }, { repeat: [1, 1], pixel: true });
    TEX.cobble = canvasTex(64, 64, (g) => {   // Arnavut kaldırımı
        g.fillStyle = '#57534e'; g.fillRect(0, 0, 64, 64);
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
            g.fillStyle = ['#a8a29e', '#9c958f', '#b5aea6', '#8f8983'][(x * 3 + y) % 4];
            g.fillRect(x * 16 + (y % 2 ? 8 : 0) + 1, y * 16 + 1, 14, 14); g.fillRect(x * 16 + (y % 2 ? 8 : 0) - 63, y * 16 + 1, 14, 14);
        }
    }, { repeat: [1, 1], pixel: true });
    TEX.marble = canvasTex(64, 64, (g) => {   // mermer karolar
        g.fillStyle = '#e7e5e4'; g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#f5f5f4'; g.fillRect(1, 1, 30, 30); g.fillRect(33, 33, 30, 30);
        g.fillStyle = '#d6d3d1'; g.fillRect(33, 1, 30, 30); g.fillRect(1, 33, 30, 30);
        g.strokeStyle = 'rgba(120,113,108,0.35)'; g.beginPath(); g.moveTo(4, 20); g.lineTo(26, 6); g.moveTo(38, 54); g.lineTo(60, 40); g.stroke();
    }, { repeat: [1, 1], pixel: true });
    TEX.sand = canvasTex(64, 64, (g) => {   // kum
        g.fillStyle = '#d6c08a'; g.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 260; i++) { g.fillStyle = ['#c9b07a', '#e2cf9c', '#bfa46c'][i % 3]; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 2, 2); }
    }, { repeat: [1, 1], pixel: true });
    TEX.boards = canvasTex(64, 64, (g) => {   // tahta iskele / sahil yürüyüş yolu
        g.fillStyle = '#7c5a3a'; g.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 4; i++) { g.fillStyle = ['#8b6a47', '#76563a', '#94724d', '#6f5134'][i]; g.fillRect(0, i * 16 + 1, 64, 14); }
        g.fillStyle = '#3f2d1d'; for (let i = 0; i < 4; i++) g.fillRect((i * 23) % 64, i * 16 + 6, 2, 2);
    }, { repeat: [1, 1], pixel: true });
    TEX.brick = canvasTex(64, 64, (g) => {
        g.fillStyle = '#7c2d12'; g.fillRect(0, 0, 64, 64);
        for (let y = 0; y < 4; y++) for (let x = -1; x < 3; x++) {
            g.fillStyle = (x + y) % 3 ? '#b45309' : '#9a3412';
            g.fillRect(x * 32 + (y % 2 ? 16 : 0) + 1, y * 16 + 1, 30, 14);
        }
    }, { repeat: [1, 1], pixel: true });
    TEX.dirt = canvasTex(32, 32, (g) => {
        g.fillStyle = '#6b4f35'; g.fillRect(0, 0, 32, 32);
        for (let i = 0; i < 60; i++) { g.fillStyle = i % 2 ? '#5a4029' : '#7a5c40'; g.fillRect(Math.random() * 32 | 0, Math.random() * 32 | 0, 2, 2); }
    }, { repeat: [1, 1], pixel: true });
    TEX.snow = canvasTex(64, 64, (g) => {   // kar (8. bölüm)
        g.fillStyle = '#eef2f7'; g.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 200; i++) { g.fillStyle = ['#e2e8f0', '#f8fafc', '#dbe3ee'][i % 3]; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 2, 2); }
    }, { repeat: [1, 1], pixel: true });
    TEX.slabs = canvasTex(64, 64, (g) => {   // cezaevi avlusu / meydan beton plakaları (9-10. bölüm)
        g.fillStyle = '#8f8a84'; g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#a19c95'; g.fillRect(1, 1, 30, 30); g.fillRect(33, 33, 30, 30);
        g.fillStyle = '#9a958e'; g.fillRect(33, 1, 30, 30); g.fillRect(1, 33, 30, 30);
        for (let i = 0; i < 80; i++) { g.fillStyle = i % 2 ? '#857f78' : '#aaa59e'; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 1, 1); }
    }, { repeat: [1, 1], pixel: true });
    TEX.gold = canvasTex(32, 32, (g) => {
        g.fillStyle = '#ca8a04'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#facc15'; g.fillRect(2, 2, 28, 28);
        g.fillStyle = '#854d0e'; g.font = 'bold 24px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 16, 18);
    }, { pixel: true });
}
export function tiled(name, rx, ry) { const t = TEX[name].clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t; }

// Kutu biçimli zemin/raf: üstü bir doku, yanları başka doku. topRep: üst dokunun [enine, boyuna] kaç metrede tekrarlayacağı
export function slab(x0, x1, y0, y1, z0, z1, top, side, k = 0.5, topRep = null) {
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
    const sideX = new THREE.MeshLambertMaterial({ map: tiled(side, d * k, h * k) });
    const sideZ = new THREE.MeshLambertMaterial({ map: tiled(side, w * k, h * k) });
    const topM = new THREE.MeshLambertMaterial({ map: topRep ? tiled(top, w / topRep[0], d / topRep[1]) : tiled(top, w * k, d * k) });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideX, sideX, topM, topM, sideZ, sideZ]);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.receiveShadow = true;
    return m;
}

// Pankart: iki direk arasında yazılı bez
export function banner(text, color, w = 5, h = 1.2, bg = '#f8fafc') {
    const g = new THREE.Group();
    const t = canvasTex(512, Math.round(512 * h / w), (c, W, H) => {
        c.fillStyle = bg; c.fillRect(0, 0, W, H);
        c.strokeStyle = color; c.lineWidth = 8; c.strokeRect(6, 6, W - 12, H - 12);
        c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, text, W / 2, H / 2 + 4, W - 40, H * 0.7);
    });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
    cloth.position.y = 2.6; g.add(cloth);
    g.add(box(0.1, 3.3, 0.1, '#57534e', -w / 2, 1.65, 0)); g.add(box(0.1, 3.3, 0.1, '#57534e', w / 2, 1.65, 0));
    return g;
}
export function signBoard(text, color, bg, w, h) {
    const t = canvasTex(512, Math.round(512 * h / w), (c, W, H) => {
        c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
        fitText(c, text, W / 2, H / 2 + 4, W - 30, H * 0.6);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t }));
}
// Giriş kemeri: yolun iki kenarında direkler, üstte iki yüzlü tabela (oyuncu altından geçer, kameranın önünü kapatmaz)
export function entrySign(scene, text, bg) {
    const z = -5;
    [[z - 0.02, Math.PI], [z + 0.02, 0]].forEach(([sz, r]) => {   // iki ayrı yüz (kopyalayıp döndürünce yön güncellenmiyordu)
        const s = signBoard(text, '#f8fafc', bg, 6, 1.3); s.position.set(0, 5.2, sz); s.rotation.set(0, r, 0); scene.add(s);
    });
    scene.add(box(HW * 2 + 0.6, 0.25, 0.25, '#44403c', 0, 5.95, z));
    scene.add(box(0.25, 6, 0.25, '#44403c', -HW - 0.3, 3, z)); scene.add(box(0.25, 6, 0.25, '#44403c', HW + 0.3, 3, z));
}
const glowBall = (color, r, y) => {
    const g = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }));
    g.position.y = y; return g;
};

// --- TOPLANACAKLAR ---
function makeFidan() {   // çınar fidanı (1. bölüm)
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8), mat('#b45309')); pot.position.y = 0.15; g.add(pot);
    g.add(box(0.04, 0.5, 0.04, '#78350f', 0, 0.5, 0, false));
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat('#16a34a'));
    leaf.position.y = 0.8; g.add(leaf);
    const l2 = leaf.clone(); l2.scale.setScalar(0.7); l2.position.set(0.16, 0.62, 0); g.add(l2);
    const l3 = leaf.clone(); l3.scale.setScalar(0.7); l3.position.set(-0.16, 0.66, 0); g.add(l3);
    g.add(glowBall('#86efac', 0.55, 0.55));
    return g;
}
function makeMask() {   // baret + gaz maskesi gücü (1. bölüm)
    const g = new THREE.Group();
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#facc15'));
    hm.position.y = 0.55; g.add(hm); g.add(box(0.66, 0.05, 0.66, '#eab308', 0, 0.55, 0, false));
    g.add(box(0.3, 0.2, 0.14, '#f8fafc', 0, 0.38, 0.2, false));
    g.add(glowBall('#fde047', 0.6, 0.5));
    return g;
}
export function makeBag() {   // kul hakkı torbası (altın tuğladan çıkar)
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), mat('#c8a165')); s.scale.set(1, 1.15, 1); s.position.y = 0.3; g.add(s);
    g.add(box(0.12, 0.14, 0.12, '#7c2d12', 0, 0.62, 0, false));
    g.add(box(0.16, 0.08, 0.02, '#22c55e', 0.05, 0.68, 0, false));
    return g;
}
let shoeTex = null;
function makeShoebox() {   // ayakkabı kutusu: kapağı aralık, içinden dolar desteleri görünür (2. bölüm)
    shoeTex = shoeTex || canvasTex(64, 32, (g) => {
        g.fillStyle = '#ea580c'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#7c2d12'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 30, 64, 2);
        g.fillStyle = '#fff7ed'; g.font = 'bold 13px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SHOES', 32, 17);
    }, { pixel: true });
    const g = new THREE.Group();
    const side = new THREE.MeshLambertMaterial({ map: shoeTex });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.42), [side, side, mat('#c2410c'), mat('#c2410c'), side, side]);
    b.position.y = 0.2; b.castShadow = true; g.add(b);
    for (let i = 0; i < 3; i++) g.add(box(0.24, 0.07, 0.14, i % 2 ? '#16a34a' : '#22c55e', -0.2 + i * 0.2, 0.39, 0.02 * i, false));
    const lid = box(0.74, 0.06, 0.46, '#f97316', -0.1, 0.48, -0.05, false); lid.rotation.z = 0.45; g.add(lid);
    g.add(glowBall('#4ade80', 0.6, 0.35));
    return g;
}
function makeHeart() {   // can (+1)
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(0, -0.3); s.bezierCurveTo(-0.45, 0, -0.32, 0.36, 0, 0.16); s.bezierCurveTo(0.32, 0.36, 0.45, 0, 0, -0.3);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }), mat('#ef4444'));
    m.position.set(0, 0.6, -0.07); m.castShadow = true; g.add(m);
    g.add(glowBall('#fca5a5', 0.55, 0.6));
    return g;
}
let tapeTex = null;
function makeTape() {   // kaset: turuncu etiketinde "SIFIRLA", makaralar (3. bölüm)
    tapeTex = tapeTex || canvasTex(80, 52, (g) => {
        g.fillStyle = '#111827'; g.fillRect(0, 0, 80, 52);
        g.fillStyle = '#f59e0b'; g.fillRect(6, 6, 68, 22);
        g.fillStyle = '#111827'; g.font = 'bold 13px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tr('SIFIRLA'), 40, 17);
        g.fillStyle = '#e5e7eb'; [24, 56].forEach(x => { g.beginPath(); g.arc(x, 39, 8, 0, Math.PI * 2); g.fill(); });
        g.fillStyle = '#4b5563'; g.fillRect(30, 35, 20, 8);
    }, { pixel: true });
    const g = new THREE.Group();
    const face = new THREE.MeshLambertMaterial({ map: tapeTex });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.1), [mat('#111827'), mat('#111827'), mat('#111827'), mat('#111827'), face, face]);
    b.position.y = 0.45; b.castShadow = true; g.add(b);
    g.add(glowBall('#fbbf24', 0.6, 0.45));
    return g;
}
function makeCharger() {   // şarj aleti: beyaz fiş, kablo, yeşil şimşek (5. bölüm)
    const g = new THREE.Group();
    g.add(box(0.42, 0.42, 0.2, '#f8fafc', 0, 0.55, 0));
    g.add(box(0.06, 0.18, 0.06, '#9ca3af', -0.1, 0.84, 0, false)); g.add(box(0.06, 0.18, 0.06, '#9ca3af', 0.1, 0.84, 0, false));
    const bolt = new THREE.Shape(); bolt.moveTo(0.03, 0.15); bolt.lineTo(-0.09, -0.01); bolt.lineTo(0, -0.01); bolt.lineTo(-0.03, -0.15); bolt.lineTo(0.09, 0.03); bolt.lineTo(0, 0.03); bolt.closePath();
    const b = new THREE.Mesh(new THREE.ShapeGeometry(bolt), new THREE.MeshBasicMaterial({ color: '#16a34a', side: THREE.DoubleSide })); b.position.set(0, 0.55, 0.11); g.add(b);
    const cable = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 5, 12, Math.PI * 1.2), mat('#f8fafc')); cable.position.set(0.1, 0.3, 0); g.add(cable);
    g.add(glowBall('#4ade80', 0.6, 0.55));
    return g;
}
const ITEM_MAKERS = { fidan: makeFidan, mask: makeMask, bag: makeBag, shoebox: makeShoebox, heart: makeHeart, tape: makeTape, charger: makeCharger };
export function makeItem(kind) { return ITEM_MAKERS[kind](); }

// L: bölüm verisi (level1.js, level2.js)
export function buildWorld(scene, L) {
    textures();
    const W = { L, solids: [], items: [], bricks: [], movers: [] };
    const addSolid = (a, mesh) => { a.mesh = mesh || null; W.solids.push(a); return a; };
    const G0 = L.ground;
    // İlk yol parçası mahalleyi de kapsayacak şekilde uzar (bölüm dosyalarındaki koordinatlar değişmez)
    const segs = L.segs.map((s, i) => i === 0 ? [EXT_Z0, s[1]] : s);
    const plan = W.plan = districtPlan(L);
    W.segs = segs;

    // Zemin parçaları (yol) ve meydan
    segs.forEach(([z0, z1]) => {
        const m = slab(-HW, HW, -3, 0, z0, z1, G0.top, G0.side, 0.5, G0.rep); scene.add(m);
        addSolid(new AABB(-HW, -3, z1, HW, 0, z0, 'ground'), m);
    });
    { const m = slab(-ARENA.hw, ARENA.hw, -3, 0, ARENA.z0, ARENA.z1, G0.arena, G0.side, 0.5); scene.add(m);
      addSolid(new AABB(-ARENA.hw, -3, ARENA.z1, ARENA.hw, 0, ARENA.z0, 'ground'), m); }
    // Çukurların dibi
    if (L.pitFloor) { const mud = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 200), mat(L.pitFloor)); mud.rotation.x = -Math.PI / 2; mud.position.set(0, -3.2, -90); scene.add(mud); }
    // Yolun iki yanı ve meydanın arkası
    const oRep = L.outerRep || 3;
    const flat = (x0, x1, z0, z1) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z0 - z1), new THREE.MeshLambertMaterial({ map: tiled(L.outer, (x1 - x0) / oRep, (z0 - z1) / oRep) }));
        m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.0, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
    };
    if (!L.noOuter) {   // köprü bölümünde yolun yanı boşluk (aşağıda deniz)
        flat(-90, -HW - 0.01, EXT_Z0 + 40, ARENA.z0); flat(HW + 0.01, 90, EXT_Z0 + 40, ARENA.z0);
        flat(-90, -ARENA.hw, ARENA.z0, -320); flat(ARENA.hw, 90, ARENA.z0, -320); flat(-ARENA.hw, ARENA.hw, ARENA.z1, -320);
        flat(-HW, HW, EXT_Z0 + 40, EXT_Z0);
    }

    // Görünmez duvarlar (yoldan çıkılmaz)
    const wall = (x0, x1, z0, z1) => addSolid(new AABB(x0, -20, z1, x1, 12, z0, 'wall'));
    // yolun iki yanı: ara sokakların ağzında açıklık
    const gaps = s => plan.junctions.filter(j => j.s === s).map(j => [j.z + j.hw, j.z - j.hw]);
    const along = (s, z0, z1, fn) => {   // z0 > z1 aralığını açıklıklardan bölerek fn(a, b) çağırır
        let top = z0;
        gaps(s).sort((a, b) => b[0] - a[0]).forEach(([g0, g1]) => { if (g0 < top && g1 > z1) { fn(top, g0); top = g1; } });
        fn(top, z1);
    };
    [-1, 1].forEach(s => along(s, EXT_Z0 + 2, ARENA.z0, (a, b) => wall(s < 0 ? -HW - 1 : HW, s < 0 ? -HW : HW + 1, a, b)));
    wall(-HW, HW, EXT_Z0 + 2, EXT_Z0 + 0.5);
    // ara sokaklar: zemin, iki yan duvar ve dip duvarı
    plan.junctions.forEach(j => {
        const x0 = j.s * HW, x1 = j.s * (HW + j.len), lo = Math.min(x0, x1), hi = Math.max(x0, x1);
        const m = slab(lo, hi, -3, 0.02, j.z + j.hw, j.z - j.hw, G0.top === 'road' ? 'pave' : G0.top, G0.side, 0.5, G0.top === 'road' ? null : G0.rep); scene.add(m);
        addSolid(new AABB(lo, -3, j.z - j.hw, hi, 0, j.z + j.hw, 'ground'), m);
        wall(lo, hi, j.z + j.hw + 1, j.z + j.hw); wall(lo, hi, j.z - j.hw, j.z - j.hw - 1);
        wall(j.s < 0 ? lo - 1 : hi, j.s < 0 ? lo : hi + 1, j.z + j.hw, j.z - j.hw);
    });
    wall(-ARENA.hw - 1, -HW, ARENA.z0 + 0.5, ARENA.z0); wall(HW, ARENA.hw + 1, ARENA.z0 + 0.5, ARENA.z0);
    wall(-ARENA.hw - 1, -ARENA.hw, ARENA.z0, ARENA.z1); wall(ARENA.hw, ARENA.hw + 1, ARENA.z0, ARENA.z1);
    wall(-ARENA.hw, ARENA.hw, ARENA.z1, ARENA.z1 - 1);

    // Yol kenarı (çit ya da demir bariyer) ve meydanın kenarında alçak duvar
    const edge = L.edge, edgeM = mat(edge.color);
    segs.forEach(([z0, z1]) => [-1, 1].forEach(s => along(s, z0, z1, (a, b) => {
        if (a - b < 0.2) return;
        const h = new THREE.Mesh(new THREE.BoxGeometry(edge.w, edge.h, Math.abs(a - b)), edgeM);
        h.position.set(s * (HW + edge.w / 2), edge.h / 2, (a + b) / 2); h.castShadow = h.receiveShadow = true; scene.add(h);
    })));
    [-1, 1].forEach(s => scene.add(box(0.6, 0.7, ARENA.z0 - ARENA.z1, '#a8a29e', s * (ARENA.hw + 0.3), 0.35, (ARENA.z0 + ARENA.z1) / 2)));
    scene.add(box(ARENA.hw * 2, 0.7, 0.6, '#a8a29e', 0, 0.35, ARENA.z1 - 0.3));

    // Çukur kenarlarında dubalar ve tabela
    const pits = segs.slice(0, -1).map(([, z1], i) => (z1 + segs[i + 1][0]) / 2);
    pits.forEach((pz, i) => {
        [-1, 1].forEach(s => [-1.9, 1.9].forEach(dz => {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 6), mat('#f97316'));
            cone.position.set(s * (HW - 0.4), 0.28, pz + dz); scene.add(cone);
            scene.add(box(0.37, 0.07, 0.37, '#f8fafc', s * (HW - 0.4), 0.3, pz + dz, false));
        }));
        const sb = signBoard(L.pitSign, '#f8fafc', '#b91c1c', 4, 0.9);
        const side = i % 2 ? 1 : -1;
        sb.position.set(side * (HW + 2.2), 1.9, pz); sb.rotation.y = -side * Math.PI / 2; scene.add(sb);
        scene.add(box(0.1, 1.5, 0.1, '#44403c', side * (HW + 2.2), 0.75, pz - 1.6)); scene.add(box(0.1, 1.5, 0.1, '#44403c', side * (HW + 2.2), 0.75, pz + 1.6));
    });

    // Tuğla raflar
    L.shelves.forEach(([x, top, z, w, d]) => {
        const m = slab(x - w / 2, x + w / 2, top - 0.35, top, z - d / 2, z + d / 2, 'brick', 'brick', 1);
        m.castShadow = true; scene.add(m);
        addSolid(new AABB(x - w / 2, top - 0.35, z - d / 2, x + w / 2, top, z + d / 2, 'shelf'), m);
    });
    // Bölüme özel katı yapılar (köprü tabliyesi vb.): [x0, y0, z0, x1, y1, z1]; çizimi bölümün decorate'inde
    (L.solids || []).forEach(([x0, y0, z0, x1, y1, z1, type]) => addSolid(new AABB(x0, y0, z0, x1, y1, z1, type || 'shelf')));

    // Kırılabilir tuğlalar (alttan kafa, balyoz ya da mermiyle); ortadaki altın tuğladan kul hakkı torbası çıkar
    L.brickRows.forEach(([cx, z]) => [-1, 0, 1].forEach(k => {
        const gold = k === 0, x = cx + k;
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: gold ? TEX.gold : TEX.brick }));
        m.position.set(x, BRICK_Y + 0.5, z); m.castShadow = true; scene.add(m);
        const a = addSolid(new AABB(x - 0.5, BRICK_Y, z - 0.5, x + 0.5, BRICK_Y + 1, z + 0.5, 'brick'), m);
        W.bricks.push({ aabb: a, mesh: m, gold, broken: false });
    }));

    // Toplanacaklar: [tür, x, y, z]
    L.items.forEach(([kind, x, y, z]) => {
        const g = makeItem(kind); g.position.set(x, y, z); scene.add(g);
        W.items.push({ kind, mesh: g, pos: g.position, baseY: y, taken: false });
    });

    // Kontrol noktası bayrağı
    {
        const g = new THREE.Group(); g.position.set(HW - 1, 0, L.checkpointZ); scene.add(g);
        g.add(box(0.12, 4, 0.12, '#e5e7eb', 0, 2, 0));
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshLambertMaterial({ color: '#6b7280', side: THREE.DoubleSide }));
        cloth.position.set(-0.75, 1.0, 0); g.add(cloth);
        W.checkpoint = { z: L.checkpointZ, cloth, reached: false };
    }

    // Meydan kapısı: hedef sayıda düşman yenilince yere iner
    {
        const g = new THREE.Group(); g.position.set(0, 0, ARENA.z0 + 0.3); scene.add(g);
        L.buildGate(g);
        const c = document.createElement('canvas'); c.width = 512; c.height = 128;
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: tex }));
        sign.position.set(0, 3.4, 0.5); g.add(sign);
        const a = addSolid(new AABB(-HW, -1, ARENA.z0 - 0.3, HW, 6, ARENA.z0 + 0.9, 'wall'));
        W.barricade = {
            group: g, aabb: a, open: false, t: 0,
            setCount(n) {
                const x = c.getContext('2d');
                x.fillStyle = L.gateColor; x.fillRect(0, 0, 512, 128); x.fillStyle = '#fef2f2'; x.textAlign = 'center'; x.textBaseline = 'middle';
                fitText(x, n > 0 ? tf('GEÇMEK İÇİN {0} {1} DAHA', n, tr(L.gateWho)) : 'YOL AÇIK!', 256, 68, 480, 60);
                tex.needsUpdate = true;
            }
        };
    }

    buildStreets(scene, W, L);   // mahalle, ara sokaklar, engeller (siper), güç tuğlaları, pusu düşmanları
    L.decorate(scene, W);
    return W;
}

// Her karede: toplanacaklar döner, bayrak dalgalanır, bölümün hareketli süsleri oynar, kapı iner
export function updateWorld(W, dt, time) {
    W.items.forEach(it => {
        if (it.taken) return;
        it.mesh.rotation.y += dt * 1.6;
        it.mesh.position.y = it.baseY + 0.1 + Math.sin(time * 3 + it.pos.x) * 0.1;
    });
    W.movers.forEach(m => m(dt, time));
    if (W.checkpoint) W.checkpoint.cloth.rotation.y = Math.sin(time * 3) * 0.2;
    const b = W.barricade;
    if (b && b.open && b.t < 1) { b.t = Math.min(1, b.t + dt / 1.6); b.group.position.y = -4.2 * b.t; }
}
