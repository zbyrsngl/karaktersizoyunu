// HIRHIZ 3D — 7. bölüm: BYLOCK şifre kırma bulmacası (2D'deki bulmacanın aynısı, arkada 3D oda).
// Gece, Ankara'da bir emniyet bürosu: masada ByLock açık telefon, monitörler, dosya yığınları, pencerede Atakule.
// 4 farklı rakamlı şifre: yeşil = doğru yer, sarı = var ama yeri yanlış, gri = yok. 8 hak; hak bitince şifre değişir.
import * as THREE from 'three';
import { G, addScore, toast } from './state.js?v=13';
import { playSfx } from './audio.js?v=13';
import { box, mat, canvasTex, fitText, rand } from './util.js?v=13';

const LEN = 4, TRIES = 8, GOOD = 5;   // GOOD: 3. yıldız için en çok bu kadar tahmin
const TICKER = "BYLOCK LİSTELERİ AÇIKLANDI • 'MOR BEYİN' UYGULAMASI: 11 BİN 480 KİŞİNİN LİSTEDE YANLIŞLIKLA YER ALDIĞI ORTAYA ÇIKTI • KHK İLE 125 BİNDEN FAZLA KAMU GÖREVLİSİ İHRAÇ EDİLDİ • ÖĞRETMENLER, AKADEMİSYENLER, GAZETECİLER DE LİSTEDE • ";

function newCode() {
    const d = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
    return d.slice(0, LEN).join('');
}
const scoreGuess = (code, guess) => [...guess].map((c, i) => code[i] === c ? 'g' : code.includes(c) ? 'y' : 'x');

export function makePuzzleMode() {
    const mode = { kind: 'puzzle' };
    let pz = null, el = null, R = null;

    // --- 3D ODA ---
    mode.build = (scene, L) => {
        scene.fog = new THREE.Fog(L.fog, 12, 40);
        R = { t: 0 };
        const W = { L, solids: [], items: [], bricks: [], movers: [] };
        // zemin, duvarlar, tavan
        const floor = canvasTex(64, 64, (g) => { g.fillStyle = '#3f3f46'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#52525b'; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32); }, { repeat: [8, 8], pixel: true });
        const f = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshLambertMaterial({ map: floor })); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
        scene.add(box(16, 0.2, 16, '#d6d3d1', 0, 4.2, 0, false));
        const wallM = mat('#cbd5c0');
        [[0, 2.1, -6, 16, 4.2, 0.2], [-6, 2.1, 0, 0.2, 4.2, 16], [6, 2.1, 0, 0.2, 4.2, 16]].forEach(([x, y, z, w, h, d]) => {
            if (z === -6) {   // arka duvarda pencere: Ankara gecesi, Atakule
                scene.add(box(w, 1, d, wallM, x, 0.5, z, false)); scene.add(box(w, 1, d, wallM, x, 3.7, z, false));
                scene.add(box(4.8, 2.2, d, wallM, -5.6, 2.1, z, false)); scene.add(box(4.8, 2.2, d, wallM, 5.6, 2.1, z, false));
            } else scene.add(box(w, h, d, wallM, x, y, z, false));
        });
        const night = canvasTex(512, 256, (g, Wd, H) => {
            const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#020617'); gr.addColorStop(1, '#312e81'); g.fillStyle = gr; g.fillRect(0, 0, Wd, H);
            for (let i = 0; i < 60; i++) { g.fillStyle = '#e0e7ff'; g.fillRect(Math.random() * Wd, Math.random() * H * 0.5, 1, 1); }
            for (let i = 0; i < 30; i++) { const w = 20 + Math.random() * 30, h = 30 + Math.random() * 90, x = i * 18 - 10; g.fillStyle = '#0f172a'; g.fillRect(x, H - h, w, h); for (let k = 0; k < 10; k++) { g.fillStyle = Math.random() < 0.4 ? '#fde68a' : '#1e293b'; g.fillRect(x + 3 + (k % 3) * 7, H - h + 5 + Math.floor(k / 3) * 10, 4, 5); } }
            g.fillStyle = '#1e293b'; g.fillRect(300, 70, 10, 186);   // Atakule
            g.fillStyle = '#334155'; g.beginPath(); g.ellipse(305, 70, 26, 14, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#fde68a'; for (let k = 0; k < 8; k++) g.fillRect(284 + k * 6, 68, 3, 4);
            g.fillStyle = '#e2e8f0'; g.fillRect(304, 30, 2, 30);
        });
        const win = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.2), new THREE.MeshBasicMaterial({ map: night })); win.position.set(0, 2.1, -5.95); scene.add(win);
        [-1.6, 0, 1.6].forEach(x => scene.add(box(0.06, 2.2, 0.08, '#e7e5e4', x, 2.1, -5.9, false)));
        // Atatürk portresi yerine bayrak; duvarda "EMNİYET" tabelası
        const sign = canvasTex(512, 96, (g, Wd, H) => { g.fillStyle = '#1e3a8a'; g.fillRect(0, 0, Wd, H); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; fitText(g, 'SİBER SUÇLAR ŞUBESİ', Wd / 2, H / 2, Wd - 20, 54); });
        const sm = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), new THREE.MeshBasicMaterial({ map: sign })); sm.position.set(-5.88, 3, -2); sm.rotation.y = Math.PI / 2; scene.add(sm);
        const flag = canvasTex(96, 64, (g) => { g.fillStyle = '#e30a17'; g.fillRect(0, 0, 96, 64); g.fillStyle = '#fff'; g.beginPath(); g.arc(38, 32, 16, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e30a17'; g.beginPath(); g.arc(42, 32, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; g.lineTo(60 + Math.cos(a) * 8, 32 + Math.sin(a) * 8); } g.fill(); });
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshBasicMaterial({ map: flag })); fl.position.set(5.88, 2.6, -2); fl.rotation.y = -Math.PI / 2; scene.add(fl);
        // masa, monitörler, telefon, dosyalar
        scene.add(box(4.2, 0.12, 2, '#78350f', 0, 1.0, -2.5));
        [[-1.9, -3.3], [1.9, -3.3], [-1.9, -1.7], [1.9, -1.7]].forEach(([x, z]) => scene.add(box(0.12, 1.0, 0.12, '#451a03', x, 0.5, z)));
        const scr = canvasTex(256, 160, (g, Wd, H) => {
            g.fillStyle = '#022c22'; g.fillRect(0, 0, Wd, H); g.fillStyle = '#34d399'; g.font = '12px monospace';
            for (let i = 0; i < 12; i++) g.fillText(Array.from({ length: 30 }, () => '0123456789ABCDEF'[Math.random() * 16 | 0]).join(''), 6, 14 + i * 12);
        });
        R.screens = [];
        [[-1.1, -0.25], [1.1, 0.25]].forEach(([x, ry]) => {
            const g = new THREE.Group(); g.position.set(x, 1.06, -3.1); g.rotation.y = ry; scene.add(g);
            g.add(box(0.1, 0.4, 0.1, '#1f2937', 0, 0.2, 0)); g.add(box(1.4, 0.9, 0.08, '#111827', 0, 0.85, 0));
            const s = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), new THREE.MeshBasicMaterial({ map: scr })); s.position.set(0, 0.85, 0.045); g.add(s); R.screens.push(scr);
        });
        R.scr = scr;
        const phone = new THREE.Group(); phone.position.set(0, 1.08, -2.2); phone.rotation.x = -Math.PI / 2 + 0.3; scene.add(phone);
        phone.add(box(0.5, 0.95, 0.05, '#111827', 0, 0, 0));
        const app = canvasTex(128, 240, (g, Wd, H) => { g.fillStyle = '#0f766e'; g.fillRect(0, 0, Wd, H); g.fillStyle = '#fff'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText('🔒', Wd / 2, 90); g.fillText('ByLock', Wd / 2, 130); g.font = '16px Arial'; g.fillText('* * * *', Wd / 2, 170); });
        const ps = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.88), new THREE.MeshBasicMaterial({ map: app })); ps.position.z = 0.03; phone.add(ps);
        for (let i = 0; i < 4; i++) { const h = rand(0.3, 0.8); scene.add(box(0.7, h, 0.5, ['#fde68a', '#fef3c7', '#e5e7eb'][i % 3], -1.5 + (i % 2) * 0.1, 1.06 + h / 2, -1.9 + i * 0.05 - (i > 1 ? 0.6 : 0))); }
        scene.add(box(0.7, 0.04, 0.5, '#dc2626', 1.6, 1.08, -2.0));
        const lamp = new THREE.PointLight('#fde68a', 6, 9); lamp.position.set(0, 3.6, -1.5); scene.add(lamp);
        scene.add(box(1.2, 0.08, 0.4, '#f8fafc', 0, 4.06, -1.5, false));
        return W;
    };
    mode.camera = (camera, dt) => {
        R.t += dt;
        camera.position.set(Math.sin(R.t * 0.15) * 1.2, 2.3 + Math.sin(R.t * 0.2) * 0.1, 2.6);
        camera.lookAt(0, 1.4, -2.6);
    };
    mode.idle = (dt) => { R.t += dt; };
    mode.update = (dt) => {
        R.code = (R.code || 0) + dt;
        if (R.code > 0.5) { R.code = 0; const c = R.scr.image.getContext('2d'); c.drawImage(c.canvas, 0, -12); c.fillStyle = '#022c22'; c.fillRect(0, 148, 256, 12); c.fillStyle = '#34d399'; c.font = '12px monospace'; c.fillText(Array.from({ length: 30 }, () => '0123456789ABCDEF'[Math.random() * 16 | 0]).join(''), 6, 158); R.scr.needsUpdate = true; }
    };

    // --- BULMACA (DOM) ---
    function ensureEl() {
        if (el) return;
        el = document.createElement('div'); el.id = 'puzzle';
        document.body.appendChild(el);
        addEventListener('keydown', e => {
            if (!pz || G.state !== 'play' || G.level.mode !== mode) return;
            if (e.key === 'Backspace') { e.preventDefault(); press('⌫'); }
            else if (e.key === 'Enter') press('✔');
            else if (/^\d$/.test(e.key)) press(e.key);
        });
    }
    mode.reset = () => {
        ensureEl();
        G.player.m.root.visible = false;
        pz = { code: newCode(), rows: [], cur: '', round: 1, guesses: 0, lastRound: 0, locked: false, solved: false, msg: '' };
        el.style.display = 'flex';
        render();
    };
    mode.retry = () => mode.reset();
    mode.leave = () => { if (el) el.style.display = 'none'; pz = null; };
    mode.hint = touch => touch ? 'Rakamlara dokun, ✔ ile dene.' : 'Rakam tuşları ile yaz · Enter: dene · Backspace: sil';
    mode.hud = () => {};

    function keyStates() {
        const st = {}, rank = { g: 3, y: 2, x: 1 };
        pz.rows.forEach(r => [...r.guess].forEach((c, i) => { if (!st[c] || rank[r.marks[i]] > rank[st[c]]) st[c] = r.marks[i]; }));
        return st;
    }
    function render() {
        if (!pz) return;
        let rows = '';
        for (let i = 0; i < TRIES; i++) {
            const r = pz.rows[i], active = i === pz.rows.length && !pz.locked;
            let cells = '';
            for (let j = 0; j < LEN; j++) {
                const ch = r ? r.guess[j] : active ? (pz.cur[j] || '') : '';
                const cls = r ? ' ' + r.marks[j] : active && ch ? ' typed' : '';
                cells += `<span class="pz-cell${cls}" style="--d:${j * 0.12}s">${ch}</span>`;
            }
            rows += `<div class="pz-row${active ? ' active' : ''}${active && pz.shake ? ' shake' : ''}">${cells}</div>`;
        }
        const ks = keyStates();
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'].map(k => {
            const used = /\d/.test(k) && pz.cur.includes(k);
            return `<button type="button" class="pz-key${ks[k] ? ' ' + ks[k] : ''}${used ? ' used' : ''}${k === '✔' ? ' ok' : ''}${k === '⌫' ? ' del' : ''}" data-k="${k}">${k}</button>`;
        }).join('');
        el.innerHTML = `
          <div class="pz-phone">
            <div class="pz-bar"><span class="pz-lock">🔒</span><b>ByLock</b><span class="pz-round">Tur ${pz.round}</span></div>
            <div class="pz-body">
              <div class="pz-board">${rows}</div>
              <div class="pz-side">
                <p class="pz-sub">Şifre 4 farklı rakam. Kır, liste çıksın!</p>
                <div class="pz-legend"><span><i class="g"></i>doğru yer</span><span><i class="y"></i>var, yeri yanlış</span><span><i class="x"></i>yok</span></div>
                <div class="pz-keys">${keys}</div>
                <div class="pz-left">Kalan hak: <b>${TRIES - pz.rows.length}</b></div>
                <div class="pz-msg${pz.solved ? ' win' : pz.msg ? ' fail' : ''}">${pz.msg}</div>
              </div>
            </div>
            <div class="pz-ticker"><b>SON DAKİKA</b><div class="pz-tick-wrap"><span>${TICKER}</span></div></div>
          </div>`;
        el.querySelectorAll('.pz-key').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); press(b.dataset.k); }));
        pz.shake = false;
    }
    function press(k) {
        if (!pz || pz.locked || G.state !== 'play') return;
        if (/^\d$/.test(k)) {
            if (pz.cur.length >= LEN || pz.cur.includes(k)) return;   // rakamlar farklı
            pz.cur += k; pz.msg = '';
            playSfx('hit', { rate: 2.2, vol: 0.15 });
        } else if (k === '⌫') pz.cur = pz.cur.slice(0, -1);
        else if (k === '✔') {
            if (pz.cur.length < LEN) { pz.msg = '4 rakam gir'; pz.shake = true; render(); return; }
            submit(); return;
        }
        render();
    }
    mode.press = press;   // test için
    mode.code = () => pz && pz.code;
    function submit() {
        const guess = pz.cur, marks = scoreGuess(pz.code, guess);
        pz.rows.push({ guess, marks }); pz.cur = ''; pz.guesses++; pz.msg = '';
        marks.forEach((m, i) => setTimeout(() => playSfx('hit', { rate: m === 'g' ? 1.8 : m === 'y' ? 1.4 : 0.9, vol: 0.3 }), i * 120));
        if (guess === pz.code) {
            pz.solved = true; pz.locked = true; pz.lastRound = pz.rows.length;
            pz.msg = 'ŞİFRE ÇÖZÜLDÜ! Liste hazır: herkes ihraç!';
            render(); playSfx('coin', { vol: 0.8 });
            toast('ŞİFRE ÇÖZÜLDÜ!', 2200, '#4ade80');
            const P = pz;
            setTimeout(() => { if (pz === P && G.state === 'play') { addScore(50000); el.style.display = 'none'; G.showWon(); } }, 2400);
            return;
        }
        if (pz.rows.length >= TRIES) {   // hak bitti: şifre gösterilir, değişir, yeni tur
            pz.locked = true;
            pz.msg = `İNDİRDİN Mİ?! Şifre ${pz.code} idi, değiştirildi!`;
            G.livesLost++;
            playSfx('ouch');
            render();
            const P = pz;
            setTimeout(() => {
                if (pz !== P) return;
                pz.code = newCode(); pz.rows = []; pz.round++; pz.locked = false; pz.msg = '';
                render();
            }, 2800);
            return;
        }
        render();
    }
    // Karne: ⭐ çöz, ⭐ ilk turda çöz, ⭐ en çok 5 tahminde çöz
    mode.stars = () => 1 + (pz && pz.round === 1 ? 1 : 0) + (pz && pz.lastRound <= GOOD ? 1 : 0);
    mode.detail = () => `Tahmin: ${pz ? pz.guesses : 0} · Tur: ${pz ? pz.round : 1} · ⭐ çöz · ⭐ ilk turda · ⭐ en çok ${GOOD} tahmin`;
    return mode;
}
