import { Request, Response } from "express";
import { ExamenLaboratorio } from "../models/ExamenLaboratorio";
import { AuditLog } from "../models/AuditLog";
import { OrdenExamen } from "../models/OrdenExamen";
import { Cita } from "../models/Cita";
import { Usuario } from "../models/Usuario";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/authMiddlewares";

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────
const registrarAudit = async (
  usuarioId: string,
  accion: string,
  entidadId: string,
  detalles: object,
  ipAddress?: string
) => {
  try {
    await AuditLog.create({
      usuarioId,
      accion,
      entidad: "OrdenExamen",
      entidadId,
      detalles,
      ipAddress,
    });
  } catch (error) {
    console.error("Error al registrar audit log:", error);
  }
};

// ─────────────────────────────────────────────────────────────
// CATÁLOGO DE EXÁMENES
// ─────────────────────────────────────────────────────────────

export const listarExamenes = async (req: Request, res: Response) => {
  try {
    const { tipo, activo } = req.query;
    const filtro: any = {};
    if (tipo) filtro.tipo = tipo;
    if (activo !== undefined) filtro.activo = activo === "true";

    const examenes = await ExamenLaboratorio.find(filtro).sort({ tipo: 1, nombre: 1 });
    res.json({ success: true, data: examenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerExamen = async (req: Request, res: Response) => {
  try {
    const examen = await ExamenLaboratorio.findById(req.params.id);
    if (!examen) return res.status(404).json({ success: false, message: "Examen no encontrado" });
    res.json({ success: true, data: examen });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const crearExamen = async (req: Request, res: Response) => {
  try {
    const { nombre, tipo, descripcion, unidad, referenciaMin, referenciaMax, referenciaTexto } = req.body;
    if (!nombre?.trim() || !tipo) {
      return res.status(400).json({ success: false, message: "nombre y tipo son obligatorios" });
    }
    const examen = await ExamenLaboratorio.create({
      nombre: nombre.trim(),
      tipo,
      descripcion,
      unidad,
      referenciaMin,
      referenciaMax,
      referenciaTexto,
    });
    res.status(201).json({ success: true, data: examen });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const actualizarExamen = async (req: Request, res: Response) => {
  try {
    const examen = await ExamenLaboratorio.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!examen) return res.status(404).json({ success: false, message: "Examen no encontrado" });
    res.json({ success: true, data: examen });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const eliminarExamen = async (req: Request, res: Response) => {
  try {
    const examen = await ExamenLaboratorio.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!examen) return res.status(404).json({ success: false, message: "Examen no encontrado" });
    res.json({ success: true, message: "Examen desactivado" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// ÓRDENES DE EXAMEN
// ─────────────────────────────────────────────────────────────

export const crearOrden = async (req: AuthRequest, res: Response) => {
  try {
    const { pacienteId, citaId, especialidadId, items, observacionesGenerales } = req.body;

    if (!pacienteId || !especialidadId || !items?.length) {
      return res.status(400).json({
        success: false,
        message: "pacienteId, especialidadId e items son obligatorios",
      });
    }

    // Obtener el medicoId del usuario autenticado
    let medicoId = req.user?.medicoId;
    if (!medicoId) {
      const usuario = await Usuario.findById(req.user?.userId);
      if (!usuario?.medicoId) {
        return res.status(403).json({
          success: false,
          message: "Tu usuario no está vinculado a un doctor",
        });
      }
      medicoId = String(usuario.medicoId);
    }

    // Si se proporciona citaId, verificar que el doctor autenticado sea el asignado a la cita
    if (citaId) {
      const cita = await Cita.findById(citaId);
      if (!cita) {
        return res.status(404).json({
          success: false,
          message: "La cita especificada no existe",
        });
      }
      if (String(cita.doctorId) !== medicoId) {
        return res.status(403).json({
          success: false,
          message: "No tienes permiso para crear órdenes en esta cita. Solo el doctor asignado puede hacerlo.",
        });
      }
    }

    const orden = await OrdenExamen.create({
      pacienteId,
      doctorId: medicoId,
      citaId: citaId || undefined,
      especialidadId,
      items: items.map((item: any) => ({
        examenId: item.examenId,
        observaciones: item.observaciones || "",
        estadoItem: "PENDIENTE",
      })),
      observacionesGenerales: observacionesGenerales || "",
    });

    const ordenPoblada = await OrdenExamen.findById(orden._id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo unidad");

    res.status(201).json({ success: true, data: ordenPoblada });
    await registrarAudit(
      req.user?.userId ?? "desconocido",
      "crear_orden",
      String(orden._id),
      { pacienteId, citaId, especialidadId, items },
      req.ip
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listarOrdenesPorPaciente = async (req: Request, res: Response) => {
  try {
    const { pacienteId } = req.params;
    const ordenes = await OrdenExamen.find({ pacienteId })
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo unidad")
      .sort({ fecha: -1 });
    res.json({ success: true, data: ordenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listarOrdenesPorCita = async (req: Request, res: Response) => {
  try {
    const { citaId } = req.params;
    const ordenes = await OrdenExamen.find({ citaId })
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo unidad");
    res.json({ success: true, data: ordenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerOrden = async (req: Request, res: Response) => {
  try {
    const orden = await OrdenExamen.findById(req.params.id)
      .populate("pacienteId", "nombres apellidos dni fechaNacimiento sexo")
      .populate("doctorId", "nombres apellidos cmp")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo unidad referenciaMin referenciaMax referenciaTexto");
    if (!orden) return res.status(404).json({ success: false, message: "Orden no encontrada" });
    res.json({ success: true, data: orden });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cargar resultados de uno o varios ítems de la orden
export const cargarResultados = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resultados } = req.body;
    // resultados: [{ examenId, valorResultado, unidadResultado }]

    if (!resultados?.length) {
      return res.status(400).json({ success: false, message: "Se requieren resultados" });
    }

    const orden = await OrdenExamen.findById(id);
    if (!orden) return res.status(404).json({ success: false, message: "Orden no encontrada" });

    for (const resultado of resultados) {
      const item = orden.items.find(
        (i) => i.examenId.toString() === resultado.examenId
      );
      if (item) {
        item.valorResultado  = resultado.valorResultado;
        item.unidadResultado = resultado.unidadResultado || item.unidadResultado;
        item.fechaResultado  = new Date();
        item.estadoItem      = "COMPLETADO";
      }
    }

    const todosCompletos = orden.items.every((i) => i.estadoItem === "COMPLETADO");
    orden.estado = todosCompletos ? "COMPLETADO" : "EN_PROCESO";

    await orden.save();

    const ordenActualizada = await OrdenExamen.findById(id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo unidad referenciaMin referenciaMax referenciaTexto");

    res.json({ success: true, data: ordenActualizada });
    await registrarAudit(
      (req as AuthRequest).user?.userId ?? "desconocido",
      "cargar_resultados",
      id,
      { resultados, estadoFinal: orden.estado },
      req.ip
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelarOrden = async (req: Request, res: Response) => {
  try {
    const orden = await OrdenExamen.findByIdAndUpdate(
      req.params.id,
      { estado: "CANCELADA" },
      { new: true }
    );
    if (!orden) return res.status(404).json({ success: false, message: "Orden no encontrada" });
    res.json({ success: true, message: "Orden cancelada" });
    await registrarAudit(
      (req as AuthRequest).user?.userId ?? "desconocido",
      "cancelar_orden",
      String(req.params.id),
      { estadoNuevo: "CANCELADA" },
      req.ip
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Listar todas las órdenes pendientes (para técnico de laboratorio)
export const listarOrdenesPendientes = async (_req: Request, res: Response) => {
  try {
    const ordenes = await OrdenExamen.find({ estado: { $in: ["PENDIENTE", "EN_PROCESO"] } })
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo unidad")
      .sort({ fecha: -1 });
    res.json({ success: true, data: ordenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Edición de orden (solo PENDIENTE, solo el médico creador) ──
export const actualizarOrden = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { items, observacionesGenerales } = req.body;
    const medicoId = req.user?.medicoId;

    const orden = await OrdenExamen.findById(id);
    if (!orden) return res.status(404).json({ success: false, message: "Orden no encontrada" });

    if (medicoId && orden.doctorId.toString() !== medicoId) {
      return res.status(403).json({ success: false, message: "No tienes permisos para editar esta orden" });
    }

    if (orden.estado !== "PENDIENTE") {
      return res.status(400).json({ success: false, message: "Solo se pueden editar órdenes en estado PENDIENTE" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Debe incluir al menos un ítem en la orden" });
    }

    orden.items = items;
    if (observacionesGenerales !== undefined) orden.observacionesGenerales = observacionesGenerales;
    await orden.save();

    const ordenActualizada = await OrdenExamen.findById(id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo unidad referenciaMin referenciaMax referenciaTexto");

    res.json({ success: true, data: ordenActualizada });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
