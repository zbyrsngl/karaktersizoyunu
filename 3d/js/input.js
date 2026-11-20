// HIRHIZ 3D: klavye, fare ve dokunmatik giriş
// Klavye: WASD/oklar yürü, Shift hızlı koş, Boşluk zıpla, F/J balyoz, R/G el bombası, E/K kalkan (basılı tut), Enter çay at, P/Esc duraklat
// Fare: oyuna tıklayınca imleç kilitlenir, fareyle kamera ve nişan; sol tık ateş (çay / rüşvet; balyoz savurmaz), sağ tık kalkan
// Telefon: ekranın solunda parmak nereye değerse orada oyun kolu açılır; sağda sürükleyince kamera döner; düğmeler sağ altta
export const input = {
    mx: 0, my: 0,                 // hareket (-1..1), my +1 = ileri
    camDX: 0, camDY: 0,           // bu karedeki kamera dönüşü (piksel)
    jumpPressed: false, jumpHeld: false,
    hammerPressed: false, throwPressed: false, grenadePressed: false, gorillaPressed: false, shieldHeld: false, sprint: false,
    pausePressed: false, restartPressed: false,
    touch: false, camTouched: 0   // son kamera dokunuşundan beri geçen süre (otomatik takip için)
};
const keys = new Set();
const KEYMAP = { jump: ['Space'], hammer: ['KeyF', 'KeyJ'], shield: ['KeyE', 'KeyK'], throw: ['Enter'], grenade: ['KeyR'], gorilla: ['KeyG'], sprint: ['ShiftLeft', 'ShiftRight'] };
const isKey = (k, a) => KEYMAP[a].includes(k);

let canvasEl = null, onAnyInput = null;
export function initInput(canvas, anyInput) {
    canvasEl = canvas; onAnyInput = anyInput;
    addEventListener('keydown', e => {
        if (e.repeat) { if (!['Space'].includes(e.code)) return; }
        keys.add(e.code);
        if (isKey(e.code, 'jump') && !e.repeat) { input.jumpPressed = true; input.jumpHeld = true; }
        if (isKey(e.code, 'hammer')) input.hammerPressed = true;
        if (isKey(e.code, 'throw')) input.throwPressed = true;
        if (isKey(e.code, 'grenade') && !e.repeat) input.grenadePressed = true;
        if (isKey(e.code, 'gorilla') && !e.repeat) input.gorillaPressed = true;
        if (e.code === 'KeyP' || e.code === 'Escape') input.pausePressed = true;
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => {
        keys.delete(e.code);
        if (isKey(e.code, 'jump')) input.jumpHeld = false;
    });
    addEventListener('blur', () => { keys.clear(); input.jumpHeld = false; });

    // Fare: imleç kilidi
    canvas.addEventListener('mousedown', e => {
        if (input.touch) return;
        if (document.pointerLockElement !== canvas) { if (anyInput && anyInput()) canvas.requestPointerLock?.(); return; }
        if (e.button === 0) input.throwPressed = true;   // sol tık: çay at (nişanlı)
        if (e.button === 2) mouseShield = true;
    });
    addEventListener('mouseup', e => { if (e.button === 2) mouseShield = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => {
        if (document.pointerLockElement === canvas) { input.camDX += e.movementX; input.camDY += e.movementY; }
    });

    initTouch(canvas);
}
let mouseShield = false;
export function releasePointer() { if (document.pointerLockElement) document.exitPointerLock?.(); }

// --- DOKUNMATİK ---
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, look = { id: null, x: 0, y: 0 };
let touchShield = false;
function initTouch(canvas) {
    const base = document.getElementById('joy'), knob = document.getElementById('joy-knob');
    const R = 60;
    canvas.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        setTouch();
        if (e.clientX < innerWidth * 0.42 && joy.id === null) {
            joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
            base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.classList.add('on');
            knob.style.transform = 'translate(-50%,-50%)';
        } else if (look.id === null) { look.id = e.pointerId; look.x = e.clientX; look.y = e.clientY; }
        canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
        if (e.pointerId === joy.id) {
            let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
            const d = Math.hypot(dx, dy);
            if (d > R) { dx *= R / d; dy *= R / d; }
            joy.x = dx / R; joy.y = -dy / R;
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        } else if (e.pointerId === look.id) {
            input.camDX += (e.clientX - look.x) * 1.6; input.camDY += (e.clientY - look.y) * 1.6;
            look.x = e.clientX; look.y = e.clientY; input.camTouched = 0;
        }
    });
    const end = e => {
        if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; base.classList.remove('on'); }
        if (e.pointerId === look.id) look.id = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    // Düğmeler
    const btn = (id, down, up) => {
        const el = document.getElementById(id);
        el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); setTouch(); el.classList.add('down'); down(); });
        const u = e => { el.classList.remove('down'); up && up(); };
        el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('pointerleave', u);
    };
    // Telefonda kısa dokunuş da yüksek zıplasın: düğme en az 0.22 sn basılı sayılır
    let jumpDownAt = 0, jumpUpTimer = null;
    btn('b-jump', () => { clearTimeout(jumpUpTimer); jumpDownAt = performance.now(); input.jumpPressed = true; input.jumpHeld = true; },
        () => { clearTimeout(jumpUpTimer); jumpUpTimer = setTimeout(() => { input.jumpHeld = false; }, Math.max(0, 220 - (performance.now() - jumpDownAt))); });
    btn('b-hammer', () => { input.hammerPressed = true; });
    btn('b-bribe', () => { input.throwPressed = true; });
    btn('b-grenade', () => { input.grenadePressed = true; });
    btn('b-gorilla', () => { input.gorillaPressed = true; });
    btn('b-shield', () => { touchShield = true; }, () => { touchShield = false; });
}
function setTouch() {
    if (input.touch) return;
    input.touch = true; document.body.classList.add('touch');
}

// Her sabit adımın başında çağrılır: tuşlardan hareket vektörü
export function pollInput() {
    let x = 0, y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    if (joy.id !== null) {
        const d = Math.hypot(joy.x, joy.y);
        if (d > 0.18) { const k = Math.min(1, (d - 0.18) / 0.72) / d; x += joy.x * k; y += joy.y * k; }
    }
    const d = Math.hypot(x, y);
    if (d > 1) { x /= d; y /= d; }
    input.mx = x; input.my = y;
    input.shieldHeld = KEYMAP.shield.some(k => keys.has(k)) || mouseShield || touchShield;
    input.sprint = KEYMAP.sprint.some(k => keys.has(k));
}
// Basışlar sabit adımda kullanılınca silinir
export function consumePresses() {
    input.jumpPressed = input.hammerPressed = input.throwPressed = input.grenadePressed = input.gorillaPressed = false;
}
export function clearAll() {
    consumePresses(); input.pausePressed = input.restartPressed = false;
    input.camDX = input.camDY = 0; mouseShield = touchShield = false;
}
