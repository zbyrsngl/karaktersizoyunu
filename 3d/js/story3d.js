// HIRHIZ 3D: bölüm başı hikâyeleri — 2D oyunun hikâye oynatıcısı aynen kullanılır (story2d.js, tools/build_story3d.js üretir).
// Her bölüm oturumda ilk açılışta hikâyesini oynatır; dokun / Enter / Boşluk: yazıyı tamamla, sonra sonraki sahne; GEÇ ya da Esc: atla.
import { playVoice, stopVoice } from './audio.js?v=24';
import { getHeadTex } from './models.js?v=24';

const W = window;
let ready = false;
function init() {
    if (ready || typeof W.playStory !== 'function') return ready;
    ready = true;
    getHeadTex();   // kafa yüklenince window.headCanvas ayarlanır
    // 2D'de yollar ana klasöre göre: resimler/... → ../resimler/...
    const faces = W.__story.faces;
    for (const k in faces) { const f = faces[k]; if (f.src && !f.src.startsWith('../')) f.src = '../' + f.src; }
    W.__voice.play = playVoice; W.__voice.stop = stopVoice;
    const el = document.getElementById('story'), skip = document.getElementById('story-skip');
    skip.textContent = W.__story.T('skip');
    el.addEventListener('pointerdown', e => { if (e.target !== skip) { e.preventDefault(); W.storyNext(); } });
    skip.addEventListener('click', e => { e.stopPropagation(); W.endStory(); });
    addEventListener('keydown', e => { if (storyOpen()) { e.stopImmediatePropagation(); W.storyKey(e); } }, true);
    addEventListener('resize', () => { if (storyOpen()) W.resizeStory(); });
    return ready;
}
// 2D dosyasındaki let/const tanımları window'a düşmez; yalnızca function bildirimleri düşer
export const storyOpen = () => document.getElementById('story').style.display === 'block';
// Bölümün hikâyesi bitince (ya da hikâye yoksa hemen) cb çağrılır
export function playLevelStory(id, cb) {
    if (!init()) { cb(); return; }
    try { W.playStory(id, cb); } catch (e) { console.error(e); document.getElementById('story').style.display = 'none'; cb(); }
}
