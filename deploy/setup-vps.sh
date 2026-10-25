#!/usr/bin/env bash
# Instala Estoy para esa en el VPS. Se corre UNA vez como root (se puede
# repetir: no pisa datos ni contraseñas que no le pidas cambiar).
#
#   curl -fsSL https://raw.githubusercontent.com/ifbotech/estoy_para_esa/main/deploy/setup-vps.sh -o setup-vps.sh
#   less setup-vps.sh        # leelo antes
#   sudo bash setup-vps.sh
#
# Qué hace:
#   1. Carpetas en /var/www/estoyparaesa (del usuario deploy).
#   2. El servicio systemd `estoyparaesa` (PocketBase en 127.0.0.1:8095).
#   3. Permiso para que deploy (GitHub Actions) reinicie ese servicio y nada más.
#   4. El bloque /estoyparaesa en el Caddyfile, validado; si algo falla, lo deja como estaba.
#   5. Las cuentas de Iñaki y Rocío y la del panel de administración.
set -euo pipefail

APP_DIR=/var/www/estoyparaesa
APP_USER=deploy
PUERTO=8095
CADDYFILE=/etc/caddy/Caddyfile
SERVICIO=/etc/systemd/system/estoyparaesa.service
SUDOERS=/etc/sudoers.d/estoyparaesa

verde() { printf '\033[1;32m%s\033[0m\n' "$*"; }
amarillo() { printf '\033[1;33m%s\033[0m\n' "$*"; }
rojo() { printf '\033[1;31m%s\033[0m\n' "$*"; }
preguntar() { local r; read -r -p "$1" r </dev/tty; printf '%s' "$r"; }
preguntar_oculto() { local r; read -r -s -p "$1" r </dev/tty; echo >&2; printf '%s' "$r"; }

[ "$(id -u)" -eq 0 ] || { rojo "Corré este script como root (sudo bash setup-vps.sh)."; exit 1; }
id "$APP_USER" >/dev/null 2>&1 || { rojo "No existe el usuario $APP_USER (es el de GitHub Actions)."; exit 1; }

# --- 1. carpetas --------------------------------------------------------------
verde "1/5 Carpetas"
mkdir -p "$APP_DIR"/{releases,archivo,pb_data}
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 750 "$APP_DIR/pb_data"
# Para leer los logs del servicio sin sudo: journalctl -u estoyparaesa
usermod -aG systemd-journal "$APP_USER"

# --- 2. servicio --------------------------------------------------------------
verde "2/5 Servicio systemd"
cat >"$SERVICIO" <<EOF
[Unit]
Description=Estoy para esa (PocketBase en 127.0.0.1:$PUERTO)
After=network-online.target
Wants=network-online.target
# Hasta que GitHub Actions suba la primera versión no hay nada para arrancar.
ConditionPathExists=$APP_DIR/current/bin/estoyparaesa

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=$APP_DIR/current/bin/estoyparaesa serve --http=127.0.0.1:$PUERTO --dir=$APP_DIR/pb_data --publicDir=$APP_DIR/current/pb_public --hooksDir=$APP_DIR/current/pb_hooks --migrationsDir=$APP_DIR/current/pb_migrations
Restart=always
RestartSec=3
LimitNOFILE=8192
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR/pb_data
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable estoyparaesa >/dev/null

# --- 3. permiso para reiniciar ------------------------------------------------
verde "3/5 Permiso de reinicio para $APP_USER"
SYSTEMCTL="$(command -v systemctl)"
cat >"$SUDOERS.tmp" <<EOF
# GitHub Actions (usuario $APP_USER) sólo puede reiniciar este servicio.
$APP_USER ALL=(root) NOPASSWD: $SYSTEMCTL restart estoyparaesa
EOF
[ "$SYSTEMCTL" = /usr/bin/systemctl ] || echo "$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart estoyparaesa" >>"$SUDOERS.tmp"
chmod 440 "$SUDOERS.tmp"
visudo -cf "$SUDOERS.tmp" >/dev/null
mv "$SUDOERS.tmp" "$SUDOERS"

# --- 4. Caddy -----------------------------------------------------------------
verde "4/5 Caddy: ifbotech.com/estoyparaesa"
if [ ! -f "$CADDYFILE" ]; then
  amarillo "No encontré $CADDYFILE. Agregá a mano el bloque de deploy/Caddyfile.estoyparaesa."
elif grep -q "estoyparaesa" "$CADDYFILE"; then
  echo "El Caddyfile ya tiene el bloque de Estoy para esa."
else
  RESPALDO="$CADDYFILE.antes-de-estoyparaesa.$(date +%Y%m%d%H%M%S)"
  cp "$CADDYFILE" "$RESPALDO"
  # Va antes del `handle {` final que manda todo a la app principal
  # (`handle` es excluyente: el primero que coincide gana).
  awk -v puerto="$PUERTO" '
    !hecho && /^[[:space:]]*(# La app principal|handle[[:space:]]*\{)/ {
      print "\t# Estoy para esa (github.com/ifbotech/estoy_para_esa)"
      print "\tredir /estoyparaesa /estoyparaesa/ 308"
      print "\thandle_path /estoyparaesa/* {"
      print "\t\treverse_proxy 127.0.0.1:" puerto
      print "\t}"
      print ""
      hecho = 1
    }
    { print }
    END { if (!hecho) exit 3 }
  ' "$RESPALDO" >"$CADDYFILE.nuevo" || { rm -f "$CADDYFILE.nuevo"; rojo "No encontré dónde insertar el bloque: agregalo a mano (deploy/Caddyfile.estoyparaesa)."; exit 1; }
  if caddy validate --config "$CADDYFILE.nuevo" --adapter caddyfile >/dev/null 2>&1; then
    mv "$CADDYFILE.nuevo" "$CADDYFILE"
    chown --reference="$RESPALDO" "$CADDYFILE"
    chmod --reference="$RESPALDO" "$CADDYFILE"
    if systemctl reload caddy; then
      echo "Caddy recargado (respaldo en $RESPALDO)."
    else
      cp "$RESPALDO" "$CADDYFILE"
      systemctl reload caddy || true
      rojo "Caddy no quiso recargar: dejé el Caddyfile como estaba."
      exit 1
    fi
  else
    rm -f "$CADDYFILE.nuevo"
    rojo "El Caddyfile nuevo no validó: no toqué nada. Agregá a mano el bloque de deploy/Caddyfile.estoyparaesa."
    exit 1
  fi
fi

# --- 5. cuentas y arranque ----------------------------------------------------
verde "5/5 Cuentas y arranque"
BIN="$APP_DIR/current/bin/estoyparaesa"
if [ ! -x "$BIN" ]; then
  amarillo "Todavía no hay ninguna versión subida. Hacé push a main (o corré el workflow"
  amarillo "«Probar y publicar» en GitHub) y después volvé a correr este script."
  exit 0
fi

pb() { sudo -u "$APP_USER" -H env EPE_PASSWORD="${EPE_PASSWORD:-}" "$BIN" "$@" --dir="$APP_DIR/pb_data" --migrationsDir="$APP_DIR/current/pb_migrations" --hooksDir="$APP_DIR/current/pb_hooks"; }

if [ "$(preguntar '¿Crear o actualizar las cuentas ahora? [S/n] ')" != "n" ]; then
  cuenta() {
    local slug="$1" nombre="$2" email_def="$3" color="$4" email clave
    email="$(preguntar "Email de $nombre [$email_def]: ")"; email="${email:-$email_def}"
    clave="$(preguntar_oculto "Contraseña de $nombre (Enter = no cambiarla): ")"
    EPE_PASSWORD="$clave" pb usuario --slug "$slug" --nombre "$nombre" --email "$email" --color "$color"
  }
  cuenta inaki "Iñaki" "ifbarnetche@gmail.com" "#ff4fa3"
  cuenta rocio "Rocío" "rocio@estoyparaesa.app" "#c6ff3d"

  if [ "$(preguntar '¿Crear o actualizar la cuenta del panel de administración? [S/n] ')" != "n" ]; then
    ADMIN="$(preguntar 'Email del panel [admin@ifbotech.com]: ')"; ADMIN="${ADMIN:-admin@ifbotech.com}"
    CLAVE="$(preguntar_oculto 'Contraseña del panel (10+ caracteres): ')"
    sudo -u "$APP_USER" -H "$BIN" superuser upsert "$ADMIN" "$CLAVE" --dir="$APP_DIR/pb_data" >/dev/null
    echo "Panel: https://ifbotech.com/estoyparaesa/_/"
  fi
fi

systemctl restart estoyparaesa
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PUERTO/api/epe/salud" >/dev/null 2>&1; then
    verde "Listo: https://ifbotech.com/estoyparaesa/"
    exit 0
  fi
  sleep 1
done
rojo "El servicio no responde. Mirá: journalctl -u estoyparaesa -n 50"
exit 1
