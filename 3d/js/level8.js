// HIRHIZ 3D — 8. BÖLÜM: PENSİLVANYA (FETÖ: SON)
// Saylorsburg'daki çiftlik evinin bahçesi (bahar): çimenler, çiçek tarhları, şimşir çitler, süs havuzu, kameriyeler, ahşap evler, kırmızı ahır.
// Düşmanların hepsi ABİ (abiler.js): kitap atar, tesbih boyna asılıp patlar, takke bomba gibi düşer. Kameriyelerin üstünde kitapçı abiler.
// Arka planda canlı sahneler (decor.js): başörtülü ablalar seyreder, aileler piknik yapar, cemaat namaz kılar, bir vaiz vaaz verir.
// Çiftliğin kapısı açılınca bahçede FETÖ: SON — tümsekli, raflı meydanda kovalar, raflara kolayca zıplar.
// Yenilince mezara girer (outro.js graveOutro): "FETÖ öldü ve mezara girdi!"
import * as THREE from 'three';
import { G } from './state.js?v=27';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=27';
import { T1, T2, HW, ARENA, signBoard, entrySign } from './world.js?v=27';
import { spawnFeto } from './boss_feto.js?v=27';
import { graveOutro } from './outro.js?v=27';
import { Batch, crowd, poseCycle, bubbleTalk, looks, HOLD, mat4, pick } from './decor.js?v=27';
import './abiler.js?v=27';

const STANDS = [-48, -118], STAND_X = 4.5, DECK = 2.6;
// Meydanda tümsekler (engebe): [x, z, en, boy, yükseklik]; üstlerine çıkılır, FETÖ de zıplar
const MOUNDS = [[-7, -195, 3.6, 3.4, 0.8], [7.5, -207, 3.2, 4, 1.0], [-3.5, -219, 3, 3, 0.6], [13, -195, 3, 3, 0.7], [-13.5, -221, 3, 3.4, 0.9], [5, -230, 4, 2.6, 0.7], [-8, -231, 3, 2.6, 1.1]];
// Bahçedeki sahneler (yolun dışında; evler buralarda açılır)
const SCENES = { picnic1: [-1, -24], namaz1: [1, -38], vaaz: [-1, -76], picnic2: [1, -98], namaz2: [-1, -146], picnic3: [1, -160] };

export const LEVEL8 = {
    id: 8, name: 'PENSİLVANYA', menuTitle: '8 · PENSİLVANYA',
    desc: 'Çiftlik evinin bahçesi! Abileri geç: kitap atarlar, tesbih boynuna asılıp patlar, takke bomba gibi düşer. Sonra FETÖ: SON!',
    mission: 'ÇİFTLİK EVİNİN BAHÇESİNE GİR!',
    music: '../chiptune_level1.mp3',
    sky: ['#3b82f6', '#93c5fd', '#e0f2fe'], fog: '#dbeafe', hemi: ['#f0f9ff', '#4d7c0f', 1.35], sun: ['#fff7ed', 1.9],
    ground: { top: 'cobble', side: 'dirt', arena: 'grass' }, outer: 'grass', outerRep: 4, pitFloor: '#1e3a8a',
    edge: { color: '#166534', h: 0.8, w: 0.45 }, pitSign: 'SÜS HAVUZU',
    segs: [[10, -30], [-33.5, -64], [-67.5, -100], [-103.5, -138], [-141.5, -184]],
    shelves: [
        [-4, T1, -9, 3.5, 2.4], [-1, T2, -13.5, 3.5, 2.4], [2.5, T1, -18, 3.5, 2.4], [5, T2, -22.5, 3, 2.4],
        [-3, T1, -40, 4, 2.4], [1, T2, -45, 3.5, 2.4], [-3.5, T1, -56, 4, 2.4],
        [3, T1, -72, 4, 2.4], [-1, T2, -77, 3.5, 2.4], [-5, T1, -82, 3.5, 2.4], [2, T1, -93, 4, 2.4],
        [-4, T1, -108, 4, 2.4], [0, T2, -112.5, 3.5, 2.4], [4, T1, -128, 4, 2.4], [0, T2, -132.5, 3.5, 2.4],
        [-3, T1, -150, 4, 2.4], [1, T2, -155, 3.5, 2.4], [5, T1, -160, 3, 2.4], [-2, T1, -172, 4, 2.4],
        // FETÖ meydanı: daha çok raf (iniş-çıkış, kaçış yolları)
        [-11, T1, -198, 5, 3], [11, T1, -204, 5, 3], [0, T2, -214, 4, 2.4], [-10, T1, -226, 5, 3], [10, T1, -226, 5, 3],
        [-4.5, T1, -205, 3, 2.4], [4.5, T1, -220, 3, 2.4], [-15, T2, -212, 3, 2.4], [15, T2, -216, 3, 2.4], [0, T1, -232, 4, 2.4]
    ],
    solids: [
        ...STANDS.map(z => [STAND_X - 1.1, DECK - 0.3, z - 1.1, STAND_X + 1.1, DECK, z + 1.1]),   // kameriyelerin döşemesi
        ...MOUNDS.map(([x, z, w, d, h]) => [x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, 'solid'])
    ],
    items: [
        ...[[-1, T2, -13.5], [5, T2, -22.5], [1, T2, -45], [STAND_X - 0.6, DECK, -47.6], [-1, T2, -77], [-5, 0, -96],
            [0, T2, -112.5], [STAND_X - 0.6, DECK, -117.6], [0, T2, -132.5], [1, T2, -155]].map(p => ['bag', ...p]),
        ['heart', -5, 0, -60], ['heart', 4, 0, -146]
    ],
    collect: { kind: 'bag', icon: '💰', name: 'Kul hakkı torbası', word: 'KUL HAKKI!' },
    brickRows: [[0, -28], [-3, -88], [3, -122], [-2, -166]],
    checkpointZ: -102,
    spawns: [
        ['abi_kitap', 2, -26], ['abi_tesbih', -2, -34],
        ['abi_takke', 3, -50], ['abi_kitap', -4, -60], ['abi_kule', STAND_X, STANDS[0] - 0.3, DECK],
        ['abi_tesbih', 0, -74], ['abi_kitap', 4, -86], ['abi_takke', -3, -96],
        ['abi_kitap', 3, -110], ['abi_tesbih', -1, -124], ['abi_kule', STAND_X, STANDS[1] - 0.3, DECK],
        ['abi_takke', 3, -142], ['abi_kitap', -3, -158], ['abi_tesbih', 2, -170], ['abi_takke', 0, -178]
    ],
    target: 11, cry: 'İTİRAFÇI OLDU!', ammo: 'bribe', ammoName: 'RÜŞVET',
    gateWho: 'ABİ', gateColor: '#7c2d12', gateOpen: '11 ABİ GEÇİLDİ! ÇİFTLİĞİN KAPISI AÇILDI — FETÖ\'YE GİT!',
    boss: (scene) => spawnFeto(scene, new THREE.Vector3(0, 0, -222), { son: true }),
    outro: (scene) => graveOutro(scene),
    wonTitle: 'BÖLÜM 8 TAMAM!', wonNote: 'FETÖ öldü ve mezara girdi! Sıra dağda: Selo ve teröristler!',
    buildGate(g) {   // çiftliğin beyaz bahçe çiti ve kapısı, "PRIVATE PROPERTY" tabelaları
        for (let i = 0; i < 9; i++) g.add(box(0.22, 2.4, 0.22, '#f8fafc', -HW + 0.4 + i * (HW * 2 - 0.8) / 8, 1.2, 0));
        [0.6, 1.4, 2.1].forEach(y => g.add(box(HW * 2, 0.16, 0.1, '#e5e7eb', 0, y, 0.1)));
        [-1, 1].forEach(s => { const sg = signBoard('PRIVATE PROPERTY', '#fef2f2', '#991b1b', 2.6, 0.5); sg.position.set(s * 5, 1.9, 0.25); g.add(sg); });
        for (let i = 0; i < 16; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), mat(['#f43f5e', '#facc15', '#a855f7', '#f8fafc'][i % 4])); f.position.set(-HW + 0.5 + i * (HW * 2 - 1) / 15, 2.45, 0.15); g.add(f); }   // çitte sarmaşık çiçekleri
    },
    decorate
};

function decorate(scene, W) {
    const sceneNear = (z, r) => Object.values(SCENES).some(([, sz]) => Math.abs(z - sz) < r);
    // --- Ağaçlar: çamlar (karsız) ve yuvarlak taçlı meyve ağaçları ---
    const pines = [], round = [];
    for (let z = 14; z > -300; z -= 5) [-1, 1].forEach(s => {
        const arena = z < ARENA.z0 + 4, edge = arena ? ARENA.hw : HW;
        if (Math.random() < 0.5 && !sceneNear(z, 9)) (Math.random() < 0.5 ? pines : round).push([s * (edge + rand(2, 5)), z + rand(-2, 2), rand(0.8, 1.3)]);
        if (Math.random() < 0.6) (Math.random() < 0.6 ? pines : round).push([s * (edge + rand(17, 34)), z + rand(-2, 2), rand(1, 1.8)]);
    });
    for (let x = -ARENA.hw; x < ARENA.hw; x += 4) pines.push([x + rand(-1, 1), ARENA.z1 - rand(4, 8), rand(1, 1.6)]);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
    const inst = (geo, m, list, fn) => { const im = new THREE.InstancedMesh(geo, m, list.length); list.forEach((t, i) => { fn(t, i); im.setMatrixAt(i, M); }); im.castShadow = true; scene.add(im); return im; };
    inst(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), mat('#5b3a1e'), pines, ([x, z, s]) => M.compose(P.set(x, 0.8 * s, z), Q, S.set(s, s, s)));
    inst(new THREE.ConeGeometry(1.5, 2.6, 8), mat('#14532d'), pines, ([x, z, s]) => M.compose(P.set(x, 2.6 * s, z), Q, S.set(s, s, s)));
    inst(new THREE.ConeGeometry(1.1, 2.2, 8), mat('#166534'), pines, ([x, z, s]) => M.compose(P.set(x, 3.9 * s, z), Q, S.set(s, s, s)));
    inst(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 6), mat('#6b4423'), round, ([x, z, s]) => M.compose(P.set(x, 1.1 * s, z), Q, S.set(s, s, s)));
    inst(new THREE.IcosahedronGeometry(1.6, 1), mat('#4d7c0f', { flatShading: true }), round, ([x, z, s]) => M.compose(P.set(x, 3.1 * s, z), Q, S.set(s * 1.1, s * 0.95, s * 1.1)));
    // meyveler / çiçekli ağaçlar (kırmızı-pembe noktalar)
    const fruit = []; round.forEach(([x, z, s]) => { for (let k = 0; k < 5; k++) fruit.push([x + rand(-1.3, 1.3) * s, 3.1 * s + rand(-0.8, 1) * s, z + rand(-1.3, 1.3) * s]); });
    inst(new THREE.SphereGeometry(0.16, 6, 4), mat('#ef4444'), fruit, ([x, y, z]) => M.compose(P.set(x, y, z), Q, S.set(1, 1, 1)));
    // --- Çiçek tarhları (yolun iki yanında) ---
    const flowers = [], FC = ['#f43f5e', '#facc15', '#a855f7', '#f8fafc', '#fb923c'];
    for (let z = 10; z > ARENA.z0; z -= 1.1) [-1, 1].forEach(s => { if (Math.random() < 0.8) flowers.push([s * (HW + rand(0.6, 1.6)), z + rand(-0.4, 0.4), Math.floor(Math.random() * FC.length)]); });
    FC.forEach((c, ci) => { const L = flowers.filter(f => f[2] === ci); inst(new THREE.SphereGeometry(0.14, 6, 4), mat(c), L, ([x, z]) => M.compose(P.set(x, 0.35, z), Q, S.set(1, 0.8, 1))); });
    inst(new THREE.BoxGeometry(0.1, 0.3, 0.1), mat('#15803d'), flowers, ([x, z]) => M.compose(P.set(x, 0.15, z), Q, S.set(1, 1, 1)));
    // --- Ahşap evler ve kırmızı ahır (sahne yerlerinde açılır) ---
    const logTex = canvasTex(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#a16207' : '#92400e'; g.fillRect(0, i * 8, 64, 8); } g.fillStyle = '#e0f2fe'; g.fillRect(20, 20, 14, 14); g.fillStyle = '#f8fafc'; g.fillRect(26, 20, 2, 14); g.fillRect(20, 26, 14, 2); }, { repeat: [1, 1], pixel: true });
    const house = (x, z, w, d, h, rot, barn) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
        const t = logTex.clone(); t.repeat.set(w / 3, h / 3); t.needsUpdate = true;
        const wallM = barn ? mat('#991b1b') : new THREE.MeshLambertMaterial({ map: t });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM); b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
        const r = (d / 2 + 0.4) / 0.866, rg = new THREE.CylinderGeometry(r, r, w + 0.6, 3, 1);
        rg.rotateX(-Math.PI / 2); rg.rotateY(Math.PI / 2);
        const roof = new THREE.Mesh(rg, mat(barn ? '#44403c' : '#365314')); roof.scale.y = 0.45; roof.position.y = h + r * 0.5 * 0.45; roof.castShadow = true; g.add(roof);
        if (barn) { g.add(box(w * 0.4, h * 0.6, 0.1, '#f8fafc', 0, h * 0.3, d / 2 + 0.05, false)); g.add(box(0.15, h * 0.6, 0.12, '#991b1b', 0, h * 0.3, d / 2 + 0.07, false)); }
        else { g.add(box(0.8, 3, 0.8, '#57534e', w * 0.3, h + 1, 0, false)); g.add(box(w * 0.9, 0.2, 1.6, '#78350f', 0, 0.1, d / 2 + 0.8, false)); }   // baca, veranda
    };
    for (let z = 4; z > ARENA.z0; z -= 24) {
        const zr = z - rand(0, 6), zl = z - 12 - rand(0, 6);
        if (!sceneNear(zr, 14)) house(HW + rand(14, 18), zr, rand(7, 10), 6, rand(3.5, 5), rand(-0.3, 0.3), Math.random() < 0.3);
        if (!sceneNear(zl, 14)) house(-HW - rand(14, 18), zl, rand(7, 10), 6, rand(3.5, 5), rand(-0.3, 0.3), Math.random() < 0.3);
    }
    // Çiftlik evi (meydanın arkasında): "GOLDEN GENERATION RETREAT CENTER"
    {
        const z = ARENA.z1 - 14;
        house(0, z, 30, 10, 7, 0, false);
        const s = signBoard('GOLDEN GENERATION RETREAT CENTER', '#fef3c7', '#14532d', 16, 1.4); s.position.set(0, 8.6, z + 5.2); scene.add(s);
        house(-24, z + 4, 12, 8, 6, 0.3, true);
    }
    // --- Kameriyeler (üstünde kitapçı abi; döşemeye zıplanır) ---
    STANDS.forEach(z => {
        [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([dx, dz]) => scene.add(box(0.16, DECK + 2.2, 0.16, '#f8fafc', STAND_X + dx, (DECK + 2.2) / 2, z + dz)));
        scene.add(box(2.2, 0.3, 2.2, '#a16207', STAND_X, DECK - 0.15, z));
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), mat('#9a3412', { flatShading: true })); roof.position.set(STAND_X, DECK + 2.8, z); roof.rotation.y = Math.PI / 4; scene.add(roof);
        [-1, 1].forEach(s => scene.add(box(2.2, 0.08, 0.06, '#f8fafc', STAND_X, DECK + 0.6, z + s * 1.0, false)));   // korkuluk
        const sign = signBoard('KAMERİYE', '#f8fafc', '#14532d', 1.8, 0.4); sign.position.set(STAND_X, DECK - 0.55, z + 1.12); scene.add(sign);
    });
    // --- Süs havuzu ve fıskiye (girişte, solda) ---
    {
        const x = -HW - 6, z = -8;
        const pool = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.5, 20), mat('#d6d3d1')); pool.position.set(x, 0.25, z); scene.add(pool);
        const water = new THREE.Mesh(new THREE.CircleGeometry(2.35, 20), new THREE.MeshLambertMaterial({ color: '#38bdf8' })); water.rotation.x = -Math.PI / 2; water.position.set(x, 0.51, z); scene.add(water);
        scene.add(box(0.3, 1.4, 0.3, '#e7e5e4', x, 0.9, z));
        const jets = []; for (let i = 0; i < 14; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), new THREE.MeshBasicMaterial({ color: '#bae6fd' })); scene.add(d); jets.push({ d, ph: i / 14 }); }
        W.movers.push((dt, t) => jets.forEach(j => { const k = (t * 0.8 + j.ph) % 1, a = j.ph * Math.PI * 2; j.d.position.set(x + Math.cos(a) * k * 1.6, 1.6 + k * 2.2 - k * k * 3.4, z + Math.sin(a) * k * 1.6); }));
    }
    // --- CANLI SAHNELER ---
    const side = (s, off) => s * (HW + off);
    picnic(scene, W, side(SCENES.picnic1[0], 7), SCENES.picnic1[1]);
    picnic(scene, W, side(SCENES.picnic2[0], 7), SCENES.picnic2[1]);
    picnic(scene, W, side(SCENES.picnic3[0], 7), SCENES.picnic3[1]);
    namaz(scene, W, side(SCENES.namaz1[0], 8), SCENES.namaz1[1], 4, 3);
    namaz(scene, W, side(SCENES.namaz2[0], 8), SCENES.namaz2[1], 5, 2);
    vaaz(scene, W, side(SCENES.vaaz[0], 8.5), SCENES.vaaz[1]);
    // başörtülü ablalar: yol kenarında seyirci (sırayla alkışlar, el sallar)
    [[1, -14], [-1, -50], [1, -66], [-1, -112], [1, -130], [-1, -172]].forEach(([s, z], i) => ablalar(scene, W, s, z, i));
    [-1, 1].forEach((s, i) => ablalar(scene, W, s, -205, 6 + i, ARENA.hw + 1.8, 9));
    // --- Meydanın tümsekleri: çimenli, kenarları toprak ---
    const mb = new Batch(), MM = mat4(0, 0, 0);
    MOUNDS.forEach(([x, z, w, d, h]) => {
        mb.box(MM, w, h - 0.12, d, '#7c5a3a', x, (h - 0.12) / 2, z);
        mb.box(MM, w + 0.1, 0.14, d + 0.1, '#4d7c0f', x, h - 0.06, z);
        for (let k = 0; k < 4; k++) mb.box(MM, 0.14, 0.14, 0.14, FC[k], x + rand(-w / 2 + 0.3, w / 2 - 0.3), h + 0.07, z + rand(-d / 2 + 0.3, d / 2 - 0.3));
    });
    scene.add(mb.mesh());
    // Posta kutuları ve tabelalar
    [[HW + 1.2, -4], [-HW - 1.2, -66], [HW + 1.2, -140]].forEach(([x, z]) => {
        scene.add(box(0.1, 1.1, 0.1, '#5b3a1e', x, 0.55, z));
        scene.add(box(0.3, 0.3, 0.55, '#1f2937', x, 1.25, z)); scene.add(box(0.05, 0.25, 0.04, '#dc2626', x + 0.17, 1.4, z + 0.15, false));
    });
    const road = signBoard('SAYLORSBURG, PA', '#f8fafc', '#166534', 3.6, 0.8); road.position.set(-HW - 2, 2.2, -20); road.rotation.y = Math.PI / 2 * 0.7; scene.add(road);
    scene.add(box(0.12, 2, 0.12, '#9ca3af', -HW - 2, 1, -20));
    entrySign(scene, 'PENSİLVANYA', '#14532d');
}

// Piknik: kareli örtü, semaver, sepet; ailece oturanlar, top oynayan çocuk
function picnic(scene, W, x, z) {
    const b = new Batch(), M = mat4(0, 0, 0);
    const cloth = canvasTex(64, 64, (c) => { for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) { c.fillStyle = (i + k) % 2 ? '#dc2626' : '#f8fafc'; c.fillRect(i * 8, k * 8, 8, 8); } }, { pixel: true });
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), new THREE.MeshLambertMaterial({ map: cloth })); cm.rotation.x = -Math.PI / 2; cm.position.set(x, 0.04, z); scene.add(cm);
    b.box(M, 0.3, 0.5, 0.3, '#d4d4d8', x + 0.6, 0.29, z - 0.3); b.box(M, 0.16, 0.12, 0.16, '#a1a1aa', x + 0.6, 0.6, z - 0.3);   // semaver
    b.box(M, 0.5, 0.3, 0.35, '#a16207', x - 0.8, 0.19, z + 0.6);                                                                   // sepet
    for (let i = 0; i < 5; i++) b.box(M, 0.06, 0.1, 0.06, '#b45309', x - 0.4 + i * 0.2, 0.09, z - 0.2);                              // çay bardakları
    b.box(M, 0.6, 0.06, 0.4, '#fde68a', x + 0.1, 0.07, z + 0.4);                                                                   // börek tepsisi
    scene.add(b.mesh());
    const ppl = [
        { ...looks.man(), pose: 'sit', x: x - 1.9, z: z - 0.3, yaw: Math.PI / 2, hold: HOLD.cup },
        { ...looks.woman(), pose: 'sit', x: x + 1.9, z: z + 0.2, yaw: -Math.PI / 2, hold: HOLD.cup },
        { ...looks.woman(), pose: 'sit', x: x - 0.3, z: z + 1.7, yaw: Math.PI },
        { ...looks.man(), pose: 'sit', x: x + 0.4, z: z - 1.7, yaw: 0, hold: HOLD.phone }
    ];
    poseCycle(scene, W, ppl, ['sit', o => o.hold === HOLD.cup ? 'kneel' : 'sit', 'sit'], [3, 1.4, 2.2], { offset: rand(0, 3) });
    // top oynayan çocuk (zıplar)
    const kid = crowd(scene, [{ ...looks.man(), s: 0.6, x: x + 2.8, z: z + 2, yaw: -2.4, pose: 'cheer', beard: null, mustache: null }]);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat('#f97316')); scene.add(ball);
    const ph = rand(0, 6);
    W.movers.push((dt, t) => { kid.position.y = Math.abs(Math.sin(t * 3 + ph)) * 0.3; ball.position.set(x + 2.2, 0.16 + Math.abs(Math.sin(t * 3 + ph + 1.5)) * 1.4, z + 1.4); });
}
// Cemaatle namaz: seccadeler, imam önde; kıyam → rükû → kıyam → secde → oturuş → secde → oturuş
function namaz(scene, W, x, z, cols, rows) {
    const b = new Batch(), M = mat4(0, 0, 0), qibla = x > 0 ? -Math.PI / 2 : Math.PI / 2, dir = x > 0 ? -1 : 1;
    const list = [];
    for (let r = 0; r <= rows; r++) {
        const n = r === 0 ? 1 : cols;
        for (let c = 0; c < n; c++) {
            const px = x + dir * (r === 0 ? 1.6 : -r * 1.5 + 1.6), pz = z + (n === 1 ? 0 : (c - (n - 1) / 2) * 0.95);
            b.box(M, 1.3, 0.03, 0.75, r === 0 ? '#7f1d1d' : ['#166534', '#1e3a8a', '#7c2d12', '#065f46'][(r + c) % 4], px + dir * 0.35, 0.02, pz);
            list.push({ ...looks.cemaat(), x: px, z: pz, yaw: qibla });
        }
    }
    scene.add(b.mesh());
    poseCycle(scene, W, list, ['stand', 'ruku', 'stand', 'secde', 'kneel', 'secde', 'kneel'], [4, 2.2, 1.2, 2, 1.2, 2, 3], { offset: rand(0, 5) });
    bubbleTalk(scene, W, [[{ x: list[0].x, y: 2.5, z: list[0].z }, 'ALLAHU EKBER', 2.4]], { gap: 3.2, near: 30 });
}
// Vaaz: küçük kürsüde vaiz, karşısında yere oturmuş dinleyenler; sözleri balonlarda
function vaaz(scene, W, x, z) {
    const b = new Batch(), M = mat4(0, 0, 0), dir = x > 0 ? -1 : 1;
    b.box(M, 1.6, 0.5, 1.6, '#78350f', x, 0.25, z);                      // kürsü platformu
    b.box(M, 3.8, 0.03, 4.6, '#7f1d1d', x + dir * 2.8, 0.02, z);         // halı
    scene.add(b.mesh());
    const yaw = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    const vaiz = { ...looks.cemaat(), jacket: '#1f2937', shirt: '#f8fafc', cap: '#f8fafc', beard: '#d6d3d1', x, z, yaw, s: 1.05 };
    poseCycle(scene, W, [vaiz].map(o => ({ ...o, y: 0.5 })), ['open', 'point', 'stand', 'open'], [1.8, 1.2, 1.4, 1.6]);
    const lst = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) lst.push({ ...(Math.random() < 0.4 ? looks.abla() : looks.cemaat()), pose: 'sit', x: x + dir * (1.8 + r * 1.1), z: z + (c - 1.5) * 1.05, yaw: yaw + Math.PI });
    poseCycle(scene, W, lst, ['sit', o => Math.random() < 0.3 ? 'kneel' : 'sit'], [3, 1.6]);
    bubbleTalk(scene, W, [
        [{ x, y: 3.1, z }, 'KARDEŞLERİM...', 2.2], [{ x, y: 3.1, z }, 'ALTIN NESİL YETİŞECEK!', 2.6],
        [{ x, y: 3.1, z }, 'HİZMETE BAĞIŞ YAPIN!', 2.4], [{ x, y: 3.1, z }, 'HOCAEFENDİ RÜYAMDA...', 2.6],
        [{ x, y: 3.1, z }, 'SABIR, SADAKAT, İTAAT!', 2.4]
    ], { gap: 0.7, near: 34 });
}
// Başörtülü ablalar: yol kenarında seyirci
function ablalar(scene, W, s, z, seed, off = HW + 2.2, n = 6) {
    const list = [];
    for (let i = 0; i < n; i++) list.push({ ...looks.abla(), x: s * (off + rand(0, 1.6)), z: z + (i - (n - 1) / 2) * 0.95 + rand(-0.2, 0.2), yaw: s > 0 ? -Math.PI / 2 + rand(-0.3, 0.3) : Math.PI / 2 + rand(-0.3, 0.3), hold: Math.random() < 0.3 ? HOLD.tesbih : Math.random() < 0.3 ? HOLD.phone : null });
    poseCycle(scene, W, list, ['stand', 'clap', 'stand', o => o.hold === HOLD.phone ? 'phone' : 'cheer'], [2.4, 1.4, 1.8, 1.2], { offset: seed * 1.3 });
    const a = list[Math.floor(n / 2)];
    bubbleTalk(scene, W, [[{ x: a.x, y: 2.5, z: a.z }, pick(['MAŞALLAH!', 'HOCAM NEREDE?', 'ABİLER, DİKKAT!', 'AMAN YA RABBİ!']), 2.2]], { gap: 4 + seed % 3, start: seed, near: 28 });
}
