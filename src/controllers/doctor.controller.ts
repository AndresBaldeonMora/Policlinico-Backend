import { Request, Response } from "express";
import { Doctor } from "../models/Doctor";
import { Cita } from "../models/Cita";  // ⭐ Agregar esta línea

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

// Obtener horarios disponibles de un doctor
export const obtenerHorariosDisponibles = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ 
        success: false, 
        message: "La fecha es requerida" 
      });
    }

    // Horarios del consultorio (8:00 AM - 5:00 PM, cada 30 min)
    const horariosBase = [
      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
      "16:00", "16:30", "17:00"
    ];

    // Buscar citas ya agendadas para ese doctor en esa fecha
    const citasAgendadas = await Cita.find({
      doctorId: id,
      fecha: new Date(fecha as string)
    }).select('hora');

    // Crear set de horas ocupadas
    const horasOcupadas = new Set(citasAgendadas.map(cita => cita.hora));

    // Crear array de horarios con disponibilidad
    const horariosDisponibles = horariosBase.map(hora => ({
      hora,
      disponible: !horasOcupadas.has(hora)
    }));

    res.json({ 
      success: true, 
      data: horariosDisponibles 
    });

  } catch (error: any) {
    console.error('Error al obtener horarios:', error);
    res.status(500).json({ 
      success: false, 
      message: "Error al obtener horarios disponibles",
      error: error.message 
    });
  }
};