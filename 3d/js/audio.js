// HIRHIZ 3D: sesler (2D oyunun ses dosyaları kullanılır, ../sfx ve ana klasör)
let ac = null, master = null, muted = false;
const BUF = {};
const FILES = {
    hit: ['../sfx/hit1.mp3', '../sfx/hit2.mp3', '../sfx/hit3.mp3', '../sfx/hit4.mp3', '../sfx/hit5.mp3'],
    coin: ['../pickupCoin.wav'],
    boom: ['../explosion.wav'],
    ouch: ['../sfx/ahh.mp3'],
    cry: ['../sfx/uufff.mp3'],
    saygili: ['../sfx/saygili_giris.mp3']    // 2. bölüm SAYGILI gelince (kullanıcının verdiği sesin ilk 20 sn'si)
};
try { muted = localStorage.getItem('hirhizMute') === '1'; } catch (e) {}

const music = new Audio();
music.loop = true; music.volume = 0.35;

export function unlockAudio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
    for (const k in FILES) {
        BUF[k] = [];
        FILES[k].forEach((src, i) => fetch(src).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b))
            .then(d => { BUF[k][i] = d; }).catch(() => {}));
    }
}

export function playSfx(name, { rate = 1, vol = 1 } = {}) {
    if (!ac || muted) return 0;
    const list = (BUF[name] || []).filter(Boolean);
    if (!list.length) return 0;
    const src = ac.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = rate * (0.95 + Math.random() * 0.1);
    const g = ac.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(master); src.start();
    return src.buffer.duration / src.playbackRate.value;   // çalan sesin süresi (saniye)
}

// Sentezlenmiş kısa sesler (zıplama, balyoz savurma, tencere)
export function beep(type) {
    if (!ac || muted) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(master);
    if (type === 'jump') { o.type = 'square'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(640, t + 0.12); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.start(t); o.stop(t + 0.16); }
    else if (type === 'swing') { o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.18); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); o.start(t); o.stop(t + 0.21); }
    else if (type === 'pan') { o.type = 'triangle'; o.frequency.setValueAtTime(1400 + Math.random() * 300, t); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.start(t); o.stop(t + 0.26); }
    else if (type === 'stomp') { o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.1); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.start(t); o.stop(t + 0.19); }
}

export function playMusic(src) {
    if (!music.src.endsWith(src.replace('..', ''))) music.src = src;
    if (!muted) music.play().catch(() => {});
}
export function stopMusic() { music.pause(); }
export function isMuted() { return muted; }
export function setMuted(m) {
    muted = m;
    try { localStorage.setItem('hirhizMute', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.value = m ? 0 : 0.8;
    if (m) music.pause(); else music.play().catch(() => {});
}
