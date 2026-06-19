import { Response } from "express";
import { HorarioMensual } from "../models/HorarioMensual";
import { Doctor } from "../models/Doctor";
import { AuditLog } from "../models/AuditLog";
import { AuthRequest } from "../middlewares/authMiddlewares";

/**
 * POST /api/horarios-mensuales
 * Crea o reemplaza el horario mensual de un médico (RECEPCIONISTA + ADMINISTRADOR).
 */
export const guardarHorarioMensual = async (req: AuthRequest, res: Response) => {
  try {
    const { medicoId, mes, anio, diasSemana, horaInicio, horaFin } = req.body;

    if (!medicoId || !mes || !anio || !horaInicio || !horaFin) {
      return res.status(400).json({ success: false, message: "medicoId, mes, anio, horaInicio y horaFin son requeridos" });
    }

    const mesNum = Number(mes);
    const anioNum = Number(anio);
    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({ success: false, message: "El mes debe estar entre 1 y 12" });
    }
    if (!Number.isInteger(anioNum) || anioNum < 2000) {
      return res.status(400).json({ success: false, message: "Año inválido" });
    }
    if (!Array.isArray(diasSemana) || diasSemana.length === 0) {
      return res.status(400).json({ success: false, message: "Debe seleccionar al menos un día de la semana" });
    }
    if (!diasSemana.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)) {
      return res.status(400).json({ success: false, message: "Días de la semana inválidos (0=Domingo … 6=Sábado)" });
    }
    if (horaInicio >= horaFin) {
      return res.status(400).json({ success: false, message: "La hora de inicio debe ser anterior a la hora de fin" });
    }

    const doctor = await Doctor.findById(medicoId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    }

    const diasUnicos = [...new Set<number>(diasSemana)].sort((a, b) => a - b);

    // Upsert: si ya existe horario para ese médico/mes/año, se reemplaza.
    const horario = await HorarioMensual.findOneAndUpdate(
      { medicoId, mes: mesNum, anio: anioNum },
      { medicoId, mes: mesNum, anio: anioNum, diasSemana: diasUnicos, horaInicio, horaFin },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("medicoId", "nombres apellidos");

    if (!horario) {
      return res.status(500).json({ success: false, message: "No se pudo guardar el horario mensual" });
    }

    try {
      await AuditLog.create({
        usuarioId: req.user?.userId,
        usuarioNombre: req.user?.nombres ? `${req.user.nombres} ${req.user.apellidos || ""}`.trim() : undefined,
        accion: "guardar_horario_mensual",
        entidad: "HorarioMensual",
        entidadId: horario._id,
        descripcion: `Horario mensual ${mesNum}/${anioNum} guardado para Dr. ${doctor.nombres} ${doctor.apellidos}`,
        detalles: { medicoId, mes: mesNum, anio: anioNum, diasSemana: diasUnicos, horaInicio, horaFin },
        ipAddress: req.ip,
      });
    } catch (err) {
      console.error("Error al registrar audit log:", err);
    }

    res.status(201).json({ success: true, data: horario });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/horarios-mensuales?medicoId=&mes=&anio=
 * Consulta el horario mensual de un médico (RECEPCIONISTA + ADMINISTRADOR).
 */
export const obtenerHorarioMensual = async (req: AuthRequest, res: Response) => {
  try {
    const { medicoId, mes, anio } = req.query;
    if (!medicoId || !mes || !anio) {
      return res.status(400).json({ success: false, message: "medicoId, mes y anio son requeridos" });
    }

    const horario = await HorarioMensual.findOne({
      medicoId,
      mes: Number(mes),
      anio: Number(anio),
    }).populate("medicoId", "nombres apellidos");

    res.json({ success: true, data: horario || null });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
