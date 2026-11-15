// HIRHIZ 3D: 1. bölüm düşmanları ve mermiler
// Gezi kahramanları (Çarşı, Kırmızılı Kadın, Semazen, Çapulcu) slogan atar; Tencere Tava kalkan hücumu yapar (2 can);
// Duran Adam hiç kıpırdamaz (ne balyoz ne rüşvet işler). 1. bölümde rüşvet işlemez: "BİZ RÜŞVET ALMAYIZ!"
import * as THREE from 'three';
import { buildHero, walkPose, nameLabel } from './models.js?v=1';
import { G, diff, addScore } from './state.js?v=1';
import { hurtPlayer, shieldBlocks, blockFx, bouncePlayer, HAMMER_REACH } from './player.js?v=1';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=1';
import { playSfx, beep } from './audio.js?v=1';
import { groundAt } from './physics.js?v=1';
import { AABB, angDiff, dampAngle, textSprite, disposeSprite, rand } from './util.js?v=1';

const NAMES = { carsi: 'ÇARŞI', kirmizi: 'KIRMIZILI KADIN', sema: 'SEMAZEN', capulcu: 'ÇAPULCU', tencere: 'TENCERE TAVA', duran: 'DURAN ADAM' };
const SLOGANS = ['HER YER TAKSİM!', 'DİRENİŞ!', 'ÇAPULCUYUZ!', 'HÜKÜMET İSTİFA!'];
const ALERT = 17, FIRE = 2.8, SLOGAN_V = 8;

export function spawnEnemies(scene, list) {
    G.enemies = [];
    list.forEach(([skin, x, z], i) => {
        const m = buildHero(skin);
        m.root.position.set(x, 0, z);
        m.root.rotation.y = 0;
        scene.add(m.root);
        const label = nameLabel(NAMES[skin], 2.45); m.root.add(label);
        const kind = skin === 'duran' ? 'duran' : skin === 'tencere' ? 'tencere' : 'hero';
        const e = {
            kind, skin, m, label, pos: m.root.position, home: new THREE.Vector3(x, 0, z), idx: i,
            facing: 0, phase: Math.random() * 6, hp: kind === 'tencere' ? 2 : 1, dead: false, deadT: 0,
            fireT: rand(0.8, 2.2), aim: 0, pat: Math.random() < 0.5 ? 1 : -1, axisZ: i % 3 === 0,
            atk: 'idle', atkT: 0, atkCd: 1.5, chargeDir: 0, stun: 0, refused: 0, hurtT: 0, warn: null
        };
        if (kind === 'duran') {   // katı engel
            e.aabb = new AABB(x - 0.35, 0, z - 0.3, x + 0.35, 1.9, z + 0.3, 'solid');
            G.world.solids.push(e.aabb);
        }
        G.enemies.push(e);
    });
}

export function clearEnemies(scene) {
    G.enemies.forEach(e => { scene.remove(e.m.root); disposeSprite(e.label); if (e.warn) disposeSprite(e.warn); });
    G.world.solids = G.world.solids.filter(a => !G.enemies.some(e => e.aabb === a));
    G.enemies = [];
    G.projectiles.forEach(p => killProj(p)); G.projectiles = [];
}

export function updateEnemies(dt) {
    const p = G.player;
    for (const e of G.enemies) {
        if (e.dead) { updateDead(e, dt); continue; }
        if (e.kind === 'duran') { e.m.root.rotation.y = 0; continue; }
        if (e.hurtT > 0) e.hurtT -= dt;
        const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, d = Math.hypot(dx, dz), dy = p.pos.y - e.pos.y;
        const toP = Math.atan2(dx, dz);
        if (e.kind === 'tencere') updateTencere(e, dt, d, dy, toP);
        else updateHero(e, dt, d, dy, toP);
        e.m.root.rotation.y = e.facing;
        // Temas: üstüne zıplarsa ezilir, yoksa oyuncu can kaybeder
        if (!p.dead && d < 0.75 && dy > -1.6 && dy < 1.9) {
            if (p.vel.y < -1 && dy > 1.0) { bouncePlayer(10); damageEnemy(e, 9, 'stomp'); }
            else if (!(e.kind === 'tencere' && e.stun > 0)) hurtPlayer(e.pos);
        }
    }
    updateProjectiles(dt);
}

function patrol(e, dt, spd) {
    const ax = e.axisZ ? 'z' : 'x';
    const off = e.pos[ax] - e.home[ax];
    if (off > 2.5) e.pat = -1; else if (off < -2.5) e.pat = 1;
    e.pos[ax] += e.pat * spd * dt;
    const want = e.axisZ ? (e.pat > 0 ? 0 : Math.PI) : (e.pat > 0 ? Math.PI / 2 : -Math.PI / 2);
    e.facing = dampAngle(e.facing, want, 6, dt);
    e.phase += dt * 7; walkPose(e.m, e.phase, 0.7);
}

function updateHero(e, dt, d, dy, toP) {
    const alert = d < ALERT && Math.abs(dy) < 4 && !G.player.dead;
    if (e.skin === 'sema' && e.m.skirt) e.m.skirt.rotation.y += dt * 8;
    if (!alert) { patrol(e, dt, 1.3 * diff().speed); e.m.armR.rotation.x = 0; e.aim = 0; return; }
    e.facing = dampAngle(e.facing, toP, 5, dt);
    walkPose(e.m, e.phase, 0);
    e.fireT -= dt;
    e.aim = Math.max(0, e.aim - dt * 3);
    if (e.fireT < 0.35) e.aim = Math.min(1, 1 - e.fireT / 0.35);
    e.m.armR.rotation.x = -1.6 * e.aim;
    if (e.skin === 'sema') e.m.armL.rotation.x = -2.6;
    if (e.fireT <= 0) {
        // Bölümün başında yavaş, sonra hızlanır (bölüm içi tempo)
        const ramp = e.idx < 2 ? 1.3 : e.idx >= 8 ? 0.9 : 1;
        e.fireT = FIRE * diff().fire * ramp * rand(0.85, 1.15);
        throwSlogan(e);
    }
}

function throwSlogan(e) {
    const p = G.player;
    const from = e.pos.clone().add(new THREE.Vector3(Math.sin(e.facing) * 0.5, 1.45, Math.cos(e.facing) * 0.5));
    const to = p.pos.clone().setY(p.pos.y + 1.1);
    const v = to.sub(from).normalize().multiplyScalar(SLOGAN_V * (0.9 + 0.1 * diff().speed));
    const s = textSprite(SLOGANS[Math.floor(Math.random() * SLOGANS.length)], { size: 40, height: 0.42, color: '#111827', bg: 'rgba(248,250,252,0.95)' });
    s.position.copy(from); G.scene.add(s);
    G.projectiles.push({ type: 'slogan', mesh: s, pos: s.position, vel: v, life: 3.2 });
    playSfx('hit', { rate: 1.6, vol: 0.25 });
}

// Tencere Tava: kalkan hücumu (hazırlan → hücum → soluklan)
function updateTencere(e, dt, d, dy, toP) {
    const p = G.player, S = diff();
    if (e.atkCd > 0) e.atkCd -= dt;
    if (e.stun > 0) {   // kalkana çarpıp sersemledi
        e.stun -= dt; e.m.body.rotation.z = Math.sin(G.time * 14) * 0.15;
        if (e.warn) e.warn.visible = true, e.warn.material.rotation += dt * 4;
        if (e.stun <= 0) { e.m.body.rotation.z = 0; setWarn(e, null); }
        return;
    }
    // Kepçeyle tencereye vurur
    e.m.armR.rotation.x = -2.6 + Math.sin(G.time * 11 + e.idx) * 0.35;
    if (d < 14 && Math.random() < dt * 2.2) beep('pan');
    if (e.atk === 'idle') {
        e.m.body.rotation.x = 0;
        const front = Math.abs(angDiff(e.facing, toP)) < 0.45;
        if (d < ALERT && Math.abs(dy) < 1.2 && !p.dead) {
            e.facing = dampAngle(e.facing, toP, 4, dt);
            if (d > 6) { stepToward(e, toP, 1.2 * S.speed, dt); e.phase += dt * 6; walkPose(e.m, e.phase, 0.6); } else walkPose(e.m, e.phase, 0);
            if (front && d > 2.5 && d < 9 && e.atkCd <= 0) { e.atk = 'wind'; e.atkT = 0.67 * S.fire; setWarn(e, '!'); }
        } else { patrol(e, dt, 1.0 * S.speed); }
    } else if (e.atk === 'wind') {   // geriye yaslanır, başında kırmızı !
        e.atkT -= dt; e.m.body.rotation.x = -0.25;
        e.facing = dampAngle(e.facing, toP, 6, dt);
        if (e.atkT <= 0) { e.atk = 'charge'; e.atkT = 0.8; e.chargeDir = e.facing; setWarn(e, null); }
    } else if (e.atk === 'charge') {
        e.atkT -= dt; e.m.body.rotation.x = 0.3;
        stepToward(e, e.chargeDir, 10 * S.speed, dt);
        e.phase += dt * 16; walkPose(e.m, e.phase, 1);
        if (e.atkT <= 0) { e.atk = 'rest'; e.atkT = 1.2; }
        // Oyuncu kalkanla ve ona dönük karşılarsa sersemler
        if (d < 1.15 && Math.abs(dy) < 1.6) {
            const facingMe = Math.abs(angDiff(p.facing, toP + Math.PI)) < 1.3;
            if (p.shield && facingMe) {
                e.atk = 'idle'; e.stun = 1.8; e.atkCd = 2.5;
                const back = e.chargeDir + Math.PI; stepToward(e, back, 0, 0);
                for (let k = 0; k < 10; k++) stepToward(e, back, 6, 0.016);
                blockFx(e.pos.clone().setY(1.2).lerp(p.pos.clone().setY(1.2), 0.5));
                setWarn(e, '★ ★'); addTrauma(0.25);
                p.vel.x -= Math.sin(toP) * 3; p.vel.z -= Math.cos(toP) * 3;
            } else { hurtPlayer(e.pos, { knock: 10 }); e.atk = 'rest'; e.atkT = 1.2; }
        }
    } else if (e.atk === 'rest') {   // soluklanır: kapak aşağıda
        e.atkT -= dt; e.m.body.rotation.x = 0.15; e.m.armL.rotation.x = 0.3;
        walkPose(e.m, e.phase, 0);
        if (e.atkT <= 0) { e.atk = 'idle'; e.atkCd = 1.6 * S.fire; e.m.armL.rotation.x = 0; }
    }
    if (e.atk !== 'rest') e.m.armL.rotation.x = -1.2;
}
// Zeminden çıkmadan yürür (çukura düşmez)
function stepToward(e, ang, spd, dt) {
    const nx = e.pos.x + Math.sin(ang) * spd * dt, nz = e.pos.z + Math.cos(ang) * spd * dt;
    const g = groundAt(G.world.solids, nx, nz, 0.5, 0.4);
    if (g > -0.1 && g < 0.1 && Math.abs(nx) < 17.5 && !G.world.solids.some(a => a.active && a.type === 'wall' && nx > a.min.x - 0.4 && nx < a.max.x + 0.4 && nz > a.min.z - 0.4 && nz < a.max.z + 0.4)) {
        e.pos.x = nx; e.pos.z = nz;
    } else if (e.atk === 'charge') { e.atk = 'rest'; e.atkT = 1.2; }
}
function setWarn(e, txt) {
    if (e.warn) { e.m.root.remove(e.warn); disposeSprite(e.warn); e.warn = null; }
    if (!txt) return;
    e.warn = textSprite(txt, { size: 60, height: 0.55, color: txt === '!' ? '#ef4444' : '#fde047', bg: null, stroke: '#111827' });
    e.warn.position.y = 2.9; e.m.root.add(e.warn);
}

// Hasar (balyoz ya da üstüne zıplama)
export function damageEnemy(e, power = 1, how = 'hammer') {
    if (e.dead) return;
    if (e.kind === 'duran') { sayOnce(e, 'KIPIRDAMIYOR!', '#e5e7eb'); return; }
    if (e.hurtT > 0) return;
    e.hp -= power; e.hurtT = 0.25;
    playSfx('hit', { vol: 0.6 }); addTrauma(0.18); G.hitStop = 0.06;
    burst(e.pos.clone().setY(1.2), { n: 6, color: ['#fde047', '#f8fafc'], speed: 3, up: 3 });
    if (e.kind === 'tencere' && e.atk !== 'idle') { e.atk = 'rest'; e.atkT = 1.0; setWarn(e, null); }
    if (e.hp > 0) { floatText('DANNN!', e.pos.clone().setY(2.6), '#7dd3fc', 0.4, 0.7); return; }
    e.dead = true; e.deadT = 0; setWarn(e, null); e.label.visible = false;
    G.kills++;
    addScore(e.kind === 'tencere' ? 4000 : 3000);
    floatText('ÇAPULCU!', e.pos.clone().setY(2.5), '#f8fafc', 0.5);
    spawnFx('poof', e.pos.clone().setY(0.05), 1.6);
    playSfx('cry', { vol: 0.5 });
    G.onKill && G.onKill(e);
}
function sayOnce(e, txt, col) {
    if (G.time - e.refused < 0.9) return;
    e.refused = G.time;
    floatText(txt, e.pos.clone().setY(2.7), col, 0.42);
}

function updateDead(e, dt) {
    if (!e.m.root.parent) return;
    e.deadT += dt;
    e.m.body.rotation.x = -Math.min(Math.PI / 2, e.deadT * 5);
    if (e.deadT > 1.2) e.m.root.position.y -= dt * 1.5;
    if (e.deadT > 2.2) G.scene.remove(e.m.root);
}

// Balyoz vuruşu: önündeki düşmanlar ve tuğlalar
export function hammerHit(point, p) {
    let hit = false;
    for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < HAMMER_REACH && Math.abs(e.pos.y - p.pos.y) < 1.6 && Math.abs(angDiff(p.facing, Math.atan2(dx, dz))) < 1.2) {
            damageEnemy(e); hit = true;
            if (e.kind !== 'duran') spawnFx('hit', e.pos.clone().setY(1.1), 1.2);
        }
    }
    if (hit) spawnFx('hit', point, 0.8);
    return hit;
}

// --- MERMİLER ---
export function throwBribe(from, vel) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.18), new THREE.MeshLambertMaterial({ color: '#22c55e' }));
    m.position.copy(from); G.scene.add(m);
    G.projectiles.push({ type: 'bribe', mesh: m, pos: m.position, vel, life: 2.2, own: true });
}

function killProj(p) {
    if (p.dead) return;
    p.dead = true;
    G.scene.remove(p.mesh);
    if (p.mesh.isSprite) disposeSprite(p.mesh); else if (p.mesh.geometry && p.ownGeo !== false) p.mesh.geometry.dispose?.();
}

const tmp = new THREE.Vector3();
function updateProjectiles(dt) {
    const pl = G.player, solids = G.world.solids;
    for (const p of G.projectiles) {
        if (p.dead) continue;
        p.life -= dt;
        if (p.life <= 0) { killProj(p); continue; }
        if (p.update) { p.update(p, dt); continue; }   // canavarın kendi mermileri
        if (p.landed) continue;
        if (p.type === 'bribe') p.vel.y -= 14 * dt;
        p.pos.addScaledVector(p.vel, dt);
        if (p.type === 'bribe') {
            p.mesh.rotation.y += dt * 12; p.mesh.rotation.x += dt * 5;
            for (const e of G.enemies) {
                if (e.dead || p.bounced) continue;
                tmp.copy(e.pos).setY(e.pos.y + 1.1);
                if (tmp.distanceTo(p.pos) < 0.8) {
                    p.vel.x *= -0.35; p.vel.z *= -0.35; p.vel.y = 3; p.bounced = true;
                    playSfx('hit', { rate: 1.9, vol: 0.3 });
                    burst(p.pos, { n: 5, color: '#fde047', speed: 2, up: 2, size: 0.07 });
                    sayOnce(e, e.kind === 'duran' ? 'KIPIRDAMIYOR!' : 'BİZ RÜŞVET ALMAYIZ!', '#f8fafc');
                }
            }
            if (G.boss && !G.boss.dead && G.boss.hitTest(p.pos)) { p.vel.multiplyScalar(-0.3); p.bounced = true; }
        } else if (p.type === 'slogan') {
            tmp.copy(pl.pos).setY(pl.pos.y + 1.0);
            if (!pl.dead && Math.abs(p.pos.x - pl.pos.x) < 0.55 && Math.abs(p.pos.z - pl.pos.z) < 0.55 && p.pos.y > pl.pos.y && p.pos.y < pl.pos.y + pl.h) {
                if (shieldBlocks(p.pos, p.vel)) blockFx(p.pos.clone());
                else hurtPlayer(p.pos);
                killProj(p); continue;
            }
        }
        // Zemine ya da rafa çarptı
        const g = groundAt(solids, p.pos.x, p.pos.z, p.pos.y + 0.6);
        if (p.pos.y <= g) {
            if (p.type === 'bribe' && !p.landed) { p.landed = true; p.vel.set(0, 0, 0); p.pos.y = g + 0.05; p.life = Math.min(p.life, 0.6); }
            else if (p.type !== 'bribe') { burst(p.pos, { n: 4, color: '#f8fafc', speed: 1.5, up: 1.5, size: 0.08 }); killProj(p); }
        }
        if (p.pos.y < -6) killProj(p);
    }
    G.projectiles = G.projectiles.filter(p => !p.dead);
}
export { killProj };
