// HIRHIZ 3D: güç tuğlaları ve güçler (uçuş ve BYLOCK dışındaki bütün bölümler)
// Mavi ★ tuğla kırılınca (kafa, balyoz, mermi ya da el bombasıyla) içinden bir güç çıkar, zemine iner:
//   grenade  EL BOMBASI   +1 bomba (en çok 3; her bölümde 3 sabit yerde)
//   heart    +1 CAN
//   shieldUp KALKAN GÜCÜ  12 sn: hiçbir saldırı can götürmez (çevrende altın-yeşil koruma küresi)
//   speed    HIZ          10 sn: %45 daha hızlı koşu, daha yüksek zıplama
//   hammer   DEV BALYOZ   15 sn: balyoz iki kat büyür, menzili ve gücü artar
// Oyun 1 el bombasıyla başlar; bombalar artık kendiliğinden dolmaz.
import * as THREE from 'three';
import { G, toast, addScore } from './state.js?v=29';
import { box, mat, canvasTex } from './util.js?v=29';
import { burst, floatText, spawnFx } from './fx.js?v=29';
import { playSfx } from './audio.js?v=29';
import { tr } from './i18n.js?v=29';

export const POWER_TIME = { shieldUp: 12, speed: 10, hammer: 15 };
export const POWER_KINDS = ['heart', 'shieldUp', 'speed', 'hammer'];   // rastgele dağıtılanlar (el bombası ayrıca 3 sabit yerde)

// --- TUĞLA DOKUSU: mavi, beyaz yıldızlı ---
let powerTex = null;
export function powerBrickTex() {
    return powerTex = powerTex || canvasTex(32, 32, (g) => {
        g.fillStyle = '#1e3a8a'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#3b82f6'; g.fillRect(2, 2, 28, 28);
        g.fillStyle = '#1d4ed8'; g.fillRect(2, 26, 28, 4); g.fillRect(26, 2, 4, 28);
        g.fillStyle = '#f8fafc'; g.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.5 : 11, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); }
        g.fill();
    }, { pixel: true });
}

// --- EŞYA MODELLERİ ---
const glow = (color, r, y) => { const g = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false })); g.position.y = y; return g; };
function grenadeItem() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat('#4d5b23')); b.scale.set(1, 1.25, 1); b.position.y = 0.55; b.castShadow = true; g.add(b);
    g.add(box(0.1, 0.1, 0.1, '#9ca3af', 0, 0.85, 0, false));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 10), mat('#facc15')); ring.position.set(-0.1, 0.9, 0); ring.rotation.y = Math.PI / 2; g.add(ring);
    g.add(glow('#fb923c', 0.6, 0.6));
    return g;
}
function shieldItem() {
    const g = new THREE.Group();
    const s = new THREE.Shape(); s.moveTo(-0.26, 0.3); s.lineTo(0.26, 0.3); s.lineTo(0.26, 0.02); s.quadraticCurveTo(0.24, -0.22, 0, -0.32); s.quadraticCurveTo(-0.24, -0.22, -0.26, 0.02); s.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }), new THREE.MeshPhongMaterial({ color: '#15803d', specular: '#fde68a', shininess: 80, emissive: '#052e16' }));
    m.position.set(0, 0.6, -0.035); m.castShadow = true; g.add(m);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 6, 16), new THREE.MeshPhongMaterial({ color: '#fbbf24', shininess: 100 })); rim.position.set(0, 0.62, 0.07); g.add(rim);
    g.add(glow('#86efac', 0.62, 0.6));
    return g;
}
function speedItem() {   // kanatlı ayakkabı + şimşek
    const g = new THREE.Group();
    g.add(box(0.36, 0.16, 0.2, '#f8fafc', 0, 0.45, 0)); g.add(box(0.16, 0.18, 0.2, '#f8fafc', -0.1, 0.6, 0));
    g.add(box(0.38, 0.05, 0.22, '#ef4444', 0, 0.37, 0, false));
    [-1, 1].forEach(s => { const w = box(0.04, 0.22, 0.12, '#fde047', -0.18, 0.66, s * 0.12, false); w.rotation.x = s * 0.6; g.add(w); });
    const bolt = new THREE.Shape(); bolt.moveTo(0.05, 0.22); bolt.lineTo(-0.12, -0.02); bolt.lineTo(0, -0.02); bolt.lineTo(-0.05, -0.22); bolt.lineTo(0.13, 0.04); bolt.lineTo(0, 0.04); bolt.closePath();
    const b = new THREE.Mesh(new THREE.ShapeGeometry(bolt), new THREE.MeshBasicMaterial({ color: '#facc15', side: THREE.DoubleSide })); b.position.set(0.12, 0.9, 0); g.add(b);
    g.add(glow('#fde047', 0.6, 0.6));
    return g;
}
function hammerItem() {   // büyük altın balyoz
    const g = new THREE.Group();
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.8, 6), mat('#92400e')); h.position.y = 0.5; h.rotation.z = 0.5; g.add(h);
    const head = box(0.26, 0.26, 0.5, '#fbbf24', 0.18, 0.82, 0); head.rotation.z = 0.5; g.add(head);
    g.add(glow('#fbbf24', 0.65, 0.65));
    return g;
}
export const POWER_MAKERS = { grenade: grenadeItem, shieldUp: shieldItem, speed: speedItem, hammer: hammerItem };

// --- ALININCA ---
export function applyPower(kind, at) {
    const p = G.player;
    if (kind === 'grenade') {
        if ((G.grenades || 0) < 3) { G.grenades = (G.grenades || 0) + 1; G.onGrenadeCount && G.onGrenadeCount(true); floatText('EL BOMBASI!', at, '#fb923c'); }
        else { addScore(2000); floatText('BOMBA DOLU!', at, '#fde047'); }
        return;
    }
    if (kind === 'heart') return;   // main.js'te (+1 can) işlenir
    p.power[kind] = POWER_TIME[kind];
    const T = { shieldUp: ['KALKAN GÜCÜ!', '#86efac'], speed: ['HIZ!', '#fde047'], hammer: ['DEV BALYOZ!', '#fbbf24'] }[kind];
    floatText(T[0], at, T[1], 0.5, 1.4); toast(T[0], 1400, T[1]);
    spawnFx('collect', p.pos.clone().setY(p.pos.y + 1), 1.6);
    playSfx('coin', { rate: 1.3, vol: 0.6 });
}

// --- HER KAREDE: süreler, görünüm (dev balyoz, koruma küresi), HUD ---
let bubble = null;
export function updatePowers(dt) {
    const p = G.player; if (!p) return;
    const P = p.power;
    for (const k in P) if (P[k] > 0) { P[k] = Math.max(0, P[k] - dt); if (P[k] === 0) floatText(tr({ shieldUp: 'KALKAN GÜCÜ!', speed: 'HIZ!', hammer: 'DEV BALYOZ!' }[k]) + ' ✖', p.pos.clone().setY(p.pos.y + 2.4), '#94a3b8', 0.32); }
    // dev balyoz: büyür (bitmeye 2 sn kala yanıp söner)
    const hk = P.hammer > 0 ? (P.hammer < 2 && Math.floor(P.hammer * 8) % 2 ? 1.3 : 1.9) : 1;
    p.m.hammer.scale.setScalar(p.m.hammer.scale.x + (hk - p.m.hammer.scale.x) * Math.min(1, dt * 10));
    // koruma küresi
    if (!bubble) {
        bubble = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14), new THREE.MeshBasicMaterial({ color: '#86efac', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
        bubble.position.y = 0.95; bubble.scale.y = 1.15;
    }
    if (bubble.parent !== p.m.root) p.m.root.add(bubble);
    bubble.visible = P.shieldUp > 0 && !(P.shieldUp < 2 && Math.floor(P.shieldUp * 8) % 2);
    if (bubble.visible) { bubble.material.opacity = 0.14 + Math.sin(G.time * 7) * 0.05; bubble.rotation.y += dt; }
    // hızlıyken ayak tozu
    if (P.speed > 0 && p.grounded && Math.hypot(p.vel.x, p.vel.z) > 5 && Math.random() < dt * 20)
        burst(p.pos.clone().setY(p.pos.y + 0.1), { n: 1, color: ['#fde047', '#fef3c7'], speed: 1, up: 1.2, size: 0.08, life: 0.35, gravity: 2 });
    // HUD: kalan süreler
    const el = document.getElementById('powers');
    if (el) {
        const s = (P.shieldUp > 0 ? `🛡️${Math.ceil(P.shieldUp)} ` : '') + (P.speed > 0 ? `⚡${Math.ceil(P.speed)} ` : '') + (P.hammer > 0 ? `🔨${Math.ceil(P.hammer)}` : '');
        if (el.textContent !== s) el.textContent = s;
    }
}
export function resetPowers(p) { p.power.shieldUp = p.power.speed = p.power.hammer = 0; if (p.m.hammer) p.m.hammer.scale.setScalar(1); }
