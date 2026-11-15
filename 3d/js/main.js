// HIRHIZ 3D — ana döngü, kamera, ışık, oyun akışı, menüler
import * as THREE from 'three';
import { G, DIFFS, diff, addScore, toast } from './state.js?v=3';
import { initInput, pollInput, consumePresses, clearAll, input, releasePointer } from './input.js?v=3';
import { buildWorld, updateWorld, SPAWNS, ARENA, makeBag } from './world.js?v=3';
import { createPlayer, resetPlayer, updatePlayer, updateHearts, addCollected, faceCamera } from './player.js?v=3';
import { spawnEnemies, clearEnemies, updateEnemies, hammerHit, throwBribe } from './enemies.js?v=3';
import { spawnBoss, updateBoss, removeBoss } from './boss.js?v=3';
import { initFx, updateFx, clearFx, spawnFx, burst, floatText, shake, addTrauma } from './fx.js?v=3';
import { unlockAudio, playSfx, playMusic, stopMusic, isMuted, setMuted } from './audio.js?v=3';
import { damp, dampAngle, angDiff, clamp, canvasTex } from './util.js?v=3';
import { groundAt } from './physics.js?v=3';

const $ = id => document.getElementById(id);
const START = new THREE.Vector3(0, 0, 7);
const touchDevice = matchMedia('(pointer: coarse)').matches;

// --- GÖRÜNTÜ ---
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, touchDevice ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
G.scene = scene;
scene.background = canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5b9bd5'); gr.addColorStop(0.55, '#a9cdee'); gr.addColorStop(1, '#e8f1f8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog('#d4e6f5', 40, 130);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 150);
G.camera = camera;

scene.add(new THREE.HemisphereLight('#e0efff', '#55743a', 1.4));
const sun = new THREE.DirectionalLight('#fff4e0', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(touchDevice ? 1024 : 2048, touchDevice ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 75 : 60;   // dik tutulan telefonda biraz geniş açı
    camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// --- DÜNYA ---
initFx(scene);
G.world = buildWorld(scene);
const player = createPlayer(scene);
initInput(canvas, () => G.state === 'play');

// --- KAMERA: oyuncunun arkasında, sürükleyerek döner; hareket ederken yavaşça arkaya geçer ---
const cam = { yaw: 0, pitch: 0.32, dist: 7.2, target: new THREE.Vector3(), idle: 0 };
function updateCamera(dt) {
    const p = G.player;
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
    camera.position.set(
        cam.target.x + Math.sin(cam.yaw) * cp * cam.dist,
        cam.target.y + Math.sin(cam.pitch) * cam.dist,
        cam.target.z + Math.cos(cam.yaw) * cp * cam.dist);
    // Zeminin altına inmesin
    const gy = groundAt(G.world.solids, camera.position.x, camera.position.z, camera.position.y + 1);
    if (camera.position.y < gy + 0.4) camera.position.y = gy + 0.4;
    camera.lookAt(cam.target);
    // Sarsıntı (travma karesi kadar)
    const s = shake.trauma * shake.trauma;
    if (s > 0) {
        const t = performance.now() / 1000;
        camera.rotation.z += Math.sin(t * 37) * 0.04 * s;
        camera.position.x += Math.sin(t * 53) * 0.25 * s; camera.position.y += Math.sin(t * 61 + 1) * 0.2 * s;
    }
    // Güneş oyuncuyu izler (gölgeler keskin kalsın)
    sun.position.set(p.pos.x + 10, p.pos.y + 24, p.pos.z + 8);
    sun.target.position.set(p.pos.x, p.pos.y, p.pos.z - 3);
}

// --- OLAYLAR ---
G.onHammer = (point, p) => {
    hammerHit(point, p);
    // Tuğlalar
    for (const b of G.world.bricks) {
        if (b.broken) continue;
        const c = b.mesh.position;
        if (Math.abs(c.x - point.x) < 1.1 && Math.abs(c.z - point.z) < 1.1 && point.y + 1.2 > b.aabb.min.y && point.y - 0.6 < b.aabb.max.y) breakBrick(b);
    }
    // TOMA balyozdan etkilenmez
    const B = G.boss;
    if (B && !B.dead && B.hitTest(point.clone().setY(1.2))) {
        floatText('ZIRHLI! ÜSTÜNE ZIPLA!', point.clone().setY(3), '#fde047', 0.45);
        playSfx('hit', { rate: 1.4, vol: 0.5 }); spawnFx('hit', point, 1);
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
G.onBribe = (from, vel) => throwBribe(from, vel);
G.onKill = () => {
    updateHud();
    const left = Math.max(0, G.target - G.kills), bar = G.world.barricade;
    bar.setCount(left);
    if (left === 0 && !bar.open) {
        bar.open = true; bar.aabb.active = false;
        toast(`${G.target} KİŞİ TAMAM! BARİKAT AÇILDI — TOMA'YA GİT!`, 3200, '#86efac');
    }
};
G.onPlayerDead = () => {
    playSfx('cry', { rate: 0.8 });
    setTimeout(() => { if (G.state === 'play') { G.state = 'dead'; showPanel('dead'); releasePointer(); } }, 1500);
};
G.onBossDefeated = () => {
    if (G.state !== 'play') return;
    G.state = 'won'; releasePointer(); stopMusic();
    const stars = G.livesLost === 0 ? 3 : G.livesLost <= 1 ? 2 : 1;
    let best = 0, bestStars = 0;
    try { best = +localStorage.getItem('hirhiz3dBest1') || 0; bestStars = +localStorage.getItem('hirhiz3dStars1') || 0; } catch (e) {}
    try { if (G.score > best) localStorage.setItem('hirhiz3dBest1', G.score); if (stars > bestStars) localStorage.setItem('hirhiz3dStars1', stars); } catch (e) {}
    $('won-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    $('won-score').textContent = G.score.toLocaleString('tr-TR');
    $('won-detail').textContent = `Yenilen: ${G.kills} · Çınar fidanı: ${G.fidans}/10 · Kaybedilen can: ${G.livesLost} · ${diff().name}`;
    $('won-best').textContent = G.score > best ? 'YENİ REKOR!' : `En iyi: ${Math.max(best, G.score).toLocaleString('tr-TR')}`;
    showPanel('won');
};

// --- TOPLANANLAR, KONTROL NOKTASI, CANAVAR ---
function updateLevel(dt) {
    const p = G.player, W = G.world;
    for (const it of W.items) {
        if (it.taken) continue;
        const dx = it.pos.x - p.pos.x, dz = it.pos.z - p.pos.z, dy = it.pos.y - p.pos.y;
        if (Math.hypot(dx, dz) < 0.85 && dy > -1.0 && dy < 1.9 && !p.dead) {
            it.taken = true; it.mesh.visible = false;
            spawnFx('collect', it.pos.clone(), 1.4);
            playSfx('coin', { vol: 0.6 });
            if (it.kind === 'fidan') { G.fidans++; addScore(5000); addCollected(p); floatText('ÇINAR!', it.pos.clone().setY(it.pos.y + 1.4), '#86efac'); }
            else if (it.kind === 'mask') { p.mask = 3; p.m.helmet.visible = true; addScore(1000); floatText('BARET + MASKE!', it.pos.clone().setY(it.pos.y + 1.4), '#fde047'); toast('BARET + MASKE: 3 VURUŞ KORUR, BİBER GAZI İŞLEMEZ', 2400); }
            else if (it.kind === 'bag') { addScore(5000); addCollected(p); floatText('KUL HAKKI!', it.pos.clone().setY(it.pos.y + 1.4), '#fde047'); }
            updateHud(); updateHearts();
        }
    }
    const cp = W.checkpoint;
    if (!cp.reached && p.pos.z < cp.z && !p.dead) {
        cp.reached = true; cp.cloth.material.color.set('#16a34a');
        toast('KONTROL NOKTASI!', 1600, '#86efac');
        spawnFx('collect', new THREE.Vector3(7, 3.5, cp.z), 2);
        playSfx('coin', { rate: 0.8 });
    }
    if (W.barricade.open && !G.boss && !G.bossDone && p.pos.z < ARENA.z0 - 3 && !p.dead) {
        spawnBoss(scene, new THREE.Vector3(0, 0, -222));
        G.bossDone = true;
        addTrauma(0.3);
    }
}

// --- HUD ---
function updateHud() {
    $('score').textContent = G.score.toLocaleString('tr-TR');
    $('kills').textContent = `${Math.min(G.kills, G.target)} / ${G.target}`;
    $('fidans').textContent = `${G.fidans} / 10`;
}

// --- OYUN AKIŞI ---
function resetLevel() {
    clearEnemies(scene); removeBoss(scene); clearFx();
    const W = G.world;
    W.items = W.items.filter(it => { if (it.temp) { scene.remove(it.mesh); return false; } return true; });
    W.items.forEach(it => { it.taken = false; it.mesh.visible = true; });
    W.bricks.forEach(b => { b.broken = false; b.mesh.visible = true; b.aabb.active = true; });
    W.barricade.open = false; W.barricade.t = 0; W.barricade.group.position.y = 0; W.barricade.aabb.active = true;
    W.checkpoint.reached = false; W.checkpoint.cloth.material.color.set('#6b7280');
    G.score = 0; G.kills = 0; G.fidans = 0; G.livesLost = 0; G.bossDone = false; G.time = 0;
    W.barricade.setCount(G.target);
    spawnEnemies(scene, SPAWNS);
    resetPlayer(player, START);
    cam.yaw = 0; cam.pitch = 0.32; cam.target.copy(START).setY(1.6);
    updateHud(); updateHearts();
}
function startGame() {
    unlockAudio();
    resetLevel();
    hidePanels();
    G.state = 'play';
    clearAll();
    playMusic('../chiptune_level1.mp3');
    toast(`${G.target} ÇAPULCUYU YEN, TOMA'YI DURDUR!`, 3000);
    showHint();
}
// Ölünce: kontrol noktasından (ya da canavar meydanının girişinden) devam
function retry() {
    hidePanels(); clearAll();
    const p = G.player, W = G.world;
    let at = START.clone();
    if (W.checkpoint.reached) at.set(0, 0, W.checkpoint.z - 1);
    if (G.boss) { at.set(0, 0, ARENA.z0 - 2); G.boss.hp = G.boss.maxHp; G.boss.pos.set(0, 0, -222); G.boss.fireT = 2.5; $('boss-fill').style.width = '100%'; }
    G.projectiles.forEach(pr => pr.life = 0);
    resetPlayer(p, at);
    p.collected = Math.min(p.collected, G.fidans);
    cam.yaw = 0; cam.target.copy(at).setY(1.6);
    G.state = 'play';
    updateHearts();
    playMusic('../chiptune_level1.mp3');
}
function pause() {
    if (G.state !== 'play') return;
    G.state = 'pause'; showPanel('pause'); releasePointer();
}
function resume() { if (G.state !== 'pause') return; hidePanels(); G.state = 'play'; clearAll(); }
function toMenu() { hidePanels(); G.state = 'menu'; showPanel('menu'); stopMusic(); releasePointer(); }

function showPanel(id) { hidePanels(); $(id).hidden = false; document.body.classList.toggle('in-menu', true); }
function hidePanels() { ['menu', 'pause', 'dead', 'won'].forEach(k => $(k).hidden = true); document.body.classList.remove('in-menu'); }

function showHint() {
    const h = $('hint');
    h.innerHTML = input.touch || touchDevice
        ? 'Sol: yürü · Sağda sürükle: kamera<br>✕ zıpla · ○ balyoz · △ kalkan (basılı tut) · □ rüşvet'
        : 'WASD yürü · Fare kamera (tıkla) · Boşluk zıpla<br>F / sol tık balyoz · Shift / sağ tık kalkan · E rüşvet · P duraklat';
    h.classList.add('on'); setTimeout(() => h.classList.remove('on'), 7000);
}

// Menü düğmeleri
function renderDiff() {
    $('diff').innerHTML = Object.keys(DIFFS).map(k => `<button class="chip${k === G.difficulty ? ' on' : ''}" data-d="${k}">${DIFFS[k].name}</button>`).join('');
    $('diff').querySelectorAll('button').forEach(b => b.onclick = () => {
        G.difficulty = b.dataset.d; try { localStorage.setItem('hirhizDiff', G.difficulty); } catch (e) {}
        renderDiff();
    });
}
renderDiff();
function renderSound() { document.querySelectorAll('.snd').forEach(b => b.textContent = isMuted() ? '🔇 SES KAPALI' : '🔊 SES AÇIK'); }
renderSound();
document.querySelectorAll('.snd').forEach(b => b.onclick = () => { unlockAudio(); setMuted(!isMuted()); renderSound(); });
$('start').onclick = startGame;
$('resume').onclick = resume;
$('restart').onclick = startGame;
$('retry').onclick = retry;
$('dead-restart').onclick = startGame;
$('again').onclick = startGame;
document.querySelectorAll('.to-menu').forEach(b => b.onclick = toMenu);
$('pause-btn').onclick = () => G.state === 'play' ? pause() : resume();
document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && G.state === 'play' && !input.touch) pause();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
{   // menüde en iyi skor
    let best = 0, st = 0;
    try { best = +localStorage.getItem('hirhiz3dBest1') || 0; st = +localStorage.getItem('hirhiz3dStars1') || 0; } catch (e) {}
    if (best) $('menu-best').textContent = `1. bölüm en iyi: ${best.toLocaleString('tr-TR')} ${'⭐'.repeat(st)}`;
}

// Telefon performansı: uzaktaki karakterler ve eşyalar çizilmez (sis zaten örter)
const FAR_ENEMY = 48, FAR_ITEM = 55;
function cullFar() {
    const c = camera.position;
    for (const e of G.enemies) {
        if (!e.m.root.parent) continue;
        const d = Math.hypot(e.pos.x - c.x, e.pos.z - c.z);
        e.m.root.visible = d < FAR_ENEMY;
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
    updatePlayer(player, dt, cam.yaw);
    updateEnemies(dt);
    updateBoss(dt);
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
    if (input.restartPressed) { input.restartPressed = false; if (G.state === 'pause' || G.state === 'dead') startGame(); }
    if (G.state === 'play' || G.state === 'dead' || G.state === 'won') {
        if (G.hitStop > 0) { G.hitStop -= dt; }
        else {
            acc += dt;
            let n = 0;
            while (acc >= STEP && n < 6) { step(STEP); acc -= STEP; n++; }
            if (n === 6) acc = 0;
        }
    } else if (G.state === 'menu') { updateWorld(G.world, dt, G.time += dt); }
    updateCamera(dt);
    cullFar(); faceCamera(player, cam.yaw);
    renderer.render(scene, camera);
    if (fpsEl) { fpsN++; fpsT += dt; if (fpsT > 0.5) { fpsEl.textContent = `${Math.round(fpsN / fpsT)} fps · ${renderer.info.render.calls} çizim`; fpsN = 0; fpsT = 0; } }
}
resetLevel();
showPanel('menu');
requestAnimationFrame(frame);
// Test: ?test=<senaryo> (3d/js/test.js)
const T = new URLSearchParams(location.search).get('test');
if (T) import('./test.js?v=3').then(m => m.runTest(T, { G, startGame, retry, step, STEP, cam, updateCamera, render: () => renderer.render(scene, camera), calls: () => { cullFar(); renderer.render(scene, camera); return renderer.info.render.calls + ' çizim ' + renderer.info.render.triangles + ' üçgen'; } }));
