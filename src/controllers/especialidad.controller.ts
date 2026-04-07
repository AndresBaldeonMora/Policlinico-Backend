import { Request, Response } from "express";
import { Especialidad } from "../models/Especialidad";

// Listar todas las especialidades
export const listarEspecialidades = async (_req: Request, res: Response) => {
  try {
    const especialidades = await Especialidad.find().sort({ nombre: 1 });
    const data = especialidades.map((e) => ({
      id: e._id.toString(),
      nombre: e.nombre,
      tieneLaboratorio: e.tieneLaboratorio,
    }));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener especialidad por ID
export const obtenerEspecialidad = async (req: Request, res: Response) => {
  try {
    const especialidad = await Especialidad.findById(req.params.id);
    if (!especialidad) {
      return res.status(404).json({ success: false, message: "Especialidad no encontrada" });
    }
    res.json({ success: true, data: { id: especialidad._id.toString(), nombre: especialidad.nombre, tieneLaboratorio: especialidad.tieneLaboratorio } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear especialidad
export const crearEspecialidad = async (req: Request, res: Response) => {
  try {
    const { nombre, tieneLaboratorio } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
    }
    const especialidad = await Especialidad.create({ nombre: nombre.trim(), tieneLaboratorio: tieneLaboratorio ?? false });
    res.status(201).json({ success: true, data: { id: especialidad._id.toString(), nombre: especialidad.nombre, tieneLaboratorio: especialidad.tieneLaboratorio } });
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