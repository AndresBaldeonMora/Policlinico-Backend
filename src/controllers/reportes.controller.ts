import { Response } from "express";
import { OrdenExamen } from "../models/OrdenExamen";
import { Cita } from "../models/Cita";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { finDelDiaUTC } from "../utils/fecha.utils";

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
            $lte: finDelDiaUTC(fechaFin as string),
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

// ─────────────────────────────────────────────────────────────
// CITAS POR PERÍODO (agrupadas por estado)
// ─────────────────────────────────────────────────────────────
export const reporteCitasPorPeriodo = async (req: AuthRequest, res: Response) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ success: false, message: "fechaInicio y fechaFin son obligatorios" });
    }

    const fin = finDelDiaUTC(fechaFin as string);

    const citas = await Cita.aggregate([
      {
        $match: {
          fecha: { $gte: new Date(fechaInicio as string), $lte: fin },
        },
      },
      { $group: { _id: "$estado", cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1 } },
    ]);

    res.json({ success: true, data: citas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// CITAS POR ESPECIALIDAD
//   Cita → Doctor → Especialidad. Las citas sin doctor (laboratorio
//   sin médico asignado) se agrupan como "Sin especialidad".
// ─────────────────────────────────────────────────────────────
export const reporteCitasPorEspecialidad = async (req: AuthRequest, res: Response) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    const match: Record<string, unknown> = {};
    if (fechaInicio && fechaFin) {
      const fin = finDelDiaUTC(fechaFin as string);
      match.fecha = { $gte: new Date(fechaInicio as string), $lte: fin };
    }

    const data = await Cita.aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $lookup: {
          from: "doctors",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctor",
        },
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "especialidads",
          localField: "doctor.especialidadId",
          foreignField: "_id",
          as: "especialidad",
        },
      },
      { $unwind: { path: "$especialidad", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$especialidad.nombre", "Sin especialidad"] },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { cantidad: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};