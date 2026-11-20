// HIRHIZ 3D — 9. BÖLÜM: SELO DAĞDA! (Selo dağa kaçtı; yollar terörist dolu)
// Dağ yolu: iki yanda kayalık yamaçlar, uzakta karlı zirveler, çam ağaçları, mağaralar, terör kampı (çadırlar, cephane sandıkları, kamp ateşi).
// Düşmanlar teröristler (terrorists.js): KELEŞLİ barikat arkasından kalkıp ateş eder, BOMBACI çukurdan bomba atar,
// CANLI BOMBA bağırarak koşar, yola rastgele MAYINLAR gömülü (yaklaşınca bip bip, sonra patlar).
// Kelepçeyle yakalanırlar. 11 terörist → kamp kapısı → canavar SELO (boss_human.js). Yenilince hücre parmaklığı iner.
import * as THREE from 'three';
import { box, mat, canvasTex, rand } from './util.js?v=28';
import { T1, T2, HW, ARENA, signBoard, entrySign } from './world.js?v=28';
import { spawnSelo, seloJail } from './boss_human.js?v=28';
import { Batch, mat4 } from './decor.js?v=28';
import { makeMines, sandbags } from './terrorists.js?v=28';

const TOWERS = [-50, -120], TOWER_X = -4.5, DECK = 2.8;
const SEGS = [[10, -36], [-39.5, -70], [-73.5, -106], [-109.5, -142], [-145.5, -184]];
const BRICK_Z = [-24, -102, -164];
// Mayınlar: her bölüm açılışında rastgele (yolun üstünde; çukur, tuğla sırası ve kontrol noktasından uzak)
// Tohumlu rastgele: iki kişilik oyunda iki telefonda da mayınlar aynı yerde olsun
function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function minePlaces(n) {
    const out = [], R = seeded(9091), rr = (a, b) => a + R() * (b - a);
    for (let tries = 0; out.length < n && tries < 400; tries++) {
        const z = rr(-12, -178), x = rr(-HW + 1.2, HW - 1.2);
        if (!SEGS.some(([a, b]) => z < a - 1.5 && z > b + 1.5)) continue;
        if (BRICK_Z.some(bz => Math.abs(z - bz) < 2.5) || Math.abs(z + 106) < 4) continue;
        if (out.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 7)) continue;
        out.push([x, z]);
    }
    return out;
}

export const LEVEL9 = {
    id: 9, name: 'SELO DAĞDA!', menuTitle: '9 · SELO',
    desc: 'Selo dağa kaçtı! Keleşliler barikattan ateş eder, bombacılar çukurdan bomba atar, canlı bombalar koşar, mayınlar öter. SELO\'yu yen, içeri at!',
    mission: 'TERÖRİSTLERİ GEÇ, SELO\'YU YAKALA!',
    music: '../bozkir_dortnal.mp3',
    sky: ['#0369a1', '#38bdf8', '#e0f2fe'], fog: '#cbd5e1', hemi: ['#f8fafc', '#57534e', 1.35], sun: ['#fff7ed', 2.0],
    ground: { top: 'dirt', side: 'dirt', arena: 'dirt' }, outer: 'dirt', outerRep: 4, pitFloor: '#292524',
    edge: { color: '#78716c', h: 0.7, w: 0.5 }, pitSign: 'UÇURUM',
    segs: SEGS,
    shelves: [
        [3.5, T1, -12, 4, 2.4], [-1, T2, -17, 3.5, 2.4], [-4, T1, -28, 4, 2.4],
        [3, T1, -46, 4, 2.4], [-1.5, T2, -51, 3.5, 2.4], [3, T1, -62, 4, 2.4],
        [-3, T1, -80, 4, 2.4], [1.5, T2, -85, 3.5, 2.4], [5, T1, -96, 3.5, 2.4],
        [3, T1, -116, 4, 2.4], [-1, T2, -121, 3, 2.4], [-3, T1, -134, 4, 2.4],
        [3, T1, -152, 4, 2.4], [-1, T2, -157, 3.5, 2.4], [-4, T1, -170, 4, 2.4],
        [-11, T1, -200, 5, 3], [11, T1, -222, 5, 3]
    ],
    solids: TOWERS.map(z => [TOWER_X - 1.1, DECK - 0.3, z - 1.1, TOWER_X + 1.1, DECK, z + 1.1]),   // kaya çıkıntıları (üstünde keleşli)
    items: [
        ...[[-1, T2, -17], [-4, T1, -28], [TOWER_X + 0.6, DECK, -49.6], [-1.5, T2, -51], [1.5, T2, -85], [5, T1, -96],
            [TOWER_X + 0.6, DECK, -119.6], [-1, T2, -121], [-1, T2, -157], [5, 0, -176]].map(p => ['bag', ...p]),
        ['heart', 5, 0, -66], ['heart', -5, 0, -148]
    ],
    collect: { kind: 'bag', icon: '💰', name: 'Kul hakkı torbası', word: 'KUL HAKKI!' },
    brickRows: [[0, -24], [3, -102], [0, -164]],
    checkpointZ: -106,
    spawns: [
        ['keles', 2, -20], ['canli', -2, -32],
        ['bombaci', 3, -44], ['keles', -3, -58], ['keles', TOWER_X, TOWERS[0] - 0.3, DECK],
        ['canli', 0, -78], ['bombaci', 4, -90], ['keles', -3, -99],
        ['canli', 3, -112], ['bombaci', 0, -130], ['keles', TOWER_X, TOWERS[1] - 0.3, DECK],
        ['keles', -3, -150], ['canli', 3, -162], ['bombaci', 0, -175]
    ],
    target: 11, cry: 'YAKALANDI!', ammo: 'cuffs', ammoName: 'KELEPÇE',
    gateWho: 'TERÖRİST', gateColor: '#3f4a22', gateOpen: '11 TERÖRİST YAKALANDI! KAMPIN KAPISI AÇILDI — SELO\'YA GİT!',
    boss: (scene) => spawnSelo(scene, new THREE.Vector3(0, 0, -222)),
    outro: (scene) => seloJail(scene),
    wonTitle: 'BÖLÜM 9 TAMAM!', wonNote: 'Dağdaki kamp dağıldı, Selo içeride! AİHM kararı mı? Tanımıyoruz! Sıra İstanbul\'da: Ekrem!',
    buildGate(g) {   // kampın ahşap kapısı: kütük direkler, kum torbaları, dikenli tel
        [-1, 1].forEach(s => { g.add(box(0.5, 4.2, 0.5, '#5b3a1e', s * (HW - 0.4), 2.1, 0)); });
        for (let i = 0; i <= 12; i++) g.add(box(0.22, 3.2, 0.18, '#78350f', -HW + 0.9 + i * (HW * 2 - 1.8) / 12, 1.6, 0));
        [0.6, 2.6].forEach(y => g.add(box(HW * 2, 0.2, 0.2, '#5b3a1e', 0, y, 0.12)));
        const coil = new THREE.TorusGeometry(0.28, 0.025, 4, 10), cm = mat('#1c1917');
        for (let x = -HW; x < HW; x += 0.5) { const c = new THREE.Mesh(coil, cm); c.position.set(x, 3.5, 0); c.rotation.y = Math.PI / 2; g.add(c); }
        const s = signBoard('TERÖR KAMPI', '#fef2f2', '#7f1d1d', 4.5, 0.7); s.position.set(0, 4.5, 0.3); g.add(s);
    },
    decorate
};

function decorate(scene, W) {
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
    // --- Kayalık yamaçlar: yolun iki yanında kademeli kaya blokları (yükselerek uzaklaşır) ---
    const rocks = [];
    for (let z = 16; z > -300; z -= 3.2) [-1, 1].forEach(s => {
        const arena = z < ARENA.z0 + 4, edge = arena ? ARENA.hw : HW;
        for (let k = 0; k < 4; k++) {
            if (Math.random() < 0.3) continue;
            const x = s * (edge + 3 + k * 5.5 + rand(0, 2.5)), h = 1.5 + k * 3.2 + rand(0, 2.5), w = rand(3, 6);
            rocks.push([x, z + rand(-1, 1), w, h, rand(0, 6), k]);
        }
    });
    const rockG = new THREE.DodecahedronGeometry(1, 0);
    const rm = [new THREE.InstancedMesh(rockG, mat('#78716c', { flatShading: true }), rocks.length), new THREE.InstancedMesh(rockG, mat('#57534e', { flatShading: true }), rocks.length)];
    const cnt = [0, 0];
    rocks.forEach(([x, z, w, h, r, k]) => { const i = (k + (r > 3 ? 1 : 0)) % 2; M.compose(P.set(x, h * 0.45, z), Q.setFromEuler(E.set(rand(-0.2, 0.2), r, rand(-0.2, 0.2))), S.set(w * 0.6, h * 0.65, w * 0.55)); rm[i].setMatrixAt(cnt[i]++, M); });
    rm.forEach((m, i) => { m.count = cnt[i]; m.castShadow = true; m.receiveShadow = true; scene.add(m); });
    // yolda küçük taşlar
    const pebbles = []; for (let i = 0; i < 160; i++) pebbles.push([rand(-HW - 2, HW + 2), rand(-180, 10), rand(0.1, 0.25)]);
    const pb = new THREE.InstancedMesh(rockG, mat('#a8a29e', { flatShading: true }), pebbles.length);
    pebbles.forEach(([x, z, s], i) => { M.compose(P.set(x, s * 0.4, z), Q.setFromEuler(E.set(rand(0, 3), rand(0, 3), 0)), S.set(s, s * 0.7, s)); pb.setMatrixAt(i, M); });
    scene.add(pb);
    // --- Uzakta karlı zirveler ---
    const peakM = mat('#64748b', { flatShading: true, fog: false }), snowM = mat('#f8fafc', { flatShading: true, fog: false });
    [[-120, -260, 70, 60], [-40, -330, 90, 85], [60, -300, 80, 70], [150, -220, 60, 55], [-170, -120, 55, 45], [170, -80, 60, 50], [0, -420, 120, 100]].forEach(([x, z, r, h]) => {
        const p = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), peakM); p.position.set(x, h / 2 - 4, z); p.rotation.y = rand(0, 6); scene.add(p);
        const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, h * 0.32, 7), snowM); c.position.set(x, h - 4 - h * 0.16 + 0.5, z); c.rotation.y = p.rotation.y; scene.add(c);
    });
    // --- Çamlar (yamaçlarda) ---
    const pines = [];
    for (let z = 10; z > -300; z -= 4) [-1, 1].forEach(s => { if (Math.random() < 0.55) { const arena = z < ARENA.z0 + 4; pines.push([s * ((arena ? ARENA.hw : HW) + rand(4, 24)), z + rand(-2, 2), rand(0.8, 1.5)]); } });
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), mat('#4a3426'), pines.length);
    const c1 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.3, 2.6, 7), mat('#14532d', { flatShading: true }), pines.length);
    const c2 = new THREE.InstancedMesh(new THREE.ConeGeometry(0.95, 2.1, 7), mat('#166534', { flatShading: true }), pines.length);
    pines.forEach(([x, z, s], i) => {
        const base = 1.0 + Math.abs(x) * 0.05;   // yamaçta biraz yukarıda
        M.compose(P.set(x, base + 0.8 * s, z), Q.identity(), S.set(s, s, s)); trunk.setMatrixAt(i, M);
        M.compose(P.set(x, base + 2.4 * s, z), Q, S); c1.setMatrixAt(i, M);
        M.compose(P.set(x, base + 3.6 * s, z), Q, S); c2.setMatrixAt(i, M);
    });
    scene.add(trunk, c1, c2);
    // --- Mağaralar (yamaçta karanlık ağızlar) ---
    [[-1, -40], [1, -86], [-1, -128], [1, -170]].forEach(([s, z]) => {
        const x = s * (HW + 6.5);
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(4.2, 0), mat('#57534e', { flatShading: true })); rock.scale.set(1, 0.8, 1.1); rock.position.set(x + s * 1.5, 2.2, z); scene.add(rock);
        const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.5, 10), new THREE.MeshBasicMaterial({ color: '#0c0a09' })); mouth.scale.y = 1.2; mouth.position.set(x - s * 1.9, 1.5, z); mouth.rotation.y = -s * Math.PI / 2; scene.add(mouth);
    });
    // --- Terör kampı: çadırlar, cephane sandıkları, kamp ateşi, telsiz anteni ---
    const b = new Batch(), MM = mat4(0, 0, 0);
    const tent = (x, z, yaw, col) => {
        const g = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.2, 4), mat(col, { flatShading: true })); g.position.set(x, 1.1, z); g.rotation.y = yaw + Math.PI / 4; g.scale.z = 1.4; g.castShadow = true; scene.add(g);
        b.box(MM, 0.7, 1.0, 0.05, '#1c1917', x + Math.sin(yaw) * 1.3, 0.5, z + Math.cos(yaw) * 1.3);
    };
    [[1, -16], [-1, -66], [1, -104], [-1, -140]].forEach(([s, z], i) => {
        const x = s * (HW + 5);
        tent(x, z, -s * Math.PI / 2, ['#4d5b2a', '#57534e', '#3f4a22'][i % 3]); tent(x + s * 1.5, z - 4, -s * Math.PI / 2, '#57534e');
        for (let k = 0; k < 3; k++) { b.box(MM, 0.9, 0.5, 0.6, '#4d5b2a', x - s * 0.5, 0.25 + k * 0.5 * (k < 2 ? 1 : 0), z + 2.5 + (k === 2 ? 0.7 : 0)); b.box(MM, 0.92, 0.06, 0.62, '#3f3f1f', x - s * 0.5, 0.48 + k * 0.5 * (k < 2 ? 1 : 0), z + 2.5 + (k === 2 ? 0.7 : 0)); }
        sandbags(b, x - s * 1.6, z - 2, 2.4, 2, Math.PI / 2);
        // kamp ateşi
        for (let k = 0; k < 5; k++) b.box(mat4(x - s * 0.6, 0, z - 6.5, k * 1.2), 0.9, 0.1, 0.12, '#5b3a1e', 0, 0.06, 0);
        const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), new THREE.MeshBasicMaterial({ color: '#f97316' })); fire.position.set(x - s * 0.6, 0.45, z - 6.5); scene.add(fire);
        const light = new THREE.PointLight('#fb923c', 4, 7, 1.6); light.position.set(x - s * 0.6, 1, z - 6.5); scene.add(light);
        W.movers.push((dt, t) => { const k = 0.8 + Math.sin(t * 17 + i) * 0.2; fire.scale.set(k, 0.8 + Math.abs(Math.sin(t * 11 + i)) * 0.5, k); light.intensity = 3 + Math.sin(t * 23 + i) * 1; });
        b.box(MM, 0.06, 5, 0.06, '#9ca3af', x + s * 2.2, 2.5, z - 1);   // telsiz anteni
    });
    // kaya çıkıntıları (üstünde keleşli; platforma zıplanır)
    TOWERS.forEach(z => {
        const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), mat('#78716c', { flatShading: true })); r.scale.set(1.0, (DECK - 0.3) / 1.6 * 0.75, 1.0); r.position.set(TOWER_X, (DECK - 0.3) / 2, z); scene.add(r);
        b.box(MM, 2.2, 0.3, 2.2, '#57534e', TOWER_X, DECK - 0.15, z);
    });
    // Meydan: dağ düzlüğü, arkada büyük mağara ağzı ve kamp
    {
        const z = ARENA.z1 - 10;
        const cliff = new THREE.Mesh(new THREE.BoxGeometry(ARENA.hw * 2 + 30, 26, 10), mat('#78716c', { flatShading: true })); cliff.position.set(0, 13, z - 3); scene.add(cliff);
        const mouth = new THREE.Mesh(new THREE.CircleGeometry(6, 14), new THREE.MeshBasicMaterial({ color: '#0c0a09' })); mouth.scale.y = 0.8; mouth.position.set(0, 4.6, z + 2.05); scene.add(mouth);
        tent(-10, ARENA.z1 + 4, 0, '#4d5b2a'); tent(10, ARENA.z1 + 4, 0, '#57534e');
    }
    scene.add(b.mesh());
    // --- Mayınlar ve uyarı tabelaları ---
    makeMines(scene, W, minePlaces(12));
    [[1, 4], [-1, -76], [1, -140]].forEach(([s, z]) => {
        const sg = signBoard('DİKKAT MAYIN!', '#fef2f2', '#b91c1c', 2.6, 0.6); sg.position.set(s * (HW + 1.6), 1.6, z); sg.rotation.y = -s * Math.PI / 2; scene.add(sg);
        scene.add(box(0.1, 1.3, 0.1, '#44403c', s * (HW + 1.6), 0.65, z));
        const sk = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ color: '#facc15', side: THREE.DoubleSide })); sk.position.set(s * (HW + 1.58), 2.2, z); sk.rotation.set(0, -s * Math.PI / 2, Math.PI / 4); scene.add(sk);
    });
    entrySign(scene, 'DAĞ YOLU', '#3f4a22');
}
