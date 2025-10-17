import { Request, Response } from "express";
import { Cita } from "../models/Cita";
import { Paciente } from "../models/Paciente";
import { Doctor } from "../models/Doctor";

// 🧩 Función auxiliar: calcula el estado actual de una cita
const calcularEstado = (fecha: Date, hora: string, estado: string): string => {
  if (estado === "reprogramado") return "reprogramado"; // prioridad

  const ahora = new Date();
  const fechaHoraCita = new Date(fecha);
  const [horas, minutos] = hora.split(":").map(Number);
  fechaHoraCita.setHours(horas, minutos, 0, 0);

  const diferenciaMin = (ahora.getTime() - fechaHoraCita.getTime()) / (1000 * 60);
  if (diferenciaMin > 30) return "finalizado";
  return "pendiente";
};

// 🟢 Crear cita
export const crearCita = async (req: Request, res: Response) => {
  try {
    const { pacienteId, doctorId, fecha, hora } = req.body;

    if (!pacienteId || !doctorId || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos",
      });
    }

    const citaExistente = await Cita.findOne({
      doctorId,
      fecha: new Date(fecha),
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
      fecha: new Date(fecha),
      hora,
      estado: "pendiente",
    });

    await nuevaCita.save();
    res.status(201).json({
      success: true,
      data: nuevaCita,
      message: "Cita creada exitosamente",
    });
  } catch (error: any) {
    console.error("❌ Error al crear cita:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear la cita",
      error: error.message,
    });
  }
};

// 🟣 Listar citas (con DNI, paciente, doctor y especialidad)
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
      .sort({ fecha: -1, hora: -1 });

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
        doctor: doctor
          ? `${doctor?.nombres || ""} ${doctor?.apellidos || ""}`.trim()
          : "Sin asignar",
        especialidad: doctor?.especialidadId?.nombre || "Sin especialidad",
        fecha: fechaFormateada,
        hora: cita.hora,
        estado: estadoActual,
      };
    });

    res.json({ success: true, data: citasProcesadas });
  } catch (error: any) {
    console.error("❌ Error al listar citas:", error);
    res.status(500).json({
      success: false,
      message: "Error al listar citas",
      error: error.message,
    });
  }
};

// 🔴 Eliminar cita
export const eliminarCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cita = await Cita.findByIdAndDelete(id);

    if (!cita) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Cita eliminada exitosamente",
    });
  } catch (error: any) {
    console.error("❌ Error al eliminar cita:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar cita",
      error: error.message,
    });
  }
};

// 🔵 Reprogramar cita
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

    cita.fecha = new Date(fecha);
    cita.hora = hora;
    cita.estado = "reprogramado";

    await cita.save();

    res.json({
      success: true,
      data: cita,
      message: "Cita reprogramada exitosamente",
    });
  } catch (error: any) {
    console.error("❌ Error al reprogramar cita:", error);
    res.status(500).json({
      success: false,
      message: "Error al reprogramar cita",
      error: error.message,
    });
  }
};
