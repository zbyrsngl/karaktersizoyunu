// HIRHIZ 3D — 9. ve 10. bölüm canavarlarının ortak motoru (SELO, EKREM) + modelleri + hücre sahnesi.
// Canavar karşılaşınca konuşur (sesi çalar, en çok 4 sn bekler), sonra mesafesini koruyarak yaklaşır ve saldırıları sırayla yapar.
// Her saldırı önce belli edilir (başında yazı + poz). Hasar: balyoz 2, üstüne zıplama 2, nişanlı atış 1. Canı yarıya inince öfkelenir.
//   SELO: ♪ bağlamadan notalar (süzülerek düşer) · AİHM KARARI (gökten kâğıt yağar, kalkanı kaldır) · "SENİ BAŞKAN... YAPTIRMAYACAĞIZ!" (çift şok dalgası)
//   EKREM: ♥ kalpler · ✔ oy pusulası yağmuru; yenilince "YSK: SEÇİM İPTAL!" → SEÇİM TEKRARI (daha büyük, 22 can, + şok dalgası, + maraton koşusu)
// Yenilince yukarıdan hücre parmaklığı iner (jailOutro): SELO içeride bağlama çalar, EKREM el sallar.
import * as THREE from 'three';
import { G, diff, addScore, toast } from './state.js?v=16';
import { hurtPlayer, shieldBlocks, blockFx, bouncePlayer } from './player.js?v=16';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=16';
import { playSfx } from './audio.js?v=16';
import { makeRing } from './hazards.js?v=16';
import { limb, walkPose } from './models.js?v=16';
import { groundAt } from './physics.js?v=16';
import { box, mat, canvasTex, fitText, textSprite, disposeSprite, dampAngle, clamp, rand } from './util.js?v=16';
import { ARENA } from './world.js?v=16';
import { hitsPlayer, killProj } from './enemies.js?v=16';
import { showBossBar, setBossBar } from './boss_core.js?v=16';

// --- ORTAK KAFA ---
// Ten rengi kafa, kulaklar, kaşlar, gözler, burun, geniş gülüş (dişler); saçı modele göre eklenir
function face(head, { skin, faceH = 1.15, brow = '#1c1917', iris = '#1c1917' }) {
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(skin)); skull.scale.set(0.95, faceH, 1); skull.position.y = 0.26; skull.castShadow = true; head.add(skull);
    [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(skin)); e.scale.set(0.5, 1.2, 0.9); e.position.set(s * 0.19, 0.26, 0); head.add(e); });
    const brows = [];
    [-1, 1].forEach(s => {
        const b = box(0.11, 0.035, 0.04, brow, s * 0.075, 0.355, 0.175, false); head.add(b); brows.push(b);
        head.add(box(0.07, 0.04, 0.02, '#ffffff', s * 0.072, 0.31, 0.19, false));
        head.add(box(0.032, 0.032, 0.02, iris, s * 0.07, 0.308, 0.198, false));
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(skin)); nose.scale.set(0.9, 1.3, 1.2); nose.position.set(0, 0.25, 0.2); head.add(nose);
    const mouth = box(0.13, 0.025, 0.02, '#7f1d1d', 0, 0.165, 0.19, false); head.add(mouth);
    const teeth = box(0.1, 0.018, 0.02, '#ffffff', 0, 0.18, 0.196, false); head.add(teeth);
    return { brows, mouth, teeth };
}

// SELO: koyu takım, açık yakalı beyaz gömlek (kravatsız), dalgalı siyah saç, kalın kaşlar, geniş gülüş; göğsünde bağlama
function buildSelo() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const SUIT = '#1e293b', SUIT_D = '#111827', SKIN = '#e0ac69';
    const legL = limb(body, -0.12, 0.74, 0, 0.18, 0.72, 0.2, SUIT_D, '#3f2a1d');
    const legR = limb(body, 0.12, 0.74, 0, 0.18, 0.72, 0.2, '#0b1120', '#3f2a1d');
    const torso = new THREE.Group(); torso.position.y = 0.74; body.add(torso);
    torso.add(box(0.62, 0.66, 0.34, SUIT, 0, 0.33, 0));
    torso.add(box(0.2, 0.22, 0.02, '#f8fafc', 0, 0.55, 0.175, false));                       // açık yaka gömlek
    [-1, 1].forEach(s => { const l = box(0.1, 0.34, 0.03, '#334155', s * 0.1, 0.47, 0.18, false); l.rotation.z = s * 0.3; torso.add(l); });
    const head = new THREE.Group(); head.position.y = 0.66; torso.add(head);
    head.add(box(0.13, 0.1, 0.13, SKIN, 0, 0.03, 0));
    const f = face(head, { skin: SKIN, faceH: 1.1 });
    const hair = mat('#1c1917');
    for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI, h = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), hair); h.position.set(Math.cos(a) * 0.15, 0.43 + Math.sin(a) * 0.04, -0.02 + Math.sin(a * 2) * 0.03); head.add(h); }   // dalgalı saç
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.205, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), hair); cap.scale.set(1, 0.75, 1.05); cap.position.y = 0.33; head.add(cap);
    [-1, 1].forEach(s => head.add(box(0.035, 0.12, 0.08, '#1c1917', s * 0.18, 0.3, 0.05, false)));   // favoriler
    const shadow = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#57534e', transparent: true, opacity: 0.25 }));
    shadow.position.set(0, 0.2, 0.06); head.add(shadow);   // hafif sakal gölgesi
    const armL = limb(torso, -0.37, 0.6, 0, 0.15, 0.5, 0.16, SUIT_D);
    const armR = limb(torso, 0.37, 0.6, 0, 0.15, 0.5, 0.16, SUIT);
    armL.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.53, 0, false)); armR.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.53, 0, false));
    // bağlama: göğsün önünde çapraz (gövde + uzun sap + burgular)
    const saz = new THREE.Group(); saz.position.set(0.04, 0.3, 0.3); saz.rotation.z = 0.8; torso.add(saz);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), mat('#b45309')); bowl.scale.set(1.25, 0.85, 0.55); saz.add(bowl);
    saz.add(box(0.36, 0.3, 0.02, '#d97706', 0, 0, 0.11, false));
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), new THREE.MeshBasicMaterial({ color: '#1c1917' })); hole.position.set(0.05, 0, 0.125); saz.add(hole);
    saz.add(box(0.9, 0.06, 0.05, '#6b3f1d', 0.6, 0, 0.06));
    saz.add(box(0.14, 0.1, 0.06, '#3f2a1d', 1.08, 0, 0.06));
    for (let i = 0; i < 3; i++) saz.add(box(1.2, 0.006, 0.006, '#fef3c7', 0.45, -0.015 + i * 0.015, 0.125, false));
    root.scale.setScalar(1.08);
    return { root, body, legL, legR, armL, armR, torso, head, saz, ...f };
}
// EKREM: lacivert takım, beyaz gömlek, kırmızı kravat, uzun yüz, geriye taranmış koyu saç, kır şakaklar; uzun boylu
function buildEkrem() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const SUIT = '#1e3a8a', SUIT_D = '#172554', SKIN = '#eac39f';
    const legL = limb(body, -0.12, 0.8, 0, 0.18, 0.78, 0.2, SUIT_D, '#0b0b0b');
    const legR = limb(body, 0.12, 0.8, 0, 0.18, 0.78, 0.2, '#0f1a40', '#0b0b0b');
    const torso = new THREE.Group(); torso.position.y = 0.8; body.add(torso);
    torso.add(box(0.6, 0.68, 0.32, SUIT, 0, 0.34, 0));
    torso.add(box(0.18, 0.26, 0.02, '#f8fafc', 0, 0.54, 0.165, false));
    torso.add(box(0.06, 0.36, 0.02, '#b91c1c', 0, 0.45, 0.176, false));
    [-1, 1].forEach(s => { const l = box(0.1, 0.34, 0.03, '#172554', s * 0.1, 0.48, 0.17, false); l.rotation.z = s * 0.3; torso.add(l); });
    torso.add(box(0.05, 0.05, 0.02, '#e30a17', -0.18, 0.52, 0.17, false));   // yaka rozeti
    const head = new THREE.Group(); head.position.y = 0.68; torso.add(head);
    head.add(box(0.13, 0.1, 0.13, SKIN, 0, 0.03, 0));
    const f = face(head, { skin: SKIN, faceH: 1.3, brow: '#292524', iris: '#3f2a1d' });
    const hair = mat('#292524'), grey = mat('#a8a29e');
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.205, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), hair); cap.scale.set(1, 0.7, 1.12); cap.position.set(0, 0.38, -0.02); head.add(cap);
    head.add(box(0.36, 0.08, 0.2, hair, 0, 0.47, 0.02, false));                                  // geriye taranmış ön saç
    [-1, 1].forEach(s => { const g = box(0.04, 0.13, 0.12, grey, s * 0.185, 0.33, 0.0, false); head.add(g); });   // kır şakaklar
    const armL = limb(torso, -0.36, 0.62, 0, 0.15, 0.55, 0.16, SUIT_D);
    const armR = limb(torso, 0.36, 0.62, 0, 0.15, 0.55, 0.16, SUIT);
    armL.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.58, 0, false)); armR.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.58, 0, false));
    // başının üstünde kalp (kalp saldırısında görünür)
    const heart = heartMesh(0.5); heart.position.set(0, 1.55, 0.1); heart.visible = false; torso.add(heart);
    root.scale.setScalar(1.08);
    return { root, body, legL, legR, armL, armR, torso, head, heart, ...f };
}

// --- SÜZÜLEN MERMİLER (nota, AİHM kararı, kalp, oy pusulası) ---
const TEXS = {};
function floatTex(kind) {
    if (TEXS[kind]) return TEXS[kind];
    const draw = {
        note: (g) => { g.fillStyle = '#a21caf'; g.strokeStyle = '#a21caf'; g.lineWidth = 5; g.beginPath(); g.ellipse(18, 46, 10, 8, -0.4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(44, 40, 10, 8, -0.4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(27, 44); g.lineTo(27, 12); g.lineTo(53, 7); g.lineTo(53, 38); g.stroke(); g.lineWidth = 8; g.beginPath(); g.moveTo(27, 15); g.lineTo(53, 10); g.stroke(); },
        aihm: (g) => { g.fillStyle = '#f8fafc'; g.fillRect(8, 2, 48, 60); g.fillStyle = '#1d4ed8'; g.fillRect(8, 2, 48, 16); g.fillStyle = '#fde047'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.fillRect(32 + Math.cos(a) * 5 - 1, 10 + Math.sin(a) * 5 - 1, 2, 2); } g.fillStyle = '#1e3a8a'; g.font = 'bold 12px Arial'; g.textAlign = 'center'; g.fillText('AİHM', 32, 32); g.fillStyle = '#94a3b8'; [40, 47, 54].forEach(y => g.fillRect(14, y, 36, 2)); },
        heart: (g) => { g.fillStyle = '#e11d48'; g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(0, 30, 14, 4, 32, 20); g.bezierCurveTo(50, 4, 64, 30, 32, 54); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(22, 22, 4, 0, Math.PI * 2); g.fill(); },
        vote: (g) => { g.fillStyle = '#fefce8'; g.fillRect(8, 2, 48, 60); g.strokeStyle = '#a8a29e'; g.lineWidth = 1; for (let i = 0; i < 3; i++) g.strokeRect(12, 6 + i * 19, 40, 16); g.strokeStyle = '#7c3aed'; g.lineWidth = 3; g.beginPath(); g.arc(32, 14, 7, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#7c3aed'; g.font = 'bold 7px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EVET', 32, 14); }
    }[kind];
    return (TEXS[kind] = canvasTex(64, 64, draw));
}
const GLOW = { note: '#e879f9', aihm: '#60a5fa', heart: '#fb7185', vote: '#4ade80' };
const FL_GEO = new THREE.PlaneGeometry(0.55, 0.55), FL_GLOW = new THREE.PlaneGeometry(0.85, 0.85);
function heartMesh(s) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: floatTex('heart'), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    return m;
}
function floaterMesh(kind) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(FL_GLOW, new THREE.MeshBasicMaterial({ color: GLOW[kind], transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
    const m = new THREE.Mesh(FL_GEO, new THREE.MeshBasicMaterial({ map: floatTex(kind), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide })); m.position.z = 0.01; g.add(m);
    return g;
}
// Canavarın elinden oyuncuya doğru yükselip süzülerek düşen yelpaze (FETÖ'nün 1 dolarları gibi)
function volley(b, kind, n = 5) {
    const p = G.player, toP = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z), d = Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    const from = b.pos.clone().add(new THREE.Vector3(Math.sin(b.facing) * 0.5, 1.6, Math.cos(b.facing) * 0.5));
    for (let i = 0; i < n; i++) {
        const a = toP + (i - (n - 1) / 2) * 0.2, sp = Math.min(8, d * 0.55 + 1) * (0.7 + i % 3 * 0.15);
        addFloater(kind, from, new THREE.Vector3(Math.sin(a) * sp, 7 + rand(0, 2), Math.cos(a) * sp), 7);
    }
}
// Gökten yağmur: oyuncunun çevresine yayılır, yukarıdan iner (kalkan yukarıdan geleni durdurur)
function rain(kind, n = 6) {
    const p = G.player;
    for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + rand(0, 0.5), r = i === 0 ? 0 : rand(1.2, 3.6);
        const at = new THREE.Vector3(p.pos.x + Math.sin(a) * r, p.pos.y + 9 + (i % 3) * 1.6, p.pos.z + Math.cos(a) * r);
        addFloater(kind, at, new THREE.Vector3(0, -0.5, 0), 9);
    }
    floatText('YUKARI BAK!', p.pos.clone().setY(p.pos.y + 2.6), '#93c5fd', 0.45, 1.2);
}
function addFloater(kind, from, vel, life) {
    const m = floaterMesh(kind); m.position.copy(from); G.scene.add(m);
    G.projectiles.push({ type: 'floater', mesh: m, pos: m.position, vel, life, ownGeo: false, ph: rand(0, 6), landed: false, update: updateFloater });
}
function updateFloater(pr, dt) {
    if (pr.landed) { pr.mesh.children[0].visible = false; return; }
    pr.ph += dt * 4;
    pr.vel.y = Math.max(pr.vel.y - 14 * dt, -2.4);
    pr.vel.x *= Math.pow(0.4, dt); pr.vel.z *= Math.pow(0.4, dt);
    const sway = Math.sin(pr.ph);
    pr.pos.x += (pr.vel.x + sway * 1.1) * dt; pr.pos.z += pr.vel.z * dt; pr.pos.y += pr.vel.y * dt;
    pr.mesh.rotation.set(sway * 0.5, pr.ph * 0.5, 0);
    if (hitsPlayer(pr, 0.5)) {
        if (shieldBlocks(pr.pos, pr.vel)) blockFx(pr.pos.clone()); else hurtPlayer(pr.pos, { knock: 3 });
        killProj(pr); return;
    }
    const g = groundAt(G.world.solids, pr.pos.x, pr.pos.z, pr.pos.y + 0.3);
    if (pr.pos.y <= g + 0.05) { pr.pos.y = g + 0.03; pr.landed = true; pr.life = Math.min(pr.life, 1.2); pr.mesh.rotation.set(-Math.PI / 2, pr.ph, 0); }
    else if (pr.pos.y < -10) killProj(pr);
}

// --- MOTOR ---
// cfg: { name, hp, build, talk: {sfx, text?}, keep, speed, moves: [...], prep: {ad: {t, warn, color, sfx?}}, height, onZero(b)? }
function spawnHuman(scene, pos, cfg) {
    const m = cfg.build();
    m.root.position.copy(pos); scene.add(m.root);
    const hp = Math.max(8, Math.round(cfg.hp * diff().boss));
    const b = {
        m, cfg, root: m.root, pos: m.root.position, name: cfg.name, hp, maxHp: hp, dead: false, deadT: 0, home: pos.clone(),
        facing: 0, st: 'talk', t: 0, timer: 1.4, attacks: 0, phase: 0, hurtT: 0, rage: false, bubble: null, guard: 0,
        update: dt => update(b, dt),
        hitTest: pt => Math.abs(pt.x - b.pos.x) < 0.6 && Math.abs(pt.z - b.pos.z) < 0.6 && pt.y > b.pos.y && pt.y < b.pos.y + cfg.height + 0.2,
        onHammer: point => damage(b, 2, point, 'hammer'),
        onAmmo: p => damage(b, 1, p.pos, 'ammo'),
        onRemove: () => clearBubble(b),
        reset: () => { b.hp = b.maxHp; b.pos.copy(b.home); b.st = 'walk'; b.timer = 1.5; b.rage = false; b.guard = 0; pose(b); setBossBar(b); cfg.onReset && cfg.onReset(b); }
    };
    // Karşılaşma: canavar konuşur (ağzı oynar), en çok 4 sn bekler; ses arkada sürer
    const dur = playSfx(cfg.talk.sfx, { vol: 1 }) || 2.5;
    b.t = Math.min(4, dur + 0.3); b.talkLen = b.t;
    if (cfg.talk.text) { b.bubble = textSprite(cfg.talk.text, { size: 44, height: 0.42, color: '#111827', bg: 'rgba(248,250,252,0.96)' }); b.bubble.position.set(0, cfg.height + 0.7, 0); m.root.add(b.bubble); }
    toast(`BÖLÜM SONU CANAVARI: ${cfg.name}!`, 2600, '#fca5a5');
    G.boss = b;
    showBossBar(b);
    return b;
}
function clearBubble(b) { if (b.bubble) { b.bubble.parent && b.bubble.parent.remove(b.bubble); disposeSprite(b.bubble); b.bubble = null; } }
function pose(b) {
    const m = b.m; m.armL.rotation.set(0, 0, 0); m.armR.rotation.set(0, 0, 0); m.body.position.y = 0; m.body.rotation.set(0, 0, 0);
    if (m.heart) m.heart.visible = false;
    b.cfg.restPose && b.cfg.restPose(m);
}
const talkMouth = (m, open) => { m.mouth.scale.y = 0.025 * (1 + open * 3); m.mouth.position.y = 0.165 - open * 0.02; };

function update(b, dt) {
    const p = G.player, m = b.m, S = diff(), C = b.cfg;
    if (b.hurtT > 0) b.hurtT -= dt;
    if (b.guard > 0) b.guard -= dt;
    m.root.visible = !(b.hurtT > 0 && Math.floor(b.hurtT * 14) % 2 === 0);
    if (b.dead) {   // sendeler, dizüstü çöker; sonra hücre iner (jailOutro)
        b.deadT += dt;
        m.body.position.y = -Math.min(0.25, b.deadT * 0.5); m.body.rotation.x = Math.min(0.25, b.deadT * 0.5);
        talkMouth(m, 0.2);
        if (b.deadT > 1.6 && !b.reported) { b.reported = true; G.onBossDefeated && G.onBossDefeated(); }
        return;
    }
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, d = Math.hypot(dx, dz), toP = Math.atan2(dx, dz);
    if (b.st !== 'dash') b.facing = dampAngle(b.facing, toP, 4, dt);
    b.t -= dt;
    const sp = (b.rage ? 1.3 : 1) * S.speed * (C.speed || 1);
    let mouth = 0;
    if (b.st === 'talk') {
        mouth = Math.abs(Math.sin(G.time * 12));
        C.talkPose && C.talkPose(m, G.time);
        if (b.t <= 0) { clearBubble(b); pose(b); b.st = 'walk'; }
    } else if (b.st === 'walk') {
        if (d > (C.keep || 4)) {
            b.pos.x = clamp(b.pos.x + Math.sin(toP) * 1.3 * sp * dt, -ARENA.hw + 1, ARENA.hw - 1);
            b.pos.z = clamp(b.pos.z + Math.cos(toP) * 1.3 * sp * dt, ARENA.z1 + 1, ARENA.z0 - 1);
            b.phase += dt * 6; walkPose(m, b.phase, 0.7);
        } else walkPose(m, b.phase, 0);
        C.restPose && C.restPose(m, G.time);
        b.timer -= dt;
        if (!p.dead && d < 30 && b.timer <= 0 && b.guard <= 0) {
            const M = C.moves(b); b.next = M[b.attacks % M.length]; b.attacks++;
            const P = C.prep[b.next];
            b.st = 'prep'; b.t = b.prepT = P.t;
            floatText(P.warn, b.pos.clone().setY(C.height + 0.6), P.color, 0.5, Math.max(0.9, P.t));
            if (P.sfx) { const len = playSfx(P.sfx, { vol: 1 }); if (len) b.t = b.prepT = Math.max(P.t, Math.min(2.2, len)); }
            walkPose(m, 0, 0);
        }
    } else if (b.st === 'prep') {   // hazırlanır: modelin kendi pozu
        const k = 1 - Math.max(0, b.t) / b.prepT;
        C.prep[b.next].pose(m, k, G.time);
        if (b.next === 'speech' || b.next === 'shout') mouth = Math.abs(Math.sin(G.time * 14));
        if (b.t <= 0) {
            C.fire[b.next](b);
            if (b.next === 'dash') { b.st = 'dash'; b.t = 1.1; b.dashDir = toP; floatText('KOŞ!', b.pos.clone().setY(C.height + 0.6), '#38bdf8', 0.5, 0.8); }
            else { b.st = 'recover'; b.t = 0.45; }
        }
    } else if (b.st === 'dash') {   // maraton koşusu: dümdüz hızla koşar, üstüne zıpla ya da kenara çekil
        const v = 11 * S.speed;
        b.facing = b.dashDir;
        b.pos.x += Math.sin(b.dashDir) * v * dt; b.pos.z += Math.cos(b.dashDir) * v * dt;
        b.phase += dt * 16; walkPose(m, b.phase, 1.2);
        if (Math.random() < 0.4) burst(b.pos.clone().setY(0.1), { n: 1, color: '#d6d3d1', speed: 1, up: 1, size: 0.15, life: 0.4 });
        const out = Math.abs(b.pos.x) > ARENA.hw - 1 || b.pos.z > ARENA.z0 - 1 || b.pos.z < ARENA.z1 + 1;
        b.pos.x = clamp(b.pos.x, -ARENA.hw + 1, ARENA.hw - 1); b.pos.z = clamp(b.pos.z, ARENA.z1 + 1, ARENA.z0 - 1);
        if (b.t <= 0 || out) { b.st = 'recover'; b.t = 0.6; walkPose(m, 0, 0); addTrauma(out ? 0.25 : 0); }
    } else if (b.st === 'recover') {
        if (b.t <= 0) { pose(b); b.st = 'walk'; b.timer = (b.rage ? 0.9 : 1.4) * S.fire; }
    }
    m.root.rotation.y = b.facing;
    talkMouth(m, mouth);
    const angry = b.st === 'prep' || b.rage;
    m.brows.forEach((br, i) => { br.rotation.z = (i ? -1 : 1) * (angry ? 0.3 : -0.08); });
    C.tick && C.tick(b, dt);

    // Temas: üstüne zıplarsa hasar, yandan değerse can kaybı
    if (!p.dead && Math.abs(dx) < 0.75 && Math.abs(dz) < 0.75) {
        const head = b.pos.y + C.height;
        if (p.vel.y < 0 && p.pos.y > head - 0.5 && p.pos.y < head + 0.5) { bouncePlayer(12); damage(b, 2, b.pos.clone().setY(head), 'stomp'); }
        else if (p.pos.y < head - 0.5 && b.st !== 'talk') hurtPlayer(b.pos, { knock: b.st === 'dash' ? 10 : 7 });
    }
}

function damage(b, n, point, how) {
    if (b.dead || b.st === 'talk') return;
    if (b.guard > 0) { blockFx(point.clone ? point.clone() : b.pos.clone().setY(1.4)); return; }
    if (b.hurtT > 0 && how !== 'ammo') return;
    b.hp -= n; b.hurtT = how === 'ammo' ? 0.12 : 0.45;
    setBossBar(b);
    playSfx('hit', { rate: 0.85, vol: 0.9 }); addTrauma(how === 'ammo' ? 0.08 : 0.4); if (how !== 'ammo') G.hitStop = 0.08;
    spawnFx('pow', point.clone ? point.clone() : b.pos.clone().setY(1.4), 1.2);
    burst(b.pos.clone().setY(1.3), { n: 10, color: b.cfg.hitColors, speed: 4, up: 4 });
    if (b.st === 'prep' && how !== 'ammo') { pose(b); b.st = 'walk'; b.timer = 1; }   // balyoz hazırlığı keser
    if (!b.rage && b.hp <= b.maxHp / 2) {
        b.rage = true;
        floatText(b.cfg.rageText, b.pos.clone().setY(b.cfg.height + 1), '#ef4444', 0.7, 1.8); addTrauma(0.3);
    }
    if (b.hp <= 0) {
        if (b.cfg.onZero && b.cfg.onZero(b)) return;   // ör. EKREM: seçim tekrarı
        defeat(b);
    }
}
function defeat(b) {
    b.dead = true; b.deadT = 0; clearBubble(b); pose(b);
    if (b.stamp) { b.m.root.remove(b.stamp); disposeSprite(b.stamp); b.stamp = null; }
    addScore(20000);
    spawnFx('pow', b.pos.clone().setY(1.5), 2);
    burst(b.pos.clone().setY(1.3), { n: 30, color: ['#e30a17', '#ffffff', ...b.cfg.hitColors], speed: 7, up: 8, size: 0.2, life: 1.2 });
    playSfx('boom', { vol: 0.9 }); addTrauma(0.7);
    G.projectiles.forEach(p => { if (p.type === 'floater') p.life = 0; });
}
function shoutRings(b, double) {
    const f = new THREE.Vector3(Math.sin(b.facing) * 0.8, 0, Math.cos(b.facing) * 0.8), at = b.pos.clone().add(f);
    makeRing(at, { speed: 7 * diff().speed, maxR: 12 });
    if (double) setTimeout(() => { if (G.boss === b && !b.dead) makeRing(at, { speed: 7 * diff().speed, maxR: 12 }); }, 450);
    burst(at.clone().setY(0.1), { n: 14, color: ['#d6d3d1', '#fde047'], speed: 4, up: 2, size: 0.14, life: 0.5 });
    playSfx('hit', { rate: 0.5, vol: 0.8 }); addTrauma(0.35);
}

// --- SELO ---
const SELO_PREP = {
    saz: { t: 0.7, warn: '♪ ♫ ♪', color: '#e879f9', pose: (m, k, t) => { m.armR.rotation.set(-0.9 + Math.sin(t * 30) * 0.25, 0, -0.5); } },
    aihm: { t: 0.7, warn: 'AİHM KARARI!', color: '#60a5fa', pose: (m, k, t) => { m.armL.rotation.set(-2.6 * k, 0, 0.3); m.armR.rotation.set(-2.6 * k, 0, -0.3); } },
    speech: { t: 0.9, warn: 'SENİ BAŞKAN...', color: '#fde047', pose: (m, k, t) => { m.armR.rotation.set(-1.4 - Math.sin(t * 10) * 0.3, 0, -0.2); m.body.position.y = -0.05 * k; } }
};
const SELO = {
    name: 'SELO', hp: 24, build: buildSelo, height: 2.05, keep: 4.5, speed: 1, talk: { sfx: 'selo' }, rageText: 'BU DUVARLAR BENİ DURDURAMAZ!',
    hitColors: ['#1e293b', '#fde047', '#e0ac69'],
    moves: () => ['saz', 'aihm', 'speech'], prep: SELO_PREP,
    fire: {
        saz: b => { volley(b, 'note', 5); for (let i = 0; i < 3; i++) playSfx('hit', { rate: 1.6 + i * 0.3, vol: 0.25 }); },
        aihm: b => rain('aihm', 6),
        speech: b => { floatText('YAPTIRMAYACAĞIZ!', b.pos.clone().setY(2.9), '#fde047', 0.7, 1.4); shoutRings(b, true); }
    },
    talkPose: (m, t) => { m.armR.rotation.set(-0.9 + Math.sin(t * 26) * 0.2, 0, -0.5); },   // konuşurken bağlama çalar
    restPose: (m) => { m.armL.rotation.set(-0.9, 0, 0.6); }                               // sol el bağlamanın sapında
};
export function spawnSelo(scene, pos) { return spawnHuman(scene, pos, SELO); }

// --- EKREM ---
const EKREM_PREP = {
    heart: { t: 0.7, warn: '♥ ♥ ♥', color: '#f43f5e', pose: (m, k) => { m.armL.rotation.set(-2.9 * k, 0, -0.35 * k); m.armR.rotation.set(-2.9 * k, 0, 0.35 * k); m.heart.visible = k > 0.5; } },
    votes: { t: 0.7, warn: '✔ EVET', color: '#4ade80', pose: (m, k, t) => { m.armR.rotation.set(-2.7 * k, 0, -0.2 + Math.sin(t * 12) * 0.25); } },
    shout: { t: 0.9, warn: 'HER ŞEY...', color: '#fde047', sfx: 'ekrem', pose: (m, k, t) => { m.armL.rotation.set(-1.2, 0, 0.4); m.armR.rotation.set(-1.2, 0, -0.4); m.body.position.y = -0.05 * k; } },
    dash: { t: 0.8, warn: 'MARATON!', color: '#38bdf8', pose: (m, k, t) => { m.body.rotation.x = 0.25 * k; m.body.position.y = Math.sin(t * 30) * 0.02; } }
};
const EKREM = {
    name: 'EKREM', hp: 16, build: buildEkrem, height: 2.2, keep: 4.2, speed: 1.1, talk: { sfx: 'ekrem', text: 'Her şey çok güzel olacak!' }, rageText: 'HER ŞEY ÇOK GÜZEL OLACAK!',
    hitColors: ['#1e3a8a', '#fde047', '#eac39f'],
    moves: b => b.rerun ? ['heart', 'votes', 'shout', 'dash'] : ['heart', 'votes'], prep: EKREM_PREP,
    fire: {
        heart: b => { b.m.heart.visible = false; volley(b, 'heart', 5); },
        votes: b => rain('vote', 7),
        shout: b => { floatText('...ÇOK GÜZEL OLACAK!', b.pos.clone().setY(3), '#fde047', 0.6, 1.4); shoutRings(b, false); },
        dash: b => {}
    },
    restPose: (m) => {},
    // İlk yenilgide: YSK seçimi iptal eder; seçim tekrarı (daha büyük, daha güçlü, yeni saldırılar)
    onZero: b => {
        if (b.rerun) return false;
        startRerun(b, false);
        return true;
    },
    onReset: b => { if (b.rerun) startRerun(b, true); },
    tick: (b, dt) => {
        if (b.stamp) {
            b.stampT -= dt;
            const k = b.stampT;
            b.stamp.material.opacity = Math.min(1, k / 0.6);
            b.stamp.scale.setScalar(1 + Math.max(0, k - 2.2) * 3);
            if (k <= 0) { b.m.root.remove(b.stamp); disposeSprite(b.stamp); b.stamp = null; }
        }
    }
};
function startRerun(b, quiet) {
    b.rerun = true; b.name = 'EKREM: SEÇİM TEKRARI';
    document.querySelector('#boss-bar .boss-name').textContent = b.name;
    const hp = Math.max(10, Math.round(22 * diff().boss));
    b.hp = b.maxHp = hp; b.rage = false; setBossBar(b);
    b.m.root.scale.setScalar(1.08 * 1.15);
    if (quiet) return;
    b.guard = 3.2; b.st = 'walk'; b.timer = 3.4; pose(b);
    G.projectiles.forEach(p => { if (p.type === 'floater') p.life = 0; });
    // kırmızı "İPTAL" damgası
    b.stamp = textSprite('İPTAL', { size: 90, height: 0.9, color: '#dc2626', bg: 'rgba(254,226,226,0.85)', stroke: '#7f1d1d' });
    b.stamp.position.set(0, 1.3, 0.6); b.stamp.material.rotation = -0.25; b.m.root.add(b.stamp); b.stampT = 2.8;
    addTrauma(0.8); playSfx('hit', { rate: 0.35, vol: 1 });
    toast('YSK: SEÇİM İPTAL!', 1400, '#ef4444');
    setTimeout(() => {
        if (G.boss !== b || b.dead) return;
        toast('SEÇİM YENİLENİYOR!', 1600, '#fde047');
        playSfx('ekrem', { vol: 1 });
        b.st = 'talk'; b.t = 1.6;
    }, 1400);
    setTimeout(() => { if (G.boss === b && !b.dead) toast('FARK: 13 BİN → 800 BİN!', 2200, '#4ade80'); }, 3100);
}
export function spawnEkrem(scene, pos) { return spawnHuman(scene, pos, EKREM); }

// --- BÖLÜM SONU: HÜCRE ---
// Yukarıdan parmaklıklı hücre iner, üstünde tabela; canavar içeride (SELO bağlama çalar, EKREM el sallar).
// events: [[saniye, iş]] — yazılar, HIRHIZ'ın balonu
function bubbleOn(owner, text) {
    const s = textSprite(text, { size: 44, height: 0.42, color: '#111827', bg: 'rgba(248,250,252,0.96)' });
    s.position.set(0, 2.6, 0); owner.add(s); return s;
}
export function jailOutro(scene, { sign, events, end, anim, dropAt = 0 }) {
    const b = G.boss, m = b.m, at = b.pos.clone();
    const o = { t: 0, bubbles: [], done: new Set() };
    // ayağa kalkar
    m.body.position.y = 0; m.body.rotation.set(0, 0, 0); pose(b);
    const cage = new THREE.Group(); cage.position.set(at.x, 12, at.z); scene.add(cage);
    const W = 1.3, H = 2.9, bar = mat('#6b7280');
    for (let i = 0; i < 4; i++) {
        const side = i;
        for (let k = -3; k <= 3; k++) {
            const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, H, 6), bar);
            const u = k / 3 * W;
            if (side === 0) r.position.set(u, H / 2, W); else if (side === 1) r.position.set(u, H / 2, -W); else if (side === 2) r.position.set(W, H / 2, u); else r.position.set(-W, H / 2, u);
            r.castShadow = true; cage.add(r);
        }
    }
    cage.add(box(W * 2 + 0.2, 0.15, W * 2 + 0.2, '#4b5563', 0, H, 0));
    [0.05, H * 0.5].forEach(y => { cage.add(box(W * 2 + 0.1, 0.08, 0.08, '#4b5563', 0, y, W)); cage.add(box(W * 2 + 0.1, 0.08, 0.08, '#4b5563', 0, y, -W)); cage.add(box(0.08, 0.08, W * 2 + 0.1, '#4b5563', W, y, 0)); cage.add(box(0.08, 0.08, W * 2 + 0.1, '#4b5563', -W, y, 0)); });
    const st = canvasTex(256, 64, (g, Wd, Hh) => { g.fillStyle = '#1e3a8a'; g.fillRect(0, 0, Wd, Hh); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitText(g, sign, Wd / 2, Hh / 2 + 2, Wd - 16, 44); });
    const sgn = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: st, side: THREE.DoubleSide })); sgn.position.set(0, H + 0.4, 0); cage.add(sgn);
    o.update = (dt) => {
        o.t += dt;
        const dropK = clamp((o.t - dropAt) / 0.45, 0, 1);
        cage.position.y = 12 * (1 - dropK) * (1 - dropK);
        if (dropK >= 1 && !o.landed) {
            o.landed = true; addTrauma(0.7); playSfx('hit', { rate: 0.4, vol: 1 });
            burst(at.clone().setY(0.1), { n: 20, color: ['#9ca3af', '#d6d3d1'], speed: 4, up: 3, size: 0.18 });
            floatText('İÇERİ!', at.clone().setY(3.6), '#f87171', 0.7, 1.6);
        }
        sgn.lookAt(G.camera.position.x, sgn.getWorldPosition(new THREE.Vector3()).y, G.camera.position.z); sgn.rotation.x = 0; sgn.rotation.z = 0;
        const cp = G.camera.position;
        b.facing = dampAngle(b.facing, Math.atan2(cp.x - at.x, cp.z - at.z), 3, dt); m.root.rotation.y = b.facing;
        anim(m, o.t);
        for (const [time, fn] of events) if (o.t >= time && !o.done.has(time)) { o.done.add(time); fn(o, at); }
        return o.t > end;
    };
    o.say = (text) => { const s = bubbleOn(G.player.m.root, text); o.bubbles.push(s); };
    o.remove = () => { scene.remove(cage); o.bubbles.forEach(s => { s.parent && s.parent.remove(s); disposeSprite(s); }); };
    return o;
}
export function seloJail(scene) {
    return jailOutro(scene, {
        sign: 'TUTUKLU', end: 6,
        anim: (m, t) => { m.armL.rotation.set(-0.9, 0, 0.6); if (t > 0.6) m.armR.rotation.set(-0.9 + Math.sin(t * 26) * 0.2, 0, -0.5); talkMouth(m, t > 0.6 && t < 2 ? Math.abs(Math.sin(t * 12)) : 0.3); },
        events: [
            [1.2, (o, at) => floatText('AİHM: DERHAL SERBEST BIRAKIN!', at.clone().setY(4.2), '#60a5fa', 0.6, 2.4)],
            [1.6, (o, at) => floatText('♪', at.clone().add(new THREE.Vector3(0.5, 2.6, 0)), '#e879f9', 0.6, 1.4)],
            [2.6, (o, at) => floatText('♫', at.clone().add(new THREE.Vector3(-0.4, 2.7, 0)), '#e879f9', 0.6, 1.4)],
            [3.0, (o) => { o.say('TANIMIYORUZ!'); toast('AİHM KARARI: TANIMIYORUZ!', 2200, '#ef4444'); }],
            [4.0, (o, at) => floatText('♪', at.clone().add(new THREE.Vector3(0.3, 2.6, 0)), '#e879f9', 0.6, 1.4)]
        ]
    });
}
export function ekremJail(scene) {
    return jailOutro(scene, {
        sign: 'SİLİVRİ', end: 6.4, dropAt: 0.7,
        anim: (m, t) => { const wave = t > 1.2; m.armR.rotation.set(wave ? -2.7 : 0, 0, wave ? -0.2 + Math.sin(t * 9) * 0.3 : 0); talkMouth(m, t > 1.3 && t < 3 ? Math.abs(Math.sin(t * 12)) : 0.4); },
        events: [
            [0.05, (o, at) => { floatText('DİPLOMA İPTAL!', at.clone().setY(3.6), '#ef4444', 0.7, 1.6); playSfx('hit', { rate: 0.5, vol: 0.8 }); }],
            [1.3, () => playSfx('ekrem', { vol: 1 })],
            [2.0, (o, at) => floatText('15 MİLYON OY: ADAY!', at.clone().setY(4.2), '#4ade80', 0.6, 2.4)],
            [2.4, (o, at) => floatText('♥', at.clone().add(new THREE.Vector3(0.4, 2.8, 0)), '#f43f5e', 0.7, 1.5)],
            [3.4, (o) => { o.say('ADAY OLAMAZ!'); }],
            [3.6, (o, at) => floatText('♥', at.clone().add(new THREE.Vector3(-0.3, 2.9, 0)), '#f43f5e', 0.7, 1.5)]
        ]
    });
}
