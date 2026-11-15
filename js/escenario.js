'use strict';
// Concierto de rock dibujado por código: telón, estructura con focos, láseres, batería,
// amplificadores, humo, columnas de fuego y público saltando con los cuernos arriba.
const Escenario = (() => {
  const brasas = [], chispas = [], fuego = [], humo = [];
  let ultimo = null, rayo = null, proxRayo = 5, flash = 0, proxPiro = 3, publico = null, tamPublico = '';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PALETA = ['255,40,40', '255,140,0', '190,70,255', '255,220,140'];

  function telon(g, W, H, t) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#0a0000'); gr.addColorStop(0.55, '#2b0606'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save();
    g.globalAlpha = 0.09 + 0.04 * Math.sin(t * 2);
    g.fillStyle = '#ef4444';
    g.font = `${Math.round(H * 0.19)}px Impact, Arial Black, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ALONSO HERO', W / 2, H * 0.3);
    g.restore();
  }

  function haces(g, W, H, t, int) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const x = W * (i + 0.5) / 8, y = H * 0.11;
      const ang = Math.sin(t * 0.7 + i * 0.9) * 0.5;
      const col = PALETA[(i + Math.floor(t / 4)) % 4];
      const largo = H * 1.1, ancho = W * 0.05;
      const ex = x + Math.sin(ang) * largo, ey = y + Math.cos(ang) * largo;
      const px = Math.cos(ang) * ancho, py = -Math.sin(ang) * ancho;
      const gr = g.createLinearGradient(x, y, ex, ey);
      gr.addColorStop(0, `rgba(${col},${0.3 * int})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.lineTo(ex + px, ey + py); g.lineTo(ex - px, ey - py); g.closePath(); g.fill();
    }
    g.restore();
  }

  function estructura(g, W, H, t) {
    const y = H * 0.05, h = H * 0.035;
    g.strokeStyle = '#71717a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.moveTo(0, y + h); g.lineTo(W, y + h);
    for (let x = 0, k = 0; x < W; x += h, k++) { g.moveTo(x, k % 2 ? y : y + h); g.lineTo(x + h, k % 2 ? y + h : y); }
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const x = W * (i + 0.5) / 8;
      g.fillStyle = '#18181b'; g.fillRect(x - 11, y + h, 22, H * 0.035);
      g.fillStyle = `rgb(${PALETA[(i + Math.floor(t / 4)) % 4]})`;
      g.beginPath(); g.arc(x, y + h + H * 0.03, 6, 0, Math.PI * 2); g.fill();
    }
  }

  function laseres(g, W, H, t, int) {
    if (int < 0.5) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) {
      const ang = -Math.PI / 2 + Math.sin(t * 1.1 + k * 1.3) * 1.2;
      g.strokeStyle = k % 2 ? 'rgba(80,255,120,0.4)' : 'rgba(255,60,60,0.4)';
      g.beginPath(); g.moveTo(W / 2, H * 0.5); g.lineTo(W / 2 + Math.cos(ang) * W, H * 0.5 + Math.sin(ang) * W); g.stroke();
    }
    g.restore();
  }

  function bafle(g, x, y, w, h, pulso) {
    g.fillStyle = '#0c0c0c'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#3f3f46'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    const r = Math.min(w, h) * 0.2 * (1 + pulso * 0.08);
    for (const [fx, fy] of [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]]) {
      const cx = x + w * fx, cy = y + h * fy;
      const gr = g.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      gr.addColorStop(0, '#52525b'); gr.addColorStop(0.25, '#18181b'); gr.addColorStop(0.85, '#27272a'); gr.addColorStop(1, '#09090b');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    }
  }

  function escenario(g, W, H, pulso) {
    const y0 = H * 0.6, y1 = H * 0.76;
    // Paredes de amplificadores
    const w = Math.min(W * 0.09, H * 0.15);
    for (const x of [W * 0.03, W * 0.03 + w + 4, W * 0.97 - w, W * 0.97 - 2 * w - 4]) {
      for (let k = 0; k < 3; k++) bafle(g, x, y0 - w * (k + 1), w, w - 3, pulso);
    }
    // Piso
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, '#1c1917'); gr.addColorStop(1, '#0c0a09');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(W * 0.1, y0); g.lineTo(W * 0.9, y0); g.lineTo(W, y1); g.lineTo(0, y1); g.closePath(); g.fill();
    g.strokeStyle = '#52525b'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, y1); g.lineTo(W, y1); g.stroke();
    bateria(g, W, H, y0, pulso);
  }

  function bateria(g, W, H, base, pulso) {
    const cx = W / 2, s = Math.min(W, H * 1.6) / 1000;
    g.fillStyle = '#27272a'; g.fillRect(cx - 190 * s, base - 30 * s, 380 * s, 30 * s);
    const piso = base - 30 * s;
    // Soportes
    g.strokeStyle = '#a1a1aa'; g.lineWidth = 3 * s;
    const platos = [[-215, 235, 60], [225, 255, 64], [-150, 150, 40]];
    for (const [dx, alto] of platos) { g.beginPath(); g.moveTo(cx + dx * s, piso); g.lineTo(cx + dx * s, piso - alto * s); g.stroke(); }
    // Bombo con el logo
    const r = 78 * s * (1 + pulso * 0.05);
    g.beginPath(); g.arc(cx, piso - 78 * s, r, 0, Math.PI * 2);
    const parche = g.createRadialGradient(cx - 20 * s, piso - 100 * s, 5 * s, cx, piso - 78 * s, r);
    parche.addColorStop(0, '#ffffff'); parche.addColorStop(1, '#a8a29e');
    g.fillStyle = parche; g.fill();
    g.lineWidth = 12 * s; g.strokeStyle = '#b91c1c'; g.stroke();
    g.fillStyle = '#18181b'; g.font = `${Math.round(54 * s)}px Impact, Arial Black, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ALONSO', cx, piso - 92 * s);
    g.fillStyle = '#dc2626'; g.font = `${Math.round(44 * s)}px Impact, Arial Black, sans-serif`;
    g.fillText('HERO', cx, piso - 52 * s);
    // Toms, caja y timbal
    g.lineWidth = 3 * s;
    for (const [dx, dy, rx, ry] of [[-62, 190, 34, 24], [62, 190, 34, 24], [-140, 120, 40, 13], [160, 70, 44, 52]]) {
      g.beginPath(); g.ellipse(cx + dx * s, piso - dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
      g.fillStyle = '#991b1b'; g.fill(); g.strokeStyle = '#e4e4e7'; g.stroke();
    }
    // Platos (brillan con el ritmo)
    for (const [dx, alto, ancho] of platos) {
      g.beginPath(); g.ellipse(cx + dx * s, piso - alto * s, ancho * s, 8 * s, dx > 0 ? -0.15 : 0.15, 0, Math.PI * 2);
      g.fillStyle = pulso > 0.5 ? '#fde68a' : '#ca8a04'; g.fill();
    }
  }

  function dibujarHumo(g, W, H, dt) {
    while (humo.length < 8) humo.push({ x: rnd(0, W), y: H * rnd(0.55, 0.72), r: rnd(0.12, 0.25), v: rnd(-15, 15) });
    g.save();
    for (const h of humo) {
      h.x += h.v * dt;
      if (h.x < -W * 0.3) h.x = W * 1.2; if (h.x > W * 1.3) h.x = -W * 0.2;
      const r = h.r * W, gr = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, r);
      gr.addColorStop(0, 'rgba(200,180,190,0.09)'); gr.addColorStop(1, 'rgba(200,180,190,0)');
      g.fillStyle = gr; g.fillRect(h.x - r, h.y - r, r * 2, r * 2);
    }
    g.restore();
  }

  function piro() {
    for (const lado of [0.2, 0.8]) for (let i = 0; i < 60; i++) {
      fuego.push({ lado, x: rnd(-0.012, 0.012), y: 0, vy: rnd(0.55, 1.1), vida: rnd(0.5, 1), max: 1, r: rnd(0.012, 0.03) });
    }
  }
  function dibujarFuego(g, W, H, dt) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = fuego.length - 1; i >= 0; i--) {
      const f = fuego[i];
      f.vida -= dt;
      if (f.vida <= 0) { fuego.splice(i, 1); continue; }
      f.y += f.vy * dt; f.x += rnd(-0.01, 0.01) * dt * 10;
      const x = (f.lado + f.x) * W, y = H * 0.74 - f.y * H * 0.5, r = f.r * H * (0.6 + f.vida);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(255,240,180,${Math.min(1, f.vida)})`);
      gr.addColorStop(0.4, `rgba(255,120,20,${Math.min(0.8, f.vida)})`);
      gr.addColorStop(1, 'rgba(200,20,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.restore();
  }

  function crearPublico(W, H) {
    publico = [];
    for (let fila = 0; fila < 3; fila++) {
      const hr = H * (0.02 + fila * 0.007), paso = hr * 2.6;
      for (let x = rnd(0, paso); x < W + paso; x += paso * rnd(0.8, 1.2)) {
        const brazos = Math.random();
        publico.push({
          fila, x, y: H * (0.84 + fila * 0.055), hr, ph: rnd(0, 6), salta: rnd(0.5, 1.3),
          izq: brazos < 0.45, der: brazos > 0.3, cuernos: Math.random() < 0.7, mechero: fila < 2 && Math.random() < 0.12,
        });
      }
    }
  }
  function dibujarPublico(g, W, H, t, pulso) {
    if (tamPublico !== `${W}x${H}`) { crearPublico(W, H); tamPublico = `${W}x${H}`; }
    const colores = ['#1a0606', '#0d0303', '#000'];
    g.lineCap = 'round';
    for (const p of publico) {
      const bote = (Math.sin(t * 6.6 + p.ph) * 0.5 + 0.5) * p.hr * 0.4 + pulso * p.hr * 0.6 * p.salta;
      const y = p.y - bote, hr = p.hr;
      g.fillStyle = colores[p.fila]; g.strokeStyle = colores[p.fila];
      g.beginPath(); g.ellipse(p.x, y + hr * 2.3, hr * 1.9, hr * 1.5, 0, Math.PI, 0); g.fill();
      g.fillRect(p.x - hr * 1.9, y + hr * 2.3, hr * 3.8, H);
      g.beginPath(); g.arc(p.x, y, hr, 0, Math.PI * 2); g.fill();
      g.lineWidth = hr * 0.7;
      for (const lado of [-1, 1]) {
        if ((lado < 0 && !p.izq) || (lado > 0 && !p.der)) continue;
        const hx = p.x + lado * hr * (1.9 + Math.sin(t * 3 + p.ph) * 0.3), hy = y - hr * 2.6;
        g.beginPath(); g.moveTo(p.x + lado * hr * 1.3, y + hr * 1.6); g.lineTo(hx, hy); g.stroke();
        g.beginPath(); g.arc(hx, hy, hr * 0.45, 0, Math.PI * 2); g.fill();
        if (p.cuernos && !p.mechero) {
          g.lineWidth = hr * 0.22;
          g.beginPath(); g.moveTo(hx - hr * 0.25, hy - hr * 0.2); g.lineTo(hx - hr * 0.4, hy - hr * 1.1);
          g.moveTo(hx + hr * 0.25, hy - hr * 0.2); g.lineTo(hx + hr * 0.4, hy - hr * 1.1); g.stroke();
          g.lineWidth = hr * 0.7;
        }
        if (p.mechero && lado > 0) {
          g.save(); g.globalCompositeOperation = 'lighter';
          const gr = g.createRadialGradient(hx, hy - hr * 0.9, 0, hx, hy - hr * 0.9, hr * 0.9);
          gr.addColorStop(0, 'rgba(255,230,150,0.95)'); gr.addColorStop(1, 'rgba(255,120,0,0)');
          g.fillStyle = gr; g.fillRect(hx - hr, hy - hr * 1.8, hr * 2, hr * 2);
          g.restore();
        }
      }
      if (p.fila === 0) { g.strokeStyle = 'rgba(255,90,40,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, y, hr, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    }
  }

  function dibujarBrasas(g, W, H, dt, int) {
    const max = 50 * int;
    while (brasas.length < max) brasas.push({ x: rnd(0, W), y: H * 0.75 + rnd(0, 60), v: rnd(30, 90), r: rnd(1, 3), f: rnd(0, 6) });
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = brasas.length - 1; i >= 0; i--) {
      const b = brasas[i];
      b.y -= b.v * dt; b.x += Math.sin(b.f + b.y * 0.02) * 20 * dt;
      if (b.y < -10 || brasas.length > max + 5) { brasas.splice(i, 1); continue; }
      const a = Math.max(0, Math.min(1, b.y / H + 0.1) * (0.6 + 0.4 * Math.sin(b.f + b.y * 0.1)));
      g.fillStyle = `rgba(255,${(120 + b.r * 30) | 0},40,${a})`;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  function nuevoRayo(W, H) {
    const pts = [];
    let x = rnd(W * 0.2, W * 0.8), y = 0;
    const fin = H * rnd(0.35, 0.6);
    while (y < fin) { pts.push([x, y]); x += rnd(-40, 40); y += rnd(20, 50); }
    pts.push([x, y]);
    rayo = { pts, vida: 0.25 };
    flash = 0.35;
  }
  function dibujarRayo(g, W, H, dt) {
    if (flash > 0) { g.fillStyle = `rgba(220,220,255,${flash * 0.35})`; g.fillRect(0, 0, W, H); flash -= dt; }
    if (!rayo) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(230,235,255,${Math.min(1, rayo.vida * 4)})`;
    g.shadowColor = '#a5b4fc'; g.shadowBlur = 20; g.lineWidth = 3;
    g.beginPath();
    rayo.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
    g.restore();
    rayo.vida -= dt;
    if (rayo.vida <= 0) rayo = null;
  }

  // o: { intensidad 0..1, pulso 0..1 (golpe del ritmo), automatico: rayos y fuego solos }
  function dibujar(g, W, H, t, o = {}) {
    const int = o.intensidad ?? 0.7, pulso = o.pulso ?? Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 0.9)), 8);
    const dt = ultimo === null ? 0 : Math.min(0.1, Math.max(0, t - ultimo));
    ultimo = t;
    telon(g, W, H, t);
    haces(g, W, H, t, int);
    estructura(g, W, H, t);
    escenario(g, W, H, pulso);
    dibujarHumo(g, W, H, dt);
    laseres(g, W, H, t, int);
    if (o.automatico !== false) {
      proxPiro -= dt; if (proxPiro <= 0) { piro(); proxPiro = rnd(6, 10); }
      proxRayo -= dt; if (proxRayo <= 0) { nuevoRayo(W, H); proxRayo = rnd(7, 13); }
    }
    dibujarFuego(g, W, H, dt);
    dibujarPublico(g, W, H, t, pulso);
    dibujarBrasas(g, W, H, dt, int);
    dibujarRayo(g, W, H, dt);
    return dt;
  }

  function chispazo(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = rnd(Math.PI * 1.1, Math.PI * 1.9), v = rnd(150, 420);
      chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: rnd(0.3, 0.6), color });
    }
  }
  function dibujarChispas(g, dt) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineWidth = 2.5;
    for (let i = chispas.length - 1; i >= 0; i--) {
      const c = chispas[i];
      c.vida -= dt;
      if (c.vida <= 0) { chispas.splice(i, 1); continue; }
      c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      g.strokeStyle = c.color; g.globalAlpha = Math.min(1, c.vida * 2.5);
      g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(c.x - c.vx * 0.03, c.y - c.vy * 0.03); g.stroke();
    }
    g.restore();
  }

  return { dibujar, chispazo, dibujarChispas, rayo: nuevoRayo, piro };
})();
