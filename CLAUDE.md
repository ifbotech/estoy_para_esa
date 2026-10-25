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
- **Estética**: la app es muy visual y animada a propósito (dibujos con CSS,
  motion, papel picado). Cualquier pantalla nueva tiene que estar a la altura:
  nada genérico. Respetá `prefers-reduced-motion` y el multiplicador
  `--mov` del tema.
- **Temas**: los colores, fuentes, radio, grano y movimiento salen de
  variables CSS (`web/src/temas.ts`). No hardcodees colores de tema; las
  personalidades de categoría (`web/src/estilos/personalidades.css`) sí
  tienen su paleta propia.
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

- `web/src/store.ts`: estado en memoria + tiempo real + todas las escrituras.
- `web/src/calculos.ts`: ranking por ganas, sorteo, rachas, Wrapped (con tests).
- `web/src/pantallas/`: Hoy, Planes, PlanDetalle, NuevoPlan, Recuerdos, Wrapped, Más.
- `web/src/secciones/`: lo especial de cada personalidad (cine, lugar, viaje, taller).
- `web/src/componentes/Arte.tsx` + `estilos/arte.css`: los dibujos con CSS.
- `server/`: PocketBase + `$epe.webpush` para los hooks + comando `usuario`.
