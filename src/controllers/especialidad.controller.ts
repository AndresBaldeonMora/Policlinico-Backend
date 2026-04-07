import { Request, Response } from "express";
import { Especialidad } from "../models/Especialidad";

const validarNombre = (nombre: string): string | null => {
  if (!nombre?.trim()) return "El nombre es obligatorio";
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(nombre.trim()))
    return "El nombre solo puede contener letras y espacios";
  if (nombre.trim().length < 3) return "El nombre debe tener al menos 3 caracteres";
  if (nombre.trim().length > 20) return "El nombre no puede superar los 50 caracteres";
  return null;
};

const mapEspecialidad = (e: any) => ({
  id: e._id.toString(),
  nombre: e.nombre,
  tieneLaboratorio: e.tieneLaboratorio,
  examenes: (e.examenes ?? []).map((ex: any) =>
    ex._id ? { _id: ex._id.toString(), nombre: ex.nombre, tipo: ex.tipo } : ex.toString()
  ),
});

// Listar todas las especialidades
export const listarEspecialidades = async (_req: Request, res: Response) => {
  try {
    const especialidades = await Especialidad.find()
      .populate("examenes", "nombre tipo")  
      .sort({ nombre: 1 });
    res.json({ success: true, data: especialidades.map(mapEspecialidad) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener especialidad por ID
export const obtenerEspecialidad = async (req: Request, res: Response) => {
  try {
    const especialidad = await Especialidad.findById(req.params.id)
      .populate("examenes", "nombre tipo"); 
    if (!especialidad)
      return res.status(404).json({ success: false, message: "Especialidad no encontrada" });
    res.json({ success: true, data: mapEspecialidad(especialidad) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear especialidad
export const crearEspecialidad = async (req: Request, res: Response) => {
  try {
    const { nombre, tieneLaboratorio, examenes } = req.body;
    const error = validarNombre(nombre);                                     
    if (error) return res.status(400).json({ success: false, message: error });
    const especialidad = await Especialidad.create({
      nombre: nombre.trim(),
      tieneLaboratorio: tieneLaboratorio ?? false,
      examenes: examenes ?? [],  
    });
    res.status(201).json({ success: true, data: mapEspecialidad(especialidad) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar especialidad
export const eliminarEspecialidad = async (req: Request, res: Response) => {
  try {
    const especialidad = await Especialidad.findByIdAndDelete(req.params.id);
    if (!especialidad) {
      return res.status(404).json({ success: false, message: "Especialidad no encontrada" });
    }
    res.json({ success: true, message: "Especialidad eliminada" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const actualizarEspecialidad = async (req: Request, res: Response) => {
  try {
    const { nombre, tieneLaboratorio, examenes } = req.body;
    if (nombre !== undefined) {                                               
      const error = validarNombre(nombre);
      if (error) return res.status(400).json({ success: false, message: error });
    }
    const especialidad = await Especialidad.findByIdAndUpdate(
      req.params.id,
      {
        nombre: nombre?.trim(),
        tieneLaboratorio,
        ...(examenes !== undefined && { examenes }),  
      },
      { new: true, runValidators: true }
    ).populate("examenes", "nombre tipo");
    if (!especialidad)
      return res.status(404).json({ success: false, message: "Especialidad no encontrada" });
    res.json({ success: true, data: mapEspecialidad(especialidad) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};