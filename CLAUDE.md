# Estoy para esa: guía para Claude

App compartida de Rocío e Iñaki para guardar y seguir sus plancitos. Leé
`README.md` (qué hay y cómo está hecho) y `docs/despliegue.md` (VPS).

## Reglas de la casa

- **Ramas**: `main` es producción (cada push se publica en
  https://ifbotech.com/estoyparaesa/). `inaki` y `rocio` son de cada uno; cada
  uno trabaja con su propia sesión de Claude. A `main` se llega por PR, salvo
  que te pidan explícitamente pushear directo.
- **Commits**: salen a nombre de la persona de la sesión (git config del
  repo). **Nunca** agregues `Co-Authored-By` ni otra firma de Claude en los
  commits ni en los PR.
- **Idioma**: todo en español rioplatense (código, comentarios, textos de la
  app, commits). Voseo en la interfaz.
- **Estética (v3, «Brutalismo editorial»)**: neo-brutalismo calmo y legible.
  Papel y tinta, `border: 2px solid var(--tinta)`, sombras duras sin
  desenfoque (`--sombra` 4 px, `--sombra-chica` 2 px), radio de 6 px en todo,
  números en monoespaciada (`.num`), cabezales de bloque en mayúsculas. Lo
  que se toca se hunde (`:active` → `translate(2px, 2px)` y sombra 0, 80 ms).
  **Nada se mueve solo**: sin marquesinas, sin cosas flotando, sin
  inclinaciones (sólo las Polaroids, 1° como mucho), sin grano. Los
  personajes (`Arte.tsx`) son un detalle quieto adentro de un bloque.
  Controles de 44 × 44 px como mínimo. Respetá `prefers-reduced-motion` y el
  multiplicador `--mov`.
- **Diseño fijo**: no hay temas ni editor de temas. Los tokens viven en
  `:root` (`web/src/estilos/base.css`): no hardcodees colores fuera de ahí.
  Cada categoría trae su color de la base (`--cc`), y se usa en pills,
  cabezales y barras, nunca de fondo de pantalla entera. La colección
  `temas` queda en la base sólo por las versiones archivadas.
- **Versiones visuales**: cuando se arranca un rediseño grande, agregá una
  entrada nueva arriba en `web/src/versiones.json` (`v2`, `v3`…) para que la
  anterior quede en el Archivo.

## Antes de pushear

```bash
npm test && npm run build                    # tipos, tests y build
(cd server && go vet ./... && go build -o /tmp/epe .)
```

Para cambios de esquema: una migración nueva en `pb/pb_migrations/`
(nunca editar una que ya corrió en producción), con nombre
`<timestamp>_<que_hace>.js`. En las migraciones los campos van como objetos
(`{ type: "text", name: … }`), salvo en `fields.add(new TextField(…))`.

Los hooks (`pb/pb_hooks/`) corren aislados: lo compartido va en un módulo y
se carga con `require(`${__hooks}/util.js`)` adentro de cada handler.

## Mapa rápido

- `web/src/store.ts`: estado en memoria + tiempo real + todas las escrituras
  (votos e ítems con UI optimista y debounce; arranque tolerante sin señal).
- `web/src/calculos.ts`: ranking por ganas, simetría (match / consenso / por
  amor al arte), voto a ciegas, sorteo con filtros, sello de un recuerdo,
  ritmo compartido, curaduría de pelis, barrios, Wrapped (con tests).
- `web/src/componentes/Deco.tsx`: las piezas del sistema (Bloque, Segmentos,
  EtiquetaSimetria, Sello, EnVivo). `Controles.tsx`: BarraGanas y
  GanasDeLosDos (voto a ciegas + destape + match).
- `web/src/pantallas/`: Hoy, Planes, PlanDetalle, NuevoPlan, Recuerdos, Wrapped, Más.
- `web/src/secciones/`: lo especial de cada personalidad (cine, lugar, viaje, taller).
- `web/src/componentes/Arte.tsx` + `estilos/arte.css`: los dibujos con CSS.
- `server/`: PocketBase + `$epe.webpush` para los hooks + comando `usuario`.
