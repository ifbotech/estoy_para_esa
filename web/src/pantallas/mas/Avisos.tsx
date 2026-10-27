import { useCallback, useEffect, useState } from "react"
import { avisar } from "../../componentes/Avisos"
import { Boton } from "../../componentes/Controles"
import { Bloque } from "../../componentes/Deco"
import { fecha } from "../../calculos"
import {
  activarPush, asegurarPush, desactivarPush, endpointDeEsteTelefono, misTelefonos, nombreDispositivo, probarPush, useEstadoPush,
  type ResultadoPrueba, type TelefonoSuscripto,
} from "../../util/push"

/** Qué se avisa: todo lo que el otro hace y lo que espera algo de vos. */
const QUE_AVISA = [
  ["✨", "Un plancito nuevo (con el día, si ya viene agendado)"],
  ["🙈", "Que el otro votó sus ganas (sin el número: se vota a ciegas) y los matches totales"],
  ["📅", "Agendado, cambio de día, en curso, hecho o de vuelta a idea"],
  ["⏰", "Una hora antes de cada plan agendado, y a las 9:30 lo que tienen hoy"],
  ["❓", "Decidir: preguntas nuevas, que el otro respondió o eligió, otra ronda y lo decidido"],
  ["💡", "Ideas, valija, pasos e itinerario nuevos, y cuando una lista se completa"],
  ["📸", "Fotos, puntajes y reseñas"],
  ["🏷", "Categorías nuevas y planes borrados"],
  ["🌙", "A las 20:00, sólo si hay algo: lo que espera tu respuesta o tus ganas"],
  ["🎁", "Cuando llega el Wrapped"],
]

function hace(s: string) {
  const d = fecha(s)
  if (!d) return "nunca"
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return "recién"
  if (min < 60) return `hace ${min} min`
  if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}

export function Avisos() {
  const { estado, error } = useEstadoPush()
  const [ocupado, setOcupado] = useState(false)
  const [telefonos, setTelefonos] = useState<TelefonoSuscripto[] | null>(null)
  const [este, setEste] = useState("")
  const [prueba, setPrueba] = useState<ResultadoPrueba[] | null>(null)

  const refrescar = useCallback(async () => {
    setTelefonos(await misTelefonos().catch(() => []))
    setEste(await endpointDeEsteTelefono().catch(() => ""))
  }, [])

  useEffect(() => {
    void asegurarPush().then(refrescar)
  }, [refrescar])

  const activar = async () => {
    setOcupado(true)
    const r = await activarPush()
    setOcupado(false)
    await refrescar()
    if (r === "activo") avisar("Avisos activados 🔔")
    else if (r === "denegado") avisar("El teléfono no dio permiso 🙈", "error")
  }

  const probar = async () => {
    setOcupado(true)
    try {
      const r = await probarPush()
      setPrueba(r.resultados)
      if (!r.enviados) avisar("Este teléfono no está anotado: activá los avisos primero", "error")
      else if (r.ok === r.enviados) avisar(`Mandé la prueba a ${r.enviados === 1 ? "tu teléfono" : `tus ${r.enviados} teléfonos`} 📨`)
      else avisar(`${r.enviados - r.ok} de ${r.enviados} no la recibieron`, "error")
    } catch {
      avisar("No se pudo mandar la prueba", "error")
    }
    setOcupado(false)
    await refrescar()
  }

  return (
    <div className="avisos-ajustes">
      <Bloque titulo="Este teléfono" accion={<span className={`estado-push estado-${estado}`}>{estado === "activo" ? "ON" : estado === "cargando" ? "…" : "OFF"}</span>}>
        {estado === "activo" && <p>Los avisos están andando en este teléfono.</p>}
        {estado === "pedir" && (
          <>
            <p>Activalos para enterarte de todo lo que el otro suma, vota y decide.</p>
            <Boton className="boton-grande" onClick={activar} disabled={ocupado}>
              🔔 Activar avisos
            </Boton>
          </>
        )}
        {estado === "instalar" && (
          <ol className="pasos-instalar">
            <li>Abrí la app en <b>Safari</b>.</li>
            <li>
              Tocá <b>Compartir</b> (el cuadrado con la flecha) → <b>Agregar a inicio</b>.
            </li>
            <li>Abrila desde el ícono y volvé acá: en iPhone, los avisos sólo andan así.</li>
          </ol>
        )}
        {estado === "denegado" && (
          <p>
            El permiso quedó negado. En iPhone: <b>Ajustes → Notificaciones → Estoy para esa</b> y activá «Permitir notificaciones». En Android:
            mantené apretado el ícono → <b>Información de la app → Notificaciones</b>. Después volvé a abrir la app.
          </p>
        )}
        {estado === "no-disponible" && <p>Este navegador no tiene avisos push. Usá la app instalada en el teléfono.</p>}
        {estado === "error" && (
          <>
            <p>Algo falló al activar los avisos{error ? `: ${error}` : ""}.</p>
            <Boton className="boton-grande" onClick={activar} disabled={ocupado}>
              Reintentar
            </Boton>
          </>
        )}
        {estado === "activo" && (
          <div className="fila">
            <Boton className="boton-chico" onClick={probar} disabled={ocupado}>
              📨 Mandar una prueba
            </Boton>
            <Boton
              variante="secundario"
              className="boton-chico"
              disabled={ocupado}
              onClick={async () => {
                if (!confirm("¿Dejar de recibir avisos en este teléfono?")) return
                await desactivarPush()
                await refrescar()
              }}
            >
              Apagar en este teléfono
            </Boton>
          </div>
        )}
      </Bloque>

      <Bloque titulo="Tus teléfonos" accion={<span className="num">{telefonos?.length ?? "…"}</span>}>
        {telefonos && !telefonos.length && <p className="suave">Ninguno todavía: activá los avisos en cada teléfono donde la uses.</p>}
        <ul className="telefonos">
          {telefonos?.map((t) => {
            const r = prueba?.find((x) => x.id === t.id)
            const mal = Boolean(t.ultimo_error) || (r && !r.ok)
            return (
              <li key={t.id} className={mal ? "mal" : t.ultimo_ok ? "bien" : ""}>
                <span className="telefono-nombre">
                  {nombreDispositivo(t.dispositivo)}
                  {t.endpoint === este && <span className="chip-cat">este</span>}
                </span>
                <span className="telefono-estado num">
                  {r ? (r.ok ? "✓ prueba enviada" : `✗ ${r.error || r.status}`) : t.ultimo_error ? `✗ ${t.ultimo_error}` : t.ultimo_ok ? `✓ último aviso ${hace(t.ultimo_ok)}` : "sin avisos todavía"}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="nota-pie">Si un teléfono deja de andar, el servidor lo saca solo y la app lo vuelve a anotar la próxima vez que se abre.</p>
      </Bloque>

      <Bloque titulo="Qué se avisa">
        <ul className="que-avisa">
          {QUE_AVISA.map(([e, t]) => (
            <li key={t}>
              <span aria-hidden>{e}</span>
              {t}
            </li>
          ))}
        </ul>
        <p className="nota-pie">Nunca te avisa de lo que hiciste vos. Los avisos del mismo plan se reemplazan para no llenarte el teléfono.</p>
      </Bloque>
    </div>
  )
}
