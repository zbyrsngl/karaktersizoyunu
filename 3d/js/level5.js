// HIRHIZ 3D — 5. BÖLÜM: ŞARJ BİTMESİN! (15 Temmuz 2016 gecesi, Marmaris)
// Gece sahil yolu (tahta iskele), solda ay ışıklı deniz ve ışıklı yatlar, sağda oteller ve palmiyeler.
// Telefonun şarjı azalır (bitince 1 can gider), yoldaki şarj aletleri doldurur. Mini tanklar (tanks.js) ve polisler rüşvetle teslim alınır;
// cankurtaran kulelerinde nişancılar. Kum torbalı kontrol noktası açılınca canavar DARBE TANKI (boss_darbetank.js);
// yenilince HIRHIZ: "15 Temmuz Allah'ın bir lütfü!" (outro.js selfOutro).
import * as THREE from 'three';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=11';
import { T1, T2, HW, ARENA, signBoard, entrySign } from './world.js?v=11';
import { getHeadTex } from './models.js?v=11';
import { spawnDarbeTank } from './boss_darbetank.js?v=11';
import { selfOutro } from './outro.js?v=11';
import './police.js?v=11';
import './tanks.js?v=11';

const TOWERS = [-52, -122], TOWER_X = -4, DECK = 2.6;
const NEWS = ['CANLI: CUMHURBAŞKANI FACETIME İLE BAĞLANDI', "BOĞAZ KÖPRÜSÜ'NDE TANKLAR", "TRT'DE DARBE BİLDİRİSİ OKUNDU"];

export const LEVEL5 = {
    id: 5, name: 'ŞARJ BİTMESİN!', menuTitle: '5 · ŞARJ BİTMESİN!',
    desc: 'Telefonun şarjı azalıyor! Şarj aletlerini topla, tankları rüşvetle teslim al, DARBE TANKI\'nı durdur!',
    mission: 'ŞARJ BİTMEDEN TANKLARI TESLİM AL!',
    music: '../bozkir_dortnal.mp3',
    sky: ['#020617', '#111a4a', '#2b3a7a'], fog: '#101a42', hemi: ['#a5b4fc', '#1e1b4b', 1.1], sun: ['#dbeafe', 1.4],
    ground: { top: 'boards', side: 'concrete', arena: 'pave' }, outer: 'sand', outerRep: 3, pitFloor: '#0b1433',
    edge: { color: '#e7e5e4', h: 0.6, w: 0.3 }, pitSign: 'TEKNE KANALI',
    battery: true,
    segs: [[10, -34], [-37.5, -66], [-69.5, -104], [-107.5, -140], [-143.5, -184]],
    shelves: [
        [-3.5, T1, -12, 4, 2.4], [1.5, T2, -17, 3.5, 2.4], [4, T1, -27, 4, 2.4],
        [-4, T1, -46, 4, 2.4], [3, T1, -59, 4, 2.4], [3, T2, -63.5, 3.5, 2.4],
        [0, T1, -78, 5, 2.4], [-4, T2, -83, 4, 2.4], [4, T1, -94, 4, 2.4],
        [-3, T1, -116, 4, 2.4], [3, T1, -131, 4, 2.4], [-2, T2, -135.5, 3.5, 2.4],
        [2, T1, -160, 4, 2.4], [-3, T1, -172, 4, 2.4],
        [-11, T1, -200, 5, 3], [11, T1, -222, 5, 3]
    ],
    solids: TOWERS.map(z => [TOWER_X - 1.1, DECK - 0.3, z - 1.1, TOWER_X + 1.1, DECK, z + 1.1]),   // cankurtaran kulelerinin platformu
    items: [
        ...[[-3.5, T1, -12], [1.5, T2, -17], [-5, 0, -30], [TOWER_X + 0.6, DECK, -51.6], [3, T2, -63.5], [-4, T2, -83], [5, 0, -98],
            [TOWER_X + 0.6, DECK, -121.6], [-2, T2, -135.5], [-3, T1, -172]].map(p => ['bag', ...p]),
        ...[[5, 0, -6], [-5, 0, -42], [5, 0, -74], [-6, 0, -92], [5, 0, -112], [-5, 0, -146], [5, 0, -166]].map(p => ['charger', ...p]),
        ['heart', 5, 0, -44]
    ],
    collect: { kind: 'bag', icon: '💰', name: 'Kul hakkı torbası', word: 'KUL HAKKI!' },
    brickRows: [[0, -24], [-4, -90], [3, -155]],
    checkpointZ: -96,
    spawns: [
        ['police', 2, -20], ['minitank', -3, -30],
        ['minitank', 3, -44], ['riot', 0, -58], ['police', -4, -62], ['sniper', TOWER_X, TOWERS[0] - 0.3, DECK],
        ['minitank', -2, -76], ['police', 4, -88], ['gas', 0, -100], ['minitank', 4, -97],
        ['police', 4, -112], ['minitank', 3, -128], ['riot', 0, -134], ['sniper', TOWER_X, TOWERS[1] - 0.3, DECK],
        ['gas', -3, -150], ['minitank', 3, -162], ['police', 0, -176]
    ],
    target: 11, cry: 'GÖZALTI İPTAL!', ammo: 'bribe', ammoName: 'RÜŞVET',
    gateWho: 'DÜŞMAN', gateColor: '#365314', gateOpen: "11 DÜŞMAN TESLİM! KONTROL NOKTASI AÇILDI — DARBE TANKI'NA GİT!",
    boss: (scene) => spawnDarbeTank(scene, new THREE.Vector3(0, 0, -220)),
    outro: () => selfOutro('lutuf', "15 Temmuz Allah'ın bir lütfü!"),
    wonTitle: 'BÖLÜM 5 TAMAM!', wonNote: 'FaceTime bağlantısı kopmadı! Şimdi uçağa!',
    buildGate(g) {   // kum torbalı askeri kontrol noktası
        for (let r = 0; r < 4; r++) for (let i = 0; i < 11; i++) {
            const s = box(1.45, 0.42, 0.9, ['#a8946a', '#9a865d', '#b5a275'][(i + r) % 3], -HW + 0.8 + i * 1.45 + (r % 2) * 0.35, 0.21 + r * 0.42, 0);
            g.add(s);
        }
        g.add(box(0.15, 2.8, 0.15, '#6b7280', -HW + 0.5, 1.4, 0.4)); g.add(box(0.15, 2.8, 0.15, '#6b7280', HW - 0.5, 1.4, 0.4));
        const stripe = canvasTex(64, 16, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f8fafc' : '#dc2626'; c.fillRect(i * 8, 0, 8, 16); } }, { pixel: true });
        const bar = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 - 1, 0.18, 0.18), new THREE.MeshLambertMaterial({ map: stripe })); bar.position.set(0, 2.6, 0.4); g.add(bar);
    },
    decorate
};

// FaceTime ekranı: telefon çerçevesinde HIRHIZ'ın yüzü, "CANLI" etiketi
function faceTimeScreen(scene, x, y, z, rot, scale = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; g.scale.setScalar(scale); scene.add(g);
    g.add(box(5.4, 3.4, 0.25, '#0f172a', 0, 0, 0));
    const bg = canvasTex(512, 320, (c, W, H) => {
        const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1e3a8a'); gr.addColorStop(1, '#0f172a'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
        c.fillStyle = '#dc2626'; c.fillRect(16, 16, 110, 40); c.fillStyle = '#fff'; c.font = 'bold 26px Arial Black, Arial'; c.textBaseline = 'middle'; c.fillText('CANLI', 26, 37);
        c.fillStyle = '#dc2626'; c.fillRect(0, H - 70, W, 70); c.fillStyle = '#fef2f2'; c.textAlign = 'center';
        fitText(c, 'CUMHURBAŞKANI FACETIME İLE BAĞLANDI', W / 2, H - 34, W - 30, 32);
        c.fillStyle = '#111827'; c.beginPath(); c.roundRect(W / 2 - 70, 30, 140, 200, 18); c.fill();   // telefon
        c.fillStyle = '#e2e8f0'; c.fillRect(W / 2 - 60, 46, 120, 166);
    });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 3.15), new THREE.MeshBasicMaterial({ map: bg })); scr.position.z = 0.13; g.add(scr);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.48), new THREE.MeshBasicMaterial({ map: getHeadTex(), transparent: true, alphaTest: 0.4 }));
    face.position.set(-0.03, 0.42, 0.15); g.add(face);
    return g;
}
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
        c.fillStyle = '#4d5b2a'; c.fillRect(170, 80, 170, 50); c.fillRect(220, 60, 70, 24); c.fillRect(280, 66, 90, 8);
    });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.86), new THREE.MeshBasicMaterial({ map: t }));
    scr.position.set(0, 3.9, 0.12); g.add(scr);
}

function decorate(scene, W) {
    // Gece denizi (yolun solunda, kumsalın ötesinde), ay ve yıldızlar
    const seaTex = canvasTex(128, 128, (g) => {
        g.fillStyle = '#0b1433'; g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 60; i++) { g.fillStyle = ['#13224d', '#1e3a8a', '#fde68a55'][i % 3]; g.fillRect(Math.random() * 128 | 0, Math.random() * 128 | 0, 8 + Math.random() * 14 | 0, 2); }
    }, { repeat: [20, 70], pixel: true });
    const seaM = new THREE.MeshLambertMaterial({ map: seaTex });
    [[-HW - 9, 40, ARENA.z0], [-ARENA.hw - 9, ARENA.z0, -320]].forEach(([x1, z0, z1]) => {
        const sea = new THREE.Mesh(new THREE.PlaneGeometry(90, z0 - z1), seaM); sea.rotation.x = -Math.PI / 2; sea.position.set(x1 - 45, 0.05, (z0 + z1) / 2); scene.add(sea);
    });
    W.movers.push((dt) => { seaTex.offset.x += dt * 0.015; seaTex.offset.y += dt * 0.04; });
    const moon = new THREE.Mesh(new THREE.CircleGeometry(5, 24), new THREE.MeshBasicMaterial({ color: '#fef9c3', fog: false })); moon.position.set(-70, 45, -120); moon.lookAt(0, 0, -60); scene.add(moon);
    const starG = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < 500; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.2, r = 140; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r - 80); }
    starG.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starG, new THREE.PointsMaterial({ color: '#e0e7ff', size: 0.6, fog: false })));
    // Işıklı yatlar
    for (let i = 0; i < 7; i++) {
        const y = new THREE.Group(); y.position.set(-HW - 22 - rand(0, 30), 0.05, 10 - i * 45 - rand(0, 15)); y.rotation.y = rand(0, 6); scene.add(y);
        y.add(box(2.4, 0.8, 7, '#f8fafc', 0, 0.4, 0, false)); y.add(box(1.8, 0.7, 3.5, '#e2e8f0', 0, 1.15, -0.5, false)); y.add(box(0.08, 6, 0.08, '#cbd5e1', 0, 3.5, 0.8, false));
        for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: '#fde68a' })); l.position.set(0, 1.3, -1.8 + k * 0.9); y.add(l); }
        const ph = rand(0, 6); W.movers.push((dt, t) => { y.position.y = 0.05 + Math.sin(t * 1.2 + ph) * 0.08; y.rotation.z = Math.sin(t + ph) * 0.03; });
    }
    // Oteller (sağda): beyaz bloklar, ışıklı pencereler, balkonlar
    const win = canvasTex(64, 64, (g) => {
        g.fillStyle = '#f5f5f4'; g.fillRect(0, 0, 64, 64);
        for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = Math.random() < 0.55 ? '#fde68a' : '#1e293b'; g.fillRect(x * 32 + 6, y * 32 + 6, 20, 18); g.fillStyle = '#cbd5e1'; g.fillRect(x * 32 + 2, y * 32 + 26, 28, 4); }
    }, { repeat: [1, 1], pixel: true });
    for (let z = 16; z > -310; z -= 16) {
        const arena = z < ARENA.z0 + 4, edge = arena ? ARENA.hw : HW;
        const w = rand(10, 14), h = rand(9, 18), d = 10, x = edge + 9 + d / 2 + rand(0, 4);
        const t = win.clone(); t.repeat.set(w / 3, h / 3); t.needsUpdate = true;
        const fm = new THREE.MeshLambertMaterial({ map: t });
        const m = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), [mat('#e7e5e4'), fm, mat('#d6d3d1'), mat('#d6d3d1'), mat('#e7e5e4'), mat('#e7e5e4')]);
        m.position.set(x, h / 2, z); scene.add(m);
    }
    // Palmiyeler (InstancedMesh: gövde + 6 yaprak)
    const palms = [];
    for (let z = 12; z > ARENA.z0; z -= 9) { palms.push([HW + rand(2, 5), z + rand(-2, 2)]); if (Math.random() < 0.7) palms.push([-HW - rand(2.5, 6), z + rand(-3, 3)]); }
    for (let z = ARENA.z0 - 4; z > ARENA.z1; z -= 10) [-1, 1].forEach(s => palms.push([s * (ARENA.hw + rand(2, 4)), z]));
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 6, 6), mat('#8b6a47'), palms.length);
    const fronds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.06, 2.6), mat('#166534'), palms.length * 6);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
    palms.forEach(([x, z], i) => {
        const lean = rand(-0.12, 0.12);
        M.compose(P.set(x, 3, z), Q.setFromEuler(E.set(lean, 0, lean)), S.set(1, 1, 1)); trunks.setMatrixAt(i, M);
        for (let k = 0; k < 6; k++) {
            const a = k / 6 * Math.PI * 2 + i;
            M.compose(P.set(x + Math.sin(a) * 1.1 + lean * 6, 5.9, z + Math.cos(a) * 1.1 + lean * 6), Q.setFromEuler(E.set(0.45, a, 0, 'YXZ')), S.set(1, 1, 1));
            fronds.setMatrixAt(i * 6 + k, M);
        }
    });
    scene.add(trunks, fronds);

    // Cankurtaran kuleleri (üstünde nişancı; platforma zıplanır)
    TOWERS.forEach(z => {
        [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([dx, dz]) => scene.add(box(0.14, DECK - 0.3, 0.14, '#f8fafc', TOWER_X + dx, (DECK - 0.3) / 2, z + dz)));
        scene.add(box(2.2, 0.3, 2.2, '#dc2626', TOWER_X, DECK - 0.15, z));
        scene.add(box(2.4, 0.12, 2.4, '#dc2626', TOWER_X, DECK + 1.9, z, false));
        [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]].forEach(([dx, dz]) => scene.add(box(0.08, 1.9, 0.08, '#f8fafc', TOWER_X + dx, DECK + 0.95, z + dz, false)));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 6, 14), mat('#f97316')); ring.position.set(TOWER_X + 1.12, DECK - 0.6, z); ring.rotation.y = Math.PI / 2; scene.add(ring);
        const sign = signBoard('CANKURTARAN', '#f8fafc', '#dc2626', 2, 0.4); sign.position.set(TOWER_X, DECK + 0.5, z + 1.12); scene.add(sign);
    });
    // Son dakika ekranları, FaceTime ekranları, giriş tabelası
    [[1, -14], [-1, -70], [1, -126]].forEach(([s, z], i) => newsScreen(scene, s * (HW + 2.2), z, -s * Math.PI / 2 * 0.7, NEWS[i % NEWS.length]));
    faceTimeScreen(scene, HW + 4, 4.5, -36, -Math.PI / 2 * 0.65);
    faceTimeScreen(scene, 0, 9, ARENA.z1 - 6, 0, 2);
    entrySign(scene, 'MARMARİS', '#1e3a8a');

    // Meydanın arkasında büyük otel
    {
        const z = ARENA.z1 - 14, t = win.clone(); t.repeat.set(16, 5); t.needsUpdate = true;
        const m = new THREE.Mesh(new THREE.BoxGeometry(70, 16, 12), [mat('#e7e5e4'), mat('#e7e5e4'), mat('#d6d3d1'), mat('#d6d3d1'), new THREE.MeshLambertMaterial({ map: t }), mat('#e7e5e4')]);
        m.position.set(0, 8, z); scene.add(m);
        const s = signBoard('GRAND OTEL', '#fde68a', '#1e3a8a', 14, 2); s.position.set(0, 17.3, z + 6.1); scene.add(s);
    }
}
