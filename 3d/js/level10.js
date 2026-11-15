// HIRHIZ 3D — 10. BÖLÜM: EKREM (Saraçhane gecesi)
// İBB binasının önü: telefon ışıkları yanan kalabalık, bayraklar, uzakta Bozdoğan Kemeri ve Şehzade Camii; çevik kuvvet
// otobüslerinin üstünde nişancılar. 11 polis → bariyer → canavar EKREM (boss_human.js). İlk yenilgide "YSK: SEÇİM İPTAL!",
// SEÇİM TEKRARI ile büyüyüp geri gelir; ikinci kez yenilince diploma iptal, Silivri hücresi: "15 MİLYON OY: ADAY!" — HIRHIZ: "ADAY OLAMAZ!"
import * as THREE from 'three';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=16';
import { T1, T2, HW, ARENA, signBoard, entrySign } from './world.js?v=16';
import { spawnEkrem, ekremJail } from './boss_human.js?v=16';
import './police.js?v=16';

const BUSES = [[4.5, -54], [-4.5, -124]], BUS_TOP = 3.0;

export const LEVEL10 = {
    id: 10, name: 'EKREM', menuTitle: '10 · EKREM',
    desc: 'Saraçhane gecesi! Polisleri geç, EKREM\'i iki kez yen: seçim iptal, seçim tekrarı, sonra Silivri!',
    mission: 'SARAÇHANE\'DEN GEÇ, EKREM\'İ DURDUR!',
    music: '../chiptune_level3.mp3',
    sky: ['#020617', '#111a3a', '#3b0764'], fog: '#1e1b4b', hemi: ['#c7d2fe', '#1e1b4b', 1.2], sun: ['#e0e7ff', 1.3],
    ground: { top: 'cobble', side: 'concrete', arena: 'slabs' }, outer: 'cobble', outerRep: 3, pitFloor: '#0b1020',
    edge: { color: '#9ca3af', h: 1.0, w: 0.12 }, pitSign: 'METRO İNŞAATI',
    segs: [[10, -32], [-35.5, -68], [-71.5, -102], [-105.5, -140], [-143.5, -184]],
    shelves: [
        [-3.5, T1, -10, 4, 2.4], [1, T2, -15, 3.5, 2.4], [4.5, T1, -20, 3.5, 2.4], [-3, T1, -27, 4, 2.4],
        [-3, T1, -42, 4, 2.4], [1, T2, -47, 3.5, 2.4], [-4, T1, -62, 4, 2.4],
        [3, T1, -78, 4, 2.4], [-1, T2, -83, 3.5, 2.4], [-4, T1, -94, 4, 2.4],
        [3, T1, -112, 4, 2.4], [-3, T1, -134, 4, 2.4],
        [3, T1, -150, 4, 2.4], [-1, T2, -155, 3.5, 2.4], [-4.5, T1, -160, 3, 2.4], [2, T1, -172, 4, 2.4],
        [-11, T1, -200, 5, 3], [11, T1, -222, 5, 3]
    ],
    // çevik kuvvet otobüsleri: üstlerine çıkılır, damda nişancı
    solids: BUSES.map(([x, z]) => [x - 1.2, 0, z - 4.5, x + 1.2, BUS_TOP, z + 4.5, 'solid']),
    items: [
        ...[[1, T2, -15], [4.5, T1, -20], [1, T2, -47], [BUSES[0][0], BUS_TOP, BUSES[0][1] + 3], [-1, T2, -83], [-5, 0, -98],
            [BUSES[1][0], BUS_TOP, BUSES[1][1] + 3], [-3, T1, -134], [-1, T2, -155], [5, 0, -178]].map(p => ['bag', ...p]),
        ['heart', 5, 0, -66], ['heart', -5, 0, -146]
    ],
    collect: { kind: 'bag', icon: '💰', name: 'Kul hakkı torbası', word: 'KUL HAKKI!' },
    brickRows: [[0, -36], [-3, -106], [3, -164]],
    checkpointZ: -104,
    spawns: [
        ['police', -2, -22], ['riot', 2, -32],
        ['gas', -3, -46], ['police', 0, -60], ['sniper', BUSES[0][0], BUSES[0][1] - 1, BUS_TOP],
        ['riot', 0, -76], ['police', 4, -88], ['gas', -2, -100],
        ['police', 3, -112], ['riot', 0, -132], ['sniper', BUSES[1][0], BUSES[1][1] - 1, BUS_TOP],
        ['gas', 3, -148], ['police', -3, -162], ['riot', 0, -176], ['police', 4, -180]
    ],
    target: 11, cry: 'DOSYA KAPANDI!', ammo: 'bribe', ammoName: 'RÜŞVET',
    gateWho: 'POLİS', gateColor: '#1e3a8a', gateOpen: '11 POLİS GEÇİLDİ! BARİYER AÇILDI — EKREM\'E GİT!',
    boss: (scene) => spawnEkrem(scene, new THREE.Vector3(0, 0, -222)),
    outro: (scene) => ekremJail(scene),
    wonTitle: 'BÖLÜM 10 TAMAM!', wonNote: 'Seçim iptal, seçim tekrarı, diploma iptal... ve Silivri. Ama 15 milyon oy hâlâ ortada!',
    buildGate(g) {   // polis bariyerleri
        for (let i = 0; i < 8; i++) {
            const x = -HW + 1 + i * 2;
            g.add(box(1.9, 0.08, 0.08, '#e5e7eb', x, 1.0, 0)); g.add(box(1.9, 0.08, 0.08, '#e5e7eb', x, 0.25, 0));
            for (let k = 0; k < 6; k++) g.add(box(0.03, 0.75, 0.03, '#e5e7eb', x - 0.8 + k * 0.32, 0.62, 0, false));
            g.add(box(0.5, 0.06, 0.4, '#9ca3af', x - 0.8, 0.03, 0)); g.add(box(0.5, 0.06, 0.4, '#9ca3af', x + 0.8, 0.03, 0));
        }
        const s = signBoard('POLİS — GEÇİLMEZ', '#f8fafc', '#1e3a8a', 4.5, 0.7); s.position.set(0, 2.4, 0.2); g.add(s);
        [-1, 1].forEach(sd => { g.add(box(0.12, 2.6, 0.12, '#374151', sd * 2.4, 1.3, 0.1)); });
    },
    decorate
};

function decorate(scene, W) {
    // Yıldızlar ve hilal
    const starG = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < 400; i++) { const a = Math.random() * Math.PI * 2, e = 0.2 + Math.random() * 1.1, r = 140; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r - 80); }
    starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: '#e0e7ff', size: 0.6, fog: false })));
    const moon = new THREE.Mesh(new THREE.CircleGeometry(4, 24), new THREE.MeshBasicMaterial({ color: '#fef9c3', fog: false })); moon.position.set(60, 50, -150); moon.lookAt(0, 0, -60); scene.add(moon);
    // Bozdoğan Kemeri (solda, uzakta): iki katlı taş kemerler (kemer boşlukları saydam doku)
    {
        const tex = canvasTex(1024, 192, (g, Wd, H) => {
            g.fillStyle = '#9a8f80'; g.fillRect(0, 0, Wd, H);
            for (let i = 0; i < 300; i++) { g.fillStyle = i % 2 ? '#8a7f70' : '#a89d8e'; g.fillRect(Math.random() * Wd, Math.random() * H, 6, 3); }
            g.globalCompositeOperation = 'destination-out';
            for (let x = 0; x < Wd; x += 64) {
                g.beginPath(); g.moveTo(x + 12, H); g.lineTo(x + 12, 120); g.arc(x + 32, 120, 20, Math.PI, 0); g.lineTo(x + 52, H); g.fill();          // alt kat
                g.beginPath(); g.moveTo(x + 16, 92); g.lineTo(x + 16, 52); g.arc(x + 32, 52, 16, Math.PI, 0); g.lineTo(x + 48, 92); g.fill();          // üst kat
            }
        });
        const aq = new THREE.Mesh(new THREE.PlaneGeometry(200, 24), new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
        aq.position.set(-62, 12, -130); aq.rotation.y = Math.PI / 2; scene.add(aq);
    }
    // Şehzade Camii (sağda, uzakta) siluet
    {
        const sil = new THREE.MeshBasicMaterial({ color: '#2e2a5a', fog: false });
        const g = new THREE.Group(); g.position.set(70, 0, -230); scene.add(g);
        const body = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 34), sil); body.position.y = 6; g.add(body);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(12, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), sil); dome.position.y = 12; g.add(dome);
        [-1, 1].forEach(s => { const mn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 46, 8), sil); mn.position.set(s * 20, 23, 18); g.add(mn); const tip = new THREE.Mesh(new THREE.ConeGeometry(1, 6, 8), sil); tip.position.set(s * 20, 49, 18); g.add(tip); });
    }
    // İBB binası (meydanın arkasında): uzun modern blok, ışıklı pencereler, tabela
    {
        const z = ARENA.z1 - 12;
        const win = canvasTex(64, 64, (g) => { g.fillStyle = '#1e293b'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = Math.random() < 0.6 ? '#fde68a' : '#334155'; g.fillRect(x * 16 + 2, y * 16 + 3, 12, 10); } }, { repeat: [12, 4], pixel: true });
        const b = new THREE.Mesh(new THREE.BoxGeometry(56, 16, 12), [mat('#cbd5e1'), mat('#cbd5e1'), mat('#94a3b8'), mat('#94a3b8'), new THREE.MeshLambertMaterial({ map: win }), mat('#cbd5e1')]);
        b.position.set(0, 9, z); scene.add(b);
        scene.add(box(56, 1, 12, '#64748b', 0, 0.5, z, false));
        for (let i = -5; i <= 5; i++) scene.add(box(0.5, 1, 0.5, '#94a3b8', i * 5, 0.5, z + 6.4, false));
        const s = signBoard('İSTANBUL BÜYÜKŞEHİR BELEDİYESİ', '#f8fafc', '#1e3a8a', 20, 1.6); s.position.set(0, 17.8, z + 6.1); scene.add(s);
        // dev ekran: "HER ŞEY ÇOK GÜZEL OLACAK"
        const scr = canvasTex(512, 160, (g, Wd, H) => { g.fillStyle = '#7c2d12'; g.fillRect(0, 0, Wd, H); g.fillStyle = '#fef3c7'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitText(g, 'HER ŞEY ÇOK GÜZEL OLACAK', Wd / 2, H / 2, Wd - 24, 62); });
        const sc = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.75), new THREE.MeshBasicMaterial({ map: scr })); sc.position.set(-16, 6, z + 6.2); scene.add(sc);
    }
    // Telefon ışıklı kalabalık (iki yanda ve meydanın arkasında): kişiler + parlayan ekranlar
    const people = [];
    for (let z = 6; z > ARENA.z0; z -= 1.3) [-1, 1].forEach(s => { for (let r = 0; r < 3; r++) if (Math.random() < 0.75) people.push([s * (HW + 1.6 + r * 1.1 + rand(0, 0.4)), z + rand(-0.4, 0.4)]); });
    for (let x = -ARENA.hw + 1; x < ARENA.hw; x += 1.1) for (let r = 0; r < 3; r++) if (Math.random() < 0.8) people.push([x + rand(-0.3, 0.3), ARENA.z1 - 1.5 - r * 1.1]);
    for (let z = ARENA.z0 - 1; z > ARENA.z1; z -= 1.2) [-1, 1].forEach(s => { for (let r = 0; r < 2; r++) if (Math.random() < 0.8) people.push([s * (ARENA.hw + 1.4 + r * 1.1), z + rand(-0.3, 0.3)]); });
    const COLS = ['#1f2937', '#312e81', '#374151', '#7f1d1d', '#14532d', '#1e3a8a'];
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.2, 0.35), new THREE.MeshLambertMaterial({ color: '#ffffff' }), people.length);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.28, 0.26), mat('#d6a77a'), people.length);
    const lights = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.16, 0.03), new THREE.MeshBasicMaterial({ color: '#f8fafc' }), people.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), C = new THREE.Color(), E = new THREE.Euler();
    const phases = [];
    people.forEach(([x, z], i) => {
        const h = rand(0.9, 1.1);
        M.compose(P.set(x, 0.6 * h, z), Q.identity(), S.set(1, h, 1)); bodies.setMatrixAt(i, M); bodies.setColorAt(i, C.set(COLS[i % COLS.length]));
        M.compose(P.set(x, 1.35 * h, z), Q, S.set(1, 1, 1)); heads.setMatrixAt(i, M);
        phases.push([x, z, h, rand(0, 6)]);
    });
    scene.add(bodies, heads, lights);
    // telefonlar havada sallanır
    W.movers.push((dt, t) => {
        for (let i = 0; i < phases.length; i++) {
            const [x, z, h, ph] = phases[i], toward = x > 0 ? -1 : 1;
            M.compose(P.set(x + toward * 0.15 + Math.sin(t * 2 + ph) * 0.1, 1.95 * h + Math.sin(t * 3 + ph) * 0.06, z), Q.setFromEuler(E.set(0, x > 0 ? -Math.PI / 2 : Math.PI / 2, 0)), S.set(1, 1, 1));
            lights.setMatrixAt(i, M);
        }
        lights.instanceMatrix.needsUpdate = true;
    });
    // Bayraklar (direkte dalgalanan)
    const flagTex = canvasTex(96, 64, (g) => { g.fillStyle = '#e30a17'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#fff'; g.beginPath(); g.arc(38, 32, 16, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e30a17'; g.beginPath(); g.arc(42, 32, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; g.lineTo(60 + Math.cos(a) * 8, 32 + Math.sin(a) * 8); } g.fill(); });
    const fm = new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide });
    for (let z = -6; z > ARENA.z0; z -= 22) [-1, 1].forEach(s => {
        const x = s * (HW + 4.5);
        scene.add(box(0.08, 4.5, 0.08, '#d4d4d8', x, 2.25, z));
        const f = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), fm); f.position.set(x + 0.76, 4, z); scene.add(f);
        const ph = rand(0, 6); W.movers.push((dt, t) => { f.rotation.y = Math.sin(t * 3 + ph) * 0.25; });
    });
    // Çevik kuvvet otobüsleri (üstüne çıkılır)
    BUSES.forEach(([x, z]) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
        g.add(box(2.4, 2.4, 9, '#1e3a8a', 0, 1.6, 0));
        g.add(box(2.42, 0.6, 8.6, '#0f172a', 0, 2.2, 0, false));
        for (let i = 0; i < 6; i++) g.add(box(2.46, 0.06, 0.4, '#9ca3af', 0, 2.2, -3.6 + i * 1.45, false));   // pencere ızgarası
        g.add(box(2.42, 0.3, 9, '#f8fafc', 0, 1.0, 0, false));
        [-3, 3].forEach(dz => [-1.1, 1.1].forEach(dx => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10), mat('#111827')); w.rotation.z = Math.PI / 2; w.position.set(dx, 0.45, dz); g.add(w); }));
        const s = signBoard('ÇEVİK KUVVET', '#f8fafc', '#1e3a8a', 3, 0.5); s.position.set(x > 0 ? -1.22 : 1.22, 1.3, 0); s.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(s);
        g.add(box(0.5, 0.25, 0.3, '#dc2626', -0.5, 2.9, 3.5, false)); g.add(box(0.5, 0.25, 0.3, '#2563eb', 0.5, 2.9, 3.5, false));   // tepe lambaları
    });
    entrySign(scene, 'SARAÇHANE', '#7c2d12');
}
