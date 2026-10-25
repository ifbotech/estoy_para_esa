/**
 * Achica una foto antes de subirla: las del teléfono pesan 4-8 MB y para la
 * app alcanza con 2000 px de lado. Si algo falla, sube la original.
 */
export async function achicar(archivo: File, lado = 2000, calidad = 0.85): Promise<File> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/gif") return archivo
  try {
    const bmp = await createImageBitmap(archivo)
    const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height))
    if (escala === 1 && archivo.size < 1.5 * 1024 * 1024) return archivo
    const w = Math.round(bmp.width * escala)
    const h = Math.round(bmp.height * escala)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", calidad))
    if (!blob) return archivo
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
