// HIRHIZ 3D: efektler
// - pixelfx resim dizileri (../resimler/fx, MIT) kameraya dönük düz levha olarak oynatılır
// - köşeli piksel parçacıklar (küçük küpler), uçan yazılar, kamera sarsıntısı
import * as THREE from 'three';
import { textSprite, disposeSprite, rand } from './util.js?v=15';

let scene = null;
const SHEETS = window.FX_SHEETS || {};
const TEX = {};
export function initFx(sc) {
    scene = sc;
    const loader = new THREE.TextureLoader();
    for (const name in SHEETS) {
        const t = loader.load(`../resimler/fx/${name}.png?v=42`);
        t.colorSpace = THREE.SRGBColorSpace;
        t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
        TEX[name] = t;
    }
}

// --- RESİM DİZİSİ EFEKTLERİ ---
const sheetFx = [];
const PX = 0.012;   // bir pikselin dünyadaki boyu (metre)
// pos: efektin dayanak noktası (çoğunda ayak/zemin); scale: büyütme
export function spawnFx(name, pos, scale = 1, delay = 0) {
    const S = SHEETS[name]; if (!S || !TEX[name]) return;
    if (sheetFx.length > 20) killSheet(sheetFx[0]);
    const tex = TEX[name].clone();
    tex.repeat.set(1 / S.cols, 1 / Math.ceil(S.n / S.cols));
    tex.needsUpdate = true;
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const w = S.w * PX * scale, h = S.h * PX * scale;
    m.scale.set(w, h, 1);
    m.center.set(S.px / S.w, 1 - S.py / S.h);
    m.position.copy(pos);
    m.renderOrder = 6;
    m.visible = false;
    scene.add(m);
    sheetFx.push({ m, tex, S, t: -delay });
}
function killSheet(f) {
    scene.remove(f.m); f.tex.dispose(); f.m.material.dispose();
    sheetFx.splice(sheetFx.indexOf(f), 1);
}

// --- KÜP PARÇACIKLAR ---
const CUBE = new THREE.BoxGeometry(1, 1, 1);
const parts = [];
const partMats = new Map();
function partMat(color) {
    if (!partMats.has(color)) partMats.set(color, new THREE.MeshBasicMaterial({ color, transparent: true }));
    return partMats.get(color);
}
export function burst(pos, { n = 8, color = '#e7e5e4', speed = 3, up = 3, size = 0.12, life = 0.6, gravity = 12 } = {}) {
    for (let i = 0; i < n; i++) {
        if (parts.length > 160) { const p = parts.shift(); scene.remove(p.m); }
        const m = new THREE.Mesh(CUBE, partMat(Array.isArray(color) ? color[i % color.length] : color));
        const s = size * rand(0.6, 1.3);
        m.scale.setScalar(s); m.position.copy(pos);
        const a = Math.random() * Math.PI * 2, v = speed * rand(0.4, 1);
        scene.add(m);
        parts.push({ m, vx: Math.cos(a) * v, vy: up * rand(0.5, 1.2), vz: Math.sin(a) * v, life, max: life, g: gravity, s });
    }
}

// --- UÇAN YAZILAR ---
const texts = [];
export function floatText(text, pos, color = '#fde047', size = 0.42, life = 1.1) {
    const s = textSprite(text, { color, bg: null, stroke: '#111827', size: 56, height: size });
    s.position.copy(pos);
    scene.add(s);
    texts.push({ s, life, max: life });
}

// --- KAMERA SARSINTISI (travma: karesi kadar sarsar, hızla söner) ---
export const shake = { trauma: 0, on: true };
try { shake.on = localStorage.getItem('hirhizShake') !== '0'; } catch (e) {}
export function addTrauma(t) { if (shake.on) shake.trauma = Math.min(1, shake.trauma + t); }

export function updateFx(dt) {
    for (let i = sheetFx.length - 1; i >= 0; i--) {
        const f = sheetFx[i]; f.t += dt;
        if (f.t < 0) continue;
        const k = Math.floor(f.t * f.S.fps);
        if (k >= f.S.n) { killSheet(f); continue; }
        const rows = Math.ceil(f.S.n / f.S.cols);
        f.tex.offset.set((k % f.S.cols) / f.S.cols, 1 - (Math.floor(k / f.S.cols) + 1) / rows);
        f.m.visible = true;
    }
    for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= dt;
        if (p.life <= 0) { scene.remove(p.m); parts.splice(i, 1); continue; }
        p.vy -= p.g * dt;
        p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
        if (p.m.position.y < 0.05 && p.vy < 0 && p.m.position.y > -0.5) { p.m.position.y = 0.05; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
        p.m.scale.setScalar(p.s * Math.min(1, p.life / p.max * 2));
    }
    for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i]; t.life -= dt;
        if (t.life <= 0) { scene.remove(t.s); disposeSprite(t.s); texts.splice(i, 1); continue; }
        t.s.position.y += dt * 0.9;
        t.s.material.opacity = Math.min(1, t.life / t.max * 3);
    }
    shake.trauma = Math.max(0, shake.trauma - dt * 1.6);
}
export function clearFx() {
    while (sheetFx.length) killSheet(sheetFx[0]);
    parts.forEach(p => scene.remove(p.m)); parts.length = 0;
    texts.forEach(t => { scene.remove(t.s); disposeSprite(t.s); }); texts.length = 0;
    shake.trauma = 0;
}
