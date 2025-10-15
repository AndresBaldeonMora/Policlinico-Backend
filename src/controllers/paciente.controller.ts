import { Request, Response } from "express";
import { Paciente } from "../models/Paciente";

// ✅ Crear paciente
export const crearPaciente = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.create(req.body);
    res.status(201).json({
      success: true,
      message: "Paciente creado correctamente",
      data: paciente,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Listar todos los pacientes
export const listarPacientes = async (_req: Request, res: Response) => {
  try {
    const pacientes = await Paciente.find();
    res.json({ success: true, data: pacientes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Obtener paciente por ID
export const obtenerPaciente = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findById(req.params.id);
    if (!paciente)
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    res.json({ success: true, data: paciente });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Buscar paciente por DNI
export const buscarPacientePorDni = async (req: Request, res: Response) => {
  try {
    const { dni } = req.params;
    const paciente = await Paciente.findOne({ dni });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        message: "No se encontró ningún paciente con ese DNI",
      });
    }

    res.json({
      success: true,
      data: {
        _id: paciente._id,
        dni: paciente.dni,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        telefono: paciente.telefono,
        correo: paciente.correo,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
