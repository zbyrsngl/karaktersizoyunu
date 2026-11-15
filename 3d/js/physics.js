// HIRHIZ 3D: basit kutu çarpışması (oyuncu dikey bir kutu, dünya eksen hizalı kutular)
// Eksen eksen çözülür: önce X, sonra Z, sonra Y. Kenara değen kafa yana kaydırılır (köşe düzeltmesi).
const EPS = 0.001;
export const CORNER_NUDGE = 0.18;

function overlaps(px, py, pz, r, h, a) {
    return px + r > a.min.x && px - r < a.max.x && pz + r > a.min.z && pz - r < a.max.z && py + h > a.min.y && py < a.max.y;
}

// body: { pos, vel, r, h }; döner: { grounded, ground (kutu), headHit (kutu), wallHit }
export function moveBody(body, dt, solids) {
    const p = body.pos, v = body.vel, r = body.r, h = body.h;
    const res = { grounded: false, ground: null, headHit: null, wallHit: false };
    // Yatay: X
    p.x += v.x * dt;
    for (const a of solids) {
        if (!a.active || !overlaps(p.x, p.y, p.z, r, h, a)) continue;
        if (p.y >= a.max.y - 0.25 && v.y <= 0) { p.y = a.max.y; continue; }   // küçük basamak: üstüne çık
        if (v.x > 0) p.x = a.min.x - r - EPS; else if (v.x < 0) p.x = a.max.x + r + EPS;
        else p.x = (p.x < (a.min.x + a.max.x) / 2) ? a.min.x - r - EPS : a.max.x + r + EPS;
        v.x = 0; res.wallHit = true;
    }
    // Yatay: Z
    p.z += v.z * dt;
    for (const a of solids) {
        if (!a.active || !overlaps(p.x, p.y, p.z, r, h, a)) continue;
        if (p.y >= a.max.y - 0.25 && v.y <= 0) { p.y = a.max.y; continue; }
        if (v.z > 0) p.z = a.min.z - r - EPS; else if (v.z < 0) p.z = a.max.z + r + EPS;
        else p.z = (p.z < (a.min.z + a.max.z) / 2) ? a.min.z - r - EPS : a.max.z + r + EPS;
        v.z = 0; res.wallHit = true;
    }
    // Dikey
    const oldY = p.y;
    p.y += v.y * dt;
    for (const a of solids) {
        if (!a.active || !overlaps(p.x, p.y, p.z, r, h, a)) continue;
        if (v.y <= 0 && oldY >= a.max.y - 0.05) {   // üstüne indi
            p.y = a.max.y; v.y = 0; res.grounded = true; res.ground = a;
        } else if (v.y > 0 && oldY + h <= a.min.y + 0.05) {
            // Kafa çarptı; kenara az değiyorsa yana kaydır
            const dx = Math.min(p.x + r - a.min.x, a.max.x - (p.x - r));
            const dz = Math.min(p.z + r - a.min.z, a.max.z - (p.z - r));
            if (a.type !== 'brick' && dx < CORNER_NUDGE) { p.x += (p.x < (a.min.x + a.max.x) / 2) ? -dx - EPS : dx + EPS; continue; }
            if (a.type !== 'brick' && dz < CORNER_NUDGE) { p.z += (p.z < (a.min.z + a.max.z) / 2) ? -dz - EPS : dz + EPS; continue; }
            p.y = a.min.y - h - EPS; v.y = 0; res.headHit = a;
        }
    }
    // Yere değiyor mu (hareketsiz dururken de)
    if (!res.grounded && v.y <= 0) {
        for (const a of solids) {
            if (!a.active) continue;
            if (Math.abs(p.y - a.max.y) < 0.02 && p.x + r > a.min.x && p.x - r < a.max.x && p.z + r > a.min.z && p.z - r < a.max.z) {
                res.grounded = true; res.ground = a; p.y = a.max.y; break;
            }
        }
    }
    return res;
}

// (x,z) noktasının altındaki en yüksek yüzey (yoksa -Infinity); yalnızca belirtilen yükseklikten aşağısı
export function groundAt(solids, x, z, below = 100, r = 0) {
    let best = -Infinity;
    for (const a of solids) {
        if (!a.active || a.type === 'wall') continue;
        if (x + r > a.min.x && x - r < a.max.x && z + r > a.min.z && z - r < a.max.z && a.max.y <= below && a.max.y > best) best = a.max.y;
    }
    return best;
}
