// HIRHIZ 3D — 3. BÖLÜM: PARALARI SIFIRLA (17-25 Aralık 2013 tapeleri)
// Gün batımında Boğaz kıyısı: solda deniz ve Boğaz Köprüsü, sağda tepedeki villalar ve servi ağaçları, Arnavut kaldırımı sahil yolu.
// Kasetler toplanır (hepsi "MONTAJ!"), polisler rüşvetle susturulur; villa balkonlarındaki SINAYPIRCILAR'a ancak rüşvet atarak ulaşılır.
// Demir kapıdan geçince canavar DEV ÇELİK KASA (boss_kasa.js); yenilince Cengiz gelir (outro.js).
import * as THREE from 'three';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=11';
import { T1, T2, HW, ARENA, signBoard, entrySign, tiled } from './world.js?v=11';
import { spawnKasa } from './boss_kasa.js?v=11';
import { cengizOutro } from './outro.js?v=11';
import './police.js?v=11';

const NEWS = ["'SIFIRLA' SES KAYDI İNTERNETE DÜŞTÜ", "KAYITLARA 'MONTAJ' DEDİ", "KAYITTA: '30 MİLYON AVRO DAHA VAR'"];
const BALCONY_X = HW + 1.4, BALCONY_Y = 3.2, SNIPERS_Z = [-48, -92, -160];

export const LEVEL3 = {
    id: 3, name: 'PARALARI SIFIRLA', menuTitle: '3 · PARALARI SIFIRLA',
    desc: 'Kasetleri topla (hepsi montaj!), polisleri rüşvetle sustur, DEV ÇELİK KASA\'yı patlat: kapağı açılınca vur!',
    mission: "KASETLERİ TOPLA, KASAYI SIFIRLA!",
    music: '../chiptune_level1.mp3',
    sky: ['#3b1f6e', '#b8457a', '#fb923c'], fog: '#d98872', hemi: ['#fbcfe8', '#3b2a52', 1.3], sun: ['#fdba74', 2.1],
    ground: { top: 'cobble', side: 'dirt', arena: 'marble' }, outer: 'cobble', outerRep: 2, pitFloor: '#1c1917',
    edge: { color: '#e7e5e4', h: 0.7, w: 0.35 }, pitSign: 'KAÇAK YALI İNŞAATI',
    segs: [[10, -34], [-37.5, -66], [-69.5, -104], [-107.5, -140], [-143.5, -184]],
    shelves: [
        [-3.5, T1, -12, 4, 2.4], [1.5, T2, -17, 3.5, 2.4], [4, T1, -27, 4, 2.4],
        [-4, T1, -46, 4, 2.4], [3, T1, -59, 4, 2.4], [3, T2, -63.5, 3.5, 2.4],
        [0, T1, -78, 5, 2.4], [-4, T2, -83, 4, 2.4], [4, T1, -94, 4, 2.4],
        [-3, T1, -116, 4, 2.4], [3, T1, -131, 4, 2.4], [-2, T2, -135.5, 3.5, 2.4],
        [2, T1, -160, 4, 2.4], [-3, T1, -172, 4, 2.4],
        [-11, T1, -200, 5, 3], [11, T1, -222, 5, 3]
    ],
    items: [
        ...[[-3.5, T1, -12], [1.5, T2, -17], [-5, 0, -30], [0, 0, -52], [3, T2, -63.5], [-4, T2, -83], [5, 0, -98],
            [-4, 0, -122], [-2, T2, -135.5], [-3, T1, -172]].map(p => ['tape', ...p]),
        ['heart', 5, 0, -44], ['heart', -5, 0, -150]
    ],
    collect: { kind: 'tape', icon: '📼', name: 'Kaset', word: 'MONTAJ!', sfx: 'sifirla' },
    brickRows: [[0, -24], [-4, -90], [3, -155]],
    checkpointZ: -96,
    spawns: [
        ['police', 2, -20], ['riot', -3, -30],
        ['police', 0, -44], ['gas', 3, -55], ['police', -4, -62], ['sniper', BALCONY_X, SNIPERS_Z[0], BALCONY_Y],
        ['riot', -3, -78], ['police', 4, -88], ['gas', 0, -98], ['sniper', BALCONY_X, SNIPERS_Z[1], BALCONY_Y],
        ['police', -4, -115], ['riot', 3, -125], ['police', 0, -134],
        ['gas', -3, -152], ['police', 3, -165], ['riot', 0, -176], ['sniper', BALCONY_X, SNIPERS_Z[2], BALCONY_Y]
    ],
    target: 11, cry: 'GÖZALTI İPTAL!', ammo: 'bribe', ammoName: 'RÜŞVET',
    gateWho: 'POLİS', gateColor: '#4c1d95', gateOpen: "11 POLİS SUSTU! VİLLA KAPISI AÇILDI — KASAYA GİT!",
    boss: (scene) => spawnKasa(scene, new THREE.Vector3(0, 0, -218)),
    outro: (scene) => cengizOutro(scene),
    wonTitle: 'BÖLÜM 3 TAMAM!', wonNote: 'Kasetler montaj oldu, kasa sıfırlandı!',
    buildGate(g) {   // villanın demir kapısı: taş sütunlar, sivri uçlu altın parmaklıklar
        [-1, 1].forEach(s => { g.add(box(1.1, 4.2, 1.1, '#e7e5e4', s * (HW - 0.55), 2.1, 0)); g.add(box(1.3, 0.3, 1.3, '#d6d3d1', s * (HW - 0.55), 4.35, 0)); });
        for (let x = -HW + 1.3; x <= HW - 1.3; x += 0.42) {
            g.add(box(0.07, 3.4, 0.07, '#111827', x, 1.7, 0, false));
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), mat('#eab308')); tip.position.set(x, 3.5, 0); g.add(tip);
        }
        [0.4, 1.7, 3.1].forEach(y => g.add(box(HW * 2 - 2.4, 0.08, 0.08, '#111827', 0, y, 0, false)));
        const crest = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 20), mat('#eab308')); crest.position.set(0, 2.4, 0.06); g.add(crest);
    },
    decorate
};

function villaWindows() {
    return canvasTex(64, 64, (g) => {
        g.fillStyle = '#f5f5f4'; g.fillRect(0, 0, 64, 64);
        for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = Math.random() < 0.6 ? '#fdba74' : '#44403c'; g.fillRect(x * 32 + 8, y * 32 + 8, 16, 18); }
    }, { repeat: [1, 1], pixel: true });
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
        c.fillStyle = '#111827'; c.fillRect(170, 40, 172, 100); c.fillStyle = '#f59e0b'; c.fillRect(184, 52, 144, 40);   // kaset
        c.fillStyle = '#e5e7eb'; [214, 298].forEach(x => { c.beginPath(); c.arc(x, 116, 14, 0, Math.PI * 2); c.fill(); });
    });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.86), new THREE.MeshBasicMaterial({ map: t }));
    scr.position.set(0, 3.9, 0.12); g.add(scr);
}

function decorate(scene, W) {
    // Deniz (Boğaz): yolun solunda; dalga dokusu kayar, gün batımı yansıması
    const seaTex = canvasTex(128, 128, (g) => {
        g.fillStyle = '#3b2a6b'; g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 70; i++) { g.fillStyle = ['#4c3a85', '#6d4a9a', '#f59e0b55', '#fb923c66'][i % 4]; g.fillRect(Math.random() * 128 | 0, Math.random() * 128 | 0, 10 + Math.random() * 18 | 0, 2); }
    }, { repeat: [20, 70], pixel: true });
    const seaM = new THREE.MeshLambertMaterial({ map: seaTex });
    // yol boyunca ve meydanın yanında (meydan daha geniş: deniz orada daha solda başlar) + sahil korkuluğu
    [[-HW - 3, 40, ARENA.z0], [-ARENA.hw - 3, ARENA.z0, -320]].forEach(([x1, z0, z1]) => {
        const sea = new THREE.Mesh(new THREE.PlaneGeometry(90, z0 - z1), seaM);
        sea.rotation.x = -Math.PI / 2; sea.position.set(x1 - 45, 0.05, (z0 + z1) / 2); scene.add(sea);
        const rx = x1 + 0.1;
        scene.add(box(0.08, 0.08, z0 - z1, '#e7e5e4', rx, 1.0, (z0 + z1) / 2, false));
        for (let z = Math.min(z0, 10); z > z1; z -= 3) scene.add(box(0.1, 1.0, 0.1, '#e7e5e4', rx, 0.5, z, false));
    });
    // meydanın girişinde deniz kıyısı bir köşe döner
    scene.add(box(ARENA.hw - HW, 0.08, 0.08, '#e7e5e4', -(HW + ARENA.hw) / 2 - 1.5, 1.0, ARENA.z0, false));
    W.movers.push((dt) => { seaTex.offset.x += dt * 0.02; seaTex.offset.y += dt * 0.05; });

    // Boğaz Köprüsü (denizin üstünde, uzakta): iki kule, tabliye, sarkan halatlar
    {
        const bz = -95, x0 = -38, x1 = -118, top = 26, deckY = 10;
        const dark = mat('#4c3a75');
        [x0, x1].forEach(x => { scene.add(box(1.5, top, 1.5, dark, x, top / 2, bz - 2, false)); scene.add(box(1.5, top, 1.5, dark, x, top / 2, bz + 2, false)); scene.add(box(1.6, 1.2, 5.6, dark, x, top - 2, bz, false)); });
        scene.add(box(Math.abs(x1 - x0) + 60, 0.8, 4.5, dark, (x0 + x1) / 2, deckY, bz, false));
        [-2, 2].forEach(dz => {
            const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20, x = x0 + 30 - u * (Math.abs(x1 - x0) + 60); const inside = x <= x0 && x >= x1;
                const k = inside ? (x0 - x) / (x0 - x1) : 0; pts.push(new THREE.Vector3(x, inside ? top - 1 - (top - deckY - 2) * (1 - Math.pow(2 * k - 1, 2)) : deckY + (top - deckY) * (1 - Math.min(Math.abs(x - x0), Math.abs(x - x1)) / 30), bz + dz)); }
            scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.18, 5), dark));
        });
        for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), new THREE.MeshBasicMaterial({ color: '#fde68a' })); l.position.set(x0 + 25 - i * 9, deckY + 0.6, bz + 2.4); scene.add(l); }
    }

    // Sağda tepe: kademeli villalar (kırmızı çatı, yanan pencereler), servi ağaçları
    const win = villaWindows();
    for (let z = 16; z > -300; z -= 11) {
        for (let row = 0; row < 3; row++) {
            if (Math.random() < 0.25) continue;
            const arena = z < ARENA.z0 + 4, edge = arena ? ARENA.hw : HW;
            const x = edge + 7 + row * 9 + rand(0, 3), base = row * 2.2, w = rand(6, 9), h = rand(4.5, 7), d = rand(6, 8);
            const t = win.clone(); t.repeat.set(w / 4, h / 3.5); t.needsUpdate = true;
            const wm = new THREE.MeshLambertMaterial({ map: t });
            const v = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), [mat('#e7e5e4'), wm, mat('#d6d3d1'), mat('#d6d3d1'), mat('#e7e5e4'), mat('#e7e5e4')]);
            v.position.set(x + d / 2, base + h / 2, z); scene.add(v);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 2.4, 4), mat('#9a3412', { flatShading: true }));
            roof.position.set(x + d / 2, base + h + 1.2, z); roof.rotation.y = Math.PI / 4; scene.add(roof);
            if (row) scene.add(box(d + 1, base, w + 1, '#78716c', x + d / 2, base / 2, z));   // istinat duvarı
        }
    }
    const cyp = [];
    for (let z = 12; z > ARENA.z0; z -= 7) if (Math.random() < 0.8) cyp.push([HW + rand(2, 5), z + rand(-2, 2), rand(0.8, 1.2)]);
    for (let z = ARENA.z0 - 4; z > ARENA.z1; z -= 8) [-1, 1].forEach(s => cyp.push([s * (ARENA.hw + rand(2, 4)), z, rand(0.9, 1.3)]));
    const cypM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.9, 7, 6), mat('#14532d', { flatShading: true }), cyp.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
    cyp.forEach(([x, z, s], i) => { M.compose(P.set(x, 3.5 * s, z), Q, S.set(s, s, s)); cypM.setMatrixAt(i, M); });
    cypM.castShadow = true; scene.add(cypM);

    // Sinaypırcıların balkonları (yolun sağında, yolun dışında: ancak rüşvet atarak ulaşılır)
    SNIPERS_Z.forEach(z => {
        scene.add(box(2.6, 0.22, 2.4, '#e7e5e4', BALCONY_X + 0.3, BALCONY_Y - 0.11, z));
        scene.add(box(0.1, 0.8, 2.4, '#d6d3d1', BALCONY_X - 0.95, BALCONY_Y + 0.4, z, false));
        scene.add(box(1.2, 6.5, 4, '#f5f5f4', BALCONY_X + 1.9, 3.25, z));
        scene.add(box(0.25, BALCONY_Y, 0.25, '#d6d3d1', BALCONY_X - 0.8, BALCONY_Y / 2, z - 1));
        scene.add(box(0.25, BALCONY_Y, 0.25, '#d6d3d1', BALCONY_X - 0.8, BALCONY_Y / 2, z + 1));
    });

    // Sokak lambaları (sıcak ışık), son dakika ekranları, para sayma masası
    for (let z = 2; z > ARENA.z0; z -= 16) {
        scene.add(box(0.12, 4.2, 0.12, '#1f2937', -HW - 1.8, 2.1, z));
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: '#fde68a' })); lamp.position.set(-HW - 1.8, 4.35, z); scene.add(lamp);
    }
    [[1, -14], [1, -70], [1, -130]].forEach(([s, z], i) => newsScreen(scene, s * (HW + 2.2), z, -s * Math.PI / 2 * 0.7, NEWS[i % NEWS.length]));
    {
        const g = new THREE.Group(); g.position.set(HW + 3, 0, -6); g.rotation.y = -Math.PI / 2; scene.add(g);
        g.add(box(2.4, 0.1, 1.2, '#78350f', 0, 1.0, 0)); [-1, 1].forEach(s => g.add(box(0.1, 1.0, 1.0, '#78350f', s * 1.1, 0.5, 0)));
        g.add(box(0.6, 0.4, 0.5, '#d4d4d8', -0.5, 1.25, 0)); g.add(box(0.3, 0.05, 0.2, '#22c55e', -0.5, 1.48, 0, false));   // para sayma makinesi
        for (let i = 0; i < 5; i++) g.add(box(0.36, 0.14, 0.18, i % 2 ? '#15803d' : '#16a34a', 0.4 + (i % 3) * 0.3, 1.12 + Math.floor(i / 3) * 0.15, 0));
        const s = signBoard('PARA SAYMA MAKİNESİ', '#f8fafc', '#166534', 2.4, 0.5); s.position.set(0, 2.0, 0); g.add(s);
    }
    entrySign(scene, 'BOĞAZ · VİLLALAR', '#4c1d95');

    // Meydanın arkasında sütunlu büyük villa
    {
        const z = ARENA.z1 - 12;
        const t = villaWindows(); t.repeat.set(12, 3);
        const m = new THREE.Mesh(new THREE.BoxGeometry(60, 14, 12), [mat('#f5f5f4'), mat('#f5f5f4'), mat('#d6d3d1'), mat('#d6d3d1'), new THREE.MeshLambertMaterial({ map: t }), mat('#f5f5f4')]);
        m.position.set(0, 7, z); scene.add(m);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(62, 1.2, 14), mat('#9a3412')); roof.position.set(0, 14.6, z); scene.add(roof);
        for (let i = 0; i < 10; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 12, 10), mat('#fafaf9')); c.position.set(-22.5 + i * 5, 6, z + 6.8); scene.add(c); }
        scene.add(box(50, 1, 2, '#fafaf9', 0, 12.4, z + 6.8));
    }
}
