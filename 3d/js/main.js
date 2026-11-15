// HIRHIZ 3D — ana döngü, kamera, ışık, bölüm yükleme, oyun akışı, menüler
import * as THREE from 'three';
import { G, DIFFS, diff, addScore, toast } from './state.js?v=18';
import { initInput, pollInput, consumePresses, clearAll, input, releasePointer } from './input.js?v=18';
import { buildWorld, updateWorld, ARENA, makeBag } from './world.js?v=18';
import { createPlayer, resetPlayer, updatePlayer, updateHearts, addCollected, faceCamera, hurtPlayer } from './player.js?v=18';
import { spawnEnemies, clearEnemies, updateEnemies, hammerHit, throwAmmo } from './enemies.js?v=18';
import { updateHazards, clearHazards } from './hazards.js?v=18';
import { updateBoss, removeBoss } from './boss_core.js?v=18';
import { initFx, updateFx, clearFx, spawnFx, burst, floatText, shake, addTrauma } from './fx.js?v=18';
import { unlockAudio, playSfx, playMusic, stopMusic, isMuted, setMuted } from './audio.js?v=18';
import { damp, angDiff, clamp, canvasTex } from './util.js?v=18';
import { initGrenades, updateGrenades, clearGrenades, resetGrenadeStock } from './grenade.js?v=18';
import { groundAt } from './physics.js?v=18';
import { LEVEL1 } from './level1.js?v=18';
import { LEVEL2 } from './level2.js?v=18';
import { LEVEL3 } from './level3.js?v=18';
import { LEVEL4 } from './level4.js?v=18';
import { LEVEL5 } from './level5.js?v=18';
import { LEVEL6 } from './level6.js?v=18';
import { LEVEL7 } from './level7.js?v=18';
import { LEVEL8 } from './level8.js?v=18';
import { LEVEL9 } from './level9.js?v=18';
import { LEVEL10 } from './level10.js?v=18';

const LEVELS = { 1: LEVEL1, 2: LEVEL2, 3: LEVEL3, 4: LEVEL4, 5: LEVEL5, 6: LEVEL6, 7: LEVEL7, 8: LEVEL8, 9: LEVEL9, 10: LEVEL10 };
const MAX_LEVEL = 10;
const $ = id => document.getElementById(id);
const START = new THREE.Vector3(0, 0, 7);
const touchDevice = matchMedia('(pointer: coarse)').matches;

// --- GÖRÜNTÜ ---
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, touchDevice ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 150);
G.camera = camera;
let scene = null, sun = null;

function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 75 : 60;   // dik tutulan telefonda biraz geniş açı
    camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();
initInput(canvas, () => G.state === "play");

// --- BÖLÜM YÜKLEME: her bölüm kendi sahnesini kurar (gökyüzü, ışık, dünya) ---
let player = null;
function loadLevel(id) {
    const L = LEVELS[id];
    if (scene) { clearEnemies(scene); removeBoss(scene); clearFx(); clearHazards(); clearGrenades(); if (G.outro) { G.outro.remove(); G.outro = null; } disposeScene(scene); }
    scene = new THREE.Scene();
    G.scene = scene; G.level = L;
    scene.background = canvasTex(4, 256, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, L.sky[0]); gr.addColorStop(0.55, L.sky[1]); gr.addColorStop(1, L.sky[2]);
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    scene.fog = new THREE.Fog(L.fog, 40, 130);
    scene.add(new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));
    sun = new THREE.DirectionalLight(L.sun[0], L.sun[1]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(touchDevice ? 1024 : 2048, touchDevice ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
    scene.add(sun, sun.target);
    initFx(scene); initGrenades(scene);
    // Özel bölümler (L.mode: 6 uçuş, 7 bulmaca) kendi dünyasını kurar, oyuncuyu, kamerayı ve akışı kendisi yönetir
    G.world = L.mode ? L.mode.build(scene, L) : buildWorld(scene, L);
    if (!player) player = createPlayer(scene); else scene.add(player.m.root);
    document.body.classList.toggle('mode-flight', !!L.mode && L.mode.kind === 'flight');
    document.body.classList.toggle('mode-puzzle', !!L.mode && L.mode.kind === 'puzzle');
    $('b-bribe').innerHTML = `<b>□</b>${L.ammoName}`;
    $('collect-ico').textContent = L.collect.icon;
}
// Eski sahnenin GPU kaynaklarını bırak (oyuncu modeli yeni sahneye taşındığı için ona dokunulmaz)
function disposeScene(sc) {
    if (player) sc.remove(player.m.root);
    sc.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        ms.forEach(m => { if (m.map && m.map.isCanvasTexture) m.map.dispose(); });
    });
    if (sc.background && sc.background.dispose) sc.background.dispose();
}

// --- KAMERA: oyuncunun arkasında, sürükleyerek döner; hareket ederken yavaşça arkaya geçer ---
const cam = { yaw: 0, pitch: 0.32, dist: 7.2, target: new THREE.Vector3(), idle: 0 };
function updateCamera(dt) {
    const p = G.player;
    if (G.level.mode) { G.level.mode.camera(camera, dt); input.camDX = input.camDY = 0; applyShake(); return; }
    const sens = input.touch ? 0.0045 : 0.0028;
    if (G.state === 'play' || G.state === 'dead') {
        cam.yaw -= input.camDX * sens;
        cam.pitch = clamp(cam.pitch + input.camDY * sens * 0.8, -0.15, 1.15);
    }
    if (input.camDX || input.camDY) cam.idle = 0; else cam.idle += dt;
    input.camDX = input.camDY = 0;
    // Otomatik takip: bir süre kameraya dokunulmazsa, yürürken arkasına geçer (karşıya yürürken dönmez)
    const speed = Math.hypot(p.vel.x, p.vel.z);
    if (G.state === 'play' && cam.idle > 1.0 && speed > 2 && !p.shield) {
        const behind = p.facing + Math.PI, d = angDiff(cam.yaw, behind);
        if (Math.abs(d) < 2.3) cam.yaw += d * (1 - Math.exp(-1.4 * dt));
    }
    if (G.state === 'menu') cam.yaw += dt * 0.15;
    const want = G.boss && !G.boss.dead ? 9.5 : 7.2;
    cam.dist = damp(cam.dist, want, 2, dt);
    const tx = p.pos.x, ty = Math.max(p.pos.y, -2) + 1.6, tz = p.pos.z;
    cam.target.x = damp(cam.target.x, tx, 14, dt);
    cam.target.z = damp(cam.target.z, tz, 14, dt);
    cam.target.y = damp(cam.target.y, ty, 6, dt);
    const cp = Math.cos(cam.pitch);
    // Bilgisayarda omuz üstü kamera (karakter biraz solda, ortadaki nişangâh boş kalsın)
    cam.shoulder = damp(cam.shoulder || 0, input.touch ? 0 : 0.75, 6, dt);
    const sx = Math.cos(cam.yaw) * cam.shoulder, sz = -Math.sin(cam.yaw) * cam.shoulder;
    camera.position.set(
        cam.target.x + sx + Math.sin(cam.yaw) * cp * cam.dist,
        cam.target.y + Math.sin(cam.pitch) * cam.dist,
        cam.target.z + sz + Math.cos(cam.yaw) * cp * cam.dist);
    // Zeminin altına inmesin
    const gy = groundAt(G.world.solids, camera.position.x, camera.position.z, camera.position.y + 1);
    if (camera.position.y < gy + 0.4) camera.position.y = gy + 0.4;
    camera.lookAt(cam.target.x + sx, cam.target.y, cam.target.z + sz);
    applyShake();
    // Güneş oyuncuyu izler (gölgeler keskin kalsın)
    sun.position.set(p.pos.x + 10, p.pos.y + 24, p.pos.z + 8);
    sun.target.position.set(p.pos.x, p.pos.y, p.pos.z - 3);
}

// Sarsıntı (travma karesi kadar)
function applyShake() {
    const s = shake.trauma * shake.trauma;
    if (s > 0) {
        const t = performance.now() / 1000;
        camera.rotation.z += Math.sin(t * 37) * 0.04 * s;
        camera.position.x += Math.sin(t * 53) * 0.25 * s; camera.position.y += Math.sin(t * 61 + 1) * 0.2 * s;
    }
}

// --- OLAYLAR ---
G.onHammer = (point, p) => {
    hammerHit(point, p);
    for (const b of G.world.bricks) {   // tuğlalar
        if (b.broken) continue;
        const c = b.mesh.position;
        if (Math.abs(c.x - point.x) < 1.1 && Math.abs(c.z - point.z) < 1.1 && point.y + 1.2 > b.aabb.min.y && point.y - 0.6 < b.aabb.max.y) breakBrick(b);
    }
    const B = G.boss;
    if (B && !B.dead && B.onHammer && (B.hitTest(point.clone().setY(1.2)) || Math.hypot(point.x - B.pos.x, point.z - B.pos.z) < 1.2)) B.onHammer(point);
};
// El bombası patlaması: yarıçaptaki tuğlalar kırılır, canavar hasar alır (onBlast yoksa balyoz darbesi gibi)
G.onBlast = (pos, R) => {
    for (const b of G.world.bricks) if (!b.broken && b.mesh.position.distanceTo(pos) < R * 0.8) breakBrick(b);
    const B = G.boss;
    if (B && !B.dead && Math.hypot(pos.x - B.pos.x, pos.z - B.pos.z) < R + 1.5 && Math.abs(pos.y - B.pos.y) < R + 2) {
        const pt = B.pos.clone().setY(B.pos.y + 1.2);
        if (B.onBlast) B.onBlast(pt); else if (B.onHammer) B.onHammer(pt);
    }
};
G.onBrickHit = (aabb) => { const b = G.world.bricks.find(b => b.aabb === aabb); if (b) breakBrick(b); };
function breakBrick(b) {
    if (b.broken) return;
    b.broken = true; b.mesh.visible = false; b.aabb.active = false;
    burst(b.mesh.position, { n: 12, color: b.gold ? ['#facc15', '#ca8a04'] : ['#b45309', '#9a3412', '#7c2d12'], speed: 4, up: 5, size: 0.22, life: 0.9 });
    playSfx('hit', { rate: 0.9, vol: 0.5 }); addTrauma(0.12);
    addScore(500); updateHud();
    if (b.gold) {   // içinden kul hakkı torbası çıkar
        const g = makeBag(); g.position.copy(b.mesh.position).setY(b.aabb.min.y - 0.2); scene.add(g);
        G.world.items.push({ kind: 'bag', mesh: g, pos: g.position, baseY: g.position.y, taken: false, temp: true });
    }
}
G.onThrow = (from, dir) => throwAmmo(from, dir);
// Nişan: bilgisayarda ekranın ortasındaki nişangâhtan çıkan ışının ilk çarptığı yer;
// telefonda karakterin önündeki (±40°, 26 m) en yakın düşman, yoksa düz ileri
const ray = new THREE.Ray(), box3 = new THREE.Box3(), hitV = new THREE.Vector3(), camDir = new THREE.Vector3();
G.aimTarget = (p) => {
    if (input.touch) {
        let best = null, bd = 26;
        for (const e of G.enemies) {
            if (e.dead || e.kind === 'duran' || !e.m.root.visible) continue;
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d < bd && Math.abs(angDiff(p.facing, Math.atan2(dx, dz))) < 0.7 && Math.abs(e.pos.y - p.pos.y) < 4) { bd = d; best = e; }
        }
        if (best) return best.pos.clone().setY(best.pos.y + (best.T.height || 1.9) * 0.6);
        const B = G.boss;   // canavar da hedef olabilir
        if (B && !B.dead) {
            const dx = B.pos.x - p.pos.x, dz = B.pos.z - p.pos.z;
            if (Math.hypot(dx, dz) < 30 && Math.abs(angDiff(p.facing, Math.atan2(dx, dz))) < 0.8) return B.pos.clone().setY(B.pos.y + 1.3);
        }
        return new THREE.Vector3(p.pos.x + Math.sin(p.facing) * 15, p.pos.y + 1.4, p.pos.z + Math.cos(p.facing) * 15);
    }
    camera.getWorldDirection(camDir);
    ray.set(camera.position, camDir);
    const minD = camera.position.distanceTo(p.pos) * 0.8;
    let best = 80, pt = null;
    const test = () => {
        if (ray.intersectBox(box3, hitV)) { const d = hitV.distanceTo(camera.position); if (d > minD && d < best) { best = d; pt = hitV.clone(); } }
    };
    for (const e of G.enemies) {
        if (e.dead || !e.m.root.visible) continue;
        box3.min.set(e.pos.x - 0.45, e.pos.y, e.pos.z - 0.45); box3.max.set(e.pos.x + 0.45, e.pos.y + (e.T.height || 1.95), e.pos.z + 0.45); test();
    }
    for (const a of G.world.solids) { if (!a.active || a.type === 'wall') continue; box3.min.copy(a.min); box3.max.copy(a.max); test(); }
    if (G.boss && !G.boss.dead) { box3.setFromObject(G.boss.root); test(); }
    return pt || camera.position.clone().addScaledVector(camDir, 60);
};
// Mermi isabet edince nişangâh bir an kızarır
let crossTimer = null;
G.onAmmoHit = (real) => {
    const c = $('cross'); c.classList.add(real ? 'hit' : 'tink');
    clearTimeout(crossTimer); crossTimer = setTimeout(() => c.classList.remove('hit', 'tink'), 140);
};
G.onKill = () => {
    updateHud();
    const left = Math.max(0, G.target - G.kills), bar = G.world.barricade;
    bar.setCount(left);
    if (left === 0 && !bar.open) {
        bar.open = true; bar.aabb.active = false;
        toast(G.level.gateOpen, 3200, '#86efac');
    }
};
G.onPlayerDead = () => {
    playSfx('cry', { rate: 0.8 });
    setTimeout(() => { if (G.state === 'play') { G.state = 'dead'; showPanel('dead'); releasePointer(); } }, 1500);
};
const key = (k) => `hirhiz3d${k}${G.level.id}`;
const getNum = k => { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } };
const setNum = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
G.onBossDefeated = () => {
    if (G.state !== 'play') return;
    if (G.level.outro && !G.outro) { $('boss-bar').hidden = true; G.outro = G.level.outro(scene); return; }   // ör. 3. bölüm: Cengiz gelir, sonra karne
    showWon();
};
G.showWon = () => { if (G.state === 'play') showWon(); };
function showWon() {
    G.state = 'won'; releasePointer(); stopMusic();
    const L = G.level, stars = L.stars ? L.stars() : G.livesLost === 0 ? 3 : G.livesLost <= 1 ? 2 : 1;
    const best = getNum(key('Best')), bestStars = getNum(key('Stars'));
    if (G.score > best) setNum(key('Best'), G.score);
    if (stars > bestStars) setNum(key('Stars'), stars);
    $('won-title').textContent = L.wonTitle; $('won-note').textContent = L.wonNote;
    $('won-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('won-score').textContent = G.score.toLocaleString('tr-TR');
    $('won-detail').textContent = L.wonDetail ? L.wonDetail() : `Yenilen: ${G.kills} · ${L.collect.name}: ${G.collect}/10 · Kaybedilen can: ${G.livesLost} · ${diff().name}`;
    $('won-best').textContent = G.score > best ? 'YENİ REKOR!' : `En iyi: ${Math.max(best, G.score).toLocaleString('tr-TR')}`;
    const next = LEVELS[L.id + 1];
    $('next').hidden = !next; if (next) $('next').textContent = `${L.id + 1}. BÖLÜME GEÇ`;
    $('won-soon').hidden = !!next;
    $('won-soon').textContent = L.id === MAX_LEVEL ? "TEBRİKLER! 3D'deki bütün bölümleri bitirdin." : "Sonraki bölüm 3D'de yakında.";
    showPanel('won');
};

// --- TOPLANANLAR, KONTROL NOKTASI, CANAVAR ---
function updateLevel(dt) {
    const p = G.player, W = G.world, L = G.level;
    for (const it of W.items) {
        if (it.taken) continue;
        const dx = it.pos.x - p.pos.x, dz = it.pos.z - p.pos.z, dy = it.pos.y - p.pos.y;
        if (Math.hypot(dx, dz) < 0.85 && dy > -1.0 && dy < 1.9 && !p.dead) {
            it.taken = true; it.mesh.visible = false;
            spawnFx('collect', it.pos.clone(), 1.4);
            playSfx('coin', { vol: 0.6 });
            const at = it.pos.clone().setY(it.pos.y + 1.4);
            if (it.kind === L.collect.kind) { G.collect++; addScore(5000); addCollected(p); floatText(L.collect.word, at, '#86efac'); if (L.collect.sfx) playSfx(L.collect.sfx, { vol: 0.6 }); }
            else if (it.kind === 'mask') { p.mask = 3; p.m.helmet.visible = true; addScore(1000); floatText('BARET + MASKE!', at, '#fde047'); toast('BARET + MASKE: 3 VURUŞ KORUR, BİBER GAZI İŞLEMEZ', 2400); }
            else if (it.kind === 'heart') { if (p.hp < p.maxHp) { p.hp++; floatText('+1 CAN', at, '#fca5a5'); } else { addScore(5000); floatText('CAN DOLU: +5000', at, '#fde047'); } }
            else if (it.kind === 'bag') { addScore(5000); addCollected(p); floatText('KUL HAKKI!', at, '#fde047'); }
            else if (it.kind === 'charger') { G.battery = Math.min(100, G.battery + 45); addScore(1000); floatText('ŞARJ!', at, '#4ade80'); }
            updateHud(); updateHearts();
        }
    }
    // 5. bölüm: telefonun şarjı azalır (dolu şarj ~55 sn); biterse 1 can gider, %55'ten devam
    if (L.battery && !G.boss && !p.dead) {
        G.battery -= 1.8 * dt;
        if (G.battery <= 0) {
            G.battery = 55;
            floatText('ŞARJ BİTTİ!', p.pos.clone().setY(p.pos.y + 2.4), '#ef4444', 0.6, 1.6);
            hurtPlayer(null, { force: true });
        }
        updateBattery();
    }
    const cp = W.checkpoint;
    if (!cp.reached && p.pos.z < cp.z && !p.dead) {
        cp.reached = true; cp.cloth.material.color.set('#16a34a');
        toast('KONTROL NOKTASI!', 1600, '#86efac');
        spawnFx('collect', new THREE.Vector3(7, 3.5, cp.z), 2);
        playSfx('coin', { rate: 0.8 });
    }
    updateOutro(dt);
    if (W.barricade.open && !G.boss && !G.bossDone && p.pos.z < ARENA.z0 - 3 && !p.dead) {
        L.boss(scene);
        G.bossDone = true;
        $('battery').hidden = true;   // canavar dövüşünde şarj azalmaz (üstteki çubuk canavarın)
        addTrauma(0.3);
    }
}

function updateOutro(dt) { if (G.outro && !G.outro.finished && G.outro.update(dt)) { G.outro.finished = true; showWon(); } }

// --- HUD ---
let batShown = -1;
function updateBattery() {
    const v = Math.max(0, Math.ceil(G.battery));
    if (v === batShown) return;
    batShown = v;
    const fill = $('bat-fill');
    fill.style.width = v + '%';
    fill.style.background = v < 25 ? '#ef4444' : v < 50 ? '#facc15' : '#4ade80';
    $('bat-text').textContent = '%' + v;
    $('battery').classList.toggle('low', v < 25);
}
function updateHud() {
    if (G.level.mode && G.level.mode.hud) { G.level.mode.hud(); }
    $('score').textContent = G.score.toLocaleString('tr-TR');
    $('kills').textContent = `${Math.min(G.kills, G.target)} / ${G.target}`;
    $('fidans').textContent = `${G.collect} / 10`;
    updateGrenadeHud();
}
function updateGrenadeHud() { const n = G.grenades || 0; $('grenades').textContent = '💣'.repeat(n) + '·'.repeat(Math.max(0, 3 - n)); $('b-grenade').classList.toggle('empty', !n); }
// Bomba atılınca / yenisi gelince sayaç; yenisi gelince kısa parlama
G.onGrenadeCount = (gained) => {
    updateGrenadeHud();
    if (gained) { const r = $('gren-row'); r.classList.remove('pulse'); void r.offsetWidth; r.classList.add('pulse'); }
};

// --- OYUN AKIŞI ---
function resetLevel() {
    clearEnemies(scene); removeBoss(scene); clearFx(); clearHazards(); clearGrenades(); resetGrenadeStock();
    if (G.outro) { G.outro.remove(); G.outro = null; }
    const W = G.world, L = G.level;
    if (L.mode) {
        G.score = 0; G.kills = 0; G.collect = 0; G.livesLost = 0; G.bossDone = false; G.time = 0; G.target = L.target;
        $('battery').hidden = true;
        resetPlayer(player, START);
        L.mode.reset();
        updateHud(); updateHearts();
        return;
    }
    W.items = W.items.filter(it => { if (it.temp) { scene.remove(it.mesh); return false; } return true; });
    W.items.forEach(it => { it.taken = false; it.mesh.visible = true; });
    W.bricks.forEach(b => { b.broken = false; b.mesh.visible = true; b.aabb.active = true; });
    W.barricade.open = false; W.barricade.t = 0; W.barricade.group.position.y = 0; W.barricade.aabb.active = true;
    W.checkpoint.reached = false; W.checkpoint.cloth.material.color.set('#6b7280');
    G.score = 0; G.kills = 0; G.collect = 0; G.livesLost = 0; G.bossDone = false; G.time = 0; G.target = L.target;
    G.battery = 100; batShown = -1; $('battery').hidden = !L.battery; if (L.battery) updateBattery();
    W.barricade.setCount(G.target);
    spawnEnemies(scene, L.spawns);
    resetPlayer(player, START);
    cam.yaw = 0; cam.pitch = 0.32; cam.target.copy(START).setY(1.6);
    updateHud(); updateHearts();
}
let selected = Math.min(MAX_LEVEL, Math.max(1, getNumRaw('hirhiz3dLevel') || 1));
function getNumRaw(k) { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } }
function startGame(id = selected) {
    unlockAudio();
    if (!G.level || G.level.id !== id) loadLevel(id);
    resetLevel();
    hidePanels();
    G.state = 'play';
    clearAll();
    playMusic(G.level.music);
    toast(G.level.mission, 3000);
    showHint();
}
// Ölünce: kontrol noktasından (ya da canavar meydanının girişinden) devam
function retry() {
    hidePanels(); clearAll();
    const p = G.player, W = G.world;
    if (G.level.mode) { G.level.mode.retry(); G.state = 'play'; updateHearts(); playMusic(G.level.music); return; }
    let at = START.clone();
    if (W.checkpoint.reached) at.set(0, 0, W.checkpoint.z - 1);
    if (G.boss) { at.set(0, 0, ARENA.z0 - 2); G.boss.reset && G.boss.reset(); }
    G.projectiles.forEach(pr => pr.life = 0); clearHazards(); clearGrenades(); resetGrenadeStock(); updateGrenadeHud();
    resetPlayer(p, at);
    p.collected = Math.min(p.collected, G.collect);
    cam.yaw = 0; cam.target.copy(at).setY(1.6);
    G.state = 'play';
    updateHearts();
    playMusic(G.level.music);
}
function pause() {
    if (G.state !== 'play') return;
    G.state = 'pause'; showPanel('pause'); releasePointer();
}
function resume() { if (G.state !== 'pause') return; hidePanels(); G.state = 'play'; clearAll(); }
function toMenu() { hidePanels(); G.state = 'menu'; renderLevels(); showPanel('menu'); stopMusic(); releasePointer(); }

function showPanel(id) { hidePanels(); $(id).hidden = false; document.body.classList.toggle('in-menu', true); }
function hidePanels() { ['menu', 'pause', 'dead', 'won'].forEach(k => $(k).hidden = true); document.body.classList.remove('in-menu'); }

function showHint() {
    const h = $('hint'), A = G.level.ammoName.toLowerCase();
    h.innerHTML = G.level.hint ? G.level.hint(input.touch || touchDevice)
        : input.touch || touchDevice
        ? `Sol: yürü · Sağda sürükle: kamera<br>✕ zıpla · ○ balyoz · △ kalkan (basılı tut) · □ ${A} (öndekine nişan alır) · 💣 el bombası`
        : `WASD yürü · Shift hızlı koş · Fare: kamera ve nişan (önce oyuna tıkla) · Boşluk zıpla<br>Sol tık ${A} · F balyoz · R el bombası · E / sağ tık kalkan · P duraklat`;
    h.classList.add('on'); setTimeout(() => h.classList.remove('on'), 7000);
}

// Menü: bölüm seçimi, zorluk, ses
function renderLevels() {
    $('levels').innerHTML = Object.values(LEVELS).map(L => {
        const st = getNumRaw(`hirhiz3dStars${L.id}`);
        return `<button class="chip lvl${L.id === selected ? ' on' : ''}" data-l="${L.id}">${L.menuTitle}${st ? ' ' + '⭐'.repeat(st) : ''}</button>`;
    }).join('');
    $('levels').querySelectorAll('button').forEach(b => b.onclick = () => { selected = +b.dataset.l; setNum('hirhiz3dLevel', selected); renderLevels(); });
    const L = LEVELS[selected], best = getNumRaw(`hirhiz3dBest${L.id}`);
    $('menu-sub').textContent = `${L.id}. BÖLÜM · ${L.name}`;
    $('menu-desc').textContent = L.desc;
    $('menu-best').textContent = best ? `${L.id}. bölüm en iyi: ${best.toLocaleString('tr-TR')}` : '';
}
function renderDiff() {
    $('diff').innerHTML = Object.keys(DIFFS).map(k => `<button class="chip${k === G.difficulty ? ' on' : ''}" data-d="${k}">${DIFFS[k].name}</button>`).join('');
    $('diff').querySelectorAll('button').forEach(b => b.onclick = () => {
        G.difficulty = b.dataset.d; setNum('hirhizDiff', G.difficulty);
        renderDiff();
    });
}
function renderSound() { document.querySelectorAll('.snd').forEach(b => b.textContent = isMuted() ? '🔇 SES KAPALI' : '🔊 SES AÇIK'); }
renderLevels(); renderDiff(); renderSound();
document.querySelectorAll('.snd').forEach(b => b.onclick = () => { unlockAudio(); setMuted(!isMuted()); renderSound(); });
$('start').onclick = () => startGame(selected);
$('resume').onclick = resume;
$('restart').onclick = () => startGame(G.level.id);
$('retry').onclick = retry;
$('dead-restart').onclick = () => startGame(G.level.id);
$('again').onclick = () => startGame(G.level.id);
$('next').onclick = () => { selected = G.level.id + 1; setNum('hirhiz3dLevel', selected); startGame(selected); };
document.querySelectorAll('.to-menu').forEach(b => b.onclick = toMenu);
$('pause-btn').onclick = () => G.state === 'play' ? pause() : resume();
document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && G.state === 'play' && !input.touch) pause();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// Telefon performansı: uzaktaki karakterler ve eşyalar çizilmez (sis zaten örter)
const FAR_ENEMY = 48, FAR_ITEM = 55;
function cullFar() {
    const c = camera.position;
    for (const e of G.enemies) {
        if (!e.m.root.parent) continue;
        e.m.root.visible = Math.hypot(e.pos.x - c.x, e.pos.z - c.z) < FAR_ENEMY;
    }
    for (const it of G.world.items) if (!it.taken) it.mesh.visible = Math.hypot(it.pos.x - c.x, it.pos.z - c.z) < FAR_ITEM;
}

// --- ANA DÖNGÜ (sabit adım 1/60 s) ---
const STEP = 1 / 60;
let last = performance.now(), acc = 0, fpsEl = null, fpsN = 0, fpsT = 0;
if (/fps=1/.test(location.search)) { fpsEl = $('fps'); fpsEl.hidden = false; }
function step(dt) {
    pollInput();
    G.time += dt;
    if (G.level.mode) {
        G.level.mode.update(dt);
        if (G.state === 'play') updateOutro(dt);
        updateFx(dt); consumePresses();
        return;
    }
    updatePlayer(player, dt, cam.yaw);
    updateEnemies(dt);
    updateBoss(dt);
    updateHazards(dt);
    updateGrenades(dt);
    if (G.state === 'play') updateLevel(dt);
    updateWorld(G.world, dt, G.time);
    updateFx(dt);
    consumePresses();
}
function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (G.freeze) { faceCamera(player, cam.yaw); renderer.render(scene, camera); return; }   // test sürerken döngüyü test yönetir
    if (input.pausePressed) { input.pausePressed = false; if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); }
    if (input.restartPressed) { input.restartPressed = false; if (G.state === 'pause' || G.state === 'dead') startGame(G.level.id); }
    if (G.state === 'play' || G.state === 'dead' || G.state === 'won') {
        if (G.hitStop > 0) { G.hitStop -= dt; }
        else {
            acc += dt;
            let n = 0;
            while (acc >= STEP && n < 6) { step(STEP); acc -= STEP; n++; }
            if (n === 6) acc = 0;
        }
    } else if (G.state === 'menu') { if (G.level.mode) G.level.mode.idle && G.level.mode.idle(dt); else updateWorld(G.world, dt, G.time += dt); }
    updateCamera(dt);
    cullFar(); faceCamera(player, cam.yaw);
    renderer.render(scene, camera);
    if (fpsEl) { fpsN++; fpsT += dt; if (fpsT > 0.5) { fpsEl.textContent = `${Math.round(fpsN / fpsT)} fps · ${renderer.info.render.calls} çizim`; fpsN = 0; fpsT = 0; } }
}
// Test: ?test=<senaryo>&bolum=2 (3d/js/test.js)
const Q = new URLSearchParams(location.search), T = Q.get('test');
// Telefon index.html'i ~10 dk önbellekte tutar; yeni sürüm yayındaysa sayfayı yeni adresle bir kez yeniden aç.
// Dosyalar değişince buradaki VER, version.txt ve bütün ?v= numaraları birlikte artırılır.
const VER = '18';
if (!T) fetch('version.txt?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').then(v => {
    v = v.trim();
    if (/^\d+$/.test(v) && v !== VER && Q.get('r') !== v) { Q.set('r', v); location.replace(location.pathname + '?' + Q); }
}).catch(() => {});
loadLevel(T ? (+Q.get('bolum') || 1) : selected);
resetLevel();
showPanel('menu');
requestAnimationFrame(frame);
if (T) import('./test.js?v=18').then(m => m.runTest(T, { G, input, camera, startGame: (n) => startGame(n || G.level.id), loadLevel, retry, step, STEP, cam, updateCamera,
    render: () => renderer.render(scene, camera),
    calls: () => { cullFar(); renderer.render(scene, camera); return renderer.info.render.calls + ' çizim ' + renderer.info.render.triangles + ' üçgen'; } }));
