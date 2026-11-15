// HIRHIZ 3D — 2. BÖLÜM: 4'LÜ ÇETEYİ KURTAR (17-25 Aralık 2013)
// İstanbul Emniyet Müdürlüğü'ne giden cadde: asfalt yol, kaldırımlar, demir bariyerler, apartmanlar, çakarlı polis araçları,
// "son dakika" ekranları, muhabirler, ayakkabı kutusu yığınları. Yolun üstünde iki asma köprü: üstlerinde SINAYPIRCI.
// 17/25 polisleri (police.js) rüşvetle susturulur; ayakkabı kutuları toplanır; kapıdan geçince canavar SAYGILI (boss_saygili.js).
import * as THREE from 'three';
import { G } from './state.js?v=12';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=12';
import { T1, T2, HW, ARENA, signBoard, entrySign, TEX, tiled } from './world.js?v=12';
import { spawnSaygili } from './boss_saygili.js?v=12';
import './police.js?v=12';

const BRIDGES = [-52, -122];                 // köprülerin z konumu; tabliye 2.3–2.6 m (altından yürünür, üstüne zıplanır)
const DECK_LO = 2.3, DECK_HI = 2.6;
const NEWS = ['17 ARALIK OPERASYONU: 3 BAKANIN OĞLU GÖZALTINDA', 'AYAKKABI KUTULARINDA 4,5 MİLYON DOLAR',
              'BAKAN OĞLUNUN EVİNDE PARA SAYMA MAKİNELERİ', "SAVCI AKKAŞ: 'POLİS TALİMATIMI UYGULAMADI'", '25 ARALIK: İKİNCİ DALGA ENGELLENDİ'];

export const LEVEL2 = {
    id: 2, name: "4'LÜ ÇETEYİ KURTAR", menuTitle: "2 · 4'LÜ ÇETEYİ KURTAR",
    desc: '17/25 polislerini rüşvetle sustur, ayakkabı kutularını topla, SAYGILI\'yı yen!',
    mission: "11 POLİSİ RÜŞVETLE SUSTUR, SAYGILI'YI YEN!",
    music: '../bozkir_dortnal.mp3',
    sky: ['#64748b', '#9aa8ba', '#d3dae3'], fog: '#bcc6d2', hemi: ['#dbe4ee', '#4b5563', 1.35], sun: ['#eef2ff', 1.9],
    ground: { top: 'road', side: 'dirt', arena: 'concrete', rep: [16, 4] }, outer: 'concrete', outerRep: 4, pitFloor: '#292524',
    edge: { color: '#9ca3af', h: 1.0, w: 0.25 }, pitSign: 'YOL ÇALIŞMASI',
    segs: [[10, -34], [-37.5, -66], [-69.5, -104], [-107.5, -140], [-143.5, -184]],
    shelves: [
        [-3.5, T1, -12, 4, 2.4], [1.5, T2, -17, 3.5, 2.4], [4, T1, -27, 4, 2.4],
        [-4, T1, -46, 4, 2.4], [3, T1, -59, 4, 2.4], [3, T2, -63.5, 3.5, 2.4],
        [0, T1, -78, 5, 2.4], [-4, T2, -83, 4, 2.4], [4, T1, -94, 4, 2.4],
        [-3, T1, -116, 4, 2.4], [3, T1, -131, 4, 2.4], [-2, T2, -135.5, 3.5, 2.4],
        [2, T1, -160, 4, 2.4], [-3, T1, -172, 4, 2.4],
        [-11, T1, -200, 5, 3], [11, T1, -222, 5, 3]
    ],
    solids: BRIDGES.map(z => [-HW, DECK_LO, z - 1.5, HW, DECK_HI, z + 1.5]),
    items: [
        ...[[-3.5, T1, -12], [1.5, T2, -17], [-5, 0, -30], [-1, DECK_HI, -52], [3, T2, -63.5], [-4, T2, -83], [5, 0, -98],
            [-1, DECK_HI, -122], [-2, T2, -135.5], [-3, T1, -172]].map(p => ['shoebox', ...p]),
        ['heart', 5, 0, -44], ['heart', -5, 0, -150]
    ],
    collect: { kind: 'shoebox', icon: '📦', name: 'Ayakkabı kutusu', word: 'AYAKKABI KUTUSU!' },
    brickRows: [[0, -24], [-4, -90], [3, -155]],
    checkpointZ: -96,
    spawns: [
        ['police', 2, -22], ['police', -3, -31],
        ['gas', 0, -42], ['riot', 3, -58], ['police', -4, -63], ['sniper', 3, BRIDGES[0], DECK_HI],
        ['police', -3, -76], ['riot', 4, -88], ['police', 3, -92], ['gas', -4, -101],
        ['riot', 0, -112], ['police', -4, -128], ['sniper', 3, BRIDGES[1], DECK_HI], ['gas', 4, -134],
        ['police', -3, -150], ['riot', 3, -165], ['police', 0, -176]
    ],
    target: 11, cry: 'GÖZALTI İPTAL!', ammo: 'bribe', ammoName: 'RÜŞVET',
    gateWho: 'POLİS', gateColor: '#1e3a8a', gateOpen: "11 POLİS SUSTU! KAPI AÇILDI — SAYGILI'YA GİT!",
    boss: (scene) => spawnSaygili(scene, new THREE.Vector3(0, 0, -218)),
    wonTitle: 'BÖLÜM 2 TAMAM!', wonNote: "4'lü çete ve Bilal kurtuldu, dosya kapandı!",
    buildGate(g) {   // kırmızı-beyaz polis bariyerleri, iki kat
        const stripe = canvasTex(64, 16, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f8fafc' : '#dc2626'; c.fillRect(i * 8, 0, 8, 16); } }, { pixel: true });
        const m = new THREE.MeshLambertMaterial({ map: stripe });
        for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 0.5), m);
            b.position.set(-HW + 1.4 + i * 2.65 + r * 0.6, 0.6 + r * 1.2, r * 0.1); b.castShadow = true; g.add(b);
            g.add(box(0.12, 0.6 + r * 1.2, 0.12, '#6b7280', b.position.x - 1, (0.6 + r * 1.2) / 2, 0));
            g.add(box(0.12, 0.6 + r * 1.2, 0.12, '#6b7280', b.position.x + 1, (0.6 + r * 1.2) / 2, 0));
        }
        g.add(box(16, 0.15, 0.15, '#9ca3af', 0, 3.2, 0));
    },
    decorate
};

// Türk bayrağı (dalgalanır)
function flagTex() {
    return canvasTex(192, 128, (g, W, H) => {
        g.fillStyle = '#e30a17'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(W * 0.37, H / 2, H * 0.25, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e30a17'; g.beginPath(); g.arc(W * 0.41, H / 2, H * 0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? H * 0.05 : H * 0.125, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(W * 0.56 + Math.cos(a) * r, H / 2 + Math.sin(a) * r); }
        g.closePath(); g.fill();
    });
}
// Çakarlı polis aracı (yolun dışında park etmiş)
function policeCar(scene, W, x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    const side = canvasTex(256, 64, (c, Wd, H) => {
        c.fillStyle = '#f8fafc'; c.fillRect(0, 0, Wd, H); c.fillStyle = '#1d4ed8'; c.fillRect(0, H * 0.45, Wd, H * 0.22);
        c.fillStyle = '#1e3a8a'; c.font = 'bold 26px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('POLİS', Wd / 2, H * 0.25);
    });
    const sm = new THREE.MeshLambertMaterial({ map: side });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.75, 4.3), [sm, sm, mat('#f8fafc'), mat('#1f2937'), mat('#e5e7eb'), mat('#e5e7eb')]);
    body.position.y = 0.65; body.castShadow = true; g.add(body);
    g.add(box(1.7, 0.6, 2.2, '#cbd5e1', 0, 1.3, -0.2));
    g.add(box(1.72, 0.45, 2.0, '#1e293b', 0, 1.3, -0.2, false));
    const red = box(0.6, 0.16, 0.3, '#ef4444', -0.35, 1.68, -0.2, false), blue = box(0.6, 0.16, 0.3, '#3b82f6', 0.35, 1.68, -0.2, false);
    g.add(red, blue);
    [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]].forEach(([wx, wz]) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.25, 10), mat('#111827')); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.36, wz); g.add(w);
    });
    const ph = Math.random();
    const R = [mat('#ef4444'), mat('#7f1d1d')], B = [mat('#3b82f6'), mat('#1e3a8a')];
    W.movers.push((dt, t) => { const k = Math.floor(t * 6 + ph * 6) % 2; red.material = R[k]; blue.material = B[1 - k]; });
}
// Muhabir: kamerası flaş çakar
function reporter(scene, W, x, z, rot, col) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    g.add(box(0.16, 0.8, 0.18, '#1f2937', -0.1, 0.4, 0)); g.add(box(0.16, 0.8, 0.18, '#1f2937', 0.1, 0.4, 0));
    g.add(box(0.48, 0.6, 0.28, col, 0, 1.1, 0));
    g.add(box(0.32, 0.36, 0.3, '#e0ac69', 0, 1.6, 0));
    g.add(box(0.36, 0.1, 0.32, '#292524', 0, 1.8, 0));
    g.add(box(0.24, 0.2, 0.34, '#111827', 0.18, 1.5, 0.3));
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    flash.position.set(0.18, 1.62, 0.5); flash.visible = false; g.add(flash);
    W.movers.push(() => { flash.visible = Math.random() < 0.035; });
}
// Ayakkabı kutusu yığını
function shoePile(scene, x, z) {
    const tex = canvasTex(64, 32, (c) => { c.fillStyle = '#ea580c'; c.fillRect(0, 0, 64, 32); c.fillStyle = '#fff7ed'; c.font = 'bold 13px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SHOES', 32, 17); }, { pixel: true });
    const m = new THREE.MeshLambertMaterial({ map: tex });
    for (let r = 0; r < 4; r++) for (let i = 0; i < 4 - r; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.32, 0.45), m);
        b.position.set(x + (i - (3 - r) / 2) * 0.78, 0.16 + r * 0.33, z); b.rotation.y = rand(-0.1, 0.1); scene.add(b);
    }
    scene.add(box(0.4, 0.05, 0.25, '#16a34a', x + 0.2, 1.35, z, false));
}
// "Son dakika" ekranı (direkli)
function newsScreen(scene, x, z, rot, text) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    g.add(box(0.18, 3.2, 0.18, '#374151', 0, 1.6, 0));
    g.add(box(3.6, 2.1, 0.22, '#0f172a', 0, 3.9, 0));
    const t = canvasTex(512, 288, (c, Wd, H) => {
        c.fillStyle = '#1e293b'; c.fillRect(0, 0, Wd, H);
        c.fillStyle = '#dc2626'; c.fillRect(0, H - 96, Wd, 96); c.fillStyle = '#facc15'; c.fillRect(0, H - 120, 210, 28);
        c.fillStyle = '#111827'; c.font = 'bold 20px Arial Black, Arial'; c.textBaseline = 'middle'; c.fillText('SON DAKİKA', 12, H - 106);
        c.fillStyle = '#fef2f2'; c.textAlign = 'center';
        const words = text.split(' '), mid = Math.ceil(words.length / 2);
        fitText(c, words.slice(0, mid).join(' '), Wd / 2, H - 70, Wd - 30, 34); fitText(c, words.slice(mid).join(' '), Wd / 2, H - 32, Wd - 30, 34);
        c.fillStyle = '#64748b'; c.fillRect(150, 40, 212, 110); c.fillStyle = '#ea580c'; c.fillRect(180, 90, 70, 40); c.fillRect(260, 95, 70, 35);
        c.fillStyle = '#16a34a'; c.fillRect(190, 80, 40, 12); c.fillRect(270, 86, 40, 12);
    });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.86), new THREE.MeshBasicMaterial({ map: t }));
    scr.position.set(0, 3.9, 0.12); g.add(scr);
}

function decorate(scene, W) {
    // Apartmanlar (yolun iki yanında, yola bakan cephe pencereli)
    const facade = canvasTex(64, 96, (g) => {
        g.fillStyle = '#d6d3d1'; g.fillRect(0, 0, 64, 96);
        for (let y = 0; y < 3; y++) for (let x = 0; x < 2; x++) { g.fillStyle = Math.random() < 0.25 ? '#fde68a' : '#334155'; g.fillRect(x * 32 + 6, y * 32 + 6, 20, 22); }
    }, { repeat: [1, 1], pixel: true });
    const tints = ['#d6d3d1', '#e7e5e4', '#cbd5e1', '#fde68a', '#fecaca'];
    for (let z = 18; z > -310; z -= 13) {
        [-1, 1].forEach(s => {
            const arena = z < ARENA.z0 + 4, edge = arena ? ARENA.hw : HW;
            const w = rand(9, 12), h = rand(10, 22), d = 9, x = s * (edge + 8 + d / 2 + rand(0, 3));
            const f = facade.clone(); f.repeat.set(w / 4, h / 6); f.needsUpdate = true;
            const fm = new THREE.MeshLambertMaterial({ map: f, color: tints[Math.floor(rand(0, tints.length))] });
            const side = mat('#a8a29e');
            const m = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), s < 0 ? [fm, side, mat('#78716c'), side, side, side] : [side, fm, mat('#78716c'), side, side, side]);
            m.position.set(x, h / 2, z); scene.add(m);
        });
    }
    // Kaldırım lambaları
    for (let z = 0; z > ARENA.z0; z -= 18) [-1, 1].forEach(s => {
        scene.add(box(0.12, 4.5, 0.12, '#4b5563', s * (HW + 0.9), 2.25, z));
        scene.add(box(0.9, 0.12, 0.25, '#4b5563', s * (HW + 0.5), 4.5, z));
        scene.add(box(0.4, 0.1, 0.3, '#fef9c3', s * (HW + 0.2), 4.42, z, false));
    });
    // Çakarlı polis araçları, muhabirler, ayakkabı kutusu yığınları, son dakika ekranları
    [[-1, 2], [1, -20], [-1, -40], [1, -72], [-1, -98], [1, -118], [-1, -146], [1, -168]].forEach(([s, z]) => policeCar(scene, W, s * (HW + 2.5), z, rand(-0.2, 0.2)));
    [[-11, -6, 0.9, '#7c3aed'], [-11.8, -4.6, 1.1, '#0ea5e9'], [-10.6, -3.4, 0.7, '#f97316'], [11, -84, -0.9, '#16a34a'], [11.6, -86, -1.1, '#dc2626']]
        .forEach(([x, z, r, c]) => reporter(scene, W, x, z, r, c));
    [[-11, -28], [11, -60], [-11, -130], [11, -178]].forEach(([x, z]) => shoePile(scene, x, z));
    [[-1, -14], [1, -48], [-1, -88], [1, -126], [-1, -160]].forEach(([s, z], i) => newsScreen(scene, s * (HW + 2.2), z, -s * Math.PI / 2 * 0.7, NEWS[i % NEWS.length]));
    entrySign(scene, 'EMNİYET MÜDÜRLÜĞÜ →', '#1e3a8a');

    // Asma köprüler: kuleler, halatlar, askılar, tabliye; altından geçerken kamera görsün diye tabliye saydamlaşır
    BRIDGES.forEach(bz => {
        const deckM = new THREE.MeshLambertMaterial({ map: tiled('concrete', 4, 1), transparent: true });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 2, DECK_HI - DECK_LO, 3), deckM);
        deck.position.set(0, (DECK_LO + DECK_HI) / 2, bz); deck.castShadow = true; deck.receiveShadow = true; scene.add(deck);
        const parts = [deck];
        [-1, 1].forEach(s => {   // kuleler
            const t = box(0.7, 8, 0.7, '#94a3b8', s * (HW + 1.2), 4, bz); scene.add(t);
            const lamp = box(0.25, 0.25, 0.25, '#ef4444', s * (HW + 1.2), 8.2, bz, false); scene.add(lamp);
        });
        [-1.45, 1.45].forEach(dz => {   // ana halat + askılar + korkuluk
            const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16, x = -HW - 1.2 + u * (2 * HW + 2.4); pts.push(new THREE.Vector3(x, 7.6 - 4.4 * (1 - Math.pow(2 * u - 1, 2)), bz + dz)); }
            const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 5), mat('#f1f5f9')); scene.add(cable);
            for (let i = 2; i <= 14; i += 2) { const p = pts[i]; const h = box(0.03, p.y - DECK_HI, 0.03, '#e2e8f0', p.x, (p.y + DECK_HI) / 2, p.z, false); scene.add(h); parts.push(h); }
            const rail = box(HW * 2 + 2, 0.06, 0.06, '#cbd5e1', 0, DECK_HI + 0.55, bz + dz, false); scene.add(rail); parts.push(rail);
        });
        W.movers.push(() => {
            const p = G.player, c = G.camera;
            const under = p && c && Math.abs(p.pos.z - bz) < 5 && p.pos.y < DECK_LO - 0.3 && c.position.y > DECK_LO;
            deckM.opacity = under ? 0.3 : 1; deckM.depthWrite = !under;
        });
    });

    // İstanbul Emniyet Müdürlüğü (meydanın arkasında) + bayrak
    {
        const z = ARENA.z1 - 14;
        const facadeE = canvasTex(512, 192, (g, Wd, H) => {
            g.fillStyle = '#cbd5e1'; g.fillRect(0, 0, Wd, H);
            for (let y = 0; y < 6; y++) for (let x = 0; x < 28; x++) { g.fillStyle = Math.random() < 0.3 ? '#fde68a' : '#334155'; g.fillRect(x * 18 + 4, y * 30 + 10, 12, 20); }
        });
        const m = new THREE.Mesh(new THREE.BoxGeometry(76, 22, 14), [mat('#94a3b8'), mat('#94a3b8'), mat('#64748b'), mat('#64748b'), new THREE.MeshLambertMaterial({ map: facadeE }), mat('#94a3b8')]);
        m.position.set(0, 11, z); scene.add(m);
        const sign = signBoard('İSTANBUL EMNİYET MÜDÜRLÜĞÜ', '#f8fafc', '#1e3a8a', 34, 3.2); sign.position.set(0, 17.5, z + 7.1); scene.add(sign);
        scene.add(box(0.25, 9, 0.25, '#e5e7eb', 24, 26.5, z + 2));
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(6, 4, 8, 1), new THREE.MeshLambertMaterial({ map: flagTex(), side: THREE.DoubleSide }));
        flag.position.set(27.1, 29, z + 2); scene.add(flag);
        const pos = flag.geometry.attributes.position, base = pos.array.slice();
        W.movers.push((dt, t) => {
            for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.array[i * 3 + 2] = Math.sin(t * 3 + x * 1.2) * 0.25 * (x + 3) / 6; }
            pos.needsUpdate = true;
        });
    }
}
