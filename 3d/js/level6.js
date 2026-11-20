// HIRHIZ 3D — 6. BÖLÜM: DARBE PLANINI ENİŞTEDEN ÖĞREN! (uçuş; bütün oyun flight.js'te)
import { makeFlightMode } from './flight.js?v=28';

const mode = makeFlightMode();
export const LEVEL6 = {
    id: 6, name: 'UÇUŞ: İSTANBUL\'A', menuTitle: '6 · UÇUŞ',
    desc: 'Uçakla İstanbul\'a uç! Darbeci jetlere rüşvet at, füzeleri kalkanla durdur, TANKER UÇAK\'ı düşür!',
    mission: 'DARBECİ JETLERİ RÜŞVETLE TESLİM AL!',
    music: '../intro_title.mp3',
    sky: ['#020617', '#1e1b4b', '#4c1d95'], fog: '#2e1f63', hemi: ['#c7d2fe', '#1e1b4b', 1.3], sun: ['#e0e7ff', 1.3],
    target: 12, ammo: 'bribe', ammoName: 'RÜŞVET',
    collect: { kind: 'bag', icon: '💰', name: 'Kul hakkı torbası', word: 'KUL HAKKI!' },
    mode, hint: mode.hint,
    outro: () => mode.outro(),
    wonTitle: 'BÖLÜM 6 TAMAM!', wonNote: 'Uçak İstanbul\'a indi! Sıra BYLOCK listelerinde.'
};
