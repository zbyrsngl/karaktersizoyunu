// HIRHIZ 3D: el bombası (uçuş ve BYLOCK dışındaki bütün bölümler)
// R tuşu / telefonda 💣 düğmesi: nişangâhın gösterdiği yere kavisle atılır, yerde seker, fünyesi bitince
// ya da bir düşmana / canavara çarpınca patlar. Patlama: ışık parlaması, ateş topu, şok halkası, duman,
// kıvılcım ve moloz, yerde kurum izi, kamera sarsıntısı. Yarıçapındaki düşmanlar düşer, tuğlalar kırılır, canavar hasar alır.
// Elde en çok 3 bomba; oyun 1 bombayla başlar, yenileri güç tuğlalarından (her bölümde 3 sabit yerde) çıkar.
import * as THREE from 'three';
import { G } from './state.js?v=21';
import { burst, spawnFx, addTrauma, floatText } from './fx.js?v=21';
import { playSfx } from './audio.js?v=21';
import { damageEnemy } from './enemies.js?v=21';
import { groundAt } from './physics.js?v=21';
import { mat, clamp, rand, canvasTex } from './util.js?v=21';

export const GRENADE = { max: 3, start: 1, radius: 4.8, fuse: 1.6, grav: 20, minD: 3, maxD: 22 };
let scene = null;
const live = [];   // uçan bombalar
const fx = [];     // patlama parçaları (ateş topu, halka, duman, kurum, ışık)

export function initGrenades(sc) { scene = sc; live.length = 0; fx.length = 0; }
export function clearGrenades() {
    live.forEach(g => scene && scene.remove(g.m)); live.length = 0;
    fx.forEach(f => { scene && scene.remove(f.o); f.dispose && f.dispose(); }); fx.length = 0;
}
export function resetGrenadeStock() { G.grenades = GRENADE.start; G.grenadeT = 0; }

// --- MODEL: zeytin yeşili dilimli gövde, gri kapak, kaldıraç, sarı pim halkası, yanıp sönen kırmızı ışık ---
const GEO = {
    body: new THREE.SphereGeometry(0.13, 12, 10),
    band: new THREE.TorusGeometry(0.128, 0.012, 4, 14),
    cap: new THREE.CylinderGeometry(0.05, 0.06, 0.07, 10),
    ring: new THREE.TorusGeometry(0.035, 0.008, 4, 10),
    led: new THREE.SphereGeometry(0.022, 6, 5),
    ball: new THREE.SphereGeometry(1, 16, 12),
    puff: new THREE.IcosahedronGeometry(1, 1),
    disc: new THREE.CircleGeometry(1, 24),
    shock: new THREE.RingGeometry(0.82, 1, 32)
};
const M = {
    body: mat('#4d5b23'), band: mat('#2f3a12'), cap: mat('#9ca3af'), ring: mat('#facc15'),
    ledOn: new THREE.MeshBasicMaterial({ color: '#ef4444' }), ledOff: new THREE.MeshBasicMaterial({ color: '#450a0a' })
};
function makeGrenade() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(GEO.body, M.body); b.scale.set(1, 1.25, 1); b.castShadow = true; g.add(b);
    [-0.06, 0.02, 0.1].forEach(y => { const r = new THREE.Mesh(GEO.band, M.band); r.rotation.x = Math.PI / 2; r.position.y = y; r.scale.setScalar(1 - Math.abs(y) * 1.6); g.add(r); });
    for (let i = 0; i < 4; i++) { const v = new THREE.Mesh(GEO.band, M.band); v.rotation.y = i * Math.PI / 4; v.scale.set(1, 1.25, 1); g.add(v); }
    const cap = new THREE.Mesh(GEO.cap, M.cap); cap.position.y = 0.19; g.add(cap);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.02), M.cap); lever.position.set(0.07, 0.13, 0); lever.rotation.z = -0.25; g.add(lever);
    const ring = new THREE.Mesh(GEO.ring, M.ring); ring.position.set(-0.07, 0.2, 0); ring.rotation.y = Math.PI / 2; g.add(ring);
    const led = new THREE.Mesh(GEO.led, M.ledOn); led.position.set(0, 0.235, 0); g.add(led);
    g.userData.led = led;
    return g;
}

// --- ATIŞ ---
// from: el, to: hedef nokta. Uzaklık 3-22 m arasına sıkıştırılır; uçuş süresi uzaklıkla artar (kavis).
export function throwGrenade(from, to) {
    if (!scene) return false;
    const dx = to.x - from.x, dz = to.z - from.z;
    let d = Math.hypot(dx, dz);
    const ux = d > 0.01 ? dx / d : 0, uz = d > 0.01 ? dz / d : 1;
    d = clamp(d, GRENADE.minD, GRENADE.maxD);
    const ty = d === Math.hypot(dx, dz) ? to.y : from.y - 1.3;   // sıkıştırıldıysa yere doğru
    const T = 0.5 + d * 0.035, g = GRENADE.grav;
    const vel = new THREE.Vector3(ux * d / T, (ty - from.y + 0.5 * g * T * T) / T, uz * d / T);
    const m = makeGrenade(); m.position.copy(from); scene.add(m);
    live.push({ m, pos: m.position, vel, t: 0, spin: new THREE.Vector3(rand(-9, 9), rand(-4, 4), rand(-9, 9)), bounces: 0, trail: 0 });
    playSfx('hit', { rate: 2.2, vol: 0.25 });   // pim çekildi
    return true;
}

function solidAt(x, y, z) {
    for (const a of G.world.solids) {
        if (!a.active) continue;
        if (x > a.min.x && x < a.max.x && z > a.min.z && z < a.max.z && y > a.min.y && y < a.max.y) return a;
    }
    return null;
}

export function updateGrenades(dt) {
    // Stok kendiliğinden dolmaz: bölüm 1 bombayla başlar, yenileri güç tuğlalarından çıkar (powerups.js)
    for (let i = live.length - 1; i >= 0; i--) {
        const g = live[i], p = g.pos;
        g.t += dt;
        g.vel.y -= GRENADE.grav * dt;
        const nx = p.x + g.vel.x * dt, ny = p.y + g.vel.y * dt, nz = p.z + g.vel.z * dt;
        // duvar / kutu: yatay hız ters döner
        if (solidAt(nx, ny + 0.05, nz) && !solidAt(p.x, ny + 0.05, p.z) ) { g.vel.x *= -0.45; g.vel.z *= -0.45; }
        else if (solidAt(nx, ny + 0.05, nz) && !solidAt(nx, ny + 0.05, p.z)) { g.vel.x *= -0.45; }
        else if (solidAt(nx, ny + 0.05, nz)) { g.vel.z *= -0.45; }
        else { p.x = nx; p.z = nz; }
        const floor = Math.max(groundAt(G.world.solids, p.x, p.z, p.y + 0.3), -50);
        p.y = ny;
        if (p.y - 0.15 < floor && g.vel.y < 0) {   // yere değdi: seker, sürtünür
            p.y = floor + 0.15;
            if (g.vel.y < -2.5) { g.bounces++; playSfx('hit', { rate: 2.6, vol: 0.18 }); burst(p.clone(), { n: 3, color: '#a8a29e', speed: 1.5, up: 1.5, size: 0.06, life: 0.3 }); }
            g.vel.y = -g.vel.y * 0.35; g.vel.x *= 0.6; g.vel.z *= 0.6; g.spin.multiplyScalar(0.6);
            if (Math.abs(g.vel.y) < 1) g.vel.y = 0;
        }
        g.m.rotation.x += g.spin.x * dt; g.m.rotation.y += g.spin.y * dt; g.m.rotation.z += g.spin.z * dt;
        // yanıp söner, fünye bitmeye yakın hızlanır
        const rate = g.t > GRENADE.fuse - 0.5 ? 18 : 7;
        g.m.userData.led.material = Math.floor(g.t * rate) % 2 ? M.ledOn : M.ledOff;
        // uçarken duman izi
        g.trail -= dt;
        if (g.trail <= 0 && Math.hypot(g.vel.x, g.vel.z) > 3) { g.trail = 0.05; burst(p.clone(), { n: 1, color: ['#d6d3d1', '#a8a29e'], speed: 0.3, up: 0.6, size: 0.07, life: 0.45, gravity: -1 }); }
        // çarpma: düşman ya da canavar
        let hit = false;
        for (const e of G.enemies) {
            if (e.dead || e.kind === 'duran') continue;
            if (Math.hypot(e.pos.x - p.x, e.pos.z - p.z) < 0.6 && p.y > e.pos.y && p.y < e.pos.y + (e.T.height || 1.9)) { hit = true; break; }
        }
        const B = G.boss;
        if (!hit && B && !B.dead && B.hitTest && B.hitTest(p)) hit = true;
        if (hit || g.t >= GRENADE.fuse || p.y < -20) {
            scene.remove(g.m); live.splice(i, 1);
            if (p.y > -20) explode(p.clone());
        }
    }
    // patlama parçaları
    for (let i = fx.length - 1; i >= 0; i--) {
        const f = fx[i]; f.t += dt;
        if (f.update(f, dt)) { scene.remove(f.o); f.dispose && f.dispose(); fx.splice(i, 1); }
    }
}

// --- PATLAMA ---
let scorchTex = null;
function scorch() {
    if (!scorchTex) scorchTex = canvasTex(128, 128, (c, w, h) => {
        const gr = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(10,8,6,0.9)'); gr.addColorStop(0.55, 'rgba(25,20,15,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 14; i++) {   // dışa doğru kurum çizgileri
            const a = Math.random() * Math.PI * 2, r0 = w * 0.18, r1 = w * rand(0.36, 0.49);
            c.strokeStyle = 'rgba(15,12,10,0.45)'; c.lineWidth = rand(2, 5);
            c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0); c.lineTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1); c.stroke();
        }
    });
    return scorchTex;
}
function add(o, update, dispose) { scene.add(o); fx.push({ o, t: 0, update, dispose }); }

export function explode(pos) {
    G.blasts = (G.blasts || 0) + 1;
    const R = GRENADE.radius;
    const floor = Math.max(groundAt(G.world.solids, pos.x, pos.z, pos.y + 0.5), pos.y - 3);
    // ses ve sarsıntı (oyuncuya yakınlığa göre)
    playSfx('boom', { vol: 1, rate: 0.85 }); playSfx('boom', { vol: 0.6, rate: 0.5 });
    const pd = G.player ? G.player.pos.distanceTo(pos) : 99;
    addTrauma(clamp(1 - pd / 16, 0.15, 0.85)); G.hitStop = Math.max(G.hitStop || 0, 0.05);
    // ışık parlaması
    const light = new THREE.PointLight('#fb923c', 90, R * 4, 1.6); light.position.copy(pos).setY(pos.y + 1);
    add(light, (f) => { light.intensity = 90 * Math.max(0, 1 - f.t / 0.35); return f.t > 0.35; });
    // ateş topu: sarı-beyaz çekirdek + turuncu kabuk, hızla büyür ve söner
    const fire = new THREE.Group(); fire.position.copy(pos);
    const shell = new THREE.Mesh(GEO.ball, new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    const core = new THREE.Mesh(GEO.ball, new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }));
    fire.add(shell, core);
    add(fire, (f) => {
        const k = Math.min(1, f.t / 0.22);
        shell.scale.setScalar(0.3 + R * 0.62 * (1 - (1 - k) * (1 - k)));
        core.scale.setScalar(shell.scale.x * 0.6 * Math.max(0, 1 - f.t / 0.3));
        shell.material.opacity = 0.9 * Math.max(0, 1 - f.t / 0.5);
        core.material.opacity = Math.max(0, 1 - f.t / 0.28);
        fire.position.y = pos.y + f.t * 2;
        return f.t > 0.5;
    }, () => { shell.material.dispose(); core.material.dispose(); });
    // şok halkası yerde
    const ring = new THREE.Mesh(GEO.shock, new THREE.MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pos.x, floor + 0.06, pos.z);
    add(ring, (f) => { const k = f.t / 0.45; ring.scale.setScalar(0.5 + R * 1.35 * k); ring.material.opacity = 0.85 * Math.max(0, 1 - k); return k >= 1; }, () => ring.material.dispose());
    // duman: koyu gri toplar yükselir, büyür, kaybolur
    for (let i = 0; i < 9; i++) {
        const sm = new THREE.Mesh(GEO.puff, new THREE.MeshLambertMaterial({ color: i % 3 ? '#57534e' : '#292524', transparent: true, opacity: 0.8, depthWrite: false, flatShading: true }));
        const a = i / 9 * Math.PI * 2, r = rand(0.3, 1.4);
        sm.position.set(pos.x + Math.cos(a) * r, floor + rand(0.3, 1.2), pos.z + Math.sin(a) * r);
        const vy = rand(1.2, 2.6), vx = Math.cos(a) * rand(0.4, 1.2), vz = Math.sin(a) * rand(0.4, 1.2), s0 = rand(0.5, 0.9), life = rand(1.4, 2.2), delay = 0.08 + i * 0.015;
        sm.scale.setScalar(0.01);
        add(sm, (f, dt) => {
            const t = f.t - delay; if (t < 0) return false;
            sm.position.x += vx * dt; sm.position.y += vy * dt; sm.position.z += vz * dt;
            sm.scale.setScalar(s0 + t * 1.1); sm.rotation.y += 0.02;
            sm.material.opacity = 0.8 * Math.max(0, 1 - t / life);
            return t > life;
        }, () => sm.material.dispose());
    }
    // kurum izi (5 sn durur, 2 sn'de silinir)
    const sc = new THREE.Mesh(GEO.disc, new THREE.MeshBasicMaterial({ map: scorch(), transparent: true, depthWrite: false, opacity: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
    sc.rotation.x = -Math.PI / 2; sc.rotation.z = Math.random() * 6; sc.position.set(pos.x, floor + 0.03, pos.z); sc.scale.setScalar(R * 0.55);
    add(sc, (f) => { sc.material.opacity = f.t < 5 ? 1 : Math.max(0, 1 - (f.t - 5) / 2); return f.t > 7; }, () => sc.material.dispose());
    // parçacıklar: kıvılcım, moloz, toz
    const c = pos.clone().setY(floor + 0.4);
    burst(c, { n: 18, color: ['#fde047', '#fb923c', '#f97316'], speed: 10, up: 8, size: 0.09, life: 0.5, gravity: 14 });
    burst(c, { n: 14, color: ['#44403c', '#57534e', '#78716c'], speed: 7, up: 9, size: 0.2, life: 1.1, gravity: 20 });
    burst(c, { n: 10, color: ['#d6d3d1', '#a8a29e'], speed: 4, up: 2, size: 0.28, life: 0.8, gravity: 3 });
    spawnFx('boom', pos.clone().setY(floor), 2.4);
    floatText('BOOM!', pos.clone().setY(floor + 2.6), '#fb923c', 0.7, 1);
    // hasar: yarıçaptaki düşmanlar (Duran Adam kıpırdamaz)
    let n = 0;
    for (const e of G.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z), dy = Math.abs(e.pos.y + 0.9 - pos.y);
        if (d < R && dy < R * 0.7) { e.hurtT = 0; const was = e.dead; damageEnemy(e, 8, 'blast'); if (!was && e.dead) n++; }
    }
    if (n >= 2) floatText(`${n}'Lİ KOMBO!`, pos.clone().setY(floor + 3.4), '#fde047', 0.6, 1.4);
    G.onBlast && G.onBlast(pos, R);
    // oyuncuyu iter (hasar vermez)
    const p = G.player;
    if (p && !p.dead && pd < R * 0.7) {
        const dx = p.pos.x - pos.x, dz = p.pos.z - pos.z, d = Math.max(0.3, Math.hypot(dx, dz)), k = (1 - pd / (R * 0.7)) * 9;
        p.vel.x += dx / d * k; p.vel.z += dz / d * k; if (p.grounded) { p.vel.y = Math.max(p.vel.y, 4 * (k / 9) + 1); p.grounded = false; }
    }
}
