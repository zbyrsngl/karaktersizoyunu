// HIRHIZ 3D — 6. bölüm uçuşu için gerçekçilik ve kalabalık gökyüzü:
//   - Türk F-16'ları arkadan gelip ses duvarını aşarak yanından geçer: buhar konisi, art yakıcı, çift BUM, ekran sallanır
//   - uçağın seyir ışıkları (sol kırmızı, sağ yeşil, beyaz flaş), sert dönüşte kanat ucu buhar izleri, hafif türbülans
//   - hız çizgileri, yakında akan bulut kümeleri, uzakta yanıp sönen yolcu uçakları, yerden gökyüzünü tarayan projektörler
import * as THREE from 'three';
import { G } from './state.js?v=27';
import { floatText, addTrauma } from './fx.js?v=27';
import { jetPass, sonicBoom } from './audio.js?v=27';
import { box, mat, canvasTex, rand } from './util.js?v=27';

const SPEED = 30;

// Türk F-16'sı (-Z yönüne uçar): gri gövde, delta kanat, damla kokpit, kuyrukta ay-yıldız; art yakıcı ve buhar konisi
let tailTex = null;
function buildF16() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const grey = '#8b95a3', dark = '#6b7480';
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 6.4, 10), mat(grey)); fus.rotation.x = Math.PI / 2; body.add(fus);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 10), mat(dark)); nose.rotation.x = -Math.PI / 2; nose.position.z = -4.3; body.add(nose);
    body.add(box(0.9, 0.5, 1.8, dark, 0, -0.45, -0.6, false));                          // alt hava girişi
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -1.6, -3.4, 0, 1.4, 0, 0, 1.8, 0, 0, -1.6, 0, 0, 1.8, 3.4, 0, 1.4], 3));
    wingGeo.computeVertexNormals();
    body.add(new THREE.Mesh(wingGeo, new THREE.MeshLambertMaterial({ color: grey, side: THREE.DoubleSide })));
    [-1, 1].forEach(s => { body.add(box(0.12, 0.12, 1.4, '#e5e7eb', s * 3.35, 0, 1.0, false)); });   // kanat ucu füzeleri
    body.add(box(2.6, 0.06, 1.0, grey, 0, 0, 2.7));                                    // yatay stabilize
    const fin = box(0.1, 1.6, 1.5, grey, 0, 0.95, 2.4); body.add(fin);
    tailTex = tailTex || canvasTex(64, 64, (c) => {
        c.fillStyle = '#e30a17'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#fff'; c.beginPath(); c.arc(26, 32, 14, 0, 7); c.fill(); c.fillStyle = '#e30a17'; c.beginPath(); c.arc(30, 32, 11, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = Math.PI + i * Math.PI / 5, r = i % 2 ? 2.6 : 6.6; c.lineTo(42 + Math.cos(a) * r, 32 + Math.sin(a) * r); } c.fill();
    });
    [-1, 1].forEach(s => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: tailTex })); f.position.set(s * 0.06, 1.15, 2.4); f.rotation.y = s * Math.PI / 2; body.add(f); });
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshLambertMaterial({ color: '#fbbf24', emissive: '#78350f', transparent: true, opacity: 0.85 }));
    canopy.scale.set(0.9, 0.8, 2.4); canopy.position.set(0, 0.42, -2.3); body.add(canopy);
    // art yakıcı: turuncu dış koni + mavi-beyaz iç koni + ışık
    const ab = new THREE.Group(); ab.position.z = 3.6; body.add(ab);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.6, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    outer.rotation.x = -Math.PI / 2; outer.position.z = 1.3; ab.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.4, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#bfdbfe', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    inner.rotation.x = -Math.PI / 2; inner.position.z = 0.7; ab.add(inner);
    // buhar konisi (ses duvarı): kanadın ortasından arkaya açılan yarı saydam beyaz koni
    const vapor = new THREE.Mesh(new THREE.ConeGeometry(1.9, 3.2, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    vapor.rotation.x = -Math.PI / 2; vapor.position.z = 0.3; body.add(vapor);
    const light = new THREE.PointLight('#fb923c', 0, 18, 1.6); light.position.z = 5; body.add(light);
    // seyir ışıkları
    const navR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: '#ef4444' })); navR.position.set(-3.4, 0, 1.4); body.add(navR);
    const navG = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), new THREE.MeshBasicMaterial({ color: '#22c55e' })); navG.position.set(3.4, 0, 1.4); body.add(navG);
    return { root, body, outer, inner, vapor, light };
}

// Uzakta yolcu uçağı: koyu gövde, yanıp sönen kırmızı tepe lambası ve beyaz flaşlar
function buildAirliner() {
    const g = new THREE.Group();
    const f = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 14, 8), mat('#334155')); f.rotation.x = Math.PI / 2; g.add(f);
    g.add(box(18, 0.25, 3, '#1e293b', 0, -0.3, 0.5));
    g.add(box(0.25, 3, 2.4, '#1e293b', 0, 1.8, 6));
    const lights = ['#ef4444', '#f8fafc', '#f8fafc'].map((c, i) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), new THREE.MeshBasicMaterial({ color: c, fog: false })); l.position.set(i === 0 ? 0 : (i === 1 ? -9 : 9), i === 0 ? 1.3 : -0.3, i === 0 ? 0 : 1); g.add(l); return l; });
    // yolcu pencereleri (sarı nokta sırası)
    for (let k = 0; k < 10; k++) [-1, 1].forEach(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: '#fde68a' })); w.position.set(s * 1.21, 0.3, -5 + k * 1.1); g.add(w); });
    return { g, lights };
}

let streakMat = null;
// Arkaya akan buhar/duman parçacıkları (dünya uçağa göre akar: izler geride kalmalı)
const PUFF_GEO = new THREE.IcosahedronGeometry(1, 0);
const PUFF_MATS = { white: new THREE.MeshBasicMaterial({ color: '#f1f5f9', transparent: true, opacity: 0.55, depthWrite: false }), grey: new THREE.MeshBasicMaterial({ color: '#94a3b8', transparent: true, opacity: 0.45, depthWrite: false }) };
function puff(F, pos, { size = 0.2, life = 0.6, vz = SPEED, kind = 'white', grow = 1.5, spread = 0 } = {}) {
    const L = F.life; let o = L.pool.pop();
    if (!o) { o = { m: new THREE.Mesh(PUFF_GEO, PUFF_MATS[kind]) }; }
    o.m.material = PUFF_MATS[kind]; o.m.position.copy(pos); o.m.scale.setScalar(size); o.m.visible = true;
    if (!o.m.parent) F.scene.add(o.m);
    o.v = new THREE.Vector3(rand(-spread, spread), rand(-spread, spread), vz); o.life = o.max = life; o.size = size; o.grow = grow;
    L.puffs.push(o);
}
export function initFlightLife(F, scene) {
    const L = { puffs: [], pool: [], lastBoom: -9, f16: [], next: 7, airliners: [], beams: [], streaks: [], wingT: 0, turb: 0, boomFlash: 0 };
    F.life = L;
    // --- uçağın seyir ışıkları ---
    const pm = F.plane;
    const mk = (c, x, y, z, s = 0.11) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); pm.body.add(m); return m; };
    L.navL = mk('#ef4444', -3.6, -0.15, 0.3); L.navR = mk('#22c55e', 3.6, -0.15, 0.3);
    L.strobe = mk('#ffffff', 0, 1.55, 2.9, 0.12); L.beacon = mk('#ef4444', 0, -0.62, 0, 0.1);
    L.strobeLight = new THREE.PointLight('#ffffff', 0, 10, 2); L.strobeLight.position.set(0, 1.6, 2.9); pm.body.add(L.strobeLight);
    // --- hız çizgileri ---
    streakMat = streakMat || new THREE.MeshBasicMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.35, depthWrite: false });
    const sg = new THREE.BoxGeometry(0.025, 0.025, 5);
    for (let i = 0; i < 46; i++) {
        const s = new THREE.Mesh(sg, streakMat); placeStreak(s, rand(-120, 20)); scene.add(s); L.streaks.push(s);
    }
    // --- uzaktaki yolcu uçakları ---
    [[-95, 34, -220, 0.3], [110, 46, -320, -0.2], [-140, 55, -120, 0.15]].forEach(([x, y, z, yaw]) => {
        const a = buildAirliner(); a.g.position.set(x, y, z); a.g.rotation.y = yaw; scene.add(a.g); L.airliners.push({ ...a, vz: rand(8, 14) });
    });
    // --- yerden gökyüzünü tarayan projektörler (şehir alarmda) ---
    const beamM = new THREE.MeshBasicMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 6; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 0.3, 140, 10, 1, true), beamM);
        b.geometry.translate(0, 70, 0);
        b.position.set(rand(-160, 160), -60, rand(-360, -80)); scene.add(b);
        L.beams.push({ b, ph: rand(0, 6), sp: rand(0.25, 0.5) });
    }
    return L;
}
function placeStreak(s, z) { let x, y; do { x = rand(-26, 26); y = rand(-6, 26); } while (Math.abs(x) < 4 && y > 4 && y < 15); s.position.set(x, y, z); }

function spawnF16(F) {
    const L = F.life, n = Math.random() < 0.6 ? 2 : 1, side = Math.random() < 0.5 ? -1 : 1;
    const high = Math.random() < 0.35;   // bazen tepeden geçerler
    jetPass(3.4, 0.4, 0.5);
    for (let k = 0; k < n; k++) {
        const m = buildF16(); m.root.scale.setScalar(1.25); F.scene.add(m.root);
        const x = high ? F.pos.x + side * (2 + k * 5) : F.pos.x + side * (8 + k * 4.5), y = high ? F.pos.y + 6 + k * 1.5 : F.pos.y + rand(-1, 2) + k * 1.2;
        m.root.position.set(x, y, 70 + k * 14);
        L.f16.push({ m, pos: m.root.position, vz: -125 - k * 6, boomed: false, t: 0, roll: side * 0.25, climb: 0 });
    }
    floatText('F-16!', new THREE.Vector3(F.pos.x + side * 6, F.pos.y + 3, -8), '#93c5fd', 0.8, 1.2);
}

export function updateFlightLife(F, dt, camera) {
    const L = F.life; if (!L) return;
    const t = G.time;
    // seyir ışıkları: beyaz flaş çift çakar, alt lamba yavaş yanıp söner
    const st = t % 1.2, on = st < 0.06 || (st > 0.16 && st < 0.22);
    L.strobe.visible = on; L.strobeLight.intensity = on ? 6 : 0; L.beacon.visible = (t % 1) < 0.5;
    // türbülans: arada kısa sarsıntılar ve uçak hafifçe sallanır
    L.turb -= dt;
    if (L.turb <= 0) { L.turb = rand(5, 11); L.bump = 0.8; }
    if (L.bump > 0) { L.bump -= dt; F.plane.body.position.y = Math.sin(t * 30) * 0.08 * L.bump; F.plane.body.rotation.x = Math.sin(t * 23) * 0.02 * L.bump; addTrauma(dt * 0.35); }
    else { F.plane.body.position.y = Math.sin(t * 2.3) * 0.04; F.plane.body.rotation.x = 0; }
    // sert dönüş / tırmanışta kanat ucu buhar izleri
    const hard = Math.abs(F.vel.x) > 7 || Math.abs(F.vel.y) > 6;
    if (hard && !G.player.dead) {
        L.wingT -= dt;
        if (L.wingT <= 0) {
            L.wingT = 0.02;
            [-1, 1].forEach(s => {
                const v = new THREE.Vector3(s * 3.6, -0.15, 0.6); F.plane.root.localToWorld(v);
                puff(F, v, { size: 0.09, life: 0.6, grow: 0.6 });
            });
        }
    }
    // hız çizgileri
    const d = SPEED * 4 * dt;
    L.streaks.forEach(s => { s.position.z += d; if (s.position.z > 22) placeStreak(s, rand(-130, -100)); });
    // yolcu uçakları ve projektörler
    L.airliners.forEach(a => {
        a.g.position.z += (SPEED * 0.15 - a.vz * 0.1) * dt; if (a.g.position.z > 60) a.g.position.z -= 420;
        a.lights[0].visible = (t % 1.4) < 0.7; a.lights[1].visible = a.lights[2].visible = (t % 1.1) < 0.08;
    });
    L.beams.forEach(o => {
        o.b.rotation.z = Math.sin(t * o.sp + o.ph) * 0.5; o.b.rotation.x = Math.cos(t * o.sp * 0.8 + o.ph) * 0.35;
        o.b.position.z += SPEED * 0.5 * dt; if (o.b.position.z > 40) o.b.position.z -= 420;
    });
    // F-16 geçişleri
    if (G.state === 'play') {
        L.next -= dt;
        if (L.next <= 0) { L.next = rand(11, 17); spawnF16(F); }
    }
    L.f16 = L.f16.filter(j => {
        j.t += dt;
        j.pos.z += j.vz * dt;
        const m = j.m;
        m.outer.scale.set(1, 0.85 + Math.random() * 0.35, 1); m.inner.scale.set(1, 0.9 + Math.random() * 0.2, 1);
        m.light.intensity = 25;
        // uçağın yanından geçerken ses duvarı: buhar konisi, BUM, sarsıntı
        if (!j.boomed && j.pos.z < F.pos.z + 6) {
            j.boomed = true; j.vaporT = 0.7;
            if (t - L.lastBoom > 0.6) { L.lastBoom = t; sonicBoom(); addTrauma(0.8); floatText('BUUUM!', j.pos.clone().setY(j.pos.y + 2.5), '#e0f2fe', 1.1, 1); }
            for (let k = 0; k < 14; k++) puff(F, j.pos.clone(), { size: 0.5, life: 0.9, vz: SPEED * 0.6, spread: 5, grow: 2.5 });
        }
        if (j.vaporT > 0) { j.vaporT -= dt; m.vapor.material.opacity = Math.min(0.75, j.vaporT * 1.3); m.vapor.scale.setScalar(1 + (0.7 - j.vaporT) * 1.2); }
        else m.vapor.material.opacity = 0;
        // geçtikten sonra yukarı çekip yana yatarak uzaklaşır
        if (j.boomed) { j.climb += dt; j.pos.y += j.climb * 9 * dt; m.root.rotation.x = Math.min(0.45, j.climb * 0.5); m.root.rotation.z += j.roll * dt * 2.5; }
        // art yakıcı izi
        if (Math.random() < 0.8) { const tail = new THREE.Vector3(0, 0, 5.4); m.root.localToWorld(tail); puff(F, tail, { size: 0.3, life: 0.8, vz: SPEED * 0.5, kind: 'grey', grow: 2 }); }
        if (j.pos.z < -420) { F.scene.remove(m.root); return false; }
        return true;
    });
    // parçacıklar
    L.puffs = L.puffs.filter(o => {
        o.life -= dt; o.m.position.addScaledVector(o.v, dt);
        const k = 1 - o.life / o.max; o.m.scale.setScalar(o.size * (1 + k * o.grow) * Math.min(1, o.life / (o.max * 0.3)));
        if (o.life <= 0) { o.m.visible = false; L.pool.push(o); return false; }
        return true;
    });
    // kamera dönüşle hafif yatar (gerçek uçuş hissi)
    if (camera) camera.rotateZ(F.plane.root.rotation.z * 0.22);
}
export function clearFlightLife(F) {
    const L = F.life; if (!L) return;
    L.f16.forEach(j => F.scene.remove(j.m.root)); L.f16 = []; L.next = 7;
    L.puffs.forEach(o => { o.m.visible = false; L.pool.push(o); }); L.puffs = [];
}
