// HIRHIZ 3D — 4. bölüm canavarı FETÖ: bastonlu, kambur yaşlı adam (koyu palto, dazlak kafa, beyaz yan saçlar, gür beyaz kaşlar).
// Karşılaşınca HIRHIZ "Hocam gel, bu hasret bitsin!" der (sfx/hasret.mp3, balon HIRHIZ'ın başında); FETÖ o sırada bekler.
// Ağır ağır yaklaşır. Saldırıları (her biri önce belli eder):
//   1 DOLAR: avucundan 6 tane 1 dolar savurur; yükselip yaprak gibi sallanarak süzülür (kırmızı parıltılı = tehlikeli)
//   BASTON (her üçüncü): bastonu havaya kaldırır ("HOOOP!"), yere vurur → yerde şok dalgası (üstünden zıpla)
// Canı yarıya inince "YA ALLAH!" diye öfkelenir (sfx/feto2_greet.mp3), hızlanır.
// Hasar: balyoz 2, üstüne zıplama 2, kelepçe 1.
// 8. bölüm FETÖ: SON (opts.son): "YA ALLAH!" diye gelir, daha hızlı kovalar, oyuncu rafa çıkınca zıplayıp peşinden gelir (moveBody fiziği).
import * as THREE from 'three';
import { G, diff, addScore, toast } from './state.js?v=13';
import { hurtPlayer, shieldBlocks, blockFx, bouncePlayer } from './player.js?v=13';
import { burst, floatText, spawnFx, addTrauma } from './fx.js?v=13';
import { playSfx } from './audio.js?v=13';
import { makeRing } from './hazards.js?v=13';
import { limb, walkPose } from './models.js?v=13';
import { groundAt, moveBody } from './physics.js?v=13';
import { box, mat, canvasTex, textSprite, disposeSprite, dampAngle, clamp, rand } from './util.js?v=13';
import { ARENA } from './world.js?v=13';
import { hitsPlayer, killProj } from './enemies.js?v=13';
import { showBossBar, setBossBar } from './boss_core.js?v=13';

const TOP = 1.9, SKIN = '#e8c4a0';

const TILT = 0.25;   // kambur: gövde öne eğik
function buildFeto() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const COAT = '#3b3f46', COAT_D = '#2b2f36';
    const legL = limb(body, -0.12, 0.7, 0, 0.19, 0.68, 0.21, '#1f2430', '#0b0b0b');
    const legR = limb(body, 0.12, 0.7, 0, 0.19, 0.68, 0.21, '#2a303c', '#0b0b0b');
    // Uzun palto: etek dizlere kadar iner (gövdeye bağlı, bacaklar altından görünür)
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.38, 0.5, 10), mat(COAT)); skirt.position.y = 0.52; skirt.castShadow = true; body.add(skirt);
    const torso = new THREE.Group(); torso.position.y = 0.72; torso.rotation.x = TILT; body.add(torso);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.62, 10), mat(COAT)); chest.position.y = 0.3; chest.castShadow = true; torso.add(chest);
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), mat(COAT)); hump.scale.set(1.1, 0.8, 0.8); hump.position.set(0, 0.56, -0.08); torso.add(hump);   // kambur sırt
    torso.add(box(0.15, 0.24, 0.03, '#f8fafc', 0, 0.48, 0.28, false));                         // gömlek
    torso.add(box(0.05, 0.26, 0.03, '#7f1d1d', 0, 0.42, 0.295, false));                        // kırmızı kravat
    [-1, 1].forEach(s => { const l = box(0.09, 0.3, 0.03, COAT_D, s * 0.1, 0.44, 0.285, false); l.rotation.z = s * 0.35; torso.add(l); });   // yakalar
    for (let i = 0; i < 3; i++) torso.add(box(0.04, 0.04, 0.03, '#111827', -0.07, 0.24 - i * 0.12, 0.3, false));
    // Kafa: dazlak, iri burun, sarkık göz kapakları, gür beyaz kaşlar, kulakların üstünde beyaz saçlar
    const head = new THREE.Group(); head.position.set(0, 0.66, 0.12); head.rotation.x = -TILT - 0.05; torso.add(head);
    head.add(box(0.13, 0.12, 0.13, '#d9ae86', 0, 0.03, 0));
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(SKIN)); skull.scale.set(1, 1.18, 1.02); skull.position.y = 0.27; skull.castShadow = true; head.add(skull);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff7ed', transparent: true, opacity: 0.45 })); shine.scale.set(1.4, 0.5, 1); shine.position.set(-0.05, 0.47, 0.06); head.add(shine);
    const hairM = mat('#e5e7eb');
    for (let i = 0; i < 9; i++) {   // arkada nal biçiminde beyaz saç
        const a = Math.PI * 0.2 + i / 8 * Math.PI * 1.6, h = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), hairM);
        h.position.set(Math.cos(a) * 0.19, 0.24 + Math.sin(i) * 0.01, -Math.sin(a) * 0.17 - 0.02); head.add(h);
    }
    [-1, 1].forEach(s => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mat('#e0b48f')); ear.scale.set(0.5, 1.2, 0.9); ear.position.set(s * 0.205, 0.26, 0.01); head.add(ear);
    });
    const brows = [];
    [-1, 1].forEach(s => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.06), mat('#f3f4f6')); b.position.set(s * 0.075, 0.355, 0.17); head.add(b); brows.push(b);
        head.add(box(0.07, 0.035, 0.02, '#ffffff', s * 0.075, 0.305, 0.19, false));           // göz akı
        head.add(box(0.028, 0.028, 0.02, '#1c1917', s * 0.072, 0.302, 0.198, false));         // göz bebeği
        head.add(box(0.08, 0.022, 0.03, '#d9ae86', s * 0.075, 0.322, 0.188, false));          // sarkık göz kapağı
        head.add(box(0.06, 0.02, 0.02, '#c99a74', s * 0.075, 0.275, 0.19, false));            // göz altı torbası
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat('#e0b08a')); nose.scale.set(0.9, 1.3, 1.1); nose.position.set(0, 0.245, 0.2); head.add(nose);
    [-1, 1].forEach(s => head.add(box(0.012, 0.09, 0.02, '#b08968', s * 0.07, 0.19, 0.178, false)));   // yanak çizgileri
    const mouth = box(0.09, 0.018, 0.02, '#8a5a3c', 0, 0.165, 0.19, false); head.add(mouth);
    // Kollar: sol elde 1 dolarlar, sağ el bastonun sapında
    const armL = limb(torso, -0.36, 0.58, 0, 0.14, 0.5, 0.16, COAT_D);
    const armR = limb(torso, 0.36, 0.58, 0, 0.14, 0.5, 0.16, '#353a42');
    armL.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.53, 0, false)); armR.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.53, 0, false));
    // Baston: elin içinde; sap elin üstünde, çubuk aşağı (update her karede dik tutar)
    const cane = new THREE.Group(); cane.position.y = -0.53; armR.add(cane);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.84, 6), mat('#6b3f1d')); stick.position.y = -0.4; stick.castShadow = true; cane.add(stick);
    const crook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 5, 10, Math.PI), mat('#6b3f1d')); crook.position.set(0, 0.02, 0.06); crook.rotation.y = Math.PI / 2; cane.add(crook);
    cane.add(box(0.03, 0.03, 0.03, '#d4d4d8', 0, -0.81, 0, false));                             // ucu
    const cash = new THREE.Group(); cash.position.y = -0.58; armL.add(cash); cash.visible = false;
    for (let i = 0; i < 3; i++) cash.add(box(0.2, 0.01, 0.09, '#a3e635', i * 0.03, i * 0.02, 0, false));
    root.scale.setScalar(1.05);
    return { root, body, legL, legR, armL, armR, torso, head, cane, cash, brows, mouth };
}

export function spawnFeto(scene, pos, opts = {}) {
    const m = buildFeto();
    m.root.position.copy(pos); scene.add(m.root);
    const son = !!opts.son;
    const hp = Math.max(10, Math.round((son ? 24 : 20) * diff().boss));
    const b = {
        m, root: m.root, pos: m.root.position, name: son ? 'FETÖ: SON' : 'FETÖ', hp, maxHp: hp, dead: false, deadT: 0, son, home: pos.clone(),
        vel: new THREE.Vector3(), grounded: true, jumpCd: 0,
        facing: 0, st: 'talk', t: 0, timer: 1.2, attacks: 0, phase: 0, hurtT: 0, rage: false, bubble: null,
        update: dt => update(b, dt),
        hitTest: pt => Math.abs(pt.x - b.pos.x) < 0.55 && Math.abs(pt.z - b.pos.z) < 0.55 && pt.y > b.pos.y && pt.y < b.pos.y + TOP + 0.2,
        onHammer: point => damage(b, 2, point, 'hammer'),
        onAmmo: p => damage(b, 1, p.pos, 'ammo'),
        onRemove: () => clearBubble(b),
        reset: () => { b.hp = b.maxHp; b.pos.copy(b.home); b.vel.set(0, 0, 0); b.st = 'walk'; b.timer = 1.5; b.rage = false; setBossBar(b); }
    };
    if (son) {   // 8. bölüm: FETÖ "YA ALLAH!" diye bağırarak gelir
        b.t = Math.min(2.5, (playSfx('yaallah', { vol: 1 }) || 1.5) + 0.4);
        floatText('YA ALLAH!', b.pos.clone().setY(TOP + 1), '#ef4444', 0.8, 2);
        toast('BÖLÜM SONU CANAVARI: FETÖ: SON!', 2600, '#fca5a5');
        G.boss = b; showBossBar(b);
        return b;
    }
    // Karşılaşma: HIRHIZ konuşur (balon başında), FETÖ bekler
    const dur = playSfx('hasret', { vol: 1 }) || 2.5;
    b.t = Math.min(4, dur + 0.3);
    b.bubble = textSprite('Hocam gel, bu hasret bitsin!', { size: 44, height: 0.42, color: '#111827', bg: 'rgba(248,250,252,0.96)' });
    b.bubble.position.set(0, 2.6, 0); G.player.m.root.add(b.bubble);
    toast('BÖLÜM SONU CANAVARI: FETÖ!', 2600, '#fca5a5');
    G.boss = b;
    showBossBar(b);
    return b;
}
function clearBubble(b) { if (b.bubble) { b.bubble.parent && b.bubble.parent.remove(b.bubble); disposeSprite(b.bubble); b.bubble = null; } }
function pose(b) { const m = b.m; m.armL.rotation.set(0, 0, 0); m.armR.rotation.set(0, 0, 0); m.cash.visible = false; m.body.position.y = 0; }

function update(b, dt) {
    const p = G.player, m = b.m, S = diff();
    if (b.hurtT > 0) b.hurtT -= dt;
    m.root.visible = !(b.hurtT > 0 && Math.floor(b.hurtT * 14) % 2 === 0);
    if (b.dead) {
        b.deadT += dt;
        m.body.rotation.x = -Math.min(Math.PI / 2, b.deadT * 3);
        if (b.son && !b.graving) { b.vel.set(0, Math.max(b.vel.y - 30 * dt, -22), 0); const r = moveBody({ pos: b.pos, vel: b.vel, r: 0.4, h: 0.5 }, dt, G.world.solids); if (b.pos.y < -6) b.pos.y = 0; }
        if (b.deadT > 3 && !b.reported) { b.reported = true; G.onBossDefeated && G.onBossDefeated(); }
        return;
    }
    const dx = p.pos.x - b.pos.x, dz = p.pos.z - b.pos.z, d = Math.hypot(dx, dz), toP = Math.atan2(dx, dz);
    b.facing = dampAngle(b.facing, toP, 4, dt);
    b.t -= dt;
    const sp = (b.rage ? 1.3 : 1) * S.speed;
    if (b.son) chase(b, dt, d, toP, sp);
    if (b.st === 'talk') {
        m.armL.rotation.x = -0.5 + Math.sin(G.time * 3) * 0.2;
        if (b.t <= 0) { clearBubble(b); pose(b); b.st = 'walk'; }
    } else if (b.st === 'walk') {
        m.armR.rotation.x = -0.45;   // eli bastonun sapında
        if (b.son) { if (b.moving) { b.phase += dt * 7; walkPose(m, b.phase, 0.7); } else walkPose(m, b.phase, 0); }
        else if (d > 2.6) {
            b.pos.x = clamp(b.pos.x + Math.sin(toP) * 0.9 * sp * dt, -ARENA.hw + 1, ARENA.hw - 1);
            b.pos.z = clamp(b.pos.z + Math.cos(toP) * 0.9 * sp * dt, ARENA.z1 + 1, ARENA.z0 - 1);
            b.phase += dt * 4.5; walkPose(m, b.phase, 0.5);
        } else walkPose(m, b.phase, 0);
        b.timer -= dt;
        if (!p.dead && d < 30 && b.timer <= 0) {
            b.attacks++; b.next = b.attacks % 3 === 0 && b.grounded ? 'slam' : 'volley';
            b.st = 'crouch'; b.t = b.next === 'slam' ? 0.57 : 0.5;
            floatText(b.next === 'slam' ? 'HOOOP!' : 'AL!', b.pos.clone().setY(TOP + 0.5), '#fde047', 0.5, 0.9);
        }
    } else if (b.st === 'crouch') {   // hazırlanır: baston havaya kalkar ya da el geriye gider
        const k = 1 - Math.max(0, b.t) / (b.next === 'slam' ? 0.57 : 0.5);
        m.body.position.y = -0.08 * k;
        if (b.next === 'slam') m.armR.rotation.x = -0.45 - 2.4 * k;
        else { m.armL.rotation.x = 1.2 * k; m.cash.visible = true; }
        if (b.t <= 0) {
            if (b.next === 'volley') { volley(b); m.armL.rotation.x = -1.6; }
            else slam(b);
            b.st = 'recover'; b.t = 0.35; m.cash.visible = false;
        }
    } else if (b.st === 'recover') {
        if (b.next === 'slam') m.armR.rotation.x = -0.6;
        if (b.t <= 0) { pose(b); b.st = 'walk'; b.timer = (b.rage ? 0.9 : 1.4) * S.fire; }
    }
    m.root.rotation.y = b.facing;
    // Baston: yürürken yere dik (kolun ve kamburun açısını telafi eder); bastonla vururken kolla aynı doğrultuda havaya kalkar
    const up = b.st === 'crouch' && b.next === 'slam' ? 1 - Math.max(0, b.t) / 0.57 : 0;
    const keep = -(TILT + m.armR.rotation.x);
    m.cane.rotation.x = b.st === 'recover' && b.next === 'slam' ? keep - 0.9 : keep * (1 - up);
    // Kaşlar: kızınca çatılır
    const angry = b.st === 'crouch' || b.rage;
    m.brows.forEach((br, i) => { br.rotation.z = (i ? -1 : 1) * (angry ? 0.35 : -0.15); });
    m.mouth.scale.y = 0.018 * (b.st === 'crouch' || b.st === 'talk' ? 3 : 1);   // box() birim küpü ölçekler: asıl yükseklikle çarp

    // Temas: üstüne zıplarsa hasar, yandan değerse can kaybı
    if (!p.dead && Math.abs(dx) < 0.75 && Math.abs(dz) < 0.75) {
        const head = b.pos.y + TOP;
        if (p.vel.y < 0 && p.pos.y > head - 0.5 && p.pos.y < head + 0.5) { bouncePlayer(12); damage(b, 2, b.pos.clone().setY(head), 'stomp'); }
        else if (p.pos.y < head - 0.5 && b.st !== 'talk') hurtPlayer(b.pos, { knock: 7 });
    }
}

// FETÖ: SON kovalar: yürür (rafların kenarına çarpar), oyuncu yukarıdaysa ya da önü kapalıysa zıplar; raftan aşağı yürüyüp iner
const FETO_BODY = { r: 0.4, h: 1.9 };
function chase(b, dt, d, toP, sp) {
    const p = G.player;
    const walking = b.st === 'walk' && b.t <= 0 && d > 2.0;
    const v = walking ? 1.75 * sp * (b.grounded ? 1 : 2.4) : 0;
    b.vel.x = Math.sin(toP) * v; b.vel.z = Math.cos(toP) * v;
    b.vel.y = Math.max(b.vel.y - 30 * dt, -22);
    const res = moveBody({ pos: b.pos, vel: b.vel, r: FETO_BODY.r, h: FETO_BODY.h }, dt, G.world.solids);
    b.grounded = res.grounded; b.moving = v > 0;
    b.jumpCd -= dt;
    if (b.pos.y < -6) { b.pos.copy(b.home); b.vel.set(0, 0, 0); }
    if (b.grounded && b.st === 'walk' && !p.dead && b.jumpCd <= 0) {
        const above = p.pos.y > b.pos.y + 1 && d < 6;
        if (above || (res.wallHit && walking)) {
            b.vel.y = 13.8; b.grounded = false; b.jumpCd = 0.9;
            floatText('HOP!', b.pos.clone().setY(b.pos.y + TOP + 0.5), '#fde047', 0.45, 0.7);
        }
    }
}

function slam(b) {
    const f = new THREE.Vector3(Math.sin(b.facing) * 0.8, 0, Math.cos(b.facing) * 0.8);
    const at = b.pos.clone().add(f);
    makeRing(at, { speed: 7 * diff().speed, maxR: 11 });
    burst(at.clone().setY(0.1), { n: 14, color: ['#d6d3d1', '#a8a29e', '#fde047'], speed: 4, up: 2, size: 0.14, life: 0.5 });
    playSfx('hit', { rate: 0.5, vol: 0.8 }); addTrauma(0.35);
}

// --- 1 DOLAR: yükselir, yaprak gibi sallanarak süzülür; yere düşünce zararsız ---
let billTex = null;
const BILL_GEO = new THREE.PlaneGeometry(0.4, 0.19), GLOW_GEO = new THREE.PlaneGeometry(0.7, 0.45);
function oneDollar() {
    billTex = billTex || canvasTex(64, 30, (g) => {
        g.fillStyle = '#4d7c0f'; g.fillRect(0, 0, 64, 30); g.fillStyle = '#a3e635'; g.fillRect(3, 3, 58, 24);
        g.fillStyle = '#4d7c0f'; g.beginPath(); g.ellipse(32, 15, 9, 8, 0, 0, Math.PI * 2); g.fill();
        g.font = 'bold 12px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1', 12, 15); g.fillText('1', 52, 15);
        g.fillStyle = '#a3e635'; g.fillText('$', 32, 16);
    }, { pixel: true });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(GLOW_GEO, new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
    const bill = new THREE.Mesh(BILL_GEO, new THREE.MeshBasicMaterial({ map: billTex, side: THREE.DoubleSide })); bill.position.z = 0.01; g.add(bill);
    return g;
}
function volley(b) {
    const p = G.player, toP = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z), d = Math.hypot(p.pos.x - b.pos.x, p.pos.z - b.pos.z);
    const from = b.pos.clone().add(new THREE.Vector3(Math.sin(b.facing) * 0.4, 1.5, Math.cos(b.facing) * 0.4));
    for (let i = 0; i < 6; i++) {
        const a = toP + (i - 2.5) * 0.18, sp = Math.min(8, d * 0.55 + 1) * (0.7 + i % 3 * 0.15);
        const m = oneDollar(); m.position.copy(from); G.scene.add(m);
        G.projectiles.push({ type: 'dollar1', mesh: m, pos: m.position, vel: new THREE.Vector3(Math.sin(a) * sp, 7 + rand(0, 2), Math.cos(a) * sp),
                             life: 7, ownGeo: false, ph: rand(0, 6), landed: false, update: updateDollar });
    }
    playSfx('hit', { rate: 2, vol: 0.4 });
}
function updateDollar(pr, dt) {
    if (pr.landed) { pr.mesh.children[0].visible = false; return; }
    pr.ph += dt * 4;
    pr.vel.y = Math.max(pr.vel.y - 14 * dt, -2.2);   // yükselir, sonra yavaşça süzülür
    pr.vel.x *= Math.pow(0.4, dt); pr.vel.z *= Math.pow(0.4, dt);
    const sway = Math.sin(pr.ph);
    pr.pos.x += (pr.vel.x + sway * 1.2) * dt; pr.pos.z += pr.vel.z * dt; pr.pos.y += pr.vel.y * dt;
    pr.mesh.rotation.set(sway * 0.6, pr.ph * 0.5, 0);
    if (hitsPlayer(pr, 0.5)) {
        if (shieldBlocks(pr.pos, pr.vel)) blockFx(pr.pos.clone()); else hurtPlayer(pr.pos, { knock: 3 });
        killProj(pr); return;
    }
    const g = groundAt(G.world.solids, pr.pos.x, pr.pos.z, pr.pos.y + 0.3);
    if (pr.pos.y <= g + 0.05) { pr.pos.y = g + 0.03; pr.landed = true; pr.life = Math.min(pr.life, 1.2); pr.mesh.rotation.set(-Math.PI / 2, pr.ph, 0); }
    else if (pr.pos.y < -10) killProj(pr);
}

function damage(b, n, point, how) {
    if (b.dead || b.st === 'talk') return;
    if (b.hurtT > 0 && how !== 'ammo') return;
    b.hp -= n; b.hurtT = how === 'ammo' ? 0.12 : 0.45;
    setBossBar(b);
    playSfx('hit', { rate: 0.85, vol: 0.9 }); addTrauma(how === 'ammo' ? 0.08 : 0.4); if (how !== 'ammo') G.hitStop = 0.08;
    spawnFx('pow', point.clone ? point.clone() : b.pos.clone().setY(1.4), 1.2);
    burst(b.pos.clone().setY(1.3), { n: 10, color: ['#3b3f46', '#fde047', '#e8c4a0'], speed: 4, up: 4 });
    if (b.st === 'crouch' && how !== 'ammo') { pose(b); b.st = 'walk'; b.timer = 1; }   // balyoz hazırlığı keser
    if (!b.rage && b.hp <= b.maxHp / 2) {
        b.rage = true; playSfx('yaallah', { vol: 1 });
        floatText('YA ALLAH!', b.pos.clone().setY(TOP + 1), '#ef4444', 0.8, 1.8); addTrauma(0.3);
    }
    if (b.hp <= 0) defeat(b);
}
function defeat(b) {
    b.dead = true; b.deadT = 0; clearBubble(b);
    addScore(20000);
    spawnFx('boom', b.pos.clone().setY(0.2), 2);
    spawnFx('confetti', b.pos.clone().setY(3.2).add(new THREE.Vector3(-2, 0, 0)), 2, 0.3);
    spawnFx('confetti', b.pos.clone().setY(3.2).add(new THREE.Vector3(2, 0, 0)), 2, 0.6);
    burst(b.pos.clone().setY(1.3), { n: 30, color: ['#e30a17', '#ffffff', '#a3e635', '#3b3f46'], speed: 7, up: 8, size: 0.2, life: 1.2 });
    playSfx('boom', { vol: 0.9 }); addTrauma(0.9);
    floatText(b.son ? 'FETÖ: SON!' : 'HASRET BİTTİ!', b.pos.clone().setY(b.pos.y + 3.8), '#fde047', 0.8, 2.5);
    G.projectiles.forEach(p => { if (p.type === 'dollar1') p.life = 0; });
}
