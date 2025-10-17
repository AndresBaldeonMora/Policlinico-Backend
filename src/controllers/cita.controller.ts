import { Request, Response } from "express";
import { Cita } from "../models/Cita";

// Crear cita
export const crearCita = async (req: Request, res: Response) => {
  try {
    const { pacienteId, doctorId, fecha, hora } = req.body;

    console.log('📥 Datos recibidos:', { pacienteId, doctorId, fecha, hora });

    // Validar campos requeridos
    if (!pacienteId || !doctorId || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos",
      });
    }

    // Verificar si ya existe una cita para ese doctor en esa fecha y hora
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

    // Crear la cita
    const nuevaCita = new Cita({
      pacienteId,
      doctorId,
      fecha: new Date(fecha),
      hora,
      estado: "pendiente",
    });

    await nuevaCita.save();

    console.log('✅ Cita creada:', nuevaCita);

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

// Listar citas
export const listarCitas = async (_req: Request, res: Response) => {
  try {
    const citas = await Cita.find()
      .populate("pacienteId", "nombres apellidos dni")
      .populate({
        path: "doctorId",
        populate: {
          path: "especialidadId",
          select: "nombre",
        },
      })
      .sort({ fecha: -1, hora: -1 });

    res.json({ success: true, data: citas });
  } catch (error: any) {
    console.error("Error al listar citas:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar cita
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
    console.error("Error al eliminar cita:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};