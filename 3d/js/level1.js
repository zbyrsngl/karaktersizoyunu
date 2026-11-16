// HIRHIZ 3D — 1. BÖLÜM: GEZİ PARKI (Mayıs-Haziran 2013)
// Topçu Kışlası inşaatı çukurları, çınar fidanları, baret + maske, Gezi kahramanları (gezi.js), Duran Adam,
// barikat (11 kişi yenilince iner), canavar TOMA (boss_toma.js); arkada pankartlı AKM, penguenler.
import * as THREE from 'three';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=21';
import { T1, T2, HW, ARENA, banner, signBoard, entrySign } from './world.js?v=21';
import { spawnToma } from './boss_toma.js?v=21';
import { grannyOutro } from './outro.js?v=21';
import './gezi.js?v=21';

const BANNERS = [['ÇAPULCU', '#dc2626'], ['HER YER TAKSİM', '#111827'], ['DİREN GEZİ', '#16a34a'], ['ÇAPULCUYUZ', '#7c3aed']];

export const LEVEL1 = {
    id: 1, name: 'GEZİ PARKI', menuTitle: '1 · GEZİ PARKI',
    desc: "11 kişiyi yen, barikatı aç, TOMA'nın üstüne zıpla!",
    mission: "11 ÇAPULCUYU YEN, TOMA'YI DURDUR!",
    music: '../chiptune_level1.mp3',
    sky: ['#5b9bd5', '#a9cdee', '#e8f1f8'], fog: '#d4e6f5', hemi: ['#e0efff', '#55743a', 1.4], sun: ['#fff4e0', 2.4],
    ground: { top: 'pave', side: 'dirt', arena: 'pave' }, outer: 'grass', pitFloor: '#3b2a1a',
    edge: { color: '#2f5d1f', h: 0.9, w: 0.8 }, pitSign: 'TOPÇU KIŞLASI İNŞAATI',
    segs: [[10, -36], [-39.5, -70], [-73.5, -126], [-129.5, -158], [-161.5, -184]],
    shelves: [
        [-3.5, T1, -12, 4, 2.4], [1.5, T2, -17, 3.5, 2.4], [4, T1, -28, 4, 2.4],
        [-4, T1, -47, 4, 2.4], [3, T1, -60, 4, 2.4], [3, T2, -64.5, 3.5, 2.4],
        [0, T1, -80, 5, 2.4], [-4, T2, -85, 4, 2.4], [4, T1, -104, 4, 2.4], [-3, T1, -115, 4, 2.4], [2, T2, -120, 4, 2.4],
        [-3, T1, -136, 4, 2.4], [3, T1, -150, 4, 2.4], [0, T1, -170, 4, 2.4],
        [-11, T1, -200, 5, 3], [11, T1, -222, 5, 3]
    ],
    items: [
        ...[[-3.5, T1, -12], [1.5, T2, -17], [-5, 0, -33], [3, T2, -64.5], [-4, T2, -85], [5, 0, -95],
            [2, T2, -120], [-3, T1, -136], [6, 0, -155], [0, T1, -170]].map(p => ['fidan', ...p]),
        ...[[5, 0, -44], [-6, 0, -100], [5, 0, -165]].map(p => ['mask', ...p])
    ],
    collect: { kind: 'fidan', icon: '🌱', name: 'Çınar fidanı', word: 'ÇINAR!' },
    brickRows: [[0, -24], [-4, -92], [3, -145]],
    checkpointZ: -96,
    spawns: [
        ['carsi', 2, -22], ['kirmizi', -3, -31],
        ['sema', 0, -46], ['tencere', 3, -55], ['capulcu', -4, -63],
        ['carsi', -3, -82], ['kirmizi', 4, -90], ['tencere', 0, -101], ['sema', -4, -109], ['capulcu', 4, -118],
        ['tencere', 0, -138], ['carsi', -4, -146], ['kirmizi', 4, -152],
        ['sema', -3, -167], ['capulcu', 3, -176],
        ['duran', 5, -50], ['duran', -5, -143]
    ],
    target: 11, cry: 'ÇAPULCU!', ammo: 'tea', ammoName: 'ÇAY AT',
    gateWho: 'KİŞİ', gateColor: '#7f1d1d', gateOpen: "11 KİŞİ TAMAM! BARİKAT AÇILDI — TOMA'YA GİT!",
    boss: (scene) => spawnToma(scene, new THREE.Vector3(0, 0, -222)),
    outro: (scene) => grannyOutro(scene),   // 2D'deki gibi başörtülü teyzeler koşarak gelir
    wonTitle: 'BÖLÜM 1 TAMAM!', wonNote: 'Park boşaltıldı, TOMA sustu!',
    buildGate(g) {   // taş, kasa ve lastikten barikat
        for (let i = 0; i < 9; i++) {
            const x = -HW + 1 + i * 1.75;
            g.add(box(1.6, 1.0, 0.8, ['#78716c', '#57534e', '#a8a29e'][i % 3], x, 0.5, 0));
            g.add(box(1.2, 0.9, 0.7, ['#57534e', '#a8a29e', '#78716c'][i % 3], x + 0.3, 1.45, 0.05));
            const tire = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.15, 6, 10), mat('#1c1917'));
            tire.position.set(x - 0.2, 2.15, 0); g.add(tire);
        }
        g.add(box(16, 0.15, 0.15, '#9ca3af', 0, 3.2, 0));
    },
    decorate
};

function decorate(scene, W) {
    // Çınar ağaçları: gövde + yaprak kümeleri (InstancedMesh)
    const spots = [];
    for (let z = 20; z > -300; z -= 6) {
        const edge = z < ARENA.z0 ? ARENA.hw : HW;
        [-1, 1].forEach(s => {
            if (Math.random() < 0.85) spots.push([s * rand(edge + 2.5, edge + 6), z + rand(-2, 2), rand(0.9, 1.3)]);
            if (Math.random() < 0.6) spots.push([s * rand(edge + 9, edge + 28), z + rand(-3, 3), rand(1, 1.5)]);
        });
    }
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 4, 6), mat('#a8a29e'), spots.length);
    const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.8, 0), mat('#3f7d2a', { flatShading: true }), spots.length * 3);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, s], i) => {
        M.compose(P.set(x, 2 * s, z), Q.identity(), S.set(s, s, s)); trunks.setMatrixAt(i, M);
        for (let k = 0; k < 3; k++) {
            const a = k * 2.1 + i;
            M.compose(P.set(x + Math.cos(a) * 0.9 * s, (4.2 + k * 0.6) * s, z + Math.sin(a) * 0.9 * s), Q.setFromAxisAngle(UP, a), S.setScalar(s * (1 - k * 0.15)));
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
    // Penguenler ve "PENGUEN BELGESELİ" yayını yapan televizyon
    const peng = (x, z, r) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r;
        const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.4, 4, 8), mat('#111827')); b.position.y = 0.5; g.add(b);
        g.add(box(0.3, 0.45, 0.1, '#f8fafc', 0, 0.45, 0.2, false));
        g.add(box(0.12, 0.06, 0.14, '#f59e0b', 0, 0.82, 0.28, false));
        g.add(box(0.14, 0.05, 0.22, '#f59e0b', -0.1, 0.03, 0.08, false)); g.add(box(0.14, 0.05, 0.22, '#f59e0b', 0.1, 0.03, 0.08, false));
        scene.add(g);
        const ph = Math.random() * 6;
        W.movers.push((dt, t) => { g.rotation.z = Math.sin(t * 4 + ph) * 0.12; });
    };
    peng(-11, -2, 0.6); peng(-12.2, -3.1, 0.9); peng(-10.5, -4, 0.3); peng(-12.5, -1.2, 1.4);
    {
        const tv = new THREE.Group(); tv.position.set(-12, 0, -7); tv.rotation.y = Math.PI / 3; scene.add(tv);
        tv.add(box(0.15, 2.2, 0.15, '#374151', 0, 1.1, 0));
        tv.add(box(2.6, 1.6, 0.2, '#111827', 0, 2.8, 0));
        const scr = signBoard('PENGUEN BELGESELİ', '#f8fafc', '#1d4ed8', 2.3, 1.3); scr.position.set(0, 2.8, 0.11); tv.add(scr);
    }
    entrySign(scene, 'GEZİ PARKI', '#166534');

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
