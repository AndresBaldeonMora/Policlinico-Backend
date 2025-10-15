import { Request, Response } from "express";
import { Cita } from "../models/Cita";

export const crearCita = async (req: Request, res: Response) => {
  try {
    const { pacienteId, doctorId, fecha, hora } = req.body;

    if (!pacienteId || !doctorId || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son obligatorios (pacienteId, doctorId, fecha, hora)",
      });
    }

    const citaExistente = await Cita.findOne({ doctorId, fecha, hora });
    if (citaExistente) {
      return res.status(400).json({
        success: false,
        message: "Ya existe una cita para ese doctor en la misma fecha y hora",
      });
    }

    const cita = await Cita.create({ pacienteId, doctorId, fecha, hora });
    res.status(201).json({
      success: true,
      message: "Cita registrada correctamente",
      data: cita,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listarCitas = async (_req: Request, res: Response) => {
  try {
    const citas = await Cita.find()
      .populate("pacienteId")
      .populate({ path: "doctorId", populate: { path: "especialidadId" } })
      .sort({ fecha: 1, hora: 1 });

    res.json({ success: true, data: citas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const eliminarCita = async (req: Request, res: Response) => {
  try {
    const cita = await Cita.findByIdAndDelete(req.params.id);
    if (!cita) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }
    res.json({ success: true, message: "Cita eliminada correctamente" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
