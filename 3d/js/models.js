// HIRHIZ 3D: karakter modelleri (kutulardan, kodla; resim dosyası yalnızca HIRHIZ'ın kafası: ../recep.jpg)
// Bütün karakterler yerel +Z yönüne bakar; ayak tabanı y=0'dadır.
import * as THREE from 'three';
import { box, mat, canvasTex, textSprite } from './util.js?v=15';

// Eklem: dönme noktası p olan grup; parça aşağı sarkar
export function limb(parent, x, y, z, w, h, d, color, shoe) {
    const pv = new THREE.Group(); pv.position.set(x, y, z); parent.add(pv);
    pv.add(box(w, h, d, color, 0, -h / 2, 0));
    if (shoe) pv.add(box(w * 1.1, 0.1, d * 1.5, shoe, 0, -h + 0.03, d * 0.25));
    return pv;
}

// --- HIRHIZ'ın fotoğraf kafası (2D oyundaki kesimin aynısı) ---
const RECEP_HEAD = { x: 36, y: 8, w: 120, h: 162,
    clip: [[0,0],[194,0],[194,150],[150,152],[142,158],[132,163],[120,164],[108,168],[98,165],
           [88,160],[78,157],[68,154],[64,145],[63,132],[55,128],[0,128]] };
let headTex = null;
export function getHeadTex() {
    if (headTex) return headTex;
    // Fotoğraf küçük (194x259): 4 kat büyütülür, keskinleştirilir (unsharp mask) ve hafif kontrast verilir
    const K = 4, c = document.createElement('canvas'); c.width = RECEP_HEAD.w * K; c.height = RECEP_HEAD.h * K;
    headTex = new THREE.CanvasTexture(c); headTex.colorSpace = THREE.SRGBColorSpace; headTex.anisotropy = 8;
    const img = new Image();
    img.onload = () => {
        const x = c.getContext('2d', { willReadFrequently: true });
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
        x.save(); x.scale(K, K); x.translate(-RECEP_HEAD.x, -RECEP_HEAD.y);
        x.beginPath(); RECEP_HEAD.clip.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.clip();
        x.drawImage(img, 0, 0);
        x.restore();
        sharpen(x, c.width, c.height);
        headTex.needsUpdate = true;
    };
    img.src = '../recep.jpg';
    return headTex;
}

// Keskinleştirme: sonuç = asıl + 1.1 × (asıl − bulanık); kenar yumuşak kalsın diye saydam pikseller atlanır
// tint: [r, g, b] renk düzeltme çarpanları (ör. video karesindeki mor/pembe ton); amt: keskinlik, blur: bulanıklık yarıçapı
export function sharpen(x, w, h, { amt = 1.1, con = 1.08, blur = 3, tint = null } = {}) {
    const src = x.getImageData(0, 0, w, h), s = src.data;
    const b = document.createElement('canvas'); b.width = w; b.height = h;
    const bx = b.getContext('2d', { willReadFrequently: true });
    bx.filter = `blur(${blur}px)`; bx.drawImage(x.canvas, 0, 0);
    const bl = bx.getImageData(0, 0, w, h).data;
    const AMT = amt, CON = con;
    for (let i = 0; i < s.length; i += 4) {
        if (s[i + 3] < 250) continue;
        for (let k = 0; k < 3; k++) {
            let v = s[i + k] + AMT * (s[i + k] - bl[i + k]);
            v = (v - 128) * CON + 128;
            if (tint) v *= tint[k];
            s[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
    }
    x.putImageData(src, 0, 0);
}

// "DİN" yazılı yeşil kalkan (2D çizimin aynısı)
let shieldTex = null;
function getShieldTex() {
    if (shieldTex) return shieldTex;
    shieldTex = canvasTex(128, 160, (g) => {
        g.translate(64, 80); g.scale(2.6, 2.6);
        const path = (a, b) => { g.beginPath(); g.moveTo(-a, -29 + (23 - a)); g.lineTo(a, -29 + (23 - a)); g.lineTo(a, 4); g.quadraticCurveTo(a - 1, 22 - (23 - a) * 0.7, 0, 31 - (23 - a) * 1.2); g.quadraticCurveTo(-a + 1, 22 - (23 - a) * 0.7, -a, 4); g.closePath(); };
        path(23); const gr = g.createLinearGradient(-23, -29, 23, 31); gr.addColorStop(0, '#166534'); gr.addColorStop(1, '#052e16');
        g.fillStyle = gr; g.fill(); g.strokeStyle = '#fbbf24'; g.lineWidth = 4; g.stroke();
        g.font = 'bold 17px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3; g.strokeStyle = '#052e16'; g.strokeText('DİN', 0, 1); g.fillStyle = '#fde68a'; g.fillText('DİN', 0, 1);
    });
    return shieldTex;
}
export function makeShield(size = 1) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.46 * size, 0.58 * size),
        new THREE.MeshLambertMaterial({ map: getShieldTex(), transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 }));
    m.castShadow = true;
    return m;
}

// Balyoz: sap + demir baş; tutma noktası grubun başlangıcı, sap -Y yönüne uzanır
function makeHammer() {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.95, 6), mat('#92400e'));
    handle.position.y = -0.38; handle.castShadow = true; g.add(handle);
    g.add(box(0.2, 0.2, 0.42, '#4b5563', 0, -0.86, 0));
    g.add(box(0.21, 0.21, 0.06, '#9ca3af', 0, -0.86, 0.2));
    g.add(box(0.21, 0.21, 0.06, '#9ca3af', 0, -0.86, -0.2));
    return g;
}

// Sırttaki kul hakkı çuvalı: torba topladıkça büyür
function makeSack() {
    const g = new THREE.Group();
    const tex = canvasTex(128, 128, (c) => {
        c.fillStyle = '#c8a165'; c.fillRect(0, 0, 128, 128);
        c.fillStyle = '#a47c45'; c.fillRect(20, 80, 26, 20);
        c.fillStyle = '#4a2c00'; c.font = 'bold 22px Arial'; c.textAlign = 'center';
        c.fillText('KUL', 64, 58); c.fillText('HAKKI', 64, 84);
    });
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshLambertMaterial({ map: tex }));
    s.scale.set(1, 1.25, 0.85); s.castShadow = true; g.add(s);
    g.add(box(0.1, 0.12, 0.1, '#7c2d12', 0, 0.3, 0));
    return g;
}

export function buildHirhiz() {
    const root = new THREE.Group();    // dünyadaki konum ve yön
    const body = new THREE.Group();    // ezilme/uzama ve eğilme
    root.add(body);
    const SUIT = '#334155', SUIT_D = '#1e293b', SKIN = '#e8b48f';
    const legL = limb(body, -0.12, 0.62, 0, 0.17, 0.6, 0.2, SUIT_D, '#0f172a');
    const legR = limb(body, 0.12, 0.62, 0, 0.17, 0.6, 0.2, SUIT_D, '#0f172a');
    const torso = new THREE.Group(); torso.position.y = 0.62; body.add(torso);
    torso.add(box(0.52, 0.56, 0.3, SUIT, 0, 0.28, 0));
    torso.add(box(0.16, 0.24, 0.02, '#f8fafc', 0, 0.43, 0.155, false));    // gömlek
    torso.add(box(0.05, 0.3, 0.02, '#1e3a8a', 0, 0.36, 0.166, false));     // kravat
    const strap = box(0.06, 0.62, 0.03, '#7c5a2b', 0, 0.3, 0.16, false); strap.rotation.z = 0.55; torso.add(strap);   // çuval ipi
    // Kafa: 2D'deki gibi fotoğraf; her zaman kameraya döner (player.js), sağa/sola gidişe göre aynalanır
    const head = new THREE.Group(); head.position.y = 0.56; torso.add(head);
    const faceGroup = new THREE.Group(); head.add(faceGroup);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.81),
        new THREE.MeshBasicMaterial({ map: getHeadTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));   // ışıktan etkilenmez: yüz hep net ve parlak
    face.position.set(-0.095, 0.33, 0.05); face.castShadow = true; faceGroup.add(face);
    // Kollar
    const armL = limb(torso, -0.33, 0.5, 0, 0.13, 0.5, 0.14, SUIT_D);
    const armR = limb(torso, 0.33, 0.5, 0, 0.13, 0.5, 0.14, SUIT);
    armL.add(box(0.11, 0.1, 0.11, SKIN, 0, -0.53, 0, false));
    armR.add(box(0.11, 0.1, 0.11, SKIN, 0, -0.53, 0, false));
    const hammer = makeHammer(); hammer.position.y = -0.5; hammer.rotation.x = Math.PI; armR.add(hammer);
    const shield = makeShield(1); shield.position.set(-0.08, -0.45, 0.02); shield.rotation.y = -Math.PI / 2; armL.add(shield);
    const sack = makeSack(); sack.position.set(-0.08, 0.36, -0.32); torso.add(sack);
    // Baret + maske gücü (1. bölüm)
    const helmet = new THREE.Group(); head.add(helmet); helmet.visible = false;
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#facc15'));
    hm.position.y = 0.58; hm.castShadow = true; helmet.add(hm);
    helmet.add(box(0.64, 0.04, 0.64, '#eab308', 0, 0.58, 0.02));
    helmet.add(box(0.26, 0.16, 0.1, '#f8fafc', 0.02, 0.12, 0.2, false));
    return { root, body, legL, legR, armL, armR, torso, head, faceGroup, hammer, shield, sack, helmet };
}

// --- GEZİ KAHRAMANLARI ---
export const GEZI_LOOK = {
    carsi:   { top: '#111827', leg: '#1f2937', shoe: '#f8fafc', skin: '#e8b48f', hair: '#1c1917' },
    kirmizi: { top: '#dc2626', leg: '#e8b48f', shoe: '#111827', skin: '#f2c79b', hair: '#292524' },
    sema:    { top: '#f8fafc', leg: '#e5e7eb', shoe: '#111827', skin: '#e0ac69', hair: '#3f2a1d' },
    capulcu: { top: '#16a34a', leg: '#1e40af', shoe: '#f8fafc', skin: '#e0ac69', hair: '#78350f' },
    tencere: { top: '#0ea5e9', leg: '#57534e', shoe: '#292524', skin: '#e8b48f', hair: '#6b7280' },
    duran:   { top: '#f8fafc', leg: '#111827', shoe: '#0a0a0a', skin: '#e0ac69', hair: '#1c1917' }
};
function frontText(txt, w, h, color, bg = null) {
    const t = canvasTex(256, Math.round(256 * h / w), (g, W, H) => {
        if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
        g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
        let s = H * 0.8; do { g.font = `bold ${s}px Arial Black, Arial`; s -= 2; } while (g.measureText(txt).width > W * 0.92);
        g.fillText(txt, W / 2, H / 2);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}

export function buildHero(skin) {
    const C = GEZI_LOOK[skin];
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.11, 0.7, 0, 0.16, 0.68, 0.18, C.leg, C.shoe);
    const legR = limb(body, 0.11, 0.7, 0, 0.16, 0.68, 0.18, C.leg, C.shoe);
    const torso = new THREE.Group(); torso.position.y = 0.7; body.add(torso);
    let skirt = null;
    if (skin === 'sema') {   // dönen geniş tennure
        skirt = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.0, 10, 1, true), new THREE.MeshLambertMaterial({ color: C.top, side: THREE.DoubleSide }));
        skirt.position.y = -0.2; skirt.castShadow = true; torso.add(skirt);
        torso.add(box(0.42, 0.5, 0.26, C.top, 0, 0.28, 0));
    } else if (skin === 'kirmizi') {   // kırmızı yazlık elbise
        const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.78, 8), mat(C.top));
        dress.position.y = 0.2; dress.castShadow = true; torso.add(dress);
    } else torso.add(box(0.5, 0.6, 0.28, C.top, 0, 0.3, 0));
    if (skin === 'carsi') {
        const t = frontText('ÇARŞI', 0.42, 0.14, '#f8fafc'); t.position.set(0, 0.36, 0.145); torso.add(t);
        for (let k = 0; k < 6; k++) torso.add(box(0.08, 0.1, 0.3, k % 2 ? '#f8fafc' : '#111827', -0.2 + k * 0.08, 0.58, 0, false));   // atkı
    }
    if (skin === 'capulcu') { const t = frontText('ÇAPULCU', 0.44, 0.12, '#f8fafc'); t.position.set(0, 0.38, 0.145); torso.add(t); }
    if (skin === 'tencere') { torso.add(box(0.51, 0.03, 0.29, '#f8fafc', 0, 0.42, 0, false)); torso.add(box(0.51, 0.03, 0.29, '#f8fafc', 0, 0.24, 0, false)); }
    if (skin === 'duran') torso.add(box(0.05, 0.4, 0.02, '#cbd5e1', 0, 0.35, 0.145, false));
    const head = new THREE.Group(); head.position.y = 0.62; torso.add(head);
    head.add(box(0.12, 0.1, 0.12, C.skin, 0, 0.02, 0));
    head.add(box(0.34, 0.38, 0.32, C.skin, 0, 0.25, 0));
    head.add(box(0.05, 0.05, 0.02, '#111', -0.08, 0.28, 0.165, false));
    head.add(box(0.05, 0.05, 0.02, '#111', 0.08, 0.28, 0.165, false));
    if (skin !== 'sema' && skin !== 'capulcu') head.add(box(0.36, 0.1, 0.34, C.hair, 0, 0.45, -0.01));
    if (skin === 'kirmizi') head.add(box(0.34, 0.5, 0.1, C.hair, 0, 0.22, -0.19));   // uzun saç
    if (skin === 'tencere') head.add(box(0.16, 0.04, 0.03, '#57534e', 0, 0.17, 0.17, false));   // bıyık
    if (skin === 'duran') head.add(box(0.12, 0.02, 0.02, '#7c2d12', 0, 0.15, 0.165, false));
    if (skin === 'carsi' || skin === 'capulcu') {   // yüzücü gözlüğü
        head.add(box(0.36, 0.04, 0.34, '#111827', 0, 0.28, 0, false));
        head.add(box(0.1, 0.07, 0.02, '#38bdf8', -0.08, 0.28, 0.175, false));
        head.add(box(0.1, 0.07, 0.02, '#38bdf8', 0.08, 0.28, 0.175, false));
    }
    if (skin === 'capulcu') {   // beyaz maske + sarı baret
        head.add(box(0.24, 0.12, 0.04, '#f8fafc', 0, 0.14, 0.17, false));
        const hm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#facc15'));
        hm.position.y = 0.42; head.add(hm); head.add(box(0.5, 0.03, 0.5, '#eab308', 0, 0.42, 0, false));
    }
    if (skin === 'sema') {   // sikke + gaz maskesi
        const sikke = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 8), mat('#a16207'));
        sikke.position.y = 0.66; head.add(sikke);
        head.add(box(0.26, 0.22, 0.1, '#374151', 0, 0.22, 0.17, false));
        head.add(box(0.12, 0.12, 0.1, '#4b5563', 0, 0.12, 0.24, false));
    }
    const armL = limb(torso, -0.32, 0.56, 0, 0.12, 0.5, 0.13, C.top);
    const armR = limb(torso, 0.32, 0.56, 0, 0.12, 0.5, 0.13, C.top);
    if (skin === 'kirmizi') armL.add(box(0.26, 0.32, 0.1, '#f5f5f4', 0, -0.66, 0.06));   // beyaz bez çanta (savurur)
    armL.add(box(0.1, 0.1, 0.1, C.skin, 0, -0.53, 0, false));
    armR.add(box(0.1, 0.1, 0.1, C.skin, 0, -0.53, 0, false));
    let lid = null;
    if (skin === 'tencere') {   // tencere kapağı (kalkan) + kepçe
        lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 14), mat('#cbd5e1'));
        lid.rotation.x = Math.PI / 2; lid.position.set(-0.05, 0.3, 0.3); lid.castShadow = true; torso.add(lid);
        lid.add(box(0.1, 0.05, 0.08, '#1f2937', 0, 0.05, 0, false));
        const ladle = new THREE.Group(); ladle.position.y = -0.5; armR.add(ladle);
        ladle.add(box(0.03, 0.4, 0.03, '#9ca3af', 0, -0.2, 0, false));
        ladle.add(box(0.14, 0.06, 0.14, '#d1d5db', 0, -0.42, 0, false));
    }
    if (skin === 'duran') {   // yerde sırt çantası
        root.add(box(0.36, 0.42, 0.24, '#374151', -0.55, 0.21, -0.1));
    }
    return { root, body, legL, legR, armL, armR, torso, head, skirt, lid };
}

// Yürüme/koşma salınımı
export function walkPose(m, phase, amt) {
    const s = Math.sin(phase) * 0.7 * amt;
    m.legL.rotation.x = s; m.legR.rotation.x = -s;
    m.body.position.y = Math.abs(Math.cos(phase)) * 0.05 * amt;
}

// Yere düşen ölü pozu sırasında kullanılır
export function nameLabel(text, y) {
    const s = textSprite(text, { size: 40, height: 0.26, color: '#fde68a', bg: 'rgba(15,23,42,0.72)' });
    s.position.y = y;
    return s;
}
