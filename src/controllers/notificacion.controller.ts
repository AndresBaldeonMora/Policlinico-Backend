import { Response } from "express";
import mongoose from "mongoose";
import { Notificacion } from "../models/Notificacion";
import { AuthRequest } from "../middlewares/authMiddlewares";

// GET /api/paciente/notificaciones — lista de notificaciones del paciente.
// Query: ?filtro=TODAS|LEIDAS|NO_LEIDAS&pagina=1&porPagina=20
// Excluye notificaciones marcadas como eliminadas. Ordena por fecha desc.
export const getMisNotificaciones = async (req: AuthRequest, res: Response) => {
  try {
    const filtroParam = String(req.query.filtro ?? "TODAS").toUpperCase();
    const filtroValido = ["TODAS", "LEIDAS", "NO_LEIDAS"].includes(filtroParam)
      ? filtroParam
      : "TODAS";

    const pagina = Math.max(parseInt(req.query.pagina as string) || 1, 1);
    const porPaginaRaw = parseInt(req.query.porPagina as string) || 20;
    const porPagina = Math.min(Math.max(porPaginaRaw, 1), 50);

    const filtro: any = {
      pacienteId: req.pacienteId,
      eliminada: false,
    };
    if (filtroValido === "LEIDAS")    filtro.leida = true;
    if (filtroValido === "NO_LEIDAS") filtro.leida = false;

    const [docs, total] = await Promise.all([
      Notificacion.find(filtro)
        .sort({ fechaCreacion: -1 })
        .skip((pagina - 1) * porPagina)
        .limit(porPagina)
        .lean(),
      Notificacion.countDocuments(filtro),
    ]);

    const data = docs.map((n: any) => ({
      id: String(n._id),
      titulo: n.titulo,
      mensaje: n.mensaje,
      tipo: n.tipo,
      leida: n.leida,
      fechaCreacion: n.fechaCreacion,
      fechaLectura: n.fechaLectura ?? null,
      link: n.link ?? "",
      eliminada: n.eliminada,
    }));

    res.json({
      success: true,
      data,
      paginacion: {
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/paciente/notificaciones/marcar-todas-leidas
// Marca todas las notificaciones no leídas (y no eliminadas) del paciente.
export const marcarTodasLeidas = async (req: AuthRequest, res: Response) => {
  try {
    const ahora = new Date();
    const result = await Notificacion.updateMany(
      { pacienteId: req.pacienteId, leida: false, eliminada: false },
      { $set: { leida: true, fechaLectura: ahora } }
    );

    res.json({
      success: true,
      message: "Todas las notificaciones han sido marcadas como leídas",
      actualizadas: result.modifiedCount ?? 0,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/paciente/notificaciones/:id/leer
// Marca una notificación específica como leída. 403 si no pertenece al paciente.
export const marcarLeida = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Notificación no encontrada" });
    }

    const notif = await Notificacion.findById(id);
    if (!notif || notif.eliminada) {
      return res.status(404).json({ success: false, message: "Notificación no encontrada" });
    }
    if (String(notif.pacienteId) !== String(req.pacienteId)) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    if (!notif.leida) {
      notif.leida = true;
      notif.fechaLectura = new Date();
      await notif.save();
    }

    res.json({ success: true, message: "Notificación marcada como leída" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/paciente/notificaciones/:id
// Soft delete: marca eliminada=true. No borra el documento.
export const eliminarNotificacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Notificación no encontrada" });
    }

    const notif = await Notificacion.findById(id);
    if (!notif || notif.eliminada) {
      return res.status(404).json({ success: false, message: "Notificación no encontrada" });
    }
    if (String(notif.pacienteId) !== String(req.pacienteId)) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    notif.eliminada = true;
    await notif.save();

    res.json({ success: true, message: "Notificación eliminada" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
