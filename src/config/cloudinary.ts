import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Allowlist de MIME para resultados clínicos. Rechaza HTML/JS/SVG (XSS si se sirvieran inline).
const MIMES_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// Multer en memoria (no guarda en disco)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (MIMES_PERMITIDOS.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Tipo de archivo no permitido (${file.mimetype})`));
  },
});

/**
 * Genera una URL firmada (válida por TTL segundos) para descargar un resource privado.
 * Úsalo SIEMPRE para entregar resultados clínicos al cliente: nunca expongas la
 * `secure_url` plana de Cloudinary porque es enumerable y persistente.
 *
 * @param publicId       el `public_id` devuelto por upload.
 * @param resourceType   "image" | "raw" (PDFs → raw).
 * @param ttlSeconds     tiempo de vida (default 5 min).
 */
export function generarUrlFirmada(
  publicId: string,
  resourceType: "image" | "raw" = "raw",
  ttlSeconds = 300
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  return cloudinary.utils.private_download_url(publicId, "pdf", {
    resource_type: resourceType,
    expires_at: expiresAt,
    attachment: false,
  });
}

export default cloudinary;
