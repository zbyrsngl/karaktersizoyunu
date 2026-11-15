// HIRHIZ 3D — 2. bölüm düşmanları: 17/25 polisleri. Hepsi saldırmadan önce belli eder (başında kırmızı !):
//   17/25 POLİSİ: tabancayla nişan alır; tek atış ya da üçlü seri
//   ÇEVİK KUVVET: önünde büyük kalkan (önden gelen rüşveti durdurur, yandan/arkadan vur ya da balyoz);
//                 yakındaysa cop savurur, uzaktaysa kalkan hücumu yapar (kalkanla karşılanırsa sersemler)
//   GAZCI: kavisli gaz bombası atar; bulut 3 sn kalır, içinde kalan can kaybeder
//   KÖPRÜNÜN ÜSTÜNDEKİ SINAYPIRCI: köprüde diz çöker; kırmızı lazerle seni izler, lazer yanıp sönünce kilitlenmiştir → kaç!
// Rüşvet destesiyle (nişanlı atış) yenilen polis parayı alıp gider: "DOSYA KAPANDI!"
import * as THREE from 'three';
import { limb, walkPose } from './models.js?v=18';
import { G, diff } from './state.js?v=18';
import { hurtPlayer, blockFx } from './player.js?v=18';
import { burst, addTrauma } from './fx.js?v=18';
import { playSfx, beep } from './audio.js?v=18';
import { makeCloud } from './hazards.js?v=18';
import { box, mat, canvasTex, fitText, angDiff, dampAngle, rand } from './util.js?v=18';
import { TYPES, patrol, keepRange, stepToward, go, finish, stun, shieldFacing, midPoint, handPos, shootStraight, shootAt, throwLob } from './enemies.js?v=18';

// --- MODELLER ---
const UNI = '#1e40af', UNI_D = '#172554', ARM = '#1e3a8a', SKIN = '#e8b48f';
let plateTex = null;
function plate() {   // göğüste "17/25" yazılı isim plakası
    plateTex = plateTex || canvasTex(128, 48, (g) => {
        g.fillStyle = '#f8fafc'; g.fillRect(0, 0, 128, 48); g.fillStyle = '#1e3a8a'; g.textAlign = 'center'; g.textBaseline = 'middle';
        fitText(g, '17/25', 64, 26, 116, 38, 'Arial Black, Arial');
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshBasicMaterial({ map: plateTex }));
}
let shieldTex = null;
function riotShield() {   // çevik kuvvet kalkanı: yarı saydam, üstünde POLİS yazısı
    shieldTex = shieldTex || canvasTex(128, 224, (g, W, H) => {
        g.fillStyle = 'rgba(203,213,225,0.55)'; g.fillRect(0, 0, W, H);
        g.strokeStyle = '#334155'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
        g.fillStyle = '#f8fafc'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitText(g, 'POLİS', W / 2, 60, W - 20, 40);
        g.fillStyle = 'rgba(30,64,175,0.6)'; g.fillRect(8, 96, W - 16, 10);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.25), new THREE.MeshLambertMaterial({ map: shieldTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    return m;
}

// variant: 'police' | 'riot' | 'gas' | 'sniper' | 'saygili'
export function buildPolice(variant) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.11, 0.7, 0, 0.17, 0.68, 0.19, UNI_D, '#0a0a0a');
    const legR = limb(body, 0.11, 0.7, 0, 0.17, 0.68, 0.19, UNI_D, '#0a0a0a');
    const torso = new THREE.Group(); torso.position.y = 0.7; body.add(torso);
    torso.add(box(0.52, 0.62, 0.3, UNI, 0, 0.31, 0));
    torso.add(box(0.14, 0.12, 0.02, '#93c5fd', 0, 0.56, 0.155, false));                 // yaka
    for (let i = 0; i < 3; i++) torso.add(box(0.04, 0.04, 0.02, '#facc15', 0.03, 0.44 - i * 0.1, 0.16, false));   // düğmeler
    torso.add(box(0.08, 0.08, 0.02, '#fbbf24', 0.15, 0.48, 0.16, false));                // rozet
    const pl = plate(); pl.position.set(-0.12, 0.34, 0.156); torso.add(pl);
    torso.add(box(0.54, 0.08, 0.32, '#111827', 0, 0.04, 0, false));                      // kemer
    torso.add(box(0.1, 0.06, 0.02, '#d4d4d8', 0, 0.04, 0.17, false));
    if (variant === 'saygili') {   // apoletler + kravat
        torso.add(box(0.16, 0.04, 0.3, '#facc15', -0.26, 0.6, 0, false)); torso.add(box(0.16, 0.04, 0.3, '#facc15', 0.26, 0.6, 0, false));
        torso.add(box(0.05, 0.3, 0.02, '#1e3a8a', 0, 0.42, 0.165, false));
    }
    const head = new THREE.Group(); head.position.y = 0.62; torso.add(head);
    head.add(box(0.12, 0.1, 0.12, SKIN, 0, 0.02, 0));
    head.add(box(0.34, 0.38, 0.32, SKIN, 0, 0.25, 0));
    if (variant === 'gas') {   // gaz maskesi
        head.add(box(0.3, 0.26, 0.1, '#374151', 0, 0.22, 0.17, false));
        head.add(box(0.1, 0.06, 0.02, '#a5f3fc', -0.07, 0.28, 0.225, false)); head.add(box(0.1, 0.06, 0.02, '#a5f3fc', 0.07, 0.28, 0.225, false));
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), mat('#4b5563')); f.rotation.x = Math.PI / 2; f.position.set(0, 0.12, 0.26); head.add(f);
    } else {
        head.add(box(0.05, 0.05, 0.02, '#111', -0.08, 0.28, 0.165, false)); head.add(box(0.05, 0.05, 0.02, '#111', 0.08, 0.28, 0.165, false));
        head.add(box(0.16, 0.045, 0.03, '#292524', 0, 0.17, 0.17, false));                  // bıyık
    }
    if (variant === 'saygili') head.add(box(0.32, 0.08, 0.03, '#0f172a', 0, 0.29, 0.175, false));   // güneş gözlüğü
    if (variant === 'riot') {   // kask + vizör
        const hm = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.7), mat('#0f172a'));
        hm.position.y = 0.3; hm.castShadow = true; head.add(hm);
        const v = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.22), new THREE.MeshLambertMaterial({ color: '#93c5fd', transparent: true, opacity: 0.45 }));
        v.position.set(0, 0.26, 0.2); head.add(v);
    } else {   // kasket
        head.add(box(0.38, 0.14, 0.36, '#1e3a8a', 0, 0.48, 0));
        head.add(box(0.39, 0.04, 0.37, '#facc15', 0, 0.43, 0, false));
        head.add(box(0.3, 0.03, 0.14, '#0f172a', 0, 0.42, 0.22, false));
    }
    const armL = limb(torso, -0.33, 0.58, 0, 0.13, 0.52, 0.14, ARM);
    const armR = limb(torso, 0.33, 0.58, 0, 0.13, 0.52, 0.14, ARM);
    armL.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.55, 0, false)); armR.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.55, 0, false));
    const extra = {};
    if (variant === 'police') armR.add(box(0.07, 0.22, 0.14, '#111827', 0, -0.6, 0.06));          // tabanca
    if (variant === 'riot' || variant === 'saygili') {                                         // cop
        const baton = new THREE.Group(); baton.position.y = -0.55; armR.add(baton);
        baton.add(box(0.06, 0.06, variant === 'saygili' ? 0.8 : 0.6, '#111827', 0, 0, variant === 'saygili' ? 0.38 : 0.28));
        extra.baton = baton;
    }
    if (variant === 'riot') { const s = riotShield(); s.position.set(-0.05, 0.25, 0.38); torso.add(s); extra.shield = s; }
    if (variant === 'gas') {   // gaz bombası atar tüfeği
        const g = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.6, 8), mat('#3f6212'));
        g.rotation.x = Math.PI / 2; g.position.set(0, -0.55, 0.22); armR.add(g);
    }
    if (variant === 'sniper') {   // diz çökmüş, tüfek omzunda; lazer namludan çıkar
        body.position.y = -0.42; legL.rotation.x = -1.45; legR.rotation.x = 0.35;
        armR.rotation.x = -1.45; armL.rotation.x = -1.2; armL.rotation.z = 0.5;
        const rifle = new THREE.Group(); rifle.position.set(0.33, 1.28, 0.25); body.add(rifle);
        rifle.add(box(0.06, 0.09, 1.0, '#1f2937', 0, 0, 0.3));
        rifle.add(box(0.05, 0.07, 0.22, '#374151', 0, 0.09, 0.2, false));
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
        const laser = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.9 }));
        laser.position.set(0, 0, 0.8); laser.visible = false; rifle.add(laser);
        extra.rifle = rifle; extra.laser = laser;
    }
    return { root, body, legL, legR, armL, armR, torso, head, ...extra };
}

// --- MERMİLER ---
const BULLET_GEO = new THREE.CapsuleGeometry(0.05, 0.3, 2, 6);
BULLET_GEO.rotateX(Math.PI / 2);
const BULLET_MAT = new THREE.MeshBasicMaterial({ color: '#fde047' });
function bullet(from, speed, to = null) {
    const m = new THREE.Mesh(BULLET_GEO, BULLET_MAT);
    if (to) shootAt(m, from, to, speed);   // kilitlenen noktaya (nişancı)
    else shootStraight(m, from, speed, { type: 'bullet', life: 2.4 });
    burst(from, { n: 3, color: ['#fde047', '#f97316'], speed: 1.5, up: 1, size: 0.08, life: 0.2 });
    playSfx('hit', { rate: 2.6, vol: 0.3 });
}
const GRENADE_GEO = new THREE.CylinderGeometry(0.08, 0.08, 0.26, 8);

// --- 17/25 POLİSİ: tabanca ---
function police(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        e.m.armR.rotation.x = 0;
        if (!c.alert) { patrol(e, dt, 1.3 * S.speed); return; }
        keepRange(e, dt, c, 6, 12, 1.5 * S.speed);
        if (c.canStart && c.d < 15) { e.alt ^= 1; go(e, 'aim', 0.6, e.alt ? '!!!' : '!'); }
    } else if (e.st === 'aim') {   // tabancayı kaldırıp nişan alır
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        e.m.armR.rotation.x = -1.55 * Math.min(1, (0.6 - e.t) / 0.25);
        if (e.t <= 0) { e.shots = e.alt ? 3 : 1; go(e, 'fire', 0, null); }
    } else if (e.st === 'fire') {
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 4, dt);
        if (e.t <= 0 && e.shots > 0) {
            e.shots--; e.t = 0.14;
            bullet(handPos(e, 1.45), 15 * (0.9 + 0.1 * S.speed));
            e.m.armR.rotation.x = -1.75;
        } else e.m.armR.rotation.x = -1.55;
        if (e.shots <= 0 && e.t <= 0) go(e, 'rest', 0.35);
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) finish(e, 2.4); }
}

// --- ÇEVİK KUVVET: kalkan, cop, kalkan hücumu ---
function riot(e, dt, c) {
    const S = diff(), p = G.player;
    if (e.m.shield) e.m.shield.rotation.x = e.st === 'rest' ? 0.8 : 0;   // soluklanırken kalkan aşağı iner
    if (e.st === 'idle') {
        e.m.body.rotation.x = 0; e.m.armL.rotation.x = -1.3;
        if (!c.alert || Math.abs(c.dy) > 1.2) { patrol(e, dt, 1.0 * S.speed); return; }
        e.facing = dampAngle(e.facing, c.toP, 4, dt);
        if (c.d > 2) { if (stepToward(e, c.toP, 1.3 * S.speed, dt)) { e.phase += dt * 6; walkPose(e.m, e.phase, 0.6); } } else walkPose(e.m, e.phase, 0);
        if (!c.canStart) return;
        const front = Math.abs(angDiff(e.facing, c.toP)) < 0.45;
        if (c.d < 2.3) go(e, 'bat', 0.42 * S.fire + 0.1, '!');
        else if (front && c.d > 3 && c.d < 9) go(e, 'wind', 0.65 * S.fire, '!');
    } else if (e.st === 'bat') {   // cop yukarı kalkar, sonra iner
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 6, dt);
        e.m.armR.rotation.x = -2.9;
        if (e.t <= 0) { go(e, 'swing', 0.16, null); e.hit = false; beep('swing'); }
    } else if (e.st === 'swing') {
        e.t -= dt; const k = 1 - e.t / 0.16;
        e.m.armR.rotation.x = -2.9 + 2.6 * k;
        if (!e.hit && k > 0.5) {
            e.hit = true;
            if (c.d < 2.4 && Math.abs(angDiff(e.facing, c.toP)) < 1.0 && Math.abs(c.dy) < 1.4) {
                if (shieldFacing(c)) blockFx(midPoint(e)); else hurtPlayer(e.pos, { knock: 7 });
            }
        }
        if (e.t <= 0) go(e, 'rest', 0.7);
    } else if (e.st === 'wind') {   // geriye yaslanır
        e.t -= dt; e.m.body.rotation.x = -0.25;
        e.facing = dampAngle(e.facing, c.toP, 6, dt);
        if (e.t <= 0) { go(e, 'charge', 0.8, null); e.steer = e.facing; }
    } else if (e.st === 'charge') {
        e.t -= dt; e.m.body.rotation.x = 0.3;
        if (!stepToward(e, e.steer, 9.5 * S.speed, dt)) e.t = 0;
        e.phase += dt * 16; walkPose(e.m, e.phase, 1);
        if (c.d < 1.15 && Math.abs(c.dy) < 1.6) {
            if (shieldFacing(c)) {
                for (let k = 0; k < 10; k++) stepToward(e, e.steer + Math.PI, 6, 0.016);
                blockFx(midPoint(e)); addTrauma(0.25);
                p.vel.x -= Math.sin(c.toP) * 3; p.vel.z -= Math.cos(c.toP) * 3;
                stun(e, 1.8); return;
            }
            hurtPlayer(e.pos, { knock: 10 }); e.t = 0;
        }
        if (e.t <= 0) go(e, 'rest', 1.2);
    } else if (e.st === 'rest') {   // soluklanır: kalkan aşağıda, önden de vurulur
        e.t -= dt; e.m.body.rotation.x = 0.15; e.m.armL.rotation.x = 0.2;
        walkPose(e.m, e.phase, 0);
        if (e.t <= 0) finish(e, 1.6);
    }
}

// --- GAZCI: kavisli gaz bombası; bulut can götürür ---
function gas(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        e.m.armR.rotation.x = -0.6;
        if (!c.alert) { patrol(e, dt, 1.2 * S.speed); return; }
        keepRange(e, dt, c, 8, 13, 1.4 * S.speed);
        if (c.canStart && c.d < 16) go(e, 'aim', 0.6, '!');
    } else if (e.st === 'aim') {
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        e.m.armR.rotation.x = -0.6 - 1.4 * Math.min(1, (0.6 - e.t) / 0.3);
        if (e.t <= 0) {
            throwLob(handPos(e, 1.5), new THREE.Mesh(GRENADE_GEO, mat('#3f6212')), { type: 'grenade', hurtsOnHit: false, lead: 0.7,
                onLand: at => makeCloud(at, { r: 2.1, t: 3, hurt: true }), trail: ['#d1d5db', '#e5e7eb'] });
            playSfx('hit', { rate: 2.2, vol: 0.35 }); burst(handPos(e, 1.5), { n: 4, color: '#e5e7eb', speed: 1, up: 1, size: 0.12 });
            go(e, 'rest', 0.45, null);
        }
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) finish(e, 3.2); }
}

// --- KÖPRÜNÜN ÜSTÜNDEKİ SINAYPIRCI: lazerle izler, kilitlenir, ateş eder ---
const tmpV = new THREE.Vector3();
function sniper(e, dt, c) {
    e.m.armR.rotation.x = -1.45; e.m.armL.rotation.x = -1.2;   // diz çökmüş, tüfek omzunda
    const p = G.player, L = e.m.laser, chest = p.pos.clone().setY(p.pos.y + 1.1);
    const see = c.d < 32 && !p.dead;
    e.aimAt = e.aimAt || chest.clone();
    if (e.st === 'idle') {
        L.visible = false;
        if (!see) return;
        e.facing = dampAngle(e.facing, c.toP, 3, dt);
        if (e.cd <= 0) go(e, 'aim', 1.4 * diff().fire + 0.2, null);
    } else if (e.st === 'aim') {   // lazer seni izler (biraz gecikmeli)
        e.t -= dt;
        e.facing = dampAngle(e.facing, c.toP, 5, dt);
        e.aimAt.lerp(chest, 1 - Math.exp(-5 * dt));
        L.visible = true; L.material.opacity = 0.75;
        if (e.t <= 0) go(e, 'lock', 0.4, '!');
    } else if (e.st === 'lock') {   // kilitlendi: lazer yanıp söner, artık izlemez
        e.t -= dt;
        L.visible = Math.floor(e.t * 20) % 2 === 0;
        if (e.t <= 0) {
            const from = e.m.laser.getWorldPosition(tmpV).clone();
            bullet(from, 30, e.aimAt.clone());
            L.visible = false; go(e, 'rest', 0.3, null);
        }
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) finish(e, 1.4); }
    // Lazeri hedefe uzat (yerel koordinatta)
    if (L.visible) {
        const d = L.getWorldPosition(tmpV).distanceTo(e.aimAt);
        L.lookAt(e.aimAt); L.scale.set(1, 1, d);
    }
}

// Askerler (soldiers.js) aynı davranışları kendi modelleriyle kullanır
export const POLICE_AI = { police, riot, gas, sniper };

const cop = (variant, name, update, extra = {}) => ({ kind: 'police', name, hp: 2, score: 3000, bribable: true, build: () => buildPolice(variant), update, ...extra });
Object.assign(TYPES, {
    police: cop('police', '17/25 POLİSİ', police),
    riot: cop('riot', 'ÇEVİK KUVVET', riot, { shieldFront: true, score: 4000 }),
    gas: cop('gas', 'GAZCI', gas, { score: 4000 }),
    sniper: cop('sniper', 'SINAYPIRCI', sniper, { score: 5000, bribable: false, alert: 32, labelY: 1.95, height: 1.45, harmless: true,
                                                  onDeath: e => { e.m.laser.visible = false; } })
});
