// HIRHIZ 3D: düşman çekirdeği — kayıt, güncelleme, hasar, ortak hareketler ve mermiler.
// Düşman türleri kendi dosyalarında kaydolur: gezi.js (1. bölüm), police.js (2. bölüm).
//   TYPES[skin] = { kind, name, hp, score, build(), update(e, dt, c), shieldFront?, bribable?, onSpawn? }
// Aynı anda en çok 2 düşman saldırıya geçer (adil olsun diye).
// Oyuncunun nişanlı atışı (çay paketi ya da rüşvet destesi) 1, balyoz 2 hasar verir; üstüne zıplamak hemen yener.
import * as THREE from 'three';
import { walkPose, nameLabel } from './models.js?v=7';
import { G, diff, addScore } from './state.js?v=7';
import { hurtPlayer, shieldBlocks, blockFx, bouncePlayer, HAMMER_REACH } from './player.js?v=7';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=7';
import { playSfx } from './audio.js?v=7';
import { groundAt } from './physics.js?v=7';
import { AABB, angDiff, dampAngle, textSprite, disposeSprite, canvasTex, mat, rand } from './util.js?v=7';

export const TYPES = {};
export const ALERT = 17, LOB_G = 16;
const MAX_ATTACKERS = 2;

export function spawnEnemies(scene, list) {
    G.enemies = [];
    list.forEach(([skin, x, z, y = 0], i) => {
        const T = TYPES[skin], m = T.build();
        m.root.position.set(x, y, z);
        scene.add(m.root);
        const label = nameLabel(T.name, T.labelY || 2.45); m.root.add(label);
        const e = {
            T, kind: T.kind, skin, m, label, pos: m.root.position, home: new THREE.Vector3(x, y, z), idx: i,
            facing: T.facing || 0, phase: Math.random() * 6, hp: T.hp, dead: false, deadT: 0,
            pat: Math.random() < 0.5 ? 1 : -1, axisZ: i % 3 === 0,
            st: 'idle', t: 0, cd: rand(0.8, 2.0), steer: 0, alt: i % 2, hit: false,
            refused: 0, hurtT: 0, pop: 0, warn: null, how: null,
            ramp: i < 2 ? 1.3 : i >= 8 ? 0.9 : 1     // bölümün başında yavaş, sonra hızlanır
        };
        if (T.kind === 'duran') {   // katı engel
            e.aabb = new AABB(x - 0.35, 0, z - 0.3, x + 0.35, 1.9, z + 0.3, 'solid');
            G.world.solids.push(e.aabb);
        }
        T.onSpawn && T.onSpawn(e);
        G.enemies.push(e);
    });
}

export function clearEnemies(scene) {
    G.enemies.forEach(e => { scene.remove(e.m.root); disposeSprite(e.label); if (e.warn) disposeSprite(e.warn); e.T.onRemove && e.T.onRemove(e); });
    if (G.world) G.world.solids = G.world.solids.filter(a => !G.enemies.some(e => e.aabb === a));
    G.enemies = [];
    G.projectiles.forEach(p => killProj(p)); G.projectiles = [];
}

const busy = e => e.st !== 'idle' && e.st !== 'stun';
export function updateEnemies(dt) {
    const p = G.player;
    let attackers = 0;
    for (const e of G.enemies) if (!e.dead && busy(e)) attackers++;
    for (const e of G.enemies) {
        if (e.dead) { updateDead(e, dt); continue; }
        if (e.kind === 'duran') continue;
        if (e.hurtT > 0) e.hurtT -= dt;
        if (e.cd > 0) e.cd -= dt;
        const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
        const c = { d: Math.hypot(dx, dz), dy: p.pos.y - e.pos.y, toP: Math.atan2(dx, dz) };
        c.alert = c.d < (e.T.alert || ALERT) && Math.abs(c.dy) < 4 && !p.dead;
        c.canStart = e.cd <= 0 && attackers < MAX_ATTACKERS;
        const wasBusy = busy(e);
        if (e.st === 'stun') updateStun(e, dt);
        else e.T.update(e, dt, c);
        if (!wasBusy && busy(e)) attackers++;
        e.m.root.rotation.y = e.facing;
        // Vurulunca gövde bir an şişer
        if (e.pop > 0) { e.pop = Math.max(0, e.pop - dt * 6); const k = 1 + e.pop * 0.18; e.m.body.scale.set(k, 1 - e.pop * 0.1, k); }
        // Temas: üstüne zıplarsa ezilir, yoksa oyuncu can kaybeder
        const h = e.T.height || 1.9;
        if (!p.dead && c.d < 0.75 && c.dy > -1.6 && c.dy < h) {
            if (p.vel.y < -1 && c.dy > h - 0.9) { bouncePlayer(10); damageEnemy(e, 9, 'stomp'); }
            else if (e.st !== 'stun' && !e.T.harmless) hurtPlayer(e.pos);
        }
    }
    updateProjectiles(dt);
}

// --- ORTAK HAREKETLER (tür dosyaları kullanır) ---
export function patrol(e, dt, spd) {
    const ax = e.axisZ ? 'z' : 'x';
    const off = e.pos[ax] - e.home[ax];
    if (off > 2.5) e.pat = -1; else if (off < -2.5) e.pat = 1;
    e.pos[ax] += e.pat * spd * dt;
    const want = e.axisZ ? (e.pat > 0 ? 0 : Math.PI) : (e.pat > 0 ? Math.PI / 2 : -Math.PI / 2);
    e.facing = dampAngle(e.facing, want, 6, dt);
    e.phase += dt * 7; walkPose(e.m, e.phase, 0.7);
}
// Mesafeyi koru: yakınsa geri çekil, uzaksa yaklaş
export function keepRange(e, dt, c, near, far, spd) {
    e.facing = dampAngle(e.facing, c.toP, 5, dt);
    let moved = false;
    if (c.d < near) moved = stepToward(e, c.toP + Math.PI, spd * 0.8, dt);
    else if (c.d > far) moved = stepToward(e, c.toP, spd, dt);
    if (moved) { e.phase += dt * 7; walkPose(e.m, e.phase, 0.6); } else walkPose(e.m, e.phase, 0);
}
// Zeminden çıkmadan yürür (çukura düşmez); yürüyebildiyse true
export function stepToward(e, ang, spd, dt) {
    const nx = e.pos.x + Math.sin(ang) * spd * dt, nz = e.pos.z + Math.cos(ang) * spd * dt;
    const g = groundAt(G.world.solids, nx, nz, 0.5, 0.4);
    if (g > -0.1 && g < 0.1 && !G.world.solids.some(a => a.active && (a.type === 'wall' || a.type === 'solid') && nx > a.min.x - 0.4 && nx < a.max.x + 0.4 && nz > a.min.z - 0.4 && nz < a.max.z + 0.4)) {
        e.pos.x = nx; e.pos.z = nz; return true;
    }
    return false;
}
export function setWarn(e, txt, col) {
    if (e.warn) { e.m.root.remove(e.warn); disposeSprite(e.warn); e.warn = null; }
    if (!txt) return;
    e.warn = textSprite(txt, { size: 60, height: 0.55, color: col || (txt.includes('!') ? '#ef4444' : '#fde047'), bg: null, stroke: '#111827' });
    e.warn.position.y = (e.T.labelY || 2.45) + 0.5; e.m.root.add(e.warn);
}
export function go(e, st, t, warn) { e.st = st; e.t = t; if (warn !== undefined) setWarn(e, warn); }
export function finish(e, cd) { go(e, 'idle', 0, null); e.cd = cd * diff().fire * e.ramp * rand(0.85, 1.15); resetPose(e); }
export function resetPose(e) {
    const m = e.m;
    m.armL.rotation.set(0, 0, 0); m.armR.rotation.set(0, 0, 0); m.body.rotation.set(0, 0, 0);
}
// Sersemleme (kalkana çarpınca vb.): yıldızlar, sallanır, saldırmaz
export function stun(e, t) { resetPose(e); go(e, 'stun', t, '★ ★'); }
function updateStun(e, dt) {
    e.t -= dt;
    e.m.body.rotation.z = Math.sin(G.time * 14) * 0.15;
    if (e.warn) e.warn.material.rotation += dt * 4;
    if (e.t <= 0) { e.m.body.rotation.z = 0; finish(e, 1.2); }
}
// Oyuncu kalkanı kaldırmış ve saldırana dönükse true
export function shieldFacing(c) {
    const p = G.player;
    return p.shield && Math.abs(angDiff(p.facing, c.toP + Math.PI)) < 1.3;
}
export function midPoint(e) { return e.pos.clone().setY(e.pos.y + 1.2).lerp(G.player.pos.clone().setY(G.player.pos.y + 1.2), 0.5); }

// --- HASAR ---
// how: 'hammer' | 'ammo' (çay/rüşvet) | 'stomp'
export function damageEnemy(e, power = 2, how = 'hammer') {
    if (e.dead) return;
    if (e.kind === 'duran') { sayOnce(e, 'KIPIRDAMIYOR!', '#e5e7eb'); return; }
    if (e.hurtT > 0 && how !== 'ammo') return;
    e.hp -= power; e.hurtT = 0.25; e.pop = 1;
    playSfx('hit', { vol: how === 'ammo' ? 0.35 : 0.6, rate: how === 'ammo' ? 1.4 : 1 });
    if (how !== 'ammo') { addTrauma(0.18); G.hitStop = 0.06; }
    burst(e.pos.clone().setY(e.pos.y + 1.2), { n: how === 'ammo' ? 4 : 6, color: ['#fde047', '#f8fafc'], speed: 3, up: 3 });
    // Balyoz hazırlanan saldırıyı keser (mermi kesmez)
    if (how !== 'ammo' && (e.st === 'wind' || e.st === 'bang' || e.st === 'aim')) finish(e, 1.0);
    if (e.hp > 0) return;
    e.dead = true; e.deadT = 0; e.how = how; setWarn(e, null); e.label.visible = false;
    e.T.onDeath && e.T.onDeath(e);
    G.kills++;
    addScore(e.T.score || 3000);
    const bribed = how === 'ammo' && G.level.ammo === 'bribe' && e.T.bribable;
    floatText(bribed ? 'DOSYA KAPANDI!' : G.level.cry, e.pos.clone().setY(e.pos.y + 2.5), bribed ? '#86efac' : '#f8fafc', 0.5);
    if (bribed) { e.leave = true; resetPose(e); e.m.armR.rotation.x = -2.6; burst(e.pos.clone().setY(e.pos.y + 2), { n: 8, color: ['#22c55e', '#16a34a'], speed: 2, up: 3 }); }
    else spawnFx('poof', e.pos.clone().setY(e.pos.y + 0.05), 1.6);
    playSfx('cry', { vol: 0.5 });
    G.onKill && G.onKill(e);
}
export function sayOnce(e, txt, col) {
    if (G.time - e.refused < 0.9) return;
    e.refused = G.time;
    floatText(txt, e.pos.clone().setY(e.pos.y + 2.7), col, 0.42);
}

function updateDead(e, dt) {
    if (!e.m.root.parent) return;
    e.deadT += dt;
    if (e.leave) {   // rüşveti alan polis parayı sallayarak arkasını dönüp gider
        e.facing += dt * 3; e.m.root.rotation.y = e.facing;
        e.m.armR.rotation.x = -2.6 + Math.sin(G.time * 12) * 0.3;
        if (e.deadT > 0.8) { e.pos.x += Math.sin(e.facing) * dt * 3; e.pos.z += Math.cos(e.facing) * dt * 3; e.phase += dt * 9; walkPose(e.m, e.phase, 1); }
        if (e.deadT > 1.6) e.m.root.scale.setScalar(Math.max(0.01, 1 - (e.deadT - 1.6) * 1.5));
        if (e.deadT > 2.3) G.scene.remove(e.m.root);
        return;
    }
    e.m.body.rotation.x = -Math.min(Math.PI / 2, e.deadT * 5);
    if (e.deadT > 1.2) e.m.root.position.y -= dt * 1.5;
    if (e.deadT > 2.2) G.scene.remove(e.m.root);
}

// Balyoz vuruşu: önündeki düşmanlar
export function hammerHit(point, p) {
    let hit = false;
    for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < HAMMER_REACH && Math.abs(e.pos.y - p.pos.y) < 1.6 && Math.abs(angDiff(p.facing, Math.atan2(dx, dz))) < 1.2) {
            damageEnemy(e, 2, 'hammer'); hit = true;
            if (e.kind !== 'duran') spawnFx('hit', e.pos.clone().setY(e.pos.y + 1.1), 1.2);
        }
    }
    if (hit) spawnFx('hit', point, 0.8);
    return hit;
}

// --- DÜŞMAN MERMİLERİ (tür dosyaları kullanır) ---
export function handPos(e, up = 1.6) {
    return e.pos.clone().add(new THREE.Vector3(Math.sin(e.facing) * 0.45 + Math.cos(e.facing) * 0.3, up, Math.cos(e.facing) * 0.45 - Math.sin(e.facing) * 0.3));
}
// Düz giden mermi (slogan, kurşun): mesh verilir, oyuncuya doğru gider
export function shootStraight(mesh, from, speed, { spread = 0, type = 'bullet', life = 3.2 } = {}) {
    const p = G.player;
    const to = p.pos.clone().setY(p.pos.y + 1.1).sub(from);
    to.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
    mesh.position.copy(from); G.scene.add(mesh);
    const v = to.normalize().multiplyScalar(speed);
    if (!mesh.isSprite) mesh.lookAt(from.clone().add(v));
    G.projectiles.push({ type, mesh, pos: mesh.position, vel: v, life, ownGeo: false, update: updateStraight });
}
// Belli bir noktaya düz giden mermi (nişancı: kilitlendiği yere)
export function shootAt(mesh, from, to, speed, life = 2) {
    mesh.position.copy(from); G.scene.add(mesh);
    const v = to.clone().sub(from).normalize().multiplyScalar(speed);
    mesh.lookAt(from.clone().add(v));
    G.projectiles.push({ type: 'bullet', mesh, pos: mesh.position, vel: v, life, ownGeo: false, update: updateStraight });
}
// Kavisli atış: oyuncunun gideceği yere düşecek hız. onLand(yer noktası) düşünce çağrılır; hurtsOnHit: doğrudan çarparsa can götürür
// to: hedef nokta verilirse oyuncu yerine oraya atılır (yelpaze atışları)
export function throwLob(from, mesh, { type = 'lob', onLand = null, hurtsOnHit = true, trail = null, lead = 0.5, g = LOB_G, to = null } = {}) {
    const p = G.player, aim = to || p.pos;
    const d = Math.hypot(aim.x - from.x, aim.z - from.z), T = 0.6 + d / 13;
    const tx = aim.x + p.vel.x * T * lead, tz = aim.z + p.vel.z * T * lead;
    const gy = groundAt(G.world.solids, tx, tz, p.pos.y + 0.2);
    const ty = gy > -10 ? gy : p.pos.y;
    const vel = new THREE.Vector3((tx - from.x) / T, (ty - from.y) / T + 0.5 * g * T, (tz - from.z) / T);
    mesh.position.copy(from); G.scene.add(mesh);
    G.projectiles.push({ type, mesh, pos: mesh.position, vel, life: 4, ownGeo: false, g, onLand, hurtsOnHit, trail, update: updateLob });
}

export function hitsPlayer(p, pad = 0.55) {
    const pl = G.player;
    return !pl.dead && Math.abs(p.pos.x - pl.pos.x) < pad && Math.abs(p.pos.z - pl.pos.z) < pad && p.pos.y > pl.pos.y - 0.1 && p.pos.y < pl.pos.y + pl.h;
}
function updateStraight(p, dt) {
    for (let s = 0; s < 2; s++) {
        p.pos.addScaledVector(p.vel, dt / 2);
        if (hitsPlayer(p)) {
            if (shieldBlocks(p.pos, p.vel)) blockFx(p.pos.clone()); else hurtPlayer(p.pos);
            killProj(p); return;
        }
    }
    const g = groundAt(G.world.solids, p.pos.x, p.pos.z, p.pos.y + 0.6);
    if (p.pos.y <= g || insideSolid(p.pos)) { burst(p.pos, { n: 4, color: '#f8fafc', speed: 1.5, up: 1.5, size: 0.08 }); killProj(p); }
}
function updateLob(p, dt) {
    p.vel.y -= p.g * dt;
    p.pos.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * 9; p.mesh.rotation.z += dt * 4;
    if (p.trail && Math.random() < dt * 40) burst(p.pos, { n: 1, color: p.trail, speed: 0.3, up: 0.5, gravity: -0.5, size: 0.1, life: 0.5 });
    if (hitsPlayer(p, 0.6)) {
        if (shieldBlocks(p.pos, p.vel)) { blockFx(p.pos.clone()); killProj(p); return; }
        if (p.hurtsOnHit) { hurtPlayer(p.pos); killProj(p); return; }
    }
    const g = groundAt(G.world.solids, p.pos.x, p.pos.z, p.pos.y + 0.6);
    if (p.pos.y <= g) {
        p.onLand && p.onLand(new THREE.Vector3(p.pos.x, g, p.pos.z));
        playSfx('hit', { rate: 0.6, vol: 0.35 });
        killProj(p);
    } else if (p.pos.y < -5) killProj(p);
}
function insideSolid(pos) {
    for (const a of G.world.solids) {
        if (!a.active || a.type === 'wall') continue;
        if (pos.x > a.min.x && pos.x < a.max.x && pos.y > a.min.y && pos.y < a.max.y && pos.z > a.min.z && pos.z < a.max.z) return a;
    }
    return null;
}

// --- OYUNCUNUN NİŞANLI ATIŞI: çay paketi (1. bölüm) ya da rüşvet destesi (2. bölüm) ---
const AMMO = {};
function ammoMat(kind) {
    if (AMMO[kind]) return AMMO[kind];
    const tex = kind === 'tea'
        ? canvasTex(64, 32, (g) => {
            g.fillStyle = '#dc2626'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#fef3c7'; g.fillRect(4, 4, 56, 24);
            g.fillStyle = '#b91c1c'; g.font = 'bold 18px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ÇAY', 32, 17);
        }, { pixel: true })
        : canvasTex(64, 32, (g) => {
            g.fillStyle = '#15803d'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#bbf7d0'; g.fillRect(3, 3, 58, 26);
            g.fillStyle = '#166534'; g.font = 'bold 20px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$100', 32, 17);
            g.fillStyle = '#facc15'; g.fillRect(28, 0, 8, 32);
        }, { pixel: true });
    return (AMMO[kind] = new THREE.MeshLambertMaterial({ map: tex }));
}
const AMMO_GEO = { tea: new THREE.BoxGeometry(0.3, 0.08, 0.2), bribe: new THREE.BoxGeometry(0.34, 0.1, 0.17) };
export function throwAmmo(from, dir) {
    const kind = G.level.ammo;
    const m = new THREE.Mesh(AMMO_GEO[kind], ammoMat(kind)); m.position.copy(from); G.scene.add(m);
    G.projectiles.push({ type: 'ammo', kind, mesh: m, pos: m.position, vel: dir.clone().multiplyScalar(30), life: 1.6, ownGeo: false, update: updateAmmo });
}
function updateAmmo(p, dt) {
    p.mesh.rotation.y += dt * 20; p.mesh.rotation.x += dt * 7;
    for (let s = 0; s < 2; s++) {   // iki alt adım: hızlı mermi düşmanın içinden geçmesin
        p.vel.y -= 3 * dt / 2;
        p.pos.addScaledVector(p.vel, dt / 2);
        for (const e of G.enemies) {
            if (e.dead || !e.m.root.parent) continue;
            const h = e.T.height || 1.95;
            if (Math.abs(p.pos.x - e.pos.x) < 0.45 && Math.abs(p.pos.z - e.pos.z) < 0.45 && p.pos.y > e.pos.y && p.pos.y < e.pos.y + h) {
                // Kalkanlı polis: önden gelen mermiyi kalkanı durdurur
                const fromFront = Math.abs(angDiff(e.facing, Math.atan2(-p.vel.x, -p.vel.z))) < 1.2;
                if (e.kind === 'duran') sayOnce(e, 'KIPIRDAMIYOR!', '#e5e7eb');
                else if (e.T.shieldFront && fromFront && e.st !== 'stun' && e.st !== 'rest') {
                    sayOnce(e, 'KALKANLI! YANDAN VUR!', '#fde047'); blockFx(p.pos.clone()); G.onAmmoHit && G.onAmmoHit(false); killProj(p); return;
                } else damageEnemy(e, 1, 'ammo');
                ammoSplash(p); G.onAmmoHit && G.onAmmoHit(e.kind !== 'duran'); killProj(p); return;
            }
        }
        const B = G.boss;
        if (B && !B.dead && B.hitTest(p.pos)) { B.onAmmo && B.onAmmo(p); ammoSplash(p); killProj(p); return; }
        const a = insideSolid(p.pos);
        if (a) { if (a.type === 'brick') G.onBrickHit && G.onBrickHit(a); ammoSplash(p); killProj(p); return; }
    }
    if (p.pos.y < -5) killProj(p);
}
function ammoSplash(p) {
    burst(p.pos, { n: 7, color: p.kind === 'tea' ? ['#14532d', '#78350f', '#dc2626'] : ['#22c55e', '#16a34a', '#bbf7d0'], speed: 2.5, up: 2.5, size: 0.08, life: 0.5 });
}

export function killProj(p) {
    if (p.dead) return;
    p.dead = true;
    G.scene.remove(p.mesh);
    if (p.mesh.isSprite) disposeSprite(p.mesh); else if (p.mesh.geometry && p.ownGeo !== false) p.mesh.geometry.dispose?.();
}

function updateProjectiles(dt) {
    for (const p of G.projectiles) {
        if (p.dead) continue;
        p.life -= dt;
        if (p.life <= 0) { killProj(p); continue; }
        p.update(p, dt);
    }
    G.projectiles = G.projectiles.filter(p => !p.dead);
}
export { mat };
