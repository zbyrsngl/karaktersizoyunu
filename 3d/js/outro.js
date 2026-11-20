// HIRHIZ 3D — bölüm sonu sahneleri (canavar yenildikten sonra, karne çıkmadan önce).
// walkerOutro: (isteğe bağlı önce HIRHIZ konuşur) → bir karakter meydanın kenarından yürüyerek gelir, HIRHIZ'ın karşısında durur, konuşur.
// Kafalar 2D'deki gibi fotoğraftan kesilir ve hep kameraya döner.
//   3. bölüm: Cengiz (../resimler/cengiz.png) "Bu milletin a. koyacağız"
//   4. bölüm: HIRHIZ "Bir savcı 2 polisle hepinizi bitiririm!", sonra sonpeygamber resmindeki adam parmağını sallayarak konuşur
import * as THREE from 'three';
import { G, toast } from './state.js?v=28';
import { burst } from './fx.js?v=28';
import { limb, walkPose, sharpen } from './models.js?v=28';
import { playSfx } from './audio.js?v=28';
import { box, mat, canvasTex, textSprite, disposeSprite, dampAngle, clamp } from './util.js?v=28';
import { ARENA } from './world.js?v=28';

// Fotoğraftan elips kesimli kafa dokusu: src içindeki [sx, sy, sw, sh] kutusu, elips [cx, cy, rx, ry] (kutuya göre).
// İsteğe bağlı [.., rxB, ryB]: alt yarı ayrı ölçülerle (yumurta biçimi: çeneye doğru daralır, yaka/arka plan girmez)
const HEADS = {};
// fix: keskinleştirme ve renk düzeltme ayarları (models.js sharpen)
export function photoHead(src, [sx, sy, sw, sh], [cx, cy, rx, ry, rxB = rx, ryB = ry], fix = null) {
    if (HEADS[src]) return HEADS[src];
    const K = 3, c = document.createElement('canvas'); c.width = sw * K; c.height = sh * K;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const img = new Image();
    img.onload = () => {
        const x = c.getContext('2d', { willReadFrequently: true });
        x.imageSmoothingQuality = 'high';
        x.save(); x.scale(K, K);
        x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2); x.ellipse(cx, cy, rxB, ryB, 0, 0, Math.PI); x.closePath(); x.clip();
        x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        x.restore();
        if (fix) sharpen(x, c.width, c.height, fix);
        tex.needsUpdate = true;
    };
    img.src = src;
    return (HEADS[src] = tex);
}
// Takım elbiseli adam: suit, shirt, tie renkleri; kafa fotoğrafı
function suitMan({ suit, suitD, shirt, tie, tex, faceW, faceH, pin }) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.12, 0.72, 0, 0.18, 0.7, 0.2, suitD, '#0a0a0a');
    const legR = limb(body, 0.12, 0.72, 0, 0.18, 0.7, 0.2, suitD, '#0a0a0a');
    const torso = new THREE.Group(); torso.position.y = 0.72; body.add(torso);
    torso.add(box(0.6, 0.66, 0.34, suit, 0, 0.33, 0));
    torso.add(box(0.18, 0.26, 0.02, shirt, 0, 0.52, 0.175, false));
    torso.add(box(0.06, 0.34, 0.02, tie, 0, 0.44, 0.186, false));
    if (pin) torso.add(box(0.05, 0.05, 0.02, pin, -0.18, 0.5, 0.18, false));
    const armL = limb(torso, -0.36, 0.6, 0, 0.15, 0.5, 0.16, suitD);
    const armR = limb(torso, 0.36, 0.6, 0, 0.15, 0.5, 0.16, suit);
    armL.add(box(0.11, 0.11, 0.11, '#e0a98a', 0, -0.53, 0, false)); armR.add(box(0.11, 0.11, 0.11, '#e0a98a', 0, -0.53, 0, false));
    const faceGroup = new THREE.Group(); faceGroup.position.y = 0.66; torso.add(faceGroup);
    if (tex) {   // fotoğraf kafa; yoksa kafayı çağıran çizer
        const face = new THREE.Mesh(new THREE.PlaneGeometry(faceW, faceH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
        face.position.y = faceH * 0.45; faceGroup.add(face);
    }
    return { root, body, legL, legR, armL, armR, torso, faceGroup };
}

// Cengiz: kolları göğsünde kavuşturulmuş
function buildCengiz() {
    const m = suitMan({ suit: '#3f3f46', suitD: '#27272a', shirt: '#f8fafc', tie: '#1f2937', faceW: 0.74, faceH: 0.94,
                        tex: photoHead('../resimler/cengiz.png', [50, 22, 88, 112], [44, 53, 37, 51], { amt: 0.8, con: 1.05, blur: 3 }) });
    m.pose = (t, talking, walking) => {
        if (walking) { m.armL.rotation.set(Math.sin(t * 8) * 0.4, 0, 0); m.armR.rotation.set(-Math.sin(t * 8) * 0.4, 0, 0); return; }
        m.armL.rotation.set(-1.45, 0, 0.8); m.armR.rotation.set(-1.3, 0, -0.8);   // önce içe, sonra öne: eller göğüste buluşur
        m.faceGroup.rotation.z = talking ? Math.sin(t * 6) * 0.05 : 0;
    };
    return m;
}
// "Son peygamber" adamı: gri takım, bir eli havada işaret parmağı yukarıda (konuşurken sallar), öbür elinde mikrofon
function buildPeygamber() {
    // yüz önceden işlendi (resimler/sonpeygamber_yuz.png: 2 kat büyütme, gürültü temizliği, yerel kontrast, keskinleştirme,
    // mor ton düzeltmesi, saç dahil temiz kesim) → burada kırpma/keskinleştirme yok
    const m = suitMan({ suit: '#4b5563', suitD: '#374151', shirt: '#e0f2fe', tie: '#111827', pin: '#b91c1c', faceW: 0.76, faceH: 1.0,
                        tex: photoHead('../resimler/sonpeygamber_yuz.png', [0, 0, 280, 370], [140, 185, 300, 400]) });
    const finger = box(0.04, 0.16, 0.04, '#e0a98a', 0, -0.65, 0, false); m.armR.add(finger);
    const mic = new THREE.Group(); mic.position.y = -0.55; m.armL.add(mic);
    mic.add(box(0.06, 0.26, 0.06, '#111827', 0, 0.12, 0.05));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat('#6b7280')); head.position.set(0, 0.28, 0.05); mic.add(head);
    m.pose = (t, talking, walking) => {
        finger.visible = mic.visible = !walking;
        if (walking) { m.armL.rotation.set(Math.sin(t * 8) * 0.4, 0, 0); m.armR.rotation.set(-Math.sin(t * 8) * 0.4, 0, 0); return; }
        const pump = talking ? Math.sin(t * 9) : 0;
        m.armR.rotation.set(-2.85 + pump * 0.2, 0, -0.15);      // havada, yumruğunu sallar
        m.armL.rotation.set(-2.1, 0, 0.7);                      // mikrofon çenesinde
        m.faceGroup.rotation.z = talking ? Math.sin(t * 9) * 0.06 - 0.03 : 0;
    };
    return m;
}

// Egemen Bağış'a benzeyen karikatür (2. bölüm sonu): lacivert takım, AB bayrağı rozeti, yuvarlak dolgun yüz,
// geriye taranmış koyu saç (alnı açık), kalın kaşlar, kocaman gülümseme. Elinde küçük AB bayrağı; konuşurken alkışlar, bayrak sallar.
function buildEgemen() {
    const SKIN = '#e2a882', SKIND = '#cf916b';
    const m = suitMan({ suit: '#1e2a4a', suitD: '#16203a', shirt: '#f8fafc', tie: '#2563eb', faceW: 0, faceH: 0 });
    const pin = new THREE.Group(); pin.position.set(-0.19, 0.5, 0.18); m.torso.add(pin);   // AB rozeti
    pin.add(box(0.08, 0.06, 0.015, '#1d4ed8', 0, 0, 0, false));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; pin.add(box(0.01, 0.01, 0.01, '#facc15', Math.cos(a) * 0.022, Math.sin(a) * 0.018, 0.01, false)); }
    const h = m.faceGroup;
    h.add(box(0.16, 0.08, 0.14, SKIN, 0, 0.03, 0, false));                                     // boyun
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(SKIN)); skull.scale.set(1.08, 1.12, 1); skull.position.y = 0.26; skull.castShadow = true; h.add(skull);
    [-1, 1].forEach(sx => {
        const ch = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), mat(SKIN)); ch.position.set(sx * 0.12, 0.17, 0.11); h.add(ch);   // dolgun yanaklar
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(SKIND)); ear.scale.set(0.6, 1, 0.8); ear.position.set(sx * 0.215, 0.26, 0); h.add(ear);
        h.add(box(0.1, 0.028, 0.03, '#1c1917', sx * 0.075, 0.33, 0.19, false));               // kalın kaşlar
        h.add(box(0.06, 0.016, 0.02, '#1c1917', sx * 0.07, 0.285, 0.196, false));              // gülerken kısılmış gözler
        h.add(box(0.05, 0.03, 0.02, '#f0b79a', sx * 0.15, 0.2, 0.17, false));                  // al yanak
    });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.212, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), mat('#1c1917'));
    hair.scale.set(1.08, 1.12, 1); hair.position.set(0, 0.27, -0.025); hair.rotation.x = -0.38; h.add(hair);   // geriye taralı, alın açık
    [-1, 1].forEach(sx => h.add(box(0.03, 0.13, 0.12, '#1c1917', sx * 0.2, 0.31, -0.04, false)));   // şakaklar
    h.add(box(0.012, 0.012, 0.16, '#3f3a36', -0.07, 0.43, 0.02, false));                       // yan ayrım
    h.add(box(0.06, 0.08, 0.06, SKIND, 0, 0.24, 0.205, false));                                // burun
    const mouth = new THREE.Group(); mouth.position.set(0, 0.155, 0.19); h.add(mouth);       // kocaman gülümseme
    mouth.add(box(0.15, 0.045, 0.03, '#7f1d1d', 0, 0, 0, false));
    mouth.add(box(0.13, 0.022, 0.032, '#f8fafc', 0, 0.008, 0.002, false));
    [-1, 1].forEach(sx => { const c = box(0.04, 0.02, 0.03, '#7f1d1d', sx * 0.085, 0.015, 0, false); c.rotation.z = sx * 0.6; mouth.add(c); });
    h.add(box(0.12, 0.05, 0.05, SKIN, 0, 0.09, 0.15, false));                                  // çene
    const flag = new THREE.Group(); flag.position.y = -0.56; m.armR.add(flag);              // küçük AB bayrağı
    flag.add(box(0.025, 0.5, 0.025, '#a8a29e', 0, 0.2, 0));
    const cloth = new THREE.Group(); cloth.position.set(0, 0.38, 0); flag.add(cloth);
    cloth.add(box(0.3, 0.2, 0.012, '#1d4ed8', 0.16, 0, 0, false));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; cloth.add(box(0.018, 0.018, 0.02, '#facc15', 0.16 + Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0, false)); }
    m.turnMax = 0.8;
    m.pose = (t, talking, walking) => {
        if (walking) {
            m.armL.rotation.set(Math.sin(t * 8) * 0.4, 0, 0);
            m.armR.rotation.set(-2.5 + Math.sin(t * 8) * 0.15, 0, 0.45);                     // yürürken bayrak havada
            cloth.rotation.y = Math.sin(t * 6) * 0.5; mouth.scale.y = 1; return;
        }
        if (talking) {   // bayrağı sallar, öbür eliyle göğsüne vurup alkışlar gibi
            const w = Math.sin(t * 10);
            m.armR.rotation.set(-2.6 + w * 0.2, 0, 0.55 + w * 0.2);   // kol yana açık: yüzü kapatmasın
            m.armL.rotation.set(-0.7 - Math.abs(Math.sin(t * 7)) * 0.35, 0, -0.35);   // yumruğunu sallar
            cloth.rotation.y = w * 0.6;
            mouth.scale.y = 1 + Math.abs(Math.sin(t * 13)) * 1.6;
            m.faceGroup.rotation.z = Math.sin(t * 5) * 0.06;
        } else { m.armR.rotation.set(-2.4, 0, 0.45); m.armL.rotation.set(0, 0, 0.1); mouth.scale.y = 1; m.faceGroup.rotation.z = 0; }
    };
    return m;
}

// "Yalarım" amca (5. bölüm sonu; 2D'de 2. bölüm sonundaydı): yaşlı, bıyıklı, koyu ceketli; kafa resimler/yalarim.png'den.
// Hafif kambur; konuşurken bir elini sallar, öbür eli belinde.
function buildYalarim() {
    // yüz: kulaklar dahil x 25-101, tepe y 2, çene y 82 → üstte geniş, çeneye doğru daralan kesim (yaka ve mikrofon dışarıda)
    const m = suitMan({ suit: '#44403c', suitD: '#292524', shirt: '#d6d3d1', tie: '#57534e', faceW: 0.74, faceH: 0.8,
                        tex: photoHead('../resimler/yalarim.png', [24, 1, 80, 86], [39, 41, 38, 40, 31, 41], { amt: 1.1, con: 1.08, blur: 3 }) });
    m.torso.rotation.x = 0.1;   // yaşlı: hafif öne eğik
    m.pose = (t, talking, walking) => {
        if (walking) { m.armL.rotation.set(Math.sin(t * 6) * 0.3, 0, 0); m.armR.rotation.set(-Math.sin(t * 6) * 0.3, 0, 0); return; }
        if (talking) {
            const w = Math.sin(t * 7);
            m.armR.rotation.set(-1.6 + w * 0.35, 0, 0.25 + w * 0.15);   // eli havada, sallar
            m.armL.rotation.set(-0.3, 0, -0.5);                          // eli belinde
            m.faceGroup.rotation.z = Math.sin(t * 6) * 0.06;
        } else { m.armR.rotation.set(0, 0, 0.05); m.armL.rotation.set(0, 0, -0.05); m.faceGroup.rotation.z = 0; }
    };
    return m;
}

// Başının üstünde konuşma balonu
function bubble(text) {
    const s = textSprite(text, { size: 44, height: 0.42, color: '#111827', bg: 'rgba(248,250,252,0.96)' });
    s.position.set(0, 2.6, 0);
    return s;
}

// Genel bölüm sonu sahnesi; update(dt) bitince true döner
function walkerOutro(scene, { build, sfx, text, pre }) {
    const p = G.player;
    const o = { st: pre ? 'pre' : 'walk', t: 0, phase: 0, bubble: null, m: null };
    const start = () => {
        const m = o.m = build();
        const side = p.pos.x > 0 ? -1 : 1;
        m.root.position.set(clamp(p.pos.x + side * 11, -ARENA.hw + 1, ARENA.hw - 1), 0, clamp(p.pos.z - 4, ARENA.z1 + 2, ARENA.z0 - 2));
        scene.add(m.root);
        o.goal = new THREE.Vector3(p.pos.x + side * 2.6, 0, p.pos.z - 0.6);
        o.facing = Math.atan2(o.goal.x - m.root.position.x, o.goal.z - m.root.position.z);
    };
    const setBubble = (owner, txt) => {
        if (o.bubble) { o.bubble.parent && o.bubble.parent.remove(o.bubble); disposeSprite(o.bubble); o.bubble = null; }
        if (owner) { o.bubble = bubble(txt); owner.add(o.bubble); }
    };
    if (pre) {   // önce HIRHIZ konuşur
        o.preLen = (playSfx(pre.sfx, { vol: 1 }) || 3) + 0.5;
        setBubble(p.m.root, pre.text);
    } else start();
    o.update = (dt) => {
        o.t += dt;
        if (o.st === 'pre') {
            if (o.t > o.preLen) { setBubble(null); start(); o.st = 'walk'; o.t = 0; }
            return false;
        }
        const m = o.m, pos = m.root.position;
        if (o.st === 'walk') {
            const dx = o.goal.x - pos.x, dz = o.goal.z - pos.z, d = Math.hypot(dx, dz);
            if (d > 0.1) {
                const sp = Math.min(d, 2.3 * dt);
                pos.x += dx / d * sp; pos.z += dz / d * sp;
                o.phase += dt * 8; walkPose(m, o.phase, 0.9);
                o.facing = dampAngle(o.facing, Math.atan2(dx, dz), 8, dt);
                m.pose(o.t, false, true);
            } else { o.st = 'turn'; o.t = 0; walkPose(m, 0, 0); }
        } else if (o.st === 'turn') {   // HIRHIZ'a döner, konuşmaya başlar
            o.facing = dampAngle(o.facing, Math.atan2(p.pos.x - pos.x, p.pos.z - pos.z), 8, dt);
            m.pose(o.t, false, false);
            if (o.t > 0.4) { o.talk = playSfx(sfx, { vol: 1 }) || 3; o.st = 'talk'; o.t = 0; setBubble(m.root, text); }
        } else if (o.st === 'talk') {
            m.pose(o.t, true, false);
            if (o.t > o.talk + 0.8) { o.st = 'done'; return true; }
        } else if (o.st === 'done') return true;
        m.root.rotation.y = o.facing;
        const c = G.camera.position;
        const turn = Math.atan2(Math.sin(Math.atan2(c.x - pos.x, c.z - pos.z) - o.facing), Math.cos(Math.atan2(c.x - pos.x, c.z - pos.z) - o.facing));
        m.faceGroup.rotation.y = m.turnMax ? clamp(turn, -m.turnMax, m.turnMax) : turn;   // çizilmiş kafa boynu kırmasın
        return false;
    };
    o.remove = () => { setBubble(null); if (o.m) scene.remove(o.m.root); };
    return o;
}

// --- 1. BÖLÜM SONU: BAŞÖRTÜLÜ TEYZELER ---
// İki yandan koşarak gelirler, HIRHIZ'ın çevresinde dururlar; zıplayıp terlik sallayarak tezahürat ederler (2 kez).
const GRANNY_LOOKS = [
    { scarf: '#f8fafc', dots: '#60a5fa', cardigan: '#7f1d1d', skirt: '#1e3a8a' },
    { scarf: '#fde68a', dots: '#b45309', cardigan: '#14532d', skirt: '#3f3f46' },
    { scarf: '#fbcfe8', dots: '#be185d', cardigan: '#78350f', skirt: '#4c1d95' },
    { scarf: '#bbf7d0', dots: '#15803d', cardigan: '#1e3a8a', skirt: '#7f1d1d' },
    { scarf: '#e9d5ff', dots: '#7e22ce', cardigan: '#57534e', skirt: '#0f766e' },
    { scarf: '#fed7aa', dots: '#c2410c', cardigan: '#334155', skirt: '#713f12' }
];
function buildGranny(L, glasses) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.08, 0.42, 0, 0.1, 0.4, 0.1, '#b08968', '#1c1917');
    const legR = limb(body, 0.08, 0.42, 0, 0.1, 0.4, 0.1, '#b08968', '#1c1917');
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.62, 10), mat(L.skirt)); skirt.position.y = 0.6; skirt.castShadow = true; body.add(skirt);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; body.add(box(0.04, 0.04, 0.02, '#e5e7eb', Math.sin(a) * 0.27, 0.45 + (i % 2) * 0.18, Math.cos(a) * 0.27, false)); }   // puanlar
    const torso = new THREE.Group(); torso.position.y = 0.9; torso.rotation.x = 0.12; body.add(torso);   // hafif kambur
    torso.add(box(0.4, 0.42, 0.28, L.cardigan, 0, 0.21, 0));
    [0.32, 0.22, 0.12].forEach(y => torso.add(box(0.03, 0.03, 0.02, '#e7e5e4', 0.06, y, 0.145, false)));
    const head = new THREE.Group(); head.position.y = 0.46; head.rotation.x = -0.12; torso.add(head);
    const scarf = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(L.scarf)); scarf.scale.set(1, 1.1, 1); scarf.position.y = 0.17; head.add(scarf);
    const tail = box(0.16, 0.22, 0.06, L.scarf, 0, 0.02, -0.15); tail.rotation.x = 0.3; head.add(tail);
    for (let i = 0; i < 6; i++) { const a = i * 1.1; head.add(box(0.03, 0.03, 0.02, L.dots, Math.sin(a) * 0.17, 0.2 + (i % 3) * 0.05, Math.cos(a) * 0.17 - 0.02, false)); }
    head.add(box(0.2, 0.22, 0.06, '#f1c9a5', 0, 0.15, 0.13));                                     // yüz
    head.add(box(0.24, 0.05, 0.06, L.scarf, 0, 0.27, 0.13, false));                               // alın bandı
    head.add(box(0.06, 0.06, 0.04, L.scarf, 0, 0.02, 0.15, false));                               // çene düğümü
    head.add(box(0.05, 0.015, 0.02, '#7c5a3c', -0.05, 0.18, 0.165, false)); head.add(box(0.05, 0.015, 0.02, '#7c5a3c', 0.05, 0.18, 0.165, false));
    head.add(box(0.035, 0.035, 0.03, '#e0a98a', 0, 0.14, 0.175, false));                          // burun
    const mouth = box(0.06, 0.02, 0.02, '#4a1d0f', 0, 0.09, 0.165, false); head.add(mouth);
    if (glasses) [-0.05, 0.05].forEach(x => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 4, 10), mat('#44403c')); r.position.set(x, 0.18, 0.17); head.add(r); });
    const armL = limb(torso, -0.24, 0.38, 0, 0.09, 0.36, 0.1, L.cardigan);
    const armR = limb(torso, 0.24, 0.38, 0, 0.09, 0.36, 0.1, L.cardigan);
    armL.add(box(0.08, 0.08, 0.08, '#f1c9a5', 0, -0.38, 0, false)); armR.add(box(0.08, 0.08, 0.08, '#f1c9a5', 0, -0.38, 0, false));
    const slipper = new THREE.Group(); slipper.position.y = -0.42; slipper.visible = false; armR.add(slipper);   // terlik
    slipper.add(box(0.1, 0.26, 0.04, '#a16207', 0, -0.1, 0)); slipper.add(box(0.11, 0.04, 0.06, '#f472b6', 0, -0.04, 0.02, false));
    return { root, body, legL, legR, armL, armR, torso, head, mouth, slipper };
}
export function grannyOutro(scene) {
    const p = G.player, cx = p.pos.x, cz = p.pos.z;
    const gs = GRANNY_LOOKS.map((L, i) => {
        const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
        const m = buildGranny(L, i % 3 === 0);
        m.root.position.set(clamp(cx + side * (11 + row * 2), -ARENA.hw + 0.8, ARENA.hw - 0.8), 0, clamp(cz - 1.5 - row * 1.2, ARENA.z1 + 1, ARENA.z0 - 1));
        scene.add(m.root);
        // HIRHIZ'ın önünde yarım daire
        const a = side * (0.42 + row * 0.5), r = 2.7 + row * 0.3 + (p.pos.y > 1 ? 3.4 : 0);   // HIRHIZ TOMA enkazının üstündeyse çevresinde dururlar
        const goal = new THREE.Vector3(clamp(cx + Math.sin(Math.PI + a) * r, -ARENA.hw + 0.8, ARENA.hw - 0.8), 0, cz + Math.cos(Math.PI + a) * r);
        return { m, goal, st: 'run', phase: i * 1.3, speed: 4.2 + row * 0.5, facing: side < 0 ? Math.PI / 2 : -Math.PI / 2 };
    });
    const o = { st: 'run', t: 0, chants: 2, nextChant: 0.9, endAt: Infinity };
    o.update = (dt) => {
        o.t += dt;
        gs.forEach(g => {
            const pos = g.m.root.position;
            if (g.st === 'run') {
                const dx = g.goal.x - pos.x, dz = g.goal.z - pos.z, d = Math.hypot(dx, dz);
                if (d > 0.08) {
                    const s = Math.min(d, g.speed * dt); pos.x += dx / d * s; pos.z += dz / d * s;
                    g.facing = dampAngle(g.facing, Math.atan2(dx, dz), 10, dt);
                    g.phase += dt * 14; walkPose(g.m, g.phase, 1);
                    g.m.armL.rotation.x = Math.sin(g.phase) * 0.6; g.m.armR.rotation.x = -Math.sin(g.phase) * 0.6;
                } else { g.st = 'party'; g.m.slipper.visible = true; walkPose(g.m, 0, 0); }
            } else {   // zıplar, terliği havada sallar, bağırır
                g.phase += dt * 9;
                g.facing = dampAngle(g.facing, Math.atan2(cx - pos.x, cz - pos.z), 6, dt);
                pos.y = Math.abs(Math.sin(g.phase)) * 0.28;
                g.m.armR.rotation.set(-2.6 + Math.sin(g.phase * 2) * 0.45, 0, 0);
                g.m.armL.rotation.set(-0.4, 0, -0.4);
                g.m.mouth.scale.y = 0.02 * (2 + Math.abs(Math.sin(g.phase * 2)) * 3);   // box(): asıl yükseklikle çarp
            }
            g.m.root.rotation.y = g.facing;
        });
        // Tezahürat iki kez; bitince bölüm biter
        if (o.chants > 0 && o.t >= o.nextChant) {
            o.chants--;
            const d = playSfx('granny', { vol: 1 }) || 1.6;
            o.nextChant = o.t + d + 0.5;
            if (o.chants === 0) o.endAt = o.t + d + 1.0;
        }
        return o.t > Math.max(3.5, o.endAt);
    };
    o.remove = () => gs.forEach(g => scene.remove(g.m.root));
    return o;
}

// Yalnızca HIRHIZ konuşur (başında balon), sonra bölüm biter (5. bölüm: "15 Temmuz Allah'ın bir lütfü!")
export function selfOutro(sfx, text) {
    const p = G.player;
    const o = { st: 'talk', t: 0 };
    o.len = (playSfx(sfx, { vol: 1 }) || 3) + 0.8;
    o.bubble = bubble(text); p.m.root.add(o.bubble);
    o.update = (dt) => { o.t += dt; if (o.t > o.len) { o.st = 'done'; return true; } return false; };
    o.remove = () => { if (o.bubble) { o.bubble.parent && o.bubble.parent.remove(o.bubble); disposeSprite(o.bubble); o.bubble = null; } };
    return o;
}

// 2. bölüm sonu: dörtlü çete kurtuldu, Egemen Bağış'a benzeyen karakter gelip HIRHIZ'ı kutlar (makara sesinin ilk 10 sn'si)
export function egemenOutro(scene) {
    return walkerOutro(scene, { build: buildEgemen, sfx: 'makara', text: 'Tebrikler HIRHIZ! Dörtlü çete kurtuldu!' });
}
// 5. bölüm sonu: önce HIRHIZ "15 Temmuz Allah'ın bir lütfü!", sonra yalarım amca gelip kutlar
export function yalarimOutro(scene) {
    return walkerOutro(scene, { build: buildYalarim, sfx: 'yalarim', text: 'YALARIM, ISTIRIRIM bi de..',
                                pre: { sfx: 'lutuf', text: "15 Temmuz Allah'ın bir lütfü!" } });
}
export function cengizOutro(scene) {
    return walkerOutro(scene, { build: buildCengiz, sfx: 'cengiz', text: 'Bu milletin a. koyacağız' });
}
export function peygamberOutro(scene) {
    return walkerOutro(scene, { build: buildPeygamber, sfx: 'peygamber', text: 'Eğer son peygamber Hz. Muhammet olmasaydı...',
                                pre: { sfx: 'savci', text: 'Bir savcı 2 polisle hepinizi bitiririm!' } });
}

// --- 8. BÖLÜM SONU: FETÖ ölür ve mezara girer ---
// Devrilmiş FETÖ'nün altında mezar açılır (yanında kazılan toprak yığını), içine iner, toprakla örtülür (karlı tümsek),
// başında mezar taşı yerden yükselir: "FETÖ 1941 - 2024"; üstte "FETÖ öldü ve mezara girdi!"
const GRAVE = { open: 0.4, sink: 1.4, fill: 2.4, stone: 3.3, end: 6.2 };
const ease = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
export function graveOutro(scene) {
    const b = G.boss, m = b && b.m;
    const o = { t: 0, objs: [] };
    if (b) b.graving = true;   // ölü FETÖ'nün fiziği dursun (mezara inerken zeminden itilmesin)
    if (!m) { o.update = () => true; o.remove = () => {}; return o; }
    // Raf altında kalmasın: açık bir yere kayar
    const solids = G.world.solids, from = b.pos.clone();
    let x = from.x, z = from.z;
    const blocked = (x, z) => solids.some(a => a.active && a.type !== 'ground' && a.type !== 'wall' && x + 1 > a.min.x && x - 1 < a.max.x && z + 1.6 > a.min.z && z - 1.6 < a.max.z);
    for (let k = 0; k < 30 && blocked(x, z); k++) x += x > 0 ? -1 : 1;
    x = clamp(x, -ARENA.hw + 2, ARENA.hw - 2); z = clamp(z, ARENA.z1 + 2.5, ARENA.z0 - 2.5);
    const yaw = m.root.rotation.y;
    // Gövde yatınca baş yerel -Z'de: mezarın ortası gövdenin ortası
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const center = new THREE.Vector3(x, 0, z).addScaledVector(fwd, 0.95);
    const add = (obj) => { scene.add(obj); o.objs.push(obj); return obj; };
    const hole = add(new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6), new THREE.MeshBasicMaterial({ color: '#1c1917' })));
    hole.rotation.set(-Math.PI / 2, 0, yaw); hole.position.copy(center).setY(0.03); hole.scale.set(0.01, 0.01, 1);
    const pile = add(new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#78350f')));
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    pile.position.copy(center).addScaledVector(side, 1.6); pile.scale.setScalar(0.01);
    const mound = add(new THREE.Group()); mound.position.copy(center); mound.rotation.y = yaw; mound.scale.set(1, 0.01, 1);
    const dirt = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#6b4423')); dirt.scale.set(0.75, 0.45, 1.45); mound.add(dirt);
    const snow = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 4), mat('#f8fafc')); snow.scale.set(0.62, 0.42, 1.25); snow.position.y = 0.04; mound.add(snow);
    // Mezar taşı (başın ucunda), yazı kameraya bakan yüzde
    const stone = add(new THREE.Group());
    stone.position.copy(center).addScaledVector(fwd, 1.75); stone.rotation.y = Math.atan2(G.camera.position.x - stone.position.x, G.camera.position.z - stone.position.z);
    const tex = canvasTex(128, 192, (g, W, H) => {
        g.fillStyle = '#9ca3af'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#1f2937'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold 38px Georgia, serif'; g.fillText('FETÖ', W / 2, 70);
        g.font = 'bold 20px Georgia, serif'; g.fillText('1941 - 2024', W / 2, 112);
        g.fillRect(34, 136, 60, 3);
    });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.3, 0.22), [mat('#9ca3af'), mat('#9ca3af'), mat('#9ca3af'), mat('#9ca3af'), new THREE.MeshLambertMaterial({ map: tex }), mat('#9ca3af')]);
    slab.position.y = 0.65; slab.castShadow = true; stone.add(slab);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.475, 0.475, 0.22, 16, 1, false, 0, Math.PI), mat('#9ca3af')); top.rotation.set(Math.PI / 2, 0, Math.PI / 2); top.position.y = 1.3; stone.add(top);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.26, 16, 1, false, 0, Math.PI), mat('#f8fafc')); cap.rotation.set(Math.PI / 2, 0, Math.PI / 2); cap.position.y = 1.36; cap.scale.set(1, 1, 0.4); stone.add(cap);
    stone.position.y = -1.7;
    o.update = (dt) => {
        o.t += dt; const t = o.t;
        // açık yere kayar, yere iner
        const k0 = ease(t / 0.4);
        b.pos.x = from.x + (x - from.x) * k0; b.pos.z = from.z + (z - from.z) * k0;
        const openK = ease((t - GRAVE.open) / 0.6), sinkK = ease((t - GRAVE.sink) / 1.0), fillK = ease((t - GRAVE.fill) / 0.9), stoneK = ease((t - GRAVE.stone) / 0.9);
        if (t < GRAVE.sink) b.pos.y = Math.max(0, from.y * (1 - k0));
        hole.scale.set(Math.max(0.01, openK * (1 - fillK)), Math.max(0.01, openK * (1 - fillK)), 1);
        hole.visible = fillK < 1;
        pile.scale.set(Math.max(0.01, openK * (1 - fillK)), Math.max(0.01, openK * (1 - fillK) * 0.9), Math.max(0.01, openK * (1 - fillK)));
        if (t > GRAVE.sink) b.pos.y = -2.2 * sinkK;
        m.root.visible = sinkK < 0.98;
        mound.scale.set(1, Math.max(0.01, fillK), 1);
        stone.position.y = -1.7 * (1 - stoneK);
        if (t > GRAVE.open && t < GRAVE.sink && Math.random() < 0.3) burst(center.clone().setY(0.2), { n: 2, color: ['#78350f', '#57534e'], speed: 2, up: 4, size: 0.12, life: 0.6 });
        if (t > GRAVE.fill && t < GRAVE.stone && Math.random() < 0.6) burst(center.clone().setY(0.6), { n: 3, color: ['#78350f', '#6b4423', '#f8fafc'], speed: 2, up: 3, size: 0.14, life: 0.6 });
        if (!o.e1 && t > GRAVE.fill) { o.e1 = true; playSfx('hit', { rate: 0.35, vol: 0.8 }); }
        if (!o.e2 && t > GRAVE.stone + 0.6) { o.e2 = true; playSfx('hit', { rate: 0.6, vol: 0.8 }); toast('FETÖ öldü ve mezara girdi!', 3200, '#fde047'); }
        return t > GRAVE.end;
    };
    o.remove = () => o.objs.forEach(obj => scene.remove(obj));
    return o;
}
