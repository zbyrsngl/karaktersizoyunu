// HIRHIZ 3D — bölüm sonu sahneleri (canavar yenildikten sonra, karne çıkmadan önce).
// 3. bölüm: Cengiz meydanın kenarından yürüyerek gelir, HIRHIZ'ın karşısında durur, konuşur (sfx/milletinminakoycaz.mp3).
// Kafası 2D'deki gibi fotoğraftan (../resimler/cengiz.png), hep kameraya döner.
import * as THREE from 'three';
import { G } from './state.js?v=7';
import { limb, walkPose } from './models.js?v=7';
import { playSfx } from './audio.js?v=7';
import { box, textSprite, disposeSprite, dampAngle, clamp } from './util.js?v=7';
import { ARENA } from './world.js?v=7';

let cengizTex = null;
function cengizHead() {
    if (cengizTex) return cengizTex;
    const K = 3, c = document.createElement('canvas'); c.width = 88 * K; c.height = 112 * K;
    cengizTex = new THREE.CanvasTexture(c); cengizTex.colorSpace = THREE.SRGBColorSpace;
    const img = new Image();
    img.onload = () => {
        const x = c.getContext('2d');
        x.imageSmoothingQuality = 'high';
        x.scale(K, K);
        x.beginPath(); x.ellipse(44, 53, 37, 51, 0, 0, Math.PI * 2); x.clip();   // 2D'deki kesimin aynısı
        x.drawImage(img, 50, 22, 88, 112, 0, 0, 88, 112);
        cengizTex.needsUpdate = true;
    };
    img.src = '../resimler/cengiz.png';
    return cengizTex;
}
function buildCengiz() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legL = limb(body, -0.12, 0.72, 0, 0.18, 0.7, 0.2, '#27272a', '#0a0a0a');
    const legR = limb(body, 0.12, 0.72, 0, 0.18, 0.7, 0.2, '#27272a', '#0a0a0a');
    const torso = new THREE.Group(); torso.position.y = 0.72; body.add(torso);
    torso.add(box(0.6, 0.66, 0.34, '#3f3f46', 0, 0.33, 0));
    torso.add(box(0.18, 0.26, 0.02, '#f8fafc', 0, 0.52, 0.175, false));
    torso.add(box(0.06, 0.34, 0.02, '#1f2937', 0, 0.44, 0.186, false));
    // göğüste kavuşturulmuş kollar
    const armL = limb(torso, -0.36, 0.6, 0, 0.15, 0.5, 0.16, '#52525b');
    const armR = limb(torso, 0.36, 0.6, 0, 0.15, 0.5, 0.16, '#3f3f46');
    armL.rotation.set(-1.45, 0, 0.8); armR.rotation.set(-1.3, 0, -0.8);   // önce içe, sonra öne: eller göğüste buluşur
    const faceGroup = new THREE.Group(); faceGroup.position.y = 0.66; torso.add(faceGroup);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.94), new THREE.MeshBasicMaterial({ map: cengizHead(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    face.position.y = 0.42; faceGroup.add(face);
    return { root, body, legL, legR, armL, armR, torso, faceGroup };
}

// Cengiz gelir ve konuşur; update(dt) bitince true döner
export function cengizOutro(scene) {
    const p = G.player, m = buildCengiz();
    const side = p.pos.x > 0 ? -1 : 1;
    m.root.position.set(clamp(p.pos.x + side * 11, -ARENA.hw + 1, ARENA.hw - 1), 0, clamp(p.pos.z - 4, ARENA.z1 + 2, ARENA.z0 - 2));
    scene.add(m.root);
    const goal = new THREE.Vector3(p.pos.x + side * 2.6, 0, p.pos.z - 0.6);
    const o = { m, st: 'walk', t: 0, phase: 0, facing: Math.atan2(goal.x - m.root.position.x, goal.z - m.root.position.z), bubble: null };
    o.update = (dt) => {
        const pos = m.root.position;
        o.t += dt;
        if (o.st === 'walk') {
            const dx = goal.x - pos.x, dz = goal.z - pos.z, d = Math.hypot(dx, dz);
            if (d > 0.1) {
                const sp = Math.min(d, 2.3 * dt);
                pos.x += dx / d * sp; pos.z += dz / d * sp;
                o.phase += dt * 8; walkPose(m, o.phase, 0.9);
                o.facing = dampAngle(o.facing, Math.atan2(dx, dz), 8, dt);
            } else {
                o.st = 'turn'; o.t = 0; walkPose(m, 0, 0);
            }
        } else if (o.st === 'turn') {   // HIRHIZ'a döner, konuşmaya başlar
            o.facing = dampAngle(o.facing, Math.atan2(p.pos.x - pos.x, p.pos.z - pos.z), 8, dt);
            if (o.t > 0.4) {
                const dur = playSfx('cengiz', { vol: 1 }) || 3;
                o.talk = dur; o.st = 'talk'; o.t = 0;
                o.bubble = textSprite('Bu milletin a. koyacağız', { size: 44, height: 0.42, color: '#111827', bg: 'rgba(248,250,252,0.96)' });
                o.bubble.position.set(0, 2.55, 0); m.root.add(o.bubble);
            }
        } else if (o.st === 'talk') {
            m.faceGroup.rotation.z = Math.sin(o.t * 6) * 0.05;   // konuşurken kafası hafif sallanır
            if (o.t > o.talk + 0.8) { o.st = 'done'; return true; }
        } else if (o.st === 'done') return true;
        m.root.rotation.y = o.facing;
        const c = G.camera.position;
        m.faceGroup.rotation.y = Math.atan2(c.x - pos.x, c.z - pos.z) - o.facing;
        return false;
    };
    o.remove = () => { if (o.bubble) disposeSprite(o.bubble); scene.remove(m.root); };
    return o;
}
