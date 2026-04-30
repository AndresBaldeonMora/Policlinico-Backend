import { Request, Response } from "express";
import { Cita } from "../models/Cita";
import { Paciente } from "../models/Paciente";
import { Doctor } from "../models/Doctor";
import { BloqueoHorario } from "../models/BloqueoHorario";
import { verificarCitasVencidas } from "../jobs/vencimientoCitas";

// ✅ Crea fecha en UTC puro para evitar desfase de zona horaria
const crearFechaUTC = (fechaString: string): Date => {
  const [year, month, day] = fechaString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const crearCita = async (req: Request, res: Response) => {
  try {
    const { pacienteId, doctorId, fecha, hora } = req.body;

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

    const citaExistenteDoctor = await Cita.findOne({ doctorId, fecha: fechaUTC, hora, estado: { $nin: ["CANCELADA", "VENCIDA"] } });
    if (citaExistenteDoctor) {
      return res.status(400).json({ success: false, message: "Ya existe una cita para ese horario con este doctor" });
    }

    const citaExistentePaciente = await Cita.findOne({ pacienteId, fecha: fechaUTC, hora, estado: { $nin: ["CANCELADA", "VENCIDA"] } });
    if (citaExistentePaciente) {
       return res.status(400).json({ success: false, message: "El paciente ya tiene otra cita médica reservada para esta misma fecha y hora" });
    }

    const nuevaCita = new Cita({ pacienteId, doctorId, fecha: fechaUTC, hora, estado: "PENDIENTE" });
    await nuevaCita.save();

    res.status(201).json({ success: true, data: nuevaCita, message: "Cita creada exitosamente" });
  } catch (error: any) {
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

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    const fechaUTC = crearFechaUTC(fecha);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Formato de nueva fecha inválido" });
    }

    const citaExistente = await Cita.findOne({
      _id: { $ne: id },
      doctorId: cita.doctorId,
      fecha: fechaUTC,
      hora,
    });

    if (citaExistente) {
      return res.status(400).json({ success: false, message: "Ya existe una cita para ese horario" });
    }

    cita.fecha  = fechaUTC;
    cita.hora   = hora;
    cita.estado = "REPROGRAMADA";
    await cita.save();

    res.json({ success: true, data: cita, message: "Cita reprogramada exitosamente" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error al reprogramar cita", error: error.message });
  }
};

export const obtenerCitasCalendario = async (req: Request, res: Response) => {
  try {
    const { fecha, vista = "mes", medicoId } = req.query;

    // ✅ Parsear fecha en UTC para evitar desfase
    const [y, m, d] = ((fecha as string) || "").split("-").map(Number);
    const fechaBase = fecha
      ? new Date(Date.UTC(y, m - 1, d))
      : new Date();

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

export const cancelarCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivoCancelacion } = req.body;

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    if (cita.estado === "CANCELADA") {
      return res.status(400).json({ success: false, message: "La cita ya está cancelada" });
    }

    cita.estado = "CANCELADA";
    if (motivoCancelacion) cita.motivoCancelacion = motivoCancelacion;
    await cita.save();

    res.json({ success: true, data: cita, message: "Cita cancelada correctamente" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error al cancelar la cita", error: error.message });
  }
};

// marcarAsistencia — ahora pone ASISTIO, no ATENDIDA
export const marcarAsistencia = async (req: Request, res: Response) => {
  try {
    const cita = await Cita.findById(req.params.id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    if (cita.estado !== "PENDIENTE" && cita.estado !== "REPROGRAMADA") {
      return res.status(400).json({ success: false, message: "Solo se puede marcar asistencia en citas PENDIENTE o REPROGRAMADA" });
    }

    cita.estado = "ASISTIO";
    cita.horarioAsistencia = new Date();
    await cita.save();

    res.json({ success: true, data: cita, message: "Asistencia marcada correctamente" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error al marcar asistencia", error: error.message });
  }
};

// cambiarEstado — nuevo endpoint para ATENDIDA/CANCELADA desde detalle
export const cambiarEstado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosValidos = ["PENDIENTE", "ASISTIO", "ATENDIDA", "CANCELADA", "REPROGRAMADA"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado inválido" });
    }

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    cita.estado = estado;
    await cita.save();

    res.json({ success: true, data: cita, message: "Estado actualizado" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error al cambiar estado", error: error.message });
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
    const correo: string | undefined =
      (req.query.correo as string) || req.body.correo;

    if (!correo) {
      return res.status(400).json({
        success: false,
        message: "Se requiere el correo del paciente",
      });
    }

    const paciente = await Paciente.findOne({
      correo: correo.toLowerCase().trim(),
    }).lean();

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: "No se encontró un paciente con ese correo",
      });
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