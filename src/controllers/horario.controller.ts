import { Request, Response } from "express";
import { Horario } from "../models/Horario";

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

// Reservar horario — atómico (anti race condition) + ownership del paciente.
export const reservarHorario = async (req: any, res: Response) => {
  try {
    const { doctorId, fecha, hora } = req.body;

    // Si el rol es PACIENTE y se envió pacienteId en el body, forzar al del token.
    const rol = String(req.user?.rol ?? "").toUpperCase();
    if (rol === "PACIENTE" && req.body.pacienteId
        && String(req.body.pacienteId) !== String(req.user?.pacienteId)) {
      return res.status(403).json({
        success: false,
        message: "Sólo puedes reservar a tu propio nombre",
      });
    }

    // Atómico: actualiza sólo si el slot está libre.
    const horario = await Horario.findOneAndUpdate(
      { doctorId, fecha, hora, reservado: { $ne: true } },
      { $set: { reservado: true } },
      { new: true }
    );

    if (!horario) {
      // Distinguir 404 (slot inexistente) de 409 (ya reservado por carrera).
      const existe = await Horario.findOne({ doctorId, fecha, hora }).lean();
      if (!existe) {
        return res.status(404).json({ success: false, message: "Horario no encontrado" });
      }
      return res.status(409).json({ success: false, message: "Este horario ya está reservado" });
    }

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
