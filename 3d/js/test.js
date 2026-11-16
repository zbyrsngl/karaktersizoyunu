import * as THREE from 'three';
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
        if (name === 'hikaye') {   // bölümün giriş hikâyesi (2D oynatıcı); &sahne=N: N kez ilerlet
            const Q = new URLSearchParams(location.search), n = +(Q.get('sahne') || 0);
            import('./story3d.js?v=21').then(S => {
                S.playLevelStory(G.level.id, () => say('hikaye bitti'));
                for (let i = 0; i < n * 2; i++) window.storyNext();
                setTimeout(() => say('hikaye açık=' + S.storyOpen() + ' kafa=' + !!window.headCanvas), 1500);
            });
        }
        if (name === 'mahalle') {   // her bölümde: güç tuğlaları (bombalar), siper sayısı, düşman sayısı, çizim çağrısı
            const res = [];
            for (const n of [1, 2, 3, 4, 5, 8, 9, 10]) {
                H.startGame(n); run(0.1);
                const W = G.world, pw = W.powerSpots || [];
                res.push(`${n}: bomba${pw.filter(x => x[0] === 'grenade').length} güç${pw.length} siper${W.solids.filter(a => a.type === 'solid').length} düşman${G.enemies.length} ${H.calls()}`);
            }
            say(res.join(' · '));
        }
        if (name === 'kamera') {   // nişan en aşağıda (kamera en alçakta), her yöne dönerken kamera yerin altına giriyor mu (bütün yürünen bölümler)
            const Q = new URLSearchParams(location.search), res = [];
            const levels = Q.get('tek') ? [G.level.id] : [1, 2, 3, 4, 5, 8, 9, 10], input = H.input;
            for (const n of levels) {
                if (!Q.get('tek')) { H.startGame(n); run(0.1); }
                G.enemies.forEach(e => { e.cd = 99; e.T.update = () => {}; });
                let worst = 99, where = '';
                for (const [x, z] of [[0, 94], [7.5, 60], [-7.5, 20], [14, 72], [0, -30], [7.6, -120], [0, -200], [16, -220]]) {
                    p.pos.set(x, 0, z); p.vel.set(0, 0, 0); p.safe.copy(p.pos); cam.target.set(x, 1.6, z);
                    for (let a = 0; a < 16; a++) {
                        cam.yaw = a / 16 * Math.PI * 2; cam.pitch = -5; input.camDX = 0; input.camDY = 999;   // en aşağı (kamera en alçakta)
                        input.camDY = -99999; for (let i = 0; i < 40; i++) { input.camDY = -50; updateCamera(STEP); }
                        const c = H.camera.position, overRoad = Math.abs(c.x) < 8 || (c.z < -184 && c.z > -236 && Math.abs(c.x) < 18);
                        const floor = G.level.noOuter && !overRoad ? null : 0;
                        if (floor !== null && G.world.solids.some(s => s.type === 'ground' && c.x > s.min.x && c.x < s.max.x && c.z > s.min.z && c.z < s.max.z) || (floor !== null && !overRoad)) {
                            const d = c.y - floor; if (d < worst) { worst = d; where = `${x},${z} yaw${a}`; }
                        }
                    }
                }
                res.push(`${n}: en alçak ${worst.toFixed(2)}m (${where}) pitch=${cam.pitch.toFixed(2)}`);
            }
            if (Q.get('foto')) { p.pos.set(0, 0, 60); cam.target.set(0, 1.6, 60); cam.yaw = +(Q.get('yaw') || 0); for (let i = 0; i < 60; i++) { input.camDY = -50; updateCamera(STEP); } render(); }
            say(res.join(' · '));
        }
        if (name === 'guc') {   // güç tuğlalarını kır, çıkan güçleri al: bomba sayısı, güç süreleri, kalkan gücüyle hasar almama
            run(0.3); G.enemies.forEach(e => { e.cd = 99; e.T.update = () => {}; });
            const res = [`başlangıç bomba=${G.grenades}`];
            for (const b of G.world.bricks.filter(b => b.power)) {
                G.onBrickHit(b.aabb); run(0.1);
                const it = G.world.items.find(i => i.kind === b.power && !i.taken && i.temp);
                if (!it) { res.push(b.power + ':eşya yok'); continue; }
                p.pos.set(it.pos.x, it.baseY, it.pos.z); p.vel.set(0, 0, 0); run(0.15);
                res.push(`${b.power}:${it.taken ? 'alındı' : 'ALINMADI'}`);
            }
            const P = p.power; res.push(`bomba=${G.grenades} kalkan=${P.shieldUp.toFixed(0)} hız=${P.speed.toFixed(0)} balyoz=${P.hammer.toFixed(0)}`);
            P.shieldUp = 5; const hp0 = p.hp; p.invuln = 0; G.onHammer && 0; const hurt = (await_ => 0);
            import('./player.js?v=21').then(M => {
                M.hurtPlayer(p.pos.clone().setX(p.pos.x + 1)); res.push(`kalkanlıyken can ${hp0}->${p.hp}`);
                P.hammer = 10; P.shieldUp = 10; run(0.4);
                cam.yaw = 2.4; cam.pitch = 0.2; cam.dist = 4; updateCamera(0.0001); render();
                say(res.join(' '));
            });
        }
        if (name === 'bak') {   // &t=sn: önce bu kadar oynat. başlangıçtan ya da &z= noktasından ileri bakış: &yaw= &pitch= &z= &x=
            const Q = new URLSearchParams(location.search);
            p.pos.set(+(Q.get('x') || 0), 0, +(Q.get('z') || p.pos.z)); p.vel.set(0, 0, 0);
            G.enemies.forEach(e => { e.cd = 99; });
            cam.yaw = +(Q.get('yaw') || 0); cam.pitch = +(Q.get('pitch') || 0.32);
            run(1.2 + +(Q.get('t') || 0)); cam.yaw = +(Q.get('yaw') || 0); cam.pitch = +(Q.get('pitch') || 0.32); updateCamera(1); render();
            say('bak ' + H.calls());
        }
        if (name === 'poz') {   // yakın çekim: oyuncu (kalkan &kalkan=1), önünde iki düşman (biri sırtı dönük). &yaw= &pitch= &uzak=
            const Q = new URLSearchParams(location.search);
            run(0.3);
            const es = G.enemies.filter(e => !e.dead && e.kind !== 'duran').slice(0, 2);
            es.forEach((e, i) => { e.T.update = () => {}; e.cd = 99; e.pos.set(p.pos.x + (i ? -1.2 : 1.2), 0, p.pos.z - 2.2); e.facing = i ? Math.PI : 0; });
            if (Q.get('kalkan')) { H.input.shieldHeld = true; }
            p.facing = Math.PI;
            cam.yaw = +(Q.get('yaw') || 0.5); cam.pitch = +(Q.get('pitch') || 0.15);
            const orig = H.updateCamera;
            for (let i = 0; i < 30; i++) { if (Q.get('kalkan')) { G.player.shield = true; } step(STEP); orig(STEP); }
            if (Q.get('kalkan')) { p.big.visible = true; p.m.shield.visible = false; p.m.armL.rotation.x = -1.45; }
            cam.dist = +(Q.get('uzak') || 3); H.updateCamera(0.0001); render();
            say('poz ' + es.map(e => e.skin).join(','));
        }
        if (name === 'tuslar') {   // bütün bölümleri sırayla yükle (menüden geçer gibi), dokunmatik tuşlar görünüyor mu
            document.body.classList.add('touch'); const res = [];
            const vis = id => { const el = document.getElementById(id); return el && getComputedStyle(el).display !== 'none' ? 1 : 0; };
            const seq = [1,2,3,4,5,6,7,8,9,10,1,7,2,6,3,10,5];
            for (const n of seq) { H.startGame(n); run(0.2);
                res.push(`${n}:pad${vis('pad')}j${vis('b-jump')}h${vis('b-hammer')}b${vis('b-bribe')}`); }
            say(res.join(' '));
        }
        if (name === 'sonraki') {   // menüden bölüm seç, bitir, "SONRAKİ BÖLÜME GEÇ" düğmesine bas; tuşlar görünüyor mu
            document.body.classList.add('touch'); const res = [];
            const vis = id => { const el = document.getElementById(id); return el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' ? 1 : 0; };
            H.loadLevel(+(new URLSearchParams(location.search).get('ilk') || 2)); H.startGame(1); run(0.2);
            for (let n = 1; n <= 9; n++) {
                res.push(`${G.level.id}:pad${vis('pad')}j${vis('b-jump')}`);
                G.showWon(); document.getElementById('next').click(); run(0.2);
            }
            res.push(`${G.level.id}:pad${vis('pad')}`); say(res.join(' '));
        }
        if (name === 'ses') {   // konuşma seslerinin yükseltme katsayıları ve müziğin Web Audio'dan geçmesi
            import('./audio.js?v=21').then(A => { A.unlockAudio(); setTimeout(() => {
                const D = A.audioDebug(), r = [];
                for (const k of ['hasret', 'yaallah', 'savci', 'peygamber', 'cengiz', 'selo', 'saygili', 'ekrem']) r.push(k + '=' + (D.gains[k] ? D.gains[k][0].toFixed(2) : '-'));
                say('müzik=' + D.music + ' ' + r.join(' '));
            }, 6000); });
        }
        if (name === 'bomba') {   // el bombası: en yakın düşmana at, patlat; sonra canavara at. &an=sn → patlamadan sn sonra fotoğraf
            const Q = new URLSearchParams(location.search), an = +(Q.get('an') || 0);
            const key2 = (code) => { dispatchEvent(new KeyboardEvent('keydown', { code })); run(1 / 60); dispatchEvent(new KeyboardEvent('keyup', { code })); };
            run(0.5);
            const live = G.enemies.filter(e => !e.dead && e.kind !== 'duran').sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos));
            const e = live[0]; const res = [];
            if (e) {
                e.cd = 99; const near = G.enemies.filter(o => !o.dead && o.kind !== 'duran' && o.pos.distanceTo(e.pos) < 4.8).length;
                p.pos.set(e.pos.x, e.pos.y, e.pos.z + 9); p.vel.set(0, 0, 0); run(0.2);
                G.aimTarget = () => e.pos.clone().setY(e.pos.y + 0.2);
                const g0 = G.grenades; key2('KeyR'); const g1 = G.grenades;
                let t = 0; while (t < 2.5) { run(1 / 60); t += 1 / 60; if (an && e.dead && t > 0) { /* patladı */ } }
                res.push(`dusman=${e.dead ? 'öldü' : 'sağ'}(${e.kind}) yakın=${near} bomba ${g0}->${g1}`);
            }
            // canavar
            const kills = G.kills; G.enemies.forEach(o => { if (o.kind !== 'duran' && !o.dead) { o.dead = true; G.kills++; G.onKill(o); } });
            run(1.8); p.pos.set(0, 0, -192); p.hp = 99; run(1.5);
            const B = G.boss;
            if (B) { for (let i = 0; i < 360 && (B.st === 'talk' || B.st === 'intro'); i++) { run(1 / 60); p.invuln = 1; }
                const hp0 = B.hp; G.grenades = 3; p.pos.set(B.pos.x, 0, B.pos.z + 8); run(0.1);
                G.aimTarget = () => B.pos.clone().setY(0.3);
                key2('KeyR'); let t = 0; const shotAt = an || 99; let shot = false;
                while (t < 2.4) { run(1 / 60); t += 1 / 60; }
                res.push(`canavar ${hp0.toFixed(1)}->${B.hp.toFixed(1)}`);
            }
            // stok: 3 at, 4.de BOMBA YOK, 12 sn sonra 1 gelir
            G.grenades = 3; for (let i = 0; i < 4; i++) { key2('KeyR'); run(0.7); }
            const empty = G.grenades; run(12.2); res.push(`stok bitti=${empty} 12sn sonra=${G.grenades}`);
            say(res.join(' | '));
        }
        if (name === 'bombafoto') {   // patlama anının fotoğrafı (&an=sn)
            const an = +(new URLSearchParams(location.search).get('an') || 0.1);
            run(0.5); G.enemies.forEach(o => o.cd = 99);
            const at = p.pos.clone().add(new THREE.Vector3(0, 0, -6));
            G.aimTarget = () => at.clone();
            dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' })); run(1 / 60); dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyR' }));
            let t = 0; let boomT = -1;
            const n0 = G.scene.children.length;
            while (t < 4) { run(1 / 60); t += 1 / 60; if (boomT < 0 && G.blasts) boomT = t; if (boomT >= 0 && t - boomT >= an) break; }
            cam.yaw = 0; render(); say(`patlama t=${boomT.toFixed(2)} foto=${an}`);
        }
        if (name === 'kos') {   // 1 sn yürüme ve Shift ile koşma mesafesi; E kalkan, sol tık atışında balyoz savrulmuyor mu
            G.enemies.forEach(e => e.cd = 99); run(0.3);
            const z0 = p.pos.z; key('KeyW', true); run(1); key('KeyW', false); run(0.6);
            const z1 = p.pos.z; key('ShiftLeft', true); key('KeyW', true); run(1); key('KeyW', false); key('ShiftLeft', false); run(0.6);
            const z2 = p.pos.z;
            key('KeyE', true); run(0.1); const sh = p.shield; key('KeyE', false); run(0.1);
            H.input.throwPressed = true; run(0.05); const sw = p.swing > 0;
            say(`yürü=${(z0 - z1).toFixed(2)}m koş=${(z1 - z2).toFixed(2)}m kalkanE=${sh} atışta_balyoz=${sw}`);
        }
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
            import('./player.js?v=21').then(() => {});
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
            for (const skin of ({ 1: ['carsi', 'kirmizi', 'sema', 'capulcu', 'tencere'], 4: ['soldier', 'shieldsoldier', 'gassoldier', 'tanksniper'], 5: ['minitank', 'police', 'sniper'] }[G.level.id] || ['police', 'riot', 'gas', 'sniper'])) {
                const e = G.enemies.find(x => x.skin === skin && !x.dead);
                G.enemies.forEach(x => { if (x !== e && x.kind !== 'duran') { x.st = 'idle'; x.cd = 99; } });
                p.pos.set(e.pos.x, 0, e.pos.z + (skin === 'minitank' ? 6 : -(skin.includes('sniper') ? 12 : 6))); p.vel.set(0, 0, 0); p.hp = 99; p.maxHp = 99; p.invuln = 0; p.dead = false;
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
            if (!b.dead && b.onAmmo) { b.hp = 0.25; b.onAmmo({ pos: b.pos.clone().setY(1.2), vel: new THREE.Vector3(-Math.sin(b.facing || 0), 0, -Math.cos(b.facing || 0)) }); }
            let t = 0; const seen = new Set();
            const shotAt = +(new URLSearchParams(location.search).get('talk') || 0);
            while (G.state !== 'won' && t < 25) {
                step(STEP); updateCamera(STEP); t += STEP; if (G.outro) seen.add(G.outro.st); p.invuln = 1;
                const party = +(new URLSearchParams(location.search).get('party') || 0);
                if (party && G.outro && G.outro.t > party) { cam.yaw = 0.4; cam.pitch = 0.25; for (let i = 0; i < 40; i++) { updateCamera(STEP); cam.dist = 5.5; } break; }
                if (shotAt && G.outro && G.outro.st === 'talk' && G.outro.t > shotAt) { cam.yaw = Math.atan2(G.outro.m.root.position.x - p.pos.x, G.outro.m.root.position.z - p.pos.z) + Math.PI + 0.6; for (let i = 0; i < 30; i++) { updateCamera(STEP); if (new URLSearchParams(location.search).get('near')) { cam.dist = 3.2; cam.pitch = 0.05; } } break; }
            }
            const yuz = new URLSearchParams(location.search).get('yuz');
            if (yuz && G.outro && G.outro.m) {   // karakterin yüzüne yakın çekim (yuz=açı)
                const r = G.outro.m.root, f = r.rotation.y + (+yuz || 0), hp = r.position.clone().setY(1.55 + (+(new URLSearchParams(location.search).get('yuk')) || 0));
                G.camera.position.set(hp.x + Math.sin(f) * (+(new URLSearchParams(location.search).get('uzak')) || 2.4), 1.75 + (+(new URLSearchParams(location.search).get('yuk')) || 0), hp.z + Math.cos(f) * (+(new URLSearchParams(location.search).get('uzak')) || 2.4)); G.camera.lookAt(hp);
                const R = H.renderer || null; if (R) R.render(G.scene, G.camera); else render();
            } else render();
            say(`kasa öldü=${b.dead} sahne=${[...seen].join('/')} durum=${G.state} süre=${t.toFixed(1)}`);
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
            import('./outro.js?v=21').then(async o => {
                const t1 = o.photoHead('../resimler/sonpeygamber.png', [174, 78, 112, 158], [56, 80, 52, 77], { amt: 1.6, con: 1.15, blur: 4, tint: [0.97, 1.04, 0.9] });
                const t2 = o.photoHead('../resimler/cengiz.png', [50, 22, 88, 112], [44, 53, 37, 51]);
                await new Promise(r => setTimeout(r, 1500));
                [t1, t2].forEach((t, i) => { const im = document.createElement('img'); im.src = t.image.toDataURL(); im.style.cssText = `position:fixed;left:${40 + i * 300}px;top:80px;width:252px;background:#0f0;z-index:99`; document.body.appendChild(im); });
                say('kafa ' + t1.image.width + 'x' + t1.image.height);
            });
        }
        if (name === 'fetoshot') {   // canavara yakından bak: ?st=walk|crouch|slam
            G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
            run(1.8); p.pos.set(0, 0, -192); p.hp = 99; run(5);
            const b = G.boss, st = new URLSearchParams(location.search).get('st') || 'walk';
            p.pos.set(b.pos.x + 1.2, 0, b.pos.z + 3.2); b.timer = 99;
            if (st !== 'walk') { b.st = 'crouch'; b.next = st === 'slam' ? 'slam' : 'volley'; b.t = 0.2; }
            for (let i = 0; i < 20; i++) { b.update(STEP); if (st !== 'walk') b.t = 0.2; }
            p.pos.set(b.pos.x + 6, 0, b.pos.z + 6); b.facing = +(new URLSearchParams(location.search).get('face') || 0);
            for (let i = 0; i < 3; i++) b.update(0.001);
            b.root.rotation.y = b.facing; b.root.visible = true;
            if (new URLSearchParams(location.search).get('hide')) b.m.cane.visible = false;
            const near = []; G.scene.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === '6b3f1d') near.push(o.parent === b.m.cane ? 'baston' : (o.parent && o.parent.type) + '@' + o.getWorldPosition(new THREE.Vector3()).toArray().map(v => v.toFixed(1)).join(',')); });
            const ang = b.facing + (+(new URLSearchParams(location.search).get('yaw') || 0.4)), dist = 3.4;
            G.freezeCam = true;
            H.camera.position.set(b.pos.x + Math.sin(ang) * dist, 1.5, b.pos.z + Math.cos(ang) * dist); H.camera.lookAt(b.pos.x, 1.1, b.pos.z);
            render(); say('feto ' + st + ' kahverengi: ' + near.join(' | '));
        }
        if (name === 'battery') {   // şarj azalır, şarj aleti doldurur, bitince can gider
            G.enemies.forEach(e => e.cd = 99);
            const b0 = G.battery; run(5); const b1 = G.battery;
            G.battery = 0.5; const hp0 = p.hp; run(0.6); const hp1 = p.hp, b2 = G.battery;
            const ch = G.world.items.find(i => i.kind === 'charger'); G.battery = 20; p.pos.set(ch.pos.x, 0, ch.pos.z); run(0.3);
            say(`şarj ${b0.toFixed(0)}→${b1.toFixed(0)} · bitince can ${hp0}→${hp1}, şarj ${b2.toFixed(0)} · alet sonrası ${G.battery.toFixed(0)}`);
        }
        if (name === 'teaboss') {   // canavarı yalnızca nişanlı atışla yen (telefon nişanı)
            H.input.touch = true;
            G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
            run(1.8); p.pos.set(0, 0, -190); p.hp = 99; run(0.5);
            const b = G.boss; let n = 0;
            while (b && !b.dead && n < 200) {
                p.pos.set(b.pos.x, 0, b.pos.z + 9); p.facing = Math.PI; p.hp = 99; p.invuln = 1;
                key('KeyE', true); step(STEP); key('KeyE', false); n++;
                for (let i = 0; i < 20; i++) { step(STEP); p.invuln = 1; }
            }
            say(`${b && b.name} atışla öldü=${b && b.dead} atış=${n}`);
        }
        if (name === 'flight') {   // 6. bölüm: jetleri vur → tanker → düşür → haşhaşi sahnesi → karne
            const M = G.level.mode; let t = 0, shots = 0, sawTanker = false;
            const Q = new URLSearchParams(location.search), shotAt = +(Q.get('at') || 0);
            while (G.state === 'play' && t < 120) {
                p.invuln = 1; p.hp = 9;
                if (Math.floor(t * 60) % 9 === 0) { H.input.throwPressed = true; shots++; }
                step(STEP); updateCamera(STEP); t += STEP;
                if (G.boss) sawTanker = true;
                if (shotAt && t > shotAt) break;
            }
            if (shotAt) { render(); say(`uçuş t=${t.toFixed(1)} kills=${G.kills} tanker=${sawTanker} durum=${G.state}`); }
            else say(`kills=${G.kills} topla=${G.collect} tanker=${sawTanker} durum=${G.state} süre=${t.toFixed(1)} atış=${shots}`);
        }
        if (name === 'flighthit') {   // kalkansız füze can götürür, kalkanla durur
            let t = 0; const hp0 = p.hp;
            while (t < 25 && p.hp === hp0) { step(STEP); updateCamera(STEP); t += STEP; }
            const hit = hp0 - p.hp; p.invuln = 0; key('ShiftLeft', true); const hp1 = p.hp; t = 0;
            while (t < 15) { step(STEP); updateCamera(STEP); t += STEP; p.invuln = 0; }
            key('ShiftLeft', false); render();
            say(`füze can götürdü=${hit} kalkanla kayıp=${hp1 - p.hp} durum=${G.state}`);
        }
        if (name === 'puzzle') {   // yanlış tahmin, sonra doğru şifre → karne
            const M = G.level.mode, code = M.code();
            const wrong = '0123'.split('').filter(c => true).join('') === code ? '4567' : '0123';
            [...wrong].forEach(c => M.press(c)); M.press('✔');
            [...code].forEach(c => M.press(c)); M.press('✔');
            run(0.3); const pre = G.state;
            setTimeout(() => { render(); say(`önce=${pre} sonra=${G.state} yıldız=${G.level.stars()} ${G.level.wonDetail()}`); }, 2600);
        }
        if (name === 'bossfight') {   // 8-10: kapıyı aç, canavarın saldırılarını izle, sonra yen ve bölüm sonu sahnesini oynat
            const Q = new URLSearchParams(location.search), watch = +(Q.get('watch') || 8), shotAt = +(Q.get('at') || 0), shotWatch = Q.get('wshot');
            G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
            run(1.8); p.pos.set(0, 0, -190); p.hp = 99; run(0.5);
            const b = G.boss, seen = new Set(), types = new Set(); let t = 0, maxY = 0, hits0 = G.livesLost;
            if (Q.get('pz')) p.pos.set(+(Q.get('px') || 0), 0, +Q.get('pz'));
            if (Q.get('shelf')) { const [sx, sz] = Q.get('shelf').split(',').map(Number); p.pos.set(sx, 1.81, sz); }
            while (t < watch) {
                step(STEP); updateCamera(STEP); t += STEP; p.hp = 99;
                seen.add(b.st); G.projectiles.forEach(q => types.add(q.type)); maxY = Math.max(maxY, b.pos.y);
                if (shotWatch && t > +shotWatch) break;
            }
            const hits = G.livesLost - hits0;
            if (shotWatch) { cam.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z) + (+Q.get('yo') || 0.9); cam.pitch = +(Q.get('pitch') || 0.45); for (let i = 0; i < 40; i++) updateCamera(STEP); render(); say(`${b.name} st=${b.st} hp=${b.hp} b=${b.pos.x.toFixed(1)},${b.pos.y.toFixed(1)},${b.pos.z.toFixed(1)} p=${p.pos.x.toFixed(1)},${p.pos.y.toFixed(1)},${p.pos.z.toFixed(1)} maxY=${maxY.toFixed(1)}`); }
            else {
                let n = 0, rerun = false;
                while (!b.dead && n < 400) { b.hurtT = 0; b.guard = 0; if (b.st === 'talk') b.t = 0; G.onHammer(b.pos.clone().setY(b.pos.y + 1.2), p); if (b.rerun) rerun = true; n++; step(STEP); }
                t = 0; const ost = new Set();
                while (G.state !== 'won' && t < 25) { step(STEP); updateCamera(STEP); t += STEP; p.invuln = 1; p.hp = 99; if (shotAt && G.outro && G.outro.t > shotAt) break; }
                if (shotAt) { cam.yaw = Math.atan2(p.pos.x - b.pos.x, p.pos.z - b.pos.z) + 0.6; cam.pitch = 0.3; for (let i = 0; i < 40; i++) updateCamera(STEP); }
                render();
                say(`${b.name} hal=${[...seen].join('/')} mermi=${[...types].join('/')} yükseklik=${maxY.toFixed(1)} can kaybı=${hits} vuruş=${n} tekrar=${rerun} durum=${G.state} sahne=${t.toFixed(1)}s`);
            }
        }
        if (name === 'moderetry') {   // uçuşta düş, tekrar dene; EKREM seçim tekrarındayken öl, tekrar dene
            let t = 0;
            if (G.level.mode) {
                p.hp = 1; while (!p.dead && t < 40) { step(STEP); updateCamera(STEP); t += STEP; }
                const died = p.dead; run(1.6); const st = G.state; H.retry(); run(1);
                say(`öldü=${died} panel=${st} sonra=${G.state} can=${p.hp} ölü=${p.dead}`);
            } else {
                G.enemies.forEach(e => { if (e.kind !== 'duran' && !e.dead) { e.dead = true; G.kills++; G.onKill(e); } });
                run(1.8); p.pos.set(0, 0, -190); run(0.5);
                const b = G.boss; while (!b.rerun) { b.hurtT = 0; b.guard = 0; if (b.st === 'talk') b.t = 0; G.onHammer(b.pos.clone().setY(1.2), p); step(STEP); }
                p.hp = 1; p.invuln = 0; b.guard = 0; while (!p.dead && t < 60) { step(STEP); t += STEP; }
                run(1.6); H.retry(); run(0.5);
                say(`öldü=${p.dead} sonra=${G.state} canavar=${G.boss && G.boss.name} can=${G.boss && G.boss.hp}/${G.boss && G.boss.maxHp} tekrar=${G.boss && G.boss.rerun}`);
            }
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
