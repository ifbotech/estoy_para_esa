# ¡Estoy para esa! ✦

La app de Rocío e Iñaki para no perder ningún plancito: pelis, comidas,
cafecitos, viajes, DIY, salidas y lo que vaya surgiendo. Cada uno marca las
**ganas que tiene** de cada plan, el promedio lo ubica en la lista, y cuando
lo hacen queda con fotos y puntaje. Todo lo que pasa se anota en un diario
del servidor, y dos veces por año (30 de junio y 31 de diciembre) llega el
**Wrapped**, como el de Spotify.

**https://ifbotech.com/estoyparaesa/**: se instala en el inicio del teléfono
(Safari → Compartir → Agregar a inicio).

## Qué hay (v3 · «Brutalismo editorial»)

| | |
|---|---|
| **Sumar** | La puerta de entrada: **nueva aventura**. Elegís la categoría (o lo contás como te salga) y se abre el nuevo plan con eso elegido. Abajo, cuántos planes esperan tus ganas. |
| **Ganas** | Cada uno marca de 0 a 100. **Voto a ciegas**: si el otro ya votó, su número queda tapado hasta que votes vos; al votar se destapa y, si los dos están en 85 o más, sale el sello **¡MATCH TOTAL!**. En la lista, cada plan dice si es 🔥 **Match** (los dos ≥ 80), 🤝 **Consenso** (≤ 20 de diferencia) o 🎁 **Con amor** (≥ 45 de diferencia: uno acompaña al otro). |
| **Sorpréndanme** | Filtros (Todo, En casa, Salir, Rápido), un rodillo que pasa por los planes con más ganas y frena de a poco en 1,4 s, y el boleto ganador con «¡Estamos para esa!» (lo agenda para hoy) o «1 tiro más». |
| **Planes** | **Todos** los pendientes en filas técnicas ordenadas por ganas, con **voto de un toque** abajo de los que te faltan votar (a ciegas) y el filtro «Por votar». Filtrables por estado, categoría y búsqueda (al buscar, cada fila trae su estado como chip que se toca para avanzarlo). Deslizar avanza el estado; doble toque = ¡estoy para esa!; mantener = vista rápida. Abajo, la máquina **«Sorpréndanme»**. |
| **Decidir** | Uno hace una pregunta y cada uno responde **a ciegas** (el servidor no deja ver la del otro hasta que respondieron los dos). Después cada uno elige la que más le copa: si coinciden, queda decidido; si eligen distinto, desempata una moneda; si alguno no se tienta con ninguna, **otra ronda** con opciones nuevas. Avisos push en cada paso y cada decisión va al diario del Wrapped. |
| **Cada plan** | Arriba el título queda fijo al scrollear; abajo, una **barra de acción fija** con lo único que conviene ahora: votar, agendar, tachar lo próximo de la valija o del proyecto, marcarlo hecho, puntuar, subir la foto o escribir la reseña. |
| **Pelis** 🎬 | Ficha técnica, Letterboxd (póster, año, dirección y **promedio de Letterboxd**) y **curaduría de pareja**: quién es más duro, coincidencia crítica, mayor acuerdo y desacuerdo, ustedes vs. Letterboxd. Importa el diario de Letterboxd. |
| **Comida, café y salidas** ☕ | Mapa, Instagram, barrio, **barrios conquistados** y «qué pedir», que después de ir se marca **👍 Repetir / 👎 Pasar**. |
| **Viajes** ✈️ | **Boarding pass** con ida, vuelta, días y `8/12 EN VALIJA`; itinerario por día que se lee sin señal. |
| **DIY** 🔨 | Pasos y materiales con barra segmentada, y el recordatorio de la foto del **antes** al arrancar y del **después** al terminar. |
| **Wrapped** | No está en ningún menú: llega solo el **30/6** (mitad de año) y el **31/12** (año entero), se abre la primera vez y queda abierto 21 días con su ticket en Sumar. El período en historias: total, categorías, mes más intenso, lo que se movieron (ideas, votos, agendados, pasos, fotos, su día de la semana), pelis, curaduría, viajes, barrios, matches totales, collage de fotos, quién es más manija, el plan que los dividió y el **ritmo compartido**. |
| **Avisos** | Todo lo que hace uno le llega al otro al toque: planes nuevos (con el día), ganas a ciegas y matches, agendados y cambios de día, en curso y hecho, ideas, valija, pasos e itinerario (y cuando una lista se completa), fotos, puntajes y reseñas, Decidir paso a paso, categorías nuevas, planes borrados y el Wrapped. Además: «⏰ en un rato» una hora antes de cada plan, «☀️ hoy hay plan» a las 9:30 y, a las 20:00, sólo si hay algo, lo que espera tu respuesta o tus ganas. El ícono muestra cuántas cosas te esperan. |
| **Más** | Categorías, Letterboxd, avisos push (con prueba y estado de cada teléfono) y el **Archivo** de versiones. Nada más. |

Todo es **en tiempo real**: lo que carga uno le aparece al otro al instante.
Y anda **sin señal**: los planes, viajes y valijas quedan guardados en el
teléfono, y los cambios se mandan al volver.

## Cómo está hecho

```
web/        la app (React + Vite + TypeScript, PWA con service worker)
pb/         migraciones y hooks de PocketBase (JS)
server/     el binario: PocketBase + avisos Web Push + comando `usuario` (Go)
deploy/     instalación del VPS y bloque de Caddy
.github/    probar en cada push, publicar lo que llega a main
docs/       despliegue y operación
```

- **PocketBase** (SQLite) guarda todo, sirve la app y manda el tiempo real.
- **Rutas con `#`** y base relativa: el mismo build anda en `/estoyparaesa/`
  y en cada versión archivada (`/estoyparaesa/archivo/v1/`).
- **Diseño fijo**: desde la v3 hay un solo sistema neo-brutalista, con sus
  tokens en `:root` (`web/src/estilos/base.css`). Ya no hay editor de temas;
  la colección `temas` sigue en la base sólo para las versiones archivadas.
- **UI optimista**: votar, arrastrar las ganas o tildar se ve al instante y
  se manda junto un ratito después (`web/src/store.ts`); lo que vuelve por
  tiempo real se mezcla con lo pendiente para que nada parpadee.
- **Sin señal**: el service worker (`web/src/sw.ts`) guarda la app, la
  última copia de los datos (red primero, 4 s) y las fotos.
- **Actualizaciones**: cada versión nueva se instala sola y recarga la app;
  la app pregunta si hay una nueva cada vez que vuelve a primer plano.
- **Fotos**: se achican en el teléfono a 1600 px en JPEG antes de subir.

## Desarrollo

```bash
npm install
npm test            # cálculos (ranking, simetría, sello, ritmo, curaduría, Wrapped…)
npm run build       # tipos + build en dist/

# servidor (Go 1.24+; baja la toolchain que pide go.mod)
cd server && go build -o ../estoyparaesa . && cd ..
EPE_PASSWORD=prueba1234 ./estoyparaesa usuario --dir pb/pb_data --migrationsDir pb/pb_migrations --slug inaki --nombre Iñaki --email ifbarnetche@gmail.com
EPE_PASSWORD=prueba1234 ./estoyparaesa usuario --dir pb/pb_data --migrationsDir pb/pb_migrations --slug rocio --nombre Rocío --email rocio@estoyparaesa.app
./estoyparaesa serve --dir pb/pb_data --migrationsDir pb/pb_migrations --hooksDir pb/pb_hooks --publicDir dist

npm run dev         # http://localhost:5173 (le pasa /api al 8095)
```

## Ramas

- `main`: producción. Cada push se publica solo.
- `inaki` y `rocio`: el espacio de cada uno, con su propia sesión de Claude.
  Se pasa a `main` con un PR.

Despliegue, VPS y operación: [docs/despliegue.md](docs/despliegue.md).
