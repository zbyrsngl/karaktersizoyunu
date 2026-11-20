// HIRHIZ 3D — 9. bölüm düşmanları: DAĞDAKİ TERÖRİSTLER (kamuflaj, yüzü sarılı). Saldırmadan önce başında kırmızı !
//   KELEŞLİ: kum torbası barikatın arkasında çömelir (siperdeyken mermi işlemez), arada ayağa kalkıp seri ateş eder, sonra yine saklanır
//   BOMBACI: çukurda (siper) saklanır; başını çıkarıp el bombası atar, bomba yerde fitili yanıp patlar
//   CANLI BOMBA: seni görünce bağırarak koşar; yanına kadar gelirse kendini patlatır. Önce durdur! (vurulunca yeleği patlar: yakın durma)
// Yakalanan terörist kelepçeyle götürülür ("YAKALANDI!"). Mayınlar (makeMines): yaklaşınca bip bip öter, 1.4 sn sonra patlar.
import * as THREE from 'three';
import { limb, walkPose } from './models.js?v=27';
import { G, diff } from './state.js?v=27';
import { hurtPlayer } from './player.js?v=27';
import { burst, floatText, addTrauma, spawnFx } from './fx.js?v=27';
import { playSfx, beep } from './audio.js?v=27';
import { makeBomb, blast } from './hazards.js?v=27';
import { box, mat, dampAngle, rand, AABB } from './util.js?v=27';
import { Batch, mat4 } from './decor.js?v=27';
import { TYPES, patrol, stepToward, go, finish, handPos, shootStraight, throwLob, damageEnemy, setBubble } from './enemies.js?v=27';

const CAMO = '#4d5b2a', CAMO_D = '#3f4a22', SKIN = '#c68642';
function buildTerror(kind) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.11, 0.7, 0, 0.17, 0.68, 0.19, CAMO_D, '#1c1917');
    const legR = limb(body, 0.11, 0.7, 0, 0.17, 0.68, 0.19, CAMO_D, '#1c1917');
    const torso = new THREE.Group(); torso.position.y = 0.7; body.add(torso);
    torso.add(box(0.5, 0.62, 0.3, CAMO, 0, 0.31, 0));
    for (let i = 0; i < 6; i++) torso.add(box(0.1, 0.08, 0.02, ['#57534e', '#365314'][i % 2], -0.18 + (i % 3) * 0.12, 0.2 + Math.floor(i / 3) * 0.24, 0.16, false));   // kamuflaj lekeleri
    let vest = null, lights = [];
    if (kind === 'canli') {   // patlayıcı yelek: kırmızı çubuklar, kablolar, yanıp sönen lamba
        vest = new THREE.Group(); torso.add(vest);
        vest.add(box(0.54, 0.4, 0.34, '#292524', 0, 0.3, 0));
        for (let i = 0; i < 5; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), mat('#b91c1c')); st.position.set(-0.2 + i * 0.1, 0.3, 0.19); vest.add(st); }
        vest.add(box(0.46, 0.02, 0.02, '#facc15', 0, 0.38, 0.23, false));
        for (let i = 0; i < 2; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: '#ef4444' })); l.position.set(-0.1 + i * 0.2, 0.5, 0.2); vest.add(l); lights.push(l); }
    } else {   // fişeklik
        torso.add(box(0.52, 0.18, 0.34, '#3f3f1f', 0, 0.36, 0));
        for (let i = 0; i < 4; i++) torso.add(box(0.08, 0.12, 0.05, '#57534e', -0.18 + i * 0.12, 0.36, 0.18, false));
    }
    const head = new THREE.Group(); head.position.y = 0.62; torso.add(head);
    head.add(box(0.12, 0.1, 0.12, SKIN, 0, 0.02, 0));
    head.add(box(0.34, 0.38, 0.32, '#1c1917', 0, 0.25, 0));                     // yüzü sarılı
    head.add(box(0.26, 0.08, 0.02, SKIN, 0, 0.29, 0.165, false));               // göz aralığı
    head.add(box(0.05, 0.04, 0.02, '#111', -0.07, 0.29, 0.172, false)); head.add(box(0.05, 0.04, 0.02, '#111', 0.07, 0.29, 0.172, false));
    head.add(box(0.36, 0.06, 0.34, '#7f1d1d', 0, 0.36, 0, false));              // alın bandı
    const armL = limb(torso, -0.32, 0.56, 0, 0.13, 0.5, 0.14, CAMO);
    const armR = limb(torso, 0.32, 0.56, 0, 0.13, 0.5, 0.14, CAMO);
    armL.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.53, 0, false)); armR.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.53, 0, false));
    let gun = null;
    if (kind === 'keles') {   // keleş: koyu gövde, ahşap dipçik, kavisli şarjör
        gun = new THREE.Group(); gun.position.set(0, -0.5, 0.05); armR.add(gun);
        gun.add(box(0.07, 0.09, 0.75, '#1f2937', 0, 0, 0.25)); gun.add(box(0.06, 0.12, 0.25, '#78350f', 0, -0.03, -0.18)); gun.add(box(0.05, 0.05, 0.3, '#78350f', 0, 0.06, 0.32));
        const mag = box(0.05, 0.2, 0.08, '#111827', 0, -0.13, 0.22); mag.rotation.x = 0.3; gun.add(mag);
        gun.add(box(0.025, 0.025, 0.2, '#111827', 0, 0.02, 0.7));
        gun.rotation.x = -Math.PI / 2;
    }
    return { root, body, legL, legR, armL, armR, torso, head, gun, weapon: gun, vest, lights };
}

// --- SİPERLER (düşmanla birlikte kurulur/kaldırılır) ---
const SAND = ['#a8946a', '#9a865d', '#b5a275'];
function sandbags(b, x, z, w, rows, yaw = 0) {
    const n = Math.round(w / 0.62), M = mat4(x, 0, z, yaw);
    for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
        const lx = -w / 2 + 0.31 + i * 0.62 + (r % 2) * 0.2;
        if (lx > w / 2) continue;
        b.box(M, 0.6, 0.24, 0.42, SAND[(i + r) % 3], lx, 0.12 + r * 0.24, 0);
    }
}
function coverSpawn(e) {   // keleşli: önünde (oyuncu tarafında, +Z) kum torbası barikat; katı
    const b = new Batch(), z = e.pos.z + 1.0;
    sandbags(b, e.pos.x, z, 2.6, 5);
    e.cover = b.mesh(); e.cover.position.y = e.pos.y; G.scene.add(e.cover);   // kaya çıkıntısının üstünde de olur
    e.coverBox = new AABB(e.pos.x - 1.3, e.pos.y, z - 0.25, e.pos.x + 1.3, e.pos.y + 1.2, z + 0.25, 'solid');
    G.world.solids.push(e.coverBox);
}
function holeSpawn(e) {   // bombacı: çukur — etrafı halka kum torbası (alçak), içi karanlık
    const b = new Batch(), M = mat4(0, 0, 0);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.box(mat4(e.pos.x + Math.sin(a) * 0.95, 0, e.pos.z + Math.cos(a) * 0.95, a), 0.6, 0.26, 0.4, SAND[i % 3], 0, 0.13, 0); }
    b.box(M, 1.5, 0.02, 1.5, '#1c1917', e.pos.x, 0.012, e.pos.z);
    e.cover = b.mesh(); G.scene.add(e.cover);
}
function coverRemove(e) {
    if (e.cover) { G.scene.remove(e.cover); e.cover.geometry.dispose(); e.cover = null; }
    if (e.coverBox && G.world) { G.world.solids = G.world.solids.filter(a => a !== e.coverBox); e.coverBox = null; }
}

// --- KELEŞLİ ---
const BULLET_GEO = new THREE.SphereGeometry(0.07, 6, 4), BULLET_MAT = new THREE.MeshBasicMaterial({ color: '#fde047' });
function crouch(e, k) {   // k: 0 ayakta, 1 tam çömelmiş
    e.m.body.position.y = -0.72 * k;
    e.m.legL.rotation.x = -1.4 * k; e.m.legR.rotation.x = -1.4 * k;
}
function keles(e, dt, c) {
    const S = diff();
    e.facing = dampAngle(e.facing, c.toP, 5, dt);
    if (e.st === 'idle') {   // siperde
        e.cr = Math.min(1, (e.cr ?? 1) + dt * 5); crouch(e, e.cr); e.covered = e.cr > 0.6;
        e.m.armR.rotation.x = -1.2; e.m.armL.rotation.x = -1.2;
        if (c.alert && c.canStart && c.d < 24) go(e, 'rise', 0.5, '!');
    } else if (e.st === 'rise') {   // ayağa kalkar, nişan alır
        e.t -= dt; e.cr = Math.max(0, e.cr - dt * 4); crouch(e, e.cr); e.covered = e.cr > 0.6;
        e.m.armR.rotation.x = -1.5; e.m.armL.rotation.x = -1.4;
        if (e.t <= 0) { go(e, 'fire', 0.9, null); e.shots = 0; e.shotT = 0; }
    } else if (e.st === 'fire') {   // seri ateş
        e.t -= dt; e.shotT -= dt; e.covered = false;
        if (e.shotT <= 0 && e.shots < 5) {
            e.shotT = 0.15; e.shots++;
            const from = handPos(e, 1.45), m = new THREE.Mesh(BULLET_GEO, BULLET_MAT);
            shootStraight(m, from, 17 * (0.9 + 0.1 * S.speed), { spread: rand(-0.06, 0.06), type: 'bullet', life: 2 });
            burst(from.clone().add(new THREE.Vector3(Math.sin(e.facing) * 0.5, 0, Math.cos(e.facing) * 0.5)), { n: 2, color: ['#fde047', '#f97316'], speed: 1.5, up: 0.5, size: 0.08, life: 0.12 });
            playSfx('hit', { rate: 2.6, vol: 0.22 });
            e.m.armR.rotation.x = -1.5 - 0.12;
        } else e.m.armR.rotation.x = -1.5;
        if (e.t <= 0) go(e, 'duck', 0.35, null);
    } else if (e.st === 'duck') {
        e.t -= dt; e.cr = Math.min(1, e.cr + dt * 4); crouch(e, e.cr);
        if (e.t <= 0) finish(e, rand(1.6, 2.6));
    }
}
// --- BOMBACI ---
function bombaci(e, dt, c) {
    e.facing = dampAngle(e.facing, c.toP, 5, dt);
    if (e.st === 'idle') {   // çukurda: yalnızca başı görünür
        e.m.body.position.y += (-1.2 - e.m.body.position.y) * Math.min(1, dt * 8); e.covered = true;
        if (c.alert && c.canStart && c.d < 22) go(e, 'rise', 0.6, '!');
    } else if (e.st === 'rise') {
        e.t -= dt; e.m.body.position.y += (-0.45 - e.m.body.position.y) * Math.min(1, dt * 10); e.covered = false;
        e.m.armR.rotation.x = 1.4 * (1 - e.t / 0.6) - 0.5;
        if (e.t <= 0) {
            throwLob(handPos(e, 1.6), grenade(), { type: 'gren', hurtsOnHit: true, lead: 0.4, trail: ['#57534e', '#a8a29e'], onLand: at => makeBomb(at, grenade(), { fuse: 0.9 }) });
            playSfx('hit', { rate: 1.6, vol: 0.3 }); e.m.armR.rotation.x = -2.2;
            go(e, 'duck', 0.5, null);
        }
    } else if (e.st === 'duck') { e.t -= dt; if (e.t <= 0) { e.m.armR.rotation.x = 0; finish(e, rand(2.4, 3.4)); } }
}
function grenade() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mat('#3f6212')); b.scale.y = 1.25; g.add(b);
    g.add(box(0.06, 0.06, 0.06, '#a8a29e', 0, 0.15, 0, false));
    return g;
}
// --- CANLI BOMBA ---
function canli(e, dt, c) {
    const S = diff();
    // yelekteki lambalar yanıp söner (koşarken hızlanır)
    const rate = e.st === 'run' || e.st === 'arm' ? 14 : 3;
    e.m.lights.forEach((l, i) => l.visible = Math.sin(G.time * rate + i * 3) > 0);
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.1 * S.speed); return; }
        if (c.d < 22 && Math.abs(c.dy) < 2) { go(e, 'run', 9, '!!'); setBubble(e, 'AAAAAAAAA!', 9); }
        else patrol(e, dt, 1.1 * S.speed);
    } else if (e.st === 'run') {   // bağırarak koşar
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 10, dt);
        if (stepToward(e, c.toP, 5.3 * S.speed, dt)) { e.phase += dt * 14; walkPose(e.m, e.phase, 1); }
        e.m.armL.rotation.x = -2.6 + Math.sin(G.time * 18) * 0.3; e.m.armR.rotation.x = -2.6 - Math.sin(G.time * 18) * 0.3;
        if ((e.beepT = (e.beepT || 0) - dt) <= 0) { e.beepT = 0.25; beep('mine'); }
        if (c.d < 2.1 && Math.abs(c.dy) < 1.8) { go(e, 'arm', 0.35, null); setBubble(e, null); }
        if (e.t <= 0) { setBubble(e, null); finish(e, 2); }
    } else if (e.st === 'arm') {   // patlamadan hemen önce parlar
        e.t -= dt; e.m.body.scale.setScalar(1 + (0.35 - e.t) * 0.6);
        if ((e.beepT -= dt) <= 0) { e.beepT = 0.06; beep('mine'); }
        if (e.t <= 0) { e.selfDet = true; blast(e.pos.clone(), 3.2); addTrauma(0.6); damageEnemy(e, 99, 'blast'); }
    }
}

const terror = (kind, name, update, extra = {}) => ({ kind: 'terror', name, hp: 2, score: 3500, arrest: true, deathText: 'YAKALANDI!', build: () => buildTerror(kind), update, ...extra });
Object.assign(TYPES, {
    keles: terror('keles', 'KELEŞLİ', keles, { score: 4000, onSpawn: coverSpawn, onRemove: coverRemove, onDeath: e => { e.covered = false; crouch(e, 0); } }),
    bombaci: terror('bombaci', 'BOMBACI', bombaci, { score: 4000, onSpawn: holeSpawn, onRemove: coverRemove, onDeath: e => { e.covered = false; e.m.body.position.y = 0; } }),
    canli: terror('canli', 'CANLI BOMBA', canli, { hp: 1, score: 5000, deathText: 'ETKİSİZ!', arrest: false,
        onDeath: e => { setBubble(e, null); if (!e.selfDet) { blast(e.pos.clone(), 2.2); } e.m.root.visible = false; } })
});

// --- MAYINLAR ---
// list: [[x, z], ...]. Yaklaşınca (2.6 m) kurulur: bip bip hızlanır, kırmızı halka büyür; 1.4 sn sonra patlar. 18 sn sonra yerine yenisi gömülür.
export function makeMines(scene, W, list) {
    const plate = new THREE.CylinderGeometry(0.32, 0.36, 0.12, 12), pm = mat('#57534e'), knob = mat('#292524');
    const mines = list.map(([x, z]) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
        const p = new THREE.Mesh(plate, pm); p.position.y = 0.04; g.add(p);
        const k = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 8), knob); k.position.y = 0.13; g.add(k);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: '#ef4444' })); led.position.set(0.18, 0.12, 0); g.add(led);
        const dirt = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), new THREE.MeshLambertMaterial({ color: '#57442f', transparent: true, opacity: 0.8 })); dirt.rotation.x = -Math.PI / 2; dirt.position.y = 0.015; g.add(dirt);
        const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.15, 32), new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
        return { g, led, ring, x, z, st: 'armed', t: 0, beep: 0 };
    });
    W.mines = mines;
    W.movers.push((dt, t) => {
        if (G.state !== 'play') return;
        const p = G.player;
        mines.forEach(m => {
            if (m.st === 'armed') {
                m.led.visible = (t % 2) < 0.12;   // arada bir göz kırpar
                // her iki oyuncu da kurar (iki telefonda da aynı mayın patlar; hasar yalnızca o cihazın oyuncusuna)
                if ((G.players || [p]).some(q => q && !q.dead && Math.hypot(q.pos.x - m.x, q.pos.z - m.z) < 2.6 && q.pos.y < 1.5)) {
                    m.st = 'live'; m.t = 1.4; m.beep = 0;
                    floatText('MAYIN!', new THREE.Vector3(m.x, 1.4, m.z), '#ef4444', 0.55, 1);
                }
            } else if (m.st === 'live') {
                m.t -= dt; m.beep -= dt;
                if (m.beep <= 0) { m.beep = 0.06 + m.t * 0.16; beep('mine'); m.led.visible = !m.led.visible; }
                m.ring.material.opacity = 0.35 + Math.sin(t * 30) * 0.25; m.ring.scale.setScalar(1 + (1.4 - m.t) * 0.08);
                m.g.children[0].position.y = 0.04 + (1.4 - m.t) * 0.06;   // toprak kabarır
                if (m.t <= 0) {
                    blast(new THREE.Vector3(m.x, 0, m.z), 2.2);
                    burst(new THREE.Vector3(m.x, 0.3, m.z), { n: 14, color: ['#57442f', '#78716c', '#a8a29e'], speed: 5, up: 9, size: 0.18, life: 1 });
                    spawnFx('boom', new THREE.Vector3(m.x, 0, m.z), 2);
                    m.st = 'gone'; m.t = 18; m.g.visible = false;
                }
            } else if (m.st === 'gone') {
                m.t -= dt;
                if (m.t <= 0 && Math.hypot(p.pos.x - m.x, p.pos.z - m.z) > 8) { m.st = 'armed'; m.g.visible = true; m.ring.material.opacity = 0; m.ring.scale.setScalar(1); m.g.children[0].position.y = 0.04; }
            }
        });
    });
    return mines;
}
export { buildTerror, sandbags };
