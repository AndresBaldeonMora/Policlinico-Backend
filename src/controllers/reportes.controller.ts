import { Response } from "express";
import { OrdenExamen } from "../models/OrdenExamen";
import { AuthRequest } from "../middlewares/authMiddlewares";

// ─────────────────────────────────────────────────────────────
// REPORTES
// ─────────────────────────────────────────────────────────────

export const reporteOrdenesPorPeriodo = async (req: AuthRequest, res: Response) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, message: "fechaInicio y fechaFin son obligatorios" });
    }

    const ordenes = await OrdenExamen.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(fechaInicio as string),
            $lte: new Date(fechaFin as string),
          },
        },
      },
      {
        $group: {
          _id: "$estado",
          cantidad: { $sum: 1 },
        },
      },
    ]);

    res.json({ success: true, data: ordenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reporteExamenesMasSolicitados = async (req: AuthRequest, res: Response) => {
  try {
    const examenes = await OrdenExamen.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.examenId",
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    res.json({ success: true, data: examenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};