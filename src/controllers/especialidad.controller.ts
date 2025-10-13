import { Request, Response } from "express";
import { Especialidad } from "../models/Especialidad";

export const listarEspecialidades = async (_req: Request, res: Response) => {
  try {
    const especialidades = await Especialidad.find();
    res.json({ success: true, data: especialidades });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al listar las especialidades",
      error: error.message,
    });
  }
};
