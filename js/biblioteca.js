'use strict';
// Biblioteca de canciones guardada dentro del propio juego (almacenamiento privado del navegador).
const Biblioteca = (() => {
  const NOTAS = /^notes\.(chart|mid|midi)$/i;
  const AUDIO = /\.(ogg|opus|mp3|wav|m4a|flac)$/i;
  let raiz = null;

  async function dir() {
    if (!raiz) {
      const r = await navigator.storage.getDirectory();
      raiz = await r.getDirectoryHandle('canciones', { create: true });
      try { if (navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* opcional */ }
    }
    return raiz;
  }
  const limpiar = s => (s || '').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 80) || 'Canción';
  async function existe(d, nombre) {
    try { await d.getDirectoryHandle(nombre); return true; } catch (e) { return false; }
  }

  // archivos: Map ruta -> Blob/File/Uint8Array. Devuelve cuántas canciones se añadieron.
  async function importar(archivos, nombreBase) {
    const carpetas = new Map();
    for (const [ruta, dato] of archivos) {
      const partes = ruta.split('/').filter(Boolean);
      if (partes.includes('__MACOSX')) continue;
      const nombre = partes.pop();
      const clave = partes.join('/');
      if (!carpetas.has(clave)) carpetas.set(clave, new Map());
      carpetas.get(clave).set(nombre, dato);
    }
    const r = await dir();
    let n = 0;
    for (const [ruta, archivosCarpeta] of carpetas) {
      if (![...archivosCarpeta.keys()].some(f => NOTAS.test(f))) continue;
      const base = limpiar(ruta.split('/').pop() || nombreBase);
      let nombre = base, i = 2;
      while (await existe(r, nombre)) nombre = `${base} (${i++})`;
      const d = await r.getDirectoryHandle(nombre, { create: true });
      for (const [f, dato] of archivosCarpeta) {
        if (!(NOTAS.test(f) || AUDIO.test(f) || /^song\.ini$/i.test(f))) continue;
        const w = await (await d.getFileHandle(f, { create: true })).createWritable();
        await w.write(dato);
        await w.close();
      }
      n++;
    }
    return n;
  }

  async function listar() {
    const r = await dir();
    const lista = [];
    for await (const [nombre, h] of r.entries()) {
      if (h.kind !== 'directory') continue;
      let ini = {};
      try {
        for await (const [f, fh] of h.entries()) {
          if (fh.kind === 'file' && /^song\.ini$/i.test(f)) ini = Charts.leerIni(Charts.texto(await (await fh.getFile()).arrayBuffer()));
        }
      } catch (e) { /* sin song.ini */ }
      lista.push({ id: nombre, titulo: ini.name || nombre, artista: ini.artist || '', dir: h });
    }
    return lista.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  }

  async function cargar(c, ctxAudio) {
    const arch = {};
    for await (const [n, h] of c.dir.entries()) if (h.kind === 'file') arch[n.toLowerCase()] = h;
    const h = arch['notes.mid'] || arch['notes.midi'] || arch['notes.chart'];
    if (!h) throw new Error('Esta canción no tiene notas (notes.chart o notes.mid).');
    const buf = await (await h.getFile()).arrayBuffer();
    const chart = /\.chart$/i.test(h.name) ? Charts.leerChart(buf) : Charts.leerMidi(buf);
    const buffers = [];
    for (const [n, fh] of Object.entries(arch)) {
      if (!AUDIO.test(n) || /^(preview|crowd)\./.test(n)) continue;
      try { buffers.push(await ctxAudio.decodeAudioData(await (await fh.getFile()).arrayBuffer())); }
      catch (e) { console.warn('Audio no válido:', n, e); }
    }
    if (!buffers.length) throw new Error('No se pudo leer la música de esta canción.');
    return { chart, buffers };
  }

  async function borrar(id) { await (await dir()).removeEntry(id, { recursive: true }); }

  return { importar, listar, cargar, borrar };
})();
