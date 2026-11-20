// HIRHIZ 3D — GORİL MODU (G tuşu; telefonda 🦍 düğmesi). Yalnızca bölüm sonu canavarıyla dövüşürken açılır.
// Açılınca HIRHIZ'ın üstünü goril postu kaplar, göğsünü yumruklayıp bağırır ve bunu 5 saniyede bir tekrarlar.
// Bu moddayken yalnızca MUZ atar (sol tık / □): balyoz ve el bombası kapalı. Muz canavara rüşvet/çay gibi işler
// (SAYGILI rüşvet almaz ama muzu yer: ona balyoz gibi işler). Canavar yenilince mod kendiliğinden kapanır.
import * as THREE from 'three';
import { G } from './state.js?v=29';
import { floatText, burst, addTrauma } from './fx.js?v=29';
import { roar, chestBeat } from './audio.js?v=29';
import { box, mat } from './util.js?v=29';
import { damageEnemy, killProj, isGuest } from './enemies.js?v=29';
import { groundAt } from './physics.js?v=29';

const BEAT_EVERY = 5, BEAT_LEN = 1.3;
const FUR = '#3b2a20', FUR_D = '#2a1d15', CHEST = '#6b5444';

// Post: gövdeyi, kolları ve bacakları saran kahverengi tüy kutuları (yüz HIRHIZ'ın kalır)
function addFur(m) {
    if (m.fur) return m.fur;
    const parts = [];
    const add = (parent, ...a) => { const b = box(...a); parent.add(b); parts.push(b); return b; };
    add(m.torso, 0.62, 0.66, 0.38, FUR, 0, 0.3, 0);
    add(m.torso, 0.36, 0.34, 0.02, CHEST, 0, 0.32, 0.2, false);                 // göğüs (yumruklanan yer)
    add(m.torso, 0.7, 0.18, 0.42, FUR_D, 0, 0.58, 0);                          // iri omuzlar
    [m.armL, m.armR].forEach(a => { add(a, 0.2, 0.56, 0.2, FUR, 0, -0.27, 0); add(a, 0.16, 0.14, 0.16, '#1c1917', 0, -0.56, 0, false); });
    [m.legL, m.legR].forEach(l => add(l, 0.22, 0.6, 0.24, FUR_D, 0, -0.3, 0));
    m.fur = parts; parts.forEach(p => p.visible = false);
    return parts;
}
export function showFur(m, on) { addFur(m).forEach(p => p.visible = on); if (m.hammer) m.hammer.visible = !on; if (m.sack) m.sack.visible = !on; }

export const canGorilla = () => !!(G.boss && !G.boss.dead && !G.level.mode && G.state === 'play' && !G.boss.reported);
export function toggleGorilla(p) {
    if (p.gorilla) { setGorilla(p, false); return; }
    if (!canGorilla()) { floatText('GORİL MODU SADECE CANAVARA KARŞI!', p.pos.clone().setY(p.pos.y + 2.6), '#fca5a5', 0.4, 1.4); return; }
    setGorilla(p, true);
}
export function setGorilla(p, on) {
    if (!!p.gorilla === on) return;
    p.gorilla = on; showFur(p.m, on);
    document.body.classList.toggle('gorilla', on);
    if (on) { p.beatT = BEAT_LEN; p.beatStart = true; p.beatNext = BEAT_EVERY; floatText('GORİL MODU!', p.pos.clone().setY(p.pos.y + 3), '#fbbf24', 0.6, 1.6); }
    else floatText('GORİL MODU KAPANDI', p.pos.clone().setY(p.pos.y + 2.6), '#e5e7eb', 0.4, 1.2);
}
// her kare, updatePlayer'dan SONRA (kolları ezer)
export function updateGorilla(p, dt) {
    document.body.classList.toggle('has-boss', canGorilla());
    if (!p.gorilla) return;
    if (!canGorilla() || p.dead) { setGorilla(p, false); return; }
    p.beatNext -= dt;
    if (p.beatNext <= 0) { p.beatNext = BEAT_EVERY; p.beatT = BEAT_LEN; p.beatStart = true; }   // 5 saniyede bir
    if (p.beatT > 0) {
        if (p.beatStart) {   // başlangıç: kükreme ve göğüs davulu
            p.beatStart = false;
            roar(); chestBeat(6, 0.13);
            floatText('UUH UUH AAAH!', p.pos.clone().setY(p.pos.y + 2.9), '#fbbf24', 0.5, 1.3);
            addTrauma(0.25);
        }
        p.beatT = Math.max(0, p.beatT - dt);
        const k = (BEAT_LEN - p.beatT) * 23, m = p.m;
        // eller sırayla göğse vurur; gövde geriye yaslanır, kafa yukarı
        m.armL.rotation.set(-1.25 + Math.max(0, Math.sin(k)) * 0.5, 0, -0.95);
        m.armR.rotation.set(-1.25 + Math.max(0, -Math.sin(k)) * 0.5, 0, 0.95);
        m.body.rotation.x = -0.15; m.body.scale.setScalar(1 + Math.abs(Math.sin(k * 0.5)) * 0.04);
        if (Math.random() < dt * 12) burst(p.pos.clone().setY(p.pos.y + 1.3), { n: 1, color: ['#a8a29e', '#78716c'], speed: 1.5, up: 1, size: 0.07, life: 0.3 });
        if (p.beatT === 0) { m.body.rotation.x = 0; m.body.scale.setScalar(1); }
    } else {   // goril yürüyüşü: kollar öne sarkık
        p.m.armL.rotation.z = -0.3; p.m.armR.rotation.z = 0.3;
    }
}

// --- MUZ ---
const BANANA_GEO = new THREE.TorusGeometry(0.2, 0.06, 6, 10, Math.PI * 0.75);
const BANANA_MAT = new THREE.MeshLambertMaterial({ color: '#facc15', emissive: '#3f2d00' });
export function throwBanana(from, dir) {
    const m = new THREE.Mesh(BANANA_GEO, BANANA_MAT);
    m.add(box(0.04, 0.06, 0.04, '#57534e', 0.2, 0, 0, false));
    m.position.copy(from); G.scene.add(m);
    G.projectiles.push({ type: 'banana', mesh: m, pos: m.position, vel: dir.clone().multiplyScalar(26), life: 1.8, ownGeo: false, update: updateBanana });
}
function updateBanana(p, dt) {
    p.mesh.rotation.z += dt * 22; p.mesh.rotation.y += dt * 6;
    for (let s = 0; s < 2; s++) {
        p.vel.y -= 4 * dt / 2;
        p.pos.addScaledVector(p.vel, dt / 2);
        for (const e of G.enemies) {
            if (e.dead || !e.m.root.parent || e.kind === 'duran') continue;
            const h = e.T.height || 1.95;
            if (Math.abs(p.pos.x - e.pos.x) < 0.45 && Math.abs(p.pos.z - e.pos.z) < 0.45 && p.pos.y > e.pos.y && p.pos.y < e.pos.y + h) { damageEnemy(e, 1, 'hammer'); splat(p); killProj(p); return; }
        }
        const B = G.boss;
        if (B && !B.dead && B.hitTest(p.pos)) {
            if (!isGuest()) { if (B.onBanana) B.onBanana(p.pos.clone(), p); else if (B.onAmmo) B.onAmmo(p); }
            splat(p); floatText('MUZ!', p.pos.clone().setY(p.pos.y + 0.8), '#facc15', 0.45, 0.8); killProj(p); return;
        }
    }
    if (p.pos.y < groundAt(G.world.solids, p.pos.x, p.pos.z, p.pos.y + 0.3)) { splat(p); killProj(p); }
    else if (p.pos.y < -5) killProj(p);
}
function splat(p) { burst(p.pos.clone(), { n: 8, color: ['#facc15', '#fef08a', '#fde68a'], speed: 2.5, up: 2.5, size: 0.08, life: 0.5 }); }
