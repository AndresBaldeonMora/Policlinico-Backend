import { Request, Response } from "express";
import { Ticket } from "../models/Ticket";

// ── Recepcionista: crear ticket ───────────────────────────────────────────────
export const crearTicket = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { titulo, descripcion, categoria, prioridad } = req.body;

    if (!titulo?.trim() || !descripcion?.trim() || !categoria) {
      return res.status(400).json({ success: false, message: "título, descripción y categoría son obligatorios." });
    }

    const ticket = await Ticket.create({
      titulo:          titulo.trim(),
      descripcion:     descripcion.trim(),
      categoria,
      prioridad:       prioridad ?? "MEDIA",
      creadoPorId:     user.userId ?? user.userId ?? user.id ?? user._id,
      creadoPorNombre: `${user.nombres} ${user.apellidos}`,
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Listar tickets (admin ve todos, recepcionista solo los suyos) ─────────────
export const listarTickets = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { estado, prioridad, categoria, page = "1", limit = "20" } = req.query as Record<string, string>;

    const filtro: Record<string, any> = {};
    if (user.rol === "RECEPCIONISTA") filtro.creadoPorId = user.userId ?? user.id ?? user._id;
    if (estado)    filtro.estado    = estado;
    if (prioridad) filtro.prioridad = prioridad;
    if (categoria) filtro.categoria = categoria;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Ticket.countDocuments(filtro);
    const items = await Ticket.find(filtro)
      .sort({ creadoEn: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-comentarios")
      .lean();

    res.json({ success: true, data: items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Detalle de un ticket ──────────────────────────────────────────────────────
export const obtenerTicket = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ticket = await Ticket.findById(req.params.id).lean();
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket no encontrado." });

    // Recepcionista solo puede ver sus propios tickets
    if (user.rol === "RECEPCIONISTA" && ticket.creadoPorId !== (user.userId ?? user.id ?? user._id)) {
      return res.status(403).json({ success: false, message: "Sin acceso." });
    }

    res.json({ success: true, data: ticket });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: cambiar estado o asignar ──────────────────────────────────────────
export const actualizarTicket = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { estado, prioridad, resolucion, asignadoAId, asignadoANombre } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket no encontrado." });

    if (estado)           ticket.estado           = estado;
    if (prioridad)        ticket.prioridad        = prioridad;
    if (resolucion)       ticket.resolucion       = resolucion;
    if (asignadoAId)      ticket.asignadoAId      = asignadoAId;
    if (asignadoANombre)  ticket.asignadoANombre  = asignadoANombre;

    // Auto-asignar al admin que actualiza si nadie asignado
    if (!ticket.asignadoAId && user.rol === "ADMINISTRADOR") {
      ticket.asignadoAId     = user.userId ?? user.id ?? user._id;
      ticket.asignadoANombre = `${user.nombres} ${user.apellidos}`;
    }

    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Agregar comentario (admin o el creador del ticket) ───────────────────────
export const agregarComentario = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ success: false, message: "El comentario no puede estar vacío." });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket no encontrado." });

    // Recepcionista solo puede comentar sus propios tickets
    if (user.rol === "RECEPCIONISTA" && ticket.creadoPorId !== (user.userId ?? user.id ?? user._id)) {
      return res.status(403).json({ success: false, message: "Sin acceso." });
    }

    ticket.comentarios.push({
      autorId:     user.userId ?? user.id ?? user._id,
      autorNombre: `${user.nombres} ${user.apellidos}`,
      autorRol:    user.rol,
      texto:       texto.trim(),
      creadoEn:    new Date(),
    });

    // Si admin comenta y ticket estaba ABIERTO → pasa a EN_REVISION automáticamente
    if (user.rol === "ADMINISTRADOR" && ticket.estado === "ABIERTO") {
      ticket.estado = "EN_REVISION";
    }

    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Resumen para admin dashboard ──────────────────────────────────────────────
export const resumenTickets = async (_req: Request, res: Response) => {
  try {
    const [abiertos, enRevision, resueltos, criticos] = await Promise.all([
      Ticket.countDocuments({ estado: "ABIERTO" }),
      Ticket.countDocuments({ estado: "EN_REVISION" }),
      Ticket.countDocuments({ estado: "RESUELTO" }),
      Ticket.countDocuments({ prioridad: "CRITICA", estado: { $in: ["ABIERTO", "EN_REVISION"] } }),
    ]);
    const recientes = await Ticket.find({ estado: { $in: ["ABIERTO", "EN_REVISION"] } })
      .sort({ creadoEn: -1 }).limit(5).select("-comentarios").lean();
    res.json({ success: true, data: { abiertos, enRevision, resueltos, criticos, recientes } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
