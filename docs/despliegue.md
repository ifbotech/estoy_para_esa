# Despliegue

```
 push a main ──► GitHub Actions ──► prueba (tipos, tests, build, migraciones)
                                 └► sube el paquete por SSH (usuario deploy)
                                    └► releases/<fecha>-<commit>/ y current ─► reinicia

 Internet ──HTTPS──► Caddy ──┬── /rootkit*        ──► ROOTLAB            127.0.0.1:8090
                             ├── /estoyparaesa/*  ──► Estoy para esa     127.0.0.1:8095
                             └── todo lo demás    ──► ifbotech-hub       127.0.0.1:3000
```

## En el VPS

| Pieza | Dónde |
|---|---|
| Versiones subidas | `/var/www/estoyparaesa/releases/` (quedan las últimas 5) |
| La activa | `/var/www/estoyparaesa/current` → `releases/…` |
| Datos | `/var/www/estoyparaesa/pb_data/` (SQLite, fotos, claves VAPID, respaldos) |
| Archivo de versiones | `/var/www/estoyparaesa/archivo/<id>/`, servido en `/estoyparaesa/archivo/<id>/` |
| Servicio | `estoyparaesa.service`, usuario `deploy`, sólo en `127.0.0.1:8095` |
| Proxy | bloque `handle_path /estoyparaesa/*` en `/etc/caddy/Caddyfile` |
| Panel de datos | https://ifbotech.com/estoyparaesa/_/ |

## Instalación (una vez)

1. Los secretos del repo (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) ya están
   cargados, y el usuario `deploy` existe con su llave.
2. Push a `main` (o **Actions → Probar y publicar → Run workflow**). La
   primera vez sube los archivos y avisa que falta el servicio.
3. En el VPS, como root:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/ifbotech/estoy_para_esa/main/deploy/setup-vps.sh -o setup-vps.sh
   less setup-vps.sh
   sudo bash setup-vps.sh
   ```

   Crea el servicio, le da a `deploy` permiso para reiniciarlo (sólo eso),
   agrega el bloque al Caddyfile (lo valida antes y deja un respaldo; si algo
   falla no toca nada) y pide las contraseñas de Iñaki, Rocío y el panel.

Desde ahí, cada push a `main` se publica solo.

## Si una versión nueva no arranca

El deploy espera a que responda `/api/epe/salud`; si no responde en 30
segundos, vuelve `current` a la versión anterior y el workflow queda en rojo.
A mano:

```bash
cd /var/www/estoyparaesa
ls -1t releases/                 # la de arriba es la más nueva
ln -sfn releases/<anterior> current && sudo systemctl restart estoyparaesa
journalctl -u estoyparaesa -n 80 # qué pasó
```

## Respaldos

PocketBase hace un respaldo diario (4:30 UTC, quedan 14) en
`pb_data/backups/`, que incluye las fotos y las claves de los avisos. Se
bajan desde el panel (Settings → Backups) o con `scp`. Están en el mismo
disco: conviene bajar uno de vez en cuando.

## Cuentas

```bash
sudo bash setup-vps.sh          # vuelve a preguntar (Enter = no cambiar)
# o directo:
sudo -u deploy EPE_PASSWORD='…' /var/www/estoyparaesa/current/bin/estoyparaesa usuario \
  --dir /var/www/estoyparaesa/pb_data --migrationsDir /var/www/estoyparaesa/current/pb_migrations \
  --slug rocio --nombre Rocío --email rocio@…
```

Se entra con el nombre corto (`inaki`, `rocio`) o el email.

## Versiones de la app (el Archivo)

Cada versión visual de la app tiene un id en `web/src/versiones.json` (la
primera del arreglo es la actual). El deploy copia el build a
`archivo/<id>/`, así que:

- mientras se trabaja en una versión, `archivo/<id>/` se actualiza con cada push;
- para **empezar una versión nueva**, se agrega arriba en `versiones.json`
  (`v2`, nombre, fecha, qué cambia). La anterior queda congelada como estaba
  en su último deploy y se puede abrir desde **Más → Archivo**.

Las versiones viejas usan la misma base de datos: son para mirar. Si un
cambio de esquema rompe alguna, se ve rota, pero los datos no corren peligro.
