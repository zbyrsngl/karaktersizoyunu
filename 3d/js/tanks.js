// HIRHIZ 3D — 5. bölüm düşmanı: MİNİ TANK. Kapağından miğferli bir asker başı çıkar.
// Ağır ağır döner ve yaklaşır; namluyu çevirip (başında kırmızı !) mermi atar. Üstüne zıplanır, balyozla vurulur;
// rüşvet atılınca TESLİM olur: kapaktan beyaz bayrak çıkar, geri geri gidip kaybolur.
import * as THREE from 'three';
import { G, diff } from './state.js?v=22';
import { burst, addTrauma } from './fx.js?v=22';
import { playSfx } from './audio.js?v=22';
import { box, mat, canvasTex, dampAngle, angDiff } from './util.js?v=22';
import { TYPES, patrol, stepToward, go, finish, handPos, shootStraight } from './enemies.js?v=22';

let camoTex = null;
export function tankCamo() {
    camoTex = camoTex || canvasTex(64, 64, (g) => {
        g.fillStyle = '#4d5b2a'; g.fillRect(0, 0, 64, 64);
        const C = ['#36401c', '#6b7a3a', '#2b2f1a'];
        for (let i = 0; i < 20; i++) { g.fillStyle = C[i % 3]; g.beginPath(); g.ellipse(Math.random() * 64, Math.random() * 64, 5 + Math.random() * 8, 3 + Math.random() * 4, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
    }, { pixel: true });
    return new THREE.MeshLambertMaterial({ map: camoTex });
}

// Mini tank modeli (+z yönüne bakar). armL/armR/legL/legR ortak kodun beklediği boş eklemler.
function buildMiniTank() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const cm = tankCamo();
    [-0.62, 0.62].forEach(x => {   // paletler + tekerlekler
        body.add(box(0.36, 0.45, 2.3, '#1c1917', x, 0.23, 0));
        for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.38, 8), mat('#4b5563')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.2, -0.8 + i * 0.53); body.add(w); }
    });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.2), cm); hull.position.y = 0.65; hull.castShadow = true; body.add(hull);
    const turretG = new THREE.Group(); turretG.position.set(0, 0.9, -0.15); body.add(turretG);
    const turret = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.4, 1.0), cm); turret.position.y = 0.2; turret.castShadow = true; turretG.add(turret);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.3, 8), mat('#2b2f1a')); gun.rotation.x = Math.PI / 2; gun.position.set(0, 0.22, 1.05); turretG.add(gun);
    // kapaktan çıkan asker başı
    turretG.add(box(0.26, 0.24, 0.24, '#e8b48f', 0.22, 0.52, -0.2));
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 1.9), cm); hm.position.set(0.22, 0.63, -0.2); turretG.add(hm);
    turretG.add(box(0.04, 0.04, 0.02, '#111', 0.17, 0.55, -0.075, false)); turretG.add(box(0.04, 0.04, 0.02, '#111', 0.27, 0.55, -0.075, false));
    // teslim bayrağı (başta gizli)
    const flag = new THREE.Group(); flag.position.set(-0.2, 0.4, -0.2); flag.visible = false; turretG.add(flag);
    flag.add(box(0.03, 1.2, 0.03, '#78350f', 0, 0.6, 0));
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.38), new THREE.MeshLambertMaterial({ color: '#f8fafc', side: THREE.DoubleSide })); cloth.position.set(0.29, 1.0, 0); flag.add(cloth);
    const d = () => { const g = new THREE.Group(); body.add(g); return g; };
    return { root, body, turretG, gun, flag, armL: d(), armR: d(), legL: d(), legR: d(), torso: d() };
}

const SHELL_GEO = new THREE.SphereGeometry(0.12, 8, 6), SHELL_MAT = new THREE.MeshLambertMaterial({ color: '#27272a' });
function miniTank(e, dt, c) {
    const S = diff(), m = e.m;
    if (e.st === 'idle') {
        m.gun.position.z = 1.05;
        if (!c.alert) { patrol(e, dt, 1.0 * S.speed); return; }
        e.facing = dampAngle(e.facing, c.toP, 1.8, dt);   // ağır ağır döner
        if (c.d > 8 && stepToward(e, e.facing, 1.3 * S.speed, dt)) m.body.position.y = Math.abs(Math.sin(G.time * 18)) * 0.02;
        if (c.canStart && c.d < 16 && Math.abs(angDiff(e.facing, c.toP)) < 0.3) go(e, 'aim', 0.7 * S.fire + 0.1, '!');
    } else if (e.st === 'aim') {   // namlu oyuncuya döner
        e.t -= dt; e.facing = dampAngle(e.facing, c.toP, 3, dt);
        m.turretG.rotation.y = Math.sin(G.time * 30) * 0.02;
        if (e.t <= 0) {
            const from = e.pos.clone().add(new THREE.Vector3(Math.sin(e.facing) * 1.6, 1.12, Math.cos(e.facing) * 1.6));
            shootStraight(new THREE.Mesh(SHELL_GEO, SHELL_MAT), from, 11 * (0.9 + 0.1 * S.speed), { type: 'shell', life: 2.5 });
            burst(from, { n: 6, color: ['#fde047', '#f97316', '#57534e'], speed: 2, up: 1, size: 0.12, life: 0.35 });
            playSfx('boom', { rate: 1.6, vol: 0.25 }); addTrauma(0.05);
            m.gun.position.z = 0.8;   // geri tepme
            go(e, 'rest', 0.4, null);
        }
    } else if (e.st === 'rest') {
        e.t -= dt; m.gun.position.z += (1.05 - m.gun.position.z) * Math.min(1, dt * 8);
        if (e.t <= 0) finish(e, 2.6);
    }
}

TYPES.minitank = {
    kind: 'tank', name: 'MİNİ TANK', hp: 3, score: 4000, bribable: true, height: 1.3, labelY: 1.95,
    build: buildMiniTank, update: miniTank,
    onDeath: e => { e.m.flag.visible = true; },   // beyaz bayrak: TESLİM
    deathText: 'TESLİM!', alwaysLeave: true
};
