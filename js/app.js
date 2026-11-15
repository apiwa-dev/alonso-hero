'use strict';
(() => {
  const capa = document.getElementById('pantalla');
  const lienzo = document.getElementById('lienzo');
  const fondo = document.getElementById('fondo');
  const gFondo = fondo.getContext('2d');
  const selZip = document.getElementById('selZip');
  const selCarpeta = document.getElementById('selCarpeta');
  const selAudio = document.getElementById('selAudio');
  let audio = null, juego = null, botones = [], sel = 0, alVolver = null, pantalla = '';
  let lista = [], cancion = null, dif = null, ocupado = false, avisoInicio = '', alMarcar = null, autoBot = false;
  const opciones = { ajusteMs: +(localStorage.getItem('ajusteMs') || 0) };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|flac|opus)$/i;

  function asegurarAudio() {
    if (!audio) { audio = new AudioContext({ latencyHint: 'interactive' }); Sonidos.usar(audio); }
    if (audio.state === 'suspended' && !(juego && juego.estado === 'pausa')) audio.resume();
    return audio;
  }
  addEventListener('pointerdown', asegurarAudio);
  addEventListener('keydown', asegurarAudio);
  Controles.reloj = () => (audio ? audio.currentTime : 0);

  function ajustarLienzos() {
    const dpr = window.devicePixelRatio || 1;
    for (const c of [lienzo, fondo]) { c.width = Math.round(innerWidth * dpr); c.height = Math.round(innerHeight * dpr); }
  }
  addEventListener('resize', ajustarLienzos);
  ajustarLienzos();

  // ---------- Menús ----------
  function mostrar(nombre, html, atras, inicial = 0, libre = false) {
    pantalla = nombre; alVolver = atras || null; alMarcar = null;
    capa.innerHTML = libre ? html : `<div class="marco">${html}</div>`;
    capa.hidden = false;
    botones = [...capa.querySelectorAll('button[data-acc]:not([disabled])')];
    sel = Math.min(inicial, Math.max(0, botones.length - 1));
    marcar(true);
  }
  function ocultarMenu() { capa.hidden = true; capa.innerHTML = ''; botones = []; }
  function marcar(desplazar) {
    botones.forEach((b, i) => b.classList.toggle('sel', i === sel));
    if (desplazar && botones[sel]) botones[sel].scrollIntoView({ block: 'nearest' });
    if (alMarcar && botones[sel]) alMarcar(botones[sel]);
  }
  function ejecutar(b) { const f = acciones[b.dataset.acc]; if (f) f(b.dataset.arg); }
  capa.addEventListener('click', e => {
    const b = e.target.closest('button[data-acc]');
    if (b && !b.disabled) { b.blur(); Sonidos.elegir(); ejecutar(b); }
  });
  capa.addEventListener('mousemove', e => {
    const i = botones.indexOf(e.target.closest('button[data-acc]'));
    if (i >= 0 && i !== sel) { sel = i; marcar(false); }
  });
  function menu(ev) {
    const n = botones.length;
    if (ev.accion === 'arriba' || ev.accion === 'izq') { if (n) { sel = (sel - 1 + n) % n; Sonidos.mover(); marcar(true); } }
    else if (ev.accion === 'abajo' || ev.accion === 'der') { if (n) { sel = (sel + 1) % n; Sonidos.mover(); marcar(true); } }
    else if (ev.accion === 'ok') { if (botones[sel]) { Sonidos.elegir(); ejecutar(botones[sel]); } }
    else if (ev.accion === 'atras' || (ev.accion === 'pausa' && pantalla === 'pausa')) { if (alVolver) { Sonidos.atras(); alVolver(); } }
    else if (ev.accion === 'borrar' && pantalla === 'canciones') {
      const b = botones[sel];
      if (b && b.dataset.acc === 'elegir' && !b.dataset.arg.startsWith('inc:')) acciones.borrar(b.dataset.arg);
    }
  }
  function error(msg, volver) {
    acciones.volver = volver;
    mostrar('error', `<h2>¡Uy!</h2><p class="error">${esc(msg)}</p><button class="btn" data-acc="volver">⬅ Volver</button>`, volver);
  }

  function textoMandos() {
    const partes = ['⌨️ Teclado listo'];
    for (const x of Controles.mandos()) partes.push(`🎮 ${esc(x.nombre)} ${x.listo ? 'listo' : '— necesita configurarse (ve a Controles)'}`);
    return partes.join('<br>');
  }

  function modoJuego(si) {
    lienzo.hidden = !si; fondo.hidden = si;
    document.body.classList.toggle('jugando', si);
  }

  // Carátula de disco generada para cada canción (colores y dibujo según su nombre).
  const portadas = {};
  function portadaDisco(id, titulo, artista) {
    if (portadas[id]) return portadas[id];
    let h = 7;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const paletas = [['#7f1d1d', '#f97316'], ['#1e1b4b', '#a855f7'], ['#052e16', '#22c55e'], ['#0c4a6e', '#38bdf8'], ['#422006', '#facc15'], ['#18181b', '#ef4444']];
    const [a, b] = paletas[h % paletas.length];
    const c = document.createElement('canvas');
    c.width = c.height = 400;
    const g = c.getContext('2d');
    const fondo = g.createRadialGradient(200, 160, 10, 200, 200, 300);
    fondo.addColorStop(0, b); fondo.addColorStop(0.45, a); fondo.addColorStop(1, '#000');
    g.fillStyle = fondo; g.fillRect(0, 0, 400, 400);
    const motivo = (h >> 4) % 3;
    g.save();
    if (motivo === 0) {
      g.globalAlpha = 0.25; g.fillStyle = b;
      for (let i = 0; i < 18; i++) { g.beginPath(); g.moveTo(200, 170); g.arc(200, 170, 400, i * Math.PI / 9, i * Math.PI / 9 + 0.12); g.fill(); }
    } else if (motivo === 1) {
      g.fillStyle = '#facc15'; g.shadowColor = '#facc15'; g.shadowBlur = 30;
      g.beginPath(); [[230, 20], [130, 200], [195, 200], [150, 380], [290, 150], [220, 150], [270, 20]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
    } else {
      for (let k = 0; k < 3; k++) {
        const gr = g.createLinearGradient(0, 400, 0, 120);
        gr.addColorStop(0, '#fde047'); gr.addColorStop(0.5, '#f97316'); gr.addColorStop(1, 'rgba(220,38,38,0)');
        g.fillStyle = gr; g.globalAlpha = 0.7;
        g.beginPath(); g.moveTo(0, 400);
        for (let x = 0; x <= 400; x += 20) g.lineTo(x, 300 - k * 50 - Math.abs(Math.sin(x * 0.03 + k * 2 + h)) * 120);
        g.lineTo(400, 400); g.fill();
      }
    }
    g.restore();
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},0.08)`; g.fillRect(Math.random() * 400, Math.random() * 400, 2, 2); }
    g.font = '22px Impact, Arial Black, sans-serif'; g.fillStyle = '#fafafa'; g.textAlign = 'left';
    g.fillText(artista.toUpperCase(), 22, 40);
    g.font = '56px Impact, Arial Black, sans-serif'; g.lineWidth = 8; g.strokeStyle = '#000'; g.lineJoin = 'round';
    const palabras = titulo.toUpperCase().split(/\s+/), lineas = [];
    let linea = '';
    for (const p of palabras) { const prueba = linea ? linea + ' ' + p : p; if (g.measureText(prueba).width > 356 && linea) { lineas.push(linea); linea = p; } else linea = prueba; }
    if (linea) lineas.push(linea);
    lineas.slice(-3).forEach((l, i, arr) => { const y = 380 - (arr.length - 1 - i) * 58; g.strokeText(l, 22, y); g.fillStyle = '#fafafa'; g.fillText(l, 22, y); });
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.strokeRect(8, 8, 384, 384);
    portadas[id] = c.toDataURL('image/jpeg', 0.85);
    return portadas[id];
  }

  const acciones = {};

  acciones.inicio = () => {
    modoJuego(false);
    mostrar('inicio', `
      <div class="portada">
        <img class="logo-img" src="img/logo.svg" alt="Alonso Hero">
        <nav class="menu-rock">
          <button class="btn-rock principal" data-acc="canciones">¡A tocar!</button>
          <button class="btn-rock" data-acc="anadir">Añadir canciones</button>
          <button class="btn-rock" data-acc="controles">Controles</button>
          <button class="btn-rock" data-acc="cerrar">Salir</button>
        </nav>
      </div>
      <p class="pie">${avisoInicio ? `<span class="nuevo">${avisoInicio}</span><br>` : ''}${textoMandos()}</p>`, acciones.cerrar, 0, true);
  };

  acciones.cerrar = () => {
    if (location.protocol === 'http:') fetch('/salir').catch(() => {});
    window.close();
    setTimeout(() => mostrar('adios', '<h2>¡Hasta pronto, rockero!</h2><p>Ya puedes cerrar la ventana (Alt + F4).</p>'), 400);
  };

  acciones.canciones = async () => {
    mostrar('cargando', '<h2>Buscando canciones…</h2>');
    try { lista = await Promise.race([Biblioteca.listar(), new Promise(r => setTimeout(() => r([]), 4000))]); }
    catch (e) { lista = []; console.warn(e); }
    const info = {};
    let n = 0;
    const item = (arg, id, titulo, artista, extra) => {
      info[arg] = { id, titulo, artista, extra };
      return `<button class="fila-cancion" data-acc="elegir" data-arg="${arg}"><span class="fc-num">${String(++n).padStart(2, '0')}</span><span class="fc-tit">${esc(titulo)}</span><span class="fc-art">${esc(artista)}</span></button>`;
    };
    const incluidas = Incluidas.LISTA.map(c => item('inc:' + c.id, 'inc:' + c.id, c.titulo, 'Alonso Hero', `${c.bpm} BPM · Incluida en el juego`)).join('');
    const propias = lista.map((c, i) => item(String(i), c.id, c.titulo, c.artista || 'Canción añadida', 'Añadida por ti')).join('');
    mostrar('canciones', `
      <div class="selector">
        <div class="sel-titulo">Elige tu canción</div>
        <div class="sel-cuerpo">
          <div class="sel-lista">${incluidas}${propias}</div>
          <div class="sel-info" id="selInfo"></div>
        </div>
        <div class="sel-pie"><button class="btn mini" data-acc="inicio">⬅ Volver</button><span>${lista.length ? 'Supr: borrar una canción añadida' : ''}</span></div>
      </div>`, acciones.inicio, 0, true);
    alMarcar = b => {
      const d = info[b.dataset.arg], caja = document.getElementById('selInfo');
      if (!caja || !d) return;
      const recs = Charts.DIFS.map(x => `<div>${NOMBRES_DIF[x]}<b>${(v => (v ? v.toLocaleString('es') : '—'))(+(localStorage.getItem(`record:${d.id}:${x}`) || 0))}</b></div>`).join('');
      caja.innerHTML = `<img class="portada-disco" src="${portadaDisco(d.id, d.titulo, d.artista)}" alt="">
        <div class="info-titulo">${esc(d.titulo)}</div><div class="info-art">${esc(d.artista)} · ${esc(d.extra)}</div>
        <div class="records">${recs}</div>`;
    };
    marcar(true);
  };

  acciones.borrar = async arg => {
    const c = lista[+arg];
    if (!c || !confirm(`¿Borrar «${c.titulo}» del juego?`)) return;
    await Biblioteca.borrar(c.id);
    acciones.canciones();
  };

  acciones.elegir = async arg => {
    if (ocupado) return;
    ocupado = true;
    let c;
    if (arg.startsWith('inc:')) {
      const x = Incluidas.LISTA.find(y => y.id === arg.slice(4));
      c = { id: 'inc:' + x.id, titulo: x.titulo, incluida: x.id };
    } else c = lista[+arg];
    mostrar('cargando', `<h2>${esc(c.titulo)}</h2><p>Afinando las guitarras…</p>`);
    try {
      const a = asegurarAudio();
      c.datos = c.incluida ? await Incluidas.crear(c.incluida) : await Biblioteca.cargar(c, a);
      cancion = c;
      acciones.dificultad();
    } catch (e) { error(e.message, acciones.canciones); }
    finally { ocupado = false; }
  };

  acciones.dificultad = () => {
    modoJuego(false);
    const tr = cancion.datos.chart.tracks;
    const pref = localStorage.getItem('ultimaDif') || 'easy';
    const niveles = { easy: 3, medium: 6, hard: 9, expert: 11 };
    let html = `<h2>${esc(cancion.titulo)}</h2><p class="pista">¿A cuánto subimos el volumen?</p><div class="ampli">`;
    const disponibles = [];
    for (const d of Charts.DIFS) {
      const hay = tr[d] && tr[d].length;
      if (hay) disponibles.push(d);
      const rec = +(localStorage.getItem(`record:${cancion.id}:${d}`) || 0);
      html += `<button class="perilla" data-acc="jugar" data-arg="${d}" ${hay ? '' : 'disabled'} style="--giro:${-135 + niveles[d] / 11 * 270}deg">
        <span class="dial"></span><span class="nivel">${niveles[d]}</span><b>${NOMBRES_DIF[d]}</b><em>${hay ? (rec ? '🏆 ' + rec.toLocaleString('es') : '') : 'No disponible'}</em></button>`;
    }
    html += '</div><button class="btn" data-acc="canciones">⬅ Elegir otra canción</button>';
    mostrar('dificultad', html, acciones.canciones, Math.max(0, disponibles.indexOf(pref)));
  };

  const esperarAudio = () => new Promise(r => {
    const f = () => (audio && audio.state === 'running' ? r() : setTimeout(f, 100));
    f();
  });

  acciones.jugar = async d => {
    dif = d;
    localStorage.setItem('ultimaDif', d);
    const a = asegurarAudio();
    if (a.state !== 'running') {
      mostrar('esperando', '<h2>¡Casi listo!</h2><p>Haz clic o pulsa una tecla para empezar.</p>');
      await esperarAudio();
    }
    ocultarMenu();
    pantalla = 'juego';
    juego = new Juego(lienzo, a, { ...cancion.datos, titulo: cancion.titulo, artista: cancion.artista || 'Alonso Hero' }, d, { ...opciones, teclas: Controles.ETIQUETAS });
    modoJuego(true);
    juego.iniciar();
  };

  function pausar() {
    if (!juego || juego.estado !== 'jugando') return;
    juego.estado = 'pausa';
    audio.suspend();
    mostrar('pausa', `<h2>Pausa</h2>
      <button class="btn" data-acc="continuar">▶ Continuar</button>
      <button class="btn" data-acc="reiniciar">🔄 Empezar de nuevo</button>
      <button class="btn" data-acc="salir">⬅ Salir de la canción</button>`, acciones.continuar);
  }
  acciones.continuar = () => {
    if (!juego || juego.estado !== 'pausa') return;
    ocultarMenu(); pantalla = 'juego';
    audio.resume().then(() => { if (juego) juego.estado = 'jugando'; });
  };
  acciones.reiniciar = async () => {
    if (juego) juego.detener();
    juego = null;
    await audio.resume();
    acciones.jugar(dif);
  };
  acciones.salir = async () => {
    if (juego) juego.detener();
    juego = null;
    await audio.resume();
    acciones.dificultad();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); });

  function terminar() {
    const r = juego.resultados();
    juego = null;
    modoJuego(false);
    const clave = `record:${cancion.id}:${dif}`;
    const nuevo = r.puntos > +(localStorage.getItem(clave) || 0);
    if (nuevo) localStorage.setItem(clave, r.puntos);
    const frase = ['¡Sigue practicando!', '¡Vas bien!', '¡Buen rock!', '¡Eres una estrella!', '¡LEYENDA DEL ROCK!'][r.estrellas - 1];
    mostrar('resultados', `
      <p class="titular">${frase}</p>
      <div class="estrellas">${[0, 1, 2, 3, 4].map(i => `<span class="${i < r.estrellas ? 'est' : 'apagada'}" style="animation-delay:${0.3 + i * 0.25}s">★</span>`).join('')}</div>
      ${nuevo && r.puntos ? '<p class="record">🏆 ¡Nuevo récord!</p>' : ''}
      <p class="dato">${esc(cancion.titulo)} · ${NOMBRES_DIF[dif]}</p>
      <p class="dato">Puntos: <b id="cuenta">0</b></p>
      <p class="dato">Notas acertadas: <b>${r.aciertos} de ${r.total}</b> (${Math.round(r.pct * 100)}%)</p>
      <p class="dato">Mejor combo: <b>${r.maxCombo}</b></p>
      <button class="btn" data-acc="jugar" data-arg="${dif}">🔄 Otra vez</button>
      <button class="btn" data-acc="dificultad">🎚 Cambiar dificultad</button>
      <button class="btn" data-acc="canciones">🎵 Elegir otra canción</button>`, acciones.canciones);
    capa.querySelector('.marco').classList.add('centro');
    const inicioCuenta = performance.now();
    const contar = () => {
      const el = document.getElementById('cuenta');
      if (!el) return;
      const p = Math.min(1, (performance.now() - inicioCuenta) / 1500);
      el.textContent = Math.round(r.puntos * (1 - Math.pow(1 - p, 3))).toLocaleString('es');
      if (p < 1) requestAnimationFrame(contar);
    };
    contar();
  }

  // ---------- Controles ----------
  acciones.controles = () => {
    const m = Controles.mandos();
    const mandos = m.length ? m.map(x => `
      <div class="fila"><span>🎮 ${esc(x.nombre)} — ${x.listo ? (x.personalizado ? 'configurado' : 'listo') : '<b class="error">necesita configurarse</b>'}</span>
      <button class="btn mini" data-acc="calibrar" data-arg="${x.index}">Configurar</button>
      ${x.personalizado ? `<button class="btn mini" data-acc="restablecer" data-arg="${x.index}">Restablecer</button>` : ''}</div>`).join('')
      : '<p class="pista">No hay mandos conectados. Conecta uno y pulsa cualquier botón.</p>';
    mostrar('controles', `
      <h2>Controles</h2>
      <div class="circulos">${[0, 1, 2, 3, 4].map(l => `<span class="circulo" id="c${l}" style="--c:${COLORES[l]}">${Controles.ETIQUETAS[l]}</span>`).join('')}<span class="rasgueo" id="rasg">Rasgueo</span></div>
      <p class="pista">Pulsa los botones para probarlos: los círculos se encienden.</p>
      <p><b>Teclado:</b> A S D F G (o 1 2 3 4 5). Rasguear es opcional: Espacio, Enter o flechas.</p>
      <p><b>Mando Xbox:</b> A verde · B rojo · Y amarillo · X azul · LB naranja. Cruceta para rasguear.</p>
      ${mandos}
      <div class="fila"><span>Retraso del sonido: <b>${opciones.ajusteMs} ms</b></span>
        <button class="btn mini" data-acc="ajuste" data-arg="-10">− 10</button>
        <button class="btn mini" data-acc="ajuste" data-arg="10">+ 10</button></div>
      <p class="pista">Súbelo solo si las notas llegan antes que la música (por ejemplo, con auriculares Bluetooth).</p>
      <button class="btn" data-acc="inicio">⬅ Volver</button>`, acciones.inicio, botones.length);
  };
  acciones.ajuste = d => {
    opciones.ajusteMs = Math.max(-300, Math.min(500, opciones.ajusteMs + +d));
    localStorage.setItem('ajusteMs', opciones.ajusteMs);
    const i = sel; acciones.controles(); sel = i; marcar(true);
  };
  acciones.restablecer = i => { Controles.restablecer(+i); acciones.controles(); };
  acciones.calibrar = i => {
    const pasos = Controles.PASOS;
    Controles.calibrar(+i, {
      paso(k) {
        const p = pasos[k];
        mostrar('calibrar', `
          <h2>Configurar mando (${k + 1} de ${pasos.length})</h2>
          <div class="circulos"><span class="circulo grande on" style="--c:${p.color !== undefined ? COLORES[p.color] : '#a1a1aa'}"></span></div>
          <p class="aviso">Pulsa ${p.texto}</p>
          ${p.opcional ? '<button class="btn" data-acc="saltar">Saltar este paso</button>' : ''}
          <button class="btn" data-acc="cancelarCal">Cancelar</button>`, () => Controles.cancelar());
      },
      fin() { acciones.controles(); },
    });
  };
  acciones.saltar = () => Controles.saltar();
  acciones.cancelarCal = () => Controles.cancelar();

  addEventListener('gamepadconnected', e => {
    if (juego || Controles.calibrando()) return;
    if (Controles.necesitaConfig(e.gamepad)) acciones.calibrar(e.gamepad.index);
    else if (pantalla === 'inicio') acciones.inicio();
    else if (pantalla === 'controles') acciones.controles();
  });
  addEventListener('gamepaddisconnected', () => {
    if (pantalla === 'inicio') acciones.inicio();
    else if (pantalla === 'controles') acciones.controles();
  });

  // ---------- Añadir canciones ----------
  acciones.anadir = () => mostrar('anadir', `
    <h2>Añadir canciones</h2>
    <p><b>¿Tienes un MP3?</b> Elígelo y el juego crea las notas solo.</p>
    <button class="btn grande" data-acc="audio">🎵 Elegir MP3</button>
    <p class="pista">Truco: también puedes dejar los MP3 en la carpeta <b>musica</b> del juego y aparecerán solos la próxima vez que lo abras.</p>
    <p><b>¿Tienes canciones de Clone Hero?</b> (archivos .zip con notas hechas a mano)</p>
    <button class="btn" data-acc="zip">📦 Elegir archivos .zip</button>
    <button class="btn" data-acc="carpeta">📁 Elegir una carpeta con canciones</button>
    <p id="estadoImport" class="pista"></p>
    <button class="btn" data-acc="inicio">⬅ Volver</button>`, acciones.inicio);
  acciones.audio = () => selAudio.click();
  acciones.zip = () => selZip.click();
  acciones.carpeta = () => selCarpeta.click();
  const estado = h => { const p = document.getElementById('estadoImport'); if (p) p.innerHTML = h; };
  const resumen = (n, avisos) => `${n ? `✅ Se ${n === 1 ? 'añadió 1 canción' : `añadieron ${n} canciones`}. Ya puedes jugarlas en «¡A tocar!».` : ''}${avisos.map(a => `<br><span class="error">${esc(a)}</span>`).join('')}`;

  // Crea una canción a partir de un audio (File o Blob con nombre). Devuelve true si se añadió.
  async function cancionDesdeAudio(datos, nombre) {
    const a = asegurarAudio();
    const buf = await a.decodeAudioData(await datos.arrayBuffer());
    const r = AutoChart.crear(buf, nombre);
    const ext = (nombre.match(/\.[^.]+$/) || ['.mp3'])[0].toLowerCase();
    const enc = new TextEncoder();
    return (await Biblioteca.importar(new Map([
      [`${r.titulo}/notes.chart`, enc.encode(r.texto)],
      [`${r.titulo}/song${ext}`, datos],
      [`${r.titulo}/song.ini`, enc.encode(r.ini)],
    ]), r.titulo)) > 0;
  }

  async function importarArchivos(archivos) {
    if (pantalla !== 'anadir') acciones.anadir();
    let total = 0;
    const avisos = [];
    for (let i = 0; i < archivos.length; i++) {
      const f = archivos[i];
      estado(`⏳ Trabajando en «${esc(f.name)}» (${i + 1} de ${archivos.length})… no cierres la ventana.`);
      await new Promise(r => setTimeout(r, 30));
      try {
        if (AUDIO_EXT.test(f.name)) { if (await cancionDesdeAudio(f, f.name)) total++; }
        else if (/\.zip$/i.test(f.name)) {
          const n = await Biblioteca.importar(await Zip.leer(await f.arrayBuffer()), f.name.replace(/\.zip$/i, ''));
          total += n;
          if (!n) avisos.push(`${f.name}: no tiene canciones (le falta notes.chart o notes.mid).`);
        } else if (/\.(rar|7z)$/i.test(f.name)) {
          avisos.push(`${f.name}: este tipo de archivo no se puede abrir aquí. Haz clic derecho sobre él en Windows → «Extraer todo» y luego usa «Elegir una carpeta».`);
        } else avisos.push(`${f.name}: no es un MP3 ni un .zip.`);
      } catch (e) { avisos.push(`${f.name}: ${e.message || 'no se pudo leer.'}`); }
    }
    estado(resumen(total, avisos));
  }
  for (const s of [selZip, selAudio]) {
    s.addEventListener('change', () => { const f = [...s.files]; s.value = ''; if (f.length) importarArchivos(f); });
  }
  selCarpeta.addEventListener('change', async () => {
    const f = [...selCarpeta.files];
    selCarpeta.value = '';
    if (!f.length) return;
    estado('⏳ Añadiendo… no cierres la ventana.');
    try {
      const n = await Biblioteca.importar(new Map(f.map(x => [x.webkitRelativePath || x.name, x])), f[0].webkitRelativePath.split('/')[0]);
      estado(n ? resumen(n, []) : '<span class="error">No se encontraron canciones en esa carpeta (falta notes.chart o notes.mid).</span>');
    } catch (e) { estado(`<span class="error">${esc(e.message)}</span>`); }
  });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => {
    e.preventDefault();
    if (juego) return;
    const f = [...e.dataTransfer.files];
    if (f.length) importarArchivos(f);
  });

  // Carpeta "musica": lo que se deje ahí se añade solo al abrir el juego.
  async function revisarCarpetaMusica() {
    if (location.protocol !== 'http:') return;
    let nombres = [];
    try { nombres = await (await fetch('/lista-musica')).json(); } catch (e) { return; }
    const hechas = new Set(JSON.parse(localStorage.getItem('musicaImportada') || '[]'));
    const nuevas = nombres.filter(n => !hechas.has(n));
    if (!nuevas.length) return;
    let n = 0;
    for (let i = 0; i < nuevas.length; i++) {
      const nombre = nuevas[i];
      avisoInicio = `⏳ Preparando canciones nuevas: ${i + 1} de ${nuevas.length}…`;
      if (pantalla === 'inicio') acciones.inicio();
      try {
        const blob = await (await fetch('/musica/' + encodeURIComponent(nombre))).blob();
        if (/\.zip$/i.test(nombre)) n += await Biblioteca.importar(await Zip.leer(await blob.arrayBuffer()), nombre.replace(/\.zip$/i, ''));
        else if (await cancionDesdeAudio(blob, nombre)) n++;
      } catch (e) { console.warn('No se pudo añadir', nombre, e); }
      hechas.add(nombre);
      localStorage.setItem('musicaImportada', JSON.stringify([...hechas]));
    }
    avisoInicio = n ? `🎉 ¡${n === 1 ? 'Hay 1 canción nueva' : `Hay ${n} canciones nuevas`} para tocar!` : '';
    if (pantalla === 'inicio') acciones.inicio();
  }

  // ---------- Bucle principal ----------
  function bucle() {
    const est = Controles.leer();
    for (const ev of est.eventos) {
      if (juego && juego.estado === 'jugando') {
        if (ev.tipo === 'fret' || ev.tipo === 'rasgueo') juego.entrada(ev);
        else if (ev.tipo === 'menu' && (ev.accion === 'pausa' || (ev.accion === 'atras' && ev.origen === 'teclado'))) pausar();
      } else if (ev.tipo === 'menu') menu(ev);
      else if (pantalla === 'controles' && ev.tipo === 'rasgueo') {
        const r = document.getElementById('rasg');
        if (r) { r.classList.add('on'); setTimeout(() => r.classList.remove('on'), 150); }
      }
    }
    if (juego && autoBot && juego.estado === 'jugando') {
      // Modo demostración (solo pruebas): toca solo.
      const t = juego.ahora();
      for (let i = juego.idx; i < juego.notas.length && juego.notas[i].time < t + 0.03; i++) {
        const n = juego.notas[i];
        if (!n.hit && !n.miss && Math.abs(n.time - t) < 0.03) juego.entrada({ tipo: 'rasgueo', t: audio.currentTime, held: n.frets });
      }
      est.held = juego.sosteniendo.reduce((m, n) => m | n.frets, 0);
    }
    if (juego) {
      juego.held = est.held;
      if (juego.estado === 'jugando') juego.actualizar();
      juego.dibujar();
      if (juego.estado === 'fin') terminar();
    } else {
      const dpr = window.devicePixelRatio || 1;
      gFondo.setTransform(dpr, 0, 0, dpr, 0, 0);
      Escenario.dibujar(gFondo, fondo.width / dpr, fondo.height / dpr, performance.now() / 1000, { intensidad: 0.7 });
      if (pantalla === 'controles') {
        for (let l = 0; l < 5; l++) { const c = document.getElementById('c' + l); if (c) c.classList.toggle('on', !!(est.held & (1 << l))); }
      }
    }
    requestAnimationFrame(bucle);
  }

  // Mantiene vivo el mini servidor local mientras el juego está abierto.
  if (location.protocol === 'http:') setInterval(() => fetch('/ping').catch(() => {}), 30000);

  acciones.inicio();
  requestAnimationFrame(bucle);
  // Textura gastada (grunge) generada una vez para toda la interfaz.
  (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d'), img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 45; }
    g.putImageData(img, 0, 0);
    for (let k = 0; k < 30; k++) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},.35)`; g.lineWidth = Math.random() * 1.5;
      const x = Math.random() * 256, y = Math.random() * 256;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 140, y + (Math.random() - 0.5) * 30); g.stroke();
    }
    document.documentElement.style.setProperty('--grunge', `url(${c.toDataURL()})`);
  })();

  // Solo para pruebas automáticas: ?prueba=juego | canciones | dificultad
  const prueba = (location.search.match(/prueba=(\w+)/) || [])[1];
  autoBot = prueba === 'juego';
  if (prueba === 'juego') acciones.elegir('inc:fuego').then(() => acciones.jugar('expert'));
  else if (prueba === 'canciones') acciones.canciones();
  else if (prueba === 'dificultad') acciones.elegir('inc:trueno');
  else revisarCarpetaMusica().finally(() => Incluidas.precargar());
})();
