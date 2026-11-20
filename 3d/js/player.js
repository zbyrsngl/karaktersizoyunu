// HIRHIZ 3D: oyuncu — kameraya göre yürüme, zıplama (tolerans, tampon, değişken yükseklik, tepede süzülme),
// balyoz (yakındaki düşmana kendiliğinden döner), kalkan (önden ve yukarıdan geleni durdurur), rüşvet atma, can sistemi.
import * as THREE from 'three';
import { buildHirhiz, walkPose } from './models.js?v=28';
import { moveBody } from './physics.js?v=28';
import { input } from './input.js?v=28';
import { G, diff, toast } from './state.js?v=28';
import { burst, addTrauma, floatText, spawnFx } from './fx.js?v=28';
import { playSfx, beep } from './audio.js?v=28';
import { clamp, damp, dampAngle, angDiff, canvasTex } from './util.js?v=28';
import { throwGrenade } from './grenade.js?v=28';
import { resetPowers } from './powerups.js?v=28';

const RUN = 6.5, ACC_G = 55, ACC_A = 24, DEC_G = 45, SPRINT = 1.6;   // Shift: hızlı koşu
const GRAV = 30, JUMP_V = 13.4, FALL_MULT = 1.6, APEX_V = 2.5, MAX_FALL = 22, CUT_V = 7.5;
const COYOTE = 0.12, BUFFER = 0.14;
const SWING = 0.4, SWING_HIT = 0.13, HAMMER_REACH = 2.1;
export const PLAYER_H = 1.85;

// remote: çok oyunculu oyunda arkadaşın karakteri (kukla): fiziği yok, ağdan gelen konumla oynar (net.js)
export function createPlayer(scene, { remote = false } = {}) {
    const m = buildHirhiz();
    scene.add(m.root);
    // Siper hâlindeki büyük kalkan (gövdenin önünde, yukarı eğik)
    const big = m.shield.clone(); big.scale.setScalar(2.1); big.rotation.set(-0.45, 0, 0); big.position.set(0.05, 0.62, 0.42);
    big.visible = false; m.torso.add(big);
    // Kalkan halesi: kalkan kaldırılınca önünde nabız gibi atan altın-yeşil ışık; saldırı durdurunca parlar
    const auraTex = canvasTex(128, 160, (g, W, H) => {
        const gr = g.createRadialGradient(W / 2, H / 2, 6, W / 2, H / 2, W * 0.62);
        gr.addColorStop(0, 'rgba(253,230,138,0.55)'); gr.addColorStop(0.45, 'rgba(74,222,128,0.28)'); gr.addColorStop(1, 'rgba(34,197,94,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    const aura = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.9), new THREE.MeshBasicMaterial({ map: auraTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    aura.position.z = 0.09; big.add(aura);
    const p = {
        m, big, aura, flash: 0, power: { speed: 0, hammer: 0, shield: 0 },
        pos: m.root.position, vel: new THREE.Vector3(), r: 0.32, h: PLAYER_H,
        facing: Math.PI, grounded: false, coyote: 0, buffer: 0, jumping: false,
        hp: diff().hp, maxHp: diff().hp, invuln: 0, mask: 0, slow: 0,
        swing: 0, swingHit: false, throwCd: 0, throwT: 0, grenCd: 0, noGrenT: 0, shield: false,
        squash: 0, phase: 0, dead: false, deadT: 0,
        safe: new THREE.Vector3(), lastGround: null, collected: 0
    };
    p.remote = remote;
    if (!remote) G.player = p;
    return p;
}

export function resetPlayer(p, at) {
    p.pos.copy(at); p.vel.set(0, 0, 0); p.facing = Math.PI; p.safe.copy(at);
    p.hp = p.maxHp = diff().hp; p.invuln = 0; p.mask = 0; p.slow = 0; p.swing = 0; p.dead = false; p.deadT = 0;
    p.m.root.rotation.set(0, p.facing, 0); p.m.root.visible = true; p.m.helmet.visible = false;
    // Ölüm pozunu (devrilme) ve bütün eklem açılarını sıfırla; yoksa "Tekrar dene"de karakter yamuk kalır
    const m = p.m;
    m.body.rotation.set(0, 0, 0); m.body.position.set(0, 0, 0); m.body.scale.set(1, 1, 1);
    [m.legL, m.legR, m.armL, m.armR].forEach(l => l.rotation.set(0, 0, 0));
    m.hammer.rotation.set(-1, 0, 0);
    p.squash = 0; p.phase = 0; p.swingHit = false; p.throwCd = 0; p.throwT = 0; p.shield = false;
    p.grounded = false; p.coyote = 0; p.buffer = 0; p.jumping = false;
    p.collected = 0; updateSack(p);
    resetPowers(p);
}

function updateSack(p) { const k = 1 + Math.min(1, p.collected / 12) * 0.7; p.m.sack.scale.setScalar(k); }
export function addCollected(p) { p.collected++; updateSack(p); }

// Hasar: baret+maske varsa o korur; can biterse ölür
export function hurtPlayer(from, { force = false, knock = 6 } = {}) {
    const p = G.player;
    if (p.remote) return false;   // arkadaşın canını kendi cihazı yönetir
    if (p.dead || G.state !== 'play') return false;
    if (!force && p.invuln > 0) return false;
    if (!force && p.power.shieldUp > 0) {   // kalkan gücü: saldırı işlemez
        if (G.time - (p.lastBubble || 0) > 0.3) { p.lastBubble = G.time; blockFx(p.pos.clone().setY(p.pos.y + 1.2)); }
        return false;
    }
    if (!force && p.mask > 0) {
        p.mask--; p.invuln = 1.0;
        if (p.mask === 0) p.m.helmet.visible = false;
        floatText('BARET KORUDU!', p.pos.clone().setY(p.pos.y + 2.4), '#fde047');
        playSfx('hit', { rate: 1.5, vol: 0.4 });
        return true;
    }
    p.hp--; G.livesLost++; p.invuln = 1.6;
    updateHearts();
    if (from) {
        const dx = p.pos.x - from.x, dz = p.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
        p.vel.x = dx / d * knock; p.vel.z = dz / d * knock; p.vel.y = Math.max(p.vel.y, 5);
    }
    playSfx('ouch', { vol: 0.8 }); addTrauma(0.45); G.hitStop = 0.08;
    burst(p.pos.clone().setY(p.pos.y + 1.2), { n: 10, color: ['#ef4444', '#fca5a5'], speed: 3, up: 4 });
    if (p.hp <= 0) { p.dead = true; p.deadT = 0; G.onPlayerDead && G.onPlayerDead(); }
    return true;
}
export function updateHearts() {
    const p = G.player, el = document.getElementById('hearts');
    let s = '';
    for (let i = 0; i < p.maxHp; i++) s += i < p.hp ? '❤️' : '🖤';
    if (p.mask > 0) s += ` ⛑️×${p.mask}`;
    el.textContent = s;
}

// Kalkan bu saldırıyı durdurur mu: önden (bakış yönüne göre ±80°) ya da yukarıdan düşüyorsa
export function shieldBlocks(projPos, projVel) {
    const p = G.player;
    if (!p.shield || p.dead) return false;
    if (projVel.y < -2 && projPos.y > p.pos.y + 1.3) return true;
    const dx = projPos.x - p.pos.x, dz = projPos.z - p.pos.z;
    const a = Math.atan2(dx, dz);
    return Math.abs(angDiff(p.facing, a)) < 1.4;
}
export function blockFx(pos) {
    if (G.player) G.player.flash = 1;
    spawnFx('block', pos, 0.9);
    burst(pos, { n: 4, color: '#fde047', speed: 2, up: 2, size: 0.08 });
    playSfx('hit', { rate: 1.8, vol: 0.4 });
}

export function bouncePlayer(v = 11) {
    const p = G.player;
    p.vel.y = v; p.grounded = false; p.jumping = input.jumpHeld; p.coyote = 0; p.squash = -0.15;
}

// Kamera yönüne göre yürüme yönü
export function updatePlayer(p, dt, camYaw) {
    const world = G.world;
    if (p.dead) {
        p.deadT += dt;
        p.m.body.rotation.x = Math.min(Math.PI / 2, p.deadT * 3.5);
        p.vel.y -= GRAV * dt; p.vel.x *= 0.9; p.vel.z *= 0.9;
        moveBody(p, dt, world.solids);
        return;
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (p.slow > 0) p.slow -= dt;
    if (p.throwCd > 0) p.throwCd -= dt;
    if (p.throwT > 0) p.throwT -= dt;
    if (p.grenCd > 0) p.grenCd -= dt;
    p.shield = input.shieldHeld && p.swing <= 0;

    // Yön
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let wx = rx * input.mx + fx * input.my, wz = rz * input.mx + fz * input.my;
    const amt = Math.min(1, Math.hypot(wx, wz));
    const sprint = input.sprint && !p.shield && p.swing <= 0;
    let top = RUN * (p.power.speed > 0 ? 1.45 : 1) * (p.shield ? 0.45 : sprint ? SPRINT : 1) * (p.slow > 0 ? 0.5 : 1) * (p.swing > 0 && p.grounded ? 0.35 : 1);
    const tx = wx * top, tz = wz * top;
    const acc = p.grounded ? (amt > 0.05 ? ACC_G : DEC_G) : ACC_A;
    p.vel.x = approach(p.vel.x, tx, acc * dt); p.vel.z = approach(p.vel.z, tz, acc * dt);
    if (amt > 0.1 && !p.shield && p.swing <= 0) p.facing = dampAngle(p.facing, Math.atan2(wx, wz), 14, dt);
    else if (amt > 0.1 && p.shield) p.facing = dampAngle(p.facing, Math.atan2(wx, wz), 3, dt);

    // Zıplama
    if (input.jumpPressed) {
        if (p.grounded || p.coyote > 0) doJump(p); else p.buffer = BUFFER;
    }
    if (!input.jumpHeld && p.jumping && p.vel.y > CUT_V) { p.vel.y = CUT_V; p.jumping = false; }
    if (p.vel.y <= 0) p.jumping = false;

    // Yerçekimi: inişte daha güçlü, tepede (tuş basılıysa) yarım
    let g = GRAV;
    if (p.vel.y < 0) g *= FALL_MULT;
    else if (input.jumpHeld && Math.abs(p.vel.y) < APEX_V) g *= 0.5;
    p.vel.y = Math.max(-MAX_FALL, p.vel.y - g * dt);

    const wasGrounded = p.grounded, vyBefore = p.vel.y;
    const res = moveBody(p, dt, world.solids);
    p.grounded = res.grounded;
    if (res.headHit && res.headHit.type === 'brick') G.onBrickHit && G.onBrickHit(res.headHit, 'head');
    if (p.grounded) {
        if (!wasGrounded) onLand(p, -vyBefore);
        p.coyote = COYOTE;
        if (p.buffer > 0) doJump(p);
        // Güvenli yer: kutunun kenarından uzak
        const a = res.ground;
        if (a && (a.type === 'ground' || a.type === 'shelf')) {
            const sx = clamp(p.pos.x, a.min.x + 0.9, a.max.x - 0.9), sz = clamp(p.pos.z, a.min.z + 0.9, a.max.z - 0.9);
            if (a.max.x - a.min.x > 1.8 && a.max.z - a.min.z > 1.8) p.safe.set(sx, a.max.y, sz);
        }
    } else if (p.coyote > 0) p.coyote -= dt;
    if (p.buffer > 0) p.buffer -= dt;

    // Çukura düştü: 1 can, son sağlam yere dön
    if (p.pos.y < -5) {
        const died = hurtPlayer(null, { force: true });
        if (!p.dead) {
            p.pos.copy(p.safe); p.vel.set(0, 0, 0); p.invuln = 1.2;
            toast('ÇUKURA DÜŞTÜN! −1 CAN', 1400, '#fca5a5');
        }
        if (!died) return;
    }

    // Balyoz
    if (input.hammerPressed && p.swing <= 0 && !p.shield && !p.gorilla) startSwing(p);   // goril modunda balyoz yok
    if (p.swing > 0) {
        const el = SWING - p.swing;
        p.swing -= dt;
        if (!p.swingHit && el >= SWING_HIT) { p.swingHit = true; G.onHammer && G.onHammer(hammerPoint(p), p); }
    }
    // Çay paketi: nişangâhın gösterdiği yere (telefonda öndeki en yakın düşmana) atılır
    if (input.throwPressed && p.throwCd <= 0 && !p.shield && p.swing <= 0) {
        const aim = G.aimTarget && G.aimTarget(p);
        if (aim) {
            p.facing = Math.atan2(aim.x - p.pos.x, aim.z - p.pos.z);
            const f = p.facing, from = new THREE.Vector3(p.pos.x + Math.sin(f) * 0.4 + Math.cos(f) * 0.3, p.pos.y + 1.5, p.pos.z + Math.cos(f) * 0.4 - Math.sin(f) * 0.3);
            if (p.gorilla) G.onBanana && G.onBanana(from, aim.clone().sub(from).normalize());   // goril modunda yalnızca muz
            else G.onThrow && G.onThrow(from, aim.clone().sub(from).normalize());
            p.throwCd = 0.28; p.throwT = 0.2; beep('swing');
        }
    }
    // El bombası: sol elle, nişangâhın gösterdiği yere kavisle
    if (input.grenadePressed && !G.level.mode && p.grenCd <= 0 && !p.shield && p.swing <= 0 && !p.gorilla) {
        if ((G.grenades || 0) <= 0) {
            if (G.time - p.noGrenT > 1) { p.noGrenT = G.time; floatText('BOMBA YOK!', p.pos.clone().setY(p.pos.y + 2.4), '#fca5a5', 0.4); }
        } else {
            const aim = G.aimTarget && G.aimTarget(p);
            if (aim) {
                p.facing = Math.atan2(aim.x - p.pos.x, aim.z - p.pos.z);
                const f = p.facing, from = new THREE.Vector3(p.pos.x + Math.sin(f) * 0.4 - Math.cos(f) * 0.3, p.pos.y + 1.7, p.pos.z + Math.cos(f) * 0.4 + Math.sin(f) * 0.3);
                if (throwGrenade(from, aim)) {
                    G.grenades--; G.onGrenadeCount && G.onGrenadeCount(false); G.onGrenadeThrown && G.onGrenadeThrown(from, aim);
                    p.grenCd = 0.6; p.throwT = 0.25; beep('swing');
                }
            }
        }
    }

    animate(p, dt, amt);
}

function approach(v, t, d) { return v < t ? Math.min(t, v + d) : Math.max(t, v - d); }
function doJump(p) {
    p.vel.y = JUMP_V + (p.power.speed > 0 ? 1.2 : 0); p.grounded = false; p.coyote = 0; p.buffer = 0; p.jumping = true; p.squash = -0.14;
    beep('jump');
}
function onLand(p, v) {
    const k = clamp((v - 6) / 16, 0, 1);
    p.squash = Math.max(p.squash, 0.08 + 0.16 * k);
    burst(p.pos.clone().setY(p.pos.y + 0.05), { n: 3 + Math.round(5 * k), color: '#d6d3d1', speed: 2 + 2 * k, up: 1.2, size: 0.1, life: 0.35, gravity: 4 });
    if (v > 18) addTrauma(0.2);
}
function startSwing(p) {
    p.swing = SWING; p.swingHit = false; beep('swing');
    // Yardım: önündeki 120°'lik alanda yakın düşman varsa ona dön
    let best = null, bd = 3.2;
    for (const e of G.enemies) {
        if (e.dead) continue;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < bd && Math.abs(angDiff(p.facing, Math.atan2(dx, dz))) < 1.1 && Math.abs(e.pos.y - p.pos.y) < 1.5) { bd = d; best = e; }
    }
    if (best) p.facing = Math.atan2(best.pos.x - p.pos.x, best.pos.z - p.pos.z);
}
// Balyozun vurduğu nokta (önünde, bel hizasında)
function hammerPoint(p) {
    return new THREE.Vector3(p.pos.x + Math.sin(p.facing) * 1.3, p.pos.y + 0.8, p.pos.z + Math.cos(p.facing) * 1.3);
}
export { HAMMER_REACH };

// --- KUKLA (çok oyunculu: arkadaşın karakteri) ---
// net: { pos, vel, facing, fl (bitler: 1 kalkan, 2 yerde, 4 ölü, 8 dokunulmaz, 16 dev balyoz, 32 kalkan gücü), hp }
export function updatePuppet(p, dt, net) {
    if (!net) return;
    const k = 1 - Math.exp(-14 * dt);
    p.pos.x += (net.pos.x + net.vel.x * 0.05 - p.pos.x) * k; p.pos.y += (net.pos.y - p.pos.y) * k; p.pos.z += (net.pos.z + net.vel.z * 0.05 - p.pos.z) * k;
    if (p.pos.distanceTo(net.pos) > 6) p.pos.copy(net.pos);   // çok uzaklaştıysa ışınla
    p.vel.copy(net.vel); p.facing = dampAngle(p.facing, net.facing, 18, dt);
    p.shield = !!(net.fl & 1); p.grounded = !!(net.fl & 2); p.hp = net.hp;
    p.power.hammer = net.fl & 16 ? 1 : 0; p.power.shieldUp = net.fl & 32 ? 1 : 0;
    const dead = !!(net.fl & 4);
    if (p.swing > 0) p.swing -= dt;
    if (p.throwT > 0) p.throwT -= dt;
    if (dead) { p.m.body.rotation.x = Math.min(Math.PI / 2, (p.m.body.rotation.x || 0) + dt * 3.5); p.m.root.rotation.y = p.facing; p.dead = true; return; }
    if (p.dead) { p.dead = false; p.m.body.rotation.set(0, 0, 0); }
    p.invuln = net.fl & 8 ? (G.time % 1) + 0.01 : 0;   // animate yanıp söndürür
    const hk = p.power.hammer ? 1.9 : 1; p.m.hammer.scale.setScalar(p.m.hammer.scale.x + (hk - p.m.hammer.scale.x) * Math.min(1, dt * 10));
    animate(p, dt, Math.min(1, Math.hypot(p.vel.x, p.vel.z) / RUN));
}
export function puppetSwing(p) { p.swing = SWING; p.swingHit = true; }
export function puppetThrow(p) { p.throwT = 0.2; }
export { hammerPoint };

// Fotoğraf kafa her karede kameraya döner; karakter ekranda sola gidiyorsa aynalanır (2D'deki gibi)
let faceDir = 1;
export function faceCamera(p, camYaw) {
    const m = p.m;
    m.faceGroup.rotation.y = camYaw - p.facing;
    const side = Math.sin(p.facing - camYaw);
    if (side > 0.3) faceDir = 1; else if (side < -0.3) faceDir = -1;
    m.faceGroup.scale.x = faceDir;
}

function animate(p, dt, amt) {
    const m = p.m;
    m.root.rotation.y = p.facing;
    const speed = Math.hypot(p.vel.x, p.vel.z);
    if (p.grounded) { p.phase += dt * (4 + speed * 1.6); walkPose(m, p.phase, Math.min(1, speed / RUN)); }
    else { m.legL.rotation.x = -0.6; m.legR.rotation.x = 0.35; m.body.position.y = 0; }
    // Ezilme/uzama
    p.squash = damp(p.squash, 0, 12, dt);
    m.body.scale.set(1 + p.squash * 0.5, 1 - p.squash, 1 + p.squash * 0.5);
    // Kollar
    const swingK = speed / RUN;
    let aR = -0.25 + Math.sin(p.phase) * 0.4 * swingK * (p.grounded ? 1 : 0), hR = -1.0;
    if (p.swing > 0) {
        const t = (SWING - p.swing) / SWING;
        if (t < 0.28) { const k = t / 0.28; aR = -0.25 + (-3.3 + 0.25) * k; hR = -1.0 * (1 - k); }
        else if (t < 0.45) { const k = (t - 0.28) / 0.17; aR = -3.3 + 2.2 * k; hR = -0.6 * k; }
        else { const k = (t - 0.45) / 0.55; aR = -1.1 + 0.85 * k; hR = -0.6 - 0.4 * k; }
    }
    // Balyoz başı yerin altına girmesin (dev balyozda sap uzar): kol + balyoz açısı en az minA olsun (aşağıdan ölçülür)
    { const sc = m.hammer.scale.x, L = 0.86 * sc, minA = Math.acos(clamp((0.62 - 0.14 * sc) / L, -1, 1)), a = -(aR + hR); if (a < minA) hR -= minA - a; }
    m.armR.rotation.x = aR; m.hammer.rotation.x = hR;
    m.armL.rotation.x = p.shield ? -1.45 : -Math.sin(p.phase) * 0.4 * swingK * (p.grounded ? 1 : 0);
    if (p.throwT > 0 && !p.shield) { const k = clamp(1 - p.throwT / 0.2, 0, 1); m.armL.rotation.x = -2.7 + 1.5 * k; }   // atış sol elle: balyozlu sağ kol savrulmaz
    m.shield.visible = !p.shield; p.big.visible = p.shield;
    // hale: kalkan kaldırıldıkça nabız gibi atar, saldırı durdurunca (p.flash) parlayıp büyür
    if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 3);
    const pulse = 0.55 + Math.sin(G.time * 9) * 0.15 + p.flash * 1.6 + (p.power.shield > 0 ? 0.35 : 0);
    p.aura.material.opacity = Math.min(1, pulse); p.aura.scale.setScalar(1 + p.flash * 0.5 + Math.sin(G.time * 9) * 0.03);
    // Dokunulmazken yanıp söner
    m.root.visible = !(p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0);
}
