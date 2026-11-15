'use strict';
// Canciones de rock originales incluidas en el juego (música y notas generadas por código).
const Incluidas = (() => {
  const LISTA = [
    { id: 'fuego', titulo: 'Fuego en el Escenario', bpm: 112, tonica: 48, modo: 'mayor', grados: [0, 4, 5, 3], semilla: 2026, compases: 34 },
    { id: 'rayo', titulo: 'Rayo Veloz', bpm: 150, tonica: 52, modo: 'mayor', grados: [0, 3, 4, 3], semilla: 77, compases: 44 },
    { id: 'trueno', titulo: 'Trueno Metálico', bpm: 96, tonica: 52, modo: 'menor', grados: [0, 5, 6, 0], semilla: 13, compases: 30 },
    { id: 'ataque', titulo: 'Alonso al Ataque', bpm: 128, tonica: 43, modo: 'mayor', grados: [0, 6, 3, 0], semilla: 501, compases: 38 },
    { id: 'noche', titulo: 'Noche de Amplificadores', bpm: 120, tonica: 45, modo: 'menor', grados: [0, 3, 6, 2], semilla: 9, compases: 36 },
  ];
  const ESCALAS = { mayor: [0, 2, 4, 5, 7, 9, 11], menor: [0, 2, 3, 5, 7, 8, 10] };
  const cache = {};

  function azar(s) {
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Nota de la escala (índice 0..7 = una octava) en semitonos sobre la tónica.
  const semitono = (esc, i) => esc[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);

  function melodia(c) {
    const r = azar(c.semilla), notas = [];
    let idx = 2;
    for (let k = 1; k < c.compases - 1; k++) {
      const g = c.grados[k % 4], tonos = [g, g + 2, g + 4].map(x => x % 7).concat(g + 7 <= 7 ? [g + 7] : []);
      const finFrase = k % 4 === 0;
      for (let s = 0; s < 8; s++) {
        if (finFrase && s === 7) continue;
        const forzada = s === 0 || (finFrase && s === 6);
        if (!forzada && r() < (s % 2 ? 0.35 : 0.1)) continue;
        if (s === 0) idx = tonos.reduce((m, x) => (Math.abs(x - idx) < Math.abs(m - idx) ? x : m), tonos[0]);
        else idx = Math.max(0, Math.min(7, idx + [-2, -1, -1, 0, 1, 1, 2][Math.floor(r() * 7)]));
        notas.push({ paso: k * 8 + s, idx, sost: finFrase && s === 6 ? 1.5 : 0 });
      }
    }
    return notas;
  }

  function pistas(mel, pulso) {
    const tr = { easy: [], medium: [], hard: [], expert: [] };
    for (const n of mel) {
      const l = Math.min(4, Math.floor(n.idx * 5 / 8));
      const time = n.paso * pulso / 2, end = n.sost ? time + n.sost * pulso : 0;
      let acorde = 1 << l;
      if (n.paso % 8 === 0) acorde |= 1 << (l + 2 <= 4 ? l + 2 : l - 2);
      tr.expert.push({ time, end, frets: acorde, open: false });
      tr.hard.push({ time, end, frets: 1 << l, open: false });
      if (n.paso % 2 === 0) tr.medium.push({ time, end, frets: 1 << Math.min(l, 3), open: false });
      if (n.paso % 4 === 0) tr.easy.push({ time, end: 0, frets: 1 << Math.min(l, 2), open: false });
    }
    return tr;
  }

  async function musica(c, mel) {
    const pulso = 60 / c.bpm, esc = ESCALAS[c.modo];
    const sr = 22050, dur = c.compases * 4 * pulso + 2;
    const ctx = new OfflineAudioContext(1, Math.ceil(sr * dur), sr);
    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
    const r = azar(c.semilla + 1);
    const ruido = ctx.createBuffer(1, sr, sr);
    const dat = ruido.getChannelData(0);
    for (let i = 0; i < dat.length; i++) dat[i] = r() * 2 - 1;
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);

    // Guitarra distorsionada: sierra -> saturación -> filtro
    const curva = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curva[i] = Math.tanh(x * 6); }
    const dist = ctx.createWaveShaper();
    dist.curve = curva;
    const tono = ctx.createBiquadFilter();
    tono.type = 'lowpass'; tono.frequency.value = 2800;
    const volGuit = ctx.createGain();
    volGuit.gain.value = 0.22;
    dist.connect(tono); tono.connect(volGuit); volGuit.connect(master);

    function guitarra(m, t, largo, vol) {
      for (const iv of [0, 7, 12]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = hz(m + iv); o.detune.value = (r() - 0.5) * 12;
        g.gain.setValueAtTime(vol, t);
        g.gain.setTargetAtTime(vol * 0.5, t + 0.03, 0.15);
        g.gain.setTargetAtTime(0, t + largo, 0.03);
        o.connect(g); g.connect(dist);
        o.start(t); o.stop(t + largo + 0.2);
      }
    }
    function voz(tipo, m, t, largo, vol, corte) {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = tipo; o.frequency.value = hz(m);
      f.type = 'lowpass'; f.frequency.value = corte;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.setTargetAtTime(vol * 0.6, t + 0.02, 0.1);
      g.gain.setTargetAtTime(0, t + largo, 0.05);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); o.stop(t + largo + 0.4);
    }
    function golpe(t, largo, vol, frec) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = ruido; f.type = 'highpass'; f.frequency.value = frec;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + largo);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t, r() * 0.5); s.stop(t + largo);
    }
    function bombo(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.4);
    }

    const rapido = c.bpm >= 140;
    for (let k = 0; k < c.compases; k++) {
      const raiz = c.tonica + semitono(esc, c.grados[k % 4]);
      const banda = k > 0 && k < c.compases - 1;
      for (let b = 0; b < 4; b++) {
        const t = (k * 4 + b) * pulso;
        if (b % 2 === 0 || (rapido && banda)) bombo(t); else golpe(t, 0.2, 0.6, 1200);
        if (rapido && b % 2) golpe(t, 0.2, 0.6, 1200);
        golpe(t, 0.05, 0.14, 7000);
        golpe(t + pulso / 2, 0.05, 0.1, 7000);
        if (banda) {
          guitarra(raiz, t, pulso * 0.45, 0.5);
          guitarra(raiz, t + pulso / 2, pulso * 0.4, 0.4);
          voz('triangle', raiz - 12, t, pulso * 0.85, 0.35, 2000);
        }
      }
      if (k % 4 === 1 || k === c.compases - 1) golpe(k * 4 * pulso, 1.2, 0.25, 4000);
    }
    for (const n of mel) voz('square', c.tonica + 24 + semitono(esc, n.idx), n.paso * pulso / 2, (n.sost || 0.4) * pulso, 0.08, 2600);
    return ctx.startRendering();
  }

  // La música ya fabricada se guarda (WAV) para que las siguientes veces cargue al instante.
  const VERSION = 'v1';
  const conLimite = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
  async function carpetaGuardado() {
    try { return await conLimite((async () => (await navigator.storage.getDirectory()).getDirectoryHandle('incluidas', { create: true }))(), 3000); }
    catch (e) { return null; }
  }
  function aWav(buf) {
    const d = buf.getChannelData(0), n = d.length, v = new DataView(new ArrayBuffer(44 + n * 2));
    const s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, buf.sampleRate, true);
    v.setUint32(28, buf.sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    s(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
    return v.buffer;
  }
  async function audioDe(c, mel) {
    const dir = await carpetaGuardado(), nombre = `${c.id}-${VERSION}.wav`;
    if (dir) {
      try {
        const f = await (await dir.getFileHandle(nombre)).getFile();
        return await new OfflineAudioContext(1, 1, 22050).decodeAudioData(await f.arrayBuffer());
      } catch (e) { /* aún no está guardada */ }
    }
    const buf = await musica(c, mel);
    if (dir) {
      try { const w = await (await dir.getFileHandle(nombre, { create: true })).createWritable(); await w.write(aWav(buf)); await w.close(); }
      catch (e) { console.warn('No se pudo guardar la música', e); }
    }
    return buf;
  }

  function crear(id) {
    if (!cache[id]) {
      cache[id] = (async () => {
        const c = LISTA.find(x => x.id === id);
        const pulso = 60 / c.bpm, mel = melodia(c);
        const beats = [];
        for (let k = 0; k <= c.compases * 4; k++) beats.push(k * pulso);
        return { chart: { tracks: pistas(mel, pulso), beats }, buffers: [await audioDe(c, mel)] };
      })();
      cache[id].catch(() => { delete cache[id]; });
    }
    return cache[id];
  }
  async function precargar() { for (const c of LISTA) { try { await crear(c.id); } catch (e) { console.warn(e); } } }

  return { LISTA, crear, precargar };
})();
