import { Request, Response } from "express";
import { Doctor } from "../models/Doctor";

// Listar doctores
export const listarDoctores = async (_req: Request, res: Response) => {
  try {
    // Obtener todos los doctores y popular la especialidad
    const doctores = await Doctor.find().populate("especialidadId");
    res.json({ success: true, data: doctores });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener doctor por ID
export const obtenerDoctor = async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("especialidadId");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// **Nueva función para obtener doctores por especialidad**
export const obtenerDoctoresPorEspecialidad = async (req: Request, res: Response) => {
  const especialidadId = req.params.especialidadId;

  try {
    // Buscar los doctores que coinciden con el especialidadId
    const doctores = await Doctor.find({ especialidad: especialidadId }); // Asegúrate de que la propiedad 'especialidad' esté correctamente definida en tu modelo

    if (doctores.length > 0) {
      return res.json({ success: true, data: doctores });
    } else {
      return res.status(404).json({ success: false, message: "No hay doctores disponibles para esta especialidad" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Error al obtener doctores" });
  }
};