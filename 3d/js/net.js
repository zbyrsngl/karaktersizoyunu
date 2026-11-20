// HIRHIZ 3D: iki kişilik çevrimiçi oyun (birlikte, co-op). Mesajlar herkese açık ücretsiz bir MQTT sunucusu üzerinden gider
// (kurulum yok, her ağda çalışır). Kütüphane yalnızca bu mod açılınca yüklenir.
//
// Kim neye karar verir:
//  • EV SAHİBİ (odayı kuran, 1. oyuncu): düşmanların canı/ölümü, canavarın canı/ölümü, puan, yenilen sayısı, toplanan,
//    bölüm seçimi, canavarın gelişi, bölüm sonu, yeniden başlatma. Saniyede 10 kez "durum" gönderir.
//  • Her oyuncu kendi karakterini kendi cihazında oynatır (gecikme hissedilmez) ve saniyede 15 kez konumunu gönderir.
//    Kendi canına kendi cihazı karar verir (yalnızca kendi ekranında gördüğü mermiler ona değer).
//  • Saldırılar (balyoz, atış, el bombası), kırılan tuğlalar ve alınan eşyalar olay olarak karşıya gider;
//    karşı taraf aynısını arkadaşın karakteriyle (kukla) oynatır. Misafirde bu saldırılar yalnızca görüntüdür (enemies.js isGuest).
//  • Düşmanlar her iki cihazda da çalışır (saldırıları en yakın oyuncuya); misafirde konumları ev sahibinden gelenle düzeltilir.
// Uçuş (6) ve BYLOCK (7) bölümlerinde herkes kendi oyununu oynar; ev sahibi sonraki bölüme geçince misafir de geçer.
import * as THREE from 'three';
import { G, toast } from './state.js?v=29';
import { tr, tf } from './i18n.js?v=29';
import { createPlayer, updatePuppet, puppetSwing, puppetThrow, hammerPoint } from './player.js?v=29';
import { recolorHirhiz, P2_COLORS } from './models.js?v=29';
import { throwGrenade } from './grenade.js?v=29';
import { showFur } from './gorilla.js?v=29';
import { damageEnemy } from './enemies.js?v=29';
import { setBossBar } from './boss_core.js?v=29';
import { textSprite } from './util.js?v=29';

// Taşıyıcı: herkese açık ücretsiz MQTT aracı sunucusu (WebSocket, wss). İki cihaz doğrudan bağlanmaz; mesajlar sunucudan geçer.
// Böylece mobil operatör ağlarında da çalışır (önceki PeerJS/WebRTC doğrudan bağlantısı telefonlarda kurulamadı).
// Oda kodunun ilk harfi hangi sunucunun kullanıldığını taşır: ev sahibi çalışan ilk sunucuyu seçer, misafir koddan bulur.
// Konular: hirhiz3d/v1/<KOD>/h (ev sahibine), .../g (misafire). Mesajlar JSON.
const MQTT_LIB = 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js';
const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];   // ilki olmazsa ikincisi
const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ';   // karışabilecek harfler yok (I, O, Q, W, X)
const TOPIC = (code, to) => `hirhiz3d/v1/${code}/${to}`;
const $ = id => document.getElementById(id);

let API = null;           // main.js'in verdiği işlevler
let client = null, link = null, puppet = null, remote = null, sendT = 0, stateT = 0, joinTimer = null, lastHeard = 0, myId = '';

export function initNet(api) { API = api; buildLobby(); }
export const netOn = () => !!(G.net && G.net.open);
const coop = () => netOn() && G.level && !G.level.mode;   // uçuş/bulmaca bölümlerinde ortak sahne yok

// --- KÜTÜPHANE, SUNUCU ---
function loadLib() {
    if (window.mqtt) return Promise.resolve();
    return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = MQTT_LIB; s.onload = ok; s.onerror = () => fail(new Error('mqtt')); document.head.appendChild(s); });
}
// Sunucuya bağlan (6 sn içinde olmazsa hata); bağlanınca istemciyi verir
function connectBroker(i) {
    return new Promise((ok, fail) => {
        const c = window.mqtt.connect(BROKERS[i], { clientId: 'hz3d_' + Math.random().toString(36).slice(2, 10), clean: true, connectTimeout: 6000, reconnectPeriod: 2000, keepalive: 20 });
        const t = setTimeout(() => { c.end(true); fail(new Error('zaman aşımı')); }, 7000);
        c.once('connect', () => { clearTimeout(t); ok(c); });
    });
}
const codeBroker = code => CODE_CHARS.indexOf(code[0]) % BROKERS.length;
function newCode(bi) {
    const firsts = [...CODE_CHARS].filter((ch, k) => k % BROKERS.length === bi);
    let c = firsts[Math.floor(Math.random() * firsts.length)];
    for (let i = 0; i < 3; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return c;
}
function listen(code, me) {
    client.subscribe(TOPIC(code, me), { qos: 0 });
    client.on('message', (topic, buf) => {
        let m; try { m = JSON.parse(buf.toString()); } catch (e) { return; }
        if (m.to && m.to !== myId) return;
        lastHeard = performance.now();
        if (m.t === 'join') return onJoin(m);
        if (m.t === 'welcome') return onWelcome(m);
        if (m.t === 'bye') return lost();
        if (m.t === 'full') { setStatus(tr('Oda dolu.'), true); closeNet(true); return; }
        if (m.t === 'ping') return;
        if (netOn()) onData(m);
    });
    client.on('reconnect', () => { if (G.net && !G.net.open) setStatus(tr('Sunucuya yeniden bağlanılıyor...')); });
}

export async function hostRoom(fixedCode) {   // fixedCode: yalnızca testler için
    closeNet(true);
    setStatus(tr('Bağlantı kütüphanesi yükleniyor...'));
    try { await loadLib(); } catch (e) { setStatus(tr('Bağlantı kütüphanesi yüklenemedi. İnternet bağlantını kontrol et.'), true); return; }
    let bi = fixedCode ? codeBroker(fixedCode) : 0;
    for (; bi < BROKERS.length; bi++) {
        setStatus(tf('Sunucuya bağlanılıyor ({0}/{1})...', bi + 1, BROKERS.length));
        try { client = await connectBroker(bi); break; } catch (e) { if (fixedCode) break; }
    }
    if (!client) { setStatus(tr('Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.'), true); return; }
    const code = fixedCode || newCode(bi);
    myId = 'h' + Math.random().toString(36).slice(2, 8);
    G.net = { role: 'host', guest: false, open: false, code, partnerId: null };
    listen(code, 'h');
    setStatus(tf('Oda kodu: {0} — arkadaşın bu kodla katılsın.', code)); showCode(code);
}
export async function joinRoom(code) {
    code = (code || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (code.length !== 4 || [...code].some(ch => !CODE_CHARS.includes(ch))) { setStatus(tr('Kod 4 harf olmalı.'), true); return; }
    closeNet(true);
    setStatus(tr('Bağlantı kütüphanesi yükleniyor...'));
    try { await loadLib(); } catch (e) { setStatus(tr('Bağlantı kütüphanesi yüklenemedi. İnternet bağlantını kontrol et.'), true); return; }
    setStatus(tr('Sunucuya bağlanılıyor...'));
    try { client = await connectBroker(codeBroker(code)); } catch (e) { setStatus(tr('Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.'), true); return; }
    myId = 'g' + Math.random().toString(36).slice(2, 8);
    G.net = { role: 'guest', guest: true, open: false, code };
    listen(code, 'g');
    setStatus(tr('Oda aranıyor...'));
    const t0 = performance.now();
    const ask = () => {
        if (!G.net || G.net.open) return;
        pub('h', { t: 'join', id: myId });
        if (performance.now() - t0 > 10000) setStatus(tr('Oda bulunamadı. Kodu ve arkadaşının oda ekranının açık olduğunu kontrol et. Aranmaya devam ediliyor...'), true);
        joinTimer = setTimeout(ask, 1000);
    };
    ask();
}
// ev sahibi: katılma isteği
function onJoin(m) {
    if (!G.net || G.net.guest) return;
    if (G.net.partnerId && G.net.partnerId !== m.id && netOn()) { pub('g', { t: 'full', to: m.id }); return; }
    G.net.partnerId = m.id;
    pub('g', { t: 'welcome', to: m.id, v: API.version });
    if (!G.net.open) opened();
}
// misafir: ev sahibi kabul etti
function onWelcome(m) {
    if (!G.net || !G.net.guest || G.net.open) return;
    clearTimeout(joinTimer);
    if (m.v !== API.version) toast(tr('Sürümler farklı! İkiniz de sayfayı yenileyin.'), 4000, '#fca5a5');
    opened();
}
// Oyun döngüsünden bağımsız nabız: menüde ya da hikâyedeyken de bağlantı canlı kalır; 8 sn ses yoksa koptu say
let pulse = null;
function opened() {
    G.net.open = true; lastHeard = performance.now();
    clearInterval(pulse);
    pulse = setInterval(() => { if (!netOn()) { clearInterval(pulse); return; } send({ t: 'ping' }); if (performance.now() - lastHeard > 8000) lost(); }, 2000);
    makePuppet();
    if (G.net.guest) { recolorHirhiz(G.player.m, P2_COLORS); setStatus(tr('Bağlandın! Ev sahibi oyunu başlatınca oyun açılacak.')); }
    else setStatus(tr('2. oyuncu bağlandı! Bölümü seçip OYUNU BAŞLAT\'a bas.'));
    toast(tr('İKİ KİŞİLİK OYUN HAZIR!'), 2200, '#86efac');
    API.onNetChange();
}
function lost() {
    if (!G.net) return;
    const was = G.net.open;
    closeNet(true);
    if (was) { toast(tr('ARKADAŞINLA BAĞLANTI KOPTU'), 3000, '#fca5a5'); setStatus(tr('Bağlantı koptu.'), true); }
    API.onNetChange();
}
export function closeNet(silent) {
    clearTimeout(joinTimer); clearInterval(pulse);
    if (client) { try { if (G.net && G.net.open) pub(G.net.guest ? 'h' : 'g', { t: 'bye' }); } catch (e) {} const c = client; client = null; setTimeout(() => { try { c.end(true); } catch (e) {} }, 200); }
    remote = null;
    if (puppet) { puppet.m.root.parent && puppet.m.root.parent.remove(puppet.m.root); puppet = null; }
    if (G.net && G.net.guest && G.player) recolorHirhiz(G.player.m, Object.fromEntries(Object.entries(P2_COLORS).map(([a, b]) => [b, a])));
    G.net = null; G.players = null;
    hideCode();
    if (!silent) setStatus('');
    API && API.onNetChange();
}
function pub(to, m) { if (client && G.net) try { client.publish(TOPIC(G.net.code, to), JSON.stringify(m), { qos: 0 }); } catch (e) {} }
function send(m) { if (netOn()) pub(G.net.guest ? 'h' : 'g', m); }
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
        if (coop()) { updatePuppet(puppet, dt, remote); const gor = !!(remote && remote.fl & 64); if (puppet.furOn !== gor) { puppet.furOn = gor; showFur(puppet.m, gor); } }   // arkadaş goril modunda: postu görünsün
    }
    // kendi konumum (20/sn)
    sendT -= dt;
    if (sendT <= 0 && coop()) {
        sendT = 1 / 15;
        const fl = (p.shield ? 1 : 0) | (p.grounded ? 2 : 0) | (p.dead ? 4 : 0) | (p.invuln > 0 ? 8 : 0) | (p.power.hammer > 0 ? 16 : 0) | (p.power.shieldUp > 0 ? 32 : 0) | (p.gorilla ? 64 : 0);
        send({ t: 'P', p: [r2(p.pos.x), r2(p.pos.y), r2(p.pos.z)], v: [r2(p.vel.x), r2(p.vel.y), r2(p.vel.z)], f: r2(p.facing), fl, hp: p.hp, lv: G.level.id,
               ...(G.net.guest && (++stateN % 15) === 0 ? lists() : {}) });
    }
    // ev sahibi: oyunun durumu (15/sn)
    if (!G.net.guest) {
        stateT -= dt;
        if (stateT <= 0) {
            stateT = 0.1;
            const B = G.boss, full = (++stateN % 10) === 0;   // tuğla/eşya listesi saniyede bir
            send({ t: 'S', lv: G.level.id, sc: G.score, k: G.kills, c: G.collect, st: G.state, r: G.run || 0, d: G.difficulty,
                bo: G.bossDone ? 1 : 0, o: G.outro ? 1 : 0, ...(full ? lists() : {}),
                e: coop() ? G.enemies.map(e => e.dead ? (e.how === 'ammo' ? 1 : 0) : [r2(e.pos.x), r2(e.pos.y), r2(e.pos.z)]) : null,
                b: coop() && B ? [r2(B.pos.x), r2(B.pos.y), r2(B.pos.z), r2(B.root.rotation.y), r2(B.hp), B.dead ? 1 : 0] : null });
        }
    } else applyGuestCorrections(dt);
}
const r2 = v => Math.round(v * 100) / 100;
let stateN = 0;
// Kırılan tuğlalar ve alınan eşyalar: tek seferlik olay mesajı yolda kaybolursa bu listeler eşitler
function lists() {
    const W = G.world; if (!W || !W.bricks || G.level.mode) return {};
    const br = [], it = [];
    W.bricks.forEach((b, i) => { if (b.broken) br.push(i); });
    W.items.forEach(x => { if (x.taken && x.id) it.push(x.id); });
    return { br, it };
}
function applyLists(m) {
    if (!coop() || m.lv !== G.level.id) return;
    if (m.br) m.br.forEach(i => { const b = G.world.bricks[i]; if (b && !b.broken) API.breakBrickIdx(i); });
    if (m.it) m.it.forEach(id => API.takeItem(id));
}

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
    if (m.t === 'P') {
        if (!remote) remote = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), facing: 0, fl: 0, hp: 3 };
        remote.pos.set(m.p[0], m.p[1], m.p[2]); remote.vel.set(m.v[0], m.v[1], m.v[2]); remote.facing = m.f; remote.fl = m.fl; remote.hp = m.hp; remote.lv = m.lv;
        if (puppet && remote.lv === G.level.id && !puppet.seen) { puppet.seen = true; puppet.pos.copy(remote.pos); }
        if (!G.net.guest && m.br) applyLists(m);
        updatePartnerHud();
        return;
    }
    if (m.t === 'S') {   // yalnızca misafir alır
        lastS = m;
        syncGuest(m);
        if (m.lv !== G.level.id) return;
        if (m.br) applyLists(m);
        if (G.score !== m.sc || G.kills !== m.k || G.collect !== m.c) {
            const killsChanged = G.kills !== m.k;
            G.score = m.sc; G.kills = m.k; G.collect = m.c;
            if (killsChanged) API.onKillSync(); else API.updateHud();
        }
        return;
    }
    if (m.t === 'E') onEvent(m);
}
// Misafir: ev sahibinin durumuna göre bölüm/canavar/son sahne/karne eşitlemesi (olay mesajları kaybolsa bile)
function syncGuest(m) {
    const st = G.state;
    if (st === 'story' || !G.level) return;
    if (m.st === 'play' && (m.lv !== G.level.id || (m.r && m.r !== G.netRun))) {   // ev sahibi başka bölümde / bölümü yeniden başlattı
        if (st === 'menu' && m.lv !== G.level.id && !m.r) return;
        G.netRun = m.r; if (m.d) G.difficulty = m.d; API.startGame(m.lv); return;
    }
    if (m.lv !== G.level.id || !coop() || (m.r && m.r !== G.netRun)) return;
    if (m.st === 'play' && st === 'dead') { API.retry(); return; }
    if (st !== 'play' && st !== 'pause') return;
    if (m.st === 'dead') { API.allDead(); return; }
    if (m.st === 'won') { API.showWon(); return; }
    if (m.bo && !G.bossDone && !G.boss) API.spawnBoss();
    if (m.o && !G.outro && G.boss) API.bossDefeated();
}
function onEvent(m) {
    if (window.__dropEv && window.__dropEv.includes(m.k)) return;   // yalnızca test: kaybolan mesaj
    const P = puppet, here = m.lv === undefined || (G.level && m.lv === G.level.id);
    switch (m.k) {
        case 'level':   // ev sahibi bölüm başlattı
            if (G.net.guest) { G.difficulty = m.diff; G.netRun = m.r; API.startGame(m.id); }
            break;
        case 'hammer':
            if (P && here && coop()) { puppetSwing(P); P.facing = m.f; G.onHammer && G.onHammer(hammerPoint(P), P, true); }
            break;
        case 'throw':
            if (P && here && coop()) { puppetThrow(P); G.onThrow && G.onThrow(v3(m.from), v3(m.dir), true); }
            break;
        case 'banana':   // goril modundaki arkadaşın muzu
            if (P && here && coop()) { puppetThrow(P); G.onBanana && G.onBanana(v3(m.from), v3(m.dir), true); }
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
