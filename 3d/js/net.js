// HIRHIZ 3D: iki kişilik çevrimiçi oyun (birlikte, co-op). İki cihaz PeerJS ile doğrudan bağlanır;
// tanışmayı PeerJS'in ücretsiz ortak sunucusu sağlar (kurulum yok). Kütüphane yalnızca bu mod açılınca yüklenir.
//
// Kim neye karar verir:
//  • EV SAHİBİ (odayı kuran, 1. oyuncu): düşmanların canı/ölümü, canavarın canı/ölümü, puan, yenilen sayısı, toplanan,
//    bölüm seçimi, canavarın gelişi, bölüm sonu, yeniden başlatma. Saniyede 15 kez "durum" gönderir.
//  • Her oyuncu kendi karakterini kendi cihazında oynatır (gecikme hissedilmez) ve saniyede 20 kez konumunu gönderir.
//    Kendi canına kendi cihazı karar verir (yalnızca kendi ekranında gördüğü mermiler ona değer).
//  • Saldırılar (balyoz, atış, el bombası), kırılan tuğlalar ve alınan eşyalar olay olarak karşıya gider;
//    karşı taraf aynısını arkadaşın karakteriyle (kukla) oynatır. Misafirde bu saldırılar yalnızca görüntüdür (enemies.js isGuest).
//  • Düşmanlar her iki cihazda da çalışır (saldırıları en yakın oyuncuya); misafirde konumları ev sahibinden gelenle düzeltilir.
// Uçuş (6) ve BYLOCK (7) bölümlerinde herkes kendi oyununu oynar; ev sahibi sonraki bölüme geçince misafir de geçer.
import * as THREE from 'three';
import { G, toast } from './state.js?v=22';
import { tr, tf } from './i18n.js?v=22';
import { createPlayer, updatePuppet, puppetSwing, puppetThrow, hammerPoint } from './player.js?v=22';
import { recolorHirhiz, P2_COLORS } from './models.js?v=22';
import { throwGrenade } from './grenade.js?v=22';
import { damageEnemy } from './enemies.js?v=22';
import { setBossBar } from './boss_core.js?v=22';
import { textSprite } from './util.js?v=22';

const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'hirhiz3d-oda-';
const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ';   // karışabilecek harfler yok (I, O, Q, W, X)
const $ = id => document.getElementById(id);

let API = null;           // main.js'in verdiği işlevler
let peer = null, conn = null, puppet = null, remote = null, sendT = 0, stateT = 0;

export function initNet(api) { API = api; buildLobby(); }
export const netOn = () => !!(G.net && G.net.open);
const coop = () => netOn() && G.level && !G.level.mode;   // uçuş/bulmaca bölümlerinde ortak sahne yok

// --- KÜTÜPHANE, BAĞLANTI ---
function loadPeer() {
    if (window.Peer) return Promise.resolve();
    return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = PEERJS; s.onload = ok; s.onerror = () => fail(new Error('peerjs')); document.head.appendChild(s); });
}
function newCode() { let c = ''; for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return c; }

export async function hostRoom(fixedCode) {   // fixedCode: yalnızca testler için
    closeNet(true);
    setStatus(tr('Bağlanıyor...'));
    try { await loadPeer(); } catch (e) { setStatus(tr('Bağlantı kütüphanesi yüklenemedi. İnternet bağlantını kontrol et.'), true); return; }
    const code = fixedCode || newCode();
    G.net = { role: 'host', guest: false, open: false, code };
    peer = new window.Peer(PREFIX + code);
    peer.on('open', () => { setStatus(tf('Oda kodu: {0} — arkadaşın bu kodla katılsın.', code)); showCode(code); });
    peer.on('connection', c => {
        if (conn && conn.open) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; }
        attach(c);
    });
    peer.on('error', e => { if (e.type === 'unavailable-id') hostRoom(); else setStatus(tr('Bağlantı hatası') + ': ' + e.type, true); });
}
export async function joinRoom(code) {
    code = (code || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (code.length !== 4) { setStatus(tr('Kod 4 harf olmalı.'), true); return; }
    closeNet(true);
    setStatus(tr('Bağlanıyor...'));
    try { await loadPeer(); } catch (e) { setStatus(tr('Bağlantı kütüphanesi yüklenemedi. İnternet bağlantını kontrol et.'), true); return; }
    G.net = { role: 'guest', guest: true, open: false, code };
    peer = new window.Peer();
    peer.on('open', () => attach(peer.connect(PREFIX + code, { reliable: true })));
    peer.on('error', e => setStatus(e.type === 'peer-unavailable' ? tr('Bu kodla bir oda yok.') : tr('Bağlantı hatası') + ': ' + e.type, true));
}
function attach(c) {
    conn = c;
    c.on('open', () => {
        G.net.open = true;
        send({ t: 'hi', v: API.version });
        makePuppet();
        if (G.net.guest) { recolorHirhiz(G.player.m, P2_COLORS); setStatus(tr('Bağlandın! Ev sahibi oyunu başlatınca oyun açılacak.')); }
        else setStatus(tr('2. oyuncu bağlandı! Bölümü seçip OYUNU BAŞLAT\'a bas.'));
        toast(tr('İKİ KİŞİLİK OYUN HAZIR!'), 2200, '#86efac');
        API.onNetChange();
    });
    c.on('data', onData);
    c.on('close', () => lost());
    c.on('error', () => lost());
}
function lost() {
    if (!G.net) return;
    const was = G.net.open;
    closeNet(true);
    if (was) { toast(tr('ARKADAŞINLA BAĞLANTI KOPTU'), 3000, '#fca5a5'); setStatus(tr('Bağlantı koptu.'), true); }
    API.onNetChange();
}
export function closeNet(silent) {
    try { conn && conn.close(); } catch (e) {}
    try { peer && peer.destroy(); } catch (e) {}
    conn = null; peer = null; remote = null;
    if (puppet) { puppet.m.root.parent && puppet.m.root.parent.remove(puppet.m.root); puppet = null; }
    if (G.net && G.net.guest && G.player) recolorHirhiz(G.player.m, Object.fromEntries(Object.entries(P2_COLORS).map(([a, b]) => [b, a])));
    G.net = null; G.players = null;
    hideCode();
    if (!silent) setStatus('');
    API && API.onNetChange();
}
function send(m) { if (conn && conn.open) try { conn.send(m); } catch (e) {} }
export function netEvent(k, data = {}) { if (netOn()) send({ t: 'E', k, lv: G.level && G.level.id, ...data }); }

// --- KUKLA: arkadaşın karakteri ---
function makePuppet() {
    if (puppet) return;
    puppet = createPlayer(G.scene, { remote: true });
    if (!G.net.guest) recolorHirhiz(puppet.m, P2_COLORS);   // ev sahibinde arkadaş 2. oyuncu (bordo)
    const tag = textSprite(G.net.guest ? '1P' : '2P', { size: 44, height: 0.3, color: '#111827', bg: G.net.guest ? 'rgba(148,163,184,0.95)' : 'rgba(252,211,77,0.95)' });
    tag.position.y = 2.75; puppet.m.root.add(tag);
    puppet.pos.copy(G.player.pos).add(new THREE.Vector3(1.5, 0, 0));
    G.players = [G.player, puppet];
    puppet.m.root.visible = coop();
}
// main.js loadLevel: yeni sahneye taşı / eski sahneden çıkar
export function netSceneChanged(scene) {
    if (!puppet) return;
    scene.add(puppet.m.root); puppet.m.root.visible = coop();
    G.players = coop() ? [G.player, puppet] : null;
}
export function netBeforeDispose(sc) { if (puppet) sc.remove(puppet.m.root); }

// --- HER KARE ---
export function updateNet(dt) {
    if (!netOn()) return;
    const p = G.player;
    if (puppet) {
        puppet.m.root.visible = coop() && !!remote;
        G.players = coop() ? [p, puppet] : null;
        if (coop()) updatePuppet(puppet, dt, remote);
    }
    // kendi konumum (20/sn)
    sendT -= dt;
    if (sendT <= 0 && coop()) {
        sendT = 0.05;
        const fl = (p.shield ? 1 : 0) | (p.grounded ? 2 : 0) | (p.dead ? 4 : 0) | (p.invuln > 0 ? 8 : 0) | (p.power.hammer > 0 ? 16 : 0) | (p.power.shieldUp > 0 ? 32 : 0);
        send({ t: 'P', p: [r2(p.pos.x), r2(p.pos.y), r2(p.pos.z)], v: [r2(p.vel.x), r2(p.vel.y), r2(p.vel.z)], f: r2(p.facing), fl, hp: p.hp, lv: G.level.id });
    }
    // ev sahibi: oyunun durumu (15/sn)
    if (!G.net.guest) {
        stateT -= dt;
        if (stateT <= 0) {
            stateT = 1 / 15;
            const B = G.boss;
            send({ t: 'S', lv: G.level.id, sc: G.score, k: G.kills, c: G.collect, st: G.state,
                e: coop() ? G.enemies.map(e => e.dead ? (e.how === 'ammo' ? 1 : 0) : [r2(e.pos.x), r2(e.pos.y), r2(e.pos.z)]) : null,
                b: coop() && B ? [r2(B.pos.x), r2(B.pos.y), r2(B.pos.z), r2(B.root.rotation.y), r2(B.hp), B.dead ? 1 : 0] : null });
        }
    } else applyGuestCorrections(dt);
}
const r2 = v => Math.round(v * 100) / 100;

// misafir: düşmanları ve canavarı ev sahibinin konumuna yumuşakça çek
let lastS = null;
function applyGuestCorrections(dt) {
    if (!lastS || !coop() || lastS.lv !== G.level.id) return;
    const k = 1 - Math.exp(-10 * dt);
    if (lastS.e) lastS.e.forEach((s, i) => {
        const e = G.enemies[i]; if (!e || e.dead) return;
        if (typeof s === 'number') { e.netKill = true; e.hurtT = 0; damageEnemy(e, 999, s === 1 ? 'ammo' : 'hammer'); e.netKill = false; return; }   // ev sahibinde yenildi (1: rüşvet/kelepçe ile)
        if (Math.hypot(s[0] - e.pos.x, s[2] - e.pos.z) > 5) e.pos.set(s[0], s[1], s[2]);
        else { e.pos.x += (s[0] - e.pos.x) * k; e.pos.y += (s[1] - e.pos.y) * k; e.pos.z += (s[2] - e.pos.z) * k; }
    });
    const B = G.boss, b = lastS.b;
    if (B && b) {
        if (Math.hypot(b[0] - B.pos.x, b[2] - B.pos.z) > 6) B.pos.set(b[0], b[1], b[2]);
        else { B.pos.x += (b[0] - B.pos.x) * k; B.pos.y += (b[1] - B.pos.y) * k; B.pos.z += (b[2] - B.pos.z) * k; }
        if (B.hp !== b[4] && !B.dead) { B.hp = b[4]; setBossBar(B); }
        if (b[5] && !B.dead && B.forceDefeat) B.forceDefeat();
    }
}

// --- GELEN MESAJLAR ---
function onData(m) {
    if (!m || !m.t) return;
    if (m.t === 'full') { setStatus(tr('Oda dolu.'), true); closeNet(true); return; }
    if (m.t === 'hi') { if (m.v !== API.version) toast(tr('Sürümler farklı! İkiniz de sayfayı yenileyin.'), 4000, '#fca5a5'); return; }
    if (m.t === 'P') {
        if (!remote) remote = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), facing: 0, fl: 0, hp: 3 };
        remote.pos.set(m.p[0], m.p[1], m.p[2]); remote.vel.set(m.v[0], m.v[1], m.v[2]); remote.facing = m.f; remote.fl = m.fl; remote.hp = m.hp; remote.lv = m.lv;
        if (puppet && remote.lv === G.level.id && !puppet.seen) { puppet.seen = true; puppet.pos.copy(remote.pos); }
        updatePartnerHud();
        return;
    }
    if (m.t === 'S') {   // yalnızca misafir alır
        lastS = m;
        if (m.lv !== G.level.id) return;
        if (G.score !== m.sc || G.kills !== m.k || G.collect !== m.c) {
            const killsChanged = G.kills !== m.k;
            G.score = m.sc; G.kills = m.k; G.collect = m.c;
            if (killsChanged) API.onKillSync(); else API.updateHud();
        }
        return;
    }
    if (m.t === 'E') onEvent(m);
}
function onEvent(m) {
    const P = puppet, here = m.lv === undefined || (G.level && m.lv === G.level.id);
    switch (m.k) {
        case 'level':   // ev sahibi bölüm başlattı
            if (G.net.guest) { G.difficulty = m.diff; API.startGame(m.id); }
            break;
        case 'hammer':
            if (P && here && coop()) { puppetSwing(P); P.facing = m.f; G.onHammer && G.onHammer(hammerPoint(P), P, true); }
            break;
        case 'throw':
            if (P && here && coop()) { puppetThrow(P); G.onThrow && G.onThrow(v3(m.from), v3(m.dir), true); }
            break;
        case 'gren':
            if (P && here && coop()) { puppetThrow(P); throwGrenade(v3(m.from), v3(m.to)); }
            break;
        case 'brick':
            if (here) API.breakBrickIdx(m.i, true);
            break;
        case 'item':
            if (here) API.takeItem(m.id, true);
            break;
        case 'boss':     // misafir: canavar geldi
            if (G.net.guest && here && !G.boss) API.spawnBoss();
            break;
        case 'outro':    // misafir: bölüm sonu sahnesi
            if (G.net.guest && here && coop()) API.bossDefeated(true);
            break;
        case 'won':
            if (G.net.guest && here && coop()) API.showWon(true);   // uçuş/bulmaca: herkes kendi bitirir
            break;
        case 'alldead':
            if (G.net.guest && here) API.allDead(true);
            break;
        case 'retry':
            if (G.net.guest && here) API.retry(true);
            break;
    }
}
const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);

// Arkadaşın durumu (ölü mü, canı)
export const partnerDead = () => !!(remote && (remote.fl & 4));
export const partnerPos = () => (puppet ? puppet.pos : null);
export const partnerHere = () => !!(remote && G.level && remote.lv === G.level.id);
function updatePartnerHud() {
    const el = $('partner'); if (!el) return;
    const show = coop() && remote;
    el.hidden = !show; if (!show) return;
    const n = Math.max(0, remote.hp), s = (G.net.guest ? '1P ' : '2P ') + (remote.fl & 4 ? '💀' : '❤️'.repeat(Math.min(n, 5)));
    if (el.textContent !== s) el.textContent = s;
}

// --- LOBİ (menüde "İKİ KİŞİ" paneli) ---
function setStatus(txt, bad) { const el = $('net-status'); if (el) { el.textContent = txt; el.classList.toggle('bad', !!bad); } }
function showCode(c) { const el = $('net-code'); if (el) { el.textContent = c; el.hidden = false; } }
function hideCode() { const el = $('net-code'); if (el) el.hidden = true; }
function buildLobby() {
    $('net-input').placeholder = tr('KOD');
    $('net-host').onclick = () => hostRoom();
    $('net-join').onclick = () => joinRoom($('net-input').value);
    $('net-input').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('net-input').value); e.stopPropagation(); });
    $('net-leave').onclick = () => { closeNet(); setStatus(tr('Tek kişilik oyuna dönüldü.')); };
}
