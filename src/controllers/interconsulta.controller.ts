import { Response } from "express";
import mongoose from "mongoose";
import { Interconsulta } from "../models/Interconsulta";
import { Doctor } from "../models/Doctor";
import { Cita } from "../models/Cita";
import { AuthRequest } from "../middlewares/authMiddlewares";

const getMedicoId = (req: AuthRequest): string | null => req.user?.medicoId ?? null;
const getRol      = (req: AuthRequest): string => (req.user?.rol ?? "").toUpperCase();

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Verifica si el médico autenticado puede responder/agendar una interconsulta:
// es el destinatario directo o pertenece a la especialidad solicitada.
async function medicoEsDestinatario(interconsulta: any, medicoId: string): Promise<boolean> {
  if (interconsulta.destinatarioId?.toString() === medicoId) return true;
  if (interconsulta.destinatarioId) return false;
  const doctor = await Doctor.findById(medicoId).populate("especialidadId", "nombre");
  const esp = (doctor?.especialidadId as any)?.nombre;
  if (!esp) return false;
  return esp.toLowerCase() === interconsulta.especialidadSolicitada.toLowerCase();
}

// ── Crear interconsulta (médico solicitante) ──────────────────────────────────
export const crearInterconsulta = async (req: AuthRequest, res: Response) => {
  try {
    const medicoId = getMedicoId(req);
    if (!medicoId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    const {
      pacienteId, citaId, especialidadSolicitada, medicoSolicitado,
      prioridad, diagnosticoPresuntivo, motivoConsulta, preguntaClinica, informacionRelevante,
    } = req.body;

    if (!pacienteId || !especialidadSolicitada?.trim() || !motivoConsulta?.trim()) {
      return res.status(400).json({
        success: false,
        message: "pacienteId, especialidadSolicitada y motivoConsulta son obligatorios",
      });
    }

    const solicitante = await Doctor.findById(medicoId)
      .populate("especialidadId", "nombre")
      .select("nombres apellidos cmp especialidadId");

    const solicitanteNombre = solicitante
      ? `${solicitante.nombres} ${solicitante.apellidos}`
      : "Médico";
    const solicitanteEspecialidad = (solicitante?.especialidadId as any)?.nombre ?? "";

    const interconsulta = await Interconsulta.create({
      pacienteId,
      citaId: citaId || undefined,
      solicitanteId: medicoId,
      solicitanteNombre,
      solicitanteEspecialidad,
      especialidadSolicitada: especialidadSolicitada.trim(),
      medicoSolicitado: medicoSolicitado?.trim() || "",
      prioridad: prioridad || "electiva",
      diagnosticoPresuntivo: diagnosticoPresuntivo?.trim() || "",
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

// ── Interconsultas recibidas (MEDICO) ─────────────────────────────────────────
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

// ── Interconsultas enviadas (MEDICO) ──────────────────────────────────────────
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

// ── Interconsultas PENDIENTES para recepcionista (RECEPCIONISTA) ──────────────
export const listarPendientesRecepcion = async (_req: AuthRequest, res: Response) => {
  try {
    const interconsultas = await Interconsulta.find({ estado: "PENDIENTE" })
      .populate("pacienteId", "nombres apellidos dni")
      .populate("solicitanteId", "nombres apellidos")
      .sort({ createdAt: 1 }); // más antiguas primero (mayor urgencia de atender)

    res.json({ success: true, data: interconsultas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Responder interconsulta por escrito (MEDICO destinatario) ─────────────────
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

    const doctor = await Doctor.findById(medicoId).select("nombres apellidos cmp");
    interconsulta.respuesta          = respuesta.trim();
    interconsulta.respondidoPorId    = new mongoose.Types.ObjectId(medicoId);
    interconsulta.respondidoPorNombre = doctor ? `${doctor.nombres} ${doctor.apellidos}` : "Médico";
    interconsulta.respondidoPorCMP   = doctor?.cmp || "";
    interconsulta.fechaRespuesta     = new Date();
    interconsulta.estado             = "RESPONDIDA";
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

// ── Detalle de una interconsulta ──────────────────────────────────────────────
// MEDICO: solo si participó (solicitante, respondedor o destinatario elegible).
// RECEPCIONISTA: puede ver cualquier interconsulta para gestionarla.
export const obtenerPorId = async (req: AuthRequest, res: Response) => {
  try {
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

    // Recepcionista accede sin restricción IDOR (necesita ver para gestionar)
    if (getRol(req) === "RECEPCIONISTA") {
      return res.json({ success: true, data: interconsulta });
    }

    // Médico: control IDOR
    const medicoId = getMedicoId(req);
    if (!medicoId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
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

// ── Agendar cita presencial (MEDICO destinatario) ─────────────────────────────
// Flujo legacy: el médico especialista agenda su propia cita con el paciente.
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
        message: `Solo se puede agendar desde interconsultas pendientes o respondidas. Estado actual: ${interconsulta.estado}`,
      });
    }

    const habilitado = await medicoEsDestinatario(interconsulta, medicoId);
    if (!habilitado) {
      return res.status(403).json({
        success: false,
        message: "Solo el médico destinatario o de la especialidad solicitada puede agendar esta cita",
      });
    }

    const fechaUTC = new Date(`${fecha}T00:00:00.000Z`);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Fecha inválida" });
    }

    const conflictoMedico = await Cita.findOne({
      doctorId: new mongoose.Types.ObjectId(medicoId),
      fecha: fechaUTC, hora,
      estado: { $nin: ["CANCELADA", "VENCIDA"] },
    });
    if (conflictoMedico) {
      return res.status(409).json({ success: false, message: "Ya tiene una cita agendada en esa fecha y hora" });
    }

    const conflictoPaciente = await Cita.findOne({
      pacienteId: interconsulta.pacienteId,
      fecha: fechaUTC, hora,
      estado: { $nin: ["CANCELADA", "VENCIDA"] },
    });
    if (conflictoPaciente) {
      return res.status(409).json({ success: false, message: "El paciente ya tiene una cita programada a esa hora" });
    }

    const nuevaCita = await Cita.create({
      pacienteId: interconsulta.pacienteId,
      doctorId: new mongoose.Types.ObjectId(medicoId),
      fecha: fechaUTC, hora,
      tipo: "INTERCONSULTA",
      estado: "PENDIENTE",
      interconsultaId: interconsulta._id,
      notasClinicas: interconsulta.motivoConsulta,
    });

    const doctor = await Doctor.findById(medicoId).select("nombres apellidos cmp");
    interconsulta.estado            = "CITADA";
    interconsulta.citaGeneradaId    = nuevaCita._id as mongoose.Types.ObjectId;
    interconsulta.respondidoPorId   = new mongoose.Types.ObjectId(medicoId);
    interconsulta.respondidoPorNombre = doctor ? `${doctor.nombres} ${doctor.apellidos}` : "Médico";
    interconsulta.respondidoPorCMP  = doctor?.cmp || "";
    interconsulta.fechaRespuesta    = new Date();
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

// ── Agendar cita desde recepción (RECEPCIONISTA) ──────────────────────────────
// El recepcionista elige el médico, fecha y hora. Crea la cita y actualiza la
// interconsulta en una sola operación atómica.
// Body: { doctorId: string, fecha: "YYYY-MM-DD", hora: "HH:MM" }
export const agendarDesdeRecepcion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { doctorId, fecha, hora } = req.body;

    if (!doctorId || !fecha || !hora) {
      return res.status(400).json({ success: false, message: "doctorId, fecha y hora son obligatorios" });
    }

    const interconsulta = await Interconsulta.findById(id);
    if (!interconsulta) {
      return res.status(404).json({ success: false, message: "Interconsulta no encontrada" });
    }
    if (interconsulta.estado !== "PENDIENTE") {
      return res.status(400).json({
        success: false,
        message: `Solo se puede agendar desde interconsultas pendientes. Estado actual: ${interconsulta.estado}`,
      });
    }

    const doctor = await Doctor.findById(doctorId)
      .populate("especialidadId", "nombre")
      .select("nombres apellidos cmp especialidadId");
    if (!doctor) {
      return res.status(400).json({ success: false, message: "Doctor no encontrado" });
    }

    const fechaUTC = new Date(`${fecha}T00:00:00.000Z`);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Fecha inválida" });
    }

    const conflictoMedico = await Cita.findOne({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      fecha: fechaUTC, hora,
      estado: { $nin: ["CANCELADA", "VENCIDA"] },
    });
    if (conflictoMedico) {
      return res.status(409).json({ success: false, message: "El doctor ya tiene una cita en esa fecha y hora" });
    }

    const conflictoPaciente = await Cita.findOne({
      pacienteId: interconsulta.pacienteId,
      fecha: fechaUTC, hora,
      estado: { $nin: ["CANCELADA", "VENCIDA"] },
    });
    if (conflictoPaciente) {
      return res.status(409).json({ success: false, message: "El paciente ya tiene otra cita a esa hora" });
    }

    const nuevaCita = await Cita.create({
      pacienteId: interconsulta.pacienteId,
      doctorId: new mongoose.Types.ObjectId(doctorId),
      fecha: fechaUTC, hora,
      tipo: "INTERCONSULTA",
      estado: "PENDIENTE",
      interconsultaId: interconsulta._id,
      notasClinicas: interconsulta.motivoConsulta,
    });

    interconsulta.estado              = "CITADA";
    interconsulta.citaGeneradaId      = nuevaCita._id as mongoose.Types.ObjectId;
    interconsulta.respondidoPorId     = new mongoose.Types.ObjectId(doctorId);
    interconsulta.respondidoPorNombre = `${doctor.nombres} ${doctor.apellidos}`;
    interconsulta.respondidoPorCMP    = doctor.cmp || "";
    interconsulta.fechaRespuesta      = new Date();
    interconsulta.respuesta           = `Cita agendada por recepción para ${fecha} a las ${hora}`;
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

// ── Cancelar interconsulta (MEDICO o RECEPCIONISTA) ───────────────────────────
// Body: { motivoCancelacion?: string }
export const cancelarInterconsulta = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { motivoCancelacion } = req.body;

    const interconsulta = await Interconsulta.findById(id);
    if (!interconsulta) {
      return res.status(404).json({ success: false, message: "Interconsulta no encontrada" });
    }
    if (interconsulta.estado === "ATENDIDA" || interconsulta.estado === "CANCELADA") {
      return res.status(400).json({
        success: false,
        message: `No se puede cancelar una interconsulta en estado ${interconsulta.estado}`,
      });
    }

    interconsulta.estado = "CANCELADA";
    if (motivoCancelacion?.trim()) {
      interconsulta.motivoCancelacion = motivoCancelacion.trim();
    }
    await interconsulta.save();

    res.json({ success: true, data: interconsulta });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Interconsultas de un paciente (MEDICO — historia clínica) ─────────────────
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
