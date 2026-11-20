// HIRHIZ 3D — 4. bölüm düşmanları: 15 Temmuz darbeci askerleri. Davranışları polislerinkiyle aynı (police.js POLICE_AI),
// modelleri kendine özgü: kamuflaj üniforma, miğfer (askeri öğrencide bordo bere), omuzda bayrak, G3 tüfeği.
//   DARBECİ ASKER / ASKERİ ÖĞRENCİ: tüfekle nişan alır, tek atış ya da üçlü seri
//   KALKANLI ASKER: önünde koyu yeşil balistik kalkan (önden gelen kelepçeyi durdurur), dipçik vurur, kalkan hücumu
//   GAZCI ASKER: gaz bombası atar (bulut bir kez can götürür)
//   TANKIN ÜSTÜNDEKİ NİŞANCI: tankın kulesinde diz çöker, lazerle izler
// Yenilen asker silahını bırakır, elleri arkadan kelepçelenir ve götürülür: "TUTUKLANDI!"
import * as THREE from 'three';
import { limb, labelTorso } from './models.js?v=29';
import { tr } from './i18n.js?v=29';
import { box, mat, canvasTex } from './util.js?v=29';
import { TYPES } from './enemies.js?v=29';
import { POLICE_AI } from './police.js?v=29';

const OLIVE = '#4d5b2a', OLIVE_D = '#3a4520', SKIN = '#e8b48f';
let camoTex = null, flagTex = null;
function camo() {
    camoTex = camoTex || canvasTex(64, 64, (g) => {
        g.fillStyle = OLIVE; g.fillRect(0, 0, 64, 64);
        const C = ['#36401c', '#6b7a3a', '#2b2f1a', '#7c6a46'];
        for (let i = 0; i < 26; i++) { g.fillStyle = C[i % 4]; g.beginPath(); g.ellipse(Math.random() * 64, Math.random() * 64, 4 + Math.random() * 7, 2 + Math.random() * 4, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
    }, { pixel: true });
    return new THREE.MeshLambertMaterial({ map: camoTex });
}
function flagPatch() {   // omuzdaki Türk bayrağı
    flagTex = flagTex || canvasTex(48, 32, (g, W, H) => {
        g.fillStyle = '#e30a17'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(18, 16, 8, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e30a17'; g.beginPath(); g.arc(20.5, 16, 6.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.6 : 4, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(31 + Math.cos(a) * r, 16 + Math.sin(a) * r); } g.fill();
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.09), new THREE.MeshBasicMaterial({ map: flagTex }));
}
// G3 tüfeği: kolun ucunda, kolla aynı doğrultuda (kol öne kalkınca namlu öne bakar)
function rifle() {
    const g = new THREE.Group(); g.position.y = -0.55;
    g.add(box(0.06, 0.7, 0.1, '#1c1917', 0, -0.2, 0.05));
    g.add(box(0.03, 0.18, 0.03, '#1c1917', 0, -0.62, 0.05, false));
    g.add(box(0.07, 0.26, 0.11, '#3f2a1d', 0, 0.2, 0.05));
    g.add(box(0.05, 0.12, 0.12, '#1c1917', 0.05, -0.1, 0.12, false));
    return g;
}

// variant: 'rifle' | 'cadet' | 'shield' | 'gas' | 'sniper'
export function buildSoldier(variant) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.11, 0.7, 0, 0.17, 0.68, 0.19, OLIVE_D, '#1c1917');
    const legR = limb(body, 0.11, 0.7, 0, 0.17, 0.68, 0.19, OLIVE_D, '#1c1917');
    const torso = new THREE.Group(); torso.position.y = 0.7; body.add(torso);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), camo()); t.position.y = 0.31; t.castShadow = true; torso.add(t);
    torso.add(box(0.54, 0.08, 0.32, '#1c1917', 0, 0.06, 0, false));                      // kemer
    torso.add(box(0.12, 0.12, 0.08, '#3f3f1a', -0.14, 0.1, 0.17, false)); torso.add(box(0.12, 0.12, 0.08, '#3f3f1a', 0.14, 0.1, 0.17, false));   // fişeklik
    const fp = flagPatch(); fp.position.set(-0.27, 0.48, 0.05); fp.rotation.y = -Math.PI / 2; torso.add(fp);
    labelTorso(torso, tr('ASKER'), '#f8fafc', '#2b3316', { frontY: 0.34, backY: 0.38 });   // göğüste ve sırtta ASKER (dile göre)
    const head = new THREE.Group(); head.position.y = 0.62; torso.add(head);
    head.add(box(0.12, 0.1, 0.12, SKIN, 0, 0.02, 0));
    head.add(box(0.34, 0.38, 0.32, SKIN, 0, 0.25, 0));
    if (variant === 'gas') {
        head.add(box(0.3, 0.26, 0.1, '#374151', 0, 0.22, 0.17, false));
        head.add(box(0.1, 0.06, 0.02, '#a5f3fc', -0.07, 0.28, 0.225, false)); head.add(box(0.1, 0.06, 0.02, '#a5f3fc', 0.07, 0.28, 0.225, false));
    } else {
        head.add(box(0.05, 0.05, 0.02, '#111', -0.08, 0.28, 0.165, false)); head.add(box(0.05, 0.05, 0.02, '#111', 0.08, 0.28, 0.165, false));
        if (variant !== 'cadet') head.add(box(0.16, 0.045, 0.03, '#3f2a1d', 0, 0.17, 0.17, false));   // bıyık (öğrencide yok)
    }
    if (variant === 'cadet') {   // bordo bere + altın arma
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), mat('#7f1d1d'));
        b.scale.set(1.05, 0.5, 1); b.position.set(-0.02, 0.43, 0); b.rotation.z = 0.2; head.add(b);
        head.add(box(0.06, 0.06, 0.02, '#fbbf24', 0.1, 0.45, 0.17, false));
    } else {   // miğfer
        const hm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.9), camo());
        hm.position.y = 0.33; hm.castShadow = true; head.add(hm);
        head.add(box(0.5, 0.04, 0.5, OLIVE, 0, 0.33, 0, false));
    }
    const armL = limb(torso, -0.33, 0.58, 0, 0.13, 0.52, 0.14, OLIVE);
    const armR = limb(torso, 0.33, 0.58, 0, 0.13, 0.52, 0.14, OLIVE);
    armL.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.55, 0, false)); armR.add(box(0.1, 0.1, 0.1, SKIN, 0, -0.55, 0, false));
    const extra = {};
    if (variant === 'rifle' || variant === 'cadet') { extra.weapon = rifle(); armR.add(extra.weapon); }
    if (variant === 'shield') {   // balistik kalkan (görüş camlı, üstünde bayrak)
        const s = new THREE.Group(); s.position.set(-0.05, 0.25, 0.38); torso.add(s);
        s.add(box(0.7, 1.25, 0.06, '#283618', 0, 0, 0));
        s.add(box(0.36, 0.1, 0.02, '#94a3b8', 0, 0.42, 0.04, false));
        const f = flagPatch(); f.scale.setScalar(1.6); f.position.set(0, 0.05, 0.04); s.add(f);
        extra.shield = s;
        const butt = new THREE.Group(); butt.position.y = -0.55; armR.add(butt);   // dipçik
        butt.add(box(0.07, 0.3, 0.1, '#3f2a1d', 0, -0.1, 0.05)); extra.weapon = butt;
    }
    if (variant === 'gas') {
        const g = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.6, 8), mat('#1c1917'));
        g.rotation.x = Math.PI / 2; g.position.set(0, -0.55, 0.22); armR.add(g); extra.weapon = g;
    }
    if (variant === 'sniper') {   // diz çökmüş, tüfek omzunda; lazer namludan çıkar
        body.position.y = -0.42; legL.rotation.x = -1.45; legR.rotation.x = 0.35;
        armR.rotation.x = -1.45; armL.rotation.x = -1.2; armL.rotation.z = 0.5;
        const r = new THREE.Group(); r.position.set(0.33, 1.28, 0.25); body.add(r);
        r.add(box(0.06, 0.09, 1.1, '#1c1917', 0, 0, 0.3)); r.add(box(0.05, 0.07, 0.24, '#374151', 0, 0.09, 0.2, false));
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]);
        const laser = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.9 }));
        laser.position.set(0, 0, 0.85); laser.visible = false; r.add(laser);
        extra.rifle = r; extra.laser = laser; extra.weapon = r;
    }
    return { root, body, legL, legR, armL, armR, torso, head, ...extra };
}

const soldier = (variant, name, ai, extra = {}) => ({ kind: 'soldier', name, hp: 2, score: 3000, arrest: true, build: () => buildSoldier(variant), update: POLICE_AI[ai], ...extra });
Object.assign(TYPES, {
    soldier: soldier('rifle', 'DARBECİ ASKER', 'police'),
    cadet: soldier('cadet', 'ASKERİ ÖĞRENCİ', 'police'),
    shieldsoldier: soldier('shield', 'KALKANLI ASKER', 'riot', { shieldFront: true, score: 4000 }),
    gassoldier: soldier('gas', 'GAZCI ASKER', 'gas', { score: 4000 }),
    tanksniper: soldier('sniper', 'TANKTAKİ NİŞANCI', 'sniper', { score: 5000, arrest: false, alert: 32, labelY: 1.95, height: 1.45, harmless: true,
                                                                onDeath: e => { e.m.laser.visible = false; } })
});
