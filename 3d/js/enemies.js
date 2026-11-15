// HIRHIZ 3D: 1. bölüm düşmanları ve mermiler
// Her kahramanın kendi saldırısı var; hepsi önce belli eder (başında kırmızı ! ve hazırlık hareketi):
//   Çarşı: kavisli meşale atar, düştüğü yer kısa süre yanar
//   Kırmızılı Kadın: koşup bez çantasını savurur (yakın dövüş)
//   Semazen: dönerek üstüne gelir, sonra başı döner ve sersemler (vurma fırsatı)
//   Çapulcu: üçlü slogan yelpazesi ya da gaz kapsülünü geri fırlatır (bulut yavaşlatır)
//   Tencere Tava (3 can): kalkan hücumu ya da tencereye vurup yerde yayılan ses dalgası (üstünden zıpla)
//   Duran Adam: hiç kıpırdamaz, hiçbir şey işlemez
// Aynı anda en çok 2 düşman saldırıya geçer (adil olsun diye).
// Oyuncunun çay paketi (nişanlı atış) 1, balyoz 2 hasar verir; üstüne zıplamak hemen yener.
import * as THREE from 'three';
import { buildHero, walkPose, nameLabel } from './models.js?v=4';
import { G, diff, addScore } from './state.js?v=4';
import { hurtPlayer, shieldBlocks, blockFx, bouncePlayer, HAMMER_REACH } from './player.js?v=4';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=4';
import { playSfx, beep } from './audio.js?v=4';
import { groundAt } from './physics.js?v=4';
import { makeCloud, makeFire, makeRing } from './hazards.js?v=4';
import { AABB, angDiff, dampAngle, textSprite, disposeSprite, canvasTex, mat, rand } from './util.js?v=4';

const NAMES = { carsi: 'ÇARŞI', kirmizi: 'KIRMIZILI KADIN', sema: 'SEMAZEN', capulcu: 'ÇAPULCU', tencere: 'TENCERE TAVA', duran: 'DURAN ADAM' };
const SLOGANS = ['HER YER TAKSİM!', 'DİRENİŞ!', 'ÇAPULCUYUZ!', 'HÜKÜMET İSTİFA!'];
const ALERT = 17, LOB_G = 16, MAX_ATTACKERS = 2;
const HP = { hero: 2, tencere: 3, duran: 1 };

export function spawnEnemies(scene, list) {
    G.enemies = [];
    list.forEach(([skin, x, z], i) => {
        const m = buildHero(skin);
        m.root.position.set(x, 0, z);
        scene.add(m.root);
        const label = nameLabel(NAMES[skin], 2.45); m.root.add(label);
        const kind = skin === 'duran' ? 'duran' : skin === 'tencere' ? 'tencere' : 'hero';
        const e = {
            kind, skin, m, label, pos: m.root.position, home: new THREE.Vector3(x, 0, z), idx: i,
            facing: 0, phase: Math.random() * 6, hp: HP[kind], dead: false, deadT: 0,
            pat: Math.random() < 0.5 ? 1 : -1, axisZ: i % 3 === 0,
            st: 'idle', t: 0, cd: rand(0.8, 2.0), steer: 0, alt: i % 2, hit: false,
            refused: 0, hurtT: 0, pop: 0, warn: null,
            ramp: i < 2 ? 1.3 : i >= 8 ? 0.9 : 1     // bölümün başında yavaş, sonra hızlanır
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
        c.alert = c.d < ALERT && Math.abs(c.dy) < 4 && !p.dead;
        c.canStart = e.cd <= 0 && attackers < MAX_ATTACKERS;
        const wasBusy = busy(e);
        if (e.st === 'stun') updateStun(e, dt);
        else BEHAVIOR[e.skin](e, dt, c);
        if (!wasBusy && busy(e)) attackers++;
        e.m.root.rotation.y = e.facing;
        // Vurulunca gövde bir an şişer
        if (e.pop > 0) { e.pop = Math.max(0, e.pop - dt * 6); const k = 1 + e.pop * 0.18; e.m.body.scale.set(k, 1 - e.pop * 0.1, k); }
        // Temas: üstüne zıplarsa ezilir, yoksa oyuncu can kaybeder
        if (!p.dead && c.d < 0.75 && c.dy > -1.6 && c.dy < 1.9) {
            if (p.vel.y < -1 && c.dy > 1.0) { bouncePlayer(10); damageEnemy(e, 9, 'stomp'); }
            else if (e.st !== 'stun') hurtPlayer(e.pos);
        }
    }
    updateProjectiles(dt);
}

// --- ORTAK HAREKETLER ---
function patrol(e, dt, spd) {
    const ax = e.axisZ ? 'z' : 'x';
    const off = e.pos[ax] - e.home[ax];
    if (off > 2.5) e.pat = -1; else if (off < -2.5) e.pat = 1;
    e.pos[ax] += e.pat * spd * dt;
    const want = e.axisZ ? (e.pat > 0 ? 0 : Math.PI) : (e.pat > 0 ? Math.PI / 2 : -Math.PI / 2);
    e.facing = dampAngle(e.facing, want, 6, dt);
    e.phase += dt * 7; walkPose(e.m, e.phase, 0.7);
}
// Mesafeyi koru: yakınsa geri çekil, uzaksa yaklaş
function keepRange(e, dt, c, near, far, spd) {
    e.facing = dampAngle(e.facing, c.toP, 5, dt);
    let moved = false;
    if (c.d < near) moved = stepToward(e, c.toP + Math.PI, spd * 0.8, dt);
    else if (c.d > far) moved = stepToward(e, c.toP, spd, dt);
    if (moved) { e.phase += dt * 7; walkPose(e.m, e.phase, 0.6); } else walkPose(e.m, e.phase, 0);
}
// Zeminden çıkmadan yürür (çukura düşmez); yürüyebildiyse true
function stepToward(e, ang, spd, dt) {
    const nx = e.pos.x + Math.sin(ang) * spd * dt, nz = e.pos.z + Math.cos(ang) * spd * dt;
    const g = groundAt(G.world.solids, nx, nz, 0.5, 0.4);
    if (g > -0.1 && g < 0.1 && !G.world.solids.some(a => a.active && (a.type === 'wall' || a.type === 'solid') && nx > a.min.x - 0.4 && nx < a.max.x + 0.4 && nz > a.min.z - 0.4 && nz < a.max.z + 0.4)) {
        e.pos.x = nx; e.pos.z = nz; return true;
    }
    return false;
}
function setWarn(e, txt, col) {
    if (e.warn) { e.m.root.remove(e.warn); disposeSprite(e.warn); e.warn = null; }
    if (!txt) return;
    e.warn = textSprite(txt, { size: 60, height: 0.55, color: col || (txt.includes('!') ? '#ef4444' : '#fde047'), bg: null, stroke: '#111827' });
    e.warn.position.y = 2.95; e.m.root.add(e.warn);
}
function go(e, st, t, warn) { e.st = st; e.t = t; if (warn !== undefined) setWarn(e, warn); }
function finish(e, cd) { go(e, 'idle', 0, null); e.cd = cd * diff().fire * e.ramp * rand(0.85, 1.15); resetPose(e); }
function resetPose(e) {
    const m = e.m;
    m.armL.rotation.set(0, 0, 0); m.armR.rotation.set(0, 0, 0); m.body.rotation.set(0, 0, 0);
}
// Sersemleme (kalkana çarpınca, semazen dönüşten sonra): yıldızlar, sallanır, saldırmaz
function stun(e, t) { resetPose(e); go(e, 'stun', t, '★ ★'); }
function updateStun(e, dt) {
    e.t -= dt;
    e.m.body.rotation.z = Math.sin(G.time * 14) * 0.15;
    if (e.warn) e.warn.material.rotation += dt * 4;
    if (e.t <= 0) { e.m.body.rotation.z = 0; finish(e, 1.2); }
}
// Oyuncu kalkanı kaldırmış ve saldırana dönükse true
function shieldFacing(c) {
    const p = G.player;
    return p.shield && Math.abs(angDiff(p.facing, c.toP + Math.PI)) < 1.3;
}

// --- ÇARŞI: kavisli meşale ---
function carsi(e, dt, c) {
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.3 * diff().speed); return; }
        keepRange(e, dt, c, 6, 13, 1.6 * diff().speed);
        if (c.canStart && c.d < 15) { go(e, 'wind', 0.55, '!'); beep('pan'); }
    } else if (e.st === 'wind') {   // kolunu geri alır, meşale elinde yanar
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        e.m.armR.rotation.x = 1.3 * (1 - e.t / 0.55) + 0.2;
        if (Math.random() < dt * 25) burst(handPos(e), { n: 1, color: ['#ef4444', '#f97316'], speed: 0.4, up: 1.5, gravity: -1, size: 0.09, life: 0.4 });
        if (e.t <= 0) { throwLob(e, 'flare'); go(e, 'rest', 0.35, null); e.m.armR.rotation.x = -1.8; }
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) finish(e, 2.6); }
}

// --- KIRMIZILI KADIN: koşup çanta savurur ---
function kirmizi(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.3 * S.speed); return; }
        e.facing = dampAngle(e.facing, c.toP, 7, dt);
        if (c.d > 1.5 && Math.abs(c.dy) < 1.2) {
            if (stepToward(e, c.toP, (e.cd > 0 ? 1.4 : 2.8) * S.speed, dt)) { e.phase += dt * 10; walkPose(e.m, e.phase, 1); }
        } else walkPose(e.m, e.phase, 0);
        if (c.canStart && c.d < 1.9 && Math.abs(c.dy) < 1.3) go(e, 'wind', 0.45 * S.fire + 0.1, '!');
    } else if (e.st === 'wind') {   // çantayı yukarı kaldırır
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 6, dt);
        e.m.armL.rotation.x = -2.7; e.m.body.rotation.y = 0.35;
        if (e.t <= 0) { go(e, 'swing', 0.18, null); e.hit = false; beep('swing'); }
    } else if (e.st === 'swing') {
        e.t -= dt;
        const k = 1 - e.t / 0.18;
        e.m.armL.rotation.x = -2.7 + 3.4 * k; e.m.body.rotation.y = 0.35 - 0.8 * k;
        if (!e.hit && k > 0.4) {
            e.hit = true;
            const front = Math.abs(angDiff(e.facing, c.toP)) < 1.1;
            if (c.d < 2.1 && front && Math.abs(c.dy) < 1.4) {
                if (shieldFacing(c)) { blockFx(e.pos.clone().setY(1.2).lerp(G.player.pos.clone().setY(1.2), 0.5)); stun(e, 1.3); return; }
                hurtPlayer(e.pos, { knock: 7 });
            }
        }
        if (e.t <= 0) go(e, 'rest', 0.8);
    } else if (e.st === 'rest') {   // geri çekilir
        e.t -= dt; e.m.body.rotation.y = 0;
        if (stepToward(e, c.toP + Math.PI, 1.6, dt)) { e.phase += dt * 6; walkPose(e.m, e.phase, 0.5); }
        if (e.t <= 0) finish(e, 1.7);
    }
}

// --- SEMAZEN: dönerek gelir, sonra sersemler ---
function sema(e, dt, c) {
    const S = diff();
    if (e.m.skirt) e.m.skirt.rotation.y += dt * (e.st === 'spin' ? 30 : 8);
    if (e.st === 'idle') {
        e.m.armL.rotation.x = -2.6;
        if (!c.alert) { patrol(e, dt, 1.2 * S.speed); return; }
        keepRange(e, dt, c, 0, 9, 1.4 * S.speed);
        if (c.canStart && c.d < 11 && Math.abs(c.dy) < 1.2) { go(e, 'wind', 0.75, '!'); e.steer = c.toP; }
    } else if (e.st === 'wind') {   // kollarını açar, yavaşça dönmeye başlar
        e.t -= dt;
        e.m.armL.rotation.set(0, 0, -1.4); e.m.armR.rotation.set(0, 0, 1.4);
        e.m.body.rotation.y += dt * (6 - e.t * 6);
        if (e.t <= 0) { go(e, 'spin', 2.2, null); e.steer = c.toP; e.hit = false; }
    } else if (e.st === 'spin') {   // dönerek oyuncuya yönelir (yavaş döner, yana kaçılabilir)
        e.t -= dt;
        e.m.body.rotation.y += dt * 18;
        e.steer += Math.max(-1.5 * dt, Math.min(1.5 * dt, angDiff(e.steer, c.toP)));
        e.facing = e.steer;
        if (!stepToward(e, e.steer, 4.3 * S.speed, dt)) e.t = Math.min(e.t, 0.1);
        if (Math.random() < dt * 20) burst(e.pos.clone().setY(0.1), { n: 1, color: '#e7e5e4', speed: 1.5, up: 0.5, size: 0.1, life: 0.4, gravity: 2 });
        if (!e.hit && c.d < 1.1 && Math.abs(c.dy) < 1.5) {
            e.hit = true;
            if (shieldFacing(c)) { blockFx(e.pos.clone().setY(1.2).lerp(G.player.pos.clone().setY(1.2), 0.5)); stun(e, 2.0); return; }
            hurtPlayer(e.pos, { knock: 9 });
        }
        if (e.t <= 0) { stun(e, 1.5); floatText('BAŞI DÖNDÜ!', e.pos.clone().setY(2.6), '#fde047', 0.38, 0.9); }
    }
}

// --- ÇAPULCU: slogan yelpazesi ya da gaz kapsülünü geri atar ---
function capulcu(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.3 * S.speed); return; }
        keepRange(e, dt, c, 7, 12, 1.5 * S.speed);
        if (c.canStart && c.d < 15) { e.alt ^= 1; go(e, 'wind', 0.5, e.alt ? '!' : '!!'); }
    } else if (e.st === 'wind') {
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        if (e.alt) e.m.armR.rotation.x = -2.8; else e.m.armR.rotation.x = 1.2 * (1 - e.t / 0.5);
        if (e.t <= 0) {
            if (e.alt) [-0.24, 0, 0.24].forEach(a => throwSlogan(e, a));
            else throwLob(e, 'can');
            e.m.armR.rotation.x = -1.6;
            go(e, 'rest', 0.4, null);
        }
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) finish(e, 2.7); }
}

// --- TENCERE TAVA: kalkan hücumu ya da ses dalgası ---
function tencere(e, dt, c) {
    const S = diff(), p = G.player;
    if (e.st !== 'charge') e.m.armR.rotation.x = -2.6 + Math.sin(G.time * 11 + e.idx) * 0.35;   // kepçeyle tencereye vurur
    if (c.d < 14 && Math.random() < dt * 2.2) beep('pan');
    if (e.st === 'idle') {
        e.m.body.rotation.x = 0; e.m.armL.rotation.x = -1.2;
        if (!c.alert || Math.abs(c.dy) > 1.2) { patrol(e, dt, 1.0 * S.speed); return; }
        e.facing = dampAngle(e.facing, c.toP, 4, dt);
        if (c.d > 6) { stepToward(e, c.toP, 1.2 * S.speed, dt); e.phase += dt * 6; walkPose(e.m, e.phase, 0.6); } else walkPose(e.m, e.phase, 0);
        if (!c.canStart) return;
        const front = Math.abs(angDiff(e.facing, c.toP)) < 0.45;
        if (e.alt && c.d < 9) { go(e, 'bang', 0.75, '♪!'); }
        else if (!e.alt && front && c.d > 2.5 && c.d < 9) go(e, 'wind', 0.67 * S.fire, '!');
    } else if (e.st === 'bang') {   // tencereye hızlı hızlı vurur, sonra ses dalgası yayılır
        e.t -= dt;
        e.m.armR.rotation.x = -2.2 + Math.sin(G.time * 40) * 0.6;
        if (Math.random() < dt * 14) beep('pan');
        if (e.t <= 0) {
            makeRing(e.pos, { speed: 6.5 * S.speed, maxR: 10 });
            playSfx('hit', { rate: 2.4, vol: 0.5 }); addTrauma(0.12);
            e.alt = 0; go(e, 'rest', 0.7, null);
        }
    } else if (e.st === 'wind') {   // geriye yaslanır
        e.t -= dt; e.m.body.rotation.x = -0.25;
        e.facing = dampAngle(e.facing, c.toP, 6, dt);
        if (e.t <= 0) { go(e, 'charge', 0.8, null); e.steer = e.facing; }
    } else if (e.st === 'charge') {
        e.t -= dt; e.m.body.rotation.x = 0.3;
        if (!stepToward(e, e.steer, 10 * S.speed, dt)) e.t = 0;
        e.phase += dt * 16; walkPose(e.m, e.phase, 1);
        if (c.d < 1.15 && Math.abs(c.dy) < 1.6) {
            if (shieldFacing(c)) {
                for (let k = 0; k < 10; k++) stepToward(e, e.steer + Math.PI, 6, 0.016);
                blockFx(e.pos.clone().setY(1.2).lerp(p.pos.clone().setY(1.2), 0.5));
                addTrauma(0.25); p.vel.x -= Math.sin(c.toP) * 3; p.vel.z -= Math.cos(c.toP) * 3;
                e.alt = 1; stun(e, 1.8); return;
            }
            hurtPlayer(e.pos, { knock: 10 }); e.t = 0;
        }
        if (e.t <= 0) { e.alt = 1; go(e, 'rest', 1.2); }
    } else if (e.st === 'rest') {   // soluklanır: kapak aşağıda
        e.t -= dt; e.m.body.rotation.x = 0.15; e.m.armL.rotation.x = 0.3;
        walkPose(e.m, e.phase, 0);
        if (e.t <= 0) finish(e, 1.6);
    }
}
const BEHAVIOR = { carsi, kirmizi, sema, capulcu, tencere };

// --- HASAR ---
export function damageEnemy(e, power = 2, how = 'hammer') {
    if (e.dead) return;
    if (e.kind === 'duran') { sayOnce(e, 'KIPIRDAMIYOR!', '#e5e7eb'); return; }
    if (e.hurtT > 0 && how !== 'tea') return;
    e.hp -= power; e.hurtT = 0.25; e.pop = 1;
    playSfx('hit', { vol: how === 'tea' ? 0.35 : 0.6, rate: how === 'tea' ? 1.4 : 1 });
    if (how !== 'tea') { addTrauma(0.18); G.hitStop = 0.06; }
    burst(e.pos.clone().setY(1.2), { n: how === 'tea' ? 4 : 6, color: ['#fde047', '#f8fafc'], speed: 3, up: 3 });
    // Balyoz hazırlanan saldırıyı keser (çay kesmez)
    if (how !== 'tea' && (e.st === 'wind' || e.st === 'bang')) { finish(e, 1.0); }
    if (e.hp > 0) return;
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

// Balyoz vuruşu: önündeki düşmanlar
export function hammerHit(point, p) {
    let hit = false;
    for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < HAMMER_REACH && Math.abs(e.pos.y - p.pos.y) < 1.6 && Math.abs(angDiff(p.facing, Math.atan2(dx, dz))) < 1.2) {
            damageEnemy(e, 2, 'hammer'); hit = true;
            if (e.kind !== 'duran') spawnFx('hit', e.pos.clone().setY(1.1), 1.2);
        }
    }
    if (hit) spawnFx('hit', point, 0.8);
    return hit;
}

// --- DÜŞMAN MERMİLERİ ---
function handPos(e) {
    return e.pos.clone().add(new THREE.Vector3(Math.sin(e.facing) * 0.45 + Math.cos(e.facing) * 0.3, 1.6, Math.cos(e.facing) * 0.45 - Math.sin(e.facing) * 0.3));
}
function throwSlogan(e, spread = 0) {
    const p = G.player;
    const from = e.pos.clone().add(new THREE.Vector3(Math.sin(e.facing) * 0.5, 1.45, Math.cos(e.facing) * 0.5));
    const to = p.pos.clone().setY(p.pos.y + 1.1).sub(from);
    to.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
    const v = to.normalize().multiplyScalar(8.5 * (0.9 + 0.1 * diff().speed));
    const s = textSprite(SLOGANS[Math.floor(Math.random() * SLOGANS.length)], { size: 40, height: 0.42, color: '#111827', bg: 'rgba(248,250,252,0.95)' });
    s.position.copy(from); G.scene.add(s);
    G.projectiles.push({ type: 'slogan', mesh: s, pos: s.position, vel: v, life: 3.2, update: updateStraight });
    playSfx('hit', { rate: 1.6, vol: 0.25 });
}

// Kavisli atış: oyuncunun gideceği yere düşecek hız
const FLARE_GEO = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), CAN_GEO = new THREE.CylinderGeometry(0.09, 0.09, 0.32, 8);
function throwLob(e, kind) {
    const p = G.player, from = handPos(e);
    const d = Math.hypot(p.pos.x - from.x, p.pos.z - from.z), T = 0.6 + d / 13;
    const tx = p.pos.x + p.vel.x * T * 0.5, tz = p.pos.z + p.vel.z * T * 0.5;
    const gy = groundAt(G.world.solids, tx, tz, p.pos.y + 0.2);
    const ty = gy > -10 ? gy : p.pos.y;
    const vel = new THREE.Vector3((tx - from.x) / T, (ty - from.y) / T + 0.5 * LOB_G * T, (tz - from.z) / T);
    const m = new THREE.Mesh(kind === 'flare' ? FLARE_GEO : CAN_GEO, mat(kind === 'flare' ? '#dc2626' : '#3f6212'));
    if (kind === 'flare') { const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: '#fde047' })); tip.position.y = 0.22; m.add(tip); }
    m.position.copy(from); G.scene.add(m);
    G.projectiles.push({ type: kind, mesh: m, pos: m.position, vel, life: 4, ownGeo: false, update: updateLob });
    playSfx('hit', { rate: kind === 'flare' ? 1.2 : 2.2, vol: 0.35 });
}

function hitsPlayer(p, pad = 0.55) {
    const pl = G.player;
    return !pl.dead && Math.abs(p.pos.x - pl.pos.x) < pad && Math.abs(p.pos.z - pl.pos.z) < pad && p.pos.y > pl.pos.y - 0.1 && p.pos.y < pl.pos.y + pl.h;
}
function updateStraight(p, dt) {
    p.pos.addScaledVector(p.vel, dt);
    if (hitsPlayer(p)) {
        if (shieldBlocks(p.pos, p.vel)) blockFx(p.pos.clone()); else hurtPlayer(p.pos);
        killProj(p); return;
    }
    const g = groundAt(G.world.solids, p.pos.x, p.pos.z, p.pos.y + 0.6);
    if (p.pos.y <= g) { burst(p.pos, { n: 4, color: '#f8fafc', speed: 1.5, up: 1.5, size: 0.08 }); killProj(p); }
}
function updateLob(p, dt) {
    p.vel.y -= LOB_G * dt;
    p.pos.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * 9; p.mesh.rotation.z += dt * 4;
    if (p.type === 'flare' && Math.random() < dt * 40) burst(p.pos, { n: 1, color: ['#ef4444', '#f97316', '#fca5a5'], speed: 0.3, up: 0.5, gravity: -0.5, size: 0.1, life: 0.5 });
    if (hitsPlayer(p, 0.6)) {
        if (shieldBlocks(p.pos, p.vel)) { blockFx(p.pos.clone()); killProj(p); return; }
        if (p.type === 'flare') { hurtPlayer(p.pos); killProj(p); return; }
    }
    const g = groundAt(G.world.solids, p.pos.x, p.pos.z, p.pos.y + 0.6);
    if (p.pos.y <= g) {
        const at = new THREE.Vector3(p.pos.x, g, p.pos.z);
        if (p.type === 'flare') makeFire(at); else makeCloud(at, { r: 1.9, t: 2.4 });
        playSfx('hit', { rate: 0.6, vol: 0.35 });
        killProj(p);
    } else if (p.pos.y < -5) killProj(p);
}

// --- OYUNCUNUN ÇAY PAKETİ (nişanlı atış) ---
let teaTex = null;
function teaMat() {
    if (!teaTex) teaTex = canvasTex(64, 32, (g) => {
        g.fillStyle = '#dc2626'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#fef3c7'; g.fillRect(4, 4, 56, 24);
        g.fillStyle = '#b91c1c'; g.font = 'bold 18px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ÇAY', 32, 17);
    }, { pixel: true });
    return new THREE.MeshLambertMaterial({ map: teaTex });
}
const TEA_GEO = new THREE.BoxGeometry(0.3, 0.08, 0.2);
let TEA_MAT = null;
export function throwTea(from, dir) {
    TEA_MAT = TEA_MAT || teaMat();
    const m = new THREE.Mesh(TEA_GEO, TEA_MAT); m.position.copy(from); G.scene.add(m);
    G.projectiles.push({ type: 'tea', mesh: m, pos: m.position, vel: dir.clone().multiplyScalar(30), life: 1.6, ownGeo: false, update: updateTea });
}
function updateTea(p, dt) {
    p.mesh.rotation.y += dt * 20; p.mesh.rotation.x += dt * 7;
    for (let s = 0; s < 2; s++) {   // iki alt adım: hızlı mermi düşmanın içinden geçmesin
        p.vel.y -= 3 * dt / 2;
        p.pos.addScaledVector(p.vel, dt / 2);
        for (const e of G.enemies) {
            if (e.dead || !e.m.root.parent) continue;
            if (Math.abs(p.pos.x - e.pos.x) < 0.45 && Math.abs(p.pos.z - e.pos.z) < 0.45 && p.pos.y > e.pos.y && p.pos.y < e.pos.y + 1.95) {
                if (e.kind === 'duran') sayOnce(e, 'KIPIRDAMIYOR!', '#e5e7eb'); else damageEnemy(e, 1, 'tea');
                teaSplash(p.pos); G.onTeaHit && G.onTeaHit(e.kind !== 'duran'); killProj(p); return;
            }
        }
        const B = G.boss;
        if (B && !B.dead && B.hitTest(p.pos)) {
            floatText('ZIRHLI! ÜSTÜNE ZIPLA!', p.pos.clone().setY(p.pos.y + 0.8), '#fde047', 0.4);
            playSfx('hit', { rate: 1.5, vol: 0.4 }); teaSplash(p.pos); killProj(p); return;
        }
        for (const a of G.world.solids) {
            if (!a.active || a.type === 'wall') continue;
            if (p.pos.x > a.min.x && p.pos.x < a.max.x && p.pos.y > a.min.y && p.pos.y < a.max.y && p.pos.z > a.min.z && p.pos.z < a.max.z) {
                if (a.type === 'brick') G.onBrickHit && G.onBrickHit(a);
                teaSplash(p.pos); killProj(p); return;
            }
        }
    }
    if (p.pos.y < -5) killProj(p);
}
function teaSplash(pos) {
    burst(pos, { n: 7, color: ['#14532d', '#78350f', '#dc2626'], speed: 2.5, up: 2.5, size: 0.08, life: 0.5 });
}

function killProj(p) {
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
export { killProj };
