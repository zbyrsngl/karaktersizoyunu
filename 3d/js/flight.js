// HIRHIZ 3D — 6. bölüm: UÇUŞ. HIRHIZ'ın uçağı Marmaris'ten İstanbul'a uçar (gece, bulutların üstü).
// Oyun "uçağa göre" koordinatta oynanır: uçak yalnızca sağa-sola / yukarı-aşağı gider, bulutlar ve yer arkaya akar.
// Darbeci jetler önden gelir ve füze atar; rüşvet zarfı (sol tık / E / □) düz ileri gider, değdiği jetin pilotu
// zarfı kapıp paraşütle atlar ("TESLİM!"). Kalkan (Shift / sağ tık / △) önden gelen füzeyi durdurur.
// 12 jet teslim olunca TANKER UÇAK gelir: füze yelpazesi (aralarında hep bir boşluk) ve nişanlı üçlü atış.
// Tanker düşünce HIRHIZ: "Bunlar haşhaşi! Bunlar sülük!" (hashasi.mp3) — tankerden paraşütlü haşhaşiler ve sülükler dökülür.
import * as THREE from 'three';
import { G, diff, addScore, toast } from './state.js?v=14';
import { input } from './input.js?v=14';
import { resetPlayer, hurtPlayer, updateHearts } from './player.js?v=14';
import { getHeadTex, makeShield } from './models.js?v=14';
import { makeItem } from './world.js?v=14';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=14';
import { playSfx } from './audio.js?v=14';
import { showBossBar, setBossBar } from './boss_core.js?v=14';
import { box, mat, canvasTex, fitText, textSprite, disposeSprite, clamp, damp, rand } from './util.js?v=14';

const SPEED = 30;                       // dünyanın arkaya akma hızı (m/s)
const XMAX = 11, YMIN = 3, YMAX = 17;   // uçağın gidebildiği kutu
const HOME = new THREE.Vector3(0, 9, 0);
const BAGS = 10;

// --- MODELLER ---
// HIRHIZ'ın uçağı (-Z yönüne uçar): beyaz gövde, kırmızı şerit ve kuyruk, kokpitte HIRHIZ'ın yüzü (hep kameraya döner)
function buildPlane() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 6, 12), mat('#f8fafc')); fus.rotation.x = Math.PI / 2; fus.castShadow = true; body.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), mat('#f8fafc')); nose.scale.set(1, 1, 1.6); nose.position.z = -3; body.add(nose);
    body.add(box(1.12, 0.14, 4.6, '#b91c1c', 0, -0.18, 0.1, false));                      // kırmızı şerit
    for (let i = 0; i < 6; i++) [-1, 1].forEach(s => body.add(box(0.02, 0.16, 0.2, '#1e3a8a', s * 0.55, 0.12, -1.6 + i * 0.55, false)));   // pencereler
    const wing = box(7.2, 0.12, 1.5, '#cbd5e1', 0, -0.15, 0.3); body.add(wing);
    [-1, 1].forEach(s => {
        const w = box(0.5, 0.12, 0.9, '#e30a17', s * 3.5, -0.15, 0.55, false); body.add(w);   // kanat ucu
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.1, 8), mat('#64748b')); eng.rotation.x = Math.PI / 2; eng.position.set(s * 1.7, -0.45, 0.1); body.add(eng);
    });
    body.add(box(2.6, 0.1, 0.9, '#cbd5e1', 0, 0.05, 2.6));                                // yatay kuyruk
    const fin = box(0.12, 1.4, 1.1, '#e30a17', 0, 0.85, 2.55); body.add(fin);              // dikey kuyruk (bayrak kırmızısı)
    const moon = new THREE.Mesh(new THREE.CircleGeometry(0.28, 14), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide })); moon.rotation.y = Math.PI / 2; moon.position.set(0.07, 0.95, 2.55); body.add(moon);
    const moon2 = new THREE.Mesh(new THREE.CircleGeometry(0.23, 14), new THREE.MeshBasicMaterial({ color: '#e30a17', side: THREE.DoubleSide })); moon2.rotation.y = Math.PI / 2; moon2.position.set(0.08, 0.95, 2.5); body.add(moon2);
    // kokpit camı ve yüz
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#93c5fd', transparent: true, opacity: 0.45, depthWrite: false }));
    glass.scale.set(1, 1.1, 1.7); glass.position.set(0, 0.32, -1.9); body.add(glass);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.53), new THREE.MeshBasicMaterial({ map: getHeadTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    face.position.set(0, 1.05, -1.85); root.add(face);
    // motor alevleri
    const flames = [-1.7, 1.7].map(x => {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 8), new THREE.MeshBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.85 }));
        f.rotation.x = -Math.PI / 2; f.position.set(x, -0.45, 1.1); body.add(f); return f;
    });
    // kalkan: uçağın önünde büyük "DİN" kalkanı
    const shield = makeShield(4.2); shield.position.set(0, 0.3, -4.4); shield.visible = false; root.add(shield);
    return { root, body, face, flames, shield };
}

// Darbeci jet (+Z yönüne, oyuncuya doğru uçar)
function buildJet() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 4.6, 8), mat('#64748b')); fus.rotation.x = Math.PI / 2; body.add(fus);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.3, 8), mat('#475569')); nose.rotation.x = Math.PI / 2; nose.position.z = 2.9; body.add(nose);
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 1.2, -2.6, 0, -1.4, 0, 0, -1.6, 0, 0, 1.2, 0, 0, -1.6, 2.6, 0, -1.4], 3));
    wingGeo.computeVertexNormals();
    const wing = new THREE.Mesh(wingGeo, new THREE.MeshLambertMaterial({ color: '#475569', side: THREE.DoubleSide })); body.add(wing);
    const fin = box(0.08, 1.1, 0.9, '#475569', 0, 0.6, -1.7); body.add(fin);
    body.add(box(1.6, 0.06, 0.6, '#475569', 0, 0, -2));
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshLambertMaterial({ color: '#0ea5e9', emissive: '#0c4a6e' })); canopy.scale.set(1, 0.8, 2.2); canopy.position.set(0, 0.3, 1.3); body.add(canopy);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1, 8), new THREE.MeshBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.85 }));
    flame.rotation.x = Math.PI / 2; flame.position.z = -2.8; body.add(flame);
    return { root, body, flame };
}

// Paraşütle atlayan pilot: elinde rüşvet destesi
function buildPilot(withBribe) {
    const g = new THREE.Group();
    const chute = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#f8fafc', side: THREE.DoubleSide }));
    chute.scale.y = 0.6; chute.position.y = 1.8; g.add(chute);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; const l = box(0.02, 1.6, 0.02, '#e5e7eb', Math.sin(a) * 0.5, 1.05, Math.cos(a) * 0.5, false); l.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); g.add(l); }
    g.add(box(0.36, 0.5, 0.24, '#4d5b2a', 0, 0.3, 0));
    g.add(box(0.24, 0.24, 0.24, '#e8b48f', 0, 0.68, 0));
    g.add(box(0.26, 0.1, 0.26, '#36401c', 0, 0.82, 0));
    if (withBribe) g.add(box(0.3, 0.1, 0.16, '#16a34a', 0.25, 0.45, 0.1));
    return g;
}

// TANKER UÇAK: dev gri gövde, dört motor, burnunda kızgın gözler (+Z yönüne, oyuncuya bakar)
function buildTanker() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.3, 18, 14), mat('#94a3b8')); fus.rotation.x = Math.PI / 2; body.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 10), mat('#94a3b8')); nose.scale.set(1, 0.95, 1.5); nose.position.z = 9; body.add(nose);
    const wing = box(26, 0.35, 4, '#64748b', 0, -0.3, -1); wing.rotation.y = 0; body.add(wing);
    [-1, 1].forEach(s => {
        const tip = box(4, 0.35, 3, '#64748b', s * 12, -0.3, -2.6); tip.rotation.y = -s * 0.35; body.add(tip);
        [4.5, 8.5].forEach(x => {
            const e = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 2.6, 10), mat('#334155')); e.rotation.x = Math.PI / 2; e.position.set(s * x, -1.1, 0.2); body.add(e);
            const f = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 8), new THREE.MeshBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.8 }));
            f.rotation.x = -Math.PI / 2; f.position.set(s * x, -1.1, -1.9); body.add(f);
        });
    });
    body.add(box(9, 0.3, 2.4, '#64748b', 0, 0.4, -8.2));               // yatay kuyruk
    body.add(box(0.35, 4.2, 3, '#475569', 0, 2.6, -8));               // dikey kuyruk
    const boom = box(0.25, 0.25, 6, '#334155', 0, -1.5, -10); boom.rotation.x = -0.35; body.add(boom);   // yakıt borusu
    // burunda kızgın yüz
    const eyes = [], brows = [];
    [-1, 1].forEach(s => {
        const w = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })); w.scale.set(1, 0.75, 0.4); w.position.set(s * 0.75, 0.55, 10.9); body.add(w);
        const pu = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#111111' })); pu.position.set(s * 0.68, 0.5, 11.08); body.add(pu); eyes.push(pu);
        const br = box(1.0, 0.18, 0.2, '#111111', s * 0.75, 1.05, 10.95, false); br.rotation.z = s * 0.35; body.add(br); brows.push(br);
    });
    const mouth = box(1.1, 0.16, 0.2, '#1f2937', 0, -0.4, 11.1, false); body.add(mouth);
    return { root, body, eyes, brows, mouth };
}

// Haşhaşi: kapüşonlu siyah cüppe, gölgede yüz, parlayan sarı gözler, hançer; paraşütle süzülür
function buildHashasi() {
    const g = new THREE.Group();
    const chute = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#f8fafc', side: THREE.DoubleSide }));
    chute.scale.y = 0.55; chute.position.y = 2; g.add(chute);
    [0, 2].forEach(k => { const st = new THREE.Mesh(new THREE.SphereGeometry(1.12, 10, 6, k * Math.PI / 2, 0.5, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#dc2626', side: THREE.DoubleSide })); st.scale.y = 0.56; st.position.y = 2; g.add(st); });
    const robe = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 8), mat('#1c1917')); robe.position.y = 0.6; g.add(robe);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mat('#292524')); hood.position.y = 1.3; g.add(hood);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#0c0a09' })); face.scale.z = 0.5; face.position.set(0, 1.27, 0.14); g.add(face);
    [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: '#facc15' })); e.position.set(s * 0.05, 1.3, 0.21); g.add(e); });
    g.add(box(0.5, 0.06, 0.3, '#b91c1c', 0, 0.85, 0.05, false));                        // kuşak
    const dagger = new THREE.Group(); dagger.position.set(0.32, 0.9, 0.1); g.add(dagger);
    dagger.add(box(0.05, 0.4, 0.02, '#e5e7eb', 0, 0.22, 0, false)); dagger.add(box(0.12, 0.04, 0.04, '#78350f', 0, 0, 0, false));
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; const l = box(0.015, 1.5, 0.015, '#e5e7eb', Math.sin(a) * 0.5, 1.6, Math.cos(a) * 0.5, false); l.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3); g.add(l); }
    return { g, chute, dagger };
}
// Sülük: kıvrılan kahverengi halkalar, kırmızı vantuz ağız
function buildLeech() {
    const g = new THREE.Group(), segs = [];
    for (let i = 0; i < 8; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.16 - Math.abs(i - 3.5) * 0.012, 8, 6), mat(i % 2 ? '#3f2a1d' : '#4a3426'));
        s.position.x = (i - 3.5) * 0.2; g.add(s); segs.push(s);
    }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat('#7f1d1d')); mouth.position.x = 0.8; g.add(mouth); segs.push(mouth);
    return { g, segs };
}

// Zarf (rüşvet): yeşil dolarlı deste
let bribeMat = null;
const BRIBE_GEO = new THREE.BoxGeometry(0.6, 0.14, 0.32);
function bribeMesh() {
    bribeMat = bribeMat || new THREE.MeshBasicMaterial({ map: canvasTex(64, 32, (g) => {
        g.fillStyle = '#15803d'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#bbf7d0'; g.fillRect(3, 3, 58, 26);
        g.fillStyle = '#166534'; g.font = 'bold 20px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$100', 32, 17);
        g.fillStyle = '#facc15'; g.fillRect(28, 0, 8, 32);
    }, { pixel: true }) });
    return new THREE.Mesh(BRIBE_GEO, bribeMat);
}
// Füze: beyaz gövde, kırmızı burun, kırmızı parıltı (+Z'ye uçarken burnu öne bakar)
const MIS_GEO = new THREE.CylinderGeometry(0.12, 0.12, 1.1, 8), MIS_NOSE = new THREE.ConeGeometry(0.12, 0.35, 8);
const GLOW_MAT = new THREE.SpriteMaterial({ map: null, color: '#ef4444', transparent: true, opacity: 0.6, depthWrite: false });
let glowTex = null;
function missileMesh() {
    if (!glowTex) {
        glowTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
        GLOW_MAT.map = glowTex; GLOW_MAT.needsUpdate = true;
    }
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const b = new THREE.Mesh(MIS_GEO, mat('#f8fafc')); b.rotation.x = Math.PI / 2; inner.add(b);
    const n = new THREE.Mesh(MIS_NOSE, mat('#dc2626')); n.rotation.x = Math.PI / 2; n.position.z = 0.72; inner.add(n);
    const f = new THREE.Mesh(MIS_NOSE, new THREE.MeshBasicMaterial({ color: '#f97316' })); f.rotation.x = -Math.PI / 2; f.position.z = -0.7; inner.add(f);
    const glow = new THREE.Sprite(GLOW_MAT); glow.scale.set(1.6, 1.6, 1); g.add(glow);
    return { g, inner };
}

// Pankart çeken küçük uçak (2D'deki haber pankartları)
function bannerPlane(text) {
    const g = new THREE.Group();
    g.add(box(0.5, 0.5, 2.2, '#fbbf24', 0, 0, 0, false)); g.add(box(3.4, 0.08, 0.7, '#f59e0b', 0, 0.1, -0.2, false));
    const t = canvasTex(512, 96, (c, W, H) => { c.fillStyle = '#f8fafc'; c.fillRect(0, 0, W, H); c.fillStyle = '#b91c1c'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, text, W / 2, H / 2 + 2, W - 20, 64); });
    const b = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.9), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    b.rotation.y = Math.PI / 2; b.position.set(0, 0, 7.5); g.add(b);
    g.add(box(0.02, 0.02, 2, '#e5e7eb', 0, 0, 1.9, false));
    return g;
}

// --- MOD ---
export function makeFlightMode() {
    let F = null;   // bölüm durumu
    const mode = { kind: 'flight' };

    mode.build = (scene, L) => {
        scene.fog = new THREE.Fog(L.fog, 70, 230);
        const W = { L, solids: [], items: [], bricks: [], movers: [] };
        F = { scene, W, jets: [], missiles: [], bribes: [], bags: [], fxObjs: [], clouds: [], tanker: null };
        // Yıldızlar ve ay
        const starG = new THREE.BufferGeometry(), sp = [];
        for (let i = 0; i < 600; i++) { const a = rand(-1.6, 1.6), e = rand(0.05, 1.3), r = 200; sp.push(Math.sin(a) * Math.cos(e) * r, Math.sin(e) * r, -Math.cos(a) * Math.cos(e) * r); }
        starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
        F.stars = new THREE.Points(starG, new THREE.PointsMaterial({ color: '#e0e7ff', size: 0.7, fog: false })); scene.add(F.stars);
        const moon = new THREE.Mesh(new THREE.CircleGeometry(8, 28), new THREE.MeshBasicMaterial({ color: '#fef9c3', fog: false })); moon.position.set(60, 70, -180); moon.lookAt(0, 9, 0); scene.add(moon);
        F.moon = moon;
        // Aşağıda gece: deniz ve şehir ışıkları (doku akar)
        const ground = canvasTex(256, 256, (g) => {
            g.fillStyle = '#0b1433'; g.fillRect(0, 0, 256, 256);
            g.fillStyle = '#111827'; g.fillRect(128, 0, 128, 256);
            for (let i = 0; i < 500; i++) { g.fillStyle = ['#fde68a', '#fbbf24', '#fef3c7'][i % 3]; g.fillRect(128 + Math.random() * 128 | 0, Math.random() * 256 | 0, 2, 2); }
            for (let i = 0; i < 80; i++) { g.fillStyle = '#1e3a8a'; g.fillRect(Math.random() * 120 | 0, Math.random() * 256 | 0, 10, 1); }
        }, { repeat: [3, 6], pixel: true });
        F.groundTex = ground;
        const gm = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshBasicMaterial({ map: ground }));
        gm.rotation.x = -Math.PI / 2; gm.position.set(0, -60, -200); scene.add(gm);
        // Bulutlar: oyun kutusunun dışında (görüşü kapatmasın), arkaya akar
        const puff = new THREE.IcosahedronGeometry(1, 1);
        const cm = [new THREE.MeshLambertMaterial({ color: '#cbd5e1', flatShading: true }), new THREE.MeshLambertMaterial({ color: '#94a3b8', flatShading: true })];
        for (let i = 0; i < 34; i++) {
            const c = new THREE.Group();
            const n = 3 + (i % 3);
            for (let k = 0; k < n; k++) { const m = new THREE.Mesh(puff, cm[k % 2]); const s = rand(2.5, 5); m.scale.set(s * 1.4, s * 0.7, s); m.position.set(rand(-4, 4), rand(-0.6, 0.8), rand(-3, 3)); c.add(m); }
            placeCloud(c, rand(-320, 20));
            scene.add(c); F.clouds.push(c);
        }
        // Pankartlı uçaklar (uzakta, yavaşça arkaya kalır)
        F.banners = [["DARBE GİRİŞİMİ! KÖPRÜLER KAPATILDI", -60, 14, -140], ["UÇAK İSTANBUL'A İNECEK Mİ?", 70, 22, -260]].map(([t, x, y, z]) => {
            const b = bannerPlane(t); b.position.set(x, y, z); scene.add(b); return b;
        });
        // HIRHIZ'ın uçağı
        F.plane = buildPlane(); scene.add(F.plane.root);
        F.pos = F.plane.root.position; F.vel = new THREE.Vector3();
        return W;
    };
    function placeCloud(c, z) {
        let x = rand(-90, 90), y = rand(-25, 40);
        if (Math.abs(x) < 20 && y > -8 && y < 26) y = Math.random() < 0.5 ? rand(-25, -10) : rand(28, 40);
        c.position.set(x, y, z);
    }

    function clearAll() {
        const sc = F.scene;
        [...F.jets, ...F.missiles, ...F.bribes, ...F.bags, ...F.fxObjs].forEach(o => sc.remove(o.mesh || o.g || o.root));
        F.jets = []; F.missiles = []; F.bribes = []; F.bags = []; F.fxObjs = [];
        if (F.tanker) { sc.remove(F.tanker.m.root); F.tanker = null; G.boss = null; }
        document.getElementById('boss-bar').hidden = true;
    }
    mode.reset = () => {
        clearAll();
        G.player.m.root.visible = false;
        F.pos.copy(HOME); F.vel.set(0, 0, 0); F.plane.root.rotation.set(0, 0, 0); F.plane.root.visible = true;
        F.spawnT = 2; F.bagT = 3; F.bagsMade = 0; F.bossPhase = false; F.deadT = 0; F.t = 0;
        F.throwCd = 0;
    };
    mode.retry = () => {
        const boss = F.bossPhase;
        clearAll();
        resetPlayer(G.player, G.player.pos.clone()); G.player.m.root.visible = false;
        F.pos.copy(HOME); F.vel.set(0, 0, 0); F.plane.root.rotation.set(0, 0, 0); F.deadT = 0;
        F.spawnT = 2;
        if (boss) spawnTanker(true);
    };
    mode.hint = touch => touch
        ? 'Sol: uç (sağ-sol, yukarı-aşağı)<br>□ rüşvet at · △ kalkan (füzeye karşı)'
        : 'WASD / oklar: uç (W yukarı, S aşağı)<br>Sol tık / E: rüşvet at · Shift / sağ tık: kalkan · P duraklat';
    mode.idle = (dt) => { scroll(dt); F.t = (F.t || 0) + dt; F.pos.y = HOME.y + Math.sin(F.t) * 0.4; F.plane.root.rotation.z = Math.sin(F.t * 0.7) * 0.1; };

    // Kamera: uçağın sağ-arkasında (yüzü görünsün), biraz yukarıda; ileriye bakar
    const look = new THREE.Vector3(), camPos = new THREE.Vector3();
    mode.camera = (camera, dt) => {
        if (!F) return;
        camPos.set(F.pos.x * 0.6 + 3.2, F.pos.y * 0.75 + 4.6, 14.5);
        camera.position.lerp(camPos, 1 - Math.exp(-6 * dt));
        look.set(F.pos.x * 0.75, F.pos.y * 0.8 + 2.2, -24);
        camera.lookAt(look);
        F.plane.face.lookAt(camera.position);
    };

    function scroll(dt) {
        const d = SPEED * dt;
        F.groundTex.offset.y += d / 700 * 6 * 0.5;
        F.clouds.forEach(c => { c.position.z += d; if (c.position.z > 30) placeCloud(c, rand(-330, -300)); });
        F.banners.forEach(b => { b.position.z += d * 0.25; if (b.position.z > 40) b.position.z -= 380; });
    }

    // --- HER KARE ---
    mode.update = (dt) => {
        if (!F) return;
        F.t += dt;
        scroll(dt);
        const p = G.player, pm = F.plane;
        p.pos.copy(F.pos);   // efektler ve hasar uçağın yerinde çıksın
        if (p.invuln > 0) p.invuln -= dt;
        // Uçak
        if (!p.dead) {
            const ax = input.mx, ay = input.my;
            F.vel.x = damp(F.vel.x, ax * 13, 6, dt); F.vel.y = damp(F.vel.y, ay * 10, 6, dt);
            F.pos.x = clamp(F.pos.x + F.vel.x * dt, -XMAX, XMAX); F.pos.y = clamp(F.pos.y + F.vel.y * dt, YMIN, YMAX);
            pm.root.rotation.z = damp(pm.root.rotation.z, -F.vel.x * 0.05, 8, dt);
            pm.root.rotation.x = damp(pm.root.rotation.x, F.vel.y * 0.03, 8, dt);
            pm.shield.visible = input.shieldHeld;
            pm.root.visible = !(p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0);
            pm.flames.forEach(f => f.scale.set(1, 0.8 + Math.random() * 0.5, 1));
            F.throwCd -= dt;
            if (input.throwPressed && F.throwCd <= 0 && G.state === 'play') throwBribe();
        } else {   // vurulan uçak sarmal çizerek düşer
            F.deadT += dt; pm.shield.visible = false; pm.root.visible = true;
            pm.root.rotation.z += dt * 4; pm.root.rotation.x = Math.min(0.8, pm.root.rotation.x + dt);
            F.pos.y -= dt * (4 + F.deadT * 8); F.pos.z += dt * 6;
            if (Math.random() < 0.5) burst(F.pos.clone(), { n: 1, color: ['#57534e', '#f97316'], speed: 1, up: 1, size: 0.4, life: 0.8, gravity: 0 });
        }
        // Darbeci jetler gelir (canavar yokken)
        if (!F.bossPhase && G.state === 'play') {
            F.spawnT -= dt;
            if (F.spawnT <= 0 && F.jets.filter(j => !j.dead).length < 4) { F.spawnT = rand(1.4, 2.4) * diff().fire; spawnJet(); }
            F.bagT -= dt;
            if (F.bagT <= 0 && F.bagsMade < BAGS) { F.bagT = 6.5; F.bagsMade++; spawnBag(); }
        }
        updateJets(dt); updateMissiles(dt); updateBribes(dt); updateBags(dt); updateFxObjs(dt);
        if (F.tanker) updateTanker(F.tanker, dt);
    };

    // --- RÜŞVET ZARFI: düz ileri; öndeki (±25°) en yakın jete/tankere doğru biraz döner ---
    function throwBribe() {
        F.throwCd = 0.22;
        const m = bribeMesh(); m.position.copy(F.pos).add(new THREE.Vector3(0, 0.2, -3.6)); F.scene.add(m);
        F.bribes.push({ mesh: m, pos: m.position, vel: new THREE.Vector3(F.vel.x * 0.3, F.vel.y * 0.3, -62), life: 2.2 });
        playSfx('hit', { rate: 2.2, vol: 0.2 });
    }
    function updateBribes(dt) {
        F.bribes = F.bribes.filter(b => {
            b.life -= dt;
            b.mesh.rotation.y += dt * 18;
            // hedef: önündeki en yakın
            let best = null, bd = 1e9;
            const cands = F.tanker && !F.tanker.dead ? [F.tanker] : F.jets.filter(j => !j.dead);
            for (const j of cands) {
                const dz = b.pos.z - j.pos.z; if (dz < 2) continue;
                const off = Math.hypot(j.pos.x - b.pos.x, j.pos.y - b.pos.y);
                if (off / dz < 0.45 && dz < bd) { bd = dz; best = j; }
            }
            if (best) {
                const want = best.pos.clone().sub(b.pos).normalize().multiplyScalar(62);
                b.vel.lerp(want, 1 - Math.exp(-5 * dt));
            }
            b.pos.addScaledVector(b.vel, dt);
            for (const j of F.jets) {
                if (j.dead) continue;
                if (Math.abs(b.pos.x - j.pos.x) < 3 && Math.abs(b.pos.y - j.pos.y) < 1.6 && Math.abs(b.pos.z - j.pos.z) < 3.6) { killJet(j, true); return gone(b); }
            }
            const T = F.tanker;
            if (T && !T.dead && Math.abs(b.pos.x - T.pos.x) < 4.5 && Math.abs(b.pos.y - T.pos.y) < 2.4 && Math.abs(b.pos.z - T.pos.z) < 9) { hitTanker(T, b.pos.clone()); return gone(b); }
            if (b.life <= 0) return gone(b);
            return true;
        });
    }
    const gone = (o) => { F.scene.remove(o.mesh); return false; };

    // --- JETLER ---
    function spawnJet() {
        const m = buildJet(); m.root.scale.setScalar(1.5);
        const x = rand(-XMAX, XMAX), y = rand(YMIN + 1, YMAX - 1);
        m.root.position.set(x, y, -190); F.scene.add(m.root);
        F.jets.push({ m, pos: m.root.position, baseX: x, baseY: y, ph: rand(0, 6), vz: rand(15, 20) * diff().speed, cool: rand(0.8, 1.6), t: 0, dead: false, deadT: 0 });
    }
    function killJet(j, bribed) {
        if (j.dead) return;
        j.dead = true; j.deadT = 0;
        G.kills++; addScore(3000); mode.hud();
        floatText(bribed ? 'TESLİM!' : 'ÇARPIŞTI!', j.pos.clone().setY(j.pos.y + 2), '#f8fafc', 0.9, 1.2);
        burst(j.pos.clone(), { n: 10, color: ['#22c55e', '#bbf7d0', '#f8fafc'], speed: 4, up: 2, size: 0.25, gravity: 0 });
        playSfx('hit', { rate: 0.9, vol: 0.6 });
        // pilot zarfı kapıp paraşütle atlar
        const pil = buildPilot(bribed); pil.position.copy(j.pos).setY(j.pos.y + 1); F.scene.add(pil);
        F.fxObjs.push({ g: pil, vel: new THREE.Vector3(rand(-1, 1), 3, 0), kind: 'pilot', t: 0 });
        if (G.kills >= G.target && !F.bossPhase) spawnTanker(false);
    }
    function updateJets(dt) {
        const p = G.player;
        F.jets = F.jets.filter(j => {
            j.t += dt;
            if (j.dead) {   // duman salarak dönerek düşer
                j.deadT += dt; j.pos.y -= dt * (3 + j.deadT * 9); j.pos.z += SPEED * 0.4 * dt;
                j.m.root.rotation.z += dt * 5; j.m.root.rotation.x = Math.min(1, j.m.root.rotation.x + dt);
                if (Math.random() < 0.6) burst(j.pos.clone(), { n: 1, color: ['#57534e', '#44403c', '#f97316'], speed: 1, up: 1, size: 0.5, life: 0.9, gravity: 0 });
                if (j.deadT > 3) return gone2(j);
                return true;
            }
            j.pos.z += j.vz * dt;
            j.pos.x = clamp(j.baseX + Math.sin(j.t * 1.1 + j.ph) * 3, -XMAX - 2, XMAX + 2);
            j.pos.y = j.baseY + Math.sin(j.t * 0.9 + j.ph * 2) * 1.5;
            j.m.root.rotation.z = Math.cos(j.t * 1.1 + j.ph) * 0.4;
            j.m.flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
            j.cool -= dt;
            if (j.cool <= 0 && j.pos.z < -30 && j.pos.z > -130 && !p.dead) {
                j.cool = rand(2.2, 3) * diff().fire;
                fireMissile(j.pos.clone().add(new THREE.Vector3(0, -0.4, 2.6)), F.pos.clone(), 34 * (0.9 + 0.1 * diff().speed));
            }
            // çarpışma
            if (!p.dead && Math.abs(j.pos.x - F.pos.x) < 3.4 && Math.abs(j.pos.y - F.pos.y) < 1.3 && Math.abs(j.pos.z - F.pos.z) < 4.5) {
                if (hurtPlayer(null)) { addTrauma(0.5); }
                killJet(j, false);
            }
            if (j.pos.z > 25) return gone2(j);
            return true;
        });
    }
    const gone2 = (j) => { F.scene.remove(j.m.root); return false; };

    // --- FÜZELER ---
    function fireMissile(from, to, speed) {
        const m = missileMesh(); m.g.position.copy(from); F.scene.add(m.g);
        const vel = to.clone().sub(from).normalize().multiplyScalar(speed);
        m.g.lookAt(from.clone().add(vel));
        F.missiles.push({ mesh: m.g, inner: m.inner, pos: m.g.position, vel, life: 6 });
        playSfx('boom', { rate: 2, vol: 0.12 });
    }
    function updateMissiles(dt) {
        const p = G.player;
        F.missiles = F.missiles.filter(ms => {
            ms.life -= dt;
            ms.pos.addScaledVector(ms.vel, dt);
            ms.inner.rotation.z += dt * 10;
            if (Math.random() < 0.35) burst(ms.pos.clone(), { n: 1, color: ['#e5e7eb', '#9ca3af'], speed: 0.4, up: 0.3, size: 0.18, life: 0.4, gravity: 0 });
            // kalkan önden durdurur (uçağın önündeki büyük kalkan)
            if (!p.dead && input.shieldHeld && ms.pos.z > F.pos.z - 6 && ms.pos.z < F.pos.z - 2 && Math.abs(ms.pos.x - F.pos.x) < 2.6 && Math.abs(ms.pos.y - F.pos.y) < 2.2) {
                spawnFx('block', ms.pos.clone(), 1.4); playSfx('hit', { rate: 1.8, vol: 0.4 });
                addScore(100); return gone(ms);
            }
            if (!p.dead && Math.abs(ms.pos.z - F.pos.z) < 2.2) {
                if (Math.abs(ms.pos.x - F.pos.x) < 1.9 && Math.abs(ms.pos.y - F.pos.y) < 0.9) {
                    spawnFx('boom', ms.pos.clone(), 1); hurtPlayer(null);
                    return gone(ms);
                }
            }
            if (ms.life <= 0 || ms.pos.z > 20) return gone(ms);
            return true;
        });
    }

    // --- KUL HAKKI TORBALARI: içinden geçince toplanır ---
    function spawnBag() {
        const g = makeItem('bag'); g.scale.setScalar(2.2);
        g.position.set(rand(-XMAX + 1, XMAX - 1), rand(YMIN + 1, YMAX - 1), -200); F.scene.add(g);
        F.bags.push({ mesh: g, pos: g.position });
    }
    function updateBags(dt) {
        F.bags = F.bags.filter(b => {
            b.pos.z += SPEED * dt * 0.8; b.mesh.rotation.y += dt * 2;
            if (!G.player.dead && b.pos.distanceTo(F.pos) < 2.6) {
                G.collect++; addScore(5000); mode.hud();
                spawnFx('collect', b.pos.clone(), 2); playSfx('coin', { vol: 0.6 });
                floatText('KUL HAKKI!', b.pos.clone().setY(b.pos.y + 1.5), '#fde047', 0.6);
                return gone(b);
            }
            if (b.pos.z > 20) return gone(b);
            return true;
        });
    }

    // Uçuşan süsler: paraşütlü pilotlar, haşhaşiler, sülükler
    function updateFxObjs(dt) {
        F.fxObjs = F.fxObjs.filter(o => {
            o.t += dt;
            if (o.kind === 'pilot' || o.kind === 'hashasi') {
                const open = Math.min(1, o.t * 1.5);
                o.vel.y = Math.max(o.vel.y - 9 * dt, -1.6 - 4 * (1 - open));
                if (o.chute) o.chute.scale.set(open, 0.55 * open, open);
                o.g.position.addScaledVector(o.vel, dt);
                o.g.position.z += (o.kind === 'pilot' ? SPEED * 0.5 : 2.5) * dt;
                o.g.rotation.z = Math.sin(o.t * 2) * 0.15;
                if (o.dagger) o.dagger.rotation.z = -0.6 + Math.sin(o.t * 6) * 0.4;
            } else {   // sülük: kıvrılarak düşer
                o.vel.y = Math.max(o.vel.y - 7 * dt, -3);
                o.g.position.addScaledVector(o.vel, dt);
                o.g.rotation.z += dt * 1.5; o.g.rotation.y += dt;
                o.segs.forEach((s, i) => { s.position.y = Math.sin(o.t * 8 + i * 0.8) * 0.12; });
            }
            if (o.t > (o.kind === 'pilot' ? 5 : 12)) { F.scene.remove(o.g); return false; }
            return true;
        });
    }

    // --- TANKER UÇAK ---
    function spawnTanker(fromRetry) {
        F.bossPhase = true;
        F.jets.forEach(j => { if (!j.dead) { j.dead = true; j.deadT = 1.5; } });
        const m = buildTanker(); m.root.position.set(0, 12, -230); F.scene.add(m.root);
        const hp = Math.max(10, Math.round(20 * diff().boss));
        const T = F.tanker = { m, root: m.root, pos: m.root.position, name: 'TANKER UÇAK', hp, maxHp: hp, dead: false, deadT: 0, t: 0, timer: 3, attacks: 0, burst: 0, burstT: 0, hurtT: 0,
                               update: () => {}, hitTest: () => false };
        G.boss = T;   // can çubuğu ve canavar durumu
        showBossBar(T);
        if (!fromRetry) {
            toast('BÖLÜM SONU CANAVARI: TANKER UÇAK!', 2600, '#fca5a5');
            floatText('İNİŞ İZNİ YOK!', new THREE.Vector3(0, 16, -60), '#ef4444', 1.2, 2.5);
        }
        addTrauma(0.3);
    }
    function hitTanker(T, at) {
        T.hp -= 1; T.hurtT = 0.15; setBossBar(T);
        spawnFx('pow', at, 2); burst(at, { n: 8, color: ['#22c55e', '#fde047', '#94a3b8'], speed: 5, up: 2, size: 0.3, gravity: 0 });
        playSfx('hit', { rate: 0.8, vol: 0.7 }); addTrauma(0.08);
        if (T.hp <= 0) defeatTanker(T);
    }
    function updateTanker(T, dt) {
        const m = T.m, p = G.player;
        T.t += dt;
        if (T.hurtT > 0) T.hurtT -= dt;
        m.root.visible = !(T.hurtT > 0 && Math.floor(T.hurtT * 30) % 2 === 0);
        if (T.dead) {   // burnu aşağı, dönerek düşer; dumanlar
            T.deadT += dt;
            T.pos.y -= dt * (2 + T.deadT * 5); T.pos.z -= dt * 6;
            m.root.rotation.x = Math.min(0.9, T.deadT * 0.5); m.root.rotation.z += dt * 0.6;
            if (Math.random() < 0.7) burst(T.pos.clone().add(new THREE.Vector3(rand(-8, 8), 0, rand(-4, 4))), { n: 2, color: ['#57534e', '#f97316', '#facc15'], speed: 2, up: 2, size: 0.8, life: 1, gravity: 0 });
            if (T.deadT > 2.2 && !T.reported) { T.reported = true; G.onBossDefeated && G.onBossDefeated(); }
            return;
        }
        // giriş: uzaktan yaklaşır, sonra önde salınır
        const tz = -62;
        T.pos.z = T.pos.z < tz - 1 ? damp(T.pos.z, tz, 1.2, dt) + 6 * dt : tz + Math.sin(T.t * 0.6) * 4;
        T.pos.x = Math.sin(T.t * 0.45) * 7;
        T.pos.y = 11 + Math.sin(T.t * 0.32) * 4;
        m.root.rotation.z = -Math.cos(T.t * 0.45) * 0.12;
        // gözler oyuncuyu izler; kızınca kaşlar çatılır
        m.eyes.forEach((e, i) => { e.position.x = (i ? 1 : -1) * 0.68 + clamp((F.pos.x - T.pos.x) * 0.02, -0.15, 0.15); e.position.y = 0.5 + clamp((F.pos.y - T.pos.y) * 0.02, -0.12, 0.12); });
        const angry = T.timer < 0.8;
        m.brows.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * (angry ? -0.4 : 0.2); });
        if (T.pos.z < -120 || p.dead) return;
        // nişanlı üçlü atış
        if (T.burst > 0) {
            T.burstT -= dt;
            if (T.burstT <= 0) { T.burst--; T.burstT = 0.24; fireMissile(T.pos.clone().add(new THREE.Vector3(0, -0.6, 11)), F.pos.clone(), 30 * (0.9 + 0.1 * diff().speed)); }
        }
        T.timer -= dt;
        if (T.timer <= 0) {
            T.attacks++; T.timer = 1.7 * diff().fire;
            const from = T.pos.clone().add(new THREE.Vector3(0, -0.6, 11));
            if (T.attacks % 2) {
                // Füze yelpazesi: yatay ya da dikey açılır; ortadaki üçünden biri atlanır, her zaman geçilecek bir boşluk kalır
                const vertical = T.attacks % 4 === 3, gap = Math.floor(rand(-1, 2));
                for (let i = -2; i <= 2; i++) {
                    if (i === gap) continue;
                    const to = F.pos.clone(); if (vertical) to.y = clamp(F.pos.y + i * 3.2, YMIN - 2, YMAX + 2); else to.x = F.pos.x + i * 4.2;
                    fireMissile(from, to, 27 * (0.9 + 0.1 * diff().speed));
                }
                floatText('FÜZE!', T.pos.clone().setY(T.pos.y + 4), '#fca5a5', 0.9, 1);
            } else { T.burst = 3; T.burstT = 0; }
        }
    }
    function defeatTanker(T) {
        T.dead = true; T.deadT = 0;
        addScore(20000);
        F.missiles.forEach(ms => F.scene.remove(ms.mesh)); F.missiles = [];
        spawnFx('boom', T.pos.clone(), 5);
        spawnFx('confetti', T.pos.clone().add(new THREE.Vector3(-5, 3, 0)), 3, 0.3); spawnFx('confetti', T.pos.clone().add(new THREE.Vector3(5, 3, 0)), 3, 0.6);
        playSfx('boom', { vol: 1 }); addTrauma(0.9);
        floatText('TANKER DÜŞTÜ!', T.pos.clone().setY(T.pos.y + 5), '#fde047', 1.4, 2.5);
    }

    // --- BÖLÜM SONU: "Bunlar haşhaşi! Bunlar sülük!" ---
    mode.outro = () => {
        const T = F.tanker, src = T ? T.pos.clone() : new THREE.Vector3(0, 12, -50);
        const o = { t: 0 };
        o.len = (playSfx('hashasi', { vol: 1 }) || 2.5) + 2.2;
        o.bubble = textSprite('Bunlar haşhaşi! Bunlar sülük!', { size: 44, height: 0.9, color: '#111827', bg: 'rgba(248,250,252,0.96)' });
        o.bubble.position.set(0, 2.6, -1.5); F.plane.root.add(o.bubble);
        // Önde, uçağın görüş alanında dökülürler
        const at = new THREE.Vector3(clamp(src.x, -8, 8), Math.max(src.y, F.pos.y + 6), -34);
        for (let i = 0; i < 5; i++) {
            const h = buildHashasi(); h.g.position.copy(at).add(new THREE.Vector3((i - 2) * 3.2, rand(-1, 1), rand(-3, 3))); h.g.scale.setScalar(1.4); F.scene.add(h.g);
            F.fxObjs.push({ g: h.g, chute: h.chute, dagger: h.dagger, vel: new THREE.Vector3((i - 2) * 0.6, 2, 0), kind: 'hashasi', t: -i * 0.15 });
        }
        for (let i = 0; i < 12; i++) {
            const l = buildLeech(); l.g.position.copy(at).add(new THREE.Vector3(rand(-7, 7), rand(-1, 2), rand(-4, 4))); l.g.scale.setScalar(1.6); F.scene.add(l.g);
            F.fxObjs.push({ g: l.g, segs: l.segs, vel: new THREE.Vector3(rand(-2, 2), rand(3, 6), rand(0, 3)), kind: 'leech', t: 0 });
        }
        o.update = (dt) => { o.t += dt; return o.t > o.len; };
        o.remove = () => { if (o.bubble) { F.plane.root.remove(o.bubble); disposeSprite(o.bubble); o.bubble = null; } };
        return o;
    };

    mode.hud = () => {
        document.getElementById('kills').textContent = `${Math.min(G.kills, G.target)} / ${G.target}`;
    };
    return mode;
}
