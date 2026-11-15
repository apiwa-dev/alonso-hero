'use strict';
// Crea las notas de una canción automáticamente a partir de su audio (MP3, OGG, WAV…).
// Detecta los golpes de la música (onsets), calcula el tempo y coloca las notas en la cuadrícula del ritmo.
const AutoChart = (() => {
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), mitad = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < mitad; k++) {
          const a = i + k, b = a + mitad;
          const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }

  function analizar(buf) {
    const sr = buf.sampleRate, N = 1024, H = Math.round(sr * 0.0116);
    const canales = buf.numberOfChannels, len = buf.length;
    const mono = new Float32Array(len);
    for (let c = 0; c < canales; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) mono[i] += d[i] / canales; }
    const frames = Math.max(0, Math.floor((len - N) / H));
    const flux = new Float32Array(frames), centro = new Float32Array(frames);
    const ventana = new Float32Array(N);
    for (let i = 0; i < N; i++) ventana[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    const prev = new Float32Array(N / 2), re = new Float32Array(N), im = new Float32Array(N);
    const binMax = Math.min(N / 2, Math.floor(8000 / (sr / N)));
    for (let f = 0; f < frames; f++) {
      const o = f * H;
      for (let i = 0; i < N; i++) { re[i] = mono[o + i] * ventana[i]; im[i] = 0; }
      fft(re, im);
      let fl = 0, num = 0, den = 0;
      for (let k = 1; k < binMax; k++) {
        const m = Math.log1p(Math.sqrt(re[k] * re[k] + im[k] * im[k]) * 10);
        const d = m - prev[k];
        if (d > 0) fl += d;
        prev[k] = m; num += k * m; den += m;
      }
      flux[f] = fl; centro[f] = den ? num / den : 0;
    }
    return { flux, centro, dt: H / sr };
  }

  function picos(flux, dt) {
    const n = flux.length, w = Math.max(2, Math.round(0.1 / dt)), out = [];
    for (let i = 1; i < n - 1; i++) {
      if (!(flux[i] > flux[i - 1] && flux[i] >= flux[i + 1])) continue;
      let s = 0, c = 0, maximo = true;
      for (let j = Math.max(0, i - w * 3); j < Math.min(n, i + w); j++) { s += flux[j]; c++; }
      for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) if (flux[j] > flux[i]) { maximo = false; break; }
      const media = s / c;
      if (maximo && flux[i] > media * 1.3 + 1e-6) out.push({ t: i * dt, s: flux[i] - media, f: i });
    }
    return out;
  }

  function tempo(flux, dt) {
    const n = flux.length;
    let media = 0;
    for (let i = 0; i < n; i++) media += flux[i];
    media /= n || 1;
    const env = new Float32Array(n);
    for (let i = 0; i < n; i++) env[i] = Math.max(0, flux[i] - media);
    let mejor = -1, bpm = 120;
    for (let b = 70; b <= 190; b += 0.25) {
      const lag = 60 / b / dt;
      let s = 0;
      for (const mult of [1, 2, 4]) {
        const L = lag * mult, Li = Math.floor(L), fr = L - Li;
        let acc = 0;
        for (let i = 0; i + Li + 1 < n; i += 2) acc += env[i] * (env[i + Li] * (1 - fr) + env[i + Li + 1] * fr);
        s += acc / mult;
      }
      s *= Math.exp(-0.5 * Math.pow(Math.log2(b / 120) / 0.7, 2));
      if (s > mejor) { mejor = s; bpm = b; }
    }
    const beat = 60 / bpm;
    let mejorF = -1, fase = 0;
    for (let ph = 0; ph < beat; ph += dt) {
      let s = 0;
      for (let t = ph; t < n * dt; t += beat) s += env[Math.round(t / dt)] || 0;
      if (s > mejorF) { mejorF = s; fase = ph; }
    }
    return { bpm, fase };
  }

  const CONFIG = {
    expert: { g: 0.25, nL: 5, guardar: 0.9, acordes: 0.12 },
    hard: { g: 0.5, nL: 5, guardar: 0.85, acordes: 0.04 },
    medium: { g: 1, nL: 4, guardar: 0.85, acordes: 0 },
    easy: { g: 2, nL: 3, guardar: 0.9, acordes: 0 },
  };

  function generar(pk, bpm, fase) {
    const beat = 60 / bpm, tracks = {};
    for (const [dif, c] of Object.entries(CONFIG)) {
      const paso = c.g * beat, ranuras = new Map();
      for (const p of pk) {
        const pos = (p.t - fase) / paso, k = Math.round(pos);
        if (k < 0 || (c.g < 1 && Math.abs(pos - k) > 0.4)) continue;
        const r = ranuras.get(k);
        if (!r || p.s > r.s) ranuras.set(k, { ...p, k });
      }
      let lista = [...ranuras.values()].sort((a, b) => b.s - a.s);
      lista = lista.slice(0, Math.ceil(lista.length * c.guardar)).sort((a, b) => a.k - b.k);
      const cents = lista.map(p => p.c).sort((a, b) => a - b);
      const umbrales = [];
      for (let i = 1; i < c.nL; i++) umbrales.push(cents[Math.floor(cents.length * i / c.nL)] ?? 0);
      const fuerzas = lista.map(p => p.s).sort((a, b) => b - a);
      const corte = c.acordes ? fuerzas[Math.floor(fuerzas.length * c.acordes)] ?? Infinity : Infinity;
      const notas = [];
      let previo = 2;
      for (let i = 0; i < lista.length; i++) {
        const p = lista[i];
        let l = umbrales.filter(u => p.c > u).length;
        if (Math.abs(l - previo) > 2) l = previo + Math.sign(l - previo) * 2;
        previo = l;
        let frets = 1 << l;
        if (p.s >= corte && i % 2 === 0) frets |= 1 << (l + 2 <= c.nL - 1 ? l + 2 : l - 2);
        const time = fase + p.k * paso;
        const sig = i + 1 < lista.length ? fase + lista[i + 1].k * paso : Infinity;
        const end = sig !== Infinity && sig - time >= 2 * beat ? sig - beat * 0.5 : 0;
        notas.push({ time, end, frets, open: false });
      }
      if (notas.length) tracks[dif] = notas;
    }
    return tracks;
  }

  // Convierte a formato .chart para guardarlo en la biblioteca.
  function aTexto(tracks, bpm, fase) {
    const res = 192, beat = 60 / bpm, a = fase + beat;
    const tick = t => Math.round(t < a ? t / a * res : res + (t - a) / beat * res);
    const nombres = { easy: 'EasySingle', medium: 'MediumSingle', hard: 'HardSingle', expert: 'ExpertSingle' };
    let s = `[Song]\n{\n  Resolution = ${res}\n}\n[SyncTrack]\n{\n  0 = TS 4\n  0 = B ${Math.round(60 / a * 1000)}\n  ${res} = B ${Math.round(bpm * 1000)}\n}\n`;
    for (const [dif, notas] of Object.entries(tracks)) {
      s += `[${nombres[dif]}]\n{\n`;
      for (const n of notas) {
        const tk = tick(n.time), largo = n.end ? tick(n.end) - tk : 0;
        for (let l = 0; l < 5; l++) if (n.frets & (1 << l)) s += `  ${tk} = N ${l} ${largo}\n`;
      }
      s += '}\n';
    }
    return s;
  }

  function crear(buf, nombreArchivo) {
    const an = analizar(buf);
    const pk = picos(an.flux, an.dt);
    if (pk.length < 10) throw new Error('no se encontró ritmo en esta canción.');
    for (const p of pk) {
      let s = 0, k = 0;
      for (let j = p.f - 1; j <= p.f + 2; j++) if (j >= 0 && j < an.centro.length) { s += an.centro[j]; k++; }
      p.c = s / k;
    }
    const { bpm, fase } = tempo(an.flux, an.dt);
    const tracks = generar(pk, bpm, fase);
    const beats = [];
    for (let t = fase; t < buf.duration; t += 60 / bpm) beats.push(t);
    const base = nombreArchivo.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/[\\/:*?"<>|]/g, '').trim() || 'Canción';
    const m = base.match(/^(.+?)\s+-\s+(.+)$/);
    const artista = m ? m[1] : '', titulo = m ? m[2] : base;
    return {
      chart: { tracks, beats }, bpm, titulo, artista,
      texto: aTexto(tracks, bpm, fase),
      ini: `[song]\nname = ${titulo}\nartist = ${artista}\ncharter = Alonso Hero (automático)\n`,
    };
  }

  return { crear };
})();
