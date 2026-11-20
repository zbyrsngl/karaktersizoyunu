// HIRHIZ 3D — 3. BÖLÜM: PARALARI SIFIRLA (17-25 Aralık 2013 tapeleri)
// Gün batımında Boğaz kıyısı: solda deniz ve Boğaz Köprüsü, sağda tepedeki villalar ve servi ağaçları, Arnavut kaldırımı sahil yolu.
// Kasetler toplanır (hepsi "MONTAJ!"), polisler rüşvetle susturulur; villa balkonlarındaki SINAYPIRCILAR'a ancak rüşvet atarak ulaşılır.
// Demir kapıdan geçince canavar DEV ÇELİK KASA (boss_kasa.js); yenilince Cengiz gelir (outro.js).
import * as THREE from 'three';
import { tr } from './i18n.js?v=29';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=29';
import { T1, T2, HW, ARENA, signBoard, entrySign, tiled } from './world.js?v=29';
import { spawnKasa } from './boss_kasa.js?v=29';
import { cengizOutro } from './outro.js?v=29';
import './police.js?v=29';
import { Batch, person, crowd, poseCycle, bubbleTalk, looks, HOLD, table, chair, mat4 } from './decor.js?v=29';

const NEWS = ["'SIFIRLA' SES KAYDI İNTERNETE DÜŞTÜ", "KAYITLARA 'MONTAJ' DEDİ", "KAYITTA: '30 MİLYON AVRO DAHA VAR'"];
// Sağdaki boş alanda olaylar: polis dinleme odası, siyah minibüste gizli dinleme, Bilal'in basın toplantısı (villalar buralarda açılır)
const SCENE_Z = { tap: -30, van: -110, press: -151 };
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
        c.fillStyle = '#111827'; c.font = 'bold 20px Arial Black, Arial'; c.textBaseline = 'middle'; c.fillText(tr('SON DAKİKA'), 12, H - 106);
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
            if (row < 2 && Object.values(SCENE_Z).some(sz => Math.abs(z - sz) < 13)) continue;   // sahnelere yer aç
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
    for (let z = 12; z > ARENA.z0; z -= 7) if (Math.random() < 0.8 && !Object.values(SCENE_Z).some(sz => Math.abs(z - sz) < 8)) cyp.push([HW + rand(2, 5), z + rand(-2, 2), rand(0.8, 1.2)]);
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
    tapRoom(scene, W, SCENE_Z.tap); spyVan(scene, W, SCENE_Z.van); pressConf(scene, W, SCENE_Z.press);

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

// --- DİNLEME ODASI: yola açık kesit oda; masa başında kulaklıklı polisler, dönen makaralı teyp, hedef panosu ---
function tapRoom(scene, W, z0) {
    const x0 = HW + 4, x1 = HW + 13, b = new Batch(), M = mat4(0, 0, 0);
    b.box(M, x1 - x0, 0.1, 10, '#d6d3d1', (x0 + x1) / 2, 0.05, z0);                 // zemin
    b.box(M, 0.3, 4, 10, '#94a3b8', x1, 2, z0);                                       // arka duvar
    [-1, 1].forEach(sz => b.box(M, x1 - x0, 4, 0.3, '#a5b4c8', (x0 + x1) / 2, 2, z0 + sz * 5));
    b.box(M, x1 - x0 + 0.4, 0.3, 10.4, '#475569', (x0 + x1) / 2, 4.15, z0);          // tavan
    // masalar ve ekipman (polisler yola bakar, ekranlar onlara dönük)
    [-2.6, 0, 2.6].forEach((dz) => {
        table(b, x0 + 2.6, z0 + dz, Math.PI / 2, { w: 1.8, d: 0.9, top: '#57534e' });
        chair(b, x0 + 3.5, z0 + dz, -Math.PI / 2, '#1f2937');
        b.box(M, 0.05, 0.35, 0.5, '#0f172a', x0 + 2.35, 1.0, z0 + dz - 0.45);          // ekran
        b.box(M, 0.4, 0.06, 0.6, '#334155', x0 + 2.6, 0.81, z0 + dz + 0.35);           // kayıt cihazı
    });
    // arka duvarda teyp dolapları
    for (let i = 0; i < 4; i++) b.box(M, 0.5, 2.2, 1.2, '#1f2937', x1 - 0.45, 1.1, z0 - 3 + i * 2);
    scene.add(b.mesh());
    // dönen makaralar
    const reelM = new THREE.MeshLambertMaterial({ color: '#cbd5e1' }), reels = [];
    for (let i = 0; i < 4; i++) [-0.25, 0.25].forEach(dz => {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 10), reelM);
        r.rotation.z = Math.PI / 2; r.position.set(x1 - 0.72, 1.6, z0 - 3 + i * 2 + dz); scene.add(r); reels.push(r);
        r.add(box(0.36, 0.05, 0.05, '#475569', 0, 0.03, 0, false));
    });
    W.movers.push(dt => reels.forEach((r, i) => r.rotation.y += dt * (i % 2 ? 3 : 4.2)));
    // hedef panosu: fotoğraflar ve kırmızı ipler
    const board = canvasTex(256, 160, (c, Wd, H) => {
        c.fillStyle = '#a16207'; c.fillRect(0, 0, Wd, H); c.fillStyle = '#fde68a'; c.fillRect(6, 6, Wd - 12, H - 12);
        const pts = [[40, 40], [130, 30], [210, 50], [70, 105], [170, 108]];
        c.strokeStyle = '#dc2626'; c.lineWidth = 3; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineTo(40, 40); c.stroke();
        pts.forEach(([x, y]) => { c.fillStyle = '#f8fafc'; c.fillRect(x - 18, y - 22, 36, 44); c.fillStyle = '#57534e'; c.fillRect(x - 12, y - 16, 24, 24); c.fillStyle = '#dc2626'; c.fillRect(x - 3, y - 26, 6, 6); });
        c.fillStyle = '#111827'; c.textAlign = 'center'; c.textBaseline = 'middle'; fitText(c, 'HEDEF: SIFIRLA', Wd / 2, H - 16, Wd - 20, 18);
    });
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshLambertMaterial({ map: board }));
    bd.position.set(x0 + 4.5, 2.6, z0 + 4.83); bd.rotation.y = Math.PI; scene.add(bd);
    const s = signBoard('DİNLEME ODASI', '#f8fafc', '#1e3a8a', 5, 0.7); s.position.set(x0 - 0.05, 4.7, z0); s.rotation.y = -Math.PI / 2; scene.add(s);
    // kulaklıklı polisler: biri not alır, biri arkasına yaslanır; şef telefonla konuşur
    const cops = [-2.6, 0, 2.6].map((dz, i) => ({ ...looks.police(), headset: true, pose: 'desk', x: x0 + 3.45, z: z0 + dz, yaw: -Math.PI / 2, hold: i === 1 ? HOLD.book : null }));
    poseCycle(scene, W, cops, ['desk', o => o.hold ? 'desk' : 'chair', 'desk'], [3, 1.2, 2.5]);
    const chief = { ...looks.police(), headset: true, x: x0 + 5.6, z: z0 + 1.3, yaw: -Math.PI / 2 - 0.4, pose: 'phone', hold: HOLD.phone };
    crowd(scene, [chief]);
    bubbleTalk(scene, W, [
        [{ x: x0 + 3.4, y: 2.2, z: z0 - 2.6 }, 'KAYIT ALINIYOR...', 2.2],
        [{ x: x0 + 3.4, y: 2.2, z: z0 }, "'SIFIRLA' DEDİ!", 2.2, '#b91c1c'],
        [{ x: chief.x, y: 2.6, z: chief.z }, 'HEMEN ÇOĞALTIN!', 2.2],
        [{ x: x0 + 3.4, y: 2.2, z: z0 + 2.6 }, '30 MİLYON AVRO DAHA VAR...', 2.4]
    ], { gap: 0.8, near: 32 });
}

// --- SİYAH MİNİBÜS: kapısı açık, içinde kulaklıklı sivil polisler, çatıda çanak anten, üstünde kılıf yazı ---
function spyVan(scene, W, z0) {
    const x = HW + 5.2, b = new Batch(), M = mat4(x, 0, z0);
    b.box(M, 2.2, 2.0, 5.2, '#0b0b0f', 0.0, 1.45, 0);                    // gövde
    b.box(M, 0.02, 1.3, 1.5, '#334155', -1.11, 1.5, -0.6);                // açık kapının içi (aydınlık)
    b.box(M, 2.24, 0.6, 1.4, '#111827', 0, 2.0, 2.0);                     // ön cam şeridi
    b.box(M, 2.1, 0.5, 0.2, '#1f2937', 0, 0.75, 2.62);                    // tampon
    [-1, 1].forEach(sx => [-1.7, 1.7].forEach(dz => b.box(M, 0.3, 0.75, 0.75, '#111', sx * 1.05, 0.38, dz)));
    b.box(M, 0.06, 1.3, 1.6, '#0b0b0f', -1.2, 1.55, -2.1);                // sürgülü kapı (geri kaymış)
    b.box(M, 0.4, 0.06, 0.4, '#374151', 0.3, 2.5, -1.2); b.box(M, 0.04, 0.9, 0.04, '#9ca3af', 0.3, 2.95, -1.2);   // anten
    scene.add(b.mesh());
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.5), new THREE.MeshLambertMaterial({ color: '#d1d5db', side: THREE.DoubleSide }));
    dish.position.set(x - 0.3, 2.6, z0 + 0.6); dish.rotation.z = 0.9; scene.add(dish);
    W.movers.push((dt, t) => dish.rotation.y = Math.sin(t * 0.7) * 0.8);
    // kapı aralığında yanıp sönen cihaz lambaları
    const leds = [];
    for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: i % 2 ? '#22c55e' : '#ef4444' })); l.position.set(x - 1.09, 1.2 + (i % 3) * 0.25, z0 - 1.2 + Math.floor(i / 3) * 0.25); scene.add(l); leds.push(l); }
    W.movers.push((dt, t) => leds.forEach((l, i) => l.visible = Math.sin(t * (3 + i) + i) > -0.2));
    // kılıf yazı: "ÇİÇEKÇİ MEHMET"
    const side = signBoard('ÇİÇEKÇİ MEHMET', '#fbcfe8', '#0b0b0f', 2.6, 0.45); side.position.set(x - 1.12, 2.1, z0 + 1.1); side.rotation.y = -Math.PI / 2; scene.add(side);
    // kapıda oturan kulaklıklı siviller (kapıya dönük, dizlerinde cihaz)
    const civ = [{ ...looks.civil(), headset: true, pose: 'chair', x: x - 0.75, z: z0 - 0.95, yaw: -Math.PI / 2, hold: HOLD.book, y: 0.5, s: 0.9 },
                 { ...looks.civil(), headset: true, pose: 'chair', x: x - 0.75, z: z0 - 0.2, yaw: -Math.PI / 2, y: 0.5, s: 0.9 }];
    poseCycle(scene, W, civ, ['chair', 'desk'], [2.5, 1.5]);
    const look = { ...looks.civil(), glasses: true, x: x - 1.9, z: z0 + 2.4, yaw: -Math.PI / 2 + 0.3, pose: 'phone', hold: HOLD.phone };   // dışarıda gözcü
    crowd(scene, [look]);
    bubbleTalk(scene, W, [
        [{ x: x - 0.75, y: 2.6, z: z0 - 0.95 }, 'HEDEF KONUŞUYOR...', 2.2],
        [{ x: look.x, y: 2.6, z: look.z }, 'KİMSE BİZİ GÖRMEDİ.', 2.2],
        [{ x: x - 0.75, y: 2.6, z: z0 - 0.2 }, 'KASETLERİ ÇOĞALT!', 2.2]
    ], { gap: 0.9, near: 30 });
}

// --- BASIN TOPLANTISI: kürsüde BİLAL, karşısında mikrofonlu ve kameralı muhabirler; sorular ve cevaplar balonlarda ---
function bilal(b, x, z, pose) {   // kodla çizildi: uzun boylu, lacivert takım, kısa sakal, gözlük, kısa siyah saç
    person(b, { x, z, yaw: -Math.PI / 2, pose, s: 1.12, skin: '#e3b190', jacket: '#1e293b', shirt: '#f8fafc', pants: '#1e293b', hair: '#111827', beard: '#1c1917', mustache: '#1c1917', glasses: true });
}
function pressConf(scene, W, z0) {
    const x = HW + 9.5, b = new Batch(), M = mat4(0, 0, 0);
    b.box(M, 3.5, 0.9, 6, '#7f1d1d', x + 0.5, 0.45, z0);                  // yüksek sahne (kırmızı halı)
    for (let i = 0; i < 3; i++) b.box(M, 0.4, 0.3 * (i + 1), 1.6, '#57534e', x - 2.25 + i * 0.4, 0.15 * (i + 1), z0 + 2.2);   // basamaklar
    b.box(M, 0.8, 1.15, 0.6, '#78350f', x - 0.7, 1.48, z0);                // kürsü
    for (let i = 0; i < 6; i++) b.box(M, 0.03, 0.35, 0.03, '#111827', x - 1.05, 2.2, z0 - 0.25 + i * 0.1, 0, 0, 0.4);   // mikrofonlar
    for (let i = 0; i < 6; i++) b.box(M, 0.08, 0.08, 0.08, ['#dc2626', '#2563eb', '#16a34a', '#facc15', '#f8fafc', '#7c3aed'][i], x - 1.18, 2.36, z0 - 0.25 + i * 0.1);
    b.box(M, 0.2, 4.4, 6.4, '#1e3a8a', x + 2.1, 2.2, z0);                  // arka pano
    [-1, 1].forEach(sz => b.box(M, 0.12, 2.6, 0.12, '#111827', x - 3.5, 1.3, z0 + sz * 3.4));   // ışık direkleri
    // tripodlu kameralar
    [-1.9, 1.9].forEach(dz => { b.box(M, 0.05, 1.3, 0.05, '#111827', x - 5.6, 0.65, z0 + dz); b.box(M, 0.3, 0.35, 0.5, '#1f2937', x - 5.6, 1.45, z0 + dz); });
    scene.add(b.mesh());
    const board = signBoard('BASIN TOPLANTISI', '#f8fafc', '#1e3a8a', 5.8, 0.8); board.position.set(x + 1.98, 3.7, z0); board.rotation.y = -Math.PI / 2; scene.add(board);
    [-1, 1].forEach(sz => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: '#fef9c3' })); l.position.set(x - 3.5, 2.7, z0 + sz * 3.4); scene.add(l); });
    // Bilal: konuşurken eli açık, sonra parmak sallar
    const bm = ['open', 'point', 'stand'].map(pose => { const bb = new Batch(); bilal(bb, x, z0, pose); const m = bb.mesh(); m.position.y = 0.9; scene.add(m); return m; });
    W.movers.push((dt, t) => { const k = Math.floor(t / 1.4) % 3; bm.forEach((m, i) => m.visible = i === k); });
    // muhabirler (yarım daire): mikrofon uzatanlar ve kameramanlar
    const J = [];
    for (let i = 0; i < 7; i++) {
        const a = -0.9 + i * 0.3, r = 3.4 + (i % 2) * 0.8, jx = x - 0.7 - Math.cos(a) * r, jz = z0 + Math.sin(a) * r * 1.2;
        J.push({ ...looks.press(), x: jx, z: jz, yaw: Math.atan2(x - jx, z0 - jz), pose: i % 3 === 1 ? 'camera' : 'mic', hold: i % 3 === 1 ? HOLD.camera : HOLD.mic });
    }
    poseCycle(scene, W, J, [o => o.pose, o => o.pose === 'mic' ? 'stand' : 'camera', o => o.pose], [2.6, 0.8, 1.8], { offset: 0.5 });
    const at = (o, y = 2.5) => ({ x: o.x, y, z: o.z }), B = { x: x, y: 4.1, z: z0 }, Y = '#111827', BB = 'rgba(253,230,138,0.97)';
    bubbleTalk(scene, W, [
        [at(J[0]), 'SES KAYITLARI GERÇEK Mİ?', 2.4], [B, 'HEPSİ MONTAJ!', 2.2, Y, BB],
        [at(J[2]), 'PARALAR SIFIRLANDI MI?', 2.4], [B, 'SIFIRLADIK BABACIĞIM!', 2.4, Y, BB],
        [at(J[4]), 'EVDE PARA KALDI MI?', 2.4], [B, '30 MİLYON AVRO DAHA VAR...', 2.6, Y, BB],
        [at(J[6]), 'AYAKKABI KUTULARI NE OLACAK?', 2.4], [B, 'ONLAR SPOR AYAKKABI!', 2.4, Y, BB],
        [at(J[3]), 'İSTİFA EDECEK MİSİNİZ?', 2.4], [B, 'SORU YOK, TEŞEKKÜRLER!', 2.4, Y, BB]
    ], { gap: 0.5, near: 36 });
}
