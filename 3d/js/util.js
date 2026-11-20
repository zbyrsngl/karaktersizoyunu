// HIRHIZ 3D: ortak araçlar (malzemeler, yazı dokuları, matematik)
import * as THREE from 'three';
import { tr } from './i18n.js?v=27';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
// Kare hızından bağımsız yumuşak yaklaşma
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
// İki açı arasındaki en kısa fark (-PI..PI)
export function angDiff(a, b) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
}
export const dampAngle = (a, b, lambda, dt) => a + angDiff(a, b) * (1 - Math.exp(-lambda * dt));
export const rand = (a, b) => a + Math.random() * (b - a);

// Aynı renkli malzemeler paylaşılır (telefon performansı)
const MATS = new Map();
export function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!MATS.has(key)) MATS.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
    return MATS.get(key);
}
const BOXGEO = new THREE.BoxGeometry(1, 1, 1);
// Ortası (cx,cy,cz) olan kutu
export function box(w, h, d, color, cx = 0, cy = 0, cz = 0, shadow = true) {
    const m = new THREE.Mesh(BOXGEO, typeof color === 'string' || typeof color === 'number' ? mat(color) : color);
    m.scale.set(w, h, d); m.position.set(cx, cy, cz);
    m.castShadow = shadow; m.receiveShadow = shadow;
    return m;
}

// Tuvalden doku
export function canvasTex(w, h, draw, opts = {}) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
    if (opts.pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
    t.anisotropy = 4;
    return t;
}

// Yazıyı tuvale sığdırarak çizer
export function fitText(ctx, txt, x, y, maxW, size, font = 'Impact, Arial Black, Arial') {
    txt = tr(txt);
    let s = size;
    do { ctx.font = `bold ${s}px ${font}`; s -= 2; } while (ctx.measureText(txt).width > maxW && s > 8);
    ctx.fillText(txt, x, y);
}

// Kafanın üstünde duran yazı (her zaman kameraya döner)
export function textSprite(text, { color = '#f8fafc', bg = 'rgba(15,23,42,0.75)', stroke = null, size = 44, height = 0.32, font = 'Arial Black, Arial' } = {}) {
    text = tr(text);
    const c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = `bold ${size}px ${font}`;
    const w = Math.ceil(g.measureText(text).width) + size, h = Math.ceil(size * 1.5);
    c.width = w; c.height = h;
    g.font = `bold ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, h / 3); g.fill(); }
    if (stroke) { g.lineWidth = size / 6; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(text, w / 2, h / 2 + 2); }
    g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    s.scale.set(height * w / h, height, 1);
    s.renderOrder = 5;
    return s;
}
export function disposeSprite(s) { s.material.map.dispose(); s.material.dispose(); }

// Eksenlere hizalı kutu (çarpışma)
export class AABB {
    constructor(x0, y0, z0, x1, y1, z1, type = 'solid') {
        this.min = new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1));
        this.max = new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1));
        this.type = type; this.active = true;
    }
}
