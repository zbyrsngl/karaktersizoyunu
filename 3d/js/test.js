// HIRHIZ 3D test senaryoları (yalnızca ?test=... ile yüklenir). Sonuç sayfa başlığına ve #fps kutusuna yazılır.
const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));

export function runTest(name, H) {
    const { G, startGame, step, STEP, cam, updateCamera, render } = H;
    const out = document.getElementById('fps'); out.hidden = false;
    const log = [];
    const say = s => { log.push(s); out.textContent = log.join(' | '); document.title = log.join(' | '); };
    const run = (sec) => { for (let i = 0; i < sec / STEP; i++) { step(STEP); updateCamera(STEP); } render(); };
    window.addEventListener('error', ev => say('HATA: ' + ev.message + ' @ ' + ((ev.error && ev.error.stack) || '').split(String.fromCharCode(10)).slice(1, 3).join(' ')));
    G.freeze = true;
    startGame();
    const p = G.player;
    try {
        if (name === 'start') { run(1.0); say(`y=${p.pos.y.toFixed(2)} grounded=${p.grounded}`); }
        if (name === 'walk') {
            key('KeyW', true); run(1.5);
            key('Space', true); run(0.1); key('Space', false); run(0.15);
            say(`z=${p.pos.z.toFixed(1)} y=${p.pos.y.toFixed(2)}`);
        }
        if (name === 'jumpheight') {   // tam zıplama yüksekliği
            run(0.3); let top = 0; key('Space', true);
            for (let i = 0; i < 80; i++) { step(STEP); top = Math.max(top, p.pos.y); }
            key('Space', false); run(1); say(`zirve=${top.toFixed(2)}m`);
        }
        if (name === 'enemy') {
            p.pos.set(0, 0, -14); cam.target.set(0, 1.6, -14); run(3.2);
            say(`can=${p.hp} mermi=${G.projectiles.length}`);
        }
        if (name === 'hammer') {
            const e = G.enemies[0]; e.cd = 99; p.pos.set(e.pos.x, 0, e.pos.z + 1.0); p.facing = Math.PI;
            key('KeyF', true); run(0.05); key('KeyF', false); run(0.4);
            say(`öldü=${e.dead} kills=${G.kills} skor=${G.score}`);
        }
        if (name === 'shelves') {   // her rafa yerden ya da alttaki raftan çıkılabiliyor mu
            say('raf testi'); const res = []; G.enemies.forEach(e => { if (e.kind !== 'duran') e.dead = true; });
            const shelves = G.world.solids.filter(a => a.type === 'shelf');
            shelves.forEach((a, i) => {
                const cx = (a.min.x + a.max.x) / 2, cz = (a.min.z + a.max.z) / 2;
                let ok = false;
                const starts = [[cx, 0, a.max.z + 1.2], [cx, 0, a.min.z - 1.2], [a.min.x - 1.2, 0, cz], [a.max.x + 1.2, 0, cz]];
                shelves.forEach(b => { if (b !== a && b.max.y < a.max.y) starts.push([Math.max(b.min.x + 0.4, Math.min(b.max.x - 0.4, cx)), b.max.y, Math.max(b.min.z + 0.4, Math.min(b.max.z - 0.4, cz))]); });
                for (const [sx, sy, sz] of starts) {
                    p.pos.set(sx, sy + 0.01, sz); p.vel.set(0, 0, 0); p.dead = false; p.hp = 9; G.state = 'play';
                    for (let k = 0; k < 10; k++) step(STEP);
                    const dx = cx - sx, dz = cz - sz, ang = Math.atan2(dx, dz);
                    // kamerayı yöne çevir: ileri = hedef
                    cam.yaw = ang + Math.PI;
                    key('KeyW', true); key('Space', true);
                    for (let k = 0; k < 90 && !ok; k++) {
                        step(STEP);
                        if (p.grounded && Math.abs(p.pos.y - a.max.y) < 0.02 && p.pos.x > a.min.x && p.pos.x < a.max.x && p.pos.z > a.min.z && p.pos.z < a.max.z) ok = true;
                    }
                    key('KeyW', false); key('Space', false);
                    if (ok) break;
                }
                res.push(ok ? '✓' : `✗${i}`);
            });
            say(res.join(''));
        }
        if (name === 'boss') {
            G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
            run(1.8);
            p.pos.set(0, 0, -190); cam.target.set(0, 1.6, -190); run(2.5);
            say(`boss=${!!G.boss} can=${p.hp} mermi=${G.projectiles.length}`);
        }
        if (name === 'stomp') {
            G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
            run(1.8); p.pos.set(0, 0, -190); run(0.5);
            const b = G.boss; let n = 0;
            while (b && !b.dead && n < 40) {
                p.pos.set(b.pos.x, 4, b.pos.z); p.vel.set(0, -2, 0); p.hp = 9; run(0.7); n++;
            }
            say(`TOMA öldü=${b && b.dead} deneme=${n}`);
            G.freeze = false;
        }
        if (name === 'face' || name === 'mobile') {   // HIRHIZ'a önden bakış, yanında düşmanlar
            if (name === 'mobile') document.body.classList.add('touch');
            G.enemies.slice(0, 4).forEach((e, i) => { e.pos.set(-2.4 + i * 1.6, 0, -16); e.home.copy(e.pos); });
            G.enemies[3].pos.set(2.6, 0, -17); G.enemies[3].home.copy(G.enemies[3].pos);
            p.pos.set(0, 0, -20); p.facing = 0; G.state = 'play';
            run(0.1); cam.yaw = Math.PI * 0.85; cam.pitch = 0.12; cam.dist = 4.2;
            for (let i = 0; i < 6; i++) { step(STEP); updateCamera(STEP); cam.dist = 4.2; cam.yaw = Math.PI * 0.85; }
            p.m.root.rotation.y = Math.PI * 0.85; p.invuln = 0; p.m.root.visible = true; render();
            say('yüz');
        }
        if (name === 'retry') {   // ölüp "Tekrar dene": duruş düzelmeli
            p.hp = 1; G.enemies.forEach(e => e.dead = true);
            import('./player.js?v=8').then(() => {});
            p.pos.set(0, 0, -10); run(0.2);
            G.player.dead = false; p.invuln = 0; H.G.onPlayerDead = () => {};
            p.hp = 1; p.invuln = 0;
            // ölüm
            p.dead = true; p.deadT = 0; run(1.5);
            const before = p.m.body.rotation.x.toFixed(2);
            G.state = 'dead'; H.retry(); run(0.6);
            cam.yaw = Math.PI * 0.85; cam.dist = 4.5; for (let i = 0; i < 6; i++) { updateCamera(STEP); cam.yaw = Math.PI * 0.85; cam.dist = 4.5; }
            render();
            say(`önce=${before} sonra=${p.m.body.rotation.x.toFixed(2)} bacak=${p.m.legL.rotation.x.toFixed(2)} durum=${G.state}`);
        }
        if (name === 'attacks') {   // her kahramanın saldırısı: 1 düşman + oyuncu (bol canlı), olan biteni say
            const seen = {};
            for (const skin of ({ 1: ['carsi', 'kirmizi', 'sema', 'capulcu', 'tencere'], 4: ['soldier', 'shieldsoldier', 'gassoldier', 'tanksniper'] }[G.level.id] || ['police', 'riot', 'gas', 'sniper'])) {
                const e = G.enemies.find(x => x.skin === skin && !x.dead);
                G.enemies.forEach(x => { if (x !== e && x.kind !== 'duran') { x.st = 'idle'; x.cd = 99; } });
                p.pos.set(e.pos.x, 0, e.pos.z - (skin.includes('sniper') ? 12 : 6)); p.vel.set(0, 0, 0); p.hp = 99; p.maxHp = 99; p.invuln = 0; p.dead = false;
                e.cd = 0; const hp0 = p.hp, st = new Set(), pr = new Set();
                for (let i = 0; i < 60 * 7; i++) { step(STEP); st.add(e.st); G.projectiles.forEach(q => pr.add(q.type)); p.invuln = 0; }
                seen[skin] = [...st].join('/') + (pr.size ? ' [' + [...pr].join(',') + ']' : '') + ' -' + (hp0 - p.hp);
                e.cd = 99;
            }
            say(Object.entries(seen).map(([k, v]) => k + ':' + v).join(' ; '));
        }
        if (name === 'tea') {   // telefonda öndekine nişan: çay paketleri düşmanı yener
            H.input.touch = true;
            const e = G.enemies.find(x => x.skin === 'carsi' || x.skin === 'police' || x.skin === 'soldier');
            G.enemies.forEach(x => { if (x !== e) x.cd = 99; }); e.cd = 99;
            p.pos.set(e.pos.x + 0.5, 0, e.pos.z + 9); p.facing = Math.PI; run(0.1);
            let n = 0;
            while (!e.dead && n < 6) { key('KeyE', true); step(STEP); key('KeyE', false); run(0.35); n++; }
            for (let i = 0; i < 50; i++) { step(STEP); updateCamera(STEP); } cam.yaw = Math.PI * 0.75; for (let i = 0; i < 20; i++) updateCamera(STEP);
            render(); say(`atış=${n} öldü=${e.dead} tutuklandı=${!!e.arrested} kills=${G.kills}`);
        }
        if (name === 'aim') {   // bilgisayar: nişangâh ışını düşmana çarpıyor mu
            const e = G.enemies.find(x => x.skin === 'kirmizi'); e.cd = 99;
            p.pos.set(e.pos.x - 0.75, 0, e.pos.z + 8); run(0.05);
            cam.yaw = 0; cam.pitch = 0.08; for (let i = 0; i < 90; i++) { updateCamera(STEP); }
            const t = G.aimTarget(p);
            say(`nişan=(${t.x.toFixed(1)},${t.y.toFixed(1)},${t.z.toFixed(1)}) düşman=(${e.pos.x.toFixed(1)},${e.pos.z.toFixed(1)})`);
            render();
        }
        if (name === 'fxshot') {   // ses dalgası ve meşale ateşi görüntüsü
            const tc = G.enemies.find(x => x.skin === 'tencere'), cs = G.enemies.find(x => x.skin === 'carsi');
            G.enemies.forEach(x => { if (x !== tc) x.cd = 99; });
            tc.alt = 1; tc.cd = 0; p.pos.set(tc.pos.x - 2, 0, tc.pos.z + 7); p.hp = 99; p.facing = Math.PI;
            let ringT = -1;
            for (let i = 0; i < 400; i++) { step(STEP); p.invuln = 0; if (tc.st === 'rest' && ringT < 0) ringT = i; if (ringT > 0 && i - ringT > 14) break; }
            cam.yaw = 0.5; cam.pitch = 0.5; cam.dist = 8; for (let i = 0; i < 60; i++) { updateCamera(STEP); cam.dist = 8; }
            render(); say('dalga ' + ringT);
        }
        if (name === 'look') {   // bölümün görüntüsü: başlangıçtan ileriye ve köprü altı
            const z = +(new URLSearchParams(location.search).get('z') || 3);
            p.pos.set(0, 0, z); cam.target.set(0, 1.6, z); cam.yaw = 0.25; cam.pitch = +(new URLSearchParams(location.search).get('pitch') || 0.28); run(0.5);
            G.enemies.forEach(e => e.cd = 99);
            const pt = +(new URLSearchParams(location.search).get('pitch') || 0.28);
            for (let i = 0; i < 40; i++) { updateCamera(STEP); cam.pitch = pt; }
            render(); say('görüntü z=' + z);
        }
        if (name === 'bossshot') {   // canavar meydanı
            G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
            run(1.8); p.pos.set(0, 0, -190); p.hp = 99; run(4.5); cam.yaw = 0.3;
            for (let i = 0; i < 60; i++) { step(STEP); updateCamera(STEP); p.invuln = 0; }
            render(); say(`canavar=${G.boss && G.boss.name} durum=${G.boss && (G.boss.st || '')} can=${G.boss && G.boss.hp}`);
        }
        if (name === 'soak') {   // gerçek döngü: 8 sn ileri yürü, zıpla, at, balyoz
            G.freeze = false; say('başladı');
            key('KeyW', true);
            const iv = setInterval(() => { key('Space', true); setTimeout(() => key('Space', false), 200); key('KeyE', true); key('KeyE', false); key('KeyF', true); key('KeyF', false); }, 700);
            setTimeout(() => { clearInterval(iv); key('KeyW', false); say(`bitti z=${p.pos.z.toFixed(1)} can=${p.hp} kills=${G.kills} durum=${G.state}`); }, 8000);
        }
        if (name === 'shieldshot') {
            G.enemies.forEach(e => e.cd = 99);
            p.pos.set(0, 0, -5); p.facing = 0; key('ShiftLeft', true); run(0.3);
            cam.yaw = Math.PI * 0.8; cam.pitch = 0.15; for (let i = 0; i < 40; i++) { step(STEP); updateCamera(STEP); cam.dist = 4; cam.yaw = Math.PI * 0.8; p.facing = 0; }
            p.m.root.rotation.y = 0; render(); say('kalkan=' + p.shield + ' big rotY=' + p.big.rotation.y.toFixed(2) + ' q=' + p.big.quaternion.toArray().map(v => v.toFixed(2)));
        }
        if (name === 'outro') {   // canavar yenilince bölüm sonu sahnesi ve karne
            G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
            run(1.8); p.pos.set(0, 0, -192); p.hp = 99; run(0.5);
            const b = G.boss; b.hp = 1; b.door = 1; b.st = 'exposed'; b.t = 5;
            G.onHammer(b.pos.clone().setY(1.2), p);
            let t = 0; const seen = new Set();
            const shotAt = +(new URLSearchParams(location.search).get('talk') || 0);
            while (G.state !== 'won' && t < 25) {
                step(STEP); updateCamera(STEP); t += STEP; if (G.outro) seen.add(G.outro.st); p.invuln = 1;
                if (shotAt && G.outro && G.outro.st === 'talk' && G.outro.t > shotAt) { cam.yaw = Math.atan2(G.outro.m.root.position.x - p.pos.x, G.outro.m.root.position.z - p.pos.z) + Math.PI + 0.6; for (let i = 0; i < 30; i++) { updateCamera(STEP); if (new URLSearchParams(location.search).get('near')) { cam.dist = 3.2; cam.pitch = 0.05; } } break; }
            }
            render(); say(`kasa öldü=${b.dead} sahne=${[...seen].join('/')} durum=${G.state} süre=${t.toFixed(1)}`);
        }
        if (name === 'kasa') {   // kapak kapalıyken zırhlı, açıkken vurulur
            G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
            run(1.8); p.pos.set(0, 0, -192); p.hp = 99; run(0.5);
            const b = G.boss, hp0 = b.hp; b.st = 'walk'; b.door = 0;
            G.onHammer(b.pos.clone().setY(1.2), p); const closed = b.hp;
            b.door = 1; b.st = 'exposed'; b.t = 5; b.hurtT = 0;
            G.onHammer(b.pos.clone().setY(1.2), p); const open = b.hp;
            let seenRain = false, seenVolley = false; b.st = 'walk'; b.timer = 0;
            for (let i = 0; i < 60 * 8; i++) { step(STEP); p.invuln = 1; G.projectiles.forEach(q => { if (q.type === 'rain') seenRain = true; if (q.type === 'dollar') seenVolley = true; }); }
            say(`can ${hp0} → kapalı ${closed} → açık ${open} · yelpaze=${seenVolley} yağmur=${seenRain}`);
        }
        if (name === 'kasashot') {
            G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
            run(1.8); p.pos.set(0, 0, -192); p.hp = 99; run(0.5);
            const b = G.boss; p.pos.set(b.pos.x + 1.5, 0, b.pos.z + 5.5); b.st = 'exposed'; b.t = 9; b.door = 1;
            for (let i = 0; i < 40; i++) { step(STEP); p.invuln = 1; cam.yaw = 0.2; cam.pitch = 0.12; cam.dist = 6; updateCamera(STEP); }
            render(); say('kasa');
        }
        if (name === 'headtex') {   // fotoğraf kafa kesimlerini ekrana koy
            import('./outro.js?v=8').then(async o => {
                const t1 = o.photoHead('../resimler/sonpeygamber.png', [174, 78, 112, 158], [56, 80, 52, 77]);
                const t2 = o.photoHead('../resimler/cengiz.png', [50, 22, 88, 112], [44, 53, 37, 51]);
                await new Promise(r => setTimeout(r, 1500));
                [t1, t2].forEach((t, i) => { const im = document.createElement('img'); im.src = t.image.toDataURL(); im.style.cssText = `position:fixed;left:${40 + i * 300}px;top:80px;width:252px;background:#0f0;z-index:99`; document.body.appendChild(im); });
                say('kafa ' + t1.image.width + 'x' + t1.image.height);
            });
        }
        if (name === 'tencere') {   // kalkanla karşılayınca sersemlemeli, can gitmemeli
            const e = G.enemies.find(x => x.kind === 'tencere');
            G.enemies.forEach(x => { if (x !== e && x.kind !== 'duran') x.dead = true; });
            p.pos.set(e.pos.x, 0, e.pos.z - 7); p.facing = 0; e.facing = Math.PI; e.cd = 0; e.alt = 0;
            key('ShiftLeft', true); let stunned = false, sawCharge = false;
            for (let i = 0; i < 240; i++) { step(STEP); if (e.st === 'charge') sawCharge = true; if (e.st === 'stun') stunned = true; }
            key('ShiftLeft', false); render();
            say(`hücum=${sawCharge} sersem=${stunned} can=${p.hp}/${p.maxHp}`);
        }
        if (name === 'calls') { run(0.5); const r = []; for (const z of [7, -40, -100, -170]) { p.pos.set(0, 0, z); cam.target.set(0, 1.6, z); run(0.3); r.push(z + ':' + H.calls()); } say(r.join(' ')); }
        if (name === 'pit') {
            p.pos.set(0, 0, -34); cam.yaw = 0; key('KeyW', true); run(1.4); key('KeyW', false); run(0.8);
            say(`can=${p.hp} z=${p.pos.z.toFixed(1)} y=${p.pos.y.toFixed(1)}`);
        }
    } catch (e) { say('HATA: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
}
// Çizim sayısı: ?test=calls
export function calls(r) { return r.info.render.calls; }
