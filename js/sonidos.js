'use strict';
// Sonidos de la interfaz: rasgueo de guitarra al elegir, clic al moverse y golpe apagado al fallar.
const Sonidos = (() => {
  let ctx = null, dist = null;
  const listo = () => ctx && ctx.state === 'running';
  function usar(c) {
    if (ctx === c) return;
    ctx = c;
    const curva = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) curva[i] = Math.tanh((i / 512 - 1) * 5);
    dist = ctx.createWaveShaper(); dist.curve = curva;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600;
    const v = ctx.createGain(); v.gain.value = 0.2;
    dist.connect(f); f.connect(v); v.connect(ctx.destination);
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function rasgueo(notas, dur, vol) {
    if (!listo()) return;
    const t0 = ctx.currentTime;
    notas.forEach((m, i) => {
      const t = t0 + i * 0.012, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = (Math.random() - 0.5) * 10;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(dist); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function clic(frec, vol, dur) {
    if (!listo()) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(frec, t); o.frequency.exponentialRampToValueAtTime(frec * 0.6, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    usar,
    mover: () => clic(1400, 0.08, 0.05),
    elegir: () => rasgueo([40, 47, 52], 0.7, 0.5),
    atras: () => rasgueo([35, 42], 0.35, 0.35),
    fallo: () => clic(110, 0.25, 0.12),
  };
})();
