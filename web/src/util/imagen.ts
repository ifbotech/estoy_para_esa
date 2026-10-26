/** El tamaño final de una foto: el lado mayor queda en `lado` como mucho. */
export function medidas(ancho: number, alto: number, lado = 1600): { ancho: number; alto: number; escala: number } {
  const escala = Math.min(1, lado / Math.max(ancho, alto))
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala), escala }
}

/**
 * Achica y comprime una foto en el teléfono antes de subirla: las de la
 * cámara pesan 4-8 MB y para la app alcanza con 1600 px de lado en JPEG
 * (unos 300-500 KB). Sube rápido con datos móviles y no infla la base.
 * Si algo falla, sube la original.
 */
export async function achicar(archivo: File, lado = 1600, calidad = 0.82): Promise<File> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/gif") return archivo
  try {
    const bmp = await createImageBitmap(archivo, { imageOrientation: "from-image" })
    const { escala, ancho: w, alto: h } = medidas(bmp.width, bmp.height, lado)
    if (escala === 1 && archivo.size < 600 * 1024) return archivo
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", calidad))
    if (!blob || blob.size >= archivo.size) return archivo
    return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" })
  } catch {
    return archivo
  }
}

export function elegirArchivos(multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.multiple = multiple
    input.onchange = () => resolve(Array.from(input.files ?? []))
    input.click()
  })
}
