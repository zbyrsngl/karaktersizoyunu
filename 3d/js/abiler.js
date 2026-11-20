// HIRHIZ 3D — 8. bölüm düşmanları: ABİLER (takım elbise, bıyık; saldırmadan önce başında kırmızı !)
//   KİTAPÇI ABİ: kitap fırlatır (dönerek düz gelir; bazen ikili)
//   TESBİHLİ ABİ: tesbihi başının üstünde çevirip fırlatır; isabet ederse boynuna asılır, bip bip... 1 sn sonra patlar, 1 can götürür
//                 (kalkan durdurur; boynundayken kurtuluş yok, kaç değil — dikkat et!)
//   TAKKELİ ABİ: takkesini başından çıkarıp atar; takke düştüğü yerde bomba gibi patlar (kırmızı halkadan çık)
// Rüşvetle ya da balyozla yenilen abi "İTİRAFÇI OLDU!" diye gider.
import * as THREE from 'three';
import { limb, walkPose, labelTorso } from './models.js?v=29';
import { G, diff } from './state.js?v=29';
import { hurtPlayer, blockFx, shieldBlocks } from './player.js?v=29';
import { burst, floatText, addTrauma } from './fx.js?v=29';
import { playSfx, beep } from './audio.js?v=29';
import { makeBomb, blast } from './hazards.js?v=29';
import { box, mat, angDiff, dampAngle, rand } from './util.js?v=29';
import { TYPES, patrol, keepRange, go, finish, handPos, shootStraight, throwLob, hitsPlayer, killProj } from './enemies.js?v=29';

const SKIN = '#e0ac69';
const SUITS = { kitap: '#1f2937', tesbih: '#334155', takke: '#3f3f46' };
function takkeMesh() {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.12, 12), mat('#f8fafc')); g.add(c);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#f8fafc')); top.scale.y = 0.35; top.position.y = 0.06; g.add(top);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(box(0.03, 0.03, 0.01, '#d6d3d1', Math.sin(a) * 0.172, -0.01, Math.cos(a) * 0.172, false)); }
    return g;
}
const BEAD_GEO = new THREE.SphereGeometry(0.035, 6, 4);
function tesbihMesh(r = 0.16, n = 22) {   // halka tesbih + püskül
    const g = new THREE.Group(), m = mat('#7c2d12'), m2 = mat('#a16207');
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = new THREE.Mesh(BEAD_GEO, i % 11 === 0 ? m2 : m); b.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); g.add(b); }
    g.add(box(0.03, 0.12, 0.03, '#a16207', 0, -r - 0.07, 0, false));
    return g;
}
const BOOK_COLS = ['#065f46', '#7f1d1d', '#1e3a8a', '#713f12'];
function bookMesh() {
    const g = new THREE.Group(), c = BOOK_COLS[Math.floor(Math.random() * BOOK_COLS.length)];
    g.add(box(0.3, 0.06, 0.22, c, 0, 0, 0, false));
    g.add(box(0.29, 0.045, 0.2, '#fef3c7', 0.012, 0, 0, false));
    g.add(box(0.06, 0.012, 0.012, '#facc15', -0.05, 0.032, 0, false));
    return g;
}

function buildAbi(kind) {
    const SUIT = SUITS[kind], root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.11, 0.7, 0, 0.17, 0.68, 0.19, '#1f2937', '#0a0a0a');
    const legR = limb(body, 0.11, 0.7, 0, 0.17, 0.68, 0.19, '#1f2937', '#0a0a0a');
    const torso = new THREE.Group(); torso.position.y = 0.7; body.add(torso);
    torso.add(box(0.54, 0.62, 0.3, SUIT, 0, 0.31, 0));
    torso.add(box(0.16, 0.36, 0.02, '#f8fafc', 0, 0.42, 0.155, false));    // gömlek
    torso.add(box(0.06, 0.3, 0.02, '#111827', 0, 0.4, 0.168, false));       // kravat
    [-1, 1].forEach(s => { const l = box(0.06, 0.34, 0.02, '#111827', s * 0.1, 0.45, 0.16, false); l.rotation.z = s * 0.3; torso.add(l); });   // yaka
    labelTorso(torso, 'ABİ', '#fde68a', SUIT, { backY: 0.36 }).front.visible = false;   // sırtta ABİ yazısı
    const head = new THREE.Group(); head.position.y = 0.62; torso.add(head);
    head.add(box(0.12, 0.1, 0.12, SKIN, 0, 0.02, 0));
    head.add(box(0.34, 0.38, 0.32, SKIN, 0, 0.25, 0));
    head.add(box(0.05, 0.05, 0.02, '#111', -0.08, 0.28, 0.165, false)); head.add(box(0.05, 0.05, 0.02, '#111', 0.08, 0.28, 0.165, false));
    head.add(box(0.2, 0.05, 0.03, '#1c1917', 0, 0.16, 0.17, false));       // bıyık
    head.add(box(0.36, 0.08, 0.34, '#1c1917', 0, 0.44, -0.01));             // kısa saç
    if (kind === 'tesbih') head.add(box(0.3, 0.1, 0.05, '#292524', 0, 0.08, 0.15, false));   // sakal
    let takke = null;
    if (kind === 'takke') { takke = takkeMesh(); takke.position.y = 0.5; head.add(takke); }
    const armL = limb(torso, -0.33, 0.56, 0, 0.13, 0.5, 0.14, SUIT);
    const armR = limb(torso, 0.33, 0.56, 0, 0.13, 0.5, 0.14, SUIT);
    armL.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.53, 0, false)); armR.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.53, 0, false));
    let held = null;
    if (kind === 'kitap') { held = bookMesh(); held.position.set(0, -0.6, 0.08); held.rotation.x = Math.PI / 2; armR.add(held); }
    if (kind === 'tesbih') { held = tesbihMesh(0.1, 16); held.position.set(0, -0.68, 0); armR.add(held); }
    return { root, body, legL, legR, armL, armR, torso, head, takke, held };
}

// --- TESBİH MERMİSİ: hafif güdümlü; çarparsa boyna asılır ---
function throwTesbih(e) {
    const m = tesbihMesh(0.2, 22), from = handPos(e, 1.7);
    m.position.copy(from); G.scene.add(m);
    const target = G.player, to = target.pos.clone().setY(target.pos.y + 1.2);
    const vel = to.sub(from).normalize().multiplyScalar(9.5 * (0.9 + 0.1 * diff().speed));
    G.projectiles.push({ type: 'tesbih', mesh: m, pos: m.position, vel, life: 3, ownGeo: false, target, update: updateTesbih });
    beep('swing');
}
function updateTesbih(p, dt) {
    const pl = G.player;
    p.mesh.rotation.y += dt * 14; p.mesh.rotation.x += dt * 5;
    // hafifçe hedefe döner (çok az: yana kaçılabilir)
    const want = pl.pos.clone().setY(pl.pos.y + 1.2).sub(p.pos).normalize().multiplyScalar(p.vel.length());
    p.vel.lerp(want, 1 - Math.exp(-0.9 * dt));
    p.pos.addScaledVector(p.vel, dt);
    if (hitsPlayer(p, 0.6)) {
        if (shieldBlocks(p.pos, p.vel)) { blockFx(p.pos.clone()); killProj(p); return; }
        if (!pl.remote) neckBomb(pl);
        killProj(p); return;
    }
    if (p.pos.y < -2) killProj(p);
}
// Boyna asılan tesbih: bip bip (hızlanır), 1 sn sonra patlar
function neckBomb(pl) {
    if (pl.neck) return;
    const t = tesbihMesh(0.17, 20); t.rotation.x = Math.PI / 2 - 0.25; t.position.set(0, 0.6, 0.02);
    pl.m.torso.add(t);
    pl.neck = { mesh: t, t: 1.0, beep: 0 };
    floatText('TESBİH BOYNUNDA!', pl.pos.clone().setY(pl.pos.y + 2.6), '#fca5a5', 0.45, 1.1);
    G.neckBombs = G.neckBombs || []; G.neckBombs.push(pl);
}
export function updateNeckBombs(dt) {
    if (!G.neckBombs || !G.neckBombs.length) return;
    G.neckBombs = G.neckBombs.filter(pl => {
        const n = pl.neck; if (!n) return false;
        n.t -= dt; n.beep -= dt;
        if (n.beep <= 0) { n.beep = 0.1 + n.t * 0.22; beep('pan'); n.mesh.scale.setScalar(1.25); }
        n.mesh.scale.setScalar(1 + (n.mesh.scale.x - 1) * Math.exp(-12 * dt));
        n.mesh.children.forEach((b, i) => { if (b.material) b.material = (Math.floor(G.time * 10) % 2 && i % 2) ? mat('#ef4444') : mat(i % 11 === 0 ? '#a16207' : '#7c2d12'); });
        if (n.t <= 0 || pl.dead) {
            pl.m.torso.remove(n.mesh); pl.neck = null;
            if (!pl.dead) {
                const at = pl.pos.clone().setY(pl.pos.y + 1.4);
                burst(at, { n: 16, color: ['#fde047', '#f97316', '#7c2d12'], speed: 6, up: 5, size: 0.1, life: 0.5 });
                playSfx('boom', { vol: 0.7, rate: 1.3 }); addTrauma(0.5);
                if (pl === G.player && !pl.remote) hurtPlayer(null, { force: !(pl.power && pl.power.shieldUp > 0) });
            }
            return false;
        }
        return true;
    });
}
export function clearNeckBombs() { (G.neckBombs || []).forEach(pl => { if (pl.neck) { pl.m.torso.remove(pl.neck.mesh); pl.neck = null; } }); G.neckBombs = []; }

// --- DAVRANIŞLAR ---
function kitapci(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        if (!c.alert) { if (e.T.still) e.facing = dampAngle(e.facing, c.toP, 3, dt); else patrol(e, dt, 1.2 * S.speed); return; }
        if (e.T.still) e.facing = dampAngle(e.facing, c.toP, 6, dt); else keepRange(e, dt, c, 6, 12, 1.5 * S.speed);
        if (c.canStart && c.d < (e.T.alert || 15)) go(e, 'wind', 0.55, '!');
    } else if (e.st === 'wind') {
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        e.m.armR.rotation.x = 1.2 * (1 - e.t / 0.55) + 0.2;
        if (e.t <= 0) {
            const from = handPos(e, 1.5), n = Math.random() < 0.35 ? 2 : 1;
            for (let i = 0; i < n; i++) shootStraight(bookMesh(), from.clone(), 11 * (0.9 + 0.1 * S.speed), { spread: n > 1 ? (i ? 0.16 : -0.16) : 0, type: 'book' });
            G.projectiles.slice(-n).forEach(p => p.update = spinBook(p.update));
            playSfx('hit', { rate: 1.7, vol: 0.3 });
            e.m.armR.rotation.x = -1.7; if (e.m.held) e.m.held.visible = false;
            go(e, 'rest', 0.45, null);
        }
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) { if (e.m.held) e.m.held.visible = true; finish(e, 2.3); } }
}
const spinBook = (base) => (p, dt) => { p.mesh.rotation.y += dt * 12; p.mesh.rotation.z += dt * 3; base(p, dt); };

function tesbihci(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.2 * S.speed); return; }
        keepRange(e, dt, c, 5, 10, 1.6 * S.speed);
        if (c.canStart && c.d < 13) go(e, 'wind', 0.9, '!');
    } else if (e.st === 'wind') {   // tesbihi başının üstünde çevirir
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        e.m.armR.rotation.set(-2.9, Math.sin(G.time * 18) * 0.4, Math.cos(G.time * 18) * 0.4);
        if (e.m.held) e.m.held.rotation.z += dt * 20;
        if (e.t <= 0) {
            throwTesbih(e); if (e.m.held) e.m.held.visible = false;
            e.m.armR.rotation.set(-1.5, 0, 0); go(e, 'rest', 0.6, null);
        }
    } else if (e.st === 'rest') { e.t -= dt; if (e.t <= 0) { if (e.m.held) e.m.held.visible = true; e.m.armR.rotation.set(0, 0, 0); finish(e, 3.0); } }
}

function takkeci(e, dt, c) {
    const S = diff();
    if (e.st === 'idle') {
        if (!c.alert) { patrol(e, dt, 1.2 * S.speed); return; }
        keepRange(e, dt, c, 6, 11, 1.5 * S.speed);
        if (c.canStart && c.d < 14) go(e, 'wind', 0.7, '!');
    } else if (e.st === 'wind') {   // takkeyi başından çıkarıp kaldırır
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 8, dt);
        const k = 1 - e.t / 0.7;
        e.m.armR.rotation.x = -2.9 * Math.min(1, k * 2) + (k > 0.5 ? (k - 0.5) * 2.4 : 0);
        if (e.m.takke) e.m.takke.position.y = 0.5 + Math.min(1, k * 2) * 0.25;
        if (e.t <= 0) {
            if (e.m.takke) e.m.takke.visible = false;
            throwLob(handPos(e, 1.8), takkeMesh(), { type: 'takke', hurtsOnHit: true, lead: 0.4, trail: ['#f8fafc', '#e5e7eb'],
                onLand: at => makeBomb(at, takkeMesh(), { fuse: 0.55 }) });
            playSfx('hit', { rate: 1.6, vol: 0.3 });
            e.m.armR.rotation.x = -1.2; go(e, 'rest', 0.9, null);
        }
    } else if (e.st === 'rest') {   // yenisini başına koyar
        e.t -= dt;
        if (e.t <= 0) { if (e.m.takke) { e.m.takke.visible = true; e.m.takke.position.y = 0.5; } finish(e, 2.8); }
    }
}

const abi = (kind, name, update, extra = {}) => ({ kind: 'abi', name, hp: 2, score: 3500, bribable: true, deathText: 'İTİRAFÇI OLDU!', build: () => buildAbi(kind), update, ...extra });
Object.assign(TYPES, {
    abi_kitap: abi('kitap', 'KİTAPÇI ABİ', kitapci),
    abi_tesbih: abi('tesbih', 'TESBİHLİ ABİ', tesbihci, { score: 4000 }),
    abi_takke: abi('takke', 'TAKKELİ ABİ', takkeci, { score: 4000 }),
    abi_kule: abi('kitap', 'KİTAPÇI ABİ', kitapci, { still: true, alert: 30 })   // kameriyenin üstünde: yerinden kıpırdamaz
});
export { buildAbi, takkeMesh, tesbihMesh, bookMesh };
