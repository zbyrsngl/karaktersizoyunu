// HIRHIZ 3D: 1. bölüm canavarı TOMA
// Çapulcuların boyadığı TOMA meydanda dolaşır, oyuncuyla mesafesini korur. Su topu oyuncuya kavisli su atar;
// her üçüncü atış gaz kapsülü (bulut 3 sn kalır, içindekini yavaşlatır; baret + maske korur).
// Yalnızca ÜSTÜNE ZIPLAYINCA hasar alır; canı yarıya inince öfkelenir (iki kat hızlı ateş, daha hızlı sürer).
import * as THREE from 'three';
import { G, diff, addScore, toast } from './state.js?v=18';
import { hurtPlayer, shieldBlocks, blockFx, bouncePlayer } from './player.js?v=18';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=18';
import { playSfx } from './audio.js?v=18';
import { groundAt } from './physics.js?v=18';
import { makeCloud } from './hazards.js?v=18';
import { box, mat, canvasTex, fitText, angDiff, dampAngle, clamp, rand } from './util.js?v=18';
import { ARENA } from './world.js?v=18';
import { showBossBar, setBossBar } from './boss_core.js?v=18';

const HX = 1.3, HZ = 3.1, ROOF = 2.3;          // gövdenin yarı eni, yarı boyu, tavan yüksekliği
const WATER_G = 19, GAS_G = 19, FIRE = 2.0;

function sideTex(flip) {
    return canvasTex(512, 256, (g, W, H) => {
        g.fillStyle = '#f1f5f9'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#1d4ed8'; g.fillRect(0, H * 0.62, W, H * 0.12);
        g.fillStyle = '#1e3a8a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 44px Arial Black, Arial';
        g.fillText('TOMA', W / 2, H * 0.86);
        g.save(); g.translate(W / 2, H * 0.3); g.rotate(-0.06);
        g.fillStyle = '#dc2626'; fitText(g, 'ÇAPULCU', 0, 0, W * 0.8, 96);
        g.fillStyle = 'rgba(220,38,38,0.8)'; [-120, -30, 90].forEach(dx => g.fillRect(dx, 34, 6, 22 + (dx & 15)));
        g.restore();
        g.fillStyle = '#111827'; g.font = 'bold 30px Impact, Arial'; g.fillText('HER YER TAKSİM', W / 2, H * 0.53);
    });
}

function buildToma() {
    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body);
    body.add(box(2.4, 0.45, 6.2, '#1f2937', 0, 0.75, 0));
    const wheels = [];
    const wg = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12);
    [-2.1, -0.9, 2.1].forEach(z => [-1, 1].forEach(s => {
        const w = new THREE.Mesh(wg, mat('#111827')); w.rotation.z = Math.PI / 2; w.position.set(s * 1.2, 0.55, z); w.castShadow = true;
        w.add(box(0.42, 0.3, 0.3, '#9ca3af', 0, 0, 0, false)); body.add(w); wheels.push(w);
    }));
    // Su tankı (arka): yanlarında sprey yazılar
    const tside = sideTex(), tm = new THREE.MeshLambertMaterial({ map: tside });
    const tank = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.3, 3.8), [tm, tm, mat('#e2e8f0'), mat('#e2e8f0'), mat('#e2e8f0'), mat('#e2e8f0')]);
    tank.position.set(0, 1.62, -1.1); tank.castShadow = true; body.add(tank);
    // Kabin (ön)
    body.add(box(2.5, 1.25, 2.1, '#e2e8f0', 0, 1.6, 2.0));
    body.add(box(2.52, 0.18, 2.12, '#1d4ed8', 0, 1.3, 2.0, false));
    body.add(box(2.2, 0.6, 0.05, '#1e3a5f', 0, 1.85, 3.06, false));      // ön cam
    for (let k = 0; k < 6; k++) body.add(box(0.04, 0.6, 0.06, '#94a3b8', -0.9 + k * 0.36, 1.85, 3.08, false));   // kafes
    body.add(box(0.3, 0.18, 0.05, '#fde68a', -0.9, 1.15, 3.06, false)); body.add(box(0.3, 0.18, 0.05, '#fde68a', 0.9, 1.15, 3.06, false));
    const lampB = box(0.4, 0.16, 0.25, '#3b82f6', -0.5, 2.3, 2.2, false), lampR = box(0.4, 0.16, 0.25, '#ef4444', 0.5, 2.3, 2.2, false);
    body.add(lampB, lampR);
    // Gaz kapsülü rampası (tank üstünde, arkada)
    const ramp = box(0.4, 0.3, 0.8, '#3f6212', 0, 2.42, -2.4); ramp.rotation.x = 0.5; body.add(ramp);
    // Su topu: kabinin üstünde döner
    const turret = new THREE.Group(); turret.position.set(0, 2.25, 1.2); body.add(turret);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.35, 10), mat('#64748b')); base.position.y = 0.17; turret.add(base);
    const barrel = new THREE.Group(); barrel.position.y = 0.35; turret.add(barrel);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.4, 8), mat('#475569'));
    tube.rotation.x = Math.PI / 2; tube.position.z = 0.7; tube.castShadow = true; barrel.add(tube);
    barrel.add(box(0.3, 0.3, 0.15, '#1f2937', 0, 0, 1.4, false));
    return { root, body, wheels, turret, barrel, lampB, lampR };
}

export function spawnToma(scene, pos) {
    const m = buildToma();
    m.root.position.copy(pos); scene.add(m.root);
    const hp = Math.max(3, Math.round(5 * diff().boss));
    const b = {
        m, pos: m.root.position, yaw: 0, speed: 0, hp, maxHp: hp, dead: false, deadT: 0,
        fireT: 2.0, attacks: 0, flash: 0, stun: 0, aimYaw: 0, aimPitch: 0.4,
        hitTest(pt) { const l = toLocal(this, pt); return Math.abs(l.x) < HX && Math.abs(l.z) < HZ && pt.y < ROOF + 0.5 && pt.y > 0; }
    };
    m.root.rotation.y = b.yaw;
    b.root = m.root; b.name = 'TOMA'; b.update = dt => updateToma(b, dt);
    b.onHammer = onArmor; b.onAmmo = p => shot(b, p.pos);
    b.onBlast = pt => { for (let i = 0; i < 4; i++) shot(b, pt); };   // el bombası zırhı deler: 4 çay atışı kadar   // balyoz işlemez; çay paketi az da olsa işler
    b.reset = () => { b.ragedTxt = false; b.hp = b.maxHp; b.pos.set(0, 0, -222); b.fireT = 2.5; setBossBar(b); };
    G.boss = b;
    toast('BÖLÜM SONU CANAVARI: TOMA!', 2600, '#fca5a5');
    floatText('HER YER TAKSİM!', pos.clone().setY(4.2), '#f8fafc', 0.7, 2.2);
    floatText('ÜSTÜNE ZIPLA YA DA ÇAY AT!', pos.clone().setY(3.4), '#fde047', 0.5, 2.6);
    showBossBar(b);
    playSfx('boom', { rate: 0.6, vol: 0.4 });
    return b;
}

function toLocal(b, pt) {
    const dx = pt.x - b.pos.x, dz = pt.z - b.pos.z, c = Math.cos(-b.yaw), s = Math.sin(-b.yaw);
    return { x: dx * c + dz * s, z: -dx * s + dz * c };
}
function fromLocalDir(b, lx, lz) {
    const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    return { x: lx * c + lz * s, z: -lx * s + lz * c };
}
// TOMA zırhlı: balyoz ve mermi işlemez, yalnızca üstüne zıplayınca hasar alır
function onArmor(point) {
    floatText('ZIRHLI! ÜSTÜNE ZIPLA!', point.clone().setY(3), '#fde047', 0.45);
    playSfx('hit', { rate: 1.4, vol: 0.5 }); spawnFx('hit', point, 1);
}

function updateToma(b, dt) {
    const p = G.player, m = b.m, S = diff();
    // Lambalar yanıp söner
    const blink = Math.floor(G.time * 5) % 2;
    m.lampB.material = mat(blink ? '#60a5fa' : '#1e3a8a'); m.lampR.material = mat(blink ? '#7f1d1d' : '#ef4444');
    if (b.dead) {
        b.deadT += dt;
        if (b.deadT > 3.2 && !b.reported) { b.reported = true; G.onBossDefeated && G.onBossDefeated(); }   // oyun zamanıyla (duraklatınca beklesin)
        m.body.rotation.z = Math.min(0.12, b.deadT * 0.2);
        if (Math.random() < dt * 8) burst(b.pos.clone().setY(2.6), { n: 2, color: ['#57534e', '#a8a29e'], speed: 0.6, up: 3, gravity: -1, size: 0.3, life: 1.2 });
        return;
    }
    if (b.flash > 0) b.flash -= dt;
    const rage = b.hp <= b.maxHp / 2;
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, d = Math.hypot(dx, dz), toP = Math.atan2(dx, dz);

    // Sürüş: yakınsa uzaklaş, uzaksa yaklaş, arada etrafında dön; meydandan çıkma
    if (b.stun > 0) { b.stun -= dt; b.speed *= 0.9; }
    else {
        let want = d < 7 ? toP + Math.PI : d > 12 ? toP : toP + Math.PI / 2 * (Math.sin(G.time * 0.4) > 0 ? 1 : -1);
        const cx = -b.pos.x, cz = ARENA.cz - b.pos.z;
        if (Math.abs(b.pos.x) > ARENA.hw - 5 || b.pos.z > ARENA.z0 - 5 || b.pos.z < ARENA.z1 + 5) want = Math.atan2(cx, cz);
        let dir = 1, diffA = angDiff(b.yaw, want);
        if (Math.abs(diffA) > Math.PI / 2) { dir = -1; diffA = angDiff(b.yaw, want + Math.PI); }
        const top = 3.4 * S.speed * (rage ? 1.4 : 1);
        b.yaw += clamp(diffA, -1.3 * dt, 1.3 * dt);
        b.speed += (dir * top * (Math.abs(diffA) < 1 ? 1 : 0.3) - b.speed) * Math.min(1, dt * 2);
    }
    const f = fromLocalDir(b, 0, 1);
    const nx = clamp(b.pos.x + f.x * b.speed * dt, -ARENA.hw + 3.3, ARENA.hw - 3.3);
    const nz = clamp(b.pos.z + f.z * b.speed * dt, ARENA.z1 + 3.3, ARENA.z0 - 3.3);
    b.pos.x = nx; b.pos.z = nz;
    m.root.rotation.y = b.yaw;
    m.wheels.forEach(w => { w.rotation.x += b.speed * dt / 0.55; });
    m.body.position.y = Math.sin(G.time * 18) * 0.015 * Math.abs(b.speed);

    // Su topu oyuncuya döner
    const [nzX, nzY, nzZ] = nozzle(b);
    const T = 0.75 + d / 16;
    const tx = p.pos.x + p.vel.x * T * 0.45, tz = p.pos.z + p.vel.z * T * 0.45, ty = p.pos.y + 1.0;
    const vx = (tx - nzX) / T, vz = (tz - nzZ) / T, vy = (ty - nzY) / T + 0.5 * WATER_G * T;
    b.aimYaw = dampAngle(b.aimYaw, Math.atan2(vx, vz) - b.yaw, 6, dt);
    b.aimPitch = Math.atan2(vy, Math.hypot(vx, vz));
    m.turret.rotation.y = b.aimYaw; m.barrel.rotation.x = -b.aimPitch;

    // Ateş
    if (!p.dead && d < 30 && b.stun <= 0) {
        b.fireT -= dt;
        if (b.fireT <= 0) {
            b.fireT = FIRE * S.fire * (rage ? 0.5 : 1) * rand(0.9, 1.1); b.attacks++; b.flash = 0.25;
            if (b.attacks % 3 === 0) {   // gaz kapsülü: ayağına
                const T2 = T + 0.15, gy = groundAt(G.world.solids, p.pos.x, p.pos.z, p.pos.y + 0.1);
                const gtx = p.pos.x + p.vel.x * T2 * 0.6, gtz = p.pos.z + p.vel.z * T2 * 0.6;
                fireGas(b, [nzX, nzY, nzZ], new THREE.Vector3((gtx - nzX) / T2, ((gy > -10 ? gy : 0) - nzY) / T2 + 0.5 * GAS_G * T2, (gtz - nzZ) / T2));
            } else fireWater([nzX, nzY, nzZ], new THREE.Vector3(vx, vy, vz));
        }
    }

    // Oyuncuyla temas: üstüne inerse hasar, yandan çarparsa oyuncu can kaybeder ve itilir
    const l = toLocal(b, p.pos), r = p.r;
    if (!p.dead && Math.abs(l.x) < HX + r && Math.abs(l.z) < HZ + r && p.pos.y < ROOF + 0.05 && p.pos.y + p.h > 0.2) {
        if (p.pos.y > ROOF - 0.6 && p.vel.y <= 0.5) stomp(b);
        else {
            // dışarı it (en kısa yöne)
            const px = HX + r - Math.abs(l.x), pz = HZ + r - Math.abs(l.z);
            const o = px < pz ? fromLocalDir(b, Math.sign(l.x) * (px + 0.02), 0) : fromLocalDir(b, 0, Math.sign(l.z) * (pz + 0.02));
            p.pos.x += o.x; p.pos.z += o.z;
            if (Math.abs(b.speed) > 0.8) hurtPlayer(b.pos, { knock: 9 });
        }
    }
}

function nozzle(b) {
    const ty = b.yaw + b.aimYaw, base = fromLocalDir(b, 0, 1.2);
    return [b.pos.x + base.x + Math.sin(ty) * 1.4 * Math.cos(b.aimPitch), 2.6 + Math.sin(b.aimPitch) * 1.4, b.pos.z + base.z + Math.cos(ty) * 1.4 * Math.cos(b.aimPitch)];
}

function stomp(b) {
    bouncePlayer(14);
    if (b.flash > 0.3) return;
    b.hp--; b.flash = 0.5; b.stun = 0.8;
    setBossBar(b);
    playSfx('hit', { rate: 0.7, vol: 0.9 }); addTrauma(0.5); G.hitStop = 0.1;
    spawnFx('pow', b.pos.clone().setY(ROOF + 0.6), 1.6);
    burst(b.pos.clone().setY(ROOF), { n: 12, color: ['#93c5fd', '#f8fafc', '#fde047'], speed: 4, up: 5 });
    rageCheck(b);
    if (b.hp <= 0) defeat(b);
}
// Çay paketi: her isabet çeyrek can (4 çay = 1 zıplama); üstüne zıplamak hâlâ en hızlı yol
function shot(b, point) {
    if (b.dead) return;
    b.hp = Math.max(0, b.hp - 0.25);
    setBossBar(b);
    playSfx('hit', { rate: 1.3, vol: 0.45 });
    spawnFx('hit', point.clone(), 0.9);
    burst(point, { n: 5, color: ['#14532d', '#78350f', '#f8fafc'], speed: 2, up: 2, size: 0.08 });
    rageCheck(b);
    if (b.hp <= 0.001) defeat(b);
}
function rageCheck(b) {
    if (!b.ragedTxt && b.hp <= b.maxHp / 2) { b.ragedTxt = true; floatText('TOMA ÖFKELENDİ!', b.pos.clone().setY(4), '#ef4444', 0.6, 1.6); }
}

function defeat(b) {
    b.dead = true; b.deadT = 0; b.speed = 0;
    addScore(20000);
    spawnFx('boom', b.pos.clone().setY(0.2), 2.4);
    spawnFx('confetti', b.pos.clone().setY(3.5).add(new THREE.Vector3(-2, 0, 0)), 2, 0.3);
    spawnFx('confetti', b.pos.clone().setY(3.5).add(new THREE.Vector3(2, 0, 0)), 2, 0.6);
    burst(b.pos.clone().setY(1.5), { n: 30, color: ['#f97316', '#fde047', '#ef4444', '#57534e'], speed: 7, up: 8, size: 0.2, life: 1.2 });
    playSfx('boom', { vol: 0.9 }); addTrauma(0.9);
    floatText('TOMA SUSTU!', b.pos.clone().setY(4.5), '#fde047', 0.8, 2.5);
    G.projectiles.forEach(p => { if (p.type === 'water' || p.type === 'tgas') p.life = 0; });
}

// --- SU ---
const WATER_GEO = new THREE.SphereGeometry(0.28, 10, 8);
const WATER_MAT = new THREE.MeshLambertMaterial({ color: '#3b82f6', transparent: true, opacity: 0.85 });
function fireWater(from, vel) {
    const m = new THREE.Mesh(WATER_GEO, WATER_MAT); m.position.set(...from); m.scale.set(1, 1, 1.8);
    G.scene.add(m);
    G.projectiles.push({ type: 'water', mesh: m, pos: m.position, vel, life: 4, ownGeo: false, update: updateWater });
    playSfx('hit', { rate: 0.5, vol: 0.5 });
    burst(m.position, { n: 5, color: '#bfdbfe', speed: 2, up: 2, size: 0.1 });
}
function updateWater(p, dt) {
    p.vel.y -= WATER_G * dt;
    p.pos.addScaledVector(p.vel, dt);
    p.mesh.lookAt(p.pos.clone().add(p.vel));
    if (Math.random() < dt * 30) burst(p.pos, { n: 1, color: '#bfdbfe', speed: 0.3, up: 0, size: 0.1, life: 0.3, gravity: 2 });
    const pl = G.player;
    if (!pl.dead && Math.abs(p.pos.x - pl.pos.x) < 0.6 && Math.abs(p.pos.z - pl.pos.z) < 0.6 && p.pos.y > pl.pos.y - 0.1 && p.pos.y < pl.pos.y + pl.h + 0.2) {
        if (shieldBlocks(p.pos, p.vel)) blockFx(p.pos.clone()); else { splash(p.pos); hurtPlayer(p.pos, { knock: 7 }); }
        p.life = 0; return;
    }
    const g = groundAt(G.world.solids, p.pos.x, p.pos.z, p.pos.y + 0.8);
    if (p.pos.y <= g + 0.1 || p.pos.y < -4) { splash(p.pos); p.life = 0; }
}
function splash(pos) { burst(pos, { n: 10, color: ['#93c5fd', '#dbeafe', '#3b82f6'], speed: 3, up: 3.5, size: 0.12, life: 0.5 }); }

// --- GAZ KAPSÜLÜ (bulut hazards.js'te) ---
const GAS_GEO = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
function fireGas(b, from, vel) {
    const m = new THREE.Mesh(GAS_GEO, mat('#3f6212')); m.position.set(...from);
    G.scene.add(m);
    G.projectiles.push({ type: 'tgas', mesh: m, pos: m.position, vel, life: 4, ownGeo: false, update: (p, dt) => updateGas(b, p, dt) });
    playSfx('hit', { rate: 2.2, vol: 0.4 });
}
function updateGas(b, p, dt) {
    p.vel.y -= GAS_G * dt;
    p.pos.addScaledVector(p.vel, dt);
    p.mesh.rotation.x += dt * 10;
    const pl = G.player;
    if (!pl.dead && Math.abs(p.pos.x - pl.pos.x) < 0.6 && Math.abs(p.pos.z - pl.pos.z) < 0.6 && p.pos.y > pl.pos.y && p.pos.y < pl.pos.y + pl.h + 0.2 && shieldBlocks(p.pos, p.vel)) {
        blockFx(p.pos.clone()); p.life = 0; return;
    }
    const g = groundAt(G.world.solids, p.pos.x, p.pos.z, p.pos.y + 0.8);
    if (p.pos.y <= g + 0.1) { makeCloud(new THREE.Vector3(p.pos.x, g, p.pos.z)); p.life = 0; }
    else if (p.pos.y < -4) p.life = 0;
}
