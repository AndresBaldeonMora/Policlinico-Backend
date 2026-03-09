import { Request, Response } from "express";
import { Doctor } from "../models/Doctor";
import { Cita } from "../models/Cita";

// Listar todos los doctores
export const listarDoctores = async (_req: Request, res: Response) => {
  try {
    const doctores = await Doctor.find()
      .populate("especialidadId", "nombre")
      .sort({ apellidos: 1 });
    res.json({ success: true, data: doctores });
  } catch (error: any) {
    console.error("❌ Error al listar doctores:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener doctor por ID
export const obtenerDoctor = async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("especialidadId", "nombre");
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    }
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear doctor
export const crearDoctor = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, correo, telefono, especialidadId, cmp, supabaseId } = req.body;

    if (!nombres?.trim() || !apellidos?.trim() || !correo?.trim() || !telefono?.trim() || !especialidadId) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
    }

    const doctor = await Doctor.create({ nombres, apellidos, correo, telefono, especialidadId, cmp, supabaseId });
    const populated = await doctor.populate("especialidadId", "nombre");
    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    console.error("❌ Error al crear doctor:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar doctor
export const actualizarDoctor = async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("especialidadId", "nombre");

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    }
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Doctores por especialidad
export const obtenerDoctoresPorEspecialidad = async (req: Request, res: Response) => {
  try {
    const doctores = await Doctor.find({ especialidadId: req.params.especialidadId })
      .populate("especialidadId", "nombre");
    res.json({ success: true, data: doctores });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Horarios disponibles de un doctor para una fecha
export const obtenerHorariosDisponibles = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ success: false, message: "La fecha es requerida" });
    }

    const horariosBase = [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30", "12:00",
    ];

    const fechaInicio = new Date(fecha as string);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha as string);
    fechaFin.setHours(23, 59, 59, 999);

    const citasAgendadas = await Cita.find({
      doctorId: id,
      fecha: { $gte: fechaInicio, $lte: fechaFin },
    }).select("hora");

    const horasOcupadas = new Set(citasAgendadas.map((c) => c.hora));

    const horariosDisponibles = horariosBase.map((hora) => ({
      hora,
      disponible: !horasOcupadas.has(hora),
    }));

    res.json({ success: true, data: horariosDisponibles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};