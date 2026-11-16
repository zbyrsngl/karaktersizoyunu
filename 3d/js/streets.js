// HIRHIZ 3D: sokak çatışması — her bölümün başına eklenen mahalle ve bütün yola dağılan siperler, güç tuğlaları.
//  • Mahalle (z = EXT_Z0 … 22): iki yanda bitişik binalar (dükkân tabelalı), iki kavşakta ara sokaklar (world.js districtPlan);
//    köprü bölümünde (noOuter) bina/sokak yok, yalnızca terk edilmiş arabalar ve kum torbaları.
//  • Siperler: arabalar, beton bariyerler, sandık yığınları, çöp konteynerleri, kum torbaları, kütükler…
//    Katıdır: mermiler (seninki de düşmanınki de) içinden geçmez, üstlerine çıkılır, düşmanlar etrafından dolaşır.
//  • Pusu: ara sokaklarda bekleyen düşmanlar, kavşağa gelince "PUSU!" diye hep birlikte saldırıya geçer.
//  • Güç tuğlaları (mavi ★): içinden el bombası (her bölümde 3 sabit yerde), can, kalkan gücü, hız, dev balyoz çıkar (powerups.js).
// Yerleşim bölüm numarasıyla tohumlanmış rastgele sayılarla yapılır: her açılışta aynı.
import * as THREE from 'three';
import { G, toast } from './state.js?v=23';
import { box, mat, canvasTex, AABB } from './util.js?v=23';
import { HW, ARENA, EXT_Z0, START_Z, BRICK_Y, signBoard, TEX } from './world.js?v=23';
import { powerBrickTex, POWER_KINDS } from './powerups.js?v=23';
import { groundAt } from './physics.js?v=23';

// --- TEMALAR (bölüme göre) ---
const THEMES = {
    1:  { walls: ['#e7d3b5', '#d6b89a', '#c9b8a6'], roof: '#7c2d12', props: ['burnt', 'barricade', 'crates', 'bins'] },
    2:  { walls: ['#cbd5e1', '#e2e8f0', '#b8c2cf'], roof: '#475569', props: ['policecar', 'barrier', 'car', 'dumpster'] },
    3:  { walls: ['#f5f5f4', '#fde68a', '#fecaca'], roof: '#9a3412', props: ['car', 'crates', 'barrier', 'policecar'] },
    4:  { walls: ['#94a3b8'], roof: '#334155', props: ['car', 'sandbags', 'burnt', 'car'] },
    5:  { walls: ['#fef3c7', '#e0f2fe', '#fde68a'], roof: '#c2410c', props: ['sandbags', 'crates', 'car', 'barrier'] },
    8:  { walls: ['#7c4a24', '#8b5a2b', '#6b3f1d'], roof: '#e2e8f0', props: ['logs', 'hay', 'crates', 'logs'] },
    9:  { walls: ['#a8a29e', '#d6d3d1', '#8f8a84'], roof: '#44403c', props: ['barrier', 'crates', 'policecar', 'dumpster'] },
    10: { walls: ['#e7e5e4', '#f5deb3', '#d6d3d1'], roof: '#57534e', props: ['policecar', 'barrier', 'car', 'dumpster'] }
};
const SHOPS = ['BAKKAL', 'BERBER', 'ÇAY OCAĞI', 'LOKANTA', 'ECZANE', 'KIRTASİYE', 'FIRIN', 'KUAFÖR', 'DÖNERCİ', 'TERZİ', 'KASAP', 'MANAV'];
const SHOP_COLORS = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#7c3aed', '#0f766e'];

// Tohumlu rastgele (mulberry32)
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const isNight = L => { const c = new THREE.Color(L.sky[0]); return c.r + c.g + c.b < 0.6; };

// --- BİNALAR: aynı cephe dokusunu paylaşanlar tek geometride birleşir (az çizim çağrısı) ---
function facadeTex(wall, night) {
    // bir bölme = 4 m genişlik, 3.5 m kat; pencere, pervaz, kat çizgisi
    const t = canvasTex(64, 56, (g, W, H) => {
        g.fillStyle = wall; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, H - 4, W, 4);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(18, 40, 28, 3);
        g.fillStyle = night ? '#fbbf24' : '#334155'; g.fillRect(20, 12, 24, 28);
        g.fillStyle = night ? '#fde68a' : '#64748b'; g.fillRect(22, 14, 9, 24);
        g.fillStyle = wall; g.fillRect(31, 12, 2, 28);
    }, { repeat: [1, 1], pixel: true });
    return t;
}
function emissiveTex() {   // gece: yalnızca pencereler parlar
    return canvasTex(64, 56, (g, W, H) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.fillStyle = '#b45309'; g.fillRect(20, 12, 24, 28); }, { repeat: [1, 1], pixel: true });
}
class Merger {
    constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; }
    quad(a, b, c, d, n, uw, vh) {   // a,b,c,d: saat yönü tersine köşeler (sol alt, sağ alt, sağ üst, sol üst)
        const i = this.pos.length / 3;
        [a, b, c, d].forEach(p => this.pos.push(p[0], p[1], p[2]));
        for (let k = 0; k < 4; k++) this.nor.push(n[0], n[1], n[2]);
        this.uv.push(0, 0, uw, 0, uw, vh, 0, vh);
        this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    }
    // x0<x1, z0<z1, yükseklik h: dört yan yüz (UV metre / bölme)
    box(x0, x1, z0, z1, h, bw = 4, bh = 3.5) {
        const W = x1 - x0, D = z1 - z0;
        this.quad([x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], [0, 0, 1], W / bw, h / bh);
        this.quad([x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0], [0, 0, -1], W / bw, h / bh);
        this.quad([x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1], [1, 0, 0], D / bw, h / bh);
        this.quad([x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0], [-1, 0, 0], D / bw, h / bh);
    }
    top(x0, x1, z0, z1, h) { this.quad([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], [0, 1, 0], 1, 1); }
    mesh(material) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
        g.setIndex(this.idx); g.computeBoundingSphere();
        const m = new THREE.Mesh(g, material); m.receiveShadow = true;
        return m;
    }
}

// --- SİPERLER (engeller) ---
// Her biri: { w, d, h, build(group) } — w: x boyu, d: z boyu (dönmeden önce); katı kutu w×h×d
const GEO = { wheel: new THREE.CylinderGeometry(0.36, 0.36, 1.9, 10) };
function carMesh(g, body, cabin, glass, extra) {
    g.add(box(1.9, 0.75, 4.2, body, 0, 0.62, 0));
    g.add(box(1.7, 0.6, 2.2, cabin, 0, 1.28, -0.2));
    g.add(box(1.72, 0.42, 2.0, glass, 0, 1.3, -0.2, false));
    [-1.35, 1.35].forEach(z => { const w = new THREE.Mesh(GEO.wheel, mat('#111827')); w.rotation.z = Math.PI / 2; w.position.set(0, 0.36, z); g.add(w); });
    g.add(box(0.5, 0.15, 0.05, '#fde68a', -0.6, 0.75, 2.11, false)); g.add(box(0.5, 0.15, 0.05, '#fde68a', 0.6, 0.75, 2.11, false));
    extra && extra(g);
}
const PROPS = {
    car: { w: 1.9, d: 4.2, h: 1.45, build: (g, r) => { const c = ['#dc2626', '#2563eb', '#f8fafc', '#16a34a', '#facc15', '#475569'][Math.floor(r() * 6)]; carMesh(g, c, c, '#7dd3fc'); } },
    burnt: { w: 1.9, d: 4.2, h: 1.45, build: (g) => carMesh(g, '#292524', '#1c1917', '#0c0a09', g2 => { g2.rotation.z = 0.04; for (let i = 0; i < 3; i++) g2.add(box(0.3, 0.05, 0.3, '#57534e', -0.4 + i * 0.4, 1.0, 1.2, false)); }) },
    policecar: { w: 1.9, d: 4.2, h: 1.45, build: (g) => carMesh(g, '#f8fafc', '#1e3a8a', '#7dd3fc', g2 => {
        g2.add(box(1.92, 0.18, 4.22, '#1d4ed8', 0, 0.75, 0, false));
        const lb = box(0.9, 0.16, 0.3, '#ef4444', 0, 1.66, -0.2, false); lb.userData.siren = true; g2.add(lb);
        const lb2 = box(0.45, 0.17, 0.31, '#3b82f6', 0.22, 1.66, -0.2, false); lb2.userData.siren2 = true; g2.add(lb2);
    }) },
    barrier: { w: 3.0, d: 0.7, h: 0.95, build: (g) => {   // beton bariyer, kırmızı-beyaz
        g.add(box(3.0, 0.95, 0.7, '#d6d3d1', 0, 0.475, 0));
        for (let i = 0; i < 4; i++) g.add(box(0.36, 0.3, 0.72, i % 2 ? '#f8fafc' : '#dc2626', -1.1 + i * 0.73, 0.75, 0, false));
    } },
    barricade: { w: 3.2, d: 1.0, h: 1.2, build: (g) => {   // taş, lastik ve kasadan barikat (Gezi)
        for (let i = 0; i < 4; i++) g.add(box(0.8, 0.7 + (i % 2) * 0.3, 0.9, ['#78716c', '#57534e', '#a8a29e'][i % 3], -1.2 + i * 0.8, 0.4, 0));
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.14, 6, 10), mat('#1c1917')); t.position.set(0.4, 1.1, 0); g.add(t);
    } },
    crates: { w: 2.0, d: 1.0, h: 2.0, build: (g, r) => {   // iki katlı sandık yığını (basamak gibi tırmanılır)
        g.add(box(1, 1, 1, '#a16207', -0.5, 0.5, 0)); g.add(box(1, 1, 1, '#92400e', 0.5, 0.5, 0)); g.add(box(1, 1, 1, '#b45309', -0.5, 1.5, 0));
        [-0.5, 0.5].forEach(x => g.add(box(1.02, 0.12, 1.02, '#713f12', x, 0.5, 0, false)));
    }, cells: [[-0.5, 1], [0.5, 1], [-0.5, 2]] },
    dumpster: { w: 1.9, d: 1.2, h: 1.35, build: (g) => { g.add(box(1.9, 1.2, 1.2, '#166534', 0, 0.6, 0)); g.add(box(1.95, 0.12, 1.25, '#14532d', 0, 1.27, 0)); } },
    bins: { w: 1.6, d: 0.8, h: 1.1, build: (g) => { [-0.4, 0.4].forEach((x, i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 1.05, 10), mat(i ? '#64748b' : '#15803d')); b.position.set(x, 0.53, 0); g.add(b); }); } },
    sandbags: { w: 3.0, d: 0.9, h: 0.9, build: (g) => { for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - (r === 2 ? 1 : 0); i++) { const b = box(0.72, 0.3, 0.85, r % 2 ? '#a8946a' : '#bfa97a', -1.1 + i * 0.73 + (r % 2) * 0.36, 0.15 + r * 0.3, 0); g.add(b); } } },
    logs: { w: 3.2, d: 1.0, h: 0.85, build: (g) => { [[0, 0.3, -0.25], [0, 0.3, 0.25], [0, 0.72, 0]].forEach(([x, y, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.2, 8), mat('#78350f')); l.rotation.z = Math.PI / 2; l.position.set(x, y, z); g.add(l); }); } },
    hay: { w: 1.6, d: 1.2, h: 1.1, build: (g) => { g.add(box(1.6, 1.1, 1.2, '#eab308', 0, 0.55, 0)); g.add(box(1.62, 0.08, 1.22, '#a16207', 0, 0.8, 0, false)); g.add(box(1.62, 0.25, 1.22, '#f1f5f9', 0, 1.08, 0, false)); } }
};

// --- KURULUM ---
export function buildStreets(scene, W, L) {
    const R = rng(L.id * 9973 + 17), T = THEMES[L.id] || THEMES[2], night = isNight(L);
    const plan = W.plan, J = plan.junctions;
    const add = (o) => { scene.add(o); return o; };
    const solid = (x0, y0, z0, x1, y1, z1, mesh) => { const a = new AABB(x0, y0, z0, x1, y1, z1, 'solid'); a.mesh = mesh || null; W.solids.push(a); return a; };
    W.sirens = [];
    W.cull = [];   // uzakta gizlenecek küçük nesneler (main.js cullFar)
    const far = (o) => { W.cull.push({ o, x: o.position.x, z: o.position.z }); return o; };

    // 1) Binalar (köprüde yok)
    if (!L.noOuter) buildDistrict(scene, W, L, R, T, night, J);

    // 2) Mahalledeki ve ara sokaklardaki düşmanlar (pusu): bölümün kendi düşman türlerinden
    const kinds = L.spawns.filter(s => s.length === 3 && s[0] !== 'duran').map(s => s[0]);
    const pick = () => kinds[Math.floor(R() * kinds.length)];
    const extra = [];
    J.forEach(j => { extra.push([pick(), j.s * (HW + 9), j.z + (R() - 0.5) * 3], [pick(), j.s * (HW + 18), j.z + (R() - 0.5) * 3]); });
    const mainZ = [84, 58, 30];
    const need = Math.max(3, 8 - extra.length);
    for (let i = 0; i < need; i++) extra.push([pick(), (i % 2 ? 1 : -1) * (2 + R() * 4), mainZ[i % 3] - Math.floor(i / 3) * 8]);
    W.spawns = [...extra, ...L.spawns];
    W.ambush = J.map(j => ({ ...j, fired: false }));

    // 3) Siperler: önce mahalle (sık), sonra eski yol boyunca (seyrek); ara sokaklarda da birkaç tane
    const pits = W.segs.slice(0, -1).map(([, z1], i) => [W.segs[i + 1][0], z1]);   // [alt, üst] z
    const homes = W.spawns.map(s => [s[1], s[2]]);
    const taken = [];   // yerleşen siperlerin kutuları (xz)
    const okAt = (x0, x1, z0, z1) => {
        for (const [a, b] of pits) if (z1 > a - 5 && z0 < b + 5) return false;                  // çukur kenarında değil
        if (z1 > START_Z - 4) return false;                                                    // doğuş yerini kapatma
        if (Math.abs((z0 + z1) / 2 - W.L.checkpointZ) < 4 && x1 > HW - 3) return false;       // kontrol noktası bayrağı
        for (const [hx, hz] of homes) if (hx > x0 - 3.6 && hx < x1 + 3.6 && hz > z0 - 3.6 && hz < z1 + 3.6) return false;
        for (const it of L.items) if (it[1] > x0 - 1.4 && it[1] < x1 + 1.4 && it[3] > z0 - 1.4 && it[3] < z1 + 1.4) return false;
        for (const a of W.solids) {
            if (!a.active || a.type === 'ground' || a.type === 'wall') continue;
            if (a.max.x > x0 - 1 && a.min.x < x1 + 1 && a.max.z > z0 - 1 && a.min.z < z1 + 1 && a.min.y < 3) return false;
        }
        for (const t of taken) if (t[1] > x0 - 2.2 && t[0] < x1 + 2.2 && t[3] > z0 - 2.2 && t[2] < z1 + 2.2) return false;
        for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { const g = groundAt(W.solids, cx, cz, 0.5); if (g < -0.05 || g > 0.05) return false; }
        return true;
    };
    const place = (kind, x, z, rotY) => {
        const P = PROPS[kind], along = Math.abs(Math.sin(rotY)) > 0.5;   // 90° dönükse w ile d yer değiştirir
        const w = along ? P.d : P.w, d = along ? P.w : P.d;
        const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
        if (!okAt(x0, x1, z0, z1)) return false;
        const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; P.build(g, R); far(add(g));
        g.traverse(o => { if (o.userData.siren) W.sirens.push([o, 0]); if (o.userData.siren2) W.sirens.push([o, 1]); });
        if (P.cells) P.cells.forEach(([cx, top]) => { const wx = x + (along ? 0 : cx), wz = z + (along ? -cx : 0); solid(wx - 0.5, top - 1, wz - 0.5, wx + 0.5, top, wz + 0.5); });
        else solid(x0, 0, z0, x1, P.h, z1);
        taken.push([x0, x1, z0, z1]);
        return true;
    };
    const props = T.props, prop = () => props[Math.floor(R() * props.length)];
    const scatter = (zTop, zBot, step, tries) => {
        for (let z = zTop; z > zBot; z -= step * (0.8 + R() * 0.5)) {
            for (let k = 0; k < tries; k++) {
                const kind = prop(), lane = [-5.6, -2.6, 2.6, 5.6][Math.floor(R() * 4)];
                const rot = (kind === 'car' || kind === 'burnt' || kind === 'policecar') ? (R() < 0.75 ? 0 : Math.PI / 2 + (R() - 0.5) * 0.3) : (R() < 0.8 ? 0 : Math.PI / 2);
                if (place(kind, lane + (R() - 0.5), z + (R() - 0.5) * 2, rot)) break;
            }
        }
    };
    scatter(EXT_Z0 - 10, 18, 6.5, 6);            // mahalle: sık siper
    scatter(14, ARENA.z0 + 8, 15, 5);             // eski yol: seyrek (bölümün dengesi bozulmasın)
    J.forEach(j => {                               // ara sokaklarda: yanlara park etmiş araba, konteyner, sandık
        for (let i = 0; i < 3; i++) {
            const kind = i === 0 ? (props.includes('policecar') ? 'policecar' : props.includes('car') ? 'car' : props[0]) : prop();
            place(kind, j.s * (HW + 5 + i * 7 + R() * 2), j.z + (i % 2 ? 1 : -1) * (j.hw - 1.4), Math.PI / 2);
        }
    });

    // 4) Tuğlalar: yeni tuğla sıraları ve mavi ★ güç tuğlaları
    const brickOk = (x, z) => {
        const g = groundAt(W.solids, x, z, 0.5, 0.5); if (g < -0.05 || g > 0.05) return false;
        for (const [a, b] of pits) if (z > a - 2 && z < b + 2) return false;
        for (const a of W.solids) {
            if (!a.active || a.type === 'ground' || a.type === 'wall') continue;
            if (a.max.x > x - 1.6 && a.min.x < x + 1.6 && a.max.z > z - 1.6 && a.min.z < z + 1.6 && a.min.y < BRICK_Y + 2.6) return false;
        }
        for (const b of W.bricks) if (Math.abs(b.mesh.position.x - x) < 3 && Math.abs(b.mesh.position.z - z) < 3) return false;
        if (z > START_Z - 3) return false;
        return true;
    };
    const brick = (x, z, power) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: power ? powerBrickTex() : TEX.brick, emissive: power ? '#1e3a8a' : '#000', emissiveIntensity: power ? 0.35 : 0 }));
        m.position.set(x, BRICK_Y + 0.5, z); m.castShadow = true; add(m);
        const a = new AABB(x - 0.5, BRICK_Y, z - 0.5, x + 0.5, BRICK_Y + 1, z + 0.5, 'brick'); a.mesh = m; W.solids.push(a);
        W.bricks.push({ aabb: a, mesh: m, gold: false, power: power || null, broken: false });
    };
    const findSpot = (zTop, zBot, xs) => {
        for (let k = 0; k < 40; k++) {
            const z = zBot + R() * (zTop - zBot), x = xs ? xs[Math.floor(R() * xs.length)] : (R() - 0.5) * 11;
            if (brickOk(x, z) && brickOk(x - 1, z) && brickOk(x + 1, z)) return [x, z];
        }
        return null;
    };
    // güçlerin dağıtımı: 3 sabit el bombası (mahalle, yolun ortası, sona doğru) + 6 rastgele güç
    const span = [[EXT_Z0 - 14, 20], [10, -80], [-80, ARENA.z0 + 6]];
    const powers = [];
    span.forEach(([a, b]) => powers.push(['grenade', a, b]));
    for (let i = 0; i < 6; i++) { const s = span[i % 3]; powers.push([POWER_KINDS[(i + L.id) % POWER_KINDS.length], s[0], s[1]]); }
    powers.forEach(([kind, a, b]) => {
        const at = findSpot(a, b); if (!at) return;
        const [x, z] = at, side = R() < 0.5 ? -1 : 1;
        brick(x, z, kind); if (R() < 0.7) brick(x + side, z); else { brick(x - 1, z); brick(x + 1, z); }
    });
    for (let i = 0; i < 6; i++) { const s = span[i % 3], at = findSpot(s[0], s[1]); if (at) [-1, 0, 1].forEach(k => brick(at[0] + k, at[1])); }   // düz tuğla sıraları
    // ara sokağın dibinde ödül: güç tuğlası (pusuyu temizleyene)
    J.forEach((j, i) => { const x = j.s * (HW + j.len - 4); if (brickOk(x, j.z)) brick(x, j.z, POWER_KINDS[(i + 1) % POWER_KINDS.length]); });
    W.bricks.forEach(b => W.cull.push({ o: b.mesh, x: b.mesh.position.x, z: b.mesh.position.z, brick: b }));
    W.powerSpots = W.bricks.filter(b => b.power).map(b => [b.power, +b.mesh.position.x.toFixed(1), +b.mesh.position.z.toFixed(1)]);

    // 5) Köprüde (4. bölüm) mahalle yerine köprü korkulukları ve lambalar devam eder
    if (L.noOuter) for (let z = EXT_Z0 - 4; z > 12; z -= 12) [-1, 1].forEach(s => {
        add(box(0.12, 4.2, 0.12, '#64748b', s * (HW + 0.3), 2.1, z));
        add(box(1.0, 0.1, 0.1, '#64748b', s * (HW - 0.2), 4.2, z));
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: '#fde68a' })); l.position.set(s * (HW - 0.6), 4.05, z); add(l);
    });
}

function buildDistrict(scene, W, L, R, T, night, J) {
    const add = (o) => { scene.add(o); return o; };
    const sides = [-1, 1];
    const variants = T.walls.map(c => ({ wall: c, m: new Merger() }));
    const roofs = new Merger();
    const signs = [];
    const building = (x0, x1, z0, z1, h, faceS) => {
        const v = variants[Math.floor(R() * variants.length)];
        v.m.box(x0, x1, z0, z1, h); roofs.top(x0, x1, z0, z1, h);
        if (faceS !== undefined && R() < 0.75) signs.push([faceS, faceS < 0 ? x0 : x1, (z0 + z1) / 2, Math.min(z1 - z0 - 1, 5)]);
    };
    // yol boyunca bloklar (kavşaklarda boşluk)
    sides.forEach(s => {
        const gaps = J.filter(j => j.s === s).map(j => [j.z + j.hw + 0.2, j.z - j.hw - 0.2]);
        let z = EXT_Z0 + 10;
        const zEnd = 22;
        while (z > zEnd) {
            const inGap = gaps.find(([a, b]) => z <= a && z > b);
            if (inGap) { z = inGap[1]; continue; }
            const below = gaps.filter(([a]) => a < z).sort((p, q) => q[0] - p[0])[0];
            let zz = z - (7 + R() * 5);
            if (below && zz < below[0]) zz = below[0];
            zz = Math.max(zEnd, zz);
            if (z - zz < 2) { z = zz - 0.01; continue; }
            const dep = 9 + R() * 3, h = 7 + Math.floor(R() * 4) * 3.5;
            const xa = s * (HW + 1.3), xb = s * (HW + 1.3 + dep);
            building(Math.min(xa, xb), Math.max(xa, xb), zz, z, h, -s);
            z = zz - 0.15;
        }
        // en baştaki kapanış binası (yolun arkası)
    });
    building(-HW - 12, HW + 12, EXT_Z0 + 3, EXT_Z0 + 12, 14);
    // ara sokakların iki yanı ve dibi
    J.forEach(j => {
        const s = j.s;
        for (const zs of [1, -1]) {
            let x = HW + 13.5;
            while (x < HW + j.len + 2) {
                const len = 6 + R() * 4, h = 7 + Math.floor(R() * 3) * 3.5;
                const xa = s * x, xb = s * (x + len);
                const za = j.z + zs * (j.hw + 0.3), zb = j.z + zs * (j.hw + 0.3 + 9);
                building(Math.min(xa, xb), Math.max(xa, xb), Math.min(za, zb), Math.max(za, zb), h);
                x += len + 0.15;
            }
        }
        const xe = s * (HW + j.len + 1.2);
        building(Math.min(xe, xe + s * 8), Math.max(xe, xe + s * 8), j.z - j.hw - 9.5, j.z + j.hw + 9.5, 17.5);
        // köşede sokak tabelası
        const sb = signBoard('ARA SOKAK', '#f8fafc', '#1d4ed8', 2.6, 0.6);
        sb.position.set(s * (HW + 0.9), 3.0, j.z + j.hw + 0.5); sb.rotation.y = -s * Math.PI / 2; add(sb);
        add(box(0.1, 3.3, 0.1, '#334155', s * (HW + 0.95), 1.65, j.z + j.hw + 0.5));
    });
    // birleşik binalar
    variants.forEach(v => {
        if (!v.m.pos.length) return;
        const tex = facadeTex(v.wall, night);
        const m = v.m.mesh(new THREE.MeshLambertMaterial({ map: tex, ...(night ? { emissive: '#ffffff', emissiveMap: emissiveTex(), emissiveIntensity: 0.9 } : {}) }));
        m.castShadow = true; add(m);
    });
    if (roofs.pos.length) add(roofs.mesh(mat(T.roof)));
    // dükkân tabelaları ve tenteler (yola bakan cephelerde)
    signs.forEach(([s, x, z, w], i) => {
        const name = SHOPS[(i * 5 + L.id) % SHOPS.length], col = SHOP_COLORS[(i + L.id) % SHOP_COLORS.length];
        const sb = signBoard(name, '#f8fafc', col, Math.max(2.4, w), 0.75);
        sb.position.set(x + s * 0.06, 3.3, z); sb.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; add(sb);
        const aw = box(0.9, 0.08, Math.max(2.4, w), col, x + s * 0.45, 2.75, z, false); aw.rotation.z = -s * 0.25; add(aw);
        add(box(0.06, 2.2, Math.max(2.0, w - 0.6), night ? '#fbbf24' : '#1e293b', x + s * 0.04, 1.2, z, false));   // vitrin
    });
    // sokak lambaları
    for (let z = EXT_Z0 - 6; z > 24; z -= 16) {
        const s = (Math.round(z / 16) % 2) ? 1 : -1;
        add(box(0.12, 5, 0.12, '#334155', s * (HW - 0.3), 2.5, z));
        add(box(1.2, 0.1, 0.12, '#334155', s * (HW - 0.85), 5, z));
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: night ? '#fde68a' : '#e5e7eb' })); lamp.position.set(s * (HW - 1.4), 4.85, z); add(lamp);
    }
}

// --- HER KAREDE: pusular, polis arabası tepe lambaları ---
export function updateStreets(dt) {
    const W = G.world; if (!W || !W.ambush) return;
    const p = G.player;
    for (const a of W.ambush) {
        if (a.fired || p.dead || Math.abs(p.pos.z - a.z) > a.hw + 4) continue;
        const inSt = G.enemies.filter(e => !e.dead && e.kind !== 'duran' && Math.sign(e.pos.x) === a.s && Math.abs(e.pos.x) > HW && Math.abs(e.pos.z - a.z) < a.hw + 1);
        a.fired = true;
        if (inSt.length) { toast('PUSU!', 1300, '#f87171'); inSt.forEach(e => { e.cd = Math.min(e.cd, 0.2); }); }
    }
    const on = Math.floor(G.time * 6) % 2;
    for (const [o, k] of W.sirens) o.material = mat(k ? (on ? '#3b82f6' : '#1e3a8a') : (on ? '#7f1d1d' : '#ef4444'));
}
export function resetStreets() { const W = G.world; if (W && W.ambush) W.ambush.forEach(a => a.fired = false); }
