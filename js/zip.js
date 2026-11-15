'use strict';
// Lector de archivos .zip (sin librerías). Devuelve Map ruta -> Uint8Array.
const Zip = (() => {
  async function inflar(datos) {
    const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
  }
  async function leer(buf) {
    const d = new DataView(buf);
    let e = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
      if (d.getUint32(i, true) === 0x06054b50) { e = i; break; }
    }
    if (e < 0) throw new Error('el archivo .zip está dañado.');
    const total = d.getUint16(e + 10, true);
    let p = d.getUint32(e + 16, true);
    if (p === 0xFFFFFFFF) throw new Error('el .zip es demasiado grande (ZIP64).');
    const utf8 = new TextDecoder('utf-8');
    const mapa = new Map();
    for (let k = 0; k < total; k++) {
      if (d.getUint32(p, true) !== 0x02014b50) throw new Error('el archivo .zip está dañado.');
      const flags = d.getUint16(p + 8, true), metodo = d.getUint16(p + 10, true);
      const tam = d.getUint32(p + 20, true);
      const ln = d.getUint16(p + 28, true), lx = d.getUint16(p + 30, true), lc = d.getUint16(p + 32, true);
      const local = d.getUint32(p + 42, true);
      const nombre = utf8.decode(new Uint8Array(buf, p + 46, ln)).replace(/\\/g, '/');
      p += 46 + ln + lx + lc;
      if (nombre.endsWith('/')) continue;
      if (flags & 1) throw new Error('el .zip tiene contraseña.');
      const ini = local + 30 + d.getUint16(local + 26, true) + d.getUint16(local + 28, true);
      const crudo = new Uint8Array(buf, ini, tam);
      if (metodo === 0) mapa.set(nombre, crudo);
      else if (metodo === 8) mapa.set(nombre, await inflar(crudo));
    }
    return mapa;
  }
  return { leer };
})();
