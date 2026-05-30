import { Response } from "express";
import mongoose from "mongoose";
import { Interconsulta } from "../models/Interconsulta";
import { Doctor } from "../models/Doctor";
import { Cita } from "../models/Cita";
import { AuthRequest } from "../middlewares/authMiddlewares";

const getMedicoId = (req: AuthRequest): string | null => req.user?.medicoId ?? null;

// Escapa caracteres especiales de regex para construir un match exacto seguro
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Verifica si el médico autenticado está habilitado para responder/atender una
// interconsulta: o es el destinatario directo, o pertenece a la especialidad
// solicitada (cuando no hay destinatario explícito).
async function medicoEsDestinatario(
  interconsulta: any,
  medicoId: string
): Promise<boolean> {
  if (interconsulta.destinatarioId?.toString() === medicoId) return true;
  if (interconsulta.destinatarioId) return false; // hay destinatario distinto al actual
  const doctor = await Doctor.findById(medicoId).populate("especialidadId", "nombre");
  const esp = (doctor?.especialidadId as any)?.nombre;
  if (!esp) return false;
  return esp.toLowerCase() === interconsulta.especialidadSolicitada.toLowerCase();
}

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
    if (estado && ["PENDIENTE", "RESPONDIDA", "CITADA", "ATENDIDA", "CANCELADA"].includes(estado as string)) {
      filtro.estado = estado;
    } else if (estado === "PROCESADAS") {
      // Atajo: todas las recibidas que ya no están pendientes
      filtro.estado = { $in: ["RESPONDIDA", "CITADA", "ATENDIDA"] };
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

    const habilitado = await medicoEsDestinatario(interconsulta, medicoId);
    if (!habilitado) {
      return res.status(403).json({
        success: false,
        message: "Solo el médico destinatario o de la especialidad solicitada puede responder esta interconsulta",
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

// ── Detalle de una interconsulta (para la página dedicada) ──
// IDOR fix: sólo solicitante, destinatario explícito o médico de la especialidad
// solicitada pueden ver el detalle.
export const obtenerPorId = async (req: AuthRequest, res: Response) => {
  try {
    const medicoId = getMedicoId(req);
    if (!medicoId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const interconsulta = await Interconsulta.findById(req.params.id)
      .populate("pacienteId", "nombres apellidos dni fechaNacimiento sexo")
      .populate("solicitanteId", "nombres apellidos")
      .populate("respondidoPorId", "nombres apellidos")
      .populate("citaGeneradaId");

    if (!interconsulta) {
      return res.status(404).json({ success: false, message: "Interconsulta no encontrada" });
    }

    const esSolicitante = (interconsulta.solicitanteId as any)?._id?.toString() === medicoId
      || interconsulta.solicitanteId?.toString() === medicoId;
    const esRespondedor = (interconsulta.respondidoPorId as any)?._id?.toString() === medicoId
      || interconsulta.respondidoPorId?.toString() === medicoId;
    const esDestinatarioElegible = await medicoEsDestinatario(interconsulta, medicoId);

    if (!esSolicitante && !esRespondedor && !esDestinatarioElegible) {
      return res.status(403).json({ success: false, message: "No tienes acceso a esta interconsulta" });
    }

    res.json({ success: true, data: interconsulta });
  } catch (error: any) {
    console.error("obtenerPorId interconsulta:", error);
    res.status(500).json({ success: false, message: "Error al obtener la interconsulta" });
  }
};

// ── Agendar cita presencial vinculada a la interconsulta ──
// Body: { fecha: "YYYY-MM-DD", hora: "HH:MM", respuesta?: string }
export const agendarCitaInterconsulta = async (req: AuthRequest, res: Response) => {
  try {
    const medicoId = getMedicoId(req);
    if (!medicoId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    const { id } = req.params;
    const { fecha, hora, respuesta } = req.body;

    if (!fecha || !hora) {
      return res.status(400).json({ success: false, message: "fecha y hora son obligatorias" });
    }

    const interconsulta = await Interconsulta.findById(id);
    if (!interconsulta) {
      return res.status(404).json({ success: false, message: "Interconsulta no encontrada" });
    }
    if (interconsulta.estado !== "PENDIENTE" && interconsulta.estado !== "RESPONDIDA") {
      return res.status(400).json({
        success: false,
        message: `Solo se puede agendar desde interconsultas pendientes o ya respondidas. Estado actual: ${interconsulta.estado}`,
      });
    }

    const habilitado = await medicoEsDestinatario(interconsulta, medicoId);
    if (!habilitado) {
      return res.status(403).json({
        success: false,
        message: "Solo el médico destinatario o de la especialidad solicitada puede agendar esta cita",
      });
    }

    // Crear la cita presencial vinculada (tipo INTERCONSULTA)
    const fechaUTC = new Date(`${fecha}T00:00:00.000Z`);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Fecha inválida" });
    }

    // Evita doble reserva en el mismo slot del mismo médico (excluye canceladas/vencidas).
    const conflictoMedico = await Cita.findOne({
      doctorId: new mongoose.Types.ObjectId(medicoId),
      fecha: fechaUTC,
      hora,
      estado: { $nin: ["CANCELADA", "VENCIDA"] },
    });
    if (conflictoMedico) {
      return res.status(409).json({
        success: false,
        message: "Ya tiene una cita agendada en esa fecha y hora",
      });
    }

    // También evita doble booking del paciente en el mismo slot con otro médico.
    const conflictoPaciente = await Cita.findOne({
      pacienteId: interconsulta.pacienteId,
      fecha: fechaUTC,
      hora,
      estado: { $nin: ["CANCELADA", "VENCIDA"] },
    });
    if (conflictoPaciente) {
      return res.status(409).json({
        success: false,
        message: "El paciente ya tiene una cita programada a esa hora",
      });
    }

    const nuevaCita = await Cita.create({
      pacienteId: interconsulta.pacienteId,
      doctorId: new mongoose.Types.ObjectId(medicoId),
      fecha: fechaUTC,
      hora,
      tipo: "INTERCONSULTA",
      estado: "PENDIENTE",
      interconsultaId: interconsulta._id,
      notasClinicas: interconsulta.motivoConsulta,
    });

    // Actualiza la interconsulta a CITADA, dejando el rastro de la respuesta
    const doctor = await Doctor.findById(medicoId).select("nombres apellidos");
    interconsulta.estado = "CITADA";
    interconsulta.citaGeneradaId = nuevaCita._id as mongoose.Types.ObjectId;
    interconsulta.respondidoPorId = new mongoose.Types.ObjectId(medicoId);
    interconsulta.respondidoPorNombre = doctor
      ? `${doctor.nombres} ${doctor.apellidos}`
      : "Médico";
    interconsulta.fechaRespuesta = new Date();
    if (respuesta?.trim()) {
      interconsulta.respuesta = respuesta.trim();
    } else if (!interconsulta.respuesta) {
      interconsulta.respuesta = `Cita presencial agendada para ${fecha} ${hora}`;
    }
    await interconsulta.save();

    const poblada = await Interconsulta.findById(id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("solicitanteId", "nombres apellidos")
      .populate("respondidoPorId", "nombres apellidos")
      .populate("citaGeneradaId");

    res.status(201).json({ success: true, data: poblada });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Interconsultas de un paciente (para la historia clínica) ──
// IDOR fix: sólo médicos que tienen alguna relación con el paciente
// (le atendieron, le agendaron orden, le crearon/recibieron interconsulta).
export const listarPorPaciente = async (req: AuthRequest, res: Response) => {
  try {
    const medicoId = getMedicoId(req);
    if (!medicoId) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    const pacienteIdRaw = req.params.pacienteId;
    const pacienteId = Array.isArray(pacienteIdRaw) ? pacienteIdRaw[0] : pacienteIdRaw;
    if (!pacienteId || !mongoose.isValidObjectId(pacienteId)) {
      return res.status(400).json({ success: false, message: "ID de paciente inválido" });
    }

    // Filtra sólo interconsultas en las que el médico participó.
    const doctor = await Doctor.findById(medicoId).populate("especialidadId", "nombre");
    const especialidad = (doctor?.especialidadId as any)?.nombre ?? "";

    const filtro: any = {
      pacienteId: new mongoose.Types.ObjectId(pacienteId),
      $or: [
        { solicitanteId: new mongoose.Types.ObjectId(medicoId) },
        { respondidoPorId: new mongoose.Types.ObjectId(medicoId) },
        { destinatarioId: new mongoose.Types.ObjectId(medicoId) },
      ],
    };
    if (especialidad) {
      filtro.$or.push({
        especialidadSolicitada: { $regex: `^${escapeRegex(especialidad)}$`, $options: "i" },
      });
    }

    const interconsultas = await Interconsulta.find(filtro)
      .populate("solicitanteId", "nombres apellidos")
      .populate("respondidoPorId", "nombres apellidos")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: interconsultas });
  } catch (error: any) {
    console.error("listarPorPaciente interconsulta:", error);
    res.status(500).json({ success: false, message: "Error al listar interconsultas" });
  }
};
