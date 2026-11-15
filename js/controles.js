'use strict';
// Teclado, mandos y guitarras. Los mandos tipo Xbox y las guitarras Xbox funcionan sin configurar;
// los demás se configuran una sola vez con "pulsa el botón VERDE…".
const Controles = (() => {
  const TECLAS_FRET = { KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3, KeyG: 4, Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 };
  const TECLAS_RASGUEO = new Set(['Space', 'Enter', 'NumpadEnter', 'ArrowUp', 'ArrowDown']);
  const TECLAS_MENU = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izq', ArrowRight: 'der', Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', Escape: 'atras', Backspace: 'atras', Delete: 'borrar' };
  const B = i => ({ t: 'b', i });
  const ESTANDAR = { frets: [B(0), B(1), B(3), B(2), B(4)], abajo: B(13), arriba: B(12), pausa: B(9) };
  const PASOS = [
    { clave: 0, texto: 'el botón VERDE', color: 0 },
    { clave: 1, texto: 'el botón ROJO', color: 1 },
    { clave: 2, texto: 'el botón AMARILLO', color: 2 },
    { clave: 3, texto: 'el botón AZUL', color: 3 },
    { clave: 4, texto: 'el botón NARANJA', color: 4 },
    { clave: 'abajo', texto: 'el rasgueo hacia ABAJO', opcional: true },
    { clave: 'arriba', texto: 'el rasgueo hacia ARRIBA', opcional: true },
    { clave: 'pausa', texto: 'el botón de PAUSA (Start)', opcional: true },
  ];
  const mapas = JSON.parse(localStorage.getItem('mapasMandos') || '{}');
  const guardar = () => localStorage.setItem('mapasMandos', JSON.stringify(mapas));
  const cola = [], previos = {};
  let teclas = 0, padsHeld = 0, cal = null;
  const api = { reloj: () => 0, PASOS, ETIQUETAS: ['A', 'S', 'D', 'F', 'G'] };

  addEventListener('keydown', e => {
    let usada = false;
    const lane = TECLAS_FRET[e.code];
    if (lane !== undefined) {
      usada = true;
      if (!e.repeat) { teclas |= 1 << lane; cola.push({ tipo: 'fret', lane, t: api.reloj(), held: teclas | padsHeld }); }
    }
    if (TECLAS_RASGUEO.has(e.code)) {
      usada = true;
      if (!e.repeat) cola.push({ tipo: 'rasgueo', t: api.reloj(), held: teclas | padsHeld });
    }
    const m = TECLAS_MENU[e.code];
    if (m) { usada = true; cola.push({ tipo: 'menu', accion: m, origen: 'teclado' }); }
    if (usada) e.preventDefault();
  });
  addEventListener('keyup', e => { const l = TECLAS_FRET[e.code]; if (l !== undefined) teclas &= ~(1 << l); });
  addEventListener('blur', () => { teclas = 0; });

  const mapaDe = gp => mapas[gp.id] || (gp.mapping === 'standard' ? ESTANDAR : null);
  function activo(gp, b) {
    if (!b) return false;
    if (b.t === 'b') { const x = gp.buttons[b.i]; return !!x && (x.pressed || x.value > 0.5); }
    const v = gp.axes[b.i];
    return v !== undefined && Math.abs(v - b.v) < 0.15;
  }
  const mismo = (a, b) => a && b && a.t === b.t && a.i === b.i && (a.t === 'b' || Math.abs(a.v - b.v) < 0.15);

  function pasoCalibracion(gp) {
    const ahora = performance.now();
    if (!cal.base) { cal.base = [...gp.axes]; cal.id = gp.id; cal.desde = ahora; }
    const bot = gp.buttons.map(x => x.pressed || x.value > 0.5);
    const ejes = [...gp.axes];
    if (cal.soltar) {
      const quieto = bot.every(v => !v) && ejes.every((v, i) => Math.abs(v - cal.base[i]) < 0.3);
      if (quieto) cal.soltar = false;
      else if (bot.every(v => !v) && ahora - cal.desde > 3000) { cal.base = ejes; cal.soltar = false; }
      return;
    }
    let b = null;
    const i = bot.findIndex(v => v);
    if (i >= 0) b = B(i);
    else {
      const j = ejes.findIndex((v, k) => Math.abs(v - cal.base[k]) > 0.6);
      if (j >= 0) b = { t: 'a', i: j, v: Math.round(ejes[j] * 100) / 100 };
    }
    if (!b) return;
    const n = cal.nuevo;
    if ([...n.frets, n.abajo, n.arriba, n.pausa].some(x => mismo(x, b))) return;
    const clave = PASOS[cal.paso].clave;
    if (typeof clave === 'number') n.frets[clave] = b; else n[clave] = b;
    siguiente();
  }
  function siguiente() {
    cal.paso++; cal.soltar = true; cal.desde = performance.now();
    if (cal.paso < PASOS.length) { cal.cb.paso(cal.paso); return; }
    const { id, nuevo, cb, index } = cal;
    cal = null;
    if (id && nuevo.frets.filter(Boolean).length === 5) { mapas[id] = nuevo; guardar(); }
    delete previos[index];
    cb.fin(true);
  }

  api.leer = () => {
    const eventos = cola.splice(0);
    let held = 0;
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    for (const gp of pads) {
      if (cal && cal.index === gp.index) { pasoCalibracion(gp); continue; }
      const m = mapaDe(gp);
      if (!m) continue;
      const f = m.frets.map(b => activo(gp, b));
      const s = {
        f, ab: activo(gp, m.abajo), ar: activo(gp, m.arriba), pa: activo(gp, m.pausa),
        navAr: m.arriba ? activo(gp, m.arriba) : f[2], navAb: m.abajo ? activo(gp, m.abajo) : f[3],
      };
      if (gp.mapping === 'standard' && !mapas[gp.id]) {
        const x = gp.axes[0] || 0, y = gp.axes[1] || 0;
        s.navAr = s.navAr || y < -0.6; s.navAb = s.navAb || y > 0.6;
        s.iz = activo(gp, B(14)) || x < -0.6; s.de = activo(gp, B(15)) || x > 0.6;
      }
      const p = previos[gp.index] || { f: [] };
      const flanco = k => s[k] && !p[k];
      let mio = 0;
      f.forEach((on, l) => { if (on) mio |= 1 << l; });
      held |= mio;
      const t = api.reloj();
      f.forEach((on, l) => { if (on && !p.f[l]) eventos.push({ tipo: 'fret', lane: l, t, held: mio | teclas }); });
      if (flanco('ab') || flanco('ar')) eventos.push({ tipo: 'rasgueo', t, held: mio | teclas });
      const menu = accion => eventos.push({ tipo: 'menu', accion, origen: 'mando' });
      if (flanco('navAr')) menu('arriba');
      if (flanco('navAb')) menu('abajo');
      if (flanco('iz')) menu('izq');
      if (flanco('de')) menu('der');
      if (f[0] && !p.f[0]) menu('ok');
      if (f[1] && !p.f[1]) menu('atras');
      if (flanco('pa')) menu('pausa');
      previos[gp.index] = s;
    }
    padsHeld = held;
    return { held: held | teclas, eventos };
  };

  api.mandos = () => (navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []).map(gp => ({
    index: gp.index,
    nombre: gp.id.replace(/\s*\(.*$/, '').trim() || 'Mando',
    listo: !!mapaDe(gp),
    personalizado: !!mapas[gp.id],
  }));
  api.necesitaConfig = gp => !mapaDe(gp);
  api.calibrar = (index, cb) => { cal = { index, paso: 0, soltar: true, base: null, nuevo: { frets: [] }, cb }; cb.paso(0); };
  api.calibrando = () => !!cal;
  api.saltar = () => { if (cal && PASOS[cal.paso].opcional) siguiente(); };
  api.cancelar = () => { if (cal) { const cb = cal.cb; cal = null; cb.fin(false); } };
  api.restablecer = index => {
    const gp = navigator.getGamepads()[index];
    if (gp) { delete mapas[gp.id]; guardar(); delete previos[index]; }
  };
  return api;
})();
