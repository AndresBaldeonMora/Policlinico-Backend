import { Request, Response } from "express";
import { Paciente } from "../models/Paciente";

// 🟢 Crear paciente
export const crearPaciente = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.create(req.body);
    res.status(201).json({
      success: true,
      message: "Paciente creado correctamente",
      data: paciente,
    });
  } catch (error: any) {
    console.error("❌ Error al crear paciente:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟣 Listar todos los pacientes
export const listarPacientes = async (_req: Request, res: Response) => {
  try {
    const pacientes = await Paciente.find();
    res.json({ success: true, data: pacientes });
  } catch (error: any) {
    console.error("❌ Error al listar pacientes:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔵 Obtener paciente por ID
export const obtenerPaciente = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findById(req.params.id);
    if (!paciente) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }
    res.json({ success: true, data: paciente });
  } catch (error: any) {
    console.error("❌ Error al obtener paciente:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟠 Buscar paciente por DNI
export const buscarPacientePorDni = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findOne({ dni: req.params.dni });
    if (!paciente) {
      return res.status(404).json({ success: false, message: "No se encontró ningún paciente con ese DNI" });
    }
    res.json({ success: true, data: paciente });
  } catch (error: any) {
    console.error("❌ Error al buscar paciente por DNI:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🟡 Actualizar paciente por ID
export const actualizarPaciente = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!paciente) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }
    res.json({ success: true, message: "Paciente actualizado correctamente", data: paciente });
  } catch (error: any) {
    console.error("❌ Error al actualizar paciente:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};