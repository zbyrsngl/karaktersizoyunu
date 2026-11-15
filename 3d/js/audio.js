// HIRHIZ 3D: sesler (2D oyunun ses dosyaları kullanılır, ../sfx ve ana klasör)
let ac = null, master = null, musicGain = null, voiceBus = null, muted = false;
const BUF = {}, GAIN = {};
// Konuşmalar: dosyalar çok farklı seviyede kaydedilmiş (bazısı -35 dB), yüklenirken aynı seviyeye getirilir
// ve çalarken müzik kısılır (ducking).
const VOICES = new Set(['saygili', 'makara', 'sifirla', 'cengiz', 'hasret', 'yaallah', 'savci', 'peygamber', 'lutuf', 'granny', 'hashasi', 'selo', 'ekrem']);
const VOICE_RMS = 0.28;     // hedef ortalama seviye (~ -11 dB; tepeleri sıkıştırıcı tutar)
const MUSIC_VOL = 0.35, MUSIC_DUCK = 0.08;
let duckUntil = 0;
function levelGain(d) {   // konuşma için: ortalamayı hedefe çek, tepe 0.98'i geçmesin
    let sum = 0, n = 0, peak = 0;
    for (let c = 0; c < d.numberOfChannels; c++) {
        const a = d.getChannelData(c);
        for (let i = 0; i < a.length; i += 4) { const v = Math.abs(a[i]); sum += v * v; n++; if (v > peak) peak = v; }
    }
    // sessiz kısımlar ortalamayı düşürmesin: yalnızca konuşulan kısma (tepenin %5'inden yüksek) bakılır
    let s2 = 0, n2 = 0; const th = peak * 0.05;
    for (let c = 0; c < d.numberOfChannels; c++) {
        const a = d.getChannelData(c);
        for (let i = 0; i < a.length; i += 4) { const v = Math.abs(a[i]); if (v > th) { s2 += v * v; n2++; } }
    }
    const rms = Math.sqrt((n2 ? s2 / n2 : sum / Math.max(1, n)));
    if (!rms || !peak) return 1;
    return Math.max(1, Math.min(VOICE_RMS / rms, 2.5 / peak, 12));   // tepe aşımını voiceBus sıkıştırıcısı yumuşatır
}
const FILES = {
    hit: ['../sfx/hit1.mp3', '../sfx/hit2.mp3', '../sfx/hit3.mp3', '../sfx/hit4.mp3', '../sfx/hit5.mp3'],
    coin: ['../pickupCoin.wav'],
    boom: ['../explosion.wav'],
    ouch: ['../sfx/ahh.mp3'],
    cry: ['../sfx/uufff.mp3'],
    saygili: ['../sfx/saygili_giris.mp3'],
    makara: ['../sfx/makara_giris.mp3'],      // 2. bölüm sonu: Egemen Bağış'a benzeyen karakter kutlar (makara.mp3'ün ilk 10 sn'si)   // 2. bölüm SAYGILI gelince (kullanıcının verdiği sesin ilk 20 sn'si)
    sifirla: ['../sfx/sifirla.mp3'],          // 3. bölüm: kaset alınınca ve kasa sıfırlarken
    cengiz: ['../sfx/milletinminakoycaz.mp3'], // 3. bölüm sonu: Cengiz
    hasret: ['../sfx/hasret.mp3'],            // 4. bölüm: FETÖ gelince HIRHIZ "Hocam gel, bu hasret bitsin!"
    yaallah: ['../sfx/feto2_greet.mp3'],      // FETÖ öfkelenince "Ya Allah!"
    savci: ['../sfx/savci.mp3'],              // 4. bölüm sonu: HIRHIZ "Bir savcı 2 polisle hepinizi bitiririm!"
    peygamber: ['../sfx/sonpeygamber.mp3'],   // 4. bölüm sonu: kutlamaya gelen adam
    lutuf: ['../sfx/lutuf.mp3'],              // 5. bölüm sonu: HIRHIZ "15 Temmuz Allah'ın bir lütfü!"
    granny: ['../sfx/gotununkili.mp3'],       // 1. bölüm sonu: koşarak gelen teyzelerin tezahüratı
    hashasi: ['../sfx/hashasi.mp3'],          // 6. bölüm sonu: HIRHIZ "Bunlar haşhaşi! Bunlar sülük!"
    selo: ['../sfx/selo_giris.mp3'],          // 9. bölüm SELO gelince (kullanıcının verdiği sesin 25-35 sn'si)
    ekrem: ['../sfx/ekrem_guzel.mp3']         // 10. bölüm EKREM: "Her şey çok güzel olacak!"
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
    // Konuşmalar sıkıştırıcıdan geçer: yükseltilen seslerin tepeleri cızırdamasın
    voiceBus = ac.createDynamicsCompressor();
    voiceBus.threshold.value = -14; voiceBus.knee.value = 6; voiceBus.ratio.value = 12;
    voiceBus.attack.value = 0.003; voiceBus.release.value = 0.2;
    voiceBus.connect(master);
    // Müzik de Web Audio'dan geçer: iPhone'da <audio>.volume çalışmaz (müzik hep tam seste kalıyordu) ve konuşmada kısılabilsin
    try {
        musicGain = ac.createGain(); musicGain.gain.value = MUSIC_VOL;
        ac.createMediaElementSource(music).connect(musicGain); musicGain.connect(master);
        music.volume = 1;
    } catch (e) { musicGain = null; }
    for (const k in FILES) {
        BUF[k] = [];
        FILES[k].forEach((src, i) => fetch(src).then(r => r.arrayBuffer()).then(b => ac.decodeAudioData(b))
            .then(d => { BUF[k][i] = d; (GAIN[k] = GAIN[k] || [])[i] = VOICES.has(k) ? levelGain(d) : 1; }).catch(() => {}));
    }
}

export function playSfx(name, { rate = 1, vol = 1 } = {}) {
    if (!ac || muted) return 0;
    const all = BUF[name] || [], idx = all.map((b, i) => b ? i : -1).filter(i => i >= 0);
    if (!idx.length) return 0;
    const i = idx[Math.floor(Math.random() * idx.length)];
    const src = ac.createBufferSource();
    src.buffer = all[i];
    const voice = VOICES.has(name);
    src.playbackRate.value = voice ? rate : rate * (0.95 + Math.random() * 0.1);
    const g = ac.createGain(); g.gain.value = vol * ((GAIN[name] && GAIN[name][i]) || 1);
    src.connect(g); g.connect(voice && voiceBus ? voiceBus : master); src.start();
    const dur = src.buffer.duration / src.playbackRate.value;   // çalan sesin süresi (saniye)
    if (voice) duck(dur);
    return dur;
}

// Konuşma boyunca müziği kıs, bitince yavaşça geri aç
function duck(dur) {
    if (!musicGain) return;
    const now = ac.currentTime, g = musicGain.gain;
    duckUntil = Math.max(duckUntil, now + dur);
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(MUSIC_DUCK, now + 0.15);
    g.setValueAtTime(MUSIC_DUCK, duckUntil);
    g.linearRampToValueAtTime(MUSIC_VOL, duckUntil + 0.6);
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
export function audioDebug() { return { gains: GAIN, music: !!musicGain }; }   // yalnızca testler için
