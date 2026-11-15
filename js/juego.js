'use strict';
const COLORES = ['#22c55e', '#ef4444', '#facc15', '#3b82f6', '#f97316'];
const OSCUROS = ['#14532d', '#7f1d1d', '#854d0e', '#1e3a8a', '#9a3412'];
const CLAROS = ['#bbf7d0', '#fecaca', '#fef9c3', '#bfdbfe', '#fed7aa'];
const COLOR_ABIERTA = '#a855f7';
const NOMBRES_DIF = { easy: 'Fácil', medium: 'Normal', hard: 'Difícil', expert: 'Experto' };
const COLOR_MULT = ['#e4e4e7', '#e4e4e7', '#facc15', '#f97316', '#ef4444'];

class Juego {
  constructor(lienzo, audio, datos, dif, opciones = {}) {
    this.lienzo = lienzo; this.g = lienzo.getContext('2d'); this.audio = audio;
    this.titulo = datos.titulo || ''; this.artista = datos.artista || ''; this.dif = dif; this.buffers = datos.buffers;
    this.notas = datos.chart.tracks[dif].map(n => ({ ...n, hit: false, miss: false, holding: false }));
    this.pulsos = datos.chart.beats || [];
    this.ventana = dif === 'easy' ? 0.15 : 0.12;
    this.vista = { easy: 2.3, medium: 2.0, hard: 1.7, expert: 1.4 }[dif];
    this.ajuste = (opciones.ajusteMs || 0) / 1000;
    this.teclas = opciones.teclas || ['A', 'S', 'D', 'F', 'G'];
    this.puntos = 0; this.combo = 0; this.maxCombo = 0; this.aciertos = 0; this.rendimiento = 0.5;
    this.idx = 0; this.idxDibujo = 0; this.ip = 0; this.sosteniendo = []; this.mensaje = null; this.popup = null;
    this.llamas = []; this.vibra = [0, 0, 0, 0, 0];
    this.held = 0; this.flash = 0; this.ultimoT = null; this.estado = 'listo';
    let ultima = 0;
    for (const n of this.notas) ultima = Math.max(ultima, n.time, n.end);
    const durAudio = Math.max(0, ...this.buffers.map(b => b.duration));
    this.duracion = Math.max(ultima + 2, Math.min(durAudio, ultima + 6));
  }

  iniciar() {
    this.salida = this.audio.createGain();
    this.salida.gain.value = 0.85;
    this.salida.connect(this.audio.destination);
    this.t0 = this.audio.currentTime + 2.5;
    this.fuentes = this.buffers.map(b => {
      const s = this.audio.createBufferSource();
      s.buffer = b; s.connect(this.salida); s.start(this.t0);
      return s;
    });
    // Cuenta con las baquetas antes de empezar
    const b = this.pulsos.length > 1 ? this.pulsos[1] - this.pulsos[0] : 0.5;
    for (let k = 1; k <= 4; k++) {
      const t = this.t0 + (this.pulsos[0] || 0) - k * b;
      if (t > this.audio.currentTime + 0.05) this.baqueta(t);
    }
    this.estado = 'jugando';
  }
  baqueta(t) {
    const o = this.audio.createOscillator(), g = this.audio.createGain(), f = this.audio.createBiquadFilter();
    o.type = 'square'; o.frequency.value = 1900; f.type = 'bandpass'; f.frequency.value = 2500;
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(f); f.connect(g); g.connect(this.salida);
    o.start(t); o.stop(t + 0.06);
  }

  detener() {
    for (const s of this.fuentes || []) { try { s.stop(); } catch (e) { /* ya parada */ } }
    if (this.salida) this.salida.disconnect();
  }

  ahora(t) {
    const lat = (this.audio.outputLatency || 0) + (this.audio.baseLatency || 0);
    return (t ?? this.audio.currentTime) - this.t0 - lat - this.ajuste;
  }

  mult() { return Math.min(4, 1 + Math.floor(this.combo / 10)); }

  entrada(ev) {
    if (this.estado !== 'jugando') return;
    if (ev.tipo === 'rasgueo') this.flash = 0.12;
    const t = this.ahora(ev.t);
    const held = ev.held | (ev.tipo === 'fret' ? 1 << ev.lane : 0);
    // Solo cuenta la primera nota pendiente dentro de la ventana.
    for (let i = this.idx; i < this.notas.length; i++) {
      const n = this.notas[i];
      if (n.hit || n.miss) continue;
      if (Math.abs(n.time - t) > this.ventana) return;
      const vale = n.open || ((ev.tipo === 'rasgueo' || n.frets & (1 << ev.lane)) && (held & n.frets) === n.frets);
      if (vale) this.acertar(n, t);
      return;
    }
  }

  acertar(n, t) {
    const antes = this.mult();
    n.hit = true; this.combo++; this.aciertos++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.puntos += 50 * this.mult();
    this.rendimiento = Math.min(1, this.rendimiento + 0.015);
    if (n.end > n.time) { n.holding = true; this.sosteniendo.push(n); }
    this.mensaje = { texto: Math.abs(t - n.time) < 0.05 ? '¡PERFECTO!' : '¡BIEN!', vida: 0.45 };
    const lanes = n.open ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4].filter(l => n.frets & (1 << l));
    for (const l of lanes) { this.llamas.push({ lane: l, vida: 0.35, color: n.open ? COLOR_ABIERTA : COLORES[l] }); this.vibra[l] = 1; }
    if (this.geo) {
      for (const l of lanes) Escenario.chispazo(this.geo.X(l), this.geo.yG, n.open ? COLOR_ABIERTA : COLORES[l], 10);
      if (antes < 4 && this.mult() === 4) { Escenario.rayo(this.geo.W, this.geo.H); Escenario.piro(); }
    }
    if (this.combo % 50 === 0) { this.popup = { texto: `¡${this.combo} NOTAS SEGUIDAS!`, vida: 1.8 }; Escenario.piro(); }
    else if (antes < this.mult()) this.popup = { texto: `¡MULTIPLICADOR x${this.mult()}!`, vida: 1.2 };
  }

  actualizar() {
    const t = this.ahora();
    const dt = this.ultimoT === null ? 0 : Math.max(0, Math.min(0.1, t - this.ultimoT));
    this.ultimoT = t;
    while (this.idx < this.notas.length) {
      const n = this.notas[this.idx];
      if (n.hit) { this.idx++; continue; }
      if (n.time < t - this.ventana) {
        n.miss = true;
        if (this.combo >= 20) this.popup = { texto: 'RACHA ROTA', vida: 1 };
        this.combo = 0; this.idx++;
        this.rendimiento = Math.max(0, this.rendimiento - 0.04);
        if (typeof Sonidos !== 'undefined') Sonidos.fallo();
        continue;
      }
      break;
    }
    this.sosteniendo = this.sosteniendo.filter(n => {
      if (t >= n.end || (!n.open && (this.held & n.frets) !== n.frets)) { n.holding = false; return false; }
      this.puntos += dt * 40 * this.mult();
      for (let l = 0; l < 5; l++) if (n.frets & (1 << l)) this.vibra[l] = Math.max(this.vibra[l], 0.6);
      return true;
    });
    for (const f of this.llamas) f.vida -= dt;
    this.llamas = this.llamas.filter(f => f.vida > 0);
    for (let l = 0; l < 5; l++) this.vibra[l] = Math.max(0, this.vibra[l] - dt * 4);
    if (this.mensaje) { this.mensaje.vida -= dt; if (this.mensaje.vida <= 0) this.mensaje = null; }
    if (this.popup) { this.popup.vida -= dt; if (this.popup.vida <= 0) this.popup = null; }
    this.flash -= dt;
    if (t > this.duracion) { this.estado = 'fin'; this.detener(); }
  }

  resultados() {
    const total = this.notas.length, pct = total ? this.aciertos / total : 0;
    const estrellas = pct >= 0.95 ? 5 : pct >= 0.85 ? 4 : pct >= 0.7 ? 3 : pct >= 0.5 ? 2 : 1;
    return { puntos: Math.floor(this.puntos), aciertos: this.aciertos, total, pct, maxCombo: this.maxCombo, estrellas };
  }

  // ---------------- Dibujo ----------------
  dibujar() {
    const g = this.g, dpr = window.devicePixelRatio || 1;
    const W = this.lienzo.width / dpr, H = this.lienzo.height / dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = this.estado === 'listo' ? -2.5 : this.ahora();
    while (this.ip + 1 < this.pulsos.length && this.pulsos[this.ip + 1] <= t) this.ip++;
    const pulso = t >= (this.pulsos[0] ?? Infinity) ? Math.exp(-(t - this.pulsos[this.ip]) * 8) : 0;
    const dtv = Escenario.dibujar(g, W, H, performance.now() / 1000, { intensidad: 0.3 + 0.2 * (this.mult() - 1), pulso, automatico: false });
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, W, H);

    const cx = W / 2, yG = H * 0.8, yT = H * 0.06;
    const hw = Math.min(W * 0.27, H * 0.46), lw = hw * 2 / 5, s1 = 0.3, P = 1 / s1 - 1, zMin = -0.3;
    const esc = z => 1 / (1 + P * Math.max(z, zMin));
    const Y = z => yT + (yG - yT) * (esc(z) - s1) / (1 - s1);
    const X = (pos, z) => cx + (pos - 2) * lw * esc(z);
    const zDe = tm => (tm - t) / this.vista;
    const v = { g, W, H, cx, yG, lw, esc, Y, X, zDe, zMin, t };
    this.geo = { X: p => X(p, 0), yG, W, H };

    this.mastil(v);
    this.botones(v);
    this.notasVisibles(v);
    this.dibujarLlamas(v);
    Escenario.dibujarChispas(g, dtv);
    this.hud(v);
  }

  mastil({ g, X, Y, esc, zDe, zMin, lw, t }) {
    const quad = (p0, p1, z0, z1) => {
      g.beginPath();
      g.moveTo(X(p0, z1), Y(z1)); g.lineTo(X(p1, z1), Y(z1)); g.lineTo(X(p1, z0), Y(z0)); g.lineTo(X(p0, z0), Y(z0));
      g.closePath();
    };
    quad(-0.6, 4.6, zMin, 1);
    const m = g.createLinearGradient(0, Y(1), 0, Y(zMin));
    m.addColorStop(0, '#1a0f0a'); m.addColorStop(0.5, '#3a2315'); m.addColorStop(1, '#4d2e1b');
    g.fillStyle = m; g.fill();
    g.save();
    quad(-0.6, 4.6, zMin, 1); g.clip();
    // Vetas de la madera
    for (let k = 0; k < 28; k++) {
      const p = -0.6 + k * 5.2 / 28 + Math.sin(k * 7.3) * 0.05;
      g.strokeStyle = `rgba(${k % 3 ? '0,0,0' : '140,80,45'},${0.1 + (k % 5) * 0.03})`;
      g.lineWidth = 1 + (k % 4) * 0.7;
      g.beginPath(); g.moveTo(X(p, 1), Y(1));
      g.bezierCurveTo(X(p + 0.06, 0.6), Y(0.6), X(p - 0.06, 0.25), Y(0.25), X(p, zMin), Y(zMin));
      g.stroke();
    }
    // Incrustaciones de nácar entre trastes
    for (let i = 0; i + 1 < this.pulsos.length; i++) {
      if (i % 4 !== 2) continue;
      const z = zDe((this.pulsos[i] + this.pulsos[i + 1]) / 2);
      if (z < zMin || z > 1) continue;
      const s = esc(z), y = Y(z);
      for (const p of (i % 16 === 10 ? [1, 3] : [2])) {
        const gr = g.createRadialGradient(X(p, z) - lw * 0.04 * s, y - lw * 0.02 * s, 0, X(p, z), y, lw * 0.14 * s);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#d6d3d1'); gr.addColorStop(1, '#a8a29e');
        g.fillStyle = gr;
        g.beginPath(); g.ellipse(X(p, z), y, lw * 0.14 * s, lw * 0.08 * s, 0, 0, Math.PI * 2); g.fill();
      }
    }
    // Trastes metálicos (uno por pulso, más gruesos en cada compás)
    for (let i = 0; i < this.pulsos.length; i++) {
      const z = zDe(this.pulsos[i]);
      if (z < zMin || z > 1) continue;
      const s = esc(z), y = Y(z), grueso = (i % 4 === 0 ? 6 : 3.5) * s, x0 = X(-0.6, z), x1 = X(4.6, z);
      g.fillStyle = '#6b7280'; g.fillRect(x0, y - grueso / 2, x1 - x0, grueso);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(x0, y - grueso / 2, x1 - x0, Math.max(1, grueso * 0.35));
    }
    // Cuerdas (vibran al tocar)
    for (let l = 0; l < 5; l++) {
      const vib = this.vibra[l] > 0 ? Math.sin(t * 90 + l * 2) * this.vibra[l] * lw * 0.06 : 0;
      g.strokeStyle = this.vibra[l] > 0.1 ? CLAROS[l] : 'rgba(229,231,235,0.5)';
      g.lineWidth = 1.2 + l * 0.3;
      g.beginPath(); g.moveTo(X(l, 1), Y(1)); g.quadraticCurveTo(X(l, 0.3) + vib, Y(0.3), X(l, zMin), Y(zMin)); g.stroke();
    }
    // Destello de rasgueo
    if (this.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${this.flash})`;
      g.fillRect(X(-0.6, 0), Y(0) - 4, X(4.6, 0) - X(-0.6, 0), 8);
    }
    g.restore();
    // Rieles cromados (arden en x4)
    g.save();
    const fuego = this.mult() === 4;
    if (fuego) { g.shadowColor = '#f97316'; g.shadowBlur = 30; }
    for (const b of [-0.6, 4.6]) {
      g.beginPath(); g.moveTo(X(b, 1), Y(1)); g.lineTo(X(b, zMin), Y(zMin));
      g.strokeStyle = fuego ? '#fb923c' : '#3f3f46'; g.lineWidth = 14; g.stroke();
      g.strokeStyle = fuego ? '#fef3c7' : '#d4d4d8'; g.lineWidth = 4; g.stroke();
    }
    g.restore();
    // Se desvanece a lo lejos
    const f = g.createLinearGradient(0, Y(1), 0, Y(0.62));
    f.addColorStop(0, 'rgba(0,0,0,1)'); f.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = f; quad(-0.8, 4.8, 0.62, 1.01); g.fill();
  }

  botones({ g, X, yG, lw, H }) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let l = 0; l < 5; l++) {
      const x = X(l, 0), rx = lw * 0.44, ry = rx * 0.62, on = this.held & (1 << l), baja = on ? 3 : 0;
      g.beginPath(); g.ellipse(x, yG + rx * 0.14, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = '#000'; g.fill();
      const met = g.createLinearGradient(0, yG - ry, 0, yG + ry);
      met.addColorStop(0, '#fafafa'); met.addColorStop(0.45, '#a1a1aa'); met.addColorStop(1, '#27272a');
      g.beginPath(); g.ellipse(x, yG, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = met; g.fill();
      g.beginPath(); g.ellipse(x, yG, rx * 0.84, ry * 0.84, 0, 0, Math.PI * 2); g.fillStyle = OSCUROS[l]; g.fill();
      g.beginPath(); g.ellipse(x, yG + baja, rx * 0.64, ry * 0.64, 0, 0, Math.PI * 2);
      if (on) {
        g.save(); g.shadowColor = COLORES[l]; g.shadowBlur = 30;
        const gr = g.createRadialGradient(x - rx * 0.15, yG - ry * 0.25, 0, x, yG, rx * 0.64);
        gr.addColorStop(0, CLAROS[l]); gr.addColorStop(1, COLORES[l]);
        g.fillStyle = gr; g.fill(); g.restore();
      } else {
        g.fillStyle = '#0a0a0a'; g.fill();
        g.strokeStyle = COLORES[l]; g.lineWidth = 3; g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.font = `${Math.round(Math.max(14, H * 0.025))}px Impact, Arial Black, sans-serif`;
      g.fillText(this.teclas[l], x, yG + ry + Math.max(14, H * 0.025));
    }
  }

  gema(g, x, y, r, l, gris) {
    const ry = r * 0.6, h = r * 0.34;
    const base = gris ? '#27272a' : OSCUROS[l], cara = gris ? '#52525b' : COLORES[l], luz = gris ? '#a1a1aa' : CLAROS[l];
    g.beginPath(); g.ellipse(x, y + h * 0.4, r * 1.05, ry * 1.05, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fill();
    g.fillStyle = base;
    g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(x - r, y - h, r * 2, h);
    const gr = g.createRadialGradient(x - r * 0.3, y - h - ry * 0.4, 0, x, y - h, r);
    gr.addColorStop(0, luz); gr.addColorStop(0.5, cara); gr.addColorStop(1, base);
    g.beginPath(); g.ellipse(x, y - h, r, ry, 0, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
    const tapa = g.createLinearGradient(0, y - h - ry * 0.55, 0, y - h + ry * 0.55);
    tapa.addColorStop(0, '#ffffff'); tapa.addColorStop(1, '#a1a1aa');
    g.beginPath(); g.ellipse(x, y - h, r * 0.58, ry * 0.58, 0, 0, Math.PI * 2); g.fillStyle = tapa; g.fill();
    g.beginPath(); g.ellipse(x, y - h, r * 0.32, ry * 0.32, 0, 0, Math.PI * 2); g.fillStyle = cara; g.fill();
  }

  notasVisibles(v) {
    const { g, X, Y, esc, zDe, zMin, lw, t } = v;
    while (this.idxDibujo < this.notas.length && this.notas[this.idxDibujo].time < t - 0.6) this.idxDibujo++;
    const visibles = [];
    for (let i = this.idxDibujo; i < this.notas.length && this.notas[i].time <= t + this.vista; i++) visibles.push(this.notas[i]);
    for (const n of this.sosteniendo) this.cola(v, n, 0);
    for (let i = visibles.length - 1; i >= 0; i--) {
      const n = visibles[i];
      if (n.hit) continue;
      const z = zDe(n.time);
      if (z < zMin) continue;
      if (n.end && !n.open) this.cola(v, n, z);
      const s = esc(z), y = Y(z);
      if (n.open) {
        const x0 = X(-0.4, z), x1 = X(4.4, z), h = lw * 0.2 * s;
        g.fillStyle = n.miss ? '#27272a' : '#581c87'; g.fillRect(x0, y - h * 0.3, x1 - x0, h * 0.8);
        g.fillStyle = n.miss ? '#52525b' : COLOR_ABIERTA; g.fillRect(x0, y - h, x1 - x0, h * 0.8);
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x0, y - h, x1 - x0, h * 0.18);
        continue;
      }
      for (let l = 0; l < 5; l++) if (n.frets & (1 << l)) this.gema(g, X(l, z), y, lw * 0.37 * s, l, n.miss);
    }
  }

  cola({ g, X, Y, esc, zDe, lw, t }, n, desde) {
    const ze = Math.min(1, zDe(n.end));
    if (ze <= desde) return;
    for (let l = 0; l < 5; l++) {
      if (!(n.frets & (1 << l))) continue;
      const w = lw * (n.holding ? 0.11 : 0.08), pts = [];
      for (let i = 0; i <= 24; i++) {
        const z = desde + (ze - desde) * i / 24, s = esc(z);
        const onda = n.holding ? Math.sin(z * 40 - t * 25) * w * 0.9 * s : 0;
        pts.push([X(l, z) + onda, Y(z), w * s]);
      }
      g.save();
      if (n.holding) { g.shadowColor = COLORES[l]; g.shadowBlur = 18; }
      g.beginPath();
      pts.forEach(([x, y, a], i) => (i ? g.lineTo(x - a, y) : g.moveTo(x - a, y)));
      for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] + pts[i][2], pts[i][1]);
      g.closePath();
      g.fillStyle = n.miss ? '#3f3f46' : n.holding ? CLAROS[l] : COLORES[l];
      g.globalAlpha = n.holding ? 1 : 0.8;
      g.fill();
      g.restore();
    }
  }

  dibujarLlamas({ g, X, yG, lw }) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const f of this.llamas) {
      const a = f.vida / 0.35, x = X(f.lane, 0);
      for (const [ancho, alto, c0, c1] of [[0.5, 1.7, 'rgba(255,140,30,', 'rgba(220,38,38,'], [0.3, 1.1, 'rgba(255,255,220,', 'rgba(255,200,60,']]) {
        const w = lw * ancho, h = lw * alto * (0.6 + (1 - a) * 0.6);
        const gr = g.createLinearGradient(0, yG, 0, yG - h);
        gr.addColorStop(0, c0 + a + ')'); gr.addColorStop(0.6, c1 + a * 0.7 + ')'); gr.addColorStop(1, c1 + '0)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(x - w, yG);
        g.quadraticCurveTo(x - w * 0.9, yG - h * 0.55, x + Math.sin(f.vida * 40) * w * 0.3, yG - h);
        g.quadraticCurveTo(x + w * 0.9, yG - h * 0.55, x + w, yG);
        g.closePath(); g.fill();
      }
      g.strokeStyle = `rgba(255,255,255,${a * 0.8})`; g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, yG, lw * 0.44 * (1 + (1 - a) * 0.5), lw * 0.27 * (1 + (1 - a) * 0.5), 0, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }

  texto(g, txt, x, y, tam, relleno, alinear = 'center') {
    g.font = `${Math.round(tam)}px Impact, Arial Black, sans-serif`;
    g.textAlign = alinear; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = tam * 0.14; g.strokeStyle = '#000'; g.strokeText(txt, x, y);
    if (relleno === 'fuego') {
      const gr = g.createLinearGradient(0, y - tam / 2, 0, y + tam / 2);
      gr.addColorStop(0, '#fff7c2'); gr.addColorStop(0.4, '#facc15'); gr.addColorStop(0.7, '#f97316'); gr.addColorStop(1, '#b91c1c');
      g.fillStyle = gr;
    } else if (relleno === 'cromo') {
      const gr = g.createLinearGradient(0, y - tam / 2, 0, y + tam / 2);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.48, '#d4d4d8'); gr.addColorStop(0.52, '#71717a'); gr.addColorStop(1, '#e4e4e7');
      g.fillStyle = gr;
    } else g.fillStyle = relleno;
    g.fillText(txt, x, y);
  }

  hud({ g, W, H, cx, yG, X, lw, t }) {
    const f = Math.max(16, H * 0.034);
    const bordeIzq = X(-0.6, 0), bordeDer = X(4.6, 0);
    // Panel de puntuación (izquierda)
    const pw = Math.min(260, bordeIzq - 30), px = Math.max(14, bordeIzq - pw - 30), py = yG - f * 2.6;
    if (pw > 120) {
      const mg = g.createLinearGradient(0, py, 0, py + f * 3.6);
      mg.addColorStop(0, 'rgba(63,63,70,0.95)'); mg.addColorStop(1, 'rgba(9,9,11,0.95)');
      g.fillStyle = mg; g.strokeStyle = '#a1a1aa'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(px, py, pw, f * 3.6, 10); g.fill(); g.stroke();
      this.texto(g, 'PUNTOS', px + 14, py + f * 0.7, f * 0.6, '#a1a1aa', 'left');
      this.texto(g, Math.floor(this.puntos).toLocaleString('es'), px + pw - 14, py + f * 1.7, f * 1.5, 'cromo', 'right');
      this.texto(g, this.combo > 1 ? `RACHA ${this.combo}` : '', px + 14, py + f * 2.9, f * 0.7, '#fb923c', 'left');
    }
    // Multiplicador (anillo que se llena) y medidor de rock (derecha)
    const R = f * 1.7, mx = Math.min(W - R - 20, bordeDer + R + 40), my = yG - R * 0.6;
    const m = this.mult(), llenos = m === 4 ? 10 : this.combo % 10;
    g.lineWidth = R * 0.28;
    for (let i = 0; i < 10; i++) {
      const a0 = -Math.PI / 2 + i * Math.PI / 5 + 0.05, a1 = a0 + Math.PI / 5 - 0.1;
      g.strokeStyle = i < llenos ? COLOR_MULT[Math.max(2, Math.min(4, m + (m < 4 ? 1 : 0)))] : '#27272a';
      g.beginPath(); g.arc(mx, my, R, a0, a1); g.stroke();
    }
    g.beginPath(); g.arc(mx, my, R * 0.78, 0, Math.PI * 2); g.fillStyle = 'rgba(0,0,0,0.85)'; g.fill();
    if (m === 4) { g.save(); g.shadowColor = '#f97316'; g.shadowBlur = 30; }
    this.texto(g, `x${m}`, mx, my, R * 0.95, m === 4 ? 'fuego' : COLOR_MULT[m]);
    if (m === 4) g.restore();
    const gx = mx, gy = my - R * 2.1, gr = R * 1.3;
    const zonas = [['#dc2626', 0, 0.33], ['#facc15', 0.33, 0.66], ['#22c55e', 0.66, 1]];
    g.lineWidth = gr * 0.3;
    for (const [c, a, b] of zonas) { g.strokeStyle = c; g.beginPath(); g.arc(gx, gy, gr, Math.PI + a * Math.PI + 0.02, Math.PI + b * Math.PI - 0.02); g.stroke(); }
    const ang = Math.PI + this.rendimiento * Math.PI;
    g.strokeStyle = '#fafafa'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(ang) * gr * 1.05, gy + Math.sin(ang) * gr * 1.05); g.stroke();
    g.beginPath(); g.arc(gx, gy, 6, 0, Math.PI * 2); g.fillStyle = '#fafafa'; g.fill();
    this.texto(g, 'ROCK', gx, gy + gr * 0.35, f * 0.6, '#e4e4e7');
    // Progreso de la canción
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, W, 8);
    const pg = g.createLinearGradient(0, 0, W, 0);
    pg.addColorStop(0, '#facc15'); pg.addColorStop(1, '#dc2626');
    g.fillStyle = pg; g.fillRect(0, 0, W * Math.max(0, Math.min(1, t / this.duracion)), 8);
    // Mensajes
    if (this.mensaje) {
      g.globalAlpha = Math.min(1, this.mensaje.vida * 4);
      this.texto(g, this.mensaje.texto, cx, yG - H * 0.2, f * 1.1, 'cromo');
      g.globalAlpha = 1;
    }
    if (this.popup) {
      const edad = (this.popup.texto.includes('NOTAS') ? 1.8 : this.popup.texto.includes('RACHA') ? 1 : 1.2) - this.popup.vida;
      const esc = edad < 0.15 ? 2.2 - edad * 8 : 1;
      g.globalAlpha = Math.min(1, this.popup.vida * 2);
      this.texto(g, this.popup.texto, cx, H * 0.3, f * 1.6 * esc, this.popup.texto === 'RACHA ROTA' ? '#a1a1aa' : 'fuego');
      g.globalAlpha = 1;
    }
    // Presentación de la canción y cuenta atrás
    if (t < 3) {
      const entra = Math.min(1, (t + 2.5) * 3), sale = t > 2 ? (t - 2) : 0;
      const x = -500 + entra * 520 - sale * 600;
      g.save();
      g.translate(x, H * 0.16);
      const cg = g.createLinearGradient(0, 0, 0, f * 3.2);
      cg.addColorStop(0, 'rgba(185,28,28,0.95)'); cg.addColorStop(1, 'rgba(69,10,10,0.95)');
      g.fillStyle = cg;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(480, 0); g.lineTo(450, f * 3.2); g.lineTo(0, f * 3.2); g.closePath(); g.fill();
      g.fillStyle = '#facc15'; g.fillRect(0, f * 3.2, 450, 4);
      this.texto(g, this.titulo.toUpperCase(), 40, f * 1.1, f * 1.15, '#ffffff', 'left');
      this.texto(g, `${this.artista || 'Alonso Hero'} · ${NOMBRES_DIF[this.dif]}`, 40, f * 2.35, f * 0.7, '#fde68a', 'left');
      g.restore();
    }
    if (t < 0) this.texto(g, String(Math.ceil(-t)), cx, H * 0.42, f * 4, 'fuego');
    else if (t < 0.8) { g.globalAlpha = 1 - t / 0.8; this.texto(g, '¡A ROCKEAR!', cx, H * 0.42, f * 3 * (1 + t * 0.4), 'fuego'); g.globalAlpha = 1; }
  }
}
