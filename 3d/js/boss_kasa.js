// HIRHIZ 3D — 3. bölüm canavarı DEV ÇELİK KASA ("Paraları Sıfırla").
// Ağır ağır sekerek oyuncuya gelir. Kapağı kapalıyken ZIRHLI: balyoz, rüşvet ve üstüne zıplamak işlemez.
// Saldırırken kapağı gıcırdayarak açılır (içinde para desteleri, altın külçeler):
//   DOLAR YELPAZESİ: kavisli 5 dolar destesi (biraz sonra ikinci yelpaze)
//   SIFIRLA!: üstteki sayaç sıfırlanır (sıfırlama sesi), oyuncunun çevresine gökten dolar yağar (kalkan yukarıdan da korur)
// Saldırıdan sonra kapak bir süre AÇIK kalır: o sırada balyoz (1), kapaktan içeri rüşvet (1) ya da üstüne zıplamak (2) işler.
import * as THREE from 'three';
import { G, diff, addScore, toast } from './state.js?v=12';
import { hurtPlayer, shieldBlocks, blockFx, bouncePlayer } from './player.js?v=12';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=12';
import { playSfx } from './audio.js?v=12';
import { groundAt } from './physics.js?v=12';
import { box, mat, canvasTex, angDiff, dampAngle, clamp, rand } from './util.js?v=12';
import { ARENA } from './world.js?v=12';
import { throwLob, hitsPlayer, killProj } from './enemies.js?v=12';
import { showBossBar, setBossBar } from './boss_core.js?v=12';

const HX = 1.1, HZ = 0.8, TOP = 2.4;          // gövdenin yarı eni, yarı derinliği, tepe yüksekliği
const OPEN_T = 0.57, EXPOSED_T = 1.9, RESET_T = 0.85;

// Kasa modeli: önü açık bir çelik kutu (içinde raflar), menteşeli kapak, üstte kızgın gözler ve sayaç
function buildKasa() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const steel = mat('#94a3b8'), dark = mat('#475569');
    const add = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; body.add(b); return b; };
    add(2.2, 2.15, 0.15, steel, 0, 1.325, -0.725);                 // arka
    add(0.15, 2.15, 1.6, steel, -1.025, 1.325, 0); add(0.15, 2.15, 1.6, steel, 1.025, 1.325, 0);   // yanlar
    add(2.2, 0.15, 1.6, steel, 0, 0.325, 0);                        // taban
    add(2.2, 0.5, 1.6, mat('#cbd5e1'), 0, 2.15, 0);                 // üst bant
    add(2.2, 0.06, 1.6, dark, 0, 1.88, 0);
    // İçi: raflarda para desteleri ve altın külçeler, sıcak ışık
    add(1.9, 1.5, 0.02, mat('#1e293b'), 0, 1.15, -0.64);
    add(1.9, 0.05, 1.3, dark, 0, 1.15, -0.05);
    for (let i = 0; i < 4; i++) { add(0.36, 0.22, 0.5, mat('#16a34a'), -0.66 + i * 0.44, 1.29, -0.2); add(0.36, 0.05, 0.5, mat('#86efac'), -0.66 + i * 0.44, 1.32, -0.2); }
    for (let i = 0; i < 3; i++) add(0.46, 0.2, 0.42, mat('#eab308'), -0.55 + i * 0.55, 0.5, -0.2);
    // sıcak ışıltı (ışık kaynağı yerine saydam levha: telefonda sahne yeniden derlenmesin)
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5), new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0, depthWrite: false }));
    glow.position.set(0, 1.15, 0.5); body.add(glow);
    // Kapak: sol kenardaki menteşeden açılır; üstünde şifre çarkı ve kol
    const hinge = new THREE.Group(); hinge.position.set(-0.95, 1.15, 0.8); body.add(hinge);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.5, 0.12), mat('#7b8794')); door.position.set(0.95, 0, 0); door.castShadow = true; hinge.add(door);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16), mat('#e2e8f0')); dial.rotation.x = Math.PI / 2; dial.position.set(0.95, 0, 0.1); hinge.add(dial);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; dial.add(box(0.03, 0.02, 0.07, '#334155', Math.cos(a) * 0.24, 0.05, Math.sin(a) * 0.24, false)); }   // çarkın çentikleri
    hinge.add(box(0.36, 0.12, 0.1, '#334155', 1.5, 0, 0.12));
    [0.5, -0.5].forEach(y => body.add(box(0.1, 0.3, 0.1, '#1e293b', -1.0, 1.15 + y, 0.82)));   // menteşeler
    // Gözler + kaşlar
    const eyes = [], brows = [];
    [-1, 1].forEach(s => {
        const w = box(0.42, 0.26, 0.04, '#ffffff', s * 0.62, 2.18, 0.81, false); body.add(w);
        const pu = box(0.13, 0.13, 0.03, '#111111', s * 0.62, 2.16, 0.835, false); body.add(pu); eyes.push(pu);
        const br = box(0.46, 0.07, 0.04, '#111111', s * 0.62, 2.36, 0.83, false); br.rotation.z = s * 0.25; body.add(br); brows.push(br);
    });
    // Sayaç (yeşil rakamlar)
    const cc = document.createElement('canvas'); cc.width = 192; cc.height = 64;
    const ctex = new THREE.CanvasTexture(cc); ctex.colorSpace = THREE.SRGBColorSpace;
    const counter = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.22), new THREE.MeshBasicMaterial({ map: ctex }));
    counter.position.set(0, 2.18, 0.815); body.add(counter);
    // Ayaklar
    [-0.7, 0.7].forEach(x => { const l = box(0.4, 0.28, 0.5, '#1f2937', x, 0.12, 0); root.add(l); });
    return { root, body, hinge, dial, glow, eyes, brows, cc, ctex };
}
function drawCounter(m, n, color) {
    const g = m.cc.getContext('2d');
    g.fillStyle = '#052e16'; g.fillRect(0, 0, 192, 64);
    g.fillStyle = color; g.font = 'bold 44px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(Math.floor(n) % 1000000).padStart(6, '0'), 96, 34);
    m.ctex.needsUpdate = true;
}

export function spawnKasa(scene, pos) {
    const m = buildKasa();
    m.root.position.copy(pos); scene.add(m.root);
    const hp = Math.max(6, Math.round(12 * diff().boss));
    const b = {
        m, root: m.root, pos: m.root.position, name: 'DEV ÇELİK KASA', hp, maxHp: hp, dead: false, deadT: 0,
        facing: 0, st: 'walk', t: 0, timer: 1.2, attacks: 0, door: 0, count: 0, hop: 0, hurtT: 0, rage: false, said: 0, cTimer: 0,
        update: dt => update(b, dt),
        hitTest: pt => { const l = toLocal(b, pt); return Math.abs(l.x) < HX && Math.abs(l.z) < HZ && pt.y > b.pos.y && pt.y < b.pos.y + TOP; },
        onHammer: point => hit(b, 1, point, 'hammer'),
        onAmmo: p => {   // rüşvet ancak açık kapaktan içeri girerse işler
            const front = Math.abs(angDiff(b.facing, Math.atan2(-p.vel.x, -p.vel.z))) < 1.1;
            if (armored(b) || !front) { closedMsg(b); playSfx('hit', { rate: 1.6, vol: 0.4 }); return; }
            hit(b, 1, p.pos, 'ammo');
        },
        reset: () => { b.hp = b.maxHp; b.pos.set(0, 0, -218); b.st = 'walk'; b.timer = 1.5; b.door = 0; b.rage = false; setBossBar(b); }
    };
    toast('BÖLÜM SONU CANAVARI: DEV ÇELİK KASA!', 2600, '#fca5a5');
    floatText('SIFIRLAAA!', pos.clone().setY(TOP + 1), '#4ade80', 0.7, 2);
    floatText('KAPAĞI AÇILINCA VUR!', pos.clone().setY(TOP + 0.4), '#fde047', 0.45, 2.6);
    G.boss = b;
    showBossBar(b);
    playSfx('boom', { rate: 0.6, vol: 0.4 });
    return b;
}

const armored = b => !(b.door >= 0.6);
function closedMsg(b) {
    if (G.time - b.said < 0.9) return;
    b.said = G.time;
    floatText('KAPAK KAPALI! AÇILINCA VUR!', b.pos.clone().setY(TOP + 0.6), '#fde047', 0.45);
}
function toLocal(b, pt) {
    const dx = pt.x - b.pos.x, dz = pt.z - b.pos.z, c = Math.cos(-b.facing), s = Math.sin(-b.facing);
    return { x: dx * c + dz * s, z: -dx * s + dz * c };
}

function update(b, dt) {
    const p = G.player, m = b.m, S = diff();
    if (b.hurtT > 0) b.hurtT -= dt;
    // Sayaç: hızla artar, sıfırlarken erir
    b.count = b.st === 'reset' ? b.count * Math.pow(0.02, dt) : b.count + 82000 * dt;
    if ((b.cTimer -= dt) <= 0) { b.cTimer = 0.08; drawCounter(m, b.count, b.st === 'reset' ? '#fde047' : '#4ade80'); }
    if (b.dead) {
        b.deadT += dt;
        if (b.deadT > 2.6 && !b.reported) { b.reported = true; G.onBossDefeated && G.onBossDefeated(); }
        m.hinge.rotation.y = Math.min(2.4, m.hinge.rotation.y + dt * 4);
        m.body.rotation.z = Math.min(0.15, b.deadT * 0.2);
        if (Math.random() < dt * 8) burst(b.pos.clone().setY(2.6), { n: 2, color: ['#57534e', '#a8a29e'], speed: 0.6, up: 3, gravity: -1, size: 0.3, life: 1.2 });
        return;
    }
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, d = Math.hypot(dx, dz), toP = Math.atan2(dx, dz);
    b.facing = dampAngle(b.facing, toP, b.st === 'walk' ? 2.5 : 4, dt);
    b.t -= dt;
    let shake = 0;
    if (b.st === 'walk') {
        b.door += (0 - b.door) * Math.min(1, dt * 12);
        if (d > 3) {   // ağır ağır sekerek yürür
            b.hop += dt * 8.4;
            const sp = 1.1 * S.speed * (b.rage ? 1.3 : 1);
            b.pos.x = clamp(b.pos.x + Math.sin(toP) * sp * dt, -ARENA.hw + 1.5, ARENA.hw - 1.5);
            b.pos.z = clamp(b.pos.z + Math.cos(toP) * sp * dt, ARENA.z1 + 1.5, ARENA.z0 - 1.5);
        }
        b.timer -= dt;
        if (!p.dead && d < 30 && b.timer <= 0) {
            b.attacks++; b.next = b.attacks % 2 ? 'volley' : 'reset';
            b.st = 'open'; b.t = OPEN_T;
            playSfx('hit', { rate: 0.35, vol: 0.5 });   // gıcırtı
        }
    } else if (b.st === 'open') {   // kapak açılır
        b.door = Math.min(1, b.door + dt / OPEN_T); shake = 0.04;
        if (b.t <= 0) {
            if (b.next === 'volley') { volley(b); b.st = 'exposed'; b.t = EXPOSED_T; b.volley2 = 0.47; }
            else {
                b.st = 'reset'; b.t = RESET_T;
                floatText('SIFIRLA!', b.pos.clone().setY(TOP + 0.8), '#4ade80', 0.8, 1.4);
                playSfx('sifirla', { vol: 0.9 });
                moneyRain();
            }
        }
    } else if (b.st === 'reset') {
        shake = 0.05;
        if (b.t <= 0) { b.st = 'exposed'; b.t = EXPOSED_T; }
    } else if (b.st === 'exposed') {   // kapak açık: vurulabilir
        if (b.volley2 > 0 && (b.volley2 -= dt) <= 0) volley(b);
        if (b.t <= 0) { b.st = 'walk'; b.timer = (b.rage ? 1.0 : 1.6) * S.fire; }
    }
    // Görünüm
    m.root.rotation.y = b.facing;
    m.body.position.y = b.st === 'walk' && d > 3 ? Math.abs(Math.sin(b.hop)) * 0.18 : 0;
    m.body.position.x = shake ? (Math.random() - 0.5) * shake * 2 : 0;
    m.hinge.rotation.y = -b.door * 1.75;
    m.dial.rotation.y = G.time * 2 + b.door * 6;
    m.glow.material.opacity = b.door * 0.28;
    const look = clamp(Math.sin(angDiff(b.facing, toP)) * 0.06, -0.06, 0.06);
    m.eyes.forEach((e, i) => { e.position.x = (i ? 0.62 : -0.62) + look; });
    const angry = b.st !== 'walk' || b.rage;
    m.brows.forEach((br, i) => { br.rotation.z = (i ? 1 : -1) * (angry ? -0.35 : 0.15); });
    m.root.visible = !(b.hurtT > 0 && Math.floor(b.hurtT * 14) % 2 === 0);

    // Oyuncuyla temas: üstüne iner ya da yandan çarpar
    const l = toLocal(b, p.pos), r = p.r;
    if (!p.dead && Math.abs(l.x) < HX + r && Math.abs(l.z) < HZ + r && p.pos.y < b.pos.y + TOP + 0.05 && p.pos.y + p.h > 0.2) {
        if (p.pos.y > TOP - 0.6 && p.vel.y <= 0.5) {
            bouncePlayer(13);
            if (armored(b)) { closedMsg(b); playSfx('hit', { rate: 1.3, vol: 0.5 }); } else hit(b, 2, p.pos.clone(), 'stomp');
        } else {
            const px = HX + r - Math.abs(l.x), pz = HZ + r - Math.abs(l.z), c = Math.cos(b.facing), s = Math.sin(b.facing);
            const ox = px < pz ? Math.sign(l.x) * (px + 0.02) : 0, oz = px < pz ? 0 : Math.sign(l.z) * (pz + 0.02);
            p.pos.x += ox * c + oz * s; p.pos.z += -ox * s + oz * c;
            if (b.st === 'walk' && d > 1) hurtPlayer(b.pos, { knock: 8 });
        }
    }
}

// Hasar: yalnızca kapak açıkken
function hit(b, n, point, how) {
    if (b.dead) return;
    if (armored(b)) { closedMsg(b); playSfx('hit', { rate: 1.4, vol: 0.5 }); spawnFx('hit', point.clone(), 0.9); return; }
    if (b.hurtT > 0 && how !== 'ammo') return;
    b.hp -= n; b.hurtT = how === 'ammo' ? 0.15 : 0.45;
    setBossBar(b);
    playSfx('hit', { rate: 0.8, vol: 0.9 }); addTrauma(how === 'ammo' ? 0.1 : 0.4); if (how !== 'ammo') G.hitStop = 0.08;
    spawnFx('pow', b.pos.clone().setY(1.6), 1.3);
    burst(b.pos.clone().setY(1.4), { n: 10, color: ['#16a34a', '#eab308', '#cbd5e1'], speed: 4, up: 4 });
    if (!b.rage && b.hp <= b.maxHp / 2) { b.rage = true; floatText('KASA ÖFKELENDİ!', b.pos.clone().setY(TOP + 1), '#ef4444', 0.6, 1.6); }
    if (b.hp <= 0) defeat(b);
}
function defeat(b) {
    b.dead = true; b.deadT = 0;
    addScore(20000);
    spawnFx('boom', b.pos.clone().setY(0.2), 2.4);
    spawnFx('confetti', b.pos.clone().setY(3.5).add(new THREE.Vector3(-2, 0, 0)), 2, 0.3);
    spawnFx('confetti', b.pos.clone().setY(3.5).add(new THREE.Vector3(2, 0, 0)), 2, 0.6);
    burst(b.pos.clone().setY(1.5), { n: 34, color: ['#16a34a', '#22c55e', '#eab308', '#94a3b8'], speed: 7, up: 8, size: 0.2, life: 1.3 });
    playSfx('boom', { vol: 0.9 }); addTrauma(0.9);
    floatText('KASA BOŞALDI!', b.pos.clone().setY(4.5), '#fde047', 0.8, 2.5);
    G.projectiles.forEach(p => { if (p.type === 'dollar' || p.type === 'rain') p.life = 0; });
}

// --- DOLARLAR ---
let billTex = null;
function bill() {
    billTex = billTex || canvasTex(64, 28, (g) => {
        g.fillStyle = '#15803d'; g.fillRect(0, 0, 64, 28); g.fillStyle = '#bbf7d0'; g.fillRect(3, 3, 58, 22);
        g.fillStyle = '#166534'; g.font = 'bold 18px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 32, 15);
    }, { pixel: true });
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.19), new THREE.MeshLambertMaterial({ map: billTex, side: THREE.DoubleSide }));
        m.position.set(rand(-0.05, 0.05), i * 0.03, rand(-0.05, 0.05)); m.rotation.x = -Math.PI / 2 + rand(-0.3, 0.3); g.add(m);
    }
    return g;
}
// Kavisli dolar yelpazesi: oyuncunun çevresine beş deste
function volley(b) {
    const p = G.player;
    const from = b.pos.clone().add(new THREE.Vector3(Math.sin(b.facing) * 0.9, 1.4, Math.cos(b.facing) * 0.9));
    const toP = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z), d = Math.max(3, Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z));
    [-0.5, -0.25, 0, 0.25, 0.5].forEach(a => {
        const to = new THREE.Vector3(b.pos.x + Math.sin(toP + a) * d, p.pos.y, b.pos.z + Math.cos(toP + a) * d);
        throwLob(from, bill(), { type: 'dollar', to, lead: a === 0 ? 0.5 : 0, g: 16 });
    });
    playSfx('hit', { rate: 2.2, vol: 0.5 });
    burst(from, { n: 8, color: ['#22c55e', '#16a34a'], speed: 3, up: 2, size: 0.12 });
}
// "SIFIRLA!": gökten oyuncunun çevresine dolar yağar, yaprak gibi süzülür
function moneyRain() {
    const p = G.player;
    for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + rand(-0.3, 0.3), r = i === 0 ? 0 : rand(1.2, 4.5);
        const m = bill(); m.position.set(p.pos.x + Math.cos(a) * r, 8 + rand(0, 3), p.pos.z + Math.sin(a) * r);
        G.scene.add(m);
        G.projectiles.push({ type: 'rain', mesh: m, pos: m.position, vel: new THREE.Vector3(0, -2.4, 0), life: 7, ownGeo: false, ph: rand(0, 6), update: updateRain });
    }
}
function updateRain(pr, dt) {
    pr.ph += dt * 3;
    pr.pos.x += Math.sin(pr.ph) * 1.2 * dt; pr.pos.z += Math.cos(pr.ph * 0.7) * 0.8 * dt; pr.pos.y += pr.vel.y * dt;
    pr.mesh.rotation.z = Math.sin(pr.ph) * 0.6; pr.mesh.rotation.y += dt * 2;
    if (hitsPlayer(pr, 0.5)) {
        if (shieldBlocks(pr.pos, pr.vel)) blockFx(pr.pos.clone()); else hurtPlayer(pr.pos, { knock: 3 });
        killProj(pr); return;
    }
    const g = groundAt(G.world.solids, pr.pos.x, pr.pos.z, pr.pos.y + 0.3);
    if (pr.pos.y <= g + 0.05) { burst(pr.pos, { n: 3, color: '#22c55e', speed: 1, up: 1, size: 0.08 }); killProj(pr); }
}
