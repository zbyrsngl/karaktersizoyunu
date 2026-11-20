// HIRHIZ 3D: bölümlerin hikâyesine göre arka plana eklenen canlı sahneler (world.js, bölümün decorate'inden sonra çağırır).
//   1 Gezi: çadır kütüphanesi, gitarlı şarkı halkası, ücretsiz çorba kuyruğu, slogan balonları (saldırı değil)
//   2 17/25 Aralık: polis arabalarının yanında canlı yayın yapan muhabirler, telefonla çeken meraklılar
//   4 15 Temmuz: köprü girişinde canlı yayın ekibi, köprüye yürüyen kalabalığın sloganları
//   10 Saraçhane: sloganlar, miting otobüsü, pankartlı öğrenciler, tencere çalanlar, İPTAL damgalı dev sandık, simit-çay, ambulans, meşaleler
// (3, 5, 7, 8, 9: sahneleri kendi dosyalarında; 6 uçuş: flight_fx.js)
import * as THREE from 'three';
import { HW, ARENA, signBoard } from './world.js?v=29';
import { box } from './util.js?v=29';
import { G } from './state.js?v=29';
import { beep } from './audio.js?v=29';
import { Batch, crowd, poseCycle, bubbleTalk, looks, HOLD, table, chair, mat4, rand } from './decor.js?v=29';

export function extraScenes(scene, W, L) {
    const f = { 1: gezi, 2: aralik, 4: temmuz, 10: sarachane }[L.id];
    if (f) f(scene, W);
}

// muhabir + kameraman (+ isteğe bağlı ışıkçı); muhabir kameraya konuşur
function newsCrew(scene, W, x, z, yaw, lines, seed = 0) {
    const rep = { ...looks.press(), x, z, yaw, pose: 'mic', hold: HOLD.mic };
    const cx = x + Math.sin(yaw) * 2.4, cz = z + Math.cos(yaw) * 2.4;
    const cam = { ...looks.press(), x: cx, z: cz, yaw: yaw + Math.PI, pose: 'camera', hold: HOLD.camera };
    poseCycle(scene, W, [rep, cam], ['mic', o => o === cam ? 'camera' : 'point', 'mic'], [2.4, 1.0, 1.6], { offset: seed });
    const b = new Batch(); b.box(mat4(cx, 0, cz, yaw), 0.05, 1.3, 0.05, '#111827', 0.6, 0.65, 0); b.box(mat4(cx, 0, cz, yaw), 0.4, 0.3, 0.3, '#f8fafc', 0.6, 1.4, 0); scene.add(b.mesh());
    const tag = signBoard('CANLI', '#f8fafc', '#dc2626', 0.9, 0.3); tag.position.set(cx, 2.3, cz); tag.rotation.y = yaw + Math.PI; scene.add(tag);
    bubbleTalk(scene, W, lines.map(t => [{ x, y: 2.5, z }, t, 2.6]), { gap: 1.2, start: seed, near: 30 });
}
// telefonla çeken meraklılar
function onlookers(scene, W, s, z, n, seed) {
    const list = [];
    for (let i = 0; i < n; i++) list.push({ ...(Math.random() < 0.45 ? looks.woman() : looks.man()), x: s * (HW + 3 + rand(0, 2.5)), z: z + (i - n / 2) * 0.9, yaw: s > 0 ? -Math.PI / 2 + rand(-0.4, 0.4) : Math.PI / 2 + rand(-0.4, 0.4), hold: Math.random() < 0.6 ? HOLD.phone : null });
    poseCycle(scene, W, list, [o => o.hold ? 'phone' : 'stand', 'stand', o => o.hold ? 'phone' : 'point'], [2.6, 1.2, 1.4], { offset: seed });
    return list;
}

// --- 1. GEZİ PARKI ---
function gezi(scene, W) {
    // çadır kütüphanesi: masa, kitap yığınları, kitap okuyanlar
    {
        const x = -(HW + 6), z = -20, b = new Batch(), M = mat4(0, 0, 0);
        table(b, x, z, Math.PI / 2, { w: 2.4, d: 1, top: '#a16207' });
        for (let i = 0; i < 10; i++) b.box(M, 0.22, 0.05 + (i % 3) * 0.04, 0.3, ['#b91c1c', '#1d4ed8', '#15803d', '#f59e0b'][i % 4], x + (i % 2 ? 0.2 : -0.2), 0.8 + Math.floor(i / 5) * 0.1, z - 1 + (i % 5) * 0.5);
        scene.add(b.mesh());
        const s = signBoard('GEZİ KÜTÜPHANESİ', '#f8fafc', '#15803d', 3.2, 0.6); s.position.set(x, 2.1, z); s.rotation.y = Math.PI / 2; scene.add(s);
        const r = [0, 1, 2].map(i => ({ ...looks.man(), pose: 'sit', x: x + 1.6 + i * 0.3, z: z - 1.2 + i * 1.2, yaw: Math.PI / 2 + rand(-0.4, 0.4), hold: HOLD.book }));
        poseCycle(scene, W, r, ['sit', 'kneel'], [4, 2], { offset: 1 });
    }
    // gitarlı şarkı halkası: yere oturanlar alkış tutar
    {
        const x = HW + 7, z = -62, list = [];
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; list.push({ ...(i % 2 ? looks.woman() : looks.man()), pose: 'sit', x: x + Math.sin(a) * 1.8, z: z + Math.cos(a) * 1.8, yaw: a + Math.PI }); }
        poseCycle(scene, W, list, ['sit', 'kneel', 'sit'], [1.2, 0.6, 1.2]);
        const g = new Batch(); g.box(mat4(x, 0, z, 0.6), 0.35, 0.9, 0.1, '#a16207', 0, 0.45, 0); g.box(mat4(x, 0, z, 0.6), 0.06, 0.6, 0.06, '#78350f', 0, 1.2, 0); scene.add(g.mesh());   // gitar (ortada, kucaktan düşmüş gibi duruyor)
        bubbleTalk(scene, W, [[{ x, y: 2, z }, '♪ ♫ ♪', 1.8], [{ x, y: 2, z }, 'HER YER TAKSİM!', 2], [{ x, y: 2, z }, '♫ ♪ ♫', 1.8]], { gap: 0.6, near: 30 });
    }
    // ücretsiz çorba: kazan, sırada bekleyenler
    {
        const x = -(HW + 6), z = -112, b = new Batch(), M = mat4(0, 0, 0);
        table(b, x, z, Math.PI / 2, { w: 2, d: 0.9, top: '#e7e5e4' });
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.5, 12), new THREE.MeshLambertMaterial({ color: '#9ca3af' })); pot.position.set(x, 1.03, z); scene.add(pot);
        for (let i = 0; i < 4; i++) b.box(M, 0.12, 0.08, 0.12, '#f8fafc', x - 0.2, 0.82, z + 0.4 + i * 0.15);
        scene.add(b.mesh());
        const s = signBoard('ÜCRETSİZ ÇORBA', '#fef3c7', '#b45309', 2.6, 0.5); s.position.set(x - 0.5, 2.1, z); s.rotation.y = Math.PI / 2; scene.add(s);
        crowd(scene, [{ ...looks.woman(), x: x - 0.9, z, yaw: Math.PI / 2, pose: 'mic', hold: HOLD.cup }]);
        const q = [0, 1, 2, 3, 4].map(i => ({ ...(i % 2 ? looks.man() : looks.woman()), x: x + 1.3 + i * 0.9, z: z + 0.3, yaw: -Math.PI / 2 + rand(-0.2, 0.2), hold: i ? null : HOLD.cup }));
        poseCycle(scene, W, q, ['stand', o => o.hold ? 'phone' : 'stand'], [3, 1]);
    }
    // park boyunca slogan atan küçük gruplar (balonlar: saldırı değil)
    [[1, -30], [-1, -86], [1, -140]].forEach(([s, z], i) => {
        const l = onlookers(scene, W, s, z, 5, i * 1.7);
        bubbleTalk(scene, W, [[{ x: l[2].x, y: 2.6, z: l[2].z }, ['DİRENİŞ!', 'HÜKÜMET İSTİFA!', 'ÇAPULCUYUZ!'][i], 2.2]], { gap: 3, start: i, near: 28 });
    });
}

// --- 2. 17/25 ARALIK ---
function aralik(scene, W) {
    newsCrew(scene, W, HW + 5.5, -16, -Math.PI / 2 - 0.5, ['17 ARALIK: BÜYÜK OPERASYON!', 'BAKAN OĞULLARI GÖZALTINDA!'], 0);
    newsCrew(scene, W, -(HW + 5.5), -95, Math.PI / 2 + 0.5, ['AYAKKABI KUTULARINDAN DOLAR ÇIKTI!', 'PARA SAYMA MAKİNELERİ ELE GEÇİRİLDİ!'], 1.5);
    newsCrew(scene, W, HW + 5.5, -164, -Math.PI / 2 - 0.5, ['SON DAKİKA: SAVCI GÖREVDEN ALINDI!', '25 ARALIK: İKİNCİ DALGA!'], 3);
    [[-1, -36], [1, -76], [-1, -132]].forEach(([s, z], i) => onlookers(scene, W, s, z, 6, i));
}

// --- 4. 15 TEMMUZ ---
function temmuz(scene, W) {
    newsCrew(scene, W, HW + 3.4, 6, -Math.PI / 2 - 0.6, ['CANLI: KÖPRÜDE TANKLAR!', 'HALK SOKAKLARA DÖKÜLDÜ!'], 0);
    bubbleTalk(scene, W, [
        [{ x: HW + 4.5, y: 2.8, z: -24 }, 'DARBEYE HAYIR!', 2.2], [{ x: -(HW + 4.5), y: 2.8, z: -44 }, 'MEYDANLARA!', 2.2],
        [{ x: HW + 4.5, y: 2.8, z: -96 }, 'BU MİLLET BOYUN EĞMEZ!', 2.4], [{ x: -(HW + 4.5), y: 2.8, z: -150 }, 'KÖPRÜYÜ GERİ ALACAĞIZ!', 2.4]
    ], { gap: 1, near: 40 });
}

// --- 10. SARAÇHANE ---
function sarachane(scene, W) {
    const at = (s, z) => ({ x: s * (HW + 2.7), y: 2.9, z });
    bubbleTalk(scene, W, [[at(1, -10), 'HAK, HUKUK, ADALET!', 2.2], [at(-1, -30), 'HER ŞEY ÇOK GÜZEL OLACAK!', 2.4], [at(1, -58), 'SEÇİME SAYGI!', 2], [at(-1, -84), 'HAK, HUKUK, ADALET!', 2.2]], { gap: 0.8, near: 34 });
    bubbleTalk(scene, W, [[at(-1, -112), 'İPTAL Mİ?!', 2], [at(1, -136), 'SANDIK BİZİM!', 2], [at(-1, -164), 'HER ŞEY ÇOK GÜZEL OLACAK!', 2.4]], { gap: 0.8, near: 34 });
    newsCrew(scene, W, -(HW + 5.6), -48, Math.PI / 2 + 0.5, ['SARAÇHANE\'DE BÜYÜK KALABALIK!', 'YSK KARARI TARTIŞILIYOR!'], 1);
    rallyBus(scene, W, -(HW + 9), -22);
    banners(scene, W, HW + 7, -36, ['SEÇİM HAKKIMIZ', 'SANDIK BİZİM', 'İPTALE HAYIR'], 0);
    banners(scene, W, -(HW + 7), -138, ['HAK HUKUK ADALET', 'OYUMA DOKUNMA', 'DİPLOMA İPTAL Mİ?!'], 2);
    potBangers(scene, W, HW + 8, -96);
    ballotBox(scene, HW + 9, -70);
    simitCart(scene, W, -(HW + 8), -76);
    ambulance(scene, W, HW + 8.5, -122);
    flares(scene, W, [[1, -14], [-1, -60], [1, -150], [-1, -170]]);
}

// Miting otobüsü: damında mikrofonla konuşan, yanında el sallayanlar; balonlarda konuşma
function rallyBus(scene, W, x, z) {
    const b = new Batch(), M = mat4(x, 0, z, 0);
    b.box(M, 2.6, 2.8, 11, '#f8fafc', 0, 1.8, 0); b.box(M, 2.64, 0.8, 10.6, '#1e293b', 0, 2.5, 0);
    b.box(M, 2.66, 0.35, 11, '#dc2626', 0, 1.0, 0);
    [-3.6, 3.6].forEach(dz => [-1.2, 1.2].forEach(dx => b.box(M, 0.3, 0.9, 0.9, '#111827', dx, 0.45, dz)));
    b.box(M, 2.8, 0.1, 6, '#475569', 0, 3.25, -1); b.box(M, 0.05, 0.9, 6, '#cbd5e1', 1.35, 3.7, -1); b.box(M, 0.05, 0.9, 6, '#cbd5e1', -1.35, 3.7, -1);   // dam korkuluğu
    for (let i = 0; i < 3; i++) b.box(M, 0.6, 0.8, 0.6, '#111827', -1.0, 3.7, -3.4 + i * 2.4);   // hoparlörler
    scene.add(b.mesh());
    const sign = signBoard('HER ŞEY ÇOK GÜZEL OLACAK', '#fef3c7', '#7c2d12', 9, 1.1); sign.position.set(x + 1.34, 1.9, z); sign.rotation.y = Math.PI / 2; scene.add(sign);
    const top = [{ ...looks.press(), jacket: '#1f2937', shirt: '#f8fafc', x: x + 0.4, y: 3.3, z: z - 1, yaw: Math.PI / 2, hold: HOLD.mic },
                 { ...looks.man(), x: x - 0.3, y: 3.3, z: z - 2.6, yaw: Math.PI / 2 }, { ...looks.woman(), x: x - 0.3, y: 3.3, z: z + 0.8, yaw: Math.PI / 2 }];
    poseCycle(scene, W, top, [o => o.hold ? 'mic' : 'clap', o => o.hold ? 'point' : 'cheer', o => o.hold ? 'open' : 'clap'], [1.8, 1.2, 1.5]);
    bubbleTalk(scene, W, [[{ x: x + 0.4, y: 5.9, z: z - 1 }, 'SANDIĞA SAHİP ÇIKIN!', 2.4], [{ x: x + 0.4, y: 5.9, z: z - 1 }, 'MİLLETİN İRADESİ!', 2.2], [{ x: x + 0.4, y: 5.9, z: z - 1 }, 'HER ŞEY ÇOK GÜZEL OLACAK!', 2.6]], { gap: 0.8, near: 40 });
}
// Pankart taşıyan öğrenciler: iki direkli bez pankart
function banners(scene, W, x, z, texts, seed) {
    const s = x > 0 ? 1 : -1, yaw = s > 0 ? -Math.PI / 2 : Math.PI / 2, list = [];
    texts.forEach((t, i) => {
        const bz = z + (i - 1) * 4.2, bx = x - s * 0.5;
        const sg = signBoard(t, '#111827', '#f8fafc', 3.2, 0.8); sg.position.set(bx, 2.3, bz); sg.rotation.y = yaw; scene.add(sg);
        [-1.5, 1.5].forEach(dz => { scene.add(box(0.05, 2.6, 0.05, '#78350f', bx, 1.3, bz + dz, false)); list.push({ ...looks.man(), beard: null, x: bx + s * 0.4, z: bz + dz, yaw, pose: 'cheer' }); });
        list.push({ ...looks.woman(), x: bx + s * 1.4, z: bz, yaw, pose: 'clap' });
    });
    poseCycle(scene, W, list, [o => o.pose, 'cheer', o => o.pose === 'clap' ? 'stand' : 'cheer'], [1.4, 1, 1.2], { offset: seed });
}
// Tencere tava çalanlar (gece eylemi): kepçeyle tencereye vururlar, tın tın
function potBangers(scene, W, x, z) {
    const pot = (b, sh) => { b.box(sh, 0.3, 0.2, 0.3, '#9ca3af', 0, -0.68, 0.12); b.box(sh, 0.05, 0.05, 0.2, '#374151', 0.17, -0.62, 0.12); };
    const list = [];
    for (let i = 0; i < 6; i++) list.push({ ...(i % 2 ? looks.woman() : looks.man()), x: x + (i % 2) * 1.2, z: z + (i - 3) * 1.1, yaw: -Math.PI / 2 + rand(-0.3, 0.3), holdL: pot });
    poseCycle(scene, W, list, ['phone', 'clap'], [0.22, 0.22]);
    let t0 = 0;
    W.movers.push((dt, t) => {
        const p = G.player; if (!p || G.state !== 'play' || Math.hypot(p.pos.x - x, p.pos.z - z) > 26) return;
        if (t - t0 > 0.44) { t0 = t; beep('pan'); }
    });
    bubbleTalk(scene, W, [[{ x, y: 2.6, z }, 'TIN TIN TIN!', 1.6]], { gap: 2.4, near: 26 });
}
// Dev sandık: üstünde kırmızı "İPTAL" damgası
function ballotBox(scene, x, z) {
    const b = new Batch(), M = mat4(x, 0, z, 0.3);
    b.box(M, 2.4, 2.4, 2.4, '#e0f2fe', 0, 1.2, 0); b.box(M, 2.5, 0.12, 2.5, '#1d4ed8', 0, 2.45, 0); b.box(M, 0.9, 0.06, 0.12, '#111827', 0, 2.52, 0);
    scene.add(b.mesh());
    const yaw = -Math.PI / 2 + 0.3, nx = -Math.cos(0.3) * 1.22, nz = Math.sin(0.3) * 1.22;
    const t = signBoard('SANDIK', '#1d4ed8', '#e0f2fe', 2, 0.6); t.position.set(x + nx, 1.85, z + nz); t.rotation.y = yaw; scene.add(t);
    const st = signBoard('İPTAL', '#fef2f2', '#dc2626', 1.6, 0.6); st.position.set(x + nx * 1.02, 1.0, z + nz * 1.02); st.rotation.set(0, yaw, 0.25); scene.add(st);
}
// Simit-çay arabası
function simitCart(scene, W, x, z) {
    const b = new Batch(), M = mat4(x, 0, z, 0);
    b.box(M, 1.2, 1.0, 2.0, '#b91c1c', 0, 0.9, 0); b.box(M, 1.25, 0.08, 2.1, '#fde68a', 0, 1.42, 0);
    b.box(M, 1.1, 0.6, 1.9, '#fef3c7', 0, 1.8, 0);
    for (let i = 0; i < 6; i++) b.box(M, 0.25, 0.06, 0.25, '#b45309', -0.3 + (i % 2) * 0.6, 1.5 + Math.floor(i / 2) * 0.17, -0.6 + Math.floor(i / 2) * 0.5);
    [-0.7, 0.7].forEach(dz => b.box(M, 0.12, 0.5, 0.5, '#111827', 0.62, 0.3, dz));
    scene.add(b.mesh());
    const sg = signBoard('SİMİT · ÇAY', '#fef3c7', '#b91c1c', 1.8, 0.4); sg.position.set(x + 0.62, 2.35, z); sg.rotation.y = Math.PI / 2; scene.add(sg);
    poseCycle(scene, W, [{ ...looks.man(), mustache: '#292524', x: x - 1, z, yaw: Math.PI / 2, hold: HOLD.cup },
                        { ...looks.woman(), x: x + 1.4, z: z - 0.6, yaw: -Math.PI / 2, hold: HOLD.cup }, { ...looks.man(), x: x + 1.5, z: z + 0.7, yaw: -Math.PI / 2 }],
        ['phone', 'stand'], [2, 2]);
}
// Ambulans: yanıp sönen lambalar
function ambulance(scene, W, x, z) {
    const b = new Batch(), M = mat4(x, 0, z, 0);
    b.box(M, 2.2, 2.4, 5.6, '#f8fafc', 0, 1.5, 0); b.box(M, 2.22, 0.3, 5.62, '#dc2626', 0, 1.2, 0);
    [-1.8, 1.8].forEach(dz => [-1, 1].forEach(dx => b.box(M, 0.3, 0.8, 0.8, '#111827', dx, 0.4, dz)));
    scene.add(b.mesh());
    const sg = signBoard('AMBULANS', '#dc2626', '#f8fafc', 2.2, 0.5); sg.position.set(x - 1.12, 2.1, z); sg.rotation.y = -Math.PI / 2; scene.add(sg);
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), new THREE.MeshBasicMaterial({ color: '#ef4444' })), l2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), new THREE.MeshBasicMaterial({ color: '#3b82f6' }));
    l1.position.set(x - 0.4, 2.85, z + 2.2); l2.position.set(x + 0.4, 2.85, z + 2.2); scene.add(l1, l2);
    const li = new THREE.PointLight('#ef4444', 4, 9, 1.6); li.position.set(x, 3.4, z + 2.2); scene.add(li);
    W.movers.push((dt, t) => { const k = Math.floor(t * 6) % 2; l1.visible = !!k; l2.visible = !k; li.color.set(k ? '#ef4444' : '#3b82f6'); });
}
// Kalabalığın içinde yanan meşaleler (kırmızı titrek ışık)
function flares(scene, W, spots) {
    spots.forEach(([s, z], i) => {
        const x = s * (HW + 3.2);
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff3b1f' })); f.position.set(x, 2.5, z); scene.add(f);
        scene.add(box(0.05, 0.5, 0.05, '#7c2d12', x, 2.2, z, false));
        const li = new THREE.PointLight('#ff3b1f', 3, 8, 1.8); li.position.set(x, 2.7, z); scene.add(li);
        W.movers.push((dt, t) => { const k = 0.7 + Math.sin(t * 23 + i * 3) * 0.2 + Math.sin(t * 37 + i) * 0.1; li.intensity = 3 * k; f.scale.setScalar(k); });
    });
}
