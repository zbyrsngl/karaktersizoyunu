// HIRHIZ 3D — bölüm sonu sahneleri (canavar yenildikten sonra, karne çıkmadan önce).
// walkerOutro: (isteğe bağlı önce HIRHIZ konuşur) → bir karakter meydanın kenarından yürüyerek gelir, HIRHIZ'ın karşısında durur, konuşur.
// Kafalar 2D'deki gibi fotoğraftan kesilir ve hep kameraya döner.
//   3. bölüm: Cengiz (../resimler/cengiz.png) "Bu milletin a. koyacağız"
//   4. bölüm: HIRHIZ "Bir savcı 2 polisle hepinizi bitiririm!", sonra sonpeygamber resmindeki adam parmağını sallayarak konuşur
import * as THREE from 'three';
import { G } from './state.js?v=8';
import { limb, walkPose } from './models.js?v=8';
import { playSfx } from './audio.js?v=8';
import { box, mat, textSprite, disposeSprite, dampAngle, clamp } from './util.js?v=8';
import { ARENA } from './world.js?v=8';

// Fotoğraftan elips kesimli kafa dokusu: src içindeki [sx, sy, sw, sh] kutusu, elips [cx, cy, rx, ry] (kutuya göre)
const HEADS = {};
export function photoHead(src, [sx, sy, sw, sh], [cx, cy, rx, ry]) {
    if (HEADS[src]) return HEADS[src];
    const K = 3, c = document.createElement('canvas'); c.width = sw * K; c.height = sh * K;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const img = new Image();
    img.onload = () => {
        const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high'; x.scale(K, K);
        x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.clip();
        x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        tex.needsUpdate = true;
    };
    img.src = src;
    return (HEADS[src] = tex);
}
// Takım elbiseli adam: suit, shirt, tie renkleri; kafa fotoğrafı
function suitMan({ suit, suitD, shirt, tie, tex, faceW, faceH, pin }) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.12, 0.72, 0, 0.18, 0.7, 0.2, suitD, '#0a0a0a');
    const legR = limb(body, 0.12, 0.72, 0, 0.18, 0.7, 0.2, suitD, '#0a0a0a');
    const torso = new THREE.Group(); torso.position.y = 0.72; body.add(torso);
    torso.add(box(0.6, 0.66, 0.34, suit, 0, 0.33, 0));
    torso.add(box(0.18, 0.26, 0.02, shirt, 0, 0.52, 0.175, false));
    torso.add(box(0.06, 0.34, 0.02, tie, 0, 0.44, 0.186, false));
    if (pin) torso.add(box(0.05, 0.05, 0.02, pin, -0.18, 0.5, 0.18, false));
    const armL = limb(torso, -0.36, 0.6, 0, 0.15, 0.5, 0.16, suitD);
    const armR = limb(torso, 0.36, 0.6, 0, 0.15, 0.5, 0.16, suit);
    armL.add(box(0.11, 0.11, 0.11, '#e0a98a', 0, -0.53, 0, false)); armR.add(box(0.11, 0.11, 0.11, '#e0a98a', 0, -0.53, 0, false));
    const faceGroup = new THREE.Group(); faceGroup.position.y = 0.66; torso.add(faceGroup);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(faceW, faceH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    face.position.y = faceH * 0.45; faceGroup.add(face);
    return { root, body, legL, legR, armL, armR, torso, faceGroup };
}

// Cengiz: kolları göğsünde kavuşturulmuş
function buildCengiz() {
    const m = suitMan({ suit: '#3f3f46', suitD: '#27272a', shirt: '#f8fafc', tie: '#1f2937', faceW: 0.74, faceH: 0.94,
                        tex: photoHead('../resimler/cengiz.png', [50, 22, 88, 112], [44, 53, 37, 51]) });
    m.pose = (t, talking, walking) => {
        if (walking) { m.armL.rotation.set(Math.sin(t * 8) * 0.4, 0, 0); m.armR.rotation.set(-Math.sin(t * 8) * 0.4, 0, 0); return; }
        m.armL.rotation.set(-1.45, 0, 0.8); m.armR.rotation.set(-1.3, 0, -0.8);   // önce içe, sonra öne: eller göğüste buluşur
        m.faceGroup.rotation.z = talking ? Math.sin(t * 6) * 0.05 : 0;
    };
    return m;
}
// "Son peygamber" adamı: gri takım, bir eli havada işaret parmağı yukarıda (konuşurken sallar), öbür elinde mikrofon
function buildPeygamber() {
    const m = suitMan({ suit: '#4b5563', suitD: '#374151', shirt: '#e0f2fe', tie: '#111827', pin: '#b91c1c', faceW: 0.7, faceH: 0.99,
                        tex: photoHead('../resimler/sonpeygamber.png', [174, 78, 112, 158], [56, 80, 52, 77]) });
    const finger = box(0.04, 0.16, 0.04, '#e0a98a', 0, -0.65, 0, false); m.armR.add(finger);
    const mic = new THREE.Group(); mic.position.y = -0.55; m.armL.add(mic);
    mic.add(box(0.06, 0.26, 0.06, '#111827', 0, 0.12, 0.05));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat('#6b7280')); head.position.set(0, 0.28, 0.05); mic.add(head);
    m.pose = (t, talking, walking) => {
        finger.visible = mic.visible = !walking;
        if (walking) { m.armL.rotation.set(Math.sin(t * 8) * 0.4, 0, 0); m.armR.rotation.set(-Math.sin(t * 8) * 0.4, 0, 0); return; }
        const pump = talking ? Math.sin(t * 9) : 0;
        m.armR.rotation.set(-2.85 + pump * 0.2, 0, -0.15);      // havada, yumruğunu sallar
        m.armL.rotation.set(-2.1, 0, 0.7);                      // mikrofon çenesinde
        m.faceGroup.rotation.z = talking ? Math.sin(t * 9) * 0.06 - 0.03 : 0;
    };
    return m;
}

// Başının üstünde konuşma balonu
function bubble(text) {
    const s = textSprite(text, { size: 44, height: 0.42, color: '#111827', bg: 'rgba(248,250,252,0.96)' });
    s.position.set(0, 2.6, 0);
    return s;
}

// Genel bölüm sonu sahnesi; update(dt) bitince true döner
function walkerOutro(scene, { build, sfx, text, pre }) {
    const p = G.player;
    const o = { st: pre ? 'pre' : 'walk', t: 0, phase: 0, bubble: null, m: null };
    const start = () => {
        const m = o.m = build();
        const side = p.pos.x > 0 ? -1 : 1;
        m.root.position.set(clamp(p.pos.x + side * 11, -ARENA.hw + 1, ARENA.hw - 1), 0, clamp(p.pos.z - 4, ARENA.z1 + 2, ARENA.z0 - 2));
        scene.add(m.root);
        o.goal = new THREE.Vector3(p.pos.x + side * 2.6, 0, p.pos.z - 0.6);
        o.facing = Math.atan2(o.goal.x - m.root.position.x, o.goal.z - m.root.position.z);
    };
    const setBubble = (owner, txt) => {
        if (o.bubble) { o.bubble.parent && o.bubble.parent.remove(o.bubble); disposeSprite(o.bubble); o.bubble = null; }
        if (owner) { o.bubble = bubble(txt); owner.add(o.bubble); }
    };
    if (pre) {   // önce HIRHIZ konuşur
        o.preLen = (playSfx(pre.sfx, { vol: 1 }) || 3) + 0.5;
        setBubble(p.m.root, pre.text);
    } else start();
    o.update = (dt) => {
        o.t += dt;
        if (o.st === 'pre') {
            if (o.t > o.preLen) { setBubble(null); start(); o.st = 'walk'; o.t = 0; }
            return false;
        }
        const m = o.m, pos = m.root.position;
        if (o.st === 'walk') {
            const dx = o.goal.x - pos.x, dz = o.goal.z - pos.z, d = Math.hypot(dx, dz);
            if (d > 0.1) {
                const sp = Math.min(d, 2.3 * dt);
                pos.x += dx / d * sp; pos.z += dz / d * sp;
                o.phase += dt * 8; walkPose(m, o.phase, 0.9);
                o.facing = dampAngle(o.facing, Math.atan2(dx, dz), 8, dt);
                m.pose(o.t, false, true);
            } else { o.st = 'turn'; o.t = 0; walkPose(m, 0, 0); }
        } else if (o.st === 'turn') {   // HIRHIZ'a döner, konuşmaya başlar
            o.facing = dampAngle(o.facing, Math.atan2(p.pos.x - pos.x, p.pos.z - pos.z), 8, dt);
            m.pose(o.t, false, false);
            if (o.t > 0.4) { o.talk = playSfx(sfx, { vol: 1 }) || 3; o.st = 'talk'; o.t = 0; setBubble(m.root, text); }
        } else if (o.st === 'talk') {
            m.pose(o.t, true, false);
            if (o.t > o.talk + 0.8) { o.st = 'done'; return true; }
        } else if (o.st === 'done') return true;
        m.root.rotation.y = o.facing;
        const c = G.camera.position;
        m.faceGroup.rotation.y = Math.atan2(c.x - pos.x, c.z - pos.z) - o.facing;
        return false;
    };
    o.remove = () => { setBubble(null); if (o.m) scene.remove(o.m.root); };
    return o;
}

export function cengizOutro(scene) {
    return walkerOutro(scene, { build: buildCengiz, sfx: 'cengiz', text: 'Bu milletin a. koyacağız' });
}
export function peygamberOutro(scene) {
    return walkerOutro(scene, { build: buildPeygamber, sfx: 'peygamber', text: 'Eğer son peygamber Hz. Muhammet olmasaydı...',
                                pre: { sfx: 'savci', text: 'Bir savcı 2 polisle hepinizi bitiririm!' } });
}
