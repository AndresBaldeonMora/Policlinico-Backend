import mongoose from "mongoose";
import { AuditLog, EntidadAudit } from "../models/AuditLog";
import { AuthRequest } from "../middlewares/authMiddlewares";

interface RegistrarAuditoriaParams {
  req: AuthRequest;
  accion: string;                       // ej: "CREAR_USUARIO", "DESACTIVAR_USUARIO"
  entidad: EntidadAudit;
  entidadId: string | mongoose.Types.ObjectId;
  estadoAnterior?: string;
  estadoNuevo?: string;
  descripcion?: string;
  detalles?: Record<string, unknown>;
}

/**
 * Registra una entrada de auditoría a partir del request autenticado.
 *
 * Es deliberadamente "best-effort": si el guardado falla, se registra en consola
 * pero NUNCA lanza, para no romper la operación de negocio que se está auditando.
 * El usuario y la IP se derivan del JWT y de la cabecera de la petición.
 */
export async function registrarAuditoria({
  req,
  accion,
  entidad,
  entidadId,
  estadoAnterior,
  estadoNuevo,
  descripcion,
  detalles,
}: RegistrarAuditoriaParams): Promise<void> {
  try {
    const usuario = req.user ?? {};
    const usuarioId = usuario.userId ?? usuario.id;
    if (!usuarioId) return; // sin usuario autenticado no hay a quién atribuir la acción

    const nombreCompleto = [usuario.nombres, usuario.apellidos]
      .filter(Boolean)
      .join(" ")
      .trim();

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      undefined;

    await AuditLog.create({
      usuarioId,
      usuarioNombre: nombreCompleto || undefined,
      accion,
      entidad,
      entidadId,
      estadoAnterior,
      estadoNuevo,
      descripcion,
      detalles,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("[auditoria] No se pudo registrar el log:", error);
  }
}
