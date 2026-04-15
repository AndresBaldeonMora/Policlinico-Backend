import { Request, Response } from "express";
import { Medicamento } from "../models/Medicamento";

export const listarMedicamentos = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const filtro = q
      ? { nombre: { $regex: q, $options: "i" }, activo: true }
      : { activo: true };
    const medicamentos = await Medicamento.find(filtro).limit(50).sort({ nombre: 1 });
    res.json({ success: true, data: medicamentos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const crearMedicamento = async (req: Request, res: Response) => {
  try {
    const { nombre, principioActivo, presentacion } = req.body;
    if (!nombre || !principioActivo || !presentacion) {
      return res.status(400).json({ success: false, message: "nombre, principioActivo y presentacion son requeridos" });
    }
    const med = await Medicamento.create({ nombre, principioActivo, presentacion });
    res.status(201).json({ success: true, data: med });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
