// HIRHIZ 3D: canavarların ortak işleri — can çubuğu, kaldırma, her karede güncelleme.
// Her canavar G.boss'a şunları koyar: { root, pos, hp, maxHp, name, dead, update(dt), hitTest(nokta), onHammer?(nokta), onAmmo?(mermi), reset?() }
import { G } from './state.js?v=18';

export function showBossBar(b) {
    document.querySelector('#boss-bar .boss-name').textContent = b.name;
    document.getElementById('boss-bar').hidden = false;
    setBossBar(b);
}
export function setBossBar(b) {
    document.getElementById('boss-fill').style.width = (100 * Math.max(0, b.hp) / b.maxHp) + '%';
}
export function removeBoss(scene) {
    const b = G.boss; if (!b) return;
    scene.remove(b.root);
    b.onRemove && b.onRemove();
    G.boss = null;
    document.getElementById('boss-bar').hidden = true;
}
export function updateBoss(dt) { if (G.boss) G.boss.update(dt); }
