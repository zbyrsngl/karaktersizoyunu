// HIRHIZ 3D — 1. bölüm düşmanları: Gezi kahramanları. Her biri saldırmadan önce belli eder (başında kırmızı ! ve hazırlık hareketi):
//   Çarşı: kavisli meşale atar, düştüğü yer kısa süre yanar
//   Kırmızılı Kadın: koşup bez çantasını savurur (yakın dövüş)
//   Semazen: dönerek üstüne gelir, sonra başı döner ve sersemler (vurma fırsatı)
//   Çapulcu: üçlü slogan yelpazesi ya da gaz kapsülünü geri fırlatır (bulut yavaşlatır)
//   Tencere Tava (3 can): kalkan hücumu ya da tencereye vurup yerde yayılan ses dalgası (üstünden zıpla)
//   Duran Adam: hiç kıpırdamaz, hiçbir şey işlemez
import * as THREE from 'three';
import { buildHero, walkPose } from './models.js?v=24';
import { G, diff } from './state.js?v=24';
import { hurtPlayer, blockFx } from './player.js?v=24';
import { burst, floatText, addTrauma } from './fx.js?v=24';
import { playSfx, beep } from './audio.js?v=24';
import { makeCloud, makeFire, makeRing } from './hazards.js?v=24';
import { angDiff, dampAngle, textSprite, mat } from './util.js?v=24';
import { TYPES, patrol, keepRange, stepToward, go, finish, stun, shieldFacing, midPoint, handPos, shootStraight, throwLob } from './enemies.js?v=24';

const SLOGANS = ['HER YER TAKSİM!', 'DİRENİŞ!', 'ÇAPULCUYUZ!', 'HÜKÜMET İSTİFA!'];
const FLARE_GEO = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), CAN_GEO = new THREE.CylinderGeometry(0.09, 0.09, 0.32, 8);

function slogan(e, spread = 0) {
    const s = textSprite(SLOGANS[Math.floor(Math.random() * SLOGANS.length)], { size: 40, height: 0.42, color: '#111827', bg: 'rgba(248,250,252,0.95)' });
    const from = e.pos.clone().add(new THREE.Vector3(Math.sin(e.facing) * 0.5, 1.45, Math.cos(e.facing) * 0.5));
    shootStraight(s, from, 8.5 * (0.9 + 0.1 * diff().speed), { spread, type: 'slogan' });
    playSfx('hit', { rate: 1.6, vol: 0.25 });
}
function flare(e) {
    const m = new THREE.Mesh(FLARE_GEO, mat('#dc2626'));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: '#fde047' })); tip.position.y = 0.22; m.add(tip);
    throwLob(handPos(e), m, { type: 'flare', onLand: at => makeFire(at), trail: ['#ef4444', '#f97316', '#fca5a5'] });
    playSfx('hit', { rate: 1.2, vol: 0.35 });
}
function gasCan(e) {
    throwLob(handPos(e), new THREE.Mesh(CAN_GEO, mat('#3f6212')), { type: 'can', hurtsOnHit: false, onLand: at => makeCloud(at, { r: 1.9, t: 2.4 }) });
    playSfx('hit', { rate: 2.2, vol: 0.35 });
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
        if (e.t <= 0) { flare(e); go(e, 'rest', 0.35, null); e.m.armR.rotation.x = -1.8; }
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) finish(e, 2.6); }
}

// --- KIRMIZILI KADIN: koşup çanta savurur ---
function kirmizi(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.3 * S.speed); return; }
        e.facing = dampAngle(e.facing, c.toP, 7, dt);
        if (c.d > 1.5 && Math.abs(c.dy) < 1.2) {
            if (stepToward(e, c.toP, (e.cd > 0 ? 1.4 : 2.6) * S.speed, dt)) { e.phase += dt * 10; walkPose(e.m, e.phase, 1); }
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
                if (shieldFacing(c)) { blockFx(midPoint(e)); stun(e, 1.3); return; }
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
            if (shieldFacing(c)) { blockFx(midPoint(e)); stun(e, 2.0); return; }
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
            if (e.alt) [-0.24, 0, 0.24].forEach(a => slogan(e, a)); else gasCan(e);
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
        if (e.alt && c.d < 9) go(e, 'bang', 0.75, '♪!');
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
                blockFx(midPoint(e));
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

const hero = (skin, name, update, extra = {}) => ({ kind: 'hero', name, hp: 2, score: 3000, build: () => buildHero(skin), update, ...extra });
Object.assign(TYPES, {
    carsi: hero('carsi', 'ÇARŞI', carsi),
    kirmizi: hero('kirmizi', 'KIRMIZILI KADIN', kirmizi),
    sema: hero('sema', 'SEMAZEN', sema),
    capulcu: hero('capulcu', 'ÇAPULCU', capulcu),
    tencere: hero('tencere', 'TENCERE TAVA', tencere, { kind: 'tencere', hp: 3, score: 4000 }),
    duran: { kind: 'duran', name: 'DURAN ADAM', hp: 1, build: () => buildHero('duran'), update: () => {} }
});
