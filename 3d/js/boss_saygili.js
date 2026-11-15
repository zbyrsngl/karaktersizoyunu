// HIRHIZ 3D — 2. bölüm canavarı SAYGILI: dev polis (normal polisin 1,35 katı), 7 can.
// Gelince giriş sesi çalar (sfx/saygili_giris.mp3, 20 sn); en çok 4 sn konuşup bekler, ses arkada sürer. Sonra sırayla:
//   COP: yakındaysa copu kaldırır (!) ve indirir — ona dönük kalkan durdurur
//   KELEPÇE: uzaktan kavisli kelepçe atar (öfkeliyken iki tane)
//   HÜCUM: çömelir (!), copu önde hızla koşar
//   SIÇRAMA: üstüne sıçrar, inince yerde şok dalgası yayılır (zıpla!); inişte sersemler → kafasına zıpla!
// Hasar: kafasına zıplamak ya da balyoz (1 can). Rüşvet işlemez. Canı yarıya inince öfkelenir.
import * as THREE from 'three';
import { G, diff, addScore, toast } from './state.js?v=11';
import { hurtPlayer, blockFx, bouncePlayer, HAMMER_REACH } from './player.js?v=11';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=11';
import { playSfx, beep } from './audio.js?v=11';
import { makeRing } from './hazards.js?v=11';
import { walkPose } from './models.js?v=11';
import { angDiff, dampAngle, clamp, rand, mat } from './util.js?v=11';
import { ARENA } from './world.js?v=11';
import { buildPolice } from './police.js?v=11';
import { throwLob } from './enemies.js?v=11';
import { showBossBar, setBossBar } from './boss_core.js?v=11';

const K = 1.35, TOP = 2.65, REACH = 2.9, LEAP_G = 26;
const CUFF_GEO = new THREE.TorusGeometry(0.13, 0.035, 6, 12);

export function spawnSaygili(scene, pos) {
    const m = buildPolice('saygili');
    m.root.scale.setScalar(K); m.root.position.copy(pos); scene.add(m.root);
    const hp = Math.max(4, Math.round(7 * diff().boss));
    const b = {
        m, root: m.root, pos: m.root.position, name: 'SAYGILI', hp, maxHp: hp, dead: false, deadT: 0,
        facing: Math.PI * 0, st: 'talk', t: 0, cd: 0, phase: 0, vel: new THREE.Vector3(), hurtT: 0, rage: false, hit: false,
        update: dt => update(b, dt),
        hitTest: pt => Math.abs(pt.x - b.pos.x) < 0.6 && Math.abs(pt.z - b.pos.z) < 0.6 && pt.y > b.pos.y && pt.y < b.pos.y + TOP + 0.1,
        onAmmo: p => { if (G.time - (b.said || 0) > 1) { b.said = G.time; floatText('RÜŞVET İŞLEMEZ!', b.pos.clone().setY(TOP + 0.6), '#fde047', 0.5); } },
        onHammer: point => { if (Math.hypot(point.x - b.pos.x, point.z - b.pos.z) < 1.4) damage(b, point); },
        reset: () => { b.hp = b.maxHp; b.pos.set(0, 0, -218); b.st = 'walk'; b.cd = 2; b.rage = false; setBossBar(b); }
    };
    // Karşılama: ses bitene kadar konuşur
    playSfx('saygili', { vol: 1 });
    b.t = 4;
    floatText('BİZ BU ÜLKENİN NAMUSUNU KURTARDIK!', pos.clone().setY(TOP + 1.2), '#f8fafc', 0.55, 4.2);
    toast('BÖLÜM SONU CANAVARI: SAYGILI!', 2600, '#fca5a5');
    G.boss = b;
    showBossBar(b);
    return b;
}

function go(b, st, t, warn) {
    b.st = st; b.t = t;
    if (warn) floatText(warn, b.pos.clone().setY(TOP + 0.5), '#ef4444', 0.7, Math.min(0.8, t + 0.1));
}
function pose(b) { const m = b.m; m.armL.rotation.set(0, 0, 0); m.armR.rotation.set(0, 0, 0); m.body.rotation.set(0, 0, 0); m.body.position.y = 0; }

function update(b, dt) {
    const p = G.player, m = b.m, S = diff();
    if (b.hurtT > 0) b.hurtT -= dt;
    m.root.visible = !(b.hurtT > 0 && Math.floor(b.hurtT * 14) % 2 === 0);
    if (b.dead) {
        b.deadT += dt;
        if (b.deadT > 3.2 && !b.reported) { b.reported = true; G.onBossDefeated && G.onBossDefeated(); }
        m.body.rotation.x = -Math.min(Math.PI / 2, b.deadT * 3);
        return;
    }
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, d = Math.hypot(dx, dz), toP = Math.atan2(dx, dz);
    const sp = (b.rage ? 1.3 : 1) * S.speed;
    b.t -= dt;
    switch (b.st) {
        case 'talk':   // konuşur: kolunu sallar
            b.facing = dampAngle(b.facing, toP, 4, dt);
            m.armL.rotation.x = -1.2 + Math.sin(G.time * 8) * 0.4;
            if (b.t <= 0) { pose(b); b.st = 'walk'; b.cd = 0.6; }
            break;
        case 'walk': {
            b.facing = dampAngle(b.facing, toP, 4, dt);
            b.cd -= dt;
            if (d > 2.2) { step(b, toP, 2.4 * sp, dt); b.phase += dt * 6; walkPose(m, b.phase, 0.8); } else walkPose(m, b.phase, 0);
            m.armR.rotation.x = -0.3;
            if (b.cd <= 0 && !p.dead) {
                const r = Math.random();
                if (d < REACH - 0.3) go(b, 'wind', 0.47 * S.fire + 0.08, '!');
                else if (d < 10) r < 0.35 ? go(b, 'crouch', 0.45, '!') : r < 0.65 ? leap(b, p) : go(b, 'throw', 0.45);
                else r < 0.6 ? go(b, 'throw', 0.45) : go(b, 'crouch', 0.45, '!');
            }
            break;
        }
        case 'wind':   // copu kaldırır
            b.facing = dampAngle(b.facing, toP, 6, dt);
            m.armR.rotation.x = -3.0; m.body.rotation.x = -0.12;
            if (b.t <= 0) { go(b, 'swing', 0.3); b.hit = false; beep('swing'); }
            break;
        case 'swing': {
            const k = Math.min(1, (0.3 - b.t) / 0.1);
            m.armR.rotation.x = -3.0 + 2.4 * k; m.body.rotation.x = 0.15 * k;
            if (!b.hit && k >= 1) {
                b.hit = true; addTrauma(0.25); playSfx('hit', { rate: 0.7, vol: 0.9 });
                if (d < REACH && Math.abs(angDiff(b.facing, toP)) < 1.0 && p.pos.y < b.pos.y + 2.2) {
                    if (p.shield && Math.abs(angDiff(p.facing, toP + Math.PI)) < 1.3) {
                        blockFx(p.pos.clone().setY(p.pos.y + 1.4));
                        p.vel.x += Math.sin(toP) * 9; p.vel.z += Math.cos(toP) * 9;
                        floatText('COP KALKANA ÇARPTI!', p.pos.clone().setY(p.pos.y + 2.4), '#fde047', 0.4);
                    } else hurtPlayer(b.pos, { knock: 9 });
                }
            }
            if (b.t <= 0) { pose(b); b.st = 'walk'; b.cd = 0.6 * S.fire; }
            break;
        }
        case 'throw':   // kelepçe atar
            b.facing = dampAngle(b.facing, toP, 6, dt);
            m.armL.rotation.x = -2.8 * Math.min(1, (0.45 - b.t) / 0.3);
            if (b.t <= 0) {
                cuffs(b, 0.5);
                if (b.rage) setTimeout(() => { if (!b.dead && G.boss === b) cuffs(b, 0.85); }, 220);
                pose(b); b.st = 'walk'; b.cd = 0.55 * S.fire;
            }
            break;
        case 'crouch':   // çömelir, sonra hücum
            b.facing = dampAngle(b.facing, toP, 8, dt);
            m.body.position.y = -0.12; m.armR.rotation.x = -1.6;
            if (b.t <= 0) { go(b, 'dash', 1.2); b.steer = b.facing; b.hit = false; playSfx('hit', { rate: 0.5, vol: 0.6 }); }
            break;
        case 'dash': {
            m.body.position.y = 0; m.body.rotation.x = 0.25; m.armR.rotation.x = -1.6;
            const moved = step(b, b.steer, 9.5 * sp, dt);
            b.phase += dt * 16; walkPose(m, b.phase, 1);
            if (Math.random() < dt * 20) burst(b.pos.clone().setY(0.1), { n: 1, color: '#d6d3d1', speed: 1.5, up: 1, size: 0.14, life: 0.4 });
            const passed = Math.cos(angDiff(b.steer, toP)) * d < -3;
            if (!b.hit && d < 1.3 && p.pos.y < b.pos.y + 2.2) {
                b.hit = true;
                if (p.shield && Math.abs(angDiff(p.facing, toP + Math.PI)) < 1.3) {
                    blockFx(p.pos.clone().setY(p.pos.y + 1.4)); p.vel.x += Math.sin(b.steer) * 10; p.vel.z += Math.cos(b.steer) * 10;
                    pose(b); go(b, 'dizzy', 1.0); addTrauma(0.3); break;
                }
                hurtPlayer(b.pos, { knock: 11 });
            }
            if (!moved || passed || b.t <= 0) { pose(b); b.st = 'walk'; b.cd = 0.75 * S.fire; }
            break;
        }
        case 'leap': {   // havada: iniş noktasına süzülür
            b.vel.y -= LEAP_G * dt;
            step(b, Math.atan2(b.vel.x, b.vel.z), Math.hypot(b.vel.x, b.vel.z), dt, true);
            b.pos.y += b.vel.y * dt;
            m.armR.rotation.x = -2.6; m.armL.rotation.x = -2.6; m.legL.rotation.x = -0.6; m.legR.rotation.x = 0.4;
            if (b.pos.y <= 0) {   // iniş: şok dalgası, sersemler
                b.pos.y = 0; pose(b);
                makeRing(b.pos, { speed: 8 * S.speed, maxR: 12 });
                addTrauma(0.5); playSfx('hit', { rate: 0.45, vol: 1 });
                burst(b.pos.clone().setY(0.1), { n: 16, color: ['#d6d3d1', '#a8a29e'], speed: 5, up: 2, size: 0.18, life: 0.6 });
                go(b, 'dizzy', 0.55 * (b.rage ? 0.8 : 1) + 0.2);
            }
            break;
        }
        case 'dizzy':   // sersem: kafasına basma fırsatı
            m.body.rotation.z = Math.sin(G.time * 14) * 0.12;
            if (Math.random() < dt * 6) floatText('★', b.pos.clone().setY(TOP + 0.3), '#fde047', 0.4, 0.5);
            if (b.t <= 0) { pose(b); b.st = 'walk'; b.cd = 0.5 * S.fire; }
            break;
    }
    m.root.rotation.y = b.facing;

    // Kafasına zıplarsa hasar; yandan değerse oyuncu can kaybeder
    if (!p.dead && Math.abs(dx) < 0.85 && Math.abs(dz) < 0.85) {
        const head = b.pos.y + TOP;
        if (p.vel.y < 0 && p.pos.y > head - 0.6 && p.pos.y < head + 0.4) { bouncePlayer(13); damage(b, b.pos.clone().setY(head)); }
        else if (p.pos.y < head - 0.6 && b.st !== 'talk' && b.st !== 'dizzy') hurtPlayer(b.pos, { knock: 8 });
    }
}

// Yürür: meydandan çıkmaz
function step(b, ang, spd, dt, air = false) {
    const nx = clamp(b.pos.x + Math.sin(ang) * spd * dt, -ARENA.hw + 1.2, ARENA.hw - 1.2);
    const nz = clamp(b.pos.z + Math.cos(ang) * spd * dt, ARENA.z1 + 1.2, ARENA.z0 - 1.2);
    const moved = Math.abs(nx - b.pos.x) + Math.abs(nz - b.pos.z) > spd * dt * 0.5;
    b.pos.x = nx; b.pos.z = nz;
    return moved || air;
}
function leap(b, p) {
    const T = 0.85, tx = p.pos.x + p.vel.x * 0.4, tz = p.pos.z + p.vel.z * 0.4;
    b.vel.set((tx - b.pos.x) / T, 0.5 * LEAP_G * T, (tz - b.pos.z) / T);
    const h = Math.hypot(b.vel.x, b.vel.z); if (h > 12) { b.vel.x *= 12 / h; b.vel.z *= 12 / h; }
    b.st = 'leap'; b.t = 2; pose(b);
    floatText('!', b.pos.clone().setY(TOP + 0.5), '#ef4444', 0.7, 0.5);
    playSfx('hit', { rate: 0.6, vol: 0.5 });
}
function cuffs(b, lead) {
    const g = new THREE.Group();
    const r1 = new THREE.Mesh(CUFF_GEO, mat('#e5e7eb')); r1.position.x = -0.15; g.add(r1);
    const r2 = r1.clone(); r2.position.x = 0.15; g.add(r2);
    const from = b.pos.clone().add(new THREE.Vector3(Math.sin(b.facing) * 0.6, 2.3, Math.cos(b.facing) * 0.6));
    throwLob(from, g, { type: 'cuffs', lead, g: 18 });
    playSfx('hit', { rate: 2.6, vol: 0.35 });
}

function damage(b, point) {
    if (b.dead || b.hurtT > 0 || b.st === 'talk') return;
    b.hp--; b.hurtT = 0.6;
    setBossBar(b);
    playSfx('hit', { rate: 0.8, vol: 0.9 }); addTrauma(0.45); G.hitStop = 0.1;
    spawnFx('pow', point.clone(), 1.4);
    burst(point, { n: 12, color: ['#1e40af', '#fde047', '#f8fafc'], speed: 4, up: 4 });
    if (!b.rage && b.hp <= b.maxHp / 2) { b.rage = true; floatText('SAYGILI ÖFKELENDİ!', b.pos.clone().setY(TOP + 1), '#ef4444', 0.6, 1.6); }
    if (b.st === 'wind' || b.st === 'crouch') { pose(b); b.st = 'walk'; b.cd = 0.8; }
    if (b.hp <= 0) defeat(b);
}
function defeat(b) {
    b.dead = true; b.deadT = 0;
    addScore(20000);
    spawnFx('boom', b.pos.clone().setY(0.2), 2);
    spawnFx('confetti', b.pos.clone().setY(3.5).add(new THREE.Vector3(-2, 0, 0)), 2, 0.3);
    spawnFx('confetti', b.pos.clone().setY(3.5).add(new THREE.Vector3(2, 0, 0)), 2, 0.6);
    burst(b.pos.clone().setY(1.5), { n: 30, color: ['#1e40af', '#fde047', '#22c55e', '#f8fafc'], speed: 7, up: 8, size: 0.2, life: 1.2 });
    playSfx('boom', { vol: 0.9 }); addTrauma(0.9);
    floatText('DOSYA KAPANDI!', b.pos.clone().setY(4.2), '#86efac', 0.8, 2.5);
    G.projectiles.forEach(p => { if (p.type === 'cuffs') p.life = 0; });
}
