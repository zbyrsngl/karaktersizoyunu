// HIRHIZ 3D: yerde kalan tehlikeler (düşmanlar ve canavar ortak kullanır)
// - gaz bulutu: içindekini yavaşlatır (baret + maske korur)
// - ateş: meşalenin düştüğü yerde kısa süre yanar, basana can götürür
// - ses dalgası: tencere tavadan yerde büyüyen halka; üstünden zıplanmazsa can götürür
import * as THREE from 'three';
import { G } from './state.js?v=29';
import { hurtPlayer } from './player.js?v=29';
import { floatText, burst, spawnFx, addTrauma } from './fx.js?v=29';
import { playSfx } from './audio.js?v=29';
import { rand } from './util.js?v=29';

let list = [];

const CLOUD_MAT = new THREE.MeshLambertMaterial({ color: '#e5e7eb', transparent: true, opacity: 0.55, depthWrite: false });
const CLOUD_GEO = new THREE.IcosahedronGeometry(1, 1);
export function makeCloud(pos, { r = 2.6, t = 3, hurt = false } = {}) {
    const g = new THREE.Group(); g.position.copy(pos);
    const k = r / 2.6;
    for (let i = 0; i < 7; i++) {
        const s = new THREE.Mesh(CLOUD_GEO, CLOUD_MAT), a = i / 7 * Math.PI * 2;
        s.position.set(Math.cos(a) * 1.3 * k * (i ? 1 : 0), (0.8 + (i % 3) * 0.3) * k, Math.sin(a) * 1.3 * k * (i ? 1 : 0));
        s.scale.setScalar(rand(1.1, 1.5) * k); g.add(s);
    }
    G.scene.add(g);
    list.push({ kind: 'cloud', g, pos: g.position, t, max: t, r, hurt });
}

const FIRE_MATS = ['#f97316', '#facc15', '#ef4444'].map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }));
const FLAME_GEO = new THREE.ConeGeometry(0.16, 0.5, 5);
export function makeFire(pos, { r = 0.95, t = 1.8 } = {}) {
    const g = new THREE.Group(); g.position.copy(pos);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 16), new THREE.MeshBasicMaterial({ color: '#7c2d12', transparent: true, opacity: 0.55, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; g.add(disc);
    const flames = [];
    for (let i = 0; i < 9; i++) {
        const f = new THREE.Mesh(FLAME_GEO, FIRE_MATS[i % 3]), a = rand(0, 6.28), d = rand(0, r * 0.8);
        f.position.set(Math.cos(a) * d, 0.25, Math.sin(a) * d); g.add(f); flames.push(f);
    }
    G.scene.add(g);
    list.push({ kind: 'fire', g, pos: g.position, t, max: t, r, flames, disc });
}

const RING_MAT = new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
export function makeRing(pos, { speed = 6, maxR = 9 } = {}) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), RING_MAT.clone());
    m.rotation.x = -Math.PI / 2; m.position.copy(pos).setY(pos.y + 0.12);
    G.scene.add(m);
    list.push({ kind: 'ring', m, pos: m.position.clone(), r: 0.3, speed, maxR, hit: false });
}

// Bomba: mesh yere konur, fünye bitince patlar (kaçmaya vakit var)
const BOMB_R = 2.1;
export function makeBomb(pos, mesh, { fuse = 1.1 } = {}) {
    mesh.position.copy(pos).setY(pos.y + 0.2); mesh.rotation.set(0, 0, 0);
    if (!mesh.parent) G.scene.add(mesh);
    const ring = new THREE.Mesh(new THREE.RingGeometry(BOMB_R - 0.12, BOMB_R, 32), new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.copy(pos).setY(pos.y + 0.05); G.scene.add(ring);
    list.push({ kind: 'bomb', mesh, ring, pos: pos.clone(), t: fuse, max: fuse });
}
function bombBlast(h) { blast(h.pos); }
// Patlama (bomba, takke): yakındaki oyuncu can kaybeder
export function blast(pos, r = BOMB_R) {
    const p = G.player, at = pos.clone();
    spawnFx('boom', at, 1.8);
    burst(at.clone().setY(at.y + 0.4), { n: 14, color: ['#fde047', '#fb923c', '#f97316'], speed: 7, up: 6, size: 0.1, life: 0.5 });
    burst(at.clone().setY(at.y + 0.4), { n: 8, color: ['#44403c', '#57534e'], speed: 4, up: 6, size: 0.2, life: 0.9 });
    playSfx('boom', { vol: 0.7, rate: 1.1 });
    const d = Math.hypot(p.pos.x - at.x, p.pos.z - at.z);
    addTrauma(Math.max(0.1, 0.5 - d / 20));
    if (!p.dead && d < r && p.pos.y < at.y + 1.6) hurtPlayer(at, { knock: 9 });
}

export function updateHazards(dt) {
    const p = G.player;
    for (const h of list) {
        if (h.kind === 'cloud') {
            h.t -= dt;
            const k = Math.min(1, h.t / 0.6, (h.max - h.t) / 0.3 + 0.2);
            h.g.scale.setScalar(Math.max(0.01, k)); h.g.rotation.y += dt * 0.6;
            if (h.t > 0 && !p.dead && Math.hypot(p.pos.x - h.pos.x, p.pos.z - h.pos.z) < h.r && p.pos.y < h.pos.y + 2.5 && !(p.mask > 0)) {
                if (!(p.slow > 0)) floatText('BİBER GAZI!', p.pos.clone().setY(p.pos.y + 2.4), '#e5e7eb', 0.4, 0.9);
                p.slow = 0.15;
                if (h.hurt && !h.hitDone && h.max - h.t > 0.3) h.hitDone = hurtPlayer(h.pos, { knock: 4 });   // 2. bölüm: gaz bulutu bir kez can götürür
            }
        } else if (h.kind === 'fire') {
            h.t -= dt;
            const k = Math.min(1, h.t / 0.4);
            h.flames.forEach((f, i) => { f.scale.set(k, k * (0.7 + 0.5 * Math.abs(Math.sin(G.time * 12 + i))), k); });
            h.disc.material.opacity = 0.55 * k;
            if (Math.random() < dt * 10) burst(h.pos.clone().setY(h.pos.y + 0.4), { n: 1, color: ['#57534e', '#f97316'], speed: 0.3, up: 2, gravity: -1, size: 0.12, life: 0.6 });
            if (h.t > 0.2 && !p.dead && Math.hypot(p.pos.x - h.pos.x, p.pos.z - h.pos.z) < h.r + 0.2 && p.pos.y < h.pos.y + 0.5)
                hurtPlayer(h.pos, { knock: 7 });
        } else if (h.kind === 'bomb') {
            h.t -= dt;
            const blink = Math.sin(G.time * (14 + (h.max - h.t) * 20)) > 0;
            h.ring.material.opacity = blink ? 0.75 : 0.25;
            h.mesh.scale.setScalar(1 + (blink ? 0.08 : 0));
            if (Math.random() < dt * 30) burst(h.mesh.position.clone().setY(h.mesh.position.y + 0.28), { n: 1, color: ['#fde047', '#f97316', '#f8fafc'], speed: 0.8, up: 1.5, gravity: 3, size: 0.06, life: 0.3 });
            if (h.t <= 0) bombBlast(h);
        } else if (h.kind === 'ring') {
            h.r += h.speed * dt;
            h.m.scale.setScalar(h.r);
            h.m.material.opacity = 0.85 * (1 - h.r / h.maxR);
            const d = Math.hypot(p.pos.x - h.pos.x, p.pos.z - h.pos.z);
            // Halkanın üstündeyken yere yakınsa çarpar; zıplayan kurtulur
            if (!h.hit && !p.dead && Math.abs(d - h.r) < 0.45 && p.pos.y - h.pos.y < 0.45) {
                h.hit = true; hurtPlayer(h.pos, { knock: 8 });
            }
            h.t = h.r < h.maxR ? 1 : 0;
        }
    }
    list = list.filter(h => {
        if (h.t > 0) return true;
        if (h.g) G.scene.remove(h.g);
        if (h.m) { G.scene.remove(h.m); h.m.geometry.dispose(); h.m.material.dispose(); }
        if (h.kind === 'bomb') { G.scene.remove(h.mesh); G.scene.remove(h.ring); h.ring.geometry.dispose(); h.ring.material.dispose(); }
        return false;
    });
}
export function clearHazards() {
    list.forEach(h => { if (h.g) G.scene.remove(h.g); if (h.m) G.scene.remove(h.m); if (h.mesh) G.scene.remove(h.mesh); if (h.ring) G.scene.remove(h.ring); });
    list = [];
}
