import path from "node:path"

import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Almacenamiento de ficheros de proyecto (documentos, fotos, imágenes de catálogo).
 *
 * El bucket es PRIVADO: nunca se exponen URLs públicas. Cada lectura genera una
 * URL firmada de corta duración desde el backend, después de haber comprobado
 * que quien la pide tiene acceso al proyecto.
 */
export const STORAGE_BUCKET = "project-assets"

/** Vida de una URL firmada para visualizar/descargar (1 hora). */
export const SIGNED_URL_TTL_SECONDS = 60 * 60

/** Vida de la URL que devolvemos justo después de subir un fichero (7 días). */
export const UPLOAD_RESPONSE_URL_TTL_SECONDS = 60 * 60 * 24 * 7

/** Tamaño máximo por fichero: 25 MB. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "dwg",
  "dxf",
  "skp",
  "ifc",
])

/** Tipos que jamás deben servirse desde nuestro almacenamiento (ejecutables en navegador). */
const BLOCKED_MIME_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "image/svg+xml",
  "application/javascript",
  "text/javascript",
  "application/x-javascript",
])

export interface UploadValidation {
  ok: boolean
  reason?: string
}

export function validateUpload(fileName: string, mimeType: string, sizeBytes: number): UploadValidation {
  const extension = path.extname(fileName ?? "").replace(".", "").toLowerCase()
  const normalizedMime = (mimeType ?? "").toLowerCase().split(";")[0].trim()

  if (sizeBytes <= 0) {
    return { ok: false, reason: "El fichero está vacío." }
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: `El fichero supera el límite de ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` }
  }
  if (BLOCKED_MIME_TYPES.has(normalizedMime)) {
    return { ok: false, reason: "Tipo de fichero no permitido." }
  }
  if (extension && !ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, reason: `Extensión .${extension} no permitida.` }
  }
  if (!extension && !normalizedMime.startsWith("image/") && normalizedMime !== "application/pdf") {
    return { ok: false, reason: "No se reconoce el tipo de fichero." }
  }
  return { ok: true }
}

function isNotFound(error: unknown) {
  return String((error as { message?: string })?.message ?? error)
    .toLowerCase()
    .includes("not found")
}

function alreadyExists(error: unknown) {
  return String((error as { message?: string })?.message ?? error)
    .toLowerCase()
    .includes("exists")
}

/**
 * Garantiza que el bucket existe y es privado. Si alguna vez se dejó público,
 * lo vuelve a cerrar.
 */
export async function ensurePrivateStorageBucket(supabase: SupabaseClient) {
  const { data: bucket, error } = await supabase.storage.getBucket(STORAGE_BUCKET)

  if (bucket) {
    if (bucket.public) {
      const { error: updateError } = await supabase.storage.updateBucket(STORAGE_BUCKET, { public: false })
      if (updateError) throw updateError
    }
    return
  }

  if (error && !isNotFound(error)) {
    throw error
  }

  const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: false })
  if (createError && !alreadyExists(createError)) {
    throw createError
  }
}

export interface SignedUrlOptions {
  /** `true` fuerza descarga; una cadena fija además el nombre del fichero. */
  download?: string | boolean
  expiresIn?: number
}

/**
 * Devuelve una URL firmada para un `storage_path`, o `null` si no hay ruta o
 * el objeto no existe. Nunca lanza: un fichero perdido no debe tumbar la
 * página entera.
 */
export async function createSignedStorageUrl(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
  options: SignedUrlOptions = {},
): Promise<string | null> {
  if (!storagePath) return null

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, options.expiresIn ?? SIGNED_URL_TTL_SECONDS, options.download ? { download: options.download } : undefined)

  if (error || !data?.signedUrl) {
    console.warn(`[storage] No se pudo firmar la URL de ${storagePath}`, error?.message ?? error)
    return null
  }

  return data.signedUrl
}
