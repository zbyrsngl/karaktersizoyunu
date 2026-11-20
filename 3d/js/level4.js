// HIRHIZ 3D — 4. BÖLÜM: 15 TEMMUZ (2016)
// Gece, Boğaz Köprüsü'nün tabliyesi: dev kuleler, sarkan halatlar, köprü lambaları; çok aşağıda deniz ve kıyı ışıkları.
// Köprü kesilmiş (çukurlar: düşen denize düşer), yolda tanklar (üstlerine çıkılır; kulelerinde nişancılar), alçak uçan F-16'lar,
// bayraklı kalabalık. Darbeci askerler (soldiers.js) kelepçe atılarak tutuklanır. Tank barikatı açılınca canavar FETÖ (boss_feto.js);
// yenilince HIRHIZ konuşur, ardından "son peygamber" adamı gelir (outro.js).
import * as THREE from 'three';
import { tr } from './i18n.js?v=27';
import { G } from './state.js?v=27';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=27';
import { T1, T2, HW, ARENA, signBoard, entrySign } from './world.js?v=27';
import { spawnFeto } from './boss_feto.js?v=27';
import { peygamberOutro } from './outro.js?v=27';
import { playSfx } from './audio.js?v=27';
import { limb, walkPose } from './models.js?v=27';
import './soldiers.js?v=27';

const TANKS = [[3.5, -46], [-3.5, -84], [3.5, -120], [-3.5, -158]];   // yoldaki tanklar (kulelerine çıkılır)
const HULL = 1.5, TURRET = 2.3;
const NEWS = ['BOĞAZ KÖPRÜSÜ ASKERLER TARAFINDAN KAPATILDI', "F-16'LAR ANKARA'DA ALÇAK UÇUŞ YAPIYOR", 'TBMM BOMBALANDI'];

export const LEVEL4 = {
    id: 4, name: '15 TEMMUZ', menuTitle: '4 · 15 TEMMUZ',
    desc: 'Darbeci askerleri ve askeri öğrencileri kelepçele: hepsi tutuklanıp götürülür! Sonunda FETÖ\'yle hasret giderilecek...',
    mission: "11 DARBECİYİ TUTUKLA, FETÖ'YÜ YAKALA!",
    music: '../chiptune_level3.mp3',
    sky: ['#020617', '#0c1445', '#1e3a8a'], fog: '#0b1433', hemi: ['#93c5fd', '#0f172a', 1.0], sun: ['#c7d2fe', 1.3],
    ground: { top: 'road', side: 'concrete', arena: 'concrete', rep: [16, 4] }, outer: 'concrete', noOuter: true, pitFloor: null,
    edge: { color: '#94a3b8', h: 1.1, w: 0.15 }, pitSign: 'KÖPRÜ KESİLDİ',
    segs: [[10, -34], [-37.5, -66], [-69.5, -104], [-107.5, -140], [-143.5, -184]],
    shelves: [
        [-3.5, T1, -12, 4, 2.4], [1.5, T2, -17, 3.5, 2.4], [4, T1, -27, 4, 2.4],
        [-4, T1, -50, 4, 2.4], [3, T1, -60, 4, 2.4], [3, T2, -64.5, 3.5, 2.4],
        [3, T1, -78, 4, 2.4], [4, T1, -96, 4, 2.4],
        [-3, T1, -114, 4, 2.4], [-3, T1, -130, 4, 2.4],
        [3, T1, -150, 4, 2.4], [-3, T1, -172, 4, 2.4],
        [-11, T1, -200, 5, 3], [11, T1, -222, 5, 3]
    ],
    // tank gövdesi ve kulesi (katı: üstüne çıkılır, düşmanlar içinden geçmez)
    solids: TANKS.flatMap(([x, z]) => [[x - 1.5, 0, z - 3, x + 1.5, HULL, z + 3, 'solid'], [x - 1, HULL, z - 1.4, x + 1, TURRET, z + 0.6, 'solid']]),
    items: [
        ...[[-3.5, T1, -12], [1.5, T2, -17], [-5, 0, -30], [3.5, HULL, -43.5], [3, T2, -64.5], [-3.5, TURRET, -85],
            [5, 0, -100], [-3, T1, -130], [3, T1, -150], [-3, T1, -172]].map(p => ['bag', ...p]),
        ['heart', -5, 0, -60], ['heart', 5, 0, -170]
    ],
    collect: { kind: 'bag', icon: '💰', name: 'Kul hakkı torbası', word: 'KUL HAKKI!' },
    brickRows: [[0, -24], [0, -92], [0, -136]],
    checkpointZ: -96,
    spawns: [
        ['soldier', 2, -20], ['cadet', -3, -28],
        ['shieldsoldier', -2, -42], ['soldier', 0, -56], ['gassoldier', -4, -62],
        ['cadet', -1, -76], ['soldier', 4, -90], ['shieldsoldier', 0, -100], ['tanksniper', -3.5, -84.4, TURRET],
        ['gassoldier', -4, -112], ['soldier', 0, -126], ['cadet', -4, -136], ['tanksniper', 3.5, -120.4, TURRET],
        ['shieldsoldier', 0, -150], ['soldier', 3, -166], ['cadet', -2, -178], ['tanksniper', -3.5, -158.4, TURRET]
    ],
    target: 11, cry: 'TUTUKLANDI!', ammo: 'cuffs', ammoName: 'KELEPÇE',
    gateWho: 'DARBECİ', gateColor: '#7f1d1d', gateOpen: "11 DARBECİ TUTUKLANDI! TANKLAR ÇEKİLDİ — FETÖ'YE GİT!",
    boss: (scene) => spawnFeto(scene, new THREE.Vector3(0, 0, -218)),
    outro: (scene) => peygamberOutro(scene),
    wonTitle: 'BÖLÜM 4 TAMAM!', wonNote: 'Darbe bastırıldı, darbeciler tutuklandı! Ama Reis o gece neredeydi?',
    buildGate(g) {   // iki tank yolu kapatmış
        [-4, 4].forEach(x => { const t = makeTank(); t.position.set(x, 0, -0.5); t.rotation.y = Math.PI * 0.02 * Math.sign(x); g.add(t); });
    },
    decorate
};

// Tank: kamuflajlı gövde, paletler, kule, namlu (+z yönüne bakar)
let tankCamo = null;
function makeTank() {
    tankCamo = tankCamo || canvasTex(64, 64, (g) => {
        g.fillStyle = '#4d5b2a'; g.fillRect(0, 0, 64, 64);
        const C = ['#36401c', '#6b7a3a', '#2b2f1a'];
        for (let i = 0; i < 20; i++) { g.fillStyle = C[i % 3]; g.beginPath(); g.ellipse(Math.random() * 64, Math.random() * 64, 5 + Math.random() * 8, 3 + Math.random() * 4, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
    }, { pixel: true });
    const cm = new THREE.MeshLambertMaterial({ map: tankCamo });
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.0, 6), cm); hull.position.y = 1.0; hull.castShadow = true; g.add(hull);
    [-1.35, 1.35].forEach(x => { const tr = box(0.6, 0.8, 6.2, '#1c1917', x, 0.4, 0); g.add(tr); for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.62, 10), mat('#374151')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, -2.3 + i * 1.15); g.add(w); } });
    const turret = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 2.2), cm); turret.position.set(0, 1.9, -0.4); turret.castShadow = true; g.add(turret);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.4, 8), mat('#2b2f1a')); gun.rotation.x = Math.PI / 2; gun.position.set(0, 1.95, 2.3); gun.castShadow = true; g.add(gun);
    g.add(box(0.3, 0.3, 0.3, '#1c1917', 0.5, 2.45, -0.6));
    return g;
}
function flagTex() {
    return canvasTex(96, 64, (g, W, H) => {
        g.fillStyle = '#e30a17'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(W * 0.37, H / 2, H * 0.25, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e30a17'; g.beginPath(); g.arc(W * 0.41, H / 2, H * 0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? H * 0.05 : H * 0.125, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(W * 0.56 + Math.cos(a) * r, H / 2 + Math.sin(a) * r); }
        g.closePath(); g.fill();
    });
}
function newsBoard(scene, x, z, rot, text) {
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
        c.fillStyle = '#4d5b2a'; c.fillRect(170, 80, 170, 50); c.fillRect(220, 60, 70, 24); c.fillRect(280, 66, 90, 8);   // tank
    });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.86), new THREE.MeshBasicMaterial({ map: t }));
    scr.position.set(0, 3.9, 0.12); g.add(scr);
}

// --- KÖPRÜNÜN YAYA YOLLARINDAKİ SAHNELER (oyun alanının dışında, arka plan) ---
// Köprünün iki yanında halatların dışında yaya yolu ve dış korkuluk. Sağda öfkeli kalabalık bir askeri öğrenciyi
// omuzlarında taşıyıp korkuluktan aşağı atar; solda başka bir kalabalık yere düşmüş askeri öğrenciyi sopalarla döver.
// İkisi de döngüyle tekrarlanır; kodla çizilmiş blok figürler.
const WALK0 = HW + 2.3, WALK1 = HW + 7.6;   // yaya yolunun iç ve dış kenarı (|x|)
function person(shirt, pants, skin = '#e0ac69', hair = '#1c1917') {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.11, 0.7, 0, 0.16, 0.68, 0.18, pants, '#111827');
    const legR = limb(body, 0.11, 0.7, 0, 0.16, 0.68, 0.18, pants, '#111827');
    const torso = new THREE.Group(); torso.position.y = 0.7; body.add(torso);
    torso.add(box(0.48, 0.6, 0.28, shirt, 0, 0.3, 0));
    const head = new THREE.Group(); head.position.y = 0.62; torso.add(head);
    head.add(box(0.32, 0.36, 0.3, skin, 0, 0.22, 0));
    head.add(box(0.34, 0.1, 0.32, hair, 0, 0.42, -0.01, false));
    head.add(box(0.2, 0.04, 0.02, '#7f1d1d', 0, 0.1, 0.155, false));   // bağıran ağız
    const armL = limb(torso, -0.31, 0.56, 0, 0.12, 0.5, 0.13, shirt);
    const armR = limb(torso, 0.31, 0.56, 0, 0.12, 0.5, 0.13, shirt);
    armL.add(box(0.1, 0.1, 0.1, skin, 0, -0.53, 0, false)); armR.add(box(0.1, 0.1, 0.1, skin, 0, -0.53, 0, false));
    return { root, body, legL, legR, armL, armR, torso, head };
}
function cadet() {   // askeri öğrenci: kamuflaj tonlarında üniforma, bordo bere
    const m = person('#4d5b2a', '#3a4520', '#e8b48f', '#3f2a1d');
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), mat('#7f1d1d'));
    b.scale.set(1.05, 0.5, 1); b.position.set(-0.02, 0.44, 0); m.head.add(b);
    return m;
}
const MOB = [['#1e40af', '#1f2937'], ['#f8fafc', '#374151'], ['#dc2626', '#111827'], ['#374151', '#1e3a8a'], ['#16a34a', '#292524'], ['#f59e0b', '#1f2937']];
function bridgeScenes(scene, W) {
    // yaya yolları ve dış korkuluklar (bütün köprü boyunca)
    const z0 = 98, z1 = ARENA.z0, len = z0 - z1, zc = (z0 + z1) / 2;
    [-1, 1].forEach(s => {
        const xm = s * (WALK0 + WALK1) / 2;
        scene.add(box(WALK1 - WALK0, 0.4, len, '#64748b', xm, -0.2, zc));
        scene.add(box(0.12, 1.1, len, '#94a3b8', s * WALK1, 0.55, zc));
        scene.add(box(0.12, 0.12, len, '#cbd5e1', s * WALK1, 1.12, zc, false));
        scene.add(box(0.1, 0.5, len, '#94a3b8', s * WALK0, 0.25, zc, false));
    });
    const reg = (g) => { scene.add(g); if (W.cull) W.cull.push({ o: g, x: g.position.x, z: g.position.z }); return g; };

    // SAĞ: askeri öğrenciyi köprüden atan kalabalık
    {
        const S = 1, base = new THREE.Group(); base.position.set(0, 0, 52); reg(base);
        base.position.x = S * (WALK0 + 1.6);
        const carriers = [0, 1, 2, 3].map(i => { const m = person(...MOB[i]); base.add(m.root); return m; });
        const watchers = [4, 5].map(i => { const m = person(...MOB[i]); base.add(m.root); m.root.position.set(-0.3 + i * 0.4, 0, (i - 4.5) * 2.6); return m; });
        const c = cadet(); base.add(c.root);
        const slots = [[-0.35, -0.55], [0.35, -0.55], [-0.35, 0.55], [0.35, 0.55]];
        const T = 10.5, run = WALK1 - WALK0 - 2.4;   // döngü süresi, kalabalığın korkuluğa yürüyeceği mesafe
        W.movers.push((dt, t) => {
            const k = t % T;
            let gx = 0, lift = 1.95, cx = 0, cy = 0, cRot = 0, fall = false;
            if (k < 3.2) { gx = run * k / 3.2; }                                        // taşıyarak korkuluğa
            else if (k < 3.9) { gx = run; lift = 1.95 + (k - 3.2) / 0.7 * 0.9; }        // havaya kaldır
            else if (k < 7) { gx = run; fall = true; }                                   // at, bağırarak izle
            else { gx = run * (1 - (k - 7) / 3.5); }                                     // geri dön
            carriers.forEach((m, i) => {
                m.root.position.set(gx + slots[i][0], 0, slots[i][1]); m.root.rotation.y = S * Math.PI / 2;
                const walking = k < 3.2 || k >= 7;
                walkPose(m, t * 9 + i, walking ? 1 : 0);
                const up = k < 3.9 ? -2.9 : -3.0 + Math.sin(t * 10 + i) * 0.35;           // eller yukarıda: taşır / bağırır
                m.armL.rotation.x = up; m.armR.rotation.x = up + (k >= 3.9 && k < 7 ? Math.sin(t * 12 + i) * 0.4 : 0);
                if (k >= 7) { m.root.rotation.y = -S * Math.PI / 2; m.armL.rotation.x = m.armR.rotation.x = 0; }
            });
            watchers.forEach((m, i) => { m.root.rotation.y = S * Math.PI / 2 - 0.4 + i * 0.8; m.armR.rotation.x = -2.8 + Math.sin(t * 8 + i) * 0.3; m.armL.rotation.x = -2.6 + Math.cos(t * 8 + i) * 0.3; });
            if (!fall) {
                c.root.visible = k < 7 || k > 10;
                c.root.position.set(gx, lift - 0.25, 0); c.root.rotation.set(0, S * Math.PI / 2, S * Math.PI / 2); c.body.rotation.x = 0;
                c.legL.rotation.x = Math.sin(t * 14) * 0.6; c.legR.rotation.x = -Math.sin(t * 14) * 0.6;   // çırpınır
                c.armL.rotation.x = Math.sin(t * 13) * 0.8; c.armR.rotation.x = -Math.sin(t * 13) * 0.8;
                if (k >= 10) c.root.visible = false;
            } else {
                const ft = k - 3.9, edge = (WALK1 - WALK0 - 1.6) + 0.6;
                cx = Math.min(run + 2.6 * ft, edge + 2.6 * ft); cy = lift - 0.25 + 3 * ft - 0.5 * 18 * ft * ft;
                c.root.visible = cy > -36;
                c.root.position.set(Math.max(gx, cx), cy, 0); cRot = ft * 5;
                c.root.rotation.set(cRot, S * Math.PI / 2, S * Math.PI / 2);
                c.armL.rotation.x = -2.8; c.armR.rotation.x = -2.6; c.legL.rotation.x = 0.4; c.legR.rotation.x = -0.4;
            }
        });
    }
    // SOL: yerdeki askeri öğrenciyi sopalarla döven kalabalık
    {
        const S = -1, base = new THREE.Group(); base.position.set(S * ((WALK0 + WALK1) / 2), 0, 30); reg(base);
        const c = cadet(); base.add(c.root);
        c.root.position.set(0, 0.25, 0); c.body.rotation.x = -Math.PI / 2 + 0.15; c.root.rotation.y = 0.4;
        c.armL.rotation.x = -2.6; c.armR.rotation.x = -2.9;   // kollarıyla başını korur
        const ring = [0, 1, 2, 4, 5].map((mi, i) => {
            const m = person(...MOB[mi]); base.add(m.root);
            const a = i / 5 * Math.PI * 2 + 0.3, r = 1.25;
            m.root.position.set(Math.cos(a) * r * 0.9, 0, Math.sin(a) * r * 1.4);
            m.root.rotation.y = Math.atan2(-m.root.position.x, -m.root.position.z);
            const stick = new THREE.Group(); stick.position.y = -0.52; m.armR.add(stick);
            const st = box(0.06, 1.1, 0.06, '#78350f', 0, -0.05, 0.45); st.rotation.x = Math.PI / 2 - 0.2; stick.add(st);
            return m;
        });
        W.movers.push((dt, t) => {
            ring.forEach((m, i) => {
                const ph = (t * 2.6 + i * 0.37) % 1;   // sopayı kaldır (yavaş) - indir (hızlı)
                m.armR.rotation.x = ph < 0.7 ? -0.3 - 2.6 * (ph / 0.7) : -2.9 + 2.6 * ((ph - 0.7) / 0.3);
                m.armL.rotation.x = -0.6 + Math.sin(t * 6 + i) * 0.4;
                m.body.rotation.x = ph >= 0.7 ? 0.25 : 0.05;
                m.body.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.04;
            });
            c.body.position.y = Math.abs(Math.sin(t * 16)) * 0.04; c.legL.rotation.x = 0.8 + Math.sin(t * 7) * 0.2; c.legR.rotation.x = 1.0;
        });
    }
}

function decorate(scene, W) {
    // Çok aşağıda deniz (ay ışığı yansıması) ve iki kıyının ışıkları
    const seaTex = canvasTex(128, 128, (g) => {
        g.fillStyle = '#0b1433'; g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 60; i++) { g.fillStyle = ['#13224d', '#1e3a8a', '#fde68a44'][i % 3]; g.fillRect(Math.random() * 128 | 0, Math.random() * 128 | 0, 8 + Math.random() * 14 | 0, 2); }
    }, { repeat: [40, 40], pixel: true });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshLambertMaterial({ map: seaTex }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -35, -100); scene.add(sea);
    W.movers.push((dt) => { seaTex.offset.y += dt * 0.03; });
    const lights = canvasTex(256, 64, (g, Wd, H) => {
        g.fillStyle = '#050a1c'; g.fillRect(0, 0, Wd, H);
        for (let i = 0; i < 400; i++) { g.fillStyle = Math.random() < 0.8 ? '#fde68a' : '#f8fafc'; g.fillRect(Math.random() * Wd | 0, H * 0.3 + Math.random() * H * 0.7 | 0, 1, 1); }
    }, { repeat: [6, 1], pixel: true });
    [-1, 1].forEach(s => {
        const shore = new THREE.Mesh(new THREE.PlaneGeometry(600, 45), new THREE.MeshBasicMaterial({ map: lights, fog: true }));
        shore.position.set(s * 125, -14, -100); shore.rotation.y = -s * Math.PI / 2; scene.add(shore);
    });
    const moon = new THREE.Mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshBasicMaterial({ color: '#fef9c3', fog: false }));
    moon.position.set(-60, 70, -140); moon.lookAt(0, 0, 0); scene.add(moon);

    // Köprü: kuleler, ana halatlar, askılar, lambalar
    const steel = mat('#7b8794'), cableM = mat('#cbd5e1');
    const TOWERS = [-20, -150], TOP = 44;
    TOWERS.forEach(tz => {
        [-1, 1].forEach(s => {
            scene.add(box(2, TOP + 35, 3, steel, s * (HW + 1.6), (TOP - 35) / 2, tz));
            const red = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: '#ef4444' })); red.position.set(s * (HW + 1.6), TOP + 0.4, tz); scene.add(red);
        });
        [12, 28, TOP - 1].forEach(y => scene.add(box(HW * 2 + 5, 1.6, 2.2, steel, 0, y, tz)));
    });
    [-1, 1].forEach(s => {
        const x = s * (HW + 1.6), pts = [];
        const yAt = z => {
            if (z > TOWERS[0]) return 3 + (TOP - 3) * (1 - (z - TOWERS[0]) / 60);
            if (z < TOWERS[1]) return 3 + (TOP - 3) * (1 - (TOWERS[1] - z) / 34);
            const u = (TOWERS[0] - z) / (TOWERS[0] - TOWERS[1]);
            return TOP - (TOP - 5) * (1 - Math.pow(2 * u - 1, 2));
        };
        for (let z = 40; z >= ARENA.z0; z -= 4) pts.push(new THREE.Vector3(x, Math.max(3, yAt(z)), z));
        scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.3, 6), cableM));
        for (let z = 36; z > ARENA.z0; z -= 6) { const y = Math.max(3, yAt(z)); if (y > 3.2) scene.add(box(0.06, y - 1.1, 0.06, '#e2e8f0', x, (y + 1.1) / 2, z, false)); }
    });
    for (let z = 6; z > ARENA.z0; z -= 15) [-1, 1].forEach(s => {
        scene.add(box(0.12, 4.6, 0.12, '#475569', s * (HW + 0.4), 2.3, z));
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: '#fde68a' })); l.position.set(s * (HW - 0.1), 4.6, z); scene.add(l);
    });
    // Yoldaki tanklar (katı kutuları level verisinde)
    TANKS.forEach(([x, z]) => { const t = makeTank(); t.position.set(x, 0, z); scene.add(t); });

    // Bayraklı kalabalık (başlangıçta yolun kenarında ve meydanın kenarlarında): gövde, kafa, sallanan bayrak
    const spots = [];
    for (let i = 0; i < 14; i++) spots.push([(i % 2 ? 1 : -1) * rand(5.5, 7.4), rand(-6, 6)]);
    for (let i = 0; i < 26; i++) { const s = i % 2 ? 1 : -1; spots.push([s * rand(ARENA.hw - 2.5, ARENA.hw - 0.8), rand(ARENA.z1 + 3, ARENA.z0 - 4)]); }
    const n = spots.length;
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.3, 0.3), mat('#cbd5e1'), n);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.34, 0.3), mat('#e0ac69'), n);
    const flags = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshLambertMaterial({ map: flagTex(), side: THREE.DoubleSide }), n);
    const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), mat('#78350f'), n);
    const shirt = ['#1e40af', '#f8fafc', '#dc2626', '#374151', '#16a34a', '#f59e0b'];
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
    spots.forEach(([x, z], i) => {
        const r = Math.atan2(-x, 0.0001);
        Q.setFromAxisAngle(UP, r);
        M.compose(P.set(x, 0.65, z), Q, S); bodies.setMatrixAt(i, M); bodies.setColorAt(i, C.set(shirt[i % shirt.length]));
        M.compose(P.set(x, 1.5, z), Q, S); heads.setMatrixAt(i, M);
        M.compose(P.set(x + 0.3, 1.9, z), Q, S); poles.setMatrixAt(i, M);
    });
    scene.add(bodies, heads, poles, flags);
    W.movers.push((dt, t) => {
        spots.forEach(([x, z], i) => {
            Q.setFromAxisAngle(UP, Math.sin(t * 3 + i) * 0.5 + Math.PI / 2);
            M.compose(P.set(x + 0.3, 2.35 + Math.sin(t * 6 + i) * 0.05, z), Q, S); flags.setMatrixAt(i, M);
        });
        flags.instanceMatrix.needsUpdate = true;
    });

    // Alçak uçan F-16'lar: arada bir tepeden gürültüyle geçer
    const jet = new THREE.Group(); scene.add(jet);
    jet.add(box(0.9, 0.8, 7, '#64748b', 0, 0, 0)); jet.add(box(7, 0.15, 2.2, '#64748b', 0, 0, -0.6)); jet.add(box(2.6, 0.12, 1.1, '#64748b', 0, 0.1, -3));
    jet.add(box(0.15, 1.6, 1.4, '#64748b', 0, 0.9, -3)); jet.add(box(0.6, 0.5, 1.4, '#1e293b', 0, 0.45, 1.6));
    const burn = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial({ color: '#fb923c' })); burn.position.z = -3.7; jet.add(burn);
    let jt = 6, jx = 0, roared = false;
    W.movers.push((dt) => {
        jt -= dt;
        const p = G.player && G.player.pos;
        if (jt < 0 && p) { jt = rand(11, 16); jx = rand(-12, 12); jet.userData.z = p.z + 90; roared = false; }
        if (jet.userData.z !== undefined) {
            jet.userData.z -= dt * 70;
            jet.position.set(jx, 26, jet.userData.z); jet.rotation.set(0, Math.PI, Math.sin(G.time * 2) * 0.15);
            if (!roared && p && Math.abs(jet.userData.z - p.z) < 20) { roared = true; playSfx('boom', { rate: 0.35, vol: 0.3 }); }
            if (p && jet.userData.z < p.z - 160) jet.userData.z = undefined;
        }
        jet.visible = jet.userData.z !== undefined;
    });

    bridgeScenes(scene, W);

    // Son dakika ekranları, giriş tabelası
    [[1, -12], [-1, -70], [1, -134]].forEach(([s, z], i) => newsBoard(scene, s * (HW + 2.4), z, -s * Math.PI / 2 * 0.7, NEWS[i % NEWS.length]));
    entrySign(scene, '15 TEMMUZ ŞEHİTLER KÖPRÜSÜ', '#7f1d1d');

    // Meydanın arkasında cami: kubbe, dört minare (şerefeleri ışıklı)
    {
        const z = ARENA.z1 - 16;
        scene.add(box(30, 12, 22, '#e2e8f0', 0, 6, z));
        const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#94a3b8')); dome.position.set(0, 12, z); scene.add(dome);
        [[-15, 11], [15, 11], [-15, -11], [15, -11]].forEach(([dx, dz]) => {
            const mn = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 34, 10), mat('#f1f5f9')); mn.position.set(dx, 17, z + dz); scene.add(mn);
            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4, 10), mat('#94a3b8')); cap.position.set(dx, 36, z + dz); scene.add(cap);
            [22, 29].forEach(y => { const r = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.4, 12), new THREE.MeshBasicMaterial({ color: '#fde68a' })); r.position.set(dx, y, z + dz); scene.add(r); });
        });
    }
}
