import { Request, Response } from "express";
import { Doctor } from "../models/Doctor";
import { Cita } from "../models/Cita";

// ✅ Listar doctores
export const listarDoctores = async (_req: Request, res: Response) => {
  try {
    const doctores = await Doctor.find().populate("especialidadId", "nombre");
    res.json({ success: true, data: doctores });
  } catch (error: any) {
    console.error("❌ Error al listar doctores:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Obtener doctor por ID
export const obtenerDoctor = async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(
      "especialidadId",
      "nombre"
    );
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor no encontrado",
      });
    }
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    console.error("❌ Error al obtener doctor:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Doctores por especialidad (usado en ReservaCita)
export const obtenerDoctoresPorEspecialidad = async (
  req: Request,
  res: Response
) => {
  try {
    const { especialidadId } = req.params;

    const doctores = await Doctor.find({ especialidadId }).populate(
      "especialidadId",
      "nombre"
    );

    res.json({ success: true, data: doctores });
  } catch (error: any) {
    console.error("❌ Error en obtenerDoctoresPorEspecialidad:", error);
    res.status(500).json({
      success: false,
      message: "Error al buscar doctores",
      error: error.message,
    });
  }
};

// ✅ Horarios disponibles de un doctor (usado en ReservaCita y Reprogramación)
export const obtenerHorariosDisponibles = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { fecha } = req.query;

    if (!fecha) {
      return res
        .status(400)
        .json({ success: false, message: "La fecha es requerida" });
    }

    // Horarios base (ajusta a gusto)
    const horariosBase = [
      "08:00",
      "08:30",
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
    ];

    const fechaInicio = new Date(fecha as string);
    fechaInicio.setHours(0, 0, 0, 0);

    const fechaFin = new Date(fecha as string);
    fechaFin.setHours(23, 59, 59, 999);

    const citasAgendadas = await Cita.find({
      doctorId: id,
      fecha: {
        $gte: fechaInicio,
        $lte: fechaFin,
      },
    }).select("hora");

    const horasOcupadas = new Set(citasAgendadas.map((c) => c.hora));

    const horariosDisponibles = horariosBase.map((hora) => ({
      hora,
      disponible: !horasOcupadas.has(hora),
    }));

    res.json({ success: true, data: horariosDisponibles });
  } catch (error: any) {
    console.error("❌ Error al obtener horarios:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener horarios disponibles",
      error: error.message,
    });
  }
};
