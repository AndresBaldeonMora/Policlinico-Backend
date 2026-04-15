import { Request, Response } from "express";
import { Cita } from "../models/Cita";
import { Paciente } from "../models/Paciente";
import { Doctor } from "../models/Doctor";
import { BloqueoHorario } from "../models/BloqueoHorario";

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

    const citaExistente = await Cita.findOne({ doctorId, fecha: fechaUTC, hora });
    if (citaExistente) {
      return res.status(400).json({ success: false, message: "Ya existe una cita para ese horario" });
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

    const filtro: any = { fecha: { $gte: fechaInicio, $lte: fechaFin } };
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
      .populate("pacienteId", "nombres apellidos dni telefono")
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

export const marcarAsistencia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    if (cita.estado !== "PENDIENTE") {
      return res.status(400).json({ success: false, message: "Solo se puede confirmar asistencia en citas PENDIENTE" });
    }

    cita.estado = "ATENDIDA";
    cita.horarioAsistencia = new Date();
    await cita.save();

    res.json({ success: true, data: cita, message: "Asistencia confirmada correctamente" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error al marcar asistencia", error: error.message });
  }
};