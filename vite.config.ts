import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { execSync } from "node:child_process"

// «Nuevo en estoy para esa» (el panel de novedades): cada PR que llegó a main,
// con quién lo hizo (la rama) y cuándo. Sale de git en cada build, así se
// actualiza solo con cada publicación. Sin historial (o sin git) queda vacío.
const QUIENES: Record<string, string> = { rocio: "Rocío", inaki: "Iñaki" }
function cambiosPublicados() {
  try {
    const salida = execSync("git log origin/main --merges --first-parent -n 40 --format=%cI%x1f%s%x1f%b%x1e", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    return salida
      .split("\x1e")
      .map((r) => r.trim())
      .filter(Boolean)
      .flatMap((r) => {
        const [fecha, asunto, cuerpo] = r.split("\x1f")
        const m = /Merge pull request #(\d+) from [^/]+\/(\S+)/.exec(asunto)
        if (!m) return []
        const titulo = (cuerpo || "").trim().split("\n")[0]
        return [{ id: m[1], fecha, quien: QUIENES[m[2]] ?? m[2], titulo: titulo || asunto }]
      })
  } catch {
    return []
  }
}

// La app vive en ifbotech.com/estoyparaesa/ y cada versión vieja queda en
// /estoyparaesa/archivo/<id>/: con base relativa y rutas con # el mismo build
// anda en cualquier carpeta sin tocar el servidor.
export default defineConfig({
  root: "web",
  base: "./",
  define: {
    __CAMBIOS__: JSON.stringify(cambiosPublicados()),
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8095",
      "/_": "http://127.0.0.1:8095",
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "Estoy para esa",
        short_name: "Estoy para esa",
        description: "Todos nuestros plancitos: pelis, comidas, cafecitos, viajes, DIY y lo que surja.",
        lang: "es-AR",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F5F2E8",
        theme_color: "#F5F2E8",
        icons: [
          { src: "iconos/icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "iconos/icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      injectManifest: {
        // El service worker sale como un script clásico de un solo archivo.
        rollupFormat: "iife",
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
        // Sólo las letras latinas: los demás alfabetos se bajan si alguna vez hacen falta.
        globIgnores: ["**/*-{vietnamese,cyrillic,cyrillic-ext,greek,greek-ext}-*.woff2"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    root: ".",
    include: ["web/src/**/*.test.ts"],
  },
})
