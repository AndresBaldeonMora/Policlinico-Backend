import { Request, Response } from "express";
import { Doctor } from "../models/Doctor";

// Listar doctores
export const listarDoctores = async (_req: Request, res: Response) => {
  try {
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
    if (!doctor) {
      return res.status(404).json({ 
        success: false, 
        message: "Doctor no encontrado" 
      });
    }
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ⭐ CORREGIR ESTA FUNCIÓN
export const obtenerDoctoresPorEspecialidad = async (req: Request, res: Response) => {
  try {
    const { especialidadId } = req.params;
    
    console.log('Buscando doctores para especialidad:', especialidadId); // Debug
    
    const doctores = await Doctor.find({ especialidadId })
      .populate('especialidadId', 'nombre');
    
    console.log('Doctores encontrados:', doctores.length); // Debug
    
    res.json({ success: true, data: doctores });
  } catch (error: any) {
    console.error('Error en obtenerDoctoresPorEspecialidad:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error al buscar doctores",
      error: error.message 
    });
  }
};