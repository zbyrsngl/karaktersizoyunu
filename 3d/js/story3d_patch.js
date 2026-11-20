// HIRHIZ 3D: 3D sürüme özel hikâye değişiklikleri (story2d.js'ten SONRA yüklenir; story2d.js otomatik üretildiği için ona dokunulmaz).
//   8. bölüm: polis yok, ABİLER var (kitap, tesbih, takke); çiftlik evinin bahçesi
//   9. bölüm: Selo dağa kaçar; yolda keleşli teröristler, bombacılar, mayınlar, canlı bombalar
// Yeni karakterler elle çizilmiş 8x8 piksel yüzlerdir (lisans gerekmez).
Object.assign(PIX_FACES, {
    abi:    { pal: { h: '#1c1917', s: '#e0ac69', e: '#111827', m: '#1c1917', w: '#f8fafc' },
              rows: ['.hhhhhh.', 'hhhhhhhh', 'hssssssh', 'sesssess', 'ssssssss', 'smmmmmms', 'ssssssss', '.wwwwww.'] },
    takke:  { pal: { h: '#f8fafc', s: '#d9a27c', e: '#111827', m: '#292524', b: '#292524' },
              rows: ['.hhhhhh.', 'hhhhhhhh', 'ssssssss', 'sesssess', 'ssssssss', 'sbmmmmbs', 'sbbbbbbs', '.bbbbbb.'] },
    terror: { pal: { k: '#111827', s: '#c68642', e: '#f8fafc', r: '#7f1d1d' },
              rows: ['kkkkkkkk', 'kkkkkkkk', 'kkrkkrkk', 'ksesseks', 'kkkkkkkk', 'kkkkkkkk', 'kkrkkrkk', '.kkkkkk.'] }
});
Object.assign(STORY_CAST, {
    abi:    { pix: 'abi', suit: '#1f2937', arm: '#1f2937', leg: '#111827', shoe: '#000', hand: '#e0ac69', tie: '#111827' },
    takke:  { pix: 'takke', suit: '#3f3f46', arm: '#3f3f46', leg: '#1f2937', shoe: '#000', hand: '#d9a27c' },
    terror: { pix: 'terror', suit: '#4d5b2a', arm: '#4d5b2a', leg: '#3f3f1f', shoe: '#1c1917', hand: '#c68642' }
});
Object.assign(STORY_BG, {
    // Çiftlik evinin bahar bahçesi: çimen, çiçekler, beyaz çit, ahşap ev
    garden(c, time) {
        storySky(c, ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#e0f2fe']);
        c.fillStyle = '#fde047'; c.fillRect(820, 40, 56, 56);
        // ahşap çiftlik evi
        c.fillStyle = '#92400e'; c.fillRect(560, 230, 320, 210);
        for (let y = 236; y < 440; y += 16) { c.fillStyle = '#a16207'; c.fillRect(560, y, 320, 6); }
        for (let k = 0; k < 6; k++) { c.fillStyle = '#365314'; c.fillRect(548 + k * 24, 230 - k * 18, 344 - k * 48, 18); }
        c.fillStyle = '#e0f2fe'; [600, 780].forEach(x => { c.fillRect(x, 280, 60, 50); c.fillStyle = '#f8fafc'; c.fillRect(x + 28, 280, 4, 50); c.fillStyle = '#e0f2fe'; });
        c.fillStyle = '#78350f'; c.fillRect(690, 340, 60, 100);
        c.fillStyle = '#14532d'; c.font = 'bold 13px monospace'; c.textAlign = 'center'; c.fillText('GOLDEN GENERATION', 720, 262);
        // ağaçlar
        [[60, 250], [200, 270], [420, 240]].forEach(([x, y]) => { c.fillStyle = '#6b4423'; c.fillRect(x + 28, y + 60, 16, 140); c.fillStyle = '#4d7c0f'; c.fillRect(x, y, 72, 72); c.fillStyle = '#65a30d'; c.fillRect(x + 8, y - 16, 56, 24); c.fillStyle = '#ef4444'; c.fillRect(x + 14, y + 20, 8, 8); c.fillRect(x + 46, y + 40, 8, 8); });
        storyGround(c, '#4d7c0f', '#3f6212');
        // beyaz çit ve çiçekler
        for (let x = 0; x < STORY_W; x += 40) { c.fillStyle = '#f8fafc'; c.fillRect(x + 6, 396, 10, 44); }
        c.fillStyle = '#f8fafc'; c.fillRect(0, 408, STORY_W, 6); c.fillRect(0, 426, STORY_W, 6);
        for (let i = 0; i < 40; i++) { c.fillStyle = ['#f43f5e', '#facc15', '#a855f7', '#f8fafc'][i % 4]; c.fillRect((storyHash(i) * STORY_W) | 0, 446 + ((storyHash(i + 9) * 60) | 0), 8, 8); }
    },
    // Dağ: karlı zirveler, kayalıklar, mağara, kamp çadırları
    mountain(c, time) {
        storySky(c, ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe']);
        const peak = (x, w, h, col) => { for (let k = 0; k * 16 < h; k++) { const ww = w * (1 - k * 16 / h); c.fillStyle = k * 16 > h * 0.72 ? '#f8fafc' : col; c.fillRect(x + (w - ww) / 2, STORY_GROUND - 40 - k * 16, ww, 16); } };
        peak(-60, 420, 300, '#64748b'); peak(260, 520, 360, '#475569'); peak(640, 420, 280, '#64748b');
        // kayalıklar ve mağara
        for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#78716c' : '#57534e'; c.fillRect(i * 84, STORY_GROUND - 70 - (i % 3) * 18, 80, 70 + (i % 3) * 18); }
        c.fillStyle = '#0c0a09'; c.fillRect(420, STORY_GROUND - 64, 90, 64); c.fillRect(434, STORY_GROUND - 78, 62, 14);
        // çadırlar ve kamp ateşi
        [[120, '#4d5b2a'], [700, '#57534e']].forEach(([x, col]) => { for (let k = 0; k < 5; k++) { c.fillStyle = col; c.fillRect(x + k * 12, STORY_GROUND - 20 - k * 16, 120 - k * 24, 16); } c.fillStyle = '#1c1917'; c.fillRect(x + 48, STORY_GROUND - 34, 24, 34); });
        const f = Math.sin(time * 12) > 0;
        c.fillStyle = '#78350f'; c.fillRect(580, STORY_GROUND - 8, 40, 8);
        c.fillStyle = f ? '#f97316' : '#facc15'; c.fillRect(588, STORY_GROUND - 28, 24, 20); c.fillStyle = '#fde047'; c.fillRect(596, STORY_GROUND - (f ? 40 : 34), 8, 12);
        storyGround(c, '#78716c', '#57534e');
    }
});
// 8. bölüm: abiler
STORIES[8] = [
    { bg: 'garden', say: { key: 's8a' }, actors: [{ who: 'feto', x: 600, dir: -1 }, { who: 'abi', x: 360, dir: 1 }, { who: 'takke', x: 470, dir: 1 }] },
    { bg: 'garden', say: { who: 'feto', key: 's8b' }, actors: [{ who: 'feto', x: 600, dir: -1, talk: true, wave: true }, { who: 'abi', x: 360, dir: 1 }, { who: 'takke', x: 470, dir: 1, jump: true }] },
    { bg: 'garden', say: { who: 'abi', key: 's8d' }, actors: [{ who: 'abi', x: 420, dir: -1, talk: true }, { who: 'takke', x: 540, dir: -1, jump: true }, { who: 'abi', x: 660, dir: -1 }] },
    { bg: 'garden', props: ['rain'], say: { who: 'recep', key: 's8c' },
      actors: [{ who: 'recep', x: -100, to: 260, dir: 1, talk: true }, { who: 'abi', x: 480, dir: -1, jump: true }, { who: 'feto', x: 640, dir: -1, jump: true }] },
    { bg: 'card', card: { title: 'm8t', text: 'm8' } }
];
// 9. bölüm: Selo dağa kaçar
STORIES[9] = [
    STORIES[9][0], STORIES[9][1], STORIES[9][2],
    { bg: 'mountain', say: { key: 's9m' }, actors: [{ who: 'selo', x: 480, dir: 1, wave: true }, { who: 'terror', x: 620, dir: -1 }, { who: 'terror', x: 740, dir: -1, jump: true }] },
    { bg: 'mountain', say: { who: 'recep', key: 's9n' }, actors: [{ who: 'recep', x: -100, to: 240, dir: 1, talk: true }, { who: 'terror', x: 620, dir: -1, jump: true }, { who: 'selo', x: 760, dir: -1 }] },
    { bg: 'card', card: { title: 'm9t', text: 'm9' } }
];
const STORY3D_TEXT = {
    tr: { abi: 'ABİ', takke: 'ABİ', terror: 'TERÖRİST',
          s8a: 'Pensilvanya, Saylorsburg. FETÖ çiftlik evinin bahçesinde; etrafı abilerle dolu...',
          s8d: 'Hocaefendi rahatsız edilmesin! Kitap, tesbih, takke... hepsi hazır!',
          m8: 'Çiftlik evinin bahçesinde abileri geç: kitap atarlar, tesbih boynuna asılıp patlar, takke bomba gibi düşer! Sonra FETÖ\'yle son kez karşılaş!',
          s9m: 'Selo dağa çıktı! Yollar keleşli teröristlerle, bombacılarla ve mayınlarla dolu...',
          s9n: 'Dağ taş demem, gelirim! Mayınlara basmadan, canlı bombaya yakalanmadan!',
          m9t: 'GÖREV 9: DAĞDA SELO', m9: 'Keleşliler barikatın arkasından kalkıp ateş eder, bombacılar çukurdan bomba atar, canlı bombalar bağırarak koşar: yaklaşmadan durdur! Mayınlar bip bip öter: hemen uzaklaş! Sonra SELO\'yu yen ve hücreye tık!' },
    en: { abi: 'ABI', takke: 'ABI', terror: 'TERRORIST',
          s8a: 'Saylorsburg, Pennsylvania. FETÖ is in the farmhouse garden, surrounded by his "abis"...',
          s8d: 'Do not disturb Hocaefendi! Books, prayer beads, skullcaps... all ready!',
          m8: 'Get past the abis in the farmhouse garden: they throw books, prayer beads hang on your neck and explode, skullcaps fall like bombs! Then face FETÖ one last time!',
          s9m: 'Selo fled to the mountains! The paths are full of armed terrorists, bombers and mines...',
          s9n: 'Mountains won\'t stop me! No stepping on mines, no getting caught by a suicide bomber!',
          m9t: 'MISSION 9: SELO IN THE MOUNTAINS', m9: 'Riflemen pop up from barricades and fire, bombers throw from foxholes, suicide bombers run screaming: stop them before they reach you! Mines beep: get away fast! Then beat SELO and lock him up!' },
    fr: { abi: 'ABI', takke: 'ABI', terror: 'TERRORISTE',
          s8a: 'Saylorsburg, Pennsylvanie. FETÖ est dans le jardin de la ferme, entouré de ses « abis »...',
          s8d: 'Ne dérangez pas Hocaefendi ! Livres, chapelets, calottes... tout est prêt !',
          m8: 'Passe les abis dans le jardin : ils lancent des livres, le chapelet s\'accroche à ton cou et explose, la calotte tombe comme une bombe ! Puis affronte FETÖ une dernière fois !',
          s9m: 'Selo a fui dans les montagnes ! Les chemins sont pleins de terroristes armés, de poseurs de bombes et de mines...',
          s9n: 'Les montagnes ne m\'arrêteront pas ! Pas de mine, pas de kamikaze !',
          m9t: 'MISSION 9 : SELO DANS LA MONTAGNE', m9: 'Les tireurs surgissent des barricades, les poseurs de bombes lancent depuis leurs trous, les kamikazes courent en criant : arrête-les avant ! Les mines bipent : éloigne-toi ! Puis bats SELO et enferme-le !' },
    nl: { abi: 'ABI', takke: 'ABI', terror: 'TERRORIST',
          s8a: 'Saylorsburg, Pennsylvania. FETÖ is in de tuin van de boerderij, omringd door zijn "abi\'s"...',
          s8d: 'Stoor Hocaefendi niet! Boeken, gebedskralen, keppeltjes... alles klaar!',
          m8: 'Kom langs de abi\'s in de tuin: ze gooien boeken, gebedskralen hangen om je nek en ontploffen, keppeltjes vallen als bommen! Versla dan FETÖ voor de laatste keer!',
          s9m: 'Selo is de bergen in gevlucht! De paden zitten vol gewapende terroristen, bommengooiers en mijnen...',
          s9n: 'Geen berg houdt mij tegen! Niet op mijnen stappen, geen zelfmoordterrorist!',
          m9t: 'MISSIE 9: SELO IN DE BERGEN', m9: 'Schutters duiken op achter barricades, bommengooiers gooien vanuit kuilen, zelfmoordterroristen rennen schreeuwend: stop ze op tijd! Mijnen piepen: snel weg! Versla dan SELO en sluit hem op!' },
    de: { abi: 'ABI', takke: 'ABI', terror: 'TERRORIST',
          s8a: 'Saylorsburg, Pennsylvania. FETÖ ist im Garten des Farmhauses, umringt von seinen „Abis"...',
          s8d: 'Stört Hocaefendi nicht! Bücher, Gebetsketten, Kappen... alles bereit!',
          m8: 'Komm an den Abis im Garten vorbei: Sie werfen Bücher, Gebetsketten hängen sich um deinen Hals und explodieren, Kappen fallen wie Bomben! Dann stell dich FETÖ ein letztes Mal!',
          s9m: 'Selo ist in die Berge geflohen! Die Wege sind voller bewaffneter Terroristen, Bombenwerfer und Minen...',
          s9n: 'Kein Berg hält mich auf! Nicht auf Minen treten, keinen Selbstmordattentäter heranlassen!',
          m9t: 'MISSION 9: SELO IN DEN BERGEN', m9: 'Schützen tauchen hinter Barrikaden auf, Bombenwerfer werfen aus Erdlöchern, Selbstmordattentäter rennen schreiend heran: halte sie vorher auf! Minen piepen: schnell weg! Dann besiege SELO und sperr ihn ein!' },
    ru: { abi: 'АБИ', takke: 'АБИ', terror: 'ТЕРРОРИСТ',
          s8a: 'Сейлорсберг, Пенсильвания. ФЕТÖ в саду фермы, вокруг него «аби»...',
          s8d: 'Не беспокоить Ходжаэфенди! Книги, чётки, тюбетейки... всё готово!',
          m8: 'Пройди аби в саду: они кидают книги, чётки повисают на шее и взрываются, тюбетейки падают как бомбы! Потом сразись с ФЕТÖ в последний раз!',
          s9m: 'Село сбежал в горы! На тропах террористы с автоматами, гранатомётчики и мины...',
          s9n: 'Горы меня не остановят! Не наступать на мины, не подпускать смертника!',
          m9t: 'МИССИЯ 9: СЕЛО В ГОРАХ', m9: 'Стрелки встают из-за баррикад, гранатомётчики бросают из окопов, смертники бегут с криком: останови их заранее! Мины пищат: скорее прочь! Потом победи СЕЛО и запри его!' }
};
for (const L in STORY3D_TEXT) if (STORY_TEXT[L]) Object.assign(STORY_TEXT[L], STORY3D_TEXT[L]);
