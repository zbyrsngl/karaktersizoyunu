// HIRHIZ 3D — 7. BÖLÜM: BYLOCK (şifre kırma bulmacası; bütün oyun puzzle.js'te)
import { makePuzzleMode } from './puzzle.js?v=29';

const mode = makePuzzleMode();
export const LEVEL7 = {
    id: 7, name: 'BYLOCK ŞİFRESİ', menuTitle: '7 · BYLOCK',
    desc: 'ByLock\'un 4 haneli şifresini kır, listeler çıksın! Yeşil doğru yer, sarı var ama yeri yanlış.',
    mission: 'BYLOCK ŞİFRESİNİ KIR!',
    music: '../chiptune_level3.mp3',
    sky: ['#020617', '#0f172a', '#1e293b'], fog: '#0f172a', hemi: ['#e0e7ff', '#334155', 1.4], sun: ['#fef3c7', 0.8],
    target: 0, ammo: 'bribe', ammoName: 'RÜŞVET',
    collect: { kind: 'bag', icon: '🔢', name: 'Tahmin', word: '' },
    mode, hint: mode.hint,
    stars: () => mode.stars(), wonDetail: () => mode.detail(),
    wonTitle: 'BÖLÜM 7 TAMAM!', wonNote: 'Şifre çözüldü, listeler hazır! Sıra Pensilvanya\'da.'
};
