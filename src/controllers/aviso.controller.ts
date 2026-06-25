import { Request, Response } from "express";
import { Aviso } from "../models/Aviso";
import { Reclamacion } from "../models/Reclamacion";
import { Interconsulta } from "../models/Interconsulta";
import { Doctor } from "../models/Doctor";
import { Paciente } from "../models/Paciente";
import { Especialidad } from "../models/Especialidad";

export const listarAvisos = async (_req: Request, res: Response) => {
  try {
    const avisos = await Aviso.find({ activo: true }).sort({ creadoEn: -1 });
    res.json({ success: true, data: avisos });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const crearAviso = async (req: Request, res: Response) => {
  try {
    const { titulo, mensaje, tipo } = req.body;
    if (!titulo?.trim() || !mensaje?.trim()) {
      return res.status(400).json({ success: false, message: "titulo y mensaje son obligatorios" });
    }
    const aviso = await Aviso.create({ titulo: titulo.trim(), mensaje: mensaje.trim(), tipo: tipo || "INFO" });
    res.status(201).json({ success: true, data: aviso });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const eliminarAviso = async (req: Request, res: Response) => {
  try {
    const aviso = await Aviso.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!aviso) return res.status(404).json({ success: false, message: "Aviso no encontrado" });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Resumen para el dashboard: stats + alertas automáticas
export const resumenDashboard = async (_req: Request, res: Response) => {
  try {
    const [
      totalDoctores,
      totalPacientes,
      totalEspecialidades,
      reclamacionesPendientes,
      interconsultasPendientes,
      reclamacionesRecientes,
    ] = await Promise.all([
      Doctor.countDocuments({}),
      Paciente.countDocuments({}),
      Especialidad.countDocuments({}),
      Reclamacion.countDocuments({ estado: "PENDIENTE" }),
      Interconsulta.countDocuments({ estado: "PENDIENTE" }),
      Reclamacion.find({ estado: { $in: ["PENDIENTE", "EN_REVISION"] } })
        .populate("pacienteId", "nombres apellidos")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    // Alertas automáticas basadas en datos reales
    const alertas: { tipo: "warning" | "error" | "info"; mensaje: string }[] = [];

    if (reclamacionesPendientes > 0) {
      alertas.push({
        tipo: reclamacionesPendientes >= 3 ? "error" : "warning",
        mensaje: `${reclamacionesPendientes} reclamación${reclamacionesPendientes > 1 ? "es" : ""} de paciente${reclamacionesPendientes > 1 ? "s" : ""} sin responder.`,
      });
    }
    if (interconsultasPendientes > 0) {
      alertas.push({
        tipo: interconsultasPendientes >= 5 ? "error" : "warning",
        mensaje: `${interconsultasPendientes} interconsulta${interconsultasPendientes > 1 ? "s" : ""} pendiente${interconsultasPendientes > 1 ? "s" : ""} de agendar por recepción.`,
      });
    }
    if (alertas.length === 0) {
      alertas.push({ tipo: "info", mensaje: "Todo en orden. Sin alertas pendientes." });
    }

    res.json({
      success: true,
      data: {
        stats: { totalDoctores, totalPacientes, totalEspecialidades, reclamacionesPendientes, interconsultasPendientes },
        alertas,
        reclamacionesRecientes,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
