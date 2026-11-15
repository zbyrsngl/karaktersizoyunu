// Piksel efektleri: pixelfx (MIT, https://github.com/patch-gg/pixelfx) kütüphanesinden hazır resim dizileri.
// Resimler resimler/fx/<ad>.png, kare bilgileri js/fx_sheets.js (FX_SHEETS). Efektler dünyada bir noktaya konur,
// oyunla aynı sabit adımda (1/60 s) ilerler, vuruş donmasında durur ve köşeli piksel olarak büyütülüp çizilir.

const FX_IMGS = {};
for (const name in FX_SHEETS) { const img = new Image(); img.src = `resimler/fx/${name}.png?v=40`; FX_IMGS[name] = img; }

const FX_MAX = 24;   // aynı anda en fazla efekt (telefon performansı)
let fxList = [];

// spawnFx('poof', x, y, 3): x,y efektin dayanak noktası (çoğunda ayak/zemin), scale büyütme, flip sola bakar, delay saniye sonra başlar
function spawnFx(name, x, y, scale = 2, flip = false, delay = 0) {
    if (!FX_SHEETS[name]) return;
    if (fxList.length >= FX_MAX) fxList.shift();
    fxList.push({ name, x, y, scale, flip, t: -delay });
}
function clearFx() { fxList = []; }

function updateFx() {
    for (const f of fxList) f.t += 1 / 60;
    fxList = fxList.filter(f => Math.floor(f.t * FX_SHEETS[f.name].fps) < FX_SHEETS[f.name].n);
}

// Dünya koordinatında çizilir (kamera dönüşümü içindeyken çağrılır)
function drawFx(ctx) {
    if (!fxList.length) return;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;   // köşeli piksel kalsın
    for (const f of fxList) {
        const S = FX_SHEETS[f.name], img = FX_IMGS[f.name];
        if (f.t < 0 || !img.complete || !img.naturalWidth) continue;
        const i = Math.floor(f.t * S.fps), sx = (i % S.cols) * S.w, sy = Math.floor(i / S.cols) * S.h;
        const k = f.scale, dw = S.w * k, dh = S.h * k;
        // Ekran dışındaysa çizme
        if (f.x + dw < camX - 50 || f.x - dw > camX + width + 50) continue;
        const dx = Math.round(f.x - (f.flip ? S.w - S.px : S.px) * k), dy = Math.round(f.y - S.py * k);
        if (f.flip) {
            ctx.save(); ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
            ctx.drawImage(img, sx, sy, S.w, S.h, 0, 0, dw, dh);
            ctx.restore();
        } else ctx.drawImage(img, sx, sy, S.w, S.h, dx, dy, dw, dh);
    }
    ctx.imageSmoothingEnabled = smooth;
}
