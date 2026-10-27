// El servidor de Estoy para esa: PocketBase con los hooks y migraciones en JS
// (../pb), la app web servida desde pb_public y dos cosas que PocketBase no
// trae de fábrica:
//
//   - $epe.notificar / $epe.notificarA / $epe.probarPush para los hooks:
//     avisos push firmados con VAPID, mandados en segundo plano (las claves
//     se generan solas la primera vez, en pb_data/vapid.json). Ver push.go.
//   - el comando `usuario`, para crear o actualizar a Iñaki y a Rocío desde
//     la consola del VPS sin abrir el panel de administración.
package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/dop251/goja"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	"github.com/pocketbase/pocketbase/tools/hook"
	"github.com/pocketbase/pocketbase/tools/osutils"
)

func main() {
	app := pocketbase.New()

	var hooksDir, migrationsDir, publicDir string
	var hooksWatch bool
	flags := app.RootCmd.PersistentFlags()
	flags.StringVar(&hooksDir, "hooksDir", "", "carpeta con los hooks JS")
	flags.StringVar(&migrationsDir, "migrationsDir", "", "carpeta con las migraciones JS")
	flags.StringVar(&publicDir, "publicDir", defaultPublicDir(), "carpeta con la app web")
	flags.BoolVar(&hooksWatch, "hooksWatch", false, "reiniciar al cambiar un hook (sólo para desarrollo)")
	app.RootCmd.ParseFlags(os.Args[1:])

	push := &pusher{app: app}

	jsvm.MustRegister(app, jsvm.Config{
		MigrationsDir: migrationsDir,
		HooksDir:      hooksDir,
		HooksWatch:    hooksWatch,
		OnInit: func(vm *goja.Runtime) {
			vm.Set("$epe", map[string]any{
				"webpush":        push.send,
				"notificar":      push.notificar,
				"notificarA":     push.notificarA,
				"probarPush":     push.probar,
				"vapidPublicKey": push.publicKey,
			})
		},
	})

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		TemplateLang: migratecmd.TemplateLangJS,
		Automigrate:  false,
		Dir:          migrationsDir,
	})

	app.RootCmd.AddCommand(usuarioCmd(app))

	app.OnServe().Bind(&hook.Handler[*core.ServeEvent]{
		Func: func(e *core.ServeEvent) error {
			if !e.Router.HasRoute(http.MethodGet, "/{path...}") {
				fsys := os.DirFS(publicDir)
				e.Router.GET("/{path...}", func(re *core.RequestEvent) error {
					cabecerasEstaticas(re.Response.Header(), re.Request.URL.Path)
					return servirApp(re, fsys)
				})
			}
			return e.Next()
		},
		Priority: 999,
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// cabecerasEstaticas pone caché y seguridad a lo que sale de pb_public. Lo que
// está en assets/ lleva hash en el nombre y se cachea para siempre; el resto
// (index.html, sw.js, el manifest) se revalida siempre, así una versión nueva
// llega apenas se publica.
func cabecerasEstaticas(h http.Header, path string) {
	if strings.Contains(path, "/assets/") {
		h.Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		h.Set("Cache-Control", "no-cache")
	}
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
	// SAMEORIGIN y frame-ancestors 'self': el Archivo muestra las versiones
	// viejas de la app dentro de un iframe del mismo origen.
	h.Set("X-Frame-Options", "SAMEORIGIN")
	h.Set("Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=(), usb=()")
	h.Set("Content-Security-Policy", strings.Join([]string{
		"default-src 'self'",
		"script-src 'self'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https:",
		"font-src 'self' data:",
		"connect-src 'self'",
		"frame-src 'self' https://www.google.com https://maps.google.com",
		"manifest-src 'self'",
		"worker-src 'self' blob:", // el papel picado dibuja en un worker
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'self'",
	}, "; "))
}

func defaultPublicDir() string {
	if osutils.IsProbablyGoRun() {
		return "./pb_public"
	}
	return filepath.Join(os.Args[0], "../pb_public")
}
