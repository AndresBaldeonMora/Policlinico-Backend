import { Request, Response } from "express";
import { Horario } from "../models/Horario"; // Asegúrate de tener este modelo creado
import { Doctor } from "../models/Doctor";

// Crear horario
export const crearHorario = async (req: Request, res: Response) => {
  try {
    const { doctorId, fecha, hora } = req.body;

    if (!doctorId || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos",
      });
    }

    const horarioExistente = await Horario.findOne({
      doctorId,
      fecha,
      hora,
    });

    if (horarioExistente) {
      return res.status(400).json({
        success: false,
        message: "Este horario ya está registrado",
      });
    }

    const nuevoHorario = new Horario({
      doctorId,
      fecha,
      hora,
      reservado: false, // Inicialmente no está reservado
    });

    await nuevoHorario.save();

    res.status(201).json({
      success: true,
      message: "Horario creado exitosamente",
      data: nuevoHorario,
    });
  } catch (error: unknown) {
    // Verificamos si el error es una instancia de Error y accedemos a su mensaje
    if (error instanceof Error) {
      console.error("❌ Error al crear horario:", error.message);
      res.status(500).json({
        success: false,
        message: "Error al crear el horario",
        error: error.message,
      });
    } else {
      console.error("❌ Error desconocido:", error);
      res.status(500).json({
        success: false,
        message: "Error al crear el horario",
        error: "Error desconocido",
      });
    }
  }
};

// Verificar disponibilidad
export const verificarDisponibilidad = async (req: Request, res: Response) => {
  try {
    const { doctorId, fecha, hora } = req.params;

    const horario = await Horario.findOne({
      doctorId,
      fecha,
      hora,
    });

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: "Horario no encontrado",
      });
    }

    if (horario.reservado) {
      return res.status(400).json({
        success: false,
        message: "Este horario ya está reservado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Horario disponible",
    });
  } catch (error: unknown) {
    // Verificamos si el error es una instancia de Error y accedemos a su mensaje
    if (error instanceof Error) {
      console.error("❌ Error al verificar disponibilidad:", error.message);
      res.status(500).json({
        success: false,
        message: "Error al verificar disponibilidad",
        error: error.message,
      });
    } else {
      console.error("❌ Error desconocido:", error);
      res.status(500).json({
        success: false,
        message: "Error al verificar disponibilidad",
        error: "Error desconocido",
      });
    }
  }
};

// Reservar horario
export const reservarHorario = async (req: Request, res: Response) => {
  try {
    const { doctorId, fecha, hora } = req.body;

    const horario = await Horario.findOne({
      doctorId,
      fecha,
      hora,
    });

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: "Horario no encontrado",
      });
    }

    if (horario.reservado) {
      return res.status(400).json({
        success: false,
        message: "Este horario ya está reservado",
      });
    }

    horario.reservado = true; // Marcamos el horario como reservado
    await horario.save();

    res.status(200).json({
      success: true,
      message: "Horario reservado con éxito",
      data: horario,
    });
  } catch (error: unknown) {
    // Verificamos si el error es una instancia de Error y accedemos a su mensaje
    if (error instanceof Error) {
      console.error("❌ Error al reservar horario:", error.message);
      res.status(500).json({
        success: false,
        message: "Error al reservar el horario",
        error: error.message,
      });
    } else {
      console.error("❌ Error desconocido:", error);
      res.status(500).json({
        success: false,
        message: "Error al reservar el horario",
        error: "Error desconocido",
      });
    }
  }
};
