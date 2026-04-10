import { Response } from "express";
import { BloqueoHorario } from "../models/BloqueoHorario";
import { Doctor } from "../models/Doctor";
import { AuditLog } from "../models/AuditLog";
import { AuthRequest } from "../middlewares/authMiddlewares";

const crearFechaUTC = (fechaString: string): Date => {
  const [year, month, day] = fechaString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const crearBloqueo = async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId, fecha, motivo, descripcion } = req.body;

    if (!doctorId || !fecha || !motivo) {
      return res.status(400).json({ success: false, message: "doctorId, fecha y motivo son requeridos" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    }

    const fechaUTC = crearFechaUTC(fecha);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Formato de fecha inválido" });
    }

    // Verificar si ya existe un bloqueo activo para ese doctor y fecha
    const bloqueoExistente = await BloqueoHorario.findOne({
      doctorId,
      fecha: fechaUTC,
      activo: true,
    });

    if (bloqueoExistente) {
      return res.status(400).json({ success: false, message: "Ya existe un bloqueo activo para este doctor en esa fecha" });
    }

    const bloqueo = await BloqueoHorario.create({
      doctorId,
      fecha: fechaUTC,
      motivo,
      descripcion: descripcion || undefined,
      creadoPor: req.user?.userId,
    });

    const bloqueoPoblado = await BloqueoHorario.findById(bloqueo._id)
      .populate("doctorId", "nombres apellidos")
      .populate("creadoPor", "nombres apellidos");

    // Registrar en AuditLog
    try {
      await AuditLog.create({
        usuarioId: req.user?.userId,
        usuarioNombre: req.user?.nombres ? `${req.user.nombres} ${req.user.apellidos || ""}`.trim() : undefined,
        accion: "crear_bloqueo",
        entidad: "BloqueoHorario",
        entidadId: bloqueo._id,
        estadoNuevo: "activo",
        descripcion: `Bloqueo creado para Dr. ${doctor.nombres} ${doctor.apellidos} el ${fecha}. Motivo: ${motivo}`,
        detalles: { doctorId, fecha, motivo, descripcion },
        ipAddress: req.ip,
      });
    } catch (err) {
      console.error("Error al registrar audit log:", err);
    }

    res.status(201).json({ success: true, data: bloqueoPoblado });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listarBloqueos = async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId, mes, anio } = req.query;
    const filtro: any = { activo: true };

    if (doctorId) filtro.doctorId = doctorId;

    if (mes && anio) {
      const mesNum = parseInt(mes as string, 10);
      const anioNum = parseInt(anio as string, 10);
      filtro.fecha = {
        $gte: new Date(Date.UTC(anioNum, mesNum - 1, 1)),
        $lte: new Date(Date.UTC(anioNum, mesNum, 0, 23, 59, 59, 999)),
      };
    }

    const bloqueos = await BloqueoHorario.find(filtro)
      .populate("doctorId", "nombres apellidos")
      .populate("creadoPor", "nombres apellidos")
      .sort({ fecha: 1 });

    res.json({ success: true, data: bloqueos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const desactivarBloqueo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const bloqueo = await BloqueoHorario.findById(id);
    if (!bloqueo) {
      return res.status(404).json({ success: false, message: "Bloqueo no encontrado" });
    }

    if (!bloqueo.activo) {
      return res.status(400).json({ success: false, message: "El bloqueo ya está desactivado" });
    }

    bloqueo.activo = false;
    await bloqueo.save();

    // Registrar en AuditLog
    try {
      await AuditLog.create({
        usuarioId: req.user?.userId,
        usuarioNombre: req.user?.nombres ? `${req.user.nombres} ${req.user.apellidos || ""}`.trim() : undefined,
        accion: "desactivar_bloqueo",
        entidad: "BloqueoHorario",
        entidadId: bloqueo._id,
        estadoAnterior: "activo",
        estadoNuevo: "inactivo",
        descripcion: `Bloqueo desactivado`,
        ipAddress: req.ip,
      });
    } catch (err) {
      console.error("Error al registrar audit log:", err);
    }

    res.json({ success: true, message: "Bloqueo desactivado correctamente" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verificarBloqueo = async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId, fecha } = req.params;

    const fechaUTC = crearFechaUTC(fecha as string);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Formato de fecha inválido" });
    }

    const bloqueo = await BloqueoHorario.findOne({
      doctorId,
      fecha: fechaUTC,
      activo: true,
    });

    res.json({ success: true, data: { bloqueado: !!bloqueo, bloqueo: bloqueo || null } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
