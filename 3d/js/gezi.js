// HIRHIZ 3D — 1. bölüm düşmanları: Gezi kahramanları. Her biri saldırmadan önce belli eder (başında kırmızı ! ve hazırlık hareketi).
// Sloganlar saldırı değildir: ara sıra kafalarının üstünde konuşma balonu olarak çıkar.
//   Çarşı: molotof atar, şişe kırılır, düştüğü yer bir süre yanar
//   Kırmızılı Kadın: kırmızı çantasını fırlatır; çok yakındaysa savurur (kadın sesi)
//   Semazen: hep döner; dönerek üstüne gelir, sonra başı döner ve sersemler (vurma fırsatı)
//   Çapulcu: bomba atar; yere düşen bombanın fitili yanar, kırmızı halkadan çık
//   Tencere Tava (3 can): kalkan hücumu ya da tencere fırlatır
//   Duran Adam: hiç kıpırdamaz, hiçbir şey işlemez
import * as THREE from 'three';
import { buildHero, walkPose } from './models.js?v=27';
import { G, diff } from './state.js?v=27';
import { hurtPlayer, blockFx } from './player.js?v=27';
import { burst, floatText, addTrauma } from './fx.js?v=27';
import { playSfx, beep } from './audio.js?v=27';
import { makeFire, makeBomb } from './hazards.js?v=27';
import { angDiff, dampAngle, mat, rand } from './util.js?v=27';
import { TYPES, patrol, keepRange, stepToward, go, finish, stun, shieldFacing, midPoint, handPos, throwLob, setBubble } from './enemies.js?v=27';

const SLOGANS = ['HER YER TAKSİM!', 'DİRENİŞ!', 'ÇAPULCUYUZ!', 'HÜKÜMET İSTİFA!'];
// Uyarınca ara sıra slogan atar (balon kafanın üstünde, can götürmez)
function shout(e, dt, c) {
    if (e.dead) return;
    if (e.shoutT === undefined) e.shoutT = rand(0.5, 3);
    if (!c.alert || e.bubble) return;
    if ((e.shoutT -= dt) > 0) return;
    let txt; do txt = SLOGANS[Math.floor(Math.random() * SLOGANS.length)]; while (txt === e.lastSlogan && SLOGANS.length > 1);
    e.lastSlogan = txt; setBubble(e, txt, 2.2); e.shoutT = rand(4.5, 8);
}

// --- ATILANLAR ---
const GLASS = new THREE.MeshLambertMaterial({ color: '#15803d', transparent: true, opacity: 0.85 });
const BOTTLE_GEO = new THREE.CylinderGeometry(0.09, 0.1, 0.3, 8), NECK_GEO = new THREE.CylinderGeometry(0.035, 0.05, 0.14, 6);
function molotovMesh() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(BOTTLE_GEO, GLASS); g.add(b);
    const n = new THREE.Mesh(NECK_GEO, GLASS); n.position.y = 0.22; g.add(n);
    const rag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.07), mat('#f5f5f4')); rag.position.y = 0.33; g.add(rag);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 5), new THREE.MeshBasicMaterial({ color: '#f97316' })); fl.position.y = 0.48; g.add(fl);
    return g;
}
function molotov(e) {
    throwLob(handPos(e), molotovMesh(), { type: 'molotov', trail: ['#ef4444', '#f97316', '#fde047'], onLand: at => {
        burst(at.clone().setY(at.y + 0.2), { n: 8, color: ['#86efac', '#15803d', '#f8fafc'], speed: 3, up: 2.5, size: 0.06, life: 0.5 });   // cam kırıkları
        burst(at.clone().setY(at.y + 0.3), { n: 10, color: ['#f97316', '#fde047', '#ef4444'], speed: 2.5, up: 3, gravity: 2, size: 0.12, life: 0.6 });
        playSfx('hit', { rate: 2.6, vol: 0.4 });
        makeFire(at, { r: 1.25, t: 2.6 });
    } });
    playSfx('hit', { rate: 1.2, vol: 0.35 });
}
const BAG_MAT = mat('#b91c1c'), STRAP_MAT = mat('#7f1d1d');
function bagMesh() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.12), BAG_MAT));
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 5, 12, Math.PI), STRAP_MAT); h.position.y = 0.13; g.add(h);
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), mat('#fde047')); clasp.position.set(0, 0.06, 0.065); g.add(clasp);
    return g;
}
function throwBag(e) {
    throwLob(handPos(e, 1.5), bagMesh(), { type: 'bag', g: 22, lead: 0.4, onLand: at => burst(at.clone().setY(at.y + 0.2), { n: 5, color: ['#dc2626', '#fde047'], speed: 2, up: 2, size: 0.07 }) });
    playSfx('hit', { rate: 1.5, vol: 0.3 });
}
const BOMB_MAT = mat('#1f2937'), BOMB_GEO = new THREE.SphereGeometry(0.17, 10, 8);
function bombMesh() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(BOMB_GEO, BOMB_MAT));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 8), mat('#6b7280')); cap.position.y = 0.17; g.add(cap);
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 4), mat('#a16207')); fuse.position.set(0.03, 0.25, 0); fuse.rotation.z = -0.4; g.add(fuse);
    return g;
}
function bomb(e) {
    throwLob(handPos(e), bombMesh(), { type: 'bomb', trail: ['#fde047', '#f8fafc'], onLand: at => makeBomb(at, bombMesh(), { fuse: 1.1 }) });
    playSfx('hit', { rate: 1.8, vol: 0.3 });
}
const POT_MAT = mat('#9ca3af'), POT_DARK = mat('#374151');
function potMesh() {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.24, 12), POT_MAT); g.add(pot);
    [-1, 1].forEach(s => { const h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.05), POT_DARK); h.position.set(s * 0.27, 0.07, 0); g.add(h); });
    return g;
}
function throwPot(e) {
    throwLob(handPos(e, 1.5), potMesh(), { type: 'pot', g: 20, lead: 0.5, onLand: at => {
        burst(at.clone().setY(at.y + 0.2), { n: 6, color: ['#e5e7eb', '#9ca3af'], speed: 2.5, up: 2, size: 0.08 });
        beep('pan');
    } });
    beep('pan');
}

// --- ÇARŞI: molotof ---
function carsi(e, dt, c) {
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.3 * diff().speed); return; }
        keepRange(e, dt, c, 6, 13, 1.6 * diff().speed);
        if (c.canStart && c.d < 15) { go(e, 'wind', 0.55, '!'); beep('pan'); }
    } else if (e.st === 'wind') {   // kolunu geri alır, molotofun fitili elinde yanar
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        e.m.armR.rotation.x = 1.3 * (1 - e.t / 0.55) + 0.2;
        if (Math.random() < dt * 25) burst(handPos(e), { n: 1, color: ['#ef4444', '#f97316'], speed: 0.4, up: 1.5, gravity: -1, size: 0.09, life: 0.4 });
        if (e.t <= 0) { molotov(e); go(e, 'rest', 0.35, null); e.m.armR.rotation.x = -1.8; }
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) finish(e, 2.6); }
}

// --- KIRMIZILI KADIN: kırmızı çantasını fırlatır, çok yakındaysa savurur ---
function kirmizi(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        if (e.m.bag) e.m.bag.visible = true;
        if (!c.alert) { patrol(e, dt, 1.3 * S.speed); return; }
        e.facing = dampAngle(e.facing, c.toP, 7, dt);
        if (c.d > 7.5 && Math.abs(c.dy) < 1.2) {
            if (stepToward(e, c.toP, (e.cd > 0 ? 1.4 : 2.4) * S.speed, dt)) { e.phase += dt * 10; walkPose(e.m, e.phase, 1); }
        } else walkPose(e.m, e.phase, 0);
        if (!c.canStart) return;
        if (c.d < 1.9 && Math.abs(c.dy) < 1.3) go(e, 'wind', 0.45 * S.fire + 0.1, '!');
        else if (c.d < 12 && Math.abs(c.dy) < 2.5) go(e, 'toss', 0.55, '!');
    } else if (e.st === 'toss') {   // çantayı başının arkasına alır, sonra fırlatır
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        e.m.armL.rotation.x = -2.9 + 0.4 * (1 - e.t / 0.55); e.m.body.rotation.y = 0.3;
        if (e.t <= 0) {
            throwBag(e); if (e.m.bag) e.m.bag.visible = false;
            e.m.armL.rotation.x = -1.2; e.m.body.rotation.y = -0.3;
            go(e, 'rest', 0.5, null);
        }
    } else if (e.st === 'wind') {   // çantayı yukarı kaldırır
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 6, dt);
        e.m.armL.rotation.x = -2.7; e.m.body.rotation.y = 0.35;
        if (e.t <= 0) { go(e, 'swing', 0.18, null); e.hit = false; beep('swing'); }
    } else if (e.st === 'swing') {
        e.t -= dt;
        const k = 1 - e.t / 0.18;
        e.m.armL.rotation.x = -2.7 + 3.4 * k; e.m.body.rotation.y = 0.35 - 0.8 * k;
        if (!e.hit && k > 0.4) {
            e.hit = true;
            const front = Math.abs(angDiff(e.facing, c.toP)) < 1.1;
            if (c.d < 2.1 && front && Math.abs(c.dy) < 1.4) {
                if (shieldFacing(c)) { blockFx(midPoint(e)); stun(e, 1.3); return; }
                hurtPlayer(e.pos, { knock: 7 });
            }
        }
        if (e.t <= 0) go(e, 'rest', 0.8);
    } else if (e.st === 'rest') {   // geri çekilir
        e.t -= dt; e.m.body.rotation.y = 0;
        if (stepToward(e, c.toP + Math.PI, 1.6, dt)) { e.phase += dt * 6; walkPose(e.m, e.phase, 0.5); }
        if (e.t <= 0) finish(e, 2.0);
    }
}

// --- SEMAZEN: dönerek gelir, sonra sersemler ---
// Semazen hep döner (yürürken, beklerken, sersemken de); saldırıda çok hızlanır
function semaSpin(e, dt, c) {
    const fast = e.st === 'spin', slow = e.st === 'stun';
    e.m.body.rotation.y += dt * (fast ? 18 : slow ? 3 : e.st === 'wind' ? 10 : 6);
    if (e.m.skirt) e.m.skirt.rotation.y += dt * (fast ? 30 : 8);
    if (!slow) {   // kollar açık: sağ el göğe, sol el yere
        e.m.armR.rotation.set(0, 0, 2.3); e.m.armL.rotation.set(0, 0, -1.2);
        e.m.legL.rotation.x = 0; e.m.legR.rotation.x = 0;
    }
    shout(e, dt, c);
}
function sema(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.2 * S.speed); return; }
        keepRange(e, dt, c, 0, 9, 1.4 * S.speed);
        if (c.canStart && c.d < 11 && Math.abs(c.dy) < 1.2) { go(e, 'wind', 0.75, '!'); e.steer = c.toP; }
    } else if (e.st === 'wind') {   // kollarını açar, yavaşça dönmeye başlar
        e.t -= dt;
        if (e.t <= 0) { go(e, 'spin', 2.2, null); e.steer = c.toP; e.hit = false; }
    } else if (e.st === 'spin') {   // dönerek oyuncuya yönelir (yavaş döner, yana kaçılabilir)
        e.t -= dt;
        e.steer += Math.max(-1.5 * dt, Math.min(1.5 * dt, angDiff(e.steer, c.toP)));
        e.facing = e.steer;
        if (!stepToward(e, e.steer, 4.3 * S.speed, dt)) e.t = Math.min(e.t, 0.1);
        if (Math.random() < dt * 20) burst(e.pos.clone().setY(0.1), { n: 1, color: '#e7e5e4', speed: 1.5, up: 0.5, size: 0.1, life: 0.4, gravity: 2 });
        if (!e.hit && c.d < 1.1 && Math.abs(c.dy) < 1.5) {
            e.hit = true;
            if (shieldFacing(c)) { blockFx(midPoint(e)); stun(e, 2.0); return; }
            hurtPlayer(e.pos, { knock: 9 });
        }
        if (e.t <= 0) { stun(e, 1.5); floatText('BAŞI DÖNDÜ!', e.pos.clone().setY(2.6), '#fde047', 0.38, 0.9); }
    }
}

// --- ÇAPULCU: bomba atar ---
function capulcu(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.3 * S.speed); return; }
        keepRange(e, dt, c, 7, 12, 1.5 * S.speed);
        if (c.canStart && c.d < 15) go(e, 'wind', 0.6, '!');
    } else if (e.st === 'wind') {   // bombayı alttan geriye alır, fitil cızırdar
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        e.m.armR.rotation.x = 1.3 * (1 - e.t / 0.6) + 0.2;
        if (Math.random() < dt * 25) burst(handPos(e), { n: 1, color: ['#fde047', '#f8fafc'], speed: 0.6, up: 1.5, gravity: 2, size: 0.06, life: 0.3 });
        if (e.t <= 0) { bomb(e); e.m.armR.rotation.x = -1.8; go(e, 'rest', 0.4, null); }
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) finish(e, 2.8); }
}

// --- TENCERE TAVA: kalkan hücumu ya da tencere fırlatır ---
function tencere(e, dt, c) {
    const S = diff(), p = G.player;
    if (e.st !== 'charge') e.m.armR.rotation.x = -2.6 + Math.sin(G.time * 11 + e.idx) * 0.35;   // kepçeyle tencereye vurur
    if (c.d < 14 && Math.random() < dt * 2.2) beep('pan');
    if (e.st === 'idle') {
        e.m.body.rotation.x = 0; e.m.armL.rotation.x = -1.2;
        if (!c.alert || Math.abs(c.dy) > 1.2) { patrol(e, dt, 1.0 * S.speed); return; }
        e.facing = dampAngle(e.facing, c.toP, 4, dt);
        if (c.d > 6) { stepToward(e, c.toP, 1.2 * S.speed, dt); e.phase += dt * 6; walkPose(e.m, e.phase, 0.6); } else walkPose(e.m, e.phase, 0);
        if (!c.canStart) return;
        const front = Math.abs(angDiff(e.facing, c.toP)) < 0.45;
        if (e.alt && c.d < 12) go(e, 'toss', 0.6, '!');
        else if (!e.alt && front && c.d > 2.5 && c.d < 9) go(e, 'wind', 0.67 * S.fire, '!');
    } else if (e.st === 'toss') {   // tencereyi başının üstüne kaldırır, sonra fırlatır
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        e.m.armR.rotation.x = -2.9; e.m.body.rotation.x = -0.15;
        if (e.t <= 0) {
            throwPot(e); e.m.armR.rotation.x = -1.2; e.m.body.rotation.x = 0.1;
            e.alt = 0; go(e, 'rest', 0.6, null);
        }
    } else if (e.st === 'wind') {   // geriye yaslanır
        e.t -= dt; e.m.body.rotation.x = -0.25;
        e.facing = dampAngle(e.facing, c.toP, 6, dt);
        if (e.t <= 0) { go(e, 'charge', 0.8, null); e.steer = e.facing; }
    } else if (e.st === 'charge') {
        e.t -= dt; e.m.body.rotation.x = 0.3;
        if (!stepToward(e, e.steer, 10 * S.speed, dt)) e.t = 0;
        e.phase += dt * 16; walkPose(e.m, e.phase, 1);
        if (c.d < 1.15 && Math.abs(c.dy) < 1.6) {
            if (shieldFacing(c)) {
                for (let k = 0; k < 10; k++) stepToward(e, e.steer + Math.PI, 6, 0.016);
                blockFx(midPoint(e));
                addTrauma(0.25); p.vel.x -= Math.sin(c.toP) * 3; p.vel.z -= Math.cos(c.toP) * 3;
                e.alt = 1; stun(e, 1.8); return;
            }
            hurtPlayer(e.pos, { knock: 10 }); e.t = 0;
        }
        if (e.t <= 0) { e.alt = 1; go(e, 'rest', 1.2); }
    } else if (e.st === 'rest') {   // soluklanır: kapak aşağıda
        e.t -= dt; e.m.body.rotation.x = 0.15; e.m.armL.rotation.x = 0.3;
        walkPose(e.m, e.phase, 0);
        if (e.t <= 0) finish(e, 1.6);
    }
}

const hero = (skin, name, update, extra = {}) => ({ kind: 'hero', name, hp: 2, score: 3000, build: () => buildHero(skin), update, tick: shout, ...extra });
Object.assign(TYPES, {
    carsi: hero('carsi', 'ÇARŞI', carsi),
    kirmizi: hero('kirmizi', 'KIRMIZILI KADIN', kirmizi, { cry: 'cry_kadin', hurtSfx: 'ah_kadin' }),
    sema: hero('sema', 'SEMAZEN', sema, { tick: semaSpin }),
    capulcu: hero('capulcu', 'ÇAPULCU', capulcu),
    tencere: hero('tencere', 'TENCERE TAVA', tencere, { kind: 'tencere', hp: 3, score: 4000 }),
    duran: { kind: 'duran', name: 'DURAN ADAM', hp: 1, build: () => buildHero('duran'), update: () => {} }
});
