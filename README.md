# Alonso Hero

Juego de ritmo rockero para Windows: toca las notas de colores con el teclado, un mando o una guitarra de juguete.

*A rock rhythm game for Windows. Play the colored notes with a keyboard, a gamepad or a toy guitar controller. Free and open source (MIT).*

## Características

- **Listo para jugar:** trae 5 canciones de rock originales, cada una en 4 dificultades (Fácil, Normal, Difícil y Experto).
- **Tus propias canciones:** elige un MP3 y el juego crea las notas automáticamente. También acepta canciones en formato `.chart` / `.mid` (por ejemplo, los `.zip` de la comunidad de Clone Hero).
- **Controles sin complicaciones:** el teclado y los mandos o guitarras de Xbox funcionan directamente. Cualquier otro mando se configura una sola vez con «pulsa el botón VERDE…».
- **Para niños:** no se pierde la partida y rasguear es opcional; basta con pulsar el botón cuando llega la nota.

## Instalación

1. Descarga `AlonsoHero-Instalador-X.Y.Z.exe` desde [Releases](https://github.com/apiwa-dev/alonso-hero/releases).
2. Ábrelo y sigue el asistente. No necesita permisos de administrador.
3. Juega desde el icono del escritorio o del menú Inicio.

Para desinstalarlo: **Configuración → Aplicaciones → Alonso Hero → Desinstalar**.

Requisitos: Windows 10 u 11, con Microsoft Edge (viene incluido en Windows).

## Cómo jugar

| | Botones | Rasgueo (opcional) | Pausa |
|---|---|---|---|
| Teclado | A S D F G (o 1 2 3 4 5) | Espacio, Enter o flechas | Esc |
| Mando Xbox | A, B, Y, X, LB | Cruceta | Start |

Pulsa el botón del color cuando la nota llega a la línea. En **Controles** puedes probar los botones y ajustar el retraso del sonido (útil con auriculares Bluetooth).

## Añadir canciones

- **La forma más fácil:** copia tus MP3 en la carpeta `musica` del juego (`%LOCALAPPDATA%\Programs\Alonso Hero\musica`). La próxima vez que abras el juego aparecerán en la lista.
- **Desde el juego:** Añadir canciones → Elegir MP3 (o arrastra el archivo a la ventana).
- Las notas automáticas siguen el ritmo de la música, pero son aproximadas; las canciones hechas a mano (`.chart` / `.mid`) son más precisas.

## Cómo funciona

Es un juego web (HTML, CSS y JavaScript, sin dependencias externas) que se abre en una ventana de Edge en modo aplicación. Un mini servidor en PowerShell (`servidor.ps1`) sirve los archivos solo en `127.0.0.1:47823` y se cierra al salir del juego.

| Archivo | Qué hace |
|---|---|
| `js/juego.js` | Partida: mástil, notas, aciertos y puntuación |
| `js/charts.js` | Lectura de canciones `.chart` y `.mid` |
| `js/autochart.js` | Crea notas a partir de un audio (detección de golpes y tempo) |
| `js/demo.js` | Canciones originales incluidas (música generada por código) |
| `js/controles.js` | Teclado, mandos y guitarras |
| `js/escenario.js` | Escenario animado: público, luces y fuego |
| `instalador/alonso-hero.iss` | Instalador (Inno Setup) |

Pruebas: con el servidor en marcha, abre `http://127.0.0.1:47823/pruebas/test.html`.

## Privacidad / Privacy

Alonso Hero no recopila ni envía ningún dato. Todo funciona en tu equipo: el mini servidor solo acepta conexiones desde el propio equipo (`127.0.0.1`) y las canciones y récords se guardan en el almacenamiento local del navegador.

*Alonso Hero does not collect or transmit any data. Everything runs locally: the built-in server only listens on `127.0.0.1`, and songs and scores are stored in the browser's local storage.*

## Política de firma de código / Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

| Rol / Role | Miembros / Members |
|---|---|
| Committers and reviewers | [apiwa-dev](https://github.com/apiwa-dev) |
| Approvers | [apiwa-dev](https://github.com/apiwa-dev) |

Los instaladores se compilan desde este repositorio con GitHub Actions (`.github/workflows/construir.yml`). Cada versión firmada se aprueba manualmente.

*Installers are built from this repository by GitHub Actions. Every signed release is approved manually.*

## Licencia

[MIT](LICENSE)
