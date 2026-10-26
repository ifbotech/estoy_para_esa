package main

import (
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/router"
)

// servirApp sirve la app web de pb_public.
//
// No usa apis.Static porque ese redirige con rutas absolutas ("/index.html"
// → "/"), y detrás de Caddy la app vive en /estoyparaesa/: la redirección
// terminaba en la home de ifbotech.com. Peor: era un 301 y el service worker
// la guardaba como si fuera la app. Acá nunca se redirige a una ruta absoluta.
func servirApp(e *core.RequestEvent, fsys fs.FS) error {
	nombre := strings.TrimPrefix(path.Clean("/"+e.Request.PathValue("path")), "/")
	if nombre == "" || nombre == "." {
		nombre = router.IndexPage
	}

	fi, err := fs.Stat(fsys, nombre)
	if err == nil && fi.IsDir() {
		// Una carpeta sin barra final (archivo/v1): las rutas relativas de su
		// index.html se romperían. Redirección relativa, que respeta el prefijo.
		if !strings.HasSuffix(e.Request.URL.Path, "/") {
			return e.Redirect(http.StatusFound, path.Base(nombre)+"/")
		}
		nombre = path.Join(nombre, router.IndexPage)
		fi, err = fs.Stat(fsys, nombre)
	}

	if err != nil {
		// Rutas sin extensión van a la app; un archivo que no existe es 404,
		// para no cachear la app en lugar de un script o una imagen.
		if path.Ext(nombre) == "" {
			return e.FileFS(fsys, router.IndexPage)
		}
		return router.ErrFileNotFound
	}

	return e.FileFS(fsys, nombre)
}
