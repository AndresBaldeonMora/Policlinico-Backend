import { Request, Response } from "express";
import { ExamenLaboratorio } from "../models/ExamenLaboratorio";
import { OrdenExamen } from "../models/OrdenExamen";
import mongoose from "mongoose";

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

export const crearOrden = async (req: Request, res: Response) => {
  try {
    const { pacienteId, doctorId, citaId, especialidadId, items, observacionesGenerales } = req.body;

    if (!pacienteId || !doctorId || !especialidadId || !items?.length) {
      return res.status(400).json({
        success: false,
        message: "pacienteId, doctorId, especialidadId e items son obligatorios",
      });
    }

    const orden = await OrdenExamen.create({
      pacienteId,
      doctorId,
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
