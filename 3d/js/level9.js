// HIRHIZ 3D — 9. BÖLÜM: SELO İÇERİ! (Edirne F tipi cezaevi)
// Gün batımında cezaevi avlusu: iki yanda dikenli telli yüksek beton duvarlar, gözetleme kulelerinde dönen projektörler
// (kulelerde nişancı), uzakta Selimiye'nin dört minaresi. 11 polis → demir kapı → canavar SELO (boss_human.js).
// Yenilince hücre parmaklığı iner: "AİHM: DERHAL SERBEST BIRAKIN!" — HIRHIZ: "TANIMIYORUZ!"
import * as THREE from 'three';
import { box, mat, canvasTex, rand } from './util.js?v=20';
import { T1, T2, HW, ARENA, signBoard, entrySign } from './world.js?v=20';
import { spawnSelo, seloJail } from './boss_human.js?v=20';
import './police.js?v=20';

const TOWERS = [-50, -120], TOWER_X = -4.5, DECK = 2.8;

export const LEVEL9 = {
    id: 9, name: 'SELO İÇERİ!', menuTitle: '9 · SELO',
    desc: 'Edirne F tipi cezaevi! Polisleri geç, SELO\'yu yen ve hücreye tık. AİHM kararları yağınca kalkanı kaldır!',
    mission: 'SELO\'YU İÇERİ AT!',
    music: '../bozkir_dortnal.mp3',
    sky: ['#1e293b', '#7c5a7a', '#fcd34d'], fog: '#a98a86', hemi: ['#fde7c7', '#475569', 1.3], sun: ['#fdba74', 1.5],
    ground: { top: 'slabs', side: 'concrete', arena: 'slabs' }, outer: 'concrete', outerRep: 3, pitFloor: '#292524',
    edge: { color: '#a8a29e', h: 0.7, w: 0.35 }, pitSign: 'KANALİZASYON',
    segs: [[10, -36], [-39.5, -70], [-73.5, -106], [-109.5, -142], [-145.5, -184]],
    shelves: [
        [3.5, T1, -12, 4, 2.4], [-1, T2, -17, 3.5, 2.4], [-4, T1, -28, 4, 2.4],
        [3, T1, -46, 4, 2.4], [-1.5, T2, -51, 3.5, 2.4], [3, T1, -62, 4, 2.4],
        [-3, T1, -80, 4, 2.4], [1.5, T2, -85, 3.5, 2.4], [5, T1, -96, 3.5, 2.4],
        [3, T1, -116, 4, 2.4], [-1, T2, -121, 3, 2.4], [-3, T1, -134, 4, 2.4],
        [3, T1, -152, 4, 2.4], [-1, T2, -157, 3.5, 2.4], [-4, T1, -170, 4, 2.4],
        [-11, T1, -200, 5, 3], [11, T1, -222, 5, 3]
    ],
    solids: TOWERS.map(z => [TOWER_X - 1.1, DECK - 0.3, z - 1.1, TOWER_X + 1.1, DECK, z + 1.1]),   // gözetleme kulelerinin platformu
    items: [
        ...[[-1, T2, -17], [-4, T1, -28], [TOWER_X + 0.6, DECK, -49.6], [-1.5, T2, -51], [1.5, T2, -85], [5, T1, -96],
            [TOWER_X + 0.6, DECK, -119.6], [-1, T2, -121], [-1, T2, -157], [5, 0, -176]].map(p => ['bag', ...p]),
        ['heart', 5, 0, -66], ['heart', -5, 0, -148]
    ],
    collect: { kind: 'bag', icon: '💰', name: 'Kul hakkı torbası', word: 'KUL HAKKI!' },
    brickRows: [[0, -24], [3, -102], [0, -164]],
    checkpointZ: -106,
    spawns: [
        ['police', 2, -22], ['riot', -2, -32],
        ['gas', 3, -44], ['police', -3, -58], ['sniper', TOWER_X, TOWERS[0] - 0.3, DECK],
        ['riot', 0, -78], ['police', 4, -90], ['gas', -3, -100],
        ['police', 3, -112], ['riot', 0, -130], ['sniper', TOWER_X, TOWERS[1] - 0.3, DECK],
        ['gas', -3, -150], ['police', 3, -162], ['riot', 0, -174]
    ],
    target: 11, cry: 'DOSYA KAPANDI!', ammo: 'bribe', ammoName: 'RÜŞVET',
    gateWho: 'POLİS', gateColor: '#1e3a8a', gateOpen: '11 POLİS GEÇİLDİ! CEZAEVİ KAPISI AÇILDI — SELO\'YA GİT!',
    boss: (scene) => spawnSelo(scene, new THREE.Vector3(0, 0, -222)),
    outro: (scene) => seloJail(scene),
    wonTitle: 'BÖLÜM 9 TAMAM!', wonNote: 'Selo içeride! AİHM kararı mı? Tanımıyoruz! Sıra İstanbul\'da: Ekrem!',
    buildGate(g) {   // demir parmaklıklı cezaevi kapısı
        g.add(box(HW * 2 + 1, 0.4, 0.5, '#374151', 0, 4.2, 0));
        for (let i = 0; i <= 26; i++) { const x = -HW + i * (HW * 2) / 26; const r = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 6), mat('#4b5563')); r.position.set(x, 2.1, 0); g.add(r); }
        [0.4, 2.1].forEach(y => g.add(box(HW * 2, 0.14, 0.14, '#374151', 0, y, 0)));
        const s = signBoard('F TİPİ CEZAEVİ', '#f8fafc', '#1e3a8a', 4.5, 0.7); s.position.set(0, 4.8, 0.3); g.add(s);
    },
    decorate
};

function decorate(scene, W) {
    // Yüksek cezaevi duvarları: beton paneller, üstünde dikenli tel bobinleri (yolun iki yanında)
    const wallTex = canvasTex(64, 64, (g) => { g.fillStyle = '#b8b2aa'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#9c968e'; g.fillRect(0, 0, 2, 64); for (let i = 0; i < 60; i++) { g.fillStyle = i % 2 ? '#aaa49c' : '#c4beb6'; g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 2, 2); } }, { repeat: [1, 1], pixel: true });
    const coilG = new THREE.TorusGeometry(0.3, 0.025, 4, 10), coilM = mat('#1c1917');
    const coils = [];
    const wallRun = (x, z0, z1, h) => {
        const len = z0 - z1, t = wallTex.clone(); t.repeat.set(len / 4, h / 4); t.needsUpdate = true;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, h, len), new THREE.MeshLambertMaterial({ map: t })); m.position.set(x, h / 2, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
        scene.add(box(0.8, 0.25, len, '#78716c', x, h + 0.12, (z0 + z1) / 2, false));
        for (let z = z0; z > z1; z -= 0.55) coils.push([x, h + 0.55, z]);
    };
    wallRun(HW + 6, 14, ARENA.z0 + 2, 5); wallRun(-HW - 6, 14, ARENA.z0 + 2, 5);
    wallRun(ARENA.hw + 5, ARENA.z0 + 2, ARENA.z1 - 8, 6); wallRun(-ARENA.hw - 5, ARENA.z0 + 2, ARENA.z1 - 8, 6);
    const ci = new THREE.InstancedMesh(coilG, coilM, coils.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), E = new THREE.Euler();
    coils.forEach(([x, y, z], i) => { M.compose(P.set(x, y, z), Q.setFromEuler(E.set(0, Math.PI / 2, 0)), S); ci.setMatrixAt(i, M); });
    scene.add(ci);
    // Arka duvar: koğuş binası (dar pencereli), "EDİRNE F TİPİ"
    {
        const z = ARENA.z1 - 8;
        const win = canvasTex(64, 64, (g) => { g.fillStyle = '#d6d3d1'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1c1917'; g.fillRect(26, 14, 12, 30); g.fillStyle = '#57534e'; for (let i = 0; i < 3; i++) g.fillRect(28 + i * 4, 14, 1, 30); }, { repeat: [14, 3], pixel: true });
        const b = new THREE.Mesh(new THREE.BoxGeometry(ARENA.hw * 2 + 10, 12, 8), [mat('#d6d3d1'), mat('#d6d3d1'), mat('#a8a29e'), mat('#a8a29e'), new THREE.MeshLambertMaterial({ map: win }), mat('#d6d3d1')]);
        b.position.set(0, 6, z - 4); scene.add(b);
        const s = signBoard('EDİRNE F TİPİ YÜKSEK GÜVENLİKLİ CEZAEVİ', '#f8fafc', '#1e3a8a', 18, 1.5); s.position.set(0, 10, z + 0.1); scene.add(s);
    }
    // Gözetleme kuleleri: beton gövde, cam kabin, dönen projektör ışığı (ilk ikisinde nişancı platformu)
    const beamM = new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const beamG = new THREE.ConeGeometry(2.6, 14, 16, 1, true); beamG.translate(0, -7, 0);
    const tower = (x, z, h) => {
        scene.add(box(1.4, h, 1.4, '#78716c', x, h / 2, z));
        scene.add(box(2.6, 1.6, 2.6, '#44403c', x, h + 0.8, z));
        scene.add(box(2.4, 0.9, 2.62, '#fde68a', x, h + 0.9, z, false));
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.2, 4), mat('#292524')); roof.rotation.y = Math.PI / 4; roof.position.set(x, h + 2.2, z); scene.add(roof);
        const beam = new THREE.Mesh(beamG, beamM); beam.position.set(x, h + 1, z); scene.add(beam);
        const ph = rand(0, 6);
        W.movers.push((dt, t) => { beam.rotation.set(0.9 + Math.sin(t * 0.5 + ph) * 0.25, t * 0.6 + ph, 0, 'YXZ'); });
    };
    for (let z = -10; z > ARENA.z0; z -= 45) { tower(HW + 9, z, 7); tower(-HW - 9, z - 22, 7); }
    [[-ARENA.hw - 6, ARENA.z1 + 2], [ARENA.hw + 6, ARENA.z1 + 2]].forEach(([x, z]) => tower(x, z, 9));
    TOWERS.forEach(z => {   // nişancı platformları (yolun içinde, alçak)
        [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([dx, dz]) => scene.add(box(0.18, DECK - 0.3, 0.18, '#57534e', TOWER_X + dx, (DECK - 0.3) / 2, z + dz)));
        scene.add(box(2.2, 0.3, 2.2, '#44403c', TOWER_X, DECK - 0.15, z));
        [[-1.05, 0], [1.05, 0]].forEach(([dx]) => scene.add(box(0.08, 1, 2.2, '#57534e', TOWER_X + dx, DECK + 0.5, z, false)));
        const sign = signBoard('NÖBET', '#f8fafc', '#1e3a8a', 1.4, 0.4); sign.position.set(TOWER_X, DECK + 0.45, z + 1.12); scene.add(sign);
    });
    // Uzakta Selimiye: büyük kubbe, yan kubbeler, dört ince minare (siluet)
    {
        const g = new THREE.Group(); g.position.set(55, 0, -260); g.rotation.y = -0.5; scene.add(g);
        const sil = new THREE.MeshBasicMaterial({ color: '#57536b', fog: false });
        const body = new THREE.Mesh(new THREE.BoxGeometry(40, 14, 40), sil); body.position.y = 7; g.add(body);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(15, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), sil); dome.position.y = 14; g.add(dome);
        [[-14, -14], [14, -14], [-14, 14], [14, 14]].forEach(([x, z]) => {
            const d = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), sil); d.position.set(x, 14, z); g.add(d);
            const mn = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 62, 8), sil); mn.position.set(x * 1.6, 31, z * 1.6); g.add(mn);
            const tip = new THREE.Mesh(new THREE.ConeGeometry(1.1, 7, 8), sil); tip.position.set(x * 1.6, 65.5, z * 1.6); g.add(tip);
            [36, 48].forEach(y => { const r = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.8, 8), sil); r.position.set(x * 1.6, y, z * 1.6); g.add(r); });
        });
        const alem = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 5, 6), sil); alem.position.y = 31.5; g.add(alem);
    }
    // Avluda bank, çöp kovası, "ZİYARETÇİ GİRİŞİ" tabelası
    [[HW - 1.2, -40], [-HW + 1.2, -88], [HW - 1.2, -136]].forEach(([x, z]) => { scene.add(box(0.5, 0.45, 2, '#57534e', x, 0.22, z)); scene.add(box(0.5, 0.06, 2, '#78350f', x, 0.48, z)); });
    const vis = signBoard('ZİYARETÇİ GİRİŞİ YASAKTIR', '#fef2f2', '#991b1b', 4.4, 0.7); vis.position.set(HW + 5.65, 2.6, -16); vis.rotation.y = -Math.PI / 2; scene.add(vis);
    entrySign(scene, 'EDİRNE', '#1e3a8a');
}
