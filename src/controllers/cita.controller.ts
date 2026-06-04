import { Request, Response } from "express";
import mongoose from "mongoose";
import { Cita, ESTADOS_OCUPAN_SLOT } from "../models/Cita";
import { Paciente } from "../models/Paciente";
import { Doctor } from "../models/Doctor";
import { BloqueoHorario } from "../models/BloqueoHorario";
import { Interconsulta } from "../models/Interconsulta";
import { verificarCitasVencidas } from "../jobs/vencimientoCitas";
import { crearFechaUTC, hoyPeruUTC, horaPeruAInstanteUTC } from "../utils/fecha.utils";

// Si la cita está vinculada a una interconsulta y pasó a ATENDIDA,
// avanza la interconsulta también a ATENDIDA. Falla silencioso.
async function sincronizarInterconsultaAtendida(cita: any) {
  try {
    if (!cita?.interconsultaId || cita.estado !== "ATENDIDA") return;
    await Interconsulta.findByIdAndUpdate(cita.interconsultaId, { estado: "ATENDIDA" });
  } catch (err) {
    console.error("No se pudo sincronizar interconsulta vinculada:", err);
  }
}

export const crearCita = async (req: any, res: Response) => {
  try {
    let { pacienteId } = req.body;
    const { doctorId, fecha, hora } = req.body;

    // PACIENTE: forzar pacienteId al del token (no acepta IDs externos).
    const rol = String(req.user?.rol ?? "").toUpperCase();
    if (rol === "PACIENTE") {
      if (!req.user?.pacienteId) {
        return res.status(403).json({ success: false, message: "Token sin paciente vinculado" });
      }
      pacienteId = String(req.user.pacienteId);
    }

    if (!pacienteId || !doctorId || !fecha || !hora) {
      return res.status(400).json({ success: false, message: "Todos los campos son requeridos" });
    }

    const [pacienteExiste, doctorExiste] = await Promise.all([
      Paciente.exists({ _id: pacienteId }),
      Doctor.exists({ _id: doctorId }),
    ]);

    if (!pacienteExiste) return res.status(400).json({ success: false, message: "Paciente inválido o no existe" });
    if (!doctorExiste)   return res.status(400).json({ success: false, message: "Doctor inválido o no existe" });

    const fechaUTC = crearFechaUTC(fecha);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Formato de fecha inválido" });
    }

    // Verificar si el día está bloqueado para este doctor
    const bloqueoActivo = await BloqueoHorario.findOne({
      doctorId,
      fecha: fechaUTC,
      activo: true,
    });
    if (bloqueoActivo) {
      return res.status(400).json({
        success: false,
        message: `No se puede crear la cita: el doctor tiene el día bloqueado. Motivo: ${bloqueoActivo.motivo}`,
      });
    }

    // El índice único de MongoDB aplica a TODOS los estados, no solo activos.
    // Usamos $nin para bloquear slots ocupados por cualquier cita no cancelada/reprogramada.
    const citaExistenteDoctor = await Cita.findOne({ doctorId, fecha: fechaUTC, hora, estado: { $nin: ["CANCELADA", "REPROGRAMADA"] } });
    if (citaExistenteDoctor) {
      return res.status(400).json({ success: false, message: "Ya existe una cita para ese horario con este doctor" });
    }

    const citaExistentePaciente = await Cita.findOne({ pacienteId, fecha: fechaUTC, hora, estado: { $nin: ["CANCELADA", "REPROGRAMADA"] } });
    if (citaExistentePaciente) {
       return res.status(400).json({ success: false, message: "El paciente ya tiene otra cita médica reservada para esta misma fecha y hora" });
    }

    const nuevaCita = new Cita({ pacienteId, doctorId, fecha: fechaUTC, hora, estado: "PENDIENTE" });
    await nuevaCita.save();

    res.status(201).json({ success: true, data: nuevaCita, message: "Cita creada exitosamente" });
  } catch (error: any) {
    // E11000: el índice único disparó antes que el check de aplicación (race condition)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Ya existe una cita para ese horario con este doctor" });
    }
    res.status(500).json({ success: false, message: "Error al crear la cita", error: error.message });
  }
};

export const listarCitas = async (_req: Request, res: Response) => {
  try {
    const citas = await Cita.find()
      .populate("pacienteId", "nombres apellidos dni")
      .populate({
        path: "doctorId",
        select: "nombres apellidos especialidadId",
        populate: { path: "especialidadId", select: "nombre" },
      })
      .sort({ _id: -1 });

    const citasProcesadas = citas.map((cita, index) => {
      const paciente = cita.pacienteId as any;
      const doctor   = cita.doctorId as any;

      const fechaFormateada = new Date(cita.fecha).toLocaleDateString("es-PE", {
        day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
      });

      return {
        id: index + 1,
        _id: cita._id,
        dni: paciente?.dni || "—",
        paciente: `${paciente?.nombres || ""} ${paciente?.apellidos || ""}`.trim(),
        doctor: doctor ? `${doctor.nombres || ""} ${doctor.apellidos || ""}`.trim() : "Sin asignar",
        doctorId: doctor?._id || "",
        especialidad: doctor?.especialidadId?.nombre || "Sin especialidad",
        fecha: fechaFormateada,
        hora: cita.hora,
        estado: cita.estado,
        tipo: cita.tipo,
      };
    });

    res.json({ success: true, data: citasProcesadas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error al listar citas", error: error.message });
  }
};

export const reprogramarCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fecha, hora } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    // Estados terminales no pueden reprogramarse (rompería inmutabilidad NTS-022).
    if (cita.estado === "ATENDIDA" || cita.estado === "CANCELADA") {
      return res.status(409).json({
        success: false,
        message: `No se puede reprogramar una cita ${cita.estado}.`,
      });
    }

    // Regla de negocio: una cita sólo puede reprogramarse UNA vez. Una cita ya
    // REPROGRAMADA no admite una segunda reprogramación; sólo PENDIENTE la admite.
    if (cita.estado === "REPROGRAMADA") {
      return res.status(409).json({
        success: false,
        message: "Esta cita ya fue reprogramada una vez y no admite una segunda reprogramación.",
      });
    }
    if (cita.estado !== "PENDIENTE") {
      return res.status(409).json({
        success: false,
        message: `La cita en estado ${cita.estado} no admite reprogramación.`,
      });
    }

    // Regla de negocio: 24h mínimo antes de la cita.
    const momentoCita = horaPeruAInstanteUTC(new Date(cita.fecha), cita.hora ?? "23:59");
    const horasRestantes = (momentoCita.getTime() - Date.now()) / (1000 * 60 * 60);
    if (horasRestantes < 24) {
      return res.status(400).json({
        success: false,
        message: "No se puede reprogramar: debe reprogramarse con al menos 24 horas de anticipación.",
      });
    }

    const fechaUTC = crearFechaUTC(fecha);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Formato de nueva fecha inválido" });
    }

    // Conflicto: solo cuentan los estados que ocupan el slot, excluyendo la propia cita.
    const citaExistente = await Cita.findOne({
      _id: { $ne: id },
      doctorId: cita.doctorId,
      fecha: fechaUTC,
      hora,
      estado: { $in: ESTADOS_OCUPAN_SLOT },
    });
    if (citaExistente) {
      return res.status(409).json({ success: false, message: "Ya existe una cita para ese horario" });
    }

    // Verifica bloqueos del doctor en la nueva fecha.
    const bloqueo = await BloqueoHorario.findOne({
      doctorId: cita.doctorId,
      fecha: fechaUTC,
      activo: true,
    });
    if (bloqueo) {
      return res.status(409).json({
        success: false,
        message: "El médico tiene un bloqueo de agenda en esa fecha",
      });
    }

    const estadoAnterior = cita.estado;
    const fechaOriginal = new Date(cita.fecha).toLocaleDateString("es-PE");
    const horaOriginal = cita.hora;
    const fechaNueva = new Date(fechaUTC).toLocaleDateString("es-PE");

    cita.fecha  = fechaUTC;
    cita.hora   = hora;
    cita.estado = "REPROGRAMADA";
    await cita.save();

    // Crear audit log
    try {
      const { AuditLog } = await import("../models/AuditLog");
      const usuario = (req as any).user;
      await AuditLog.create({
        accion: "REPROGRAMAR",
        entidad: "Cita",
        entidadId: cita._id,
        usuarioId: usuario?.userId ? new mongoose.Types.ObjectId(usuario.userId) : undefined,
        usuarioNombre: usuario ? `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim() : undefined,
        estadoAnterior,
        estadoNuevo: "REPROGRAMADA",
        descripcion: `Reprogramada de ${fechaOriginal} ${horaOriginal} a ${fechaNueva} ${hora}`,
        detalles: {
          fechaOriginal: momentoCita.toISOString(),
          horaOriginal,
          fechaNueva: fechaUTC.toISOString(),
          horaNueva: hora,
        },
        ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ?? req.ip,
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.error("AuditLog REPROGRAMAR falló:", logErr);
    }

    res.json({ success: true, data: cita, message: "Cita reprogramada exitosamente" });
  } catch (error: any) {
    console.error("reprogramarCita:", error);
    res.status(500).json({ success: false, message: "Error al reprogramar cita" });
  }
};

export const obtenerCitasCalendario = async (req: Request, res: Response) => {
  try {
    const { fecha, vista = "mes", medicoId } = req.query;

    // ✅ Parsear fecha en UTC para evitar desfase; sin fecha, hoy según calendario Perú.
    const fechaBase = fecha ? crearFechaUTC(fecha as string) : hoyPeruUTC();

    // Limpiar citas vencidas antes de retornar datos al calendario
    await verificarCitasVencidas();

    let fechaInicio: Date;
    let fechaFin: Date;

    switch (vista) {
      case "dia":
        fechaInicio = new Date(Date.UTC(fechaBase.getUTCFullYear(), fechaBase.getUTCMonth(), fechaBase.getUTCDate(), 0, 0, 0));
        fechaFin    = new Date(Date.UTC(fechaBase.getUTCFullYear(), fechaBase.getUTCMonth(), fechaBase.getUTCDate(), 23, 59, 59, 999));
        break;

      case "semana": {
        const dow = fechaBase.getUTCDay(); // 0=dom,...,6=sab
        const offset = (dow + 6) % 7;     // lunes=0
        fechaInicio = new Date(Date.UTC(fechaBase.getUTCFullYear(), fechaBase.getUTCMonth(), fechaBase.getUTCDate() - offset, 0, 0, 0));
        fechaFin    = new Date(fechaInicio);
        fechaFin.setUTCDate(fechaInicio.getUTCDate() + 6);
        fechaFin.setUTCHours(23, 59, 59, 999);
        break;
      }

      case "mes":
      default:
        fechaInicio = new Date(Date.UTC(fechaBase.getUTCFullYear(), fechaBase.getUTCMonth(), 1, 0, 0, 0));
        fechaFin    = new Date(Date.UTC(fechaBase.getUTCFullYear(), fechaBase.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    }

    const filtro: any = { 
      fecha: { $gte: fechaInicio, $lte: fechaFin },
      estado: { $nin: ["ATENDIDA", "CANCELADA"] }
    };
    if (medicoId) filtro.doctorId = medicoId;

    const citas = await Cita.find(filtro)
      .populate("pacienteId", "nombres apellidos dni telefono")
      .populate("doctorId", "nombres apellidos")
      .sort({ fecha: 1, hora: 1 });

    res.json({ success: true, data: citas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerCitaPorId = async (req: Request, res: Response) => {
  try {
    const cita = await Cita.findById(req.params.id)
      .populate("pacienteId", "nombres apellidos dni telefono correo fechaNacimiento alergias medicamentosHabituales problemasMedicos")
      .populate({
        path: "doctorId",
        select: "nombres apellidos especialidadId",
        populate: { path: "especialidadId", select: "nombre" },
      });

    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    res.json({ success: true, data: cita });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error al obtener la cita", error: error.message });
  }
};

// Transiciones permitidas para las citas (recepción/médico).
// Estados terminales: ATENDIDA, CANCELADA.
const CITA_TRANSICIONES: Record<string, string[]> = {
  PENDIENTE:    ["ASISTIO", "ATENDIDA", "CANCELADA", "REPROGRAMADA"],
  // No se permite REPROGRAMADA → PENDIENTE: revertiría la única reprogramación
  // disponible y permitiría reprogramar una segunda vez.
  REPROGRAMADA: ["ASISTIO", "ATENDIDA", "CANCELADA"],
  ASISTIO:      ["ATENDIDA", "CANCELADA"],
  // ATENDIDA / CANCELADA → terminales (no se permiten más mutaciones)
};

export const cancelarCita = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { motivoCancelacion } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    // Ownership por rol
    const rol = String(req.user?.rol ?? "").toUpperCase();
    if (rol === "PACIENTE" && String(cita.pacienteId) !== String(req.user?.pacienteId)) {
      return res.status(403).json({ success: false, message: "Sólo puedes cancelar tus propias citas" });
    }
    if (rol === "MEDICO" && String(cita.doctorId) !== String(req.user?.medicoId)) {
      return res.status(403).json({ success: false, message: "Sólo puedes cancelar tus propias citas" });
    }

    if (cita.estado === "CANCELADA") {
      return res.status(400).json({ success: false, message: "La cita ya está cancelada" });
    }
    if (cita.estado === "ATENDIDA") {
      return res.status(409).json({ success: false, message: "No se puede cancelar una cita ya atendida" });
    }

    cita.estado = "CANCELADA";
    if (motivoCancelacion) cita.motivoCancelacion = motivoCancelacion;
    await cita.save();

    res.json({ success: true, data: cita, message: "Cita cancelada correctamente" });
  } catch (error: any) {
    console.error("cancelarCita:", error);
    res.status(500).json({ success: false, message: "Error al cancelar la cita" });
  }
};

// marcarAsistencia — pone ASISTIO (no ATENDIDA).
export const marcarAsistencia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }
    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    if (cita.estado !== "PENDIENTE" && cita.estado !== "REPROGRAMADA") {
      return res.status(400).json({ success: false, message: "Solo se puede marcar asistencia en citas PENDIENTE o REPROGRAMADA" });
    }

    cita.estado = "ASISTIO";
    cita.horarioAsistencia = new Date();
    await cita.save();

    res.json({ success: true, data: cita, message: "Asistencia marcada correctamente" });
  } catch (error: any) {
    console.error("marcarAsistencia:", error);
    res.status(500).json({ success: false, message: "Error al marcar asistencia" });
  }
};

// cambiarEstado — endpoint genérico, valida transiciones.
export const cambiarEstado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const estadosValidos = ["PENDIENTE", "ASISTIO", "ATENDIDA", "CANCELADA", "REPROGRAMADA"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado inválido" });
    }

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    // Estados terminales no se pueden mutar.
    if (cita.estado === "ATENDIDA" || cita.estado === "CANCELADA") {
      return res.status(409).json({
        success: false,
        message: `Cita en estado ${cita.estado}: no se admiten cambios.`,
      });
    }

    const transicionesOK = CITA_TRANSICIONES[cita.estado] ?? [];
    if (estado !== cita.estado && !transicionesOK.includes(estado)) {
      return res.status(409).json({
        success: false,
        message: `Transición inválida: ${cita.estado} → ${estado}`,
      });
    }

    const estadoAnterior = cita.estado;
    cita.estado = estado;
    await cita.save();

    // Crear audit log
    try {
      const { AuditLog } = await import("../models/AuditLog");
      const usuario = (req as any).user;
      await AuditLog.create({
        accion: "CAMBIO_ESTADO",
        entidad: "Cita",
        entidadId: cita._id,
        usuarioId: usuario?.userId ? new mongoose.Types.ObjectId(usuario.userId) : undefined,
        usuarioNombre: usuario ? `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim() : undefined,
        estadoAnterior,
        estadoNuevo: estado,
        descripcion: `Estado: ${estadoAnterior} → ${estado}`,
        timestamp: new Date(),
      });
    } catch (logErr) {
      console.error("AuditLog CAMBIO_ESTADO falló:", logErr);
    }

    await sincronizarInterconsultaAtendida(cita);

    res.json({ success: true, data: cita, message: "Estado actualizado" });
  } catch (error: any) {
    console.error("cambiarEstado:", error);
    res.status(500).json({ success: false, message: "Error al cambiar estado" });
  }
};

// ─────────────────────────────────────────────────────────────
// HISTORIAL DE CITAS DEL PACIENTE
// ─────────────────────────────────────────────────────────────
//
// ⚠️  SOLUCIÓN TEMPORAL — Por incompatibilidad de IDs
//
// El usuario autenticado viene de Supabase con UUID format
// (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx), que NO coincide con
// el ObjectId de MongoDB del modelo Paciente.
//
// SOLUCIÓN PENDIENTE (cuando se resuelva la integración de IDs):
//   const pacienteId = (req as any).user?.id;
//   const citas = await Cita.find({ pacienteId }).populate(...);
//
// SOLUCIÓN ACTUAL: se recibe el correo, se busca el Paciente en
// Mongo por correo y se usa su _id real para filtrar las citas.
// ─────────────────────────────────────────────────────────────

export const obtenerHistorialCitas = async (req: Request, res: Response) => {
  try {
    const correoRaw = (req.query.correo as string) || req.body.correo;
    const correo = typeof correoRaw === "string" ? correoRaw : "";

    if (!correo) {
      return res.status(400).json({
        success: false,
        message: "Se requiere el correo del paciente",
      });
    }

    // Autorización: el rol PACIENTE sólo puede ver SU propio historial.
    // El correo del query DEBE coincidir con el del usuario autenticado.
    const user = (req as any).user;
    const rol = String(user?.rol ?? "").toUpperCase();
    const correoNorm = correo.toLowerCase().trim();

    if (rol === "PACIENTE") {
      const correoUser = String(user?.correo ?? "").toLowerCase().trim();
      const pacienteIdUser = user?.pacienteId;
      // Si el token no trae el correo, validamos por pacienteId.
      if (correoUser && correoUser !== correoNorm) {
        return res.status(403).json({ success: false, message: "No autorizado a ver historiales ajenos" });
      }
      if (!correoUser && !pacienteIdUser) {
        return res.status(403).json({ success: false, message: "No autorizado" });
      }
    }
    // ADMINISTRADOR / RECEPCIONISTA / MEDICO: permitido (cubierto por requireRole en la route).

    const paciente = await Paciente.findOne({ correo: correoNorm }).lean();

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: "No se encontró un paciente con ese correo",
      });
    }

    // Defensa extra: si rol es PACIENTE con pacienteId en el token, confirmar match.
    if (rol === "PACIENTE" && user?.pacienteId && String(paciente._id) !== String(user.pacienteId)) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    const { especialidad, medicoNombre, fechaDesde, fechaHasta } = req.query;

    const filtro: any = { pacienteId: paciente._id };

    if (fechaDesde || fechaHasta) {
      filtro.fecha = {};
      if (fechaDesde) {
        const [y, m, d] = (fechaDesde as string).split("-").map(Number);
        filtro.fecha.$gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      }
      if (fechaHasta) {
        const [y, m, d] = (fechaHasta as string).split("-").map(Number);
        filtro.fecha.$lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      }
    }

    const citas = await Cita.find(filtro)
      .populate("pacienteId", "nombres apellidos dni telefono correo")
      .populate({
        path: "doctorId",
        select: "nombres apellidos especialidadId",
        populate: { path: "especialidadId", select: "nombre" },
      })
      .sort({ fecha: -1, hora: -1 })
      .lean();

    // Post-filtros en memoria porque dependen del populate resuelto
    let citasFiltradas = citas;

    if (especialidad) {
      const esp = (especialidad as string).toLowerCase();
      citasFiltradas = citasFiltradas.filter((c) => {
        const doctor = c.doctorId as any;
        return doctor?.especialidadId?.nombre?.toLowerCase().includes(esp);
      });
    }

    if (medicoNombre) {
      const med = (medicoNombre as string).toLowerCase();
      citasFiltradas = citasFiltradas.filter((c) => {
        const doctor = c.doctorId as any;
        if (!doctor) return false;
        return `${doctor.nombres} ${doctor.apellidos}`.toLowerCase().includes(med);
      });
    }

    const historial = citasFiltradas.map((cita) => {
      const doctor = cita.doctorId as any;
      return {
        _id: cita._id,
        fecha: new Date(cita.fecha).toLocaleDateString("es-PE", {
          day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
        }),
        fechaRaw: cita.fecha,
        hora: cita.hora || null,
        tipo: cita.tipo,
        estado: cita.estado,
        doctor: doctor ? `${doctor.nombres} ${doctor.apellidos}`.trim() : "Sin asignar",
        doctorId: doctor?._id || null,
        especialidad: doctor?.especialidadId?.nombre || "Sin especialidad",
        diagnostico: cita.diagnostico || null,
        tratamiento: cita.tratamiento || null,
        notasClinicas: cita.notasClinicas || null,
        medicamentosPrescritos: cita.medicamentosPrescritos?.length
          ? cita.medicamentosPrescritos.map((m: any) => ({
              nombre: m.nombre,
              dosis: m.dosis,
              frecuencia: m.frecuencia,
              duracion: m.duracion,
              observaciones: m.observaciones || null,
            }))
          : [],
        instrucciones: cita.instrucciones || null,
        motivoCancelacion: cita.motivoCancelacion || null,
      };
    });

    return res.json({
      success: true,
      total: historial.length,
      paciente: {
        _id: paciente._id,
        nombre: `${(paciente as any).nombres} ${(paciente as any).apellidos}`.trim(),
        correo: (paciente as any).correo,
      },
      data: historial,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener el historial de citas",
      error: error.message,
    });
  }
};

// eliminarCita — hard delete sólo por admin, con audit log + protección a citas atendidas.
export const eliminarCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    // No permitir borrar citas ATENDIDAS (registro clínico inmutable NTS-022).
    if (cita.estado === "ATENDIDA") {
      return res.status(409).json({
        success: false,
        message: "No se puede eliminar una cita atendida (registro clínico inmutable). Use cancelar.",
      });
    }

    const usuario = (req as any).user;
    const snapshot = cita.toObject();

    await cita.deleteOne();

    // Audit log
    try {
      const { AuditLog } = await import("../models/AuditLog");
      await AuditLog.create({
        accion: "ELIMINAR_CITA",
        entidad: "Cita",
        entidadId: String(id),
        usuarioId: usuario?.userId ? String(usuario.userId) : undefined,
        usuarioNombre: usuario ? `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim() : undefined,
        rol: usuario?.rol,
        timestamp: new Date(),
        snapshot,
      });
    } catch (logErr) {
      console.error("AuditLog ELIMINAR_CITA falló:", logErr);
    }

    res.json({ success: true, message: "Cita eliminada correctamente" });
  } catch (error: any) {
    console.error("eliminarCita:", error);
    res.status(500).json({ success: false, message: "Error al eliminar la cita" });
  }
};

export const obtenerDetalleCitaHistorial = async (req: Request, res: Response) => {
  try {
    const cita = await Cita.findById(req.params.id)
      .populate("pacienteId", "nombres apellidos dni telefono correo")
      .populate({
        path: "doctorId",
        select: "nombres apellidos especialidadId",
        populate: { path: "especialidadId", select: "nombre" },
      })
      .lean();

    if (!cita) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    const doctor  = cita.doctorId as any;
    const paciente = cita.pacienteId as any;

    return res.json({
      success: true,
      data: {
        _id: cita._id,
        fecha: new Date(cita.fecha).toLocaleDateString("es-PE", {
          day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
        }),
        fechaRaw: cita.fecha,
        hora: cita.hora || null,
        tipo: cita.tipo,
        estado: cita.estado,
        paciente: {
          _id: paciente?._id,
          nombre: paciente ? `${paciente.nombres} ${paciente.apellidos}`.trim() : "—",
          dni: paciente?.dni || "—",
          telefono: paciente?.telefono || null,
          correo: paciente?.correo || null,
        },
        doctor: {
          _id: doctor?._id || null,
          nombre: doctor ? `${doctor.nombres} ${doctor.apellidos}`.trim() : "Sin asignar",
          especialidad: doctor?.especialidadId?.nombre || "Sin especialidad",
        },
        diagnostico: cita.diagnostico || null,
        tratamiento: cita.tratamiento || null,
        notasClinicas: cita.notasClinicas || null,
        medicamentosPrescritos: cita.medicamentosPrescritos?.length
          ? cita.medicamentosPrescritos.map((m: any) => ({
              nombre: m.nombre,
              dosis: m.dosis,
              frecuencia: m.frecuencia,
              duracion: m.duracion,
              observaciones: m.observaciones || null,
            }))
          : [],
        instrucciones: cita.instrucciones || null,
        motivoCancelacion: cita.motivoCancelacion || null,
        horarioAsistencia: cita.horarioAsistencia || null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Error al obtener el detalle de la cita",
      error: error.message,
    });
  }
};

export const obtenerAuditoriaCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const { AuditLog } = await import("../models/AuditLog");
    const logs = await AuditLog.find({ entidad: "Cita", entidadId: id })
      .sort({ timestamp: 1 });

    res.json({ success: true, data: logs });
  } catch (error: any) {
    console.error("obtenerAuditoriaCita:", error);
    res.status(500).json({ success: false, message: "Error al obtener auditoría" });
  }
};

export const actualizarCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { doctorId, notasClinicas } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    const usuario = (req as any).user;
    const { AuditLog } = await import("../models/AuditLog");

    // Validar doctorId si se proporciona
    if (doctorId) {
      const doctorExiste = await Doctor.exists({ _id: doctorId });
      if (!doctorExiste) {
        return res.status(400).json({ success: false, message: "Doctor inválido o no existe" });
      }

      // Log de cambio de doctor
      if (String(cita.doctorId || "") !== String(doctorId)) {
        const doctorAnterior = cita.doctorId ? await Doctor.findById(cita.doctorId).select("nombres apellidos") : null;
        const doctorNuevo = await Doctor.findById(doctorId).select("nombres apellidos");

        cita.doctorId = doctorId;

        try {
          await AuditLog.create({
            accion: "CAMBIO_DOCTOR",
            entidad: "Cita",
            entidadId: cita._id,
            usuarioId: usuario?.userId ? new mongoose.Types.ObjectId(usuario.userId) : undefined,
            usuarioNombre: usuario ? `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim() : undefined,
            descripcion: `Doctor: ${doctorAnterior ? `${doctorAnterior.nombres} ${doctorAnterior.apellidos}` : "Sin asignar"} → ${doctorNuevo ? `${doctorNuevo.nombres} ${doctorNuevo.apellidos}` : "Sin asignar"}`,
            timestamp: new Date(),
          });
        } catch (logErr) {
          console.error("AuditLog CAMBIO_DOCTOR falló:", logErr);
        }
      }
    }

    // Log de notas clínicas
    if (notasClinicas !== undefined && notasClinicas !== cita.notasClinicas) {
      const notasAnteriores = cita.notasClinicas || "";
      cita.notasClinicas = notasClinicas;

      try {
        await AuditLog.create({
          accion: "ACTUALIZAR_NOTAS",
          entidad: "Cita",
          entidadId: cita._id,
          usuarioId: usuario?.userId ? new mongoose.Types.ObjectId(usuario.userId) : undefined,
          usuarioNombre: usuario ? `${usuario.nombres ?? ""} ${usuario.apellidos ?? ""}`.trim() : undefined,
          descripcion: "Notas de la cita actualizadas",
          timestamp: new Date(),
        });
      } catch (logErr) {
        console.error("AuditLog ACTUALIZAR_NOTAS falló:", logErr);
      }
    }

    await cita.save();
    res.json({ success: true, data: cita, message: "Cita actualizada correctamente" });
  } catch (error: any) {
    console.error("actualizarCita:", error);
    res.status(500).json({ success: false, message: "Error al actualizar la cita" });
  }
};