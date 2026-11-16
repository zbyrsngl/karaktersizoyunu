// HIRHIZ 3D: karakter modelleri (kutulardan, kodla; resim dosyası yalnızca HIRHIZ'ın kafası: ../recep.jpg)
// Bütün karakterler yerel +Z yönüne bakar; ayak tabanı y=0'dadır.
import * as THREE from 'three';
import { tr, HAMMER_WORD, SHIELD_WORD } from './i18n.js?v=20';
import { box, mat, canvasTex, textSprite } from './util.js?v=20';

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
        window.headCanvas = c;   // 2D hikâye oynatıcısı (story2d.js) aynı kafayı kullanır
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

// Kalkan: kalın, kenarı pahlı (bevel) metal "heater" kalkan. Altın çerçeve, koyu yeşil gövde, ortada süslü madalyon ve
// kabartma yazı (Türkçede DİN, diğer dillerde Relig). Malzeme parlak (Phong): ışığı yansıtır. Yerel +Z öne bakar.
function shieldShape(s) {   // üst kenar düz, yanları aşağıda sivri uca kıvrılır (yarı genişlik 0.23·s, boy 0.58·s)
    const w = 0.23 * s, top = 0.29 * s, bot = -0.29 * s, sh = new THREE.Shape();
    sh.moveTo(-w, top); sh.quadraticCurveTo(0, top + 0.035 * s, w, top);
    sh.lineTo(w, 0.02 * s);
    sh.quadraticCurveTo(w * 0.95, bot * 0.7, 0, bot);
    sh.quadraticCurveTo(-w * 0.95, bot * 0.7, -w, 0.02 * s);
    sh.closePath();
    return sh;
}
let shieldFaceTex = null;
function getShieldFaceTex() {
    if (shieldFaceTex) return shieldFaceTex;
    shieldFaceTex = canvasTex(256, 320, (g, W, H) => {
        const gr = g.createRadialGradient(W * 0.4, H * 0.3, 10, W / 2, H / 2, W * 0.75);
        gr.addColorStop(0, '#22874a'); gr.addColorStop(0.55, '#14532d'); gr.addColorStop(1, '#052e16');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        // ince altın iç çerçeve ve köşe süsleri
        g.strokeStyle = 'rgba(251,191,36,0.85)'; g.lineWidth = 5; g.strokeRect(18, 18, W - 36, H - 36);
        g.strokeStyle = 'rgba(251,191,36,0.4)'; g.lineWidth = 2; g.strokeRect(30, 30, W - 60, H - 60);
        // ortada sekiz köşeli yıldız biçimli madalyon (geometrik süs)
        g.save(); g.translate(W / 2, H * 0.47);
        for (let k = 0; k < 2; k++) { g.save(); g.rotate(k * Math.PI / 4); g.fillStyle = k ? '#b45309' : '#d97706'; g.fillRect(-62, -62, 124, 124); g.restore(); }
        g.beginPath(); g.arc(0, 0, 66, 0, Math.PI * 2); g.fillStyle = '#064e3b'; g.fill();
        g.lineWidth = 6; g.strokeStyle = '#fbbf24'; g.stroke();
        // kabartma yazı: gölge + altın dolgu + ince koyu kontur
        const word = SHIELD_WORD;
        let fs = 62; do { g.font = `bold ${fs}px Georgia, 'Times New Roman', serif`; fs -= 2; } while (g.measureText(word).width > 112);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(word, 3, 5);
        const tg = g.createLinearGradient(0, -30, 0, 30); tg.addColorStop(0, '#fef3c7'); tg.addColorStop(0.5, '#fbbf24'); tg.addColorStop(1, '#b45309');
        g.lineWidth = 3; g.strokeStyle = '#422006'; g.strokeText(word, 0, 2); g.fillStyle = tg; g.fillText(word, 0, 2);
        g.restore();
        // perçinler
        g.fillStyle = '#fde68a';
        [[40, 44], [W - 40, 44], [40, H * 0.62], [W - 40, H * 0.62], [W / 2, H - 46]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); });
        // üstten vuran ışık parlaması
        const sh = g.createLinearGradient(0, 0, W, H); sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, H);
    });
    return shieldFaceTex;
}
const SHIELD_GEO = {};
export function makeShield(size = 1) {
    if (!SHIELD_GEO.body) {
        const ext = (s, depth, bevel) => new THREE.ExtrudeGeometry(shieldShape(s), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
        SHIELD_GEO.rim = ext(1.0, 0.03, 0.018);                 // altın çerçeve (arkada, biraz büyük)
        SHIELD_GEO.body = ext(0.9, 0.035, 0.012);               // yeşil gövde
        // ön yüz: şekle göre UV (0..1) ile yazılı doku
        const face = new THREE.ShapeGeometry(shieldShape(0.86), 10), uv = face.attributes.uv, pos = face.attributes.position;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.23 * 0.86) / (0.46 * 0.86), (pos.getY(i) + 0.29 * 0.86) / (0.58 * 0.86 + 0.03));
        SHIELD_GEO.face = face;
        SHIELD_GEO.boss = new THREE.SphereGeometry(0.035, 10, 8);
    }
    const g = new THREE.Group();
    const rim = new THREE.Mesh(SHIELD_GEO.rim, new THREE.MeshPhongMaterial({ color: '#d4a017', specular: '#fff3c4', shininess: 90, emissive: '#3a2a00' }));
    rim.position.z = -0.03; rim.castShadow = true; g.add(rim);
    const body = new THREE.Mesh(SHIELD_GEO.body, new THREE.MeshPhongMaterial({ color: '#14532d', specular: '#86efac', shininess: 60 }));
    body.position.z = 0.0; body.castShadow = true; g.add(body);
    const face = new THREE.Mesh(SHIELD_GEO.face, new THREE.MeshPhongMaterial({ map: getShieldFaceTex(), specular: '#ffffff', shininess: 70, emissive: '#0b2e1a', emissiveMap: getShieldFaceTex(), emissiveIntensity: 0.35 }));
    face.position.z = 0.049; g.add(face);
    const knob = new THREE.Mesh(SHIELD_GEO.boss, new THREE.MeshPhongMaterial({ color: '#fbbf24', specular: '#ffffff', shininess: 120 }));
    knob.position.set(0, 0.2, 0.06); g.add(knob);
    g.scale.setScalar(size);
    return g;
}

// Balyozun başındaki yazı (Türkçede YARGI, diğer dillerde JUDGE): iki yanda, sapın iki tarafından da okunur
let hammerTex = null;
function getHammerTex() {
    if (hammerTex) return hammerTex;
    hammerTex = canvasTex(256, 96, (g, W, H) => {
        g.fillStyle = '#1f2937'; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#facc15'; g.lineWidth = 6; g.strokeRect(5, 5, W - 10, H - 10);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        let fs = 70; do { g.font = `900 ${fs}px Impact, 'Arial Black', Arial`; fs -= 2; } while (g.measureText(HAMMER_WORD).width > W - 30);
        g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(HAMMER_WORD, W / 2, H / 2 + 3);
        g.fillStyle = '#fde047'; g.fillText(HAMMER_WORD, W / 2, H / 2 + 3);
    });
    return hammerTex;
}

// Balyoz: sap + demir baş; tutma noktası grubun başlangıcı, sap -Y yönüne uzanır
function makeHammer() {
    const g = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.95, 6), mat('#92400e'));
    handle.position.y = -0.38; handle.castShadow = true; g.add(handle);
    // demir baş (biraz büyütüldü: yazı okunabilsin) ve iki parlak vurma yüzü
    g.add(box(0.24, 0.24, 0.52, '#374151', 0, -0.86, 0));
    g.add(box(0.26, 0.26, 0.07, '#9ca3af', 0, -0.86, 0.25));
    g.add(box(0.26, 0.26, 0.07, '#9ca3af', 0, -0.86, -0.25));
    // YARGI / JUDGE yazısı: başın iki yan yüzünde, ışıktan etkilenmeyen parlak levha
    const plate = new THREE.MeshBasicMaterial({ map: getHammerTex() });
    [-1, 1].forEach(s => {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.158), plate);
        p.position.set(s * 0.122, -0.86, 0); p.rotation.y = s * Math.PI / 2; g.add(p);
    });
    return g;
}

// Sırttaki kul hakkı çuvalı: torba topladıkça büyür
function makeSack() {
    const g = new THREE.Group();
    const tex = canvasTex(128, 128, (c) => {
        c.fillStyle = '#c8a165'; c.fillRect(0, 0, 128, 128);
        c.fillStyle = '#a47c45'; c.fillRect(20, 80, 26, 20);
        c.fillStyle = '#4a2c00'; c.font = 'bold 22px Arial'; c.textAlign = 'center';
        c.fillText(tr('KUL'), 64, 58); c.fillText(tr('HAKKI'), 64, 84);
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
    txt = tr(txt);
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

// Üniformanın göğsünde ve sırtında okunaklı yazı (polislerde 17/25, askerlerde ASKER — dile göre)
const UNIFORM_TEX = {};
export function uniformText(txt, fg, bg) {
    const k = txt + fg + bg;
    UNIFORM_TEX[k] = UNIFORM_TEX[k] || canvasTex(256, 80, (g, W, H) => {
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        let s = 66; do { g.font = `900 ${s}px Impact, 'Arial Black', Arial`; s -= 2; } while (g.measureText(txt).width > W - 20);
        g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(txt, W / 2, H / 2 + 3);
        g.fillStyle = fg; g.fillText(txt, W / 2, H / 2 + 3);
    });
    return new THREE.MeshBasicMaterial({ map: UNIFORM_TEX[k] });
}
// torso: gövde grubu; front/back: göğüs ve sırt levhası
export function labelTorso(torso, txt, fg, bg, { frontY = 0.2, backY = 0.36, w = 0.46, depth = 0.3 } = {}) {
    const m = uniformText(txt, fg, bg);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.31), m); back.position.set(0, backY, -depth / 2 - 0.012); back.rotation.y = Math.PI; torso.add(back);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, w * 0.82 * 0.31), m); front.position.set(0, frontY, depth / 2 + 0.022); torso.add(front);
    return { back, front };
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
