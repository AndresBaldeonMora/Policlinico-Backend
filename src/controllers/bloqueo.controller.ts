import { Response } from "express";
import { BloqueoHorario } from "../models/BloqueoHorario";
import { Doctor } from "../models/Doctor";
import { AuditLog } from "../models/AuditLog";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { crearFechaUTC } from "../utils/fecha.utils";

export const crearBloqueo = async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId, fecha, motivo, descripcion, horaInicio, horaFin } = req.body;
    const esDiaCompleto = req.body.esDiaCompleto !== false; // por defecto: día completo

    if (!doctorId || !fecha || !motivo) {
      return res.status(400).json({ success: false, message: "doctorId, fecha y motivo son requeridos" });
    }

    // Si es una franja horaria, validar el rango.
    if (!esDiaCompleto) {
      if (!horaInicio || !horaFin) {
        return res.status(400).json({ success: false, message: "Para una franja horaria se requieren horaInicio y horaFin" });
      }
      if (horaInicio >= horaFin) {
        return res.status(400).json({ success: false, message: "La hora de inicio debe ser anterior a la hora de fin" });
      }
    }

    // IDOR fix: rol MEDICO sólo puede bloquear SU PROPIA agenda.
    const rol = String(req.user?.rol ?? "").toUpperCase();
    if (rol === "MEDICO") {
      const ownMedicoId = req.user?.medicoId;
      if (!ownMedicoId || String(ownMedicoId) !== String(doctorId)) {
        return res.status(403).json({
          success: false,
          message: "Sólo puedes crear bloqueos en tu propia agenda",
        });
      }
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    }

    const fechaUTC = crearFechaUTC(fecha);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Formato de fecha inválido" });
    }

    // Reglas de coexistencia de bloqueos en un mismo día:
    //  - un bloqueo de día completo no admite ningún otro bloqueo ese día;
    //  - una franja no se permite si el día ya está bloqueado por completo;
    //  - dos franjas no pueden solaparse.
    const existentes = await BloqueoHorario.find({ doctorId, fecha: fechaUTC, activo: true });
    const hayDiaCompleto = existentes.some((b) => b.esDiaCompleto !== false);

    if (esDiaCompleto) {
      if (existentes.length > 0) {
        return res.status(400).json({ success: false, message: "Ya existen bloqueos ese día. Elimínalos antes de bloquear el día completo." });
      }
    } else {
      if (hayDiaCompleto) {
        return res.status(400).json({ success: false, message: "El día ya está bloqueado por completo para este doctor" });
      }
      const seSolapa = existentes.some(
        (b) => b.esDiaCompleto === false && (b.horaInicio as string) < horaFin && horaInicio < (b.horaFin as string)
      );
      if (seSolapa) {
        return res.status(400).json({ success: false, message: "La franja se solapa con otro bloqueo existente ese día" });
      }
    }

    const bloqueo = await BloqueoHorario.create({
      doctorId,
      fecha: fechaUTC,
      esDiaCompleto,
      horaInicio: esDiaCompleto ? undefined : horaInicio,
      horaFin: esDiaCompleto ? undefined : horaFin,
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
        descripcion: `Bloqueo (${esDiaCompleto ? "día completo" : `${horaInicio}-${horaFin}`}) creado para Dr. ${doctor.nombres} ${doctor.apellidos} el ${fecha}. Motivo: ${motivo}`,
        detalles: { doctorId, fecha, esDiaCompleto, horaInicio, horaFin, motivo, descripcion },
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

    // IDOR fix: rol MEDICO sólo puede desactivar bloqueos de su propia agenda.
    const rol = String(req.user?.rol ?? "").toUpperCase();
    if (rol === "MEDICO") {
      const ownMedicoId = req.user?.medicoId;
      if (!ownMedicoId || String(ownMedicoId) !== String(bloqueo.doctorId)) {
        return res.status(403).json({
          success: false,
          message: "Sólo puedes desactivar bloqueos de tu propia agenda",
        });
      }
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
