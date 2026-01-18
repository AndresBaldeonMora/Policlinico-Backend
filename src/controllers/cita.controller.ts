import { Request, Response } from "express";
import { Cita } from "../models/Cita";
import { Paciente } from "../models/Paciente";
import { Doctor } from "../models/Doctor";

const crearFechaLocal = (fechaString: string): Date => {
  const [year, month, day] = fechaString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const calcularEstado = (fecha: Date, hora: string, estado: string): string => {
  if (estado === "REPROGRAMADA") return "REPROGRAMADA";
  if (estado === "ATENDIDA") return "ATENDIDA";
  if (estado === "CANCELADA") return "CANCELADA";

  const ahora = new Date();
  const fechaHoraCita = new Date(fecha);
  const [horas, minutos] = hora.split(":").map(Number);
  fechaHoraCita.setHours(horas, minutos, 0, 0);

  const diferenciaMin = (ahora.getTime() - fechaHoraCita.getTime()) / (1000 * 60);
  if (diferenciaMin > 30) return "ATENDIDA";
  return "PENDIENTE";
};

export const crearCita = async (req: Request, res: Response) => {
  try {
    const { pacienteId, doctorId, fecha, hora } = req.body;

    if (!pacienteId || !doctorId || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos",
      });
    }

    const [pacienteExiste, doctorExiste] = await Promise.all([
      Paciente.exists({ _id: pacienteId }),
      Doctor.exists({ _id: doctorId }),
    ]);

    if (!pacienteExiste) {
      return res.status(400).json({ success: false, message: "Paciente inválido o no existe" });
    }
    if (!doctorExiste) {
      return res.status(400).json({ success: false, message: "Doctor inválido o no existe" });
    }

    const fechaInicioDia = crearFechaLocal(fecha);
    if (isNaN(fechaInicioDia.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Formato de fecha inválido proporcionado",
      });
    }

    const citaExistente = await Cita.findOne({
      doctorId,
      fecha: fechaInicioDia,
      hora,
    });

    if (citaExistente) {
      return res.status(400).json({
        success: false,
        message: "Ya existe una cita para ese horario",
      });
    }

    const nuevaCita = new Cita({
      pacienteId,
      doctorId,
      fecha: fechaInicioDia,
      hora,
      estado: "PENDIENTE",
    });

    await nuevaCita.save();

    res.status(201).json({
      success: true,
      data: nuevaCita,
      message: "Cita creada exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al crear la cita",
      error: error.message,
    });
  }
};

export const listarCitas = async (_req: Request, res: Response) => {
  try {
    const citas = await Cita.find()
      .populate("pacienteId", "nombres apellidos dni")
      .populate({
        path: "doctorId",
        select: "nombres apellidos especialidadId",
        populate: {
          path: "especialidadId",
          select: "nombre",
        },
      })
      .sort({ _id: -1 });

    const citasProcesadas = citas.map((cita, index) => {
      const paciente = cita.pacienteId as any;
      const doctor = cita.doctorId as any;

      const fechaFormateada = new Date(cita.fecha).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const estadoActual = calcularEstado(cita.fecha, cita.hora, cita.estado);

      return {
        id: index + 1,
        _id: cita._id,
        dni: paciente?.dni || "—",
        paciente: `${paciente?.nombres || ""} ${paciente?.apellidos || ""}`.trim(),
        doctor: doctor ? `${doctor?.nombres || ""} ${doctor?.apellidos || ""}`.trim() : "Sin asignar",
        doctorId: doctor?._id || "",
        especialidad: doctor?.especialidadId?.nombre || "Sin especialidad",
        fecha: fechaFormateada,
        hora: cita.hora,
        estado: estadoActual,
      };
    });

    res.json({ success: true, data: citasProcesadas });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al listar citas",
      error: error.message,
    });
  }
};

export const reprogramarCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fecha, hora } = req.body;

    const cita = await Cita.findById(id);
    if (!cita) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada",
      });
    }

    const fechaInicioDia = crearFechaLocal(fecha);
    if (isNaN(fechaInicioDia.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Formato de nueva fecha inválido",
      });
    }

    const citaExistente = await Cita.findOne({
      _id: { $ne: id },
      doctorId: cita.doctorId,
      fecha: fechaInicioDia,
      hora,
    });

    if (citaExistente) {
      return res.status(400).json({
        success: false,
        message: "Ya existe una cita para ese horario",
      });
    }

    cita.fecha = fechaInicioDia;
    cita.hora = hora;
    cita.estado = "REPROGRAMADA";

    await cita.save();

    res.json({
      success: true,
      data: cita,
      message: "Cita reprogramada exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al reprogramar cita",
      error: error.message,
    });
  }
};

export const obtenerCitasCalendario = async (req: Request, res: Response) => {
  try {
    const { fecha, vista = "mes", medicoId } = req.query;

    const fechaBase = fecha ? crearFechaLocal(fecha as string) : new Date();

    let fechaInicio: Date;
    let fechaFin: Date;

    switch (vista) {
      case "dia":
        fechaInicio = new Date(fechaBase);
        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin = new Date(fechaBase);
        fechaFin.setHours(23, 59, 59, 999);
        break;

      case "semana": {
        const offset = (fechaBase.getDay() + 6) % 7;
        fechaInicio = new Date(fechaBase);
        fechaInicio.setDate(fechaBase.getDate() - offset);
        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaInicio.getDate() + 6);
        fechaFin.setHours(23, 59, 59, 999);
        break;
      }

      case "mes":
      default:
        fechaInicio = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1);
        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0);
        fechaFin.setHours(23, 59, 59, 999);
    }

    const filtro: any = { fecha: { $gte: fechaInicio, $lte: fechaFin } };
    if (medicoId) filtro.doctorId = medicoId;

    const citas = await Cita.find(filtro)
      .populate("pacienteId", "nombres apellidos dni telefono")
      .populate("doctorId", "nombres apellidos")
      .sort({ fecha: 1, hora: 1 });

    res.json({ success: true, data: citas });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
