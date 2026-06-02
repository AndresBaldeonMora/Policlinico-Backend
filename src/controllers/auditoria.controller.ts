import { Response } from "express";
import { AuditLog } from "../models/AuditLog";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { finDelDiaUTC } from "../utils/fecha.utils";

// ─────────────────────────────────────────────────────────────
// VISOR DE AUDITORÍA  (solo ADMINISTRADOR)
// ─────────────────────────────────────────────────────────────

/**
 * Lista los registros de auditoría con filtros opcionales y paginación.
 * Query params:
 *   - entidad   (Cita | OrdenExamen | Paciente | Doctor | Usuario | ...)
 *   - accion    (texto, búsqueda parcial insensible a mayúsculas)
 *   - usuarioId
 *   - desde / hasta  (ISO date, filtra por timestamp)
 *   - page (default 1) / limit (default 25, máx 100)
 */
export const listarAuditoria = async (req: AuthRequest, res: Response) => {
  try {
    const { entidad, accion, usuarioId, desde, hasta } = req.query;

    const page  = Math.max(1, parseInt(String(req.query.page  ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"), 10) || 25));

    const filtro: Record<string, unknown> = {};
    if (entidad)   filtro.entidad = entidad;
    if (usuarioId) filtro.usuarioId = usuarioId;
    if (accion)    filtro.accion = { $regex: String(accion), $options: "i" };

    if (desde || hasta) {
      const rango: Record<string, Date> = {};
      if (desde) rango.$gte = new Date(String(desde));
      if (hasta) {
        // incluir todo el día "hasta" (fin de día en UTC)
        rango.$lte = finDelDiaUTC(new Date(String(hasta)));
      }
      filtro.timestamp = rango;
    }

    const [registros, total] = await Promise.all([
      AuditLog.find(filtro)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      data: registros,
      paginacion: {
        page,
        limit,
        total,
        totalPaginas: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Devuelve los valores distintos disponibles para poblar los filtros del visor
 * (entidades y acciones efectivamente registradas).
 */
export const opcionesAuditoria = async (_req: AuthRequest, res: Response) => {
  try {
    const [entidades, acciones] = await Promise.all([
      AuditLog.distinct("entidad"),
      AuditLog.distinct("accion"),
    ]);
    res.json({ success: true, data: { entidades, acciones } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
