// HIRHIZ 3D: oyunun paylaşılan durumu (modüller arası)
export const DIFFS = {
    easy:   { hp: 5, speed: 0.75, fire: 1.4, boss: 0.7, score: 0.5, name: 'KOLAY' },
    normal: { hp: 3, speed: 1,    fire: 1,   boss: 1,   score: 1,   name: 'NORMAL' },
    hard:   { hp: 2, speed: 1.25, fire: 0.7, boss: 1.4, score: 2,   name: 'ZOR' }
};
export const G = {
    scene: null, camera: null, world: null,
    player: null, enemies: [], projectiles: [], boss: null,
    difficulty: 'normal',
    score: 0, kills: 0, target: 11, collect: 0, livesLost: 0,
    time: 0, hitStop: 0,
    state: 'menu',          // menu | play | pause | dead | won
    msg: null               // ekrandaki kısa bildirim
};
try { const d = localStorage.getItem('hirhizDiff'); if (DIFFS[d]) G.difficulty = d; } catch (e) {}
export const diff = () => DIFFS[G.difficulty];
export function addScore(n) { G.score += Math.round(n * diff().score); return G.score; }

// Ekranda kısa bildirim
let toastTimer = null;
export function toast(text, ms = 1800, color = '#fde047') {
    const el = document.getElementById('toast');
    el.textContent = text; el.style.color = color; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}
