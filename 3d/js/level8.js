// HIRHIZ 3D — 8. BÖLÜM: PENSİLVANYA (FETÖ: SON)
// Karlı Saylorsburg: kar yağar, çam ormanı, ahşap evler ve kırmızı ahır, çiftliğin çiti. Bol raf (iniş-çıkışlı merdivenler),
// av kulelerinde nişancılar. Polisler rüşvetle teslim alınır. Çiftlik kapısı açılınca canavar FETÖ: SON — kovalar, raflara zıplar.
// Yenilince mezara girer (outro.js graveOutro): "FETÖ öldü ve mezara girdi!"
import * as THREE from 'three';
import { G } from './state.js?v=24';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=24';
import { T1, T2, HW, ARENA, signBoard, entrySign } from './world.js?v=24';
import { spawnFeto } from './boss_feto.js?v=24';
import { graveOutro } from './outro.js?v=24';
import './police.js?v=24';

const STANDS = [-48, -118], STAND_X = 4.5, DECK = 2.6;

export const LEVEL8 = {
    id: 8, name: 'PENSİLVANYA', menuTitle: '8 · PENSİLVANYA',
    desc: 'Karlı Pensilvanya çiftliği! Rafları tırman, polisleri geç, FETÖ: SON\'u yen ve mezara gönder!',
    mission: 'FETÖ\'NÜN ÇİFTLİĞİNE GİR!',
    music: '../chiptune_level1.mp3',
    sky: ['#64748b', '#94a3b8', '#e2e8f0'], fog: '#cbd5e1', hemi: ['#f1f5f9', '#64748b', 1.5], sun: ['#f8fafc', 1.1],
    ground: { top: 'snow', side: 'dirt', arena: 'snow' }, outer: 'snow', outerRep: 4, pitFloor: '#e2e8f0',
    edge: { color: '#7c4a21', h: 0.9, w: 0.18 }, pitSign: 'BUZLU DERE',
    segs: [[10, -30], [-33.5, -64], [-67.5, -100], [-103.5, -138], [-141.5, -184]],
    // iniş-çıkışlı merdivenler (4. bölümden farklı başlangıç)
    shelves: [
        [-4, T1, -9, 3.5, 2.4], [-1, T2, -13.5, 3.5, 2.4], [2.5, T1, -18, 3.5, 2.4], [5, T2, -22.5, 3, 2.4],
        [-3, T1, -40, 4, 2.4], [1, T2, -45, 3.5, 2.4], [-3.5, T1, -56, 4, 2.4],
        [3, T1, -72, 4, 2.4], [-1, T2, -77, 3.5, 2.4], [-5, T1, -82, 3.5, 2.4], [2, T1, -93, 4, 2.4],
        [-4, T1, -108, 4, 2.4], [0, T2, -112.5, 3.5, 2.4], [4, T1, -128, 4, 2.4], [0, T2, -132.5, 3.5, 2.4],
        [-3, T1, -150, 4, 2.4], [1, T2, -155, 3.5, 2.4], [5, T1, -160, 3, 2.4], [-2, T1, -172, 4, 2.4],
        [-11, T1, -198, 5, 3], [11, T1, -204, 5, 3], [0, T2, -214, 4, 2.4], [-10, T1, -226, 5, 3], [10, T1, -226, 5, 3]
    ],
    solids: STANDS.map(z => [STAND_X - 1.1, DECK - 0.3, z - 1.1, STAND_X + 1.1, DECK, z + 1.1]),   // av kulelerinin platformu
    items: [
        ...[[-1, T2, -13.5], [5, T2, -22.5], [1, T2, -45], [STAND_X - 0.6, DECK, -47.6], [-1, T2, -77], [-5, 0, -96],
            [0, T2, -112.5], [STAND_X - 0.6, DECK, -117.6], [0, T2, -132.5], [1, T2, -155]].map(p => ['bag', ...p]),
        ['heart', -5, 0, -60], ['heart', 4, 0, -146]
    ],
    collect: { kind: 'bag', icon: '💰', name: 'Kul hakkı torbası', word: 'KUL HAKKI!' },
    brickRows: [[0, -28], [-3, -88], [3, -122], [-2, -166]],
    checkpointZ: -102,
    spawns: [
        ['police', 2, -26], ['riot', -2, -34],
        ['gas', 3, -50], ['police', -4, -60], ['sniper', STAND_X, STANDS[0] - 0.3, DECK],
        ['riot', 0, -74], ['police', 4, -86], ['gas', -3, -96],
        ['police', 3, -110], ['riot', -1, -124], ['sniper', STAND_X, STANDS[1] - 0.3, DECK],
        ['gas', 3, -142], ['police', -3, -158], ['riot', 2, -170], ['police', 0, -178]
    ],
    target: 11, cry: 'DOSYA KAPANDI!', ammo: 'bribe', ammoName: 'RÜŞVET',
    gateWho: 'POLİS', gateColor: '#7c2d12', gateOpen: '11 POLİS GEÇİLDİ! ÇİFTLİĞİN KAPISI AÇILDI — FETÖ\'YE GİT!',
    boss: (scene) => spawnFeto(scene, new THREE.Vector3(0, 0, -222), { son: true }),
    outro: (scene) => graveOutro(scene),
    wonTitle: 'BÖLÜM 8 TAMAM!', wonNote: 'FETÖ öldü ve mezara girdi! Sıra Edirne\'de: Selo içeri!',
    buildGate(g) {   // çiftliğin ahşap çiti ve kapısı, "PRIVATE PROPERTY" tabelaları
        for (let i = 0; i < 9; i++) g.add(box(0.22, 2.6, 0.22, '#5b3a1e', -HW + 0.4 + i * (HW * 2 - 0.8) / 8, 1.3, 0));
        [0.6, 1.4, 2.2].forEach(y => g.add(box(HW * 2, 0.18, 0.12, '#7c4a21', 0, y, 0.1)));
        [-1, 1].forEach(s => { const sg = signBoard('PRIVATE PROPERTY', '#fef2f2', '#991b1b', 2.6, 0.5); sg.position.set(s * 5, 1.9, 0.25); g.add(sg); });
        g.add(box(HW * 2, 0.1, 0.5, '#f8fafc', 0, 2.65, 0, false));   // çitin üstünde kar
    },
    decorate
};

function decorate(scene, W) {
    // Kar yağışı: kameranın çevresinde döner (sonsuz)
    const N = 700, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = rand(-30, 30); pos[i * 3 + 1] = rand(0, 22); pos[i * 3 + 2] = rand(-30, 30); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flakes = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.13, transparent: true, opacity: 0.9, depthWrite: false, map: canvasTex(16, 16, (g) => { const r = g.createRadialGradient(8, 8, 0, 8, 8, 8); r.addColorStop(0, '#fff'); r.addColorStop(0.6, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 16, 16); }) }));
    flakes.frustumCulled = false; scene.add(flakes);
    W.movers.push((dt, t) => {
        const c = G.camera.position, cx = c.x, cz = c.z;
        for (let i = 0; i < N; i++) {
            let y = pos[i * 3 + 1] - dt * 1.6; if (y < 0) y += 22;
            let x = pos[i * 3] + Math.sin(t + i) * dt * 0.3, z = pos[i * 3 + 2];
            if (x < cx - 30) x += 60; else if (x > cx + 30) x -= 60;
            if (z < cz - 30) z += 60; else if (z > cz + 30) z -= 60;
            pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        }
        sg.attributes.position.needsUpdate = true;
    });
    // Çam ormanı (InstancedMesh: gövde + iki koni + karlı tepe)
    const trees = [];
    for (let z = 14; z > -300; z -= 5) [-1, 1].forEach(s => {
        const arena = z < ARENA.z0 + 4, edge = arena ? ARENA.hw : HW;
        if (Math.random() < 0.8) trees.push([s * (edge + rand(2, 9)), z + rand(-2, 2), rand(0.8, 1.4)]);
        if (Math.random() < 0.6) trees.push([s * (edge + rand(10, 30)), z + rand(-2, 2), rand(1, 1.8)]);
    });
    for (let x = -ARENA.hw; x < ARENA.hw; x += 4) trees.push([x + rand(-1, 1), ARENA.z1 - rand(4, 8), rand(1, 1.6)]);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), mat('#5b3a1e'), trees.length);
    const c1 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.5, 2.6, 8), mat('#14532d'), trees.length);
    const c2 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.1, 2.2, 8), mat('#166534'), trees.length);
    const sn = new THREE.InstancedMesh(new THREE.ConeGeometry(0.6, 0.9, 8), mat('#f8fafc'), trees.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
    trees.forEach(([x, z, s], i) => {
        M.compose(P.set(x, 0.8 * s, z), Q, S.set(s, s, s)); trunk.setMatrixAt(i, M);
        M.compose(P.set(x, 2.6 * s, z), Q, S.set(s, s, s)); c1.setMatrixAt(i, M);
        M.compose(P.set(x, 3.9 * s, z), Q, S.set(s, s, s)); c2.setMatrixAt(i, M);
        M.compose(P.set(x, 4.75 * s, z), Q, S.set(s, s, s)); sn.setMatrixAt(i, M);
    });
    scene.add(trunk, c1, c2, sn);
    // Ahşap evler (karlı çatı, sarı pencereler) ve kırmızı ahır
    const logTex = canvasTex(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#7c4a21' : '#6b3f1d'; g.fillRect(0, i * 8, 64, 8); } g.fillStyle = '#fde68a'; g.fillRect(20, 20, 14, 14); g.fillStyle = '#5b3a1e'; g.fillRect(26, 20, 2, 14); g.fillRect(20, 26, 14, 2); }, { repeat: [1, 1], pixel: true });
    const house = (x, z, w, d, h, rot, barn) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
        const t = logTex.clone(); t.repeat.set(w / 3, h / 3); t.needsUpdate = true;
        const wallM = barn ? mat('#991b1b') : new THREE.MeshLambertMaterial({ map: t });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM); b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
        const r = (d / 2 + 0.4) / 0.866, rg = new THREE.CylinderGeometry(r, r, w + 0.6, 3, 1);
        rg.rotateX(-Math.PI / 2); rg.rotateY(Math.PI / 2);   // üçgen prizma: ekseni x boyunca, bir köşesi yukarıda
        const roof = new THREE.Mesh(rg, mat('#e2e8f0')); roof.scale.y = 0.45; roof.position.y = h + r * 0.5 * 0.45; roof.castShadow = true; g.add(roof);
        if (barn) { g.add(box(w * 0.4, h * 0.6, 0.1, '#f8fafc', 0, h * 0.3, d / 2 + 0.05, false)); g.add(box(0.15, h * 0.6, 0.12, '#991b1b', 0, h * 0.3, d / 2 + 0.07, false)); }
        else g.add(box(0.8, 3, 0.8, '#57534e', w * 0.3, h + 1, 0, false));   // baca
    };
    for (let z = 4; z > ARENA.z0; z -= 24) {
        house(HW + rand(7, 11), z - rand(0, 6), rand(7, 10), 6, rand(3.5, 5), rand(-0.3, 0.3), Math.random() < 0.3);
        house(-HW - rand(7, 11), z - 12 - rand(0, 6), rand(7, 10), 6, rand(3.5, 5), rand(-0.3, 0.3), Math.random() < 0.3);
    }
    // Çiftliğin ana binası (meydanın arkasında): "GOLDEN GENERATION RETREAT CENTER"
    {
        const z = ARENA.z1 - 14;
        house(0, z, 30, 10, 7, 0, false);
        const s = signBoard('GOLDEN GENERATION RETREAT CENTER', '#fef3c7', '#14532d', 16, 1.4); s.position.set(0, 8.6, z + 5.2); scene.add(s);
        house(-24, z + 4, 12, 8, 6, 0.3, true);
    }
    // Av kuleleri (üstünde nişancı; platforma zıplanır)
    STANDS.forEach(z => {
        [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([dx, dz]) => scene.add(box(0.16, DECK - 0.3, 0.16, '#5b3a1e', STAND_X + dx, (DECK - 0.3) / 2, z + dz)));
        scene.add(box(2.2, 0.3, 2.2, '#7c4a21', STAND_X, DECK - 0.15, z));
        scene.add(box(2.5, 0.12, 2.5, '#f8fafc', STAND_X, DECK + 1.9, z, false));
        [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]].forEach(([dx, dz]) => scene.add(box(0.08, 1.9, 0.08, '#5b3a1e', STAND_X + dx, DECK + 0.95, z + dz, false)));
        const sign = signBoard('AV KULESİ', '#f8fafc', '#5b3a1e', 1.8, 0.4); sign.position.set(STAND_X, DECK + 0.45, z + 1.12); scene.add(sign);
    });
    // Posta kutuları ve tabelalar
    [[HW + 1.2, -4], [-HW - 1.2, -66], [HW + 1.2, -140]].forEach(([x, z]) => {
        scene.add(box(0.1, 1.1, 0.1, '#5b3a1e', x, 0.55, z));
        scene.add(box(0.3, 0.3, 0.55, '#1f2937', x, 1.25, z)); scene.add(box(0.05, 0.25, 0.04, '#dc2626', x + 0.17, 1.4, z + 0.15, false));
    });
    const road = signBoard('SAYLORSBURG, PA', '#f8fafc', '#166534', 3.6, 0.8); road.position.set(-HW - 2, 2.2, -20); road.rotation.y = Math.PI / 2 * 0.7; scene.add(road);
    scene.add(box(0.12, 2, 0.12, '#9ca3af', -HW - 2, 1, -20));
    entrySign(scene, 'PENSİLVANYA', '#14532d');
}
