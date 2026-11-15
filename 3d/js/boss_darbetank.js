// HIRHIZ 3D — 5. bölüm canavarı DARBE TANKI: kulesinde kızgın gözleri olan komik dev tank. "YOL KAPALI!"
// Ağır ağır yaklaşır, oyuncuya döner. Saldırıları (her biri önce belli eder):
//   ATEŞ!: namlu kalkar, üç alev topu kavisli düşer; düştüğü yer kısa süre yanar
//   VRRROOOM! (her üçüncü): titreyerek hazırlanır, sonra dümdüz hızla ileri sürer (yolundan çekil ya da kalkanla karşıla)
// Hasar: üstüne zıplamak 2, balyoz 1, rüşvet 1. Yenilince kapağından beyaz bayrak çıkar: TESLİM!
import * as THREE from 'three';
import { G, diff, addScore, toast } from './state.js?v=12';
import { hurtPlayer, blockFx, bouncePlayer } from './player.js?v=12';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=12';
import { playSfx } from './audio.js?v=12';
import { makeFire } from './hazards.js?v=12';
import { box, mat, angDiff, dampAngle, clamp, rand } from './util.js?v=12';
import { ARENA } from './world.js?v=12';
import { throwLob } from './enemies.js?v=12';
import { showBossBar, setBossBar } from './boss_core.js?v=12';
import { tankCamo } from './tanks.js?v=12';

const HX = 1.55, HZ = 3.0, HULL_TOP = 1.5, TOP = 2.35;

function buildBigTank() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const cm = tankCamo();
    const wheels = [];
    [-1.3, 1.3].forEach(x => {
        body.add(box(0.6, 0.85, 6.2, '#111827', x, 0.43, 0));
        for (let i = 0; i < 7; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.62, 10), mat('#6b7280')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.38, -2.5 + i * 0.83); body.add(w); wheels.push(w); }
    });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 0.75, 6), cm); hull.position.y = 1.12; hull.castShadow = true; body.add(hull);
    const turretG = new THREE.Group(); turretG.position.set(0, HULL_TOP, -0.4); body.add(turretG);
    const turret = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 2.5), cm); turret.position.y = 0.42; turret.castShadow = true; turretG.add(turret);
    const barrel = new THREE.Group(); barrel.position.set(0, 0.45, 1.2); turretG.add(barrel);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.8, 10), mat('#2b2f1a')); gun.rotation.x = Math.PI / 2; gun.position.z = 1.4; gun.castShadow = true; barrel.add(gun);
    barrel.add(box(0.4, 0.4, 0.25, '#1f2937', 0, 0, 2.8));
    // komik kızgın gözler ve kaşlar (kulenin önünde)
    const brows = [];
    [-0.42, 0.42].forEach((x, i) => {
        turretG.add(box(0.42, 0.3, 0.04, '#ffffff', x, 0.48, 1.26, false));
        turretG.add(box(0.17, 0.17, 0.03, '#111111', x + (i ? -0.06 : 0.06), 0.46, 1.285, false));
        const br = box(0.5, 0.08, 0.05, '#111111', x, 0.7, 1.27, false); br.rotation.z = i ? 0.3 : -0.3; turretG.add(br); brows.push(br);
    });
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12), cm); hatch.position.set(-0.4, 0.9, -0.5); turretG.add(hatch);
    // teslim bayrağı
    const flag = new THREE.Group(); flag.position.set(-0.4, 0.9, -0.5); flag.visible = false; turretG.add(flag);
    flag.add(box(0.06, 2.2, 0.06, '#78350f', 0, 1.1, 0));
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75, 6, 1), new THREE.MeshLambertMaterial({ color: '#f8fafc', side: THREE.DoubleSide })); cloth.position.set(0.58, 1.8, 0); flag.add(cloth);
    return { root, body, turretG, barrel, wheels, brows, flag, cloth };
}

export function spawnDarbeTank(scene, pos) {
    const m = buildBigTank();
    m.root.position.copy(pos); scene.add(m.root);
    const hp = Math.max(9, Math.round(18 * diff().boss));
    const b = {
        m, root: m.root, pos: m.root.position, name: 'DARBE TANKI', hp, maxHp: hp, dead: false, deadT: 0,
        facing: 0, st: 'walk', t: 0, timer: 1.6, attacks: 0, speed: 0, hurtT: 0, rage: false, steer: 0, hit: false,
        update: dt => update(b, dt),
        hitTest: pt => { const l = toLocal(b, pt); return Math.abs(l.x) < HX && Math.abs(l.z) < HZ && pt.y > 0 && pt.y < TOP + 0.2; },
        onHammer: point => damage(b, 1, point, 'hammer'),
        onAmmo: p => damage(b, 1, p.pos, 'ammo'),
        reset: () => { b.hp = b.maxHp; b.pos.set(0, 0, -218); b.st = 'walk'; b.timer = 1.6; b.rage = false; setBossBar(b); }
    };
    toast('BÖLÜM SONU CANAVARI: DARBE TANKI!', 2600, '#fca5a5');
    floatText('YOL KAPALI!', pos.clone().setY(TOP + 1.2), '#fde047', 0.7, 2.2);
    G.boss = b;
    showBossBar(b);
    playSfx('boom', { rate: 0.5, vol: 0.5 });
    return b;
}

function toLocal(b, pt) {
    const dx = pt.x - b.pos.x, dz = pt.z - b.pos.z, c = Math.cos(-b.facing), s = Math.sin(-b.facing);
    return { x: dx * c + dz * s, z: -dx * s + dz * c };
}

function update(b, dt) {
    const p = G.player, m = b.m, S = diff();
    if (b.hurtT > 0) b.hurtT -= dt;
    m.root.visible = !(b.hurtT > 0 && Math.floor(b.hurtT * 14) % 2 === 0);
    if (b.dead) {   // beyaz bayrak yükselir, dalgalanır
        b.deadT += dt;
        m.flag.visible = true; m.flag.scale.y = Math.min(1, b.deadT * 1.5);
        m.cloth.rotation.y = Math.sin(G.time * 4) * 0.3;
        if (Math.random() < dt * 6) burst(b.pos.clone().setY(2.6), { n: 2, color: ['#57534e', '#a8a29e'], speed: 0.6, up: 3, gravity: -1, size: 0.3, life: 1.2 });
        if (b.deadT > 3 && !b.reported) { b.reported = true; G.onBossDefeated && G.onBossDefeated(); }
        return;
    }
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, d = Math.hypot(dx, dz), toP = Math.atan2(dx, dz);
    b.t -= dt;
    const sp = (b.rage ? 1.3 : 1) * S.speed;
    let move = 0, shake = 0;
    if (b.st === 'walk') {
        b.facing = dampAngle(b.facing, toP, 1.4, dt);
        if (d > 4) move = 1.5 * sp;
        m.barrel.rotation.x = -0.05;
        b.timer -= dt;
        if (!p.dead && d < 30 && b.timer <= 0) {
            b.attacks++; b.next = b.attacks % 3 === 0 ? 'ram' : 'shell';
            b.st = 'crouch'; b.t = b.next === 'ram' ? 0.75 : 0.47;
            floatText(b.next === 'ram' ? 'VRRROOOM!' : 'ATEŞ!', b.pos.clone().setY(TOP + 0.8), b.next === 'ram' ? '#ef4444' : '#fde047', 0.6, 1);
        }
    } else if (b.st === 'crouch') {   // hazırlık: titrer, namlu kalkar ya da motor kükrer
        b.facing = dampAngle(b.facing, toP, 3, dt);
        shake = 0.05;
        if (b.next === 'shell') m.barrel.rotation.x = -0.35;
        else if (Math.random() < dt * 20) burst(b.pos.clone().add(new THREE.Vector3(-Math.sin(b.facing) * 3, 0.6, -Math.cos(b.facing) * 3)), { n: 1, color: ['#57534e', '#1f2937'], speed: 0.5, up: 1.5, gravity: -1, size: 0.3, life: 0.8 });
        if (b.t <= 0) {
            if (b.next === 'shell') { shells(b); b.st = 'walk'; b.timer = (b.rage ? 1.0 : 1.5) * S.fire; }
            else { b.st = 'dash'; b.t = 1.3; b.steer = b.facing; b.hit = false; playSfx('boom', { rate: 0.4, vol: 0.5 }); }
        }
    } else if (b.st === 'dash') {   // dümdüz hızla sürer
        b.facing = b.steer; move = 10 * sp;
        if (Math.random() < dt * 25) burst(b.pos.clone().setY(0.2), { n: 1, color: '#d6c08a', speed: 2, up: 1, size: 0.18, life: 0.5 });
        if (b.t <= 0) { b.st = 'walk'; b.timer = 0.6; }
    }
    // Hareket (meydandan çıkmaz; duvara dayanınca hücum biter)
    const nx = b.pos.x + Math.sin(b.facing) * move * dt, nz = b.pos.z + Math.cos(b.facing) * move * dt;
    const cx = clamp(nx, -ARENA.hw + 3.2, ARENA.hw - 3.2), cz = clamp(nz, ARENA.z1 + 3.2, ARENA.z0 - 3.2);
    if (b.st === 'dash' && (cx !== nx || cz !== nz)) { b.st = 'walk'; b.timer = 0.8; addTrauma(0.3); playSfx('hit', { rate: 0.5, vol: 0.7 }); }
    b.pos.x = cx; b.pos.z = cz;
    m.wheels.forEach(w => { w.rotation.x += move * dt / 0.33; });
    m.root.rotation.y = b.facing;
    m.body.position.x = shake ? (Math.random() - 0.5) * shake * 2 : 0;
    const angry = b.st !== 'walk' || b.rage;
    m.brows.forEach((br, i) => { br.rotation.z = (i ? 1 : -1) * (angry ? -0.45 : -0.2); });

    // Oyuncuyla temas: üstüne inerse hasar, yandan çarparsa itilir (hücumda can kaybeder)
    const l = toLocal(b, p.pos), r = p.r;
    if (!p.dead && Math.abs(l.x) < HX + r && Math.abs(l.z) < HZ + r && p.pos.y < TOP + 0.05 && p.pos.y + p.h > 0.2) {
        const top = Math.abs(l.z + 0.4) < 1.25 && Math.abs(l.x) < 1.05 ? TOP : HULL_TOP;
        if (p.pos.y > top - 0.55 && p.vel.y <= 0.5) { bouncePlayer(13); damage(b, 2, p.pos.clone(), 'stomp'); }
        else {
            const px = HX + r - Math.abs(l.x), pz = HZ + r - Math.abs(l.z), c = Math.cos(b.facing), s = Math.sin(b.facing);
            const ox = px < pz ? Math.sign(l.x) * (px + 0.02) : 0, oz = px < pz ? 0 : Math.sign(l.z) * (pz + 0.02);
            p.pos.x += ox * c + oz * s; p.pos.z += -ox * s + oz * c;
            if (b.st === 'dash' && !b.hit) {
                b.hit = true;
                if (p.shield && Math.abs(angDiff(p.facing, toP + Math.PI)) < 1.3) { blockFx(p.pos.clone().setY(p.pos.y + 1.2)); p.vel.x += Math.sin(b.facing) * 12; p.vel.z += Math.cos(b.facing) * 12; }
                else hurtPlayer(b.pos, { knock: 13 });
            } else if (move > 0.5) hurtPlayer(b.pos, { knock: 7 });
        }
    }
}

// Üç alev topu: oyuncunun çevresine kavisli düşer, yer kısa süre yanar
const FIRE_GEO = new THREE.SphereGeometry(0.22, 10, 8), FIRE_MAT = new THREE.MeshBasicMaterial({ color: '#f97316' });
function shells(b) {
    const p = G.player, toP = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z), d = Math.max(4, Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z));
    const from = b.pos.clone().add(new THREE.Vector3(Math.sin(b.facing) * 4.5, 2.4, Math.cos(b.facing) * 4.5));
    [-0.22, 0, 0.22].forEach((a, i) => {
        const r = d * (0.85 + i * 0.12);
        const to = new THREE.Vector3(b.pos.x + Math.sin(toP + a) * r, p.pos.y, b.pos.z + Math.cos(toP + a) * r);
        throwLob(from, new THREE.Mesh(FIRE_GEO, FIRE_MAT), { type: 'fireball', to, lead: a === 0 ? 0.5 : 0, g: 16, trail: ['#ef4444', '#f97316', '#fde047'], onLand: at => makeFire(at, { r: 1.0, t: 1.8 }) });
    });
    burst(from, { n: 10, color: ['#fde047', '#f97316', '#57534e'], speed: 3, up: 2, size: 0.18, life: 0.4 });
    playSfx('boom', { rate: 1.1, vol: 0.5 }); addTrauma(0.2);
}

function damage(b, n, point, how) {
    if (b.dead) return;
    if (b.hurtT > 0 && how !== 'ammo') return;
    b.hp -= n; b.hurtT = how === 'ammo' ? 0.12 : 0.45;
    setBossBar(b);
    playSfx('hit', { rate: 0.7, vol: 0.9 }); addTrauma(how === 'ammo' ? 0.08 : 0.4); if (how !== 'ammo') G.hitStop = 0.08;
    spawnFx('pow', point.clone(), 1.4);
    burst(point.clone(), { n: 10, color: ['#4d5b2a', '#fde047', '#1f2937'], speed: 4, up: 4 });
    if (!b.rage && b.hp <= b.maxHp / 2) { b.rage = true; floatText('TANK ÖFKELENDİ!', b.pos.clone().setY(TOP + 1), '#ef4444', 0.6, 1.6); }
    if (b.hp <= 0) defeat(b);
}
function defeat(b) {
    b.dead = true; b.deadT = 0;
    addScore(20000);
    spawnFx('boom', b.pos.clone().setY(0.2), 2.4);
    spawnFx('confetti', b.pos.clone().setY(3.6).add(new THREE.Vector3(-2, 0, 0)), 2, 0.3);
    spawnFx('confetti', b.pos.clone().setY(3.6).add(new THREE.Vector3(2, 0, 0)), 2, 0.6);
    burst(b.pos.clone().setY(1.5), { n: 30, color: ['#f97316', '#fde047', '#4d5b2a', '#57534e'], speed: 7, up: 8, size: 0.2, life: 1.2 });
    playSfx('boom', { vol: 0.9 }); addTrauma(0.9);
    floatText('TESLİM!', b.pos.clone().setY(4.6), '#f8fafc', 0.9, 2.5);
    G.projectiles.forEach(p => { if (p.type === 'fireball') p.life = 0; });
}
