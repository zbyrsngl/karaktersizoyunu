// HIRHIZ 3D test senaryoları (yalnızca ?test=... ile yüklenir). Sonuç sayfa başlığına ve #fps kutusuna yazılır.
const key = (code, down) => dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));

export function runTest(name, H) {
    const { G, startGame, step, STEP, cam, updateCamera, render } = H;
    const out = document.getElementById('fps'); out.hidden = false;
    const log = [];
    const say = s => { log.push(s); out.textContent = log.join(' | '); document.title = log.join(' | '); };
    const run = (sec) => { for (let i = 0; i < sec / STEP; i++) { step(STEP); updateCamera(STEP); } render(); };
    window.onerror = (m) => say('HATA: ' + m);
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
            const e = G.enemies[0]; p.pos.set(e.pos.x, 0, e.pos.z + 1.5); p.facing = Math.PI; run(0.05);
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
            while (b && !b.dead && n < 20) {
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
            import('./player.js?v=3').then(() => {});
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
        if (name === 'tencere') {   // kalkanla karşılayınca sersemlemeli, can gitmemeli
            const e = G.enemies.find(x => x.kind === 'tencere');
            G.enemies.forEach(x => { if (x !== e && x.kind !== 'duran') x.dead = true; });
            p.pos.set(e.pos.x, 0, e.pos.z - 7); p.facing = 0; e.facing = Math.PI; e.atkCd = 0;
            key('ShiftLeft', true); let stunned = false, sawCharge = false;
            for (let i = 0; i < 240; i++) { step(STEP); if (e.atk === 'charge') sawCharge = true; if (e.stun > 0) stunned = true; }
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
