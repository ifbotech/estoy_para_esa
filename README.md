# ¡Estoy para esa! ✦

La app de Rocío e Iñaki para no perder ningún plancito: pelis, comidas,
cafecitos, viajes, DIY, salidas y lo que vaya surgiendo. Cada uno marca las
**ganas que tiene** de cada plan, el promedio lo ubica en la lista, y cuando
lo hacen queda como recuerdo con fotos, puntaje y todo, hasta el **Wrapped**
de fin de año.

**https://ifbotech.com/estoyparaesa/**: se instala en el inicio del teléfono
(Safari → Compartir → Agregar a inicio).

## Qué hay

| | |
|---|---|
| **Hoy** | Título que salta, dibujos hechos con CSS que se revolean con el dedo, cintas que corren, el top de ganas, la tragamonedas «Sorpréndanme», lo agendado, las categorías y el último recuerdo. |
| **Planes** | Ordenados por el promedio de ganas, filtrables por estado (Idea, Agendado, En curso, Hecho), categoría y búsqueda. |
| **Cada plan** | La personalidad visual de su categoría, los cuatro estados, las dos barras de ganas, el puntaje cuando está hecho, notas, link y fotos. |
| **Pelis** 🎬 | Letterboxd: pegás el link y trae póster, año y dirección. Se puede importar el diario de Letterboxd. |
| **Comida, café y salidas** ☕ | Google Maps (mapa embebido), Instagram, barrio y «qué pedir». |
| **Viajes** ✈️ | Boleto con destino, país, fechas y si es al exterior, mapa, itinerario por día y valija. |
| **DIY** 🔨 | Pasos con progreso, materiales y el antes y después deslizable. |
| **Recuerdos** | Línea de tiempo de polaroids con todo lo hecho. |
| **Wrapped** | Historias animadas del año: total, categoría top, mes más intenso, pelis, % de viajes al exterior, lugares, quién es más manija, el plan que los dividió, rachas… |
| **Más** | Editor de tema (colores, letras, grano, movimiento; cada versión queda guardada), **Archivo** de versiones de la app y de los temas, categorías propias, Letterboxd, avisos push. |

Todo es **en tiempo real**: lo que carga uno le aparece al otro al instante.

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
- **Temas**: variables CSS en `:root`. Están en la colección `temas`, con
  número de versión. Hay uno activo y es compartido.

## Desarrollo

```bash
npm install
npm test            # cálculos (ranking, rachas, Wrapped)
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
