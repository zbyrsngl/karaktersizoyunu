// HIRHIZ 3D: arka plan kalabalıkları ve canlı sahneler (bölümlerin hikâyesine göre süs)
// İnsanlar kutulardan yapılır ve bir grup tek bir ağa (vertex renkli) birleştirilir: 30 kişi = 1 çizim (telefon performansı).
// Pozlar: stand, sit (yere oturmuş, piknik), chair (sandalyede), ruku, secde, kneel (tahiyyat), cheer (kollar havada), point (vaaz).
// Hareket: bir grubun farklı pozlu kopyaları sırayla gösterilir (namaz, alkış, vaaz), ya da ağ topluca sallanır.
import * as THREE from 'three';
import { G } from './state.js?v=28';
import { textSprite, disposeSprite, rand } from './util.js?v=28';

const BOX = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const BP = BOX.attributes.position.array, BN = BOX.attributes.normal.array;
const _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

// Kutuları biriktirir; mesh() hepsini tek ağ yapar
export class Batch {
    constructor() { this.p = []; this.n = []; this.c = []; }
    // M: eklem matrisi; (ox,oy,oz) eklem içinde kutunun ortası
    box(M, w, h, d, color, ox = 0, oy = 0, oz = 0, rx = 0, ry = 0, rz = 0) {
        _m.compose(_p.set(ox, oy, oz), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(w, h, d)).premultiply(M);
        _n.getNormalMatrix(_m); _c.set(color);
        for (let i = 0; i < BP.length; i += 3) {
            _v.set(BP[i], BP[i + 1], BP[i + 2]).applyMatrix4(_m); this.p.push(_v.x, _v.y, _v.z);
            _v.set(BN[i], BN[i + 1], BN[i + 2]).applyMatrix3(_n).normalize(); this.n.push(_v.x, _v.y, _v.z);
            this.c.push(_c.r, _c.g, _c.b);
        }
        return this;
    }
    mesh({ shadow = true } = {}) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, VC_MAT); m.castShadow = shadow; m.receiveShadow = false;
        return m;
    }
}
const VC_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });

export const SKINS = ['#f2c79b', '#e0ac69', '#c68642', '#e8b48f', '#d9a27c'];
const SHIRTS = ['#1d4ed8', '#b91c1c', '#15803d', '#f8fafc', '#a16207', '#6d28d9', '#0f766e', '#374151', '#e11d48', '#0369a1'];
const PANTS = ['#1f2937', '#1e3a8a', '#44403c', '#57534e', '#111827'];
const SCARVES = ['#7c3aed', '#be123c', '#0f766e', '#a16207', '#1e3a8a', '#9d174d', '#4d7c0f', '#f5f5f4', '#6b21a8'];
const pick = a => a[Math.floor(Math.random() * a.length)];

function J(parent, x, y, z, rx = 0, ry = 0, rz = 0) {   // alt eklem matrisi
    return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)).premultiply(parent);
}

// POZLAR: kalça yüksekliği, gövde eğimi, kalça/diz açıları, kollar (x: öne-yukarı negatif, z: yana açma)
const POSES = {
    stand:  { hip: 0.86, tilt: 0, thigh: 0, knee: 0, armL: [0, 0.08], armR: [0, -0.08] },
    sit:    { hip: 0.2, tilt: -0.1, thigh: -1.5, knee: 0.15, armL: [0.4, 0.25], armR: [-0.5, -0.1] },
    chair:  { hip: 0.5, tilt: 0, thigh: -1.5, knee: 1.5, armL: [-0.9, 0.1], armR: [-0.9, -0.1] },
    ruku:   { hip: 0.86, tilt: 1.45, thigh: 0, knee: 0, armL: [-1.25, 0.05], armR: [-1.25, -0.05] },
    secde:  { hip: 0.45, tilt: 2.0, thigh: -0.5, knee: 2.07, armL: [-0.7, 0.3], armR: [-0.7, -0.3] },
    kneel:  { hip: 0.4, tilt: 0.05, thigh: -1.45, knee: 2.9, armL: [-0.75, 0.1], armR: [-0.75, -0.1] },
    cheer:  { hip: 0.86, tilt: 0, thigh: 0, knee: 0, armL: [-2.8, 0.35], armR: [-2.8, -0.35] },
    clap:   { hip: 0.86, tilt: 0, thigh: 0, knee: 0, armL: [-1.2, -0.45], armR: [-1.2, 0.45] },
    point:  { hip: 0.86, tilt: 0, thigh: 0, knee: 0, armL: [-0.2, 0.1], armR: [-2.5, -0.2] },
    open:   { hip: 0.86, tilt: 0, thigh: 0, knee: 0, armL: [-1.0, 0.7], armR: [-1.0, -0.7] },
    phone:  { hip: 0.86, tilt: 0.05, thigh: 0, knee: 0, armL: [-1.45, -0.35], armR: [-1.45, 0.35] },
    mic:    { hip: 0.86, tilt: 0.05, thigh: 0, knee: 0, armL: [0, 0.08], armR: [-1.55, 0.3] },
    camera: { hip: 0.86, tilt: 0, thigh: 0, knee: 0, armL: [-1.6, -0.25], armR: [-1.6, 0.25] },
    desk:   { hip: 0.5, tilt: 0.25, thigh: -1.5, knee: 1.5, armL: [-1.2, -0.2], armR: [-1.2, 0.2] }
};

// Bir kişi ekler. o: { x, y, z, yaw, pose, skin, shirt, pants, hair, scarf, skirt, beard, cap, jacket, hold, s (boy ölçeği) }
export function person(b, o = {}) {
    const P = POSES[o.pose || 'stand'], k = o.s || 1;
    const skin = o.skin || pick(SKINS), shirt = o.shirt || pick(SHIRTS), pants = o.pants || pick(PANTS);
    const root = new THREE.Matrix4().compose(new THREE.Vector3(o.x || 0, o.y || 0, o.z || 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, o.yaw || 0, 0)), new THREE.Vector3(k, k, k));
    const pelvis = J(root, 0, P.hip, 0), hip = J(pelvis, 0, 0, 0, P.tilt);   // bacaklar kalçadan, gövde eğilir
    // bacaklar: uyluk + baldır (diz)
    [-1, 1].forEach(s => {
        const th = J(pelvis, s * 0.1, 0, 0, P.thigh), kn = J(th, 0, -0.42, 0, P.knee);
        b.box(th, 0.16, 0.44, 0.18, o.skirt || pants, 0, -0.21, 0);
        b.box(kn, 0.15, 0.42, 0.17, o.skirt ? (o.sock || '#292524') : pants, 0, -0.2, 0);
        b.box(kn, 0.16, 0.08, 0.26, o.shoe || '#1c1917', 0, -0.42, 0.04);
    });
    if (o.skirt && P.thigh === 0) b.box(pelvis, 0.44, 0.78, 0.32, o.skirt, 0, -0.42, 0);   // uzun etek (ayaktayken)
    // gövde
    b.box(hip, 0.46, 0.6, 0.26, o.jacket || shirt, 0, 0.3, 0);
    if (o.jacket) b.box(hip, 0.14, 0.5, 0.02, shirt, 0, 0.32, 0.135);
    // kollar
    [[-1, P.armL], [1, P.armR]].forEach(([s, [ax, az]], i) => {
        const sh = J(hip, s * 0.3, 0.55, 0, ax, 0, az);
        b.box(sh, 0.13, 0.52, 0.14, o.jacket || shirt, 0, -0.25, 0);
        b.box(sh, 0.1, 0.1, 0.1, skin, 0, -0.55, 0);
        if (i === 1 && o.hold) o.hold(b, sh);   // sağ elinde bir şey (mikrofon, telefon, kitap)
        if (i === 0 && o.holdL) o.holdL(b, sh);
    });
    // kafa
    const head = J(hip, 0, 0.62 + (o.neck || 0), 0, o.nod || 0);
    b.box(head, 0.11, 0.1, 0.11, skin, 0, 0.03, 0);
    b.box(head, 0.32, 0.34, 0.3, skin, 0, 0.24, 0);
    b.box(head, 0.05, 0.05, 0.02, '#111', -0.07, 0.27, 0.155); b.box(head, 0.05, 0.05, 0.02, '#111', 0.07, 0.27, 0.155);
    if (o.scarf) {   // başörtüsü: yüz açık, kafayı ve omuzları sarar
        b.box(head, 0.38, 0.12, 0.36, o.scarf, 0, 0.44, -0.01);
        b.box(head, 0.38, 0.4, 0.14, o.scarf, 0, 0.24, -0.13);
        b.box(head, 0.05, 0.36, 0.3, o.scarf, -0.185, 0.22, 0.01); b.box(head, 0.05, 0.36, 0.3, o.scarf, 0.185, 0.22, 0.01);
        b.box(hip, 0.52, 0.2, 0.3, o.scarf, 0, 0.55, 0);
    } else if (o.hair !== null) b.box(head, 0.34, 0.09, 0.32, o.hair || '#292524', 0, 0.44, -0.01);
    if (o.beard) b.box(head, 0.3, 0.14, 0.06, o.beard, 0, 0.12, 0.15);
    if (o.mustache) b.box(head, 0.16, 0.04, 0.03, o.mustache, 0, 0.16, 0.16);
    if (o.cap) b.box(head, 0.3, 0.1, 0.28, o.cap, 0, 0.47, 0);   // takke
    if (o.glasses) { b.box(head, 0.32, 0.03, 0.02, '#111827', 0, 0.28, 0.16); }
    if (o.headset) {   // kulaklık (dinleme yapan polisler)
        b.box(head, 0.38, 0.04, 0.08, '#111827', 0, 0.46, 0);
        [-1, 1].forEach(sx => { b.box(head, 0.05, 0.2, 0.05, '#111827', sx * 0.19, 0.36, 0); b.box(head, 0.06, 0.12, 0.12, '#1f2937', sx * 0.19, 0.24, 0); });
    }
    return b;
}
// El aletleri (sağ kol eklemine göre)
export const HOLD = {
    mic: (b, sh) => { b.box(sh, 0.04, 0.22, 0.04, '#111827', 0, -0.62, 0.08, 1.2); b.box(sh, 0.08, 0.08, 0.08, '#4b5563', 0, -0.68, 0.18); },
    phone: (b, sh) => b.box(sh, 0.08, 0.15, 0.02, '#0f172a', 0, -0.62, 0.05),
    book: (b, sh) => b.box(sh, 0.2, 0.26, 0.05, '#065f46', 0, -0.64, 0.06),
    camera: (b, sh) => { b.box(sh, 0.24, 0.2, 0.34, '#1f2937', 0.12, -0.62, 0.1); b.box(sh, 0.1, 0.1, 0.14, '#111827', 0.12, -0.6, 0.32); },
    cup: (b, sh) => b.box(sh, 0.07, 0.09, 0.07, '#fef3c7', 0, -0.62, 0.05),
    tesbih: (b, sh) => b.box(sh, 0.03, 0.2, 0.03, '#7c2d12', 0, -0.68, 0.02),
    flag: (b, sh) => { b.box(sh, 0.03, 1.2, 0.03, '#d6d3d1', 0, -1.0, 0); b.box(sh, 0.02, 0.4, 0.6, '#dc2626', 0, -1.4, 0.3); }
};
// Rastgele kıyafetli kişi seçenekleri
export const looks = {
    man: () => ({ shirt: pick(SHIRTS), pants: pick(PANTS), hair: pick(['#292524', '#1c1917', '#57534e', '#78350f', '#a8a29e']), beard: Math.random() < 0.3 ? '#292524' : null, mustache: Math.random() < 0.4 ? '#292524' : null }),
    woman: () => ({ shirt: pick(SHIRTS), skirt: pick(['#1f2937', '#374151', '#1e3a8a', '#57534e', '#7c2d12']), scarf: pick(SCARVES) }),
    abla: () => ({ shirt: pick(['#475569', '#1e3a8a', '#57534e', '#164e63', '#3f3f46']), skirt: pick(['#1f2937', '#292524', '#374151']), scarf: pick(SCARVES), shoe: '#292524' }),
    abi: () => ({ jacket: pick(['#1f2937', '#334155', '#44403c', '#1e293b']), shirt: '#f8fafc', pants: '#1f2937', hair: '#292524', beard: Math.random() < 0.6 ? '#292524' : null, mustache: '#292524' }),
    cemaat: () => ({ shirt: pick(['#f8fafc', '#e7e5e4', '#d6d3d1', '#cbd5e1']), pants: pick(['#f5f5f4', '#44403c', '#1f2937']), cap: '#f8fafc', beard: Math.random() < 0.7 ? pick(['#292524', '#78716c', '#d6d3d1']) : null, hair: null }),
    police: () => ({ shirt: '#cbd5e1', jacket: '#1e3a8a', pants: '#1e293b', hair: '#1c1917', mustache: Math.random() < 0.5 ? '#1c1917' : null }),
    civil: () => ({ jacket: pick(['#111827', '#1f2937', '#3f3f46']), shirt: pick(['#e5e7eb', '#94a3b8']), pants: '#111827', hair: '#1c1917', glasses: Math.random() < 0.4 }),
    press: () => ({ shirt: pick(SHIRTS), jacket: Math.random() < 0.5 ? pick(['#1f2937', '#78350f', '#1e3a8a', '#065f46']) : null, pants: pick(PANTS), hair: pick(['#292524', '#78350f', '#1c1917']) })
};

// Bir kişi listesinden tek ağ: list = [{...person}], scene'e eklenir, ağ döner
export function crowd(scene, list, opts) {
    const b = new Batch(); list.forEach(o => person(b, o));
    const m = b.mesh(opts); scene.add(m); return m;
}
// Aynı kişilerin farklı pozları sırayla gösterilir (namaz, alkış): poses = ['stand','ruku',...], durations (sn)
export function poseCycle(scene, W, list, poses, durations, { offset = 0 } = {}) {
    const meshes = poses.map(pose => crowd(scene, list.map(o => ({ ...o, pose: typeof pose === 'function' ? pose(o) : pose }))));
    const total = durations.reduce((a, b) => a + b, 0);
    meshes.forEach((m, i) => m.visible = i === 0);
    W.movers.push((dt, t) => {
        let x = (t + offset) % total, i = 0;
        while (x > durations[i]) { x -= durations[i]; i++; }
        meshes.forEach((m, k) => { const v = k === i; if (m.visible !== v) m.visible = v; });
    });
    return meshes;
}
// Sırayla değişen konuşma balonları: lines = [[sahip (Object3D ya da {x,y,z}), yazı, süre]]; başa sarar
export function bubbleTalk(scene, W, lines, { size = 38, gap = 0.5, start = 0, height = 0.38, color = '#111827', bg = 'rgba(248,250,252,0.96)', near = 45 } = {}) {
    let i = -1, t = -start, cur = null;
    const total = lines.length;
    W.movers.push((dt) => {
        const p = G.player;
        // uzaktaysa konuşma ilerlemez (oyuncu yaklaşınca baştan başlar gibi)
        if (p && lines[0] && Math.hypot(p.pos.x - lineAnchor(lines[0]).x, p.pos.z - lineAnchor(lines[0]).z) > near) { if (cur) { cur.parent && cur.parent.remove(cur); disposeSprite(cur); cur = null; } i = -1; t = 0; return; }
        t -= dt;
        if (t > 0) return;
        if (cur) { cur.parent && cur.parent.remove(cur); disposeSprite(cur); cur = null; t = gap; if (gap > 0) return; }
        i = (i + 1) % total;
        const [who, text, dur, col, bg2] = lines[i];
        cur = textSprite(text, { size, height, color: col || color, bg: bg2 || bg });
        const a = lineAnchor(lines[i]);
        if (who.isObject3D) { cur.position.set(0, who.userData.talkY || 2.4, 0); who.add(cur); }
        else { cur.position.set(a.x, a.y, a.z); scene.add(cur); }
        t = dur;
    });
}
function lineAnchor(line) { const w = line[0]; if (w.isObject3D) { const v = new THREE.Vector3(); w.getWorldPosition(v); return v; } return w; }

// Basit masa ve sandalye (eklenen kutu ağına)
export function table(b, x, z, yaw = 0, { w = 1.6, d = 0.8, h = 0.75, top = '#78350f', leg = '#44403c' } = {}) {
    const M = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
    b.box(M, w, 0.06, d, top, 0, h, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => b.box(M, 0.06, h, 0.06, leg, sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08)));
    return M;
}
export function chair(b, x, z, yaw = 0, col = '#1f2937') {
    const M = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
    b.box(M, 0.48, 0.06, 0.46, col, 0, 0.46, 0); b.box(M, 0.48, 0.5, 0.05, col, 0, 0.72, -0.22);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => b.box(M, 0.04, 0.46, 0.04, '#111827', sx * 0.2, 0.23, sz * 0.19));
}
export function mat4(x, y, z, yaw = 0) { return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1)); }
export { pick, rand };
