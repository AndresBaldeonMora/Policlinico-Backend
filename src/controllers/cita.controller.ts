import { Request, Response } from "express";
import { Cita } from "../models/Cita";

export const crearCita = async (req: Request, res: Response) => {
  try {
    const cita = await Cita.create(req.body);
    res.status(201).json({ success: true, message: "Cita registrada correctamente", data: cita });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listarCitas = async (_req: Request, res: Response) => {
  try {
    const citas = await Cita.find().populate("pacienteId doctorId");
    res.json({ success: true, data: citas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerCita = async (req: Request, res: Response) => {
  try {
    const cita = await Cita.findById(req.params.id).populate("pacienteId doctorId");
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });
    res.json({ success: true, data: cita });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const eliminarCita = async (req: Request, res: Response) => {
  try {
    const cita = await Cita.findByIdAndDelete(req.params.id);
    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });
    res.json({ success: true, message: "Cita eliminada correctamente" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
