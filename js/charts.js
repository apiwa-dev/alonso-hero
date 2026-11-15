'use strict';
// Lectura de canciones en formato .chart y .mid (el que usan las canciones de la comunidad).
// Resultado: { tracks: { easy, medium, hard, expert }, beats: [segundos] }
// Cada nota: { time, end, frets (bits 0..4), open }
const Charts = (() => {
  const DIFS = ['easy', 'medium', 'hard', 'expert'];

  function mapaTempo(tempos, res) {
    const lista = tempos.slice().sort((a, b) => a.tick - b.tick);
    if (!lista.length || lista[0].tick !== 0) lista.unshift({ tick: 0, bpm: 120 });
    const seg = [];
    let t = 0;
    for (let i = 0; i < lista.length; i++) {
      if (i > 0) t += (lista[i].tick - lista[i - 1].tick) * seg[i - 1].spt;
      seg.push({ tick: lista[i].tick, time: t, spt: 60 / (lista[i].bpm * res) });
    }
    return tick => {
      let lo = 0, hi = seg.length - 1;
      while (lo < hi) {
        const m = (lo + hi + 1) >> 1;
        if (seg[m].tick <= tick) lo = m; else hi = m - 1;
      }
      return seg[lo].time + (tick - seg[lo].tick) * seg[lo].spt;
    };
  }

  function finalizar(notas, aTiempo, res) {
    notas.sort((a, b) => a.tick - b.tick);
    const out = notas.map(n => {
      const open = n.open && !n.frets;
      const time = aTiempo(n.tick);
      const end = n.len > res / 3 ? aTiempo(n.tick + n.len) : 0;
      return { time, end, frets: open ? 0 : n.frets, open };
    });
    // Una nota larga termina antes de la siguiente nota.
    for (let i = 0; i < out.length; i++) {
      const n = out[i];
      if (!n.end) continue;
      let j = i + 1;
      while (j < out.length && out[j].time <= n.time) j++;
      if (j < out.length && n.end > out[j].time - 0.05) n.end = out[j].time - 0.05;
      if (n.end - n.time < 0.15) n.end = 0;
    }
    return out;
  }

  function pulsos(aTiempo, res, ultimoTick) {
    const b = [];
    for (let k = 0; k <= ultimoTick + res * 4; k += res) b.push(aTiempo(k));
    return b;
  }

  function texto(buf) {
    const u = new Uint8Array(buf);
    if (u[0] === 0xFF && u[1] === 0xFE) return new TextDecoder('utf-16le').decode(u);
    if (u[0] === 0xFE && u[1] === 0xFF) return new TextDecoder('utf-16be').decode(u);
    return new TextDecoder('utf-8').decode(u);
  }

  function leerIni(txt) {
    const r = {};
    for (const linea of txt.split(/\r?\n/)) {
      const m = linea.match(/^\s*([^=\[;#]+?)\s*=\s*(.*?)\s*$/);
      if (m) r[m[1].toLowerCase()] = m[2].replace(/<[^>]+>/g, '');
    }
    return r;
  }

  function leerChart(buf) {
    const secciones = {};
    let actual = null;
    for (const crudo of texto(buf).split(/\r?\n/)) {
      const linea = crudo.trim();
      if (!linea || linea === '{' || linea === '}') continue;
      if (linea[0] === '[') { actual = linea.slice(1, -1).trim(); secciones[actual] = []; continue; }
      if (actual) secciones[actual].push(linea);
    }
    let res = 192;
    for (const l of secciones.Song || []) {
      const m = l.match(/^Resolution\s*=\s*"?(\d+)/);
      if (m) res = +m[1];
    }
    const tempos = [];
    for (const l of secciones.SyncTrack || []) {
      const m = l.match(/^(\d+)\s*=\s*B\s+(\d+)/);
      if (m && +m[2] > 0) tempos.push({ tick: +m[1], bpm: +m[2] / 1000 });
    }
    const aTiempo = mapaTempo(tempos, res);
    const nombres = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' };
    const instrumentos = ['Single', 'DoubleGuitar', 'DoubleRhythm', 'DoubleBass', 'Keyboard'];
    let tracks = {}, ultimoTick = 0;
    for (const inst of instrumentos) {
      tracks = {};
      for (const d of DIFS) {
        const lineas = secciones[nombres[d] + inst];
        if (!lineas) continue;
        const porTick = new Map();
        for (const l of lineas) {
          const m = l.match(/^(\d+)\s*=\s*N\s+(\d+)\s+(\d+)/);
          if (!m) continue;
          const tick = +m[1], fret = +m[2], len = +m[3];
          if (fret > 7 || fret === 5 || fret === 6) continue;
          let n = porTick.get(tick);
          if (!n) { n = { tick, frets: 0, open: false, len: 0 }; porTick.set(tick, n); }
          if (fret === 7) n.open = true; else n.frets |= 1 << fret;
          n.len = Math.max(n.len, len);
          ultimoTick = Math.max(ultimoTick, tick + len);
        }
        if (porTick.size) tracks[d] = finalizar([...porTick.values()], aTiempo, res);
      }
      if (Object.keys(tracks).length) break;
    }
    if (!Object.keys(tracks).length) throw new Error('La canción no tiene notas de guitarra.');
    return { tracks, beats: pulsos(aTiempo, res, ultimoTick) };
  }

  function leerMidi(buf) {
    const d = new DataView(buf);
    let p = 0;
    const cuatro = () => String.fromCharCode(d.getUint8(p), d.getUint8(p + 1), d.getUint8(p + 2), d.getUint8(p + 3));
    const vlq = () => { let v = 0, b; do { b = d.getUint8(p++); v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
    if (cuatro() !== 'MThd') throw new Error('El archivo .mid no es válido.');
    const largoCab = d.getUint32(4), numPistas = d.getUint16(10), division = d.getUint16(12);
    if (division & 0x8000) throw new Error('Este tipo de archivo .mid no se puede leer.');
    p = 8 + largoCab;
    const pistas = [], tempos = [];
    for (let k = 0; k < numPistas && p + 8 <= d.byteLength; k++) {
      const id = cuatro(), largo = d.getUint32(p + 4);
      p += 8;
      const fin = Math.min(p + largo, d.byteLength);
      if (id !== 'MTrk') { p = fin; continue; }
      let tick = 0, estado = 0, nombre = '';
      const ev = [];
      while (p < fin) {
        tick += vlq();
        let s = d.getUint8(p);
        if (s & 0x80) p++; else s = estado;
        if (s === 0xFF) {
          const tipo = d.getUint8(p++), l = vlq();
          if (tipo === 0x51) tempos.push({ tick, bpm: 60e6 / ((d.getUint8(p) << 16) | (d.getUint8(p + 1) << 8) | d.getUint8(p + 2)) });
          else if (tipo === 0x03 && !nombre) nombre = new TextDecoder().decode(new Uint8Array(buf, p, l));
          p += l;
        } else if (s === 0xF0 || s === 0xF7) {
          p += vlq();
        } else {
          estado = s;
          const alto = s & 0xF0;
          const a = d.getUint8(p++);
          const v = (alto === 0xC0 || alto === 0xD0) ? 0 : d.getUint8(p++);
          if (alto === 0x90 && v > 0) ev.push({ tick, on: true, nota: a });
          else if (alto === 0x80 || alto === 0x90) ev.push({ tick, on: false, nota: a });
        }
      }
      p = fin;
      pistas.push({ nombre: nombre.trim().toUpperCase(), ev });
    }
    const aTiempo = mapaTempo(tempos, division);
    const preferidas = ['PART GUITAR', 'T1 GEMS', 'PART GUITAR COOP', 'PART RHYTHM', 'PART BASS', 'PART KEYS'];
    const base = { easy: 60, medium: 72, hard: 84, expert: 96 };
    let ultimoTick = 0;
    for (const nombre of preferidas) {
      const pista = pistas.find(x => x.nombre === nombre);
      if (!pista) continue;
      const tracks = {};
      for (const dif of DIFS) {
        const abiertas = {}, porTick = new Map();
        for (const e of pista.ev) {
          const fret = e.nota - base[dif];
          if (fret < 0 || fret > 4) continue;
          if (e.on) abiertas[fret] = e.tick;
          else if (abiertas[fret] !== undefined) {
            const inicio = abiertas[fret];
            delete abiertas[fret];
            let n = porTick.get(inicio);
            if (!n) { n = { tick: inicio, frets: 0, open: false, len: 0 }; porTick.set(inicio, n); }
            n.frets |= 1 << fret;
            n.len = Math.max(n.len, e.tick - inicio);
            ultimoTick = Math.max(ultimoTick, e.tick);
          }
        }
        if (porTick.size) tracks[dif] = finalizar([...porTick.values()], aTiempo, division);
      }
      if (Object.keys(tracks).length) return { tracks, beats: pulsos(aTiempo, division, ultimoTick) };
    }
    throw new Error('La canción no tiene notas de guitarra.');
  }

  return { DIFS, leerChart, leerMidi, leerIni, texto };
})();
