import { Response } from "express";
import mongoose from "mongoose";
import { Interconsulta } from "../models/Interconsulta";
import { Doctor } from "../models/Doctor";
import { AuthRequest } from "../middlewares/authMiddlewares";

const getMedicoId = (req: AuthRequest): string | null => req.user?.medicoId ?? null;

// Escapa caracteres especiales de regex para construir un match exacto seguro
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── Crear interconsulta (médico solicitante) ──
export const crearInterconsulta = async (req: AuthRequest, res: Response) => {
  try {
    const medicoId = getMedicoId(req);
    if (!medicoId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    const {
      pacienteId, citaId, especialidadSolicitada, medicoSolicitado,
      prioridad, motivoConsulta, preguntaClinica, informacionRelevante,
    } = req.body;

    if (!pacienteId || !especialidadSolicitada?.trim() || !motivoConsulta?.trim()) {
      return res.status(400).json({
        success: false,
        message: "pacienteId, especialidadSolicitada y motivoConsulta son obligatorios",
      });
    }

    const solicitante = await Doctor.findById(medicoId).select("nombres apellidos");
    const solicitanteNombre = solicitante
      ? `${solicitante.nombres} ${solicitante.apellidos}`
      : "Médico";

    const interconsulta = await Interconsulta.create({
      pacienteId,
      citaId: citaId || undefined,
      solicitanteId: medicoId,
      solicitanteNombre,
      especialidadSolicitada: especialidadSolicitada.trim(),
      medicoSolicitado: medicoSolicitado?.trim() || "",
      prioridad: prioridad || "electiva",
      motivoConsulta: motivoConsulta.trim(),
      preguntaClinica: preguntaClinica?.trim() || "",
      informacionRelevante: informacionRelevante?.trim() || "",
      estado: "PENDIENTE",
    });

    const poblada = await Interconsulta.findById(interconsulta._id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("solicitanteId", "nombres apellidos");

    res.status(201).json({ success: true, data: poblada });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Interconsultas recibidas (por especialidad del médico o destinatario directo) ──
export const listarRecibidas = async (req: AuthRequest, res: Response) => {
  try {
    const medicoId = getMedicoId(req);
    if (!medicoId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    const doctor = await Doctor.findById(medicoId).populate("especialidadId", "nombre");
    const especialidadNombre = (doctor?.especialidadId as any)?.nombre ?? "";

    const filtro: any = {
      solicitanteId: { $ne: new mongoose.Types.ObjectId(medicoId) },
      $or: [{ destinatarioId: new mongoose.Types.ObjectId(medicoId) }],
    };
    if (especialidadNombre) {
      filtro.$or.push({
        especialidadSolicitada: { $regex: `^${escapeRegex(especialidadNombre)}$`, $options: "i" },
      });
    }

    const { estado } = req.query;
    if (estado && ["PENDIENTE", "RESPONDIDA", "CANCELADA"].includes(estado as string)) {
      filtro.estado = estado;
    }

    const interconsultas = await Interconsulta.find(filtro)
      .populate("pacienteId", "nombres apellidos dni fechaNacimiento")
      .populate("solicitanteId", "nombres apellidos")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: interconsultas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Interconsultas enviadas (por el médico solicitante) ──
export const listarEnviadas = async (req: AuthRequest, res: Response) => {
  try {
    const medicoId = getMedicoId(req);
    if (!medicoId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    const interconsultas = await Interconsulta.find({ solicitanteId: medicoId })
      .populate("pacienteId", "nombres apellidos dni")
      .populate("respondidoPorId", "nombres apellidos")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: interconsultas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Responder interconsulta (médico destinatario) ──
export const responderInterconsulta = async (req: AuthRequest, res: Response) => {
  try {
    const medicoId = getMedicoId(req);
    if (!medicoId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    const { id } = req.params;
    const { respuesta } = req.body;

    if (!respuesta?.trim()) {
      return res.status(400).json({ success: false, message: "La respuesta es obligatoria" });
    }

    const interconsulta = await Interconsulta.findById(id);
    if (!interconsulta) {
      return res.status(404).json({ success: false, message: "Interconsulta no encontrada" });
    }
    if (interconsulta.estado !== "PENDIENTE") {
      return res.status(400).json({
        success: false,
        message: `Solo se pueden responder interconsultas pendientes. Estado actual: ${interconsulta.estado}`,
      });
    }

    const doctor = await Doctor.findById(medicoId).select("nombres apellidos");
    interconsulta.respuesta = respuesta.trim();
    interconsulta.respondidoPorId = new mongoose.Types.ObjectId(medicoId);
    interconsulta.respondidoPorNombre = doctor
      ? `${doctor.nombres} ${doctor.apellidos}`
      : "Médico";
    interconsulta.fechaRespuesta = new Date();
    interconsulta.estado = "RESPONDIDA";
    await interconsulta.save();

    const poblada = await Interconsulta.findById(id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("solicitanteId", "nombres apellidos")
      .populate("respondidoPorId", "nombres apellidos");

    res.json({ success: true, data: poblada });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Interconsultas de un paciente (para la historia clínica) ──
export const listarPorPaciente = async (req: AuthRequest, res: Response) => {
  try {
    const { pacienteId } = req.params;
    const interconsultas = await Interconsulta.find({ pacienteId })
      .populate("solicitanteId", "nombres apellidos")
      .populate("respondidoPorId", "nombres apellidos")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: interconsultas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
