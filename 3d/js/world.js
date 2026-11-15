// HIRHIZ 3D — 1. BÖLÜM: GEZİ PARKI dünyası
// Yol -Z yönünde ilerler. Yolun ortasındaki boşluklar Topçu Kışlası inşaatı çukurları (düşen 1 can kaybeder).
// Tuğla raflar (T1 = 1.8 m, T2 = 3.2 m), kafayla kırılan tuğlalar, çınar fidanları, baret + maske gücü,
// yarı yolda kontrol noktası bayrağı, sonunda barikat (11 kişi yenilince açılır) ve TOMA meydanı; arkada pankartlı AKM.
import * as THREE from 'three';
import { box, mat, canvasTex, fitText, AABB, rand } from './util.js?v=1';

export const T1 = 1.8, T2 = 3.2;
export const HW = 8;                                            // yolun yarı genişliği
const SEGS = [[10, -36], [-39.5, -70], [-73.5, -126], [-129.5, -158], [-161.5, -184]];
export const ARENA = { z0: -184, z1: -236, hw: 18, cz: -212 };
const SHELVES = [   // [x, üst yüzey, z, genişlik (x), derinlik (z)]
    [-3.5, T1, -12, 4, 2.4], [1.5, T2, -17, 3.5, 2.4], [4, T1, -28, 4, 2.4],
    [-4, T1, -47, 4, 2.4], [3, T1, -60, 4, 2.4], [3, T2, -64.5, 3.5, 2.4],
    [0, T1, -80, 5, 2.4], [-4, T2, -85, 4, 2.4], [4, T1, -104, 4, 2.4], [-3, T1, -115, 4, 2.4], [2, T2, -120, 4, 2.4],
    [-3, T1, -136, 4, 2.4], [3, T1, -150, 4, 2.4], [0, T1, -170, 4, 2.4],
    [-11, T1, -200, 5, 3], [11, T1, -222, 5, 3]
];
const FIDANS = [[-3.5, T1, -12], [1.5, T2, -17], [-5, 0, -33], [3, T2, -64.5], [-4, T2, -85], [5, 0, -95],
                [2, T2, -120], [-3, T1, -136], [6, 0, -155], [0, T1, -170]];
const MASKS = [[5, 0, -44], [-6, 0, -100], [5, 0, -165]];
const BRICK_ROWS = [[0, -24], [-4, -92], [3, -145]];             // ortası altın tuğla (içinden kul hakkı torbası çıkar)
const BRICK_Y = 2.7;                                            // tuğlanın alt yüzü
export const SPAWNS = [
    ['carsi', 2, -22], ['kirmizi', -3, -31],
    ['sema', 0, -46], ['tencere', 3, -55], ['capulcu', -4, -63],
    ['carsi', -3, -82], ['kirmizi', 4, -90], ['tencere', 0, -101], ['sema', -4, -109], ['capulcu', 4, -118],
    ['tencere', 0, -138], ['carsi', -4, -146], ['kirmizi', 4, -152],
    ['sema', -3, -167], ['capulcu', 3, -176],
    ['duran', 5, -50], ['duran', -5, -143]
];
export const CHECKPOINT_Z = -96;
const BANNERS = [['ÇAPULCU', '#dc2626'], ['HER YER TAKSİM', '#111827'], ['DİREN GEZİ', '#16a34a'], ['ÇAPULCUYUZ', '#7c3aed']];

// --- DOKULAR ---
const TEX = {};
function textures() {
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
    TEX.gold = canvasTex(32, 32, (g) => {
        g.fillStyle = '#ca8a04'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#facc15'; g.fillRect(2, 2, 28, 28);
        g.fillStyle = '#854d0e'; g.font = 'bold 24px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 16, 18);
    }, { pixel: true });
}
function tiled(name, rx, ry) { const t = TEX[name].clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t; }

// Kutu biçimli zemin/raf: üstü bir doku, yanları başka doku
function slab(x0, x1, y0, y1, z0, z1, top, side, k = 0.5) {
    const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
    const sideX = new THREE.MeshLambertMaterial({ map: tiled(side, d * k, h * k) });
    const sideZ = new THREE.MeshLambertMaterial({ map: tiled(side, w * k, h * k) });
    const topM = new THREE.MeshLambertMaterial({ map: tiled(top, w * k, d * k) });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideX, sideX, topM, topM, sideZ, sideZ]);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.receiveShadow = true;
    return m;
}

// Pankart: iki direk arasında yazılı bez
function banner(text, color, w = 5, h = 1.2) {
    const g = new THREE.Group();
    const t = canvasTex(512, Math.round(512 * h / w), (c, W, H) => {
        c.fillStyle = '#f8fafc'; c.fillRect(0, 0, W, H);
        c.strokeStyle = color; c.lineWidth = 8; c.strokeRect(6, 6, W - 12, H - 12);
        c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, text, W / 2, H / 2 + 4, W - 40, H * 0.7);
    });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide }));
    cloth.position.y = 2.6; g.add(cloth);
    g.add(box(0.1, 3.3, 0.1, '#57534e', -w / 2, 1.65, 0)); g.add(box(0.1, 3.3, 0.1, '#57534e', w / 2, 1.65, 0));
    return g;
}

function signBoard(text, color, bg, w, h) {
    const t = canvasTex(512, Math.round(512 * h / w), (c, W, H) => {
        c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
        fitText(c, text, W / 2, H / 2 + 4, W - 30, H * 0.6);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t }));
}

// Çınar fidanı (toplanır)
function makeFidan() {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8), mat('#b45309')); pot.position.y = 0.15; g.add(pot);
    g.add(box(0.04, 0.5, 0.04, '#78350f', 0, 0.5, 0, false));
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), mat('#16a34a'));
    leaf.position.y = 0.8; g.add(leaf);
    const l2 = leaf.clone(); l2.scale.setScalar(0.7); l2.position.set(0.16, 0.62, 0); g.add(l2);
    const l3 = leaf.clone(); l3.scale.setScalar(0.7); l3.position.set(-0.16, 0.66, 0); g.add(l3);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshBasicMaterial({ color: '#86efac', transparent: true, opacity: 0.18, depthWrite: false }));
    glow.position.y = 0.55; g.add(glow);
    return g;
}
// Baret + gaz maskesi gücü
function makeMask() {
    const g = new THREE.Group();
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#facc15'));
    hm.position.y = 0.55; g.add(hm); g.add(box(0.66, 0.05, 0.66, '#eab308', 0, 0.55, 0, false));
    g.add(box(0.3, 0.2, 0.14, '#f8fafc', 0, 0.38, 0.2, false));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.2, depthWrite: false }));
    glow.position.y = 0.5; g.add(glow);
    return g;
}
// Kul hakkı torbası
export function makeBag() {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), mat('#c8a165')); s.scale.set(1, 1.15, 1); s.position.y = 0.3; g.add(s);
    g.add(box(0.12, 0.14, 0.12, '#7c2d12', 0, 0.62, 0, false));
    g.add(box(0.16, 0.08, 0.02, '#22c55e', 0.05, 0.68, 0, false));
    return g;
}

export function buildWorld(scene) {
    textures();
    const W = { solids: [], items: [], bricks: [], movers: [], flags: [] };
    const addSolid = (a, mesh) => { a.mesh = mesh || null; W.solids.push(a); return a; };

    // Zemin parçaları (yol) ve meydan
    SEGS.forEach(([z0, z1]) => {
        const m = slab(-HW, HW, -3, 0, z0, z1, 'pave', 'dirt'); scene.add(m);
        addSolid(new AABB(-HW, -3, z1, HW, 0, z0, 'ground'), m);
    });
    { const m = slab(-ARENA.hw, ARENA.hw, -3, 0, ARENA.z0, ARENA.z1, 'pave', 'dirt'); scene.add(m);
      addSolid(new AABB(-ARENA.hw, -3, ARENA.z1, ARENA.hw, 0, ARENA.z0, 'ground'), m); }
    // Çukurların dibi: çamur
    const mud = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, 200), mat('#3b2a1a')); mud.rotation.x = -Math.PI / 2; mud.position.set(0, -3.2, -90); scene.add(mud);
    // Çim alanlar (yolun iki yanı, meydanın arkası)
    const grass = (x0, x1, z0, z1) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z0 - z1), new THREE.MeshLambertMaterial({ map: tiled('grass', (x1 - x0) / 3, (z0 - z1) / 3) }));
        m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.0, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
    };
    grass(-90, -HW - 0.01, 40, ARENA.z0); grass(HW + 0.01, 90, 40, ARENA.z0);
    grass(-90, -ARENA.hw, ARENA.z0, -320); grass(ARENA.hw, 90, ARENA.z0, -320); grass(-ARENA.hw, ARENA.hw, ARENA.z1, -320);
    grass(-HW, HW, 40, 10);

    // Görünmez duvarlar (yoldan çıkılmaz)
    const wall = (x0, x1, z0, z1) => addSolid(new AABB(x0, -20, z1, x1, 12, z0, 'wall'));
    wall(-HW - 1, -HW, 12, ARENA.z0); wall(HW, HW + 1, 12, ARENA.z0);
    wall(-HW, HW, 12, 10.5);
    wall(-ARENA.hw - 1, -HW, ARENA.z0 + 0.5, ARENA.z0); wall(HW, ARENA.hw + 1, ARENA.z0 + 0.5, ARENA.z0);
    wall(-ARENA.hw - 1, -ARENA.hw, ARENA.z0, ARENA.z1); wall(ARENA.hw, ARENA.hw + 1, ARENA.z0, ARENA.z1);
    wall(-ARENA.hw, ARENA.hw, ARENA.z1, ARENA.z1 - 1);

    // Çitler (yol kenarında, zemin olan yerlerde) ve meydanın kenarında alçak duvar
    const hedgeM = mat('#2f5d1f');
    SEGS.forEach(([z0, z1]) => [-1, 1].forEach(s => {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, Math.abs(z1 - z0)), hedgeM);
        h.position.set(s * (HW + 0.4), 0.45, (z0 + z1) / 2); h.castShadow = h.receiveShadow = true; scene.add(h);
    }));
    [-1, 1].forEach(s => scene.add(box(0.6, 0.7, ARENA.z0 - ARENA.z1, '#a8a29e', s * (ARENA.hw + 0.3), 0.35, (ARENA.z0 + ARENA.z1) / 2)));
    scene.add(box(ARENA.hw * 2, 0.7, 0.6, '#a8a29e', 0, 0.35, ARENA.z1 - 0.3));

    // Çukur kenarlarında inşaat dubaları ve tabela
    const pits = SEGS.slice(0, -1).map(([, z1], i) => (z1 + SEGS[i + 1][0]) / 2);
    pits.forEach((pz, i) => {
        [-1, 1].forEach(s => [-1.9, 1.9].forEach(dz => {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 6), mat('#f97316'));
            cone.position.set(s * (HW - 0.4), 0.28, pz + dz); scene.add(cone);
            scene.add(box(0.37, 0.07, 0.37, '#f8fafc', s * (HW - 0.4), 0.3, pz + dz, false));
        }));
        const sb = signBoard('TOPÇU KIŞLASI İNŞAATI', '#f8fafc', '#b91c1c', 4, 0.9);
        const side = i % 2 ? 1 : -1;
        sb.position.set(side * (HW + 2.2), 1.9, pz); sb.rotation.y = -side * Math.PI / 2; scene.add(sb);
        scene.add(box(0.1, 1.5, 0.1, '#44403c', side * (HW + 2.2), 0.75, pz - 1.6)); scene.add(box(0.1, 1.5, 0.1, '#44403c', side * (HW + 2.2), 0.75, pz + 1.6));
    });

    // Tuğla raflar
    SHELVES.forEach(([x, top, z, w, d]) => {
        const m = slab(x - w / 2, x + w / 2, top - 0.35, top, z - d / 2, z + d / 2, 'brick', 'brick', 1);
        m.castShadow = true; scene.add(m);
        addSolid(new AABB(x - w / 2, top - 0.35, z - d / 2, x + w / 2, top, z + d / 2, 'shelf'), m);
    });

    // Kırılabilir tuğlalar (alttan kafa ya da balyozla)
    BRICK_ROWS.forEach(([cx, z]) => [-1, 0, 1].forEach(k => {
        const gold = k === 0, x = cx + k;
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ map: gold ? TEX.gold : TEX.brick }));
        m.position.set(x, BRICK_Y + 0.5, z); m.castShadow = true; scene.add(m);
        const a = addSolid(new AABB(x - 0.5, BRICK_Y, z - 0.5, x + 0.5, BRICK_Y + 1, z + 0.5, 'brick'), m);
        W.bricks.push({ aabb: a, mesh: m, gold, broken: false });
    }));

    // Toplanacaklar
    FIDANS.forEach(([x, y, z]) => { const g = makeFidan(); g.position.set(x, y, z); scene.add(g); W.items.push({ kind: 'fidan', mesh: g, pos: g.position, baseY: y, taken: false }); });
    MASKS.forEach(([x, y, z]) => { const g = makeMask(); g.position.set(x, y, z); scene.add(g); W.items.push({ kind: 'mask', mesh: g, pos: g.position, baseY: y, taken: false }); });

    // Kontrol noktası bayrağı
    {
        const g = new THREE.Group(); g.position.set(HW - 1, 0, CHECKPOINT_Z); scene.add(g);
        g.add(box(0.12, 4, 0.12, '#e5e7eb', 0, 2, 0));
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshLambertMaterial({ color: '#6b7280', side: THREE.DoubleSide }));
        cloth.position.set(-0.75, 1.0, 0); g.add(cloth);
        W.checkpoint = { z: CHECKPOINT_Z, cloth, reached: false, pos: new THREE.Vector3(0, 0, CHECKPOINT_Z) };
    }

    // Barikat: meydanın girişini kapatır; yeterli kişi yenilince yere iner
    {
        const g = new THREE.Group(); g.position.set(0, 0, ARENA.z0 + 0.3); scene.add(g);
        for (let i = 0; i < 9; i++) {
            const x = -HW + 1 + i * 1.75;
            g.add(box(1.6, 1.0, 0.8, ['#78716c', '#57534e', '#a8a29e'][i % 3], x, 0.5, 0));
            g.add(box(1.2, 0.9, 0.7, ['#57534e', '#a8a29e', '#78716c'][i % 3], x + 0.3, 1.45, 0.05));
            const tire = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.15, 6, 10), mat('#1c1917'));
            tire.position.set(x - 0.2, 2.15, 0); g.add(tire);
        }
        g.add(box(16, 0.15, 0.15, '#9ca3af', 0, 3.2, 0));
        const c = document.createElement('canvas'); c.width = 512; c.height = 128;
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: tex }));
        sign.position.set(0, 3.4, 0.5); g.add(sign);
        const a = addSolid(new AABB(-HW, -1, ARENA.z0 - 0.3, HW, 6, ARENA.z0 + 0.9, 'wall'));
        W.barricade = {
            group: g, aabb: a, open: false, t: 0,
            setCount(n) {
                const x = c.getContext('2d');
                x.fillStyle = '#7f1d1d'; x.fillRect(0, 0, 512, 128); x.fillStyle = '#fef2f2'; x.textAlign = 'center'; x.textBaseline = 'middle';
                fitText(x, n > 0 ? `GEÇMEK İÇİN ${n} KİŞİ DAHA YEN` : 'YOL AÇIK!', 256, 68, 480, 60);
                tex.needsUpdate = true;
            }
        };
    }

    // Çevre: çınarlar (tek seferde çizilir), çadırlar, penguenler, pankartlar, AKM
    decorate(scene, W);
    return W;
}

function decorate(scene, W) {
    // Çınar ağaçları: gövde + yaprak kümeleri (InstancedMesh)
    const spots = [];
    for (let z = 20; z > -300; z -= 6) {
        const inArena = z < ARENA.z0, edge = inArena ? ARENA.hw : HW;
        [-1, 1].forEach(s => {
            if (Math.random() < 0.85) spots.push([s * rand(edge + 2.5, edge + 6), z + rand(-2, 2), rand(0.9, 1.3)]);
            if (Math.random() < 0.6) spots.push([s * rand(edge + 9, edge + 28), z + rand(-3, 3), rand(1, 1.5)]);
        });
    }
    const trunkG = new THREE.CylinderGeometry(0.25, 0.4, 4, 6), leafG = new THREE.IcosahedronGeometry(1.8, 0);
    const trunks = new THREE.InstancedMesh(trunkG, mat('#a8a29e'), spots.length);
    const leaves = new THREE.InstancedMesh(leafG, mat('#3f7d2a', { flatShading: true }), spots.length * 3);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
    spots.forEach(([x, z, s], i) => {
        M.compose(P.set(x, 2 * s, z), Q.identity(), S.set(s, s, s)); trunks.setMatrixAt(i, M);
        for (let k = 0; k < 3; k++) {
            const a = k * 2.1 + i;
            M.compose(P.set(x + Math.cos(a) * 0.9 * s, (4.2 + k * 0.6) * s, z + Math.sin(a) * 0.9 * s),
                      Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), S.setScalar(s * (1 - k * 0.15)));
            leaves.setMatrixAt(i * 3 + k, M);
        }
    });
    trunks.castShadow = true; leaves.castShadow = true;
    scene.add(trunks, leaves);

    // Çadırlar
    const tentCols = ['#f97316', '#2563eb', '#16a34a', '#dc2626', '#facc15', '#7c3aed'];
    for (let i = 0; i < 26; i++) {
        const s = i % 2 ? 1 : -1, z = 5 - i * 7 + rand(-2, 2);
        if (z < ARENA.z0) break;
        const t = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.5, 4), mat(tentCols[i % tentCols.length], { flatShading: true }));
        t.position.set(s * rand(HW + 3.5, HW + 8), 0.75, z); t.rotation.y = Math.PI / 4 + rand(-0.3, 0.3); t.castShadow = true;
        scene.add(t);
    }

    // Pankartlar (yolun kenarında, yola dönük)
    for (let i = 0; i < 8; i++) {
        const [txt, col] = BANNERS[i % BANNERS.length], s = i % 2 ? 1 : -1;
        const b = banner(txt, col); b.position.set(s * (HW + 1.6), 0, -8 - i * 22); b.rotation.y = -s * Math.PI / 2 * 0.75; scene.add(b);
    }

    // Penguenler ve "BELGESEL" yayını yapan televizyon (başlangıçta, çimde)
    const peng = (x, z, r) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r;
        const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.4, 4, 8), mat('#111827')); b.position.y = 0.5; g.add(b);
        g.add(box(0.3, 0.45, 0.1, '#f8fafc', 0, 0.45, 0.2, false));
        g.add(box(0.12, 0.06, 0.14, '#f59e0b', 0, 0.82, 0.28, false));
        g.add(box(0.14, 0.05, 0.22, '#f59e0b', -0.1, 0.03, 0.08, false)); g.add(box(0.14, 0.05, 0.22, '#f59e0b', 0.1, 0.03, 0.08, false));
        scene.add(g); W.movers.push({ g, kind: 'peng', ph: Math.random() * 6 });
    };
    peng(-11, -2, 0.6); peng(-12.2, -3.1, 0.9); peng(-10.5, -4, 0.3); peng(-12.5, -1.2, 1.4);
    {
        const tv = new THREE.Group(); tv.position.set(-12, 0, -7); tv.rotation.y = Math.PI / 3; scene.add(tv);
        tv.add(box(0.15, 2.2, 0.15, '#374151', 0, 1.1, 0));
        tv.add(box(2.6, 1.6, 0.2, '#111827', 0, 2.8, 0));
        const scr = signBoard('PENGUEN BELGESELİ', '#f8fafc', '#1d4ed8', 2.3, 1.3); scr.position.set(0, 2.8, 0.11); tv.add(scr);
    }
    // Giriş tabelası
    { const s = signBoard('GEZİ PARKI', '#f8fafc', '#166534', 5, 1.1); s.position.set(0, 4.4, 6); s.rotation.y = Math.PI; scene.add(s);
      const s2 = s.clone(); s2.rotation.y = 0; s2.position.z = 6.02; scene.add(s2);
      scene.add(box(0.2, 5, 0.2, '#44403c', -2.6, 2.5, 6)); scene.add(box(0.2, 5, 0.2, '#44403c', 2.6, 2.5, 6)); }

    // AKM: pankartlarla kaplı büyük bina (meydanın arkasında)
    {
        const z = ARENA.z1 - 14;
        const facade = canvasTex(512, 160, (g, Wd, H) => {
            g.fillStyle = '#d6d3d1'; g.fillRect(0, 0, Wd, H);
            for (let y = 0; y < 5; y++) for (let x = 0; x < 32; x++) { g.fillStyle = '#334155'; g.fillRect(x * 16 + 2, y * 32 + 6, 12, 22); }
        });
        const m = new THREE.Mesh(new THREE.BoxGeometry(80, 20, 14), [mat('#a8a29e'), mat('#a8a29e'), mat('#78716c'), mat('#78716c'), new THREE.MeshLambertMaterial({ map: facade }), mat('#a8a29e')]);
        m.position.set(0, 10, z); scene.add(m);
        BANNERS.forEach(([txt, col], i) => {
            const t = canvasTex(256, 640, (g, Wd, H) => {
                g.fillStyle = '#f8fafc'; g.fillRect(0, 0, Wd, H); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
                g.save(); g.translate(Wd / 2, H / 2); g.rotate(-Math.PI / 2); fitText(g, txt, 0, 8, H - 40, 150); g.restore();
            });
            const b = new THREE.Mesh(new THREE.PlaneGeometry(5, 12.5), new THREE.MeshLambertMaterial({ map: t }));
            b.position.set(-27 + i * 18, 11, z + 7.05); scene.add(b);
        });
    }
}

// Her karede: fidanlar döner, bayrak dalgalanır, penguenler sallanır, barikat iner
export function updateWorld(W, dt, time) {
    W.items.forEach(it => {
        if (it.taken) return;
        it.mesh.rotation.y += dt * 1.6;
        it.mesh.position.y = it.baseY + 0.1 + Math.sin(time * 3 + it.pos.x) * 0.1;
    });
    W.movers.forEach(m => { if (m.kind === 'peng') m.g.rotation.z = Math.sin(time * 4 + m.ph) * 0.12; });
    if (W.checkpoint) W.checkpoint.cloth.rotation.y = Math.sin(time * 3) * 0.2;
    const b = W.barricade;
    if (b && b.open && b.t < 1) { b.t = Math.min(1, b.t + dt / 1.6); b.group.position.y = -4.2 * b.t; }
}
