// HIRHIZ 3D: bölümlerin hikâyesine göre arka plana eklenen canlı sahneler (world.js, bölümün decorate'inden sonra çağırır).
//   1 Gezi: çadır kütüphanesi, gitarlı şarkı halkası, ücretsiz çorba kuyruğu, slogan balonları (saldırı değil)
//   2 17/25 Aralık: polis arabalarının yanında canlı yayın yapan muhabirler, telefonla çeken meraklılar
//   4 15 Temmuz: köprü girişinde canlı yayın ekibi, köprüye yürüyen kalabalığın sloganları
//   10 Saraçhane: kalabalığın üstünde sloganlar
// (3, 5, 7, 8, 9: sahneleri kendi dosyalarında; 6 uçuş: flight_fx.js)
import * as THREE from 'three';
import { HW, ARENA, signBoard } from './world.js?v=27';
import { box } from './util.js?v=27';
import { Batch, crowd, poseCycle, bubbleTalk, looks, HOLD, table, chair, mat4, rand } from './decor.js?v=27';

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
}
