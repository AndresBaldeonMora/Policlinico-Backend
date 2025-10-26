import { Request, Response } from "express";
import { Especialidad } from "../models/Especialidad";

export const listarEspecialidades = async (req: Request, res: Response) => {
  try {
    const especialidades = await Especialidad.find();

    // Mapear para asegurar que devuelve "id"
    const data = especialidades.map((e: any) => ({
      id: e._id.toString(), // Convertir ObjectId a string
      nombre: e.nombre,
      descripcion: e.descripcion
    }));

    res.json({ success: true, data });
  } catch (error: any) { // Asegura que 'error' sea tratado como 'any'
    res.status(500).json({ success: false, message: error.message });
  }
};
