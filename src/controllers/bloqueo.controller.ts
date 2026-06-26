import { Response } from "express";
import { BloqueoHorario } from "../models/BloqueoHorario";
import { Doctor } from "../models/Doctor";
import { Cita } from "../models/Cita";
import { Paciente } from "../models/Paciente";
import { Notificacion } from "../models/Notificacion";
import { AuditLog } from "../models/AuditLog";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { crearFechaUTC } from "../utils/fecha.utils";
import { enviarCorreoCitaAfectada } from "../config/mailer";

export const crearBloqueo = async (req: AuthRequest, res: Response) => {
  try {
    const { doctorId, fecha, motivo, descripcion, tipoDia, horaInicio, horaFin } = req.body;

    if (!doctorId || !fecha || !motivo) {
      return res.status(400).json({ success: false, message: "doctorId, fecha y motivo son requeridos" });
    }

    const tipo = tipoDia === "RANGO_HORAS" ? "RANGO_HORAS" : "DIA_COMPLETO";
    if (tipo === "RANGO_HORAS" && (!horaInicio || !horaFin)) {
      return res.status(400).json({ success: false, message: "horaInicio y horaFin son requeridos para bloqueo por rango" });
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

    // Para DIA_COMPLETO verificar que no exista ya uno ese día
    if (tipo === "DIA_COMPLETO") {
      const bloqueoExistente = await BloqueoHorario.findOne({ doctorId, fecha: fechaUTC, tipoDia: "DIA_COMPLETO", activo: true });
      if (bloqueoExistente) {
        return res.status(400).json({ success: false, message: "Ya existe un bloqueo de día completo activo para ese día" });
      }
    }

    const bloqueo = await BloqueoHorario.create({
      doctorId,
      fecha: fechaUTC,
      tipoDia: tipo,
      horaInicio: tipo === "RANGO_HORAS" ? horaInicio : undefined,
      horaFin:    tipo === "RANGO_HORAS" ? horaFin    : undefined,
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
        descripcion: `Bloqueó agenda del Dr. ${doctor.nombres} ${doctor.apellidos} — ${fecha}${tipo === "RANGO_HORAS" ? ` de ${horaInicio} a ${horaFin}` : " (día completo)"}. Motivo: ${motivo}${descripcion ? `. Nota: ${descripcion}` : ""}`,
        detalles: { doctorId, fecha, motivo, descripcion },
        ipAddress: req.ip,
      });
    } catch (err) {
      console.error("Error al registrar audit log:", err);
    }

    // ── Detectar y marcar citas afectadas ────────────────────────────────
    try {
      const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

      // Buscar citas activas del doctor en esa fecha
      const citasEnFecha = await Cita.find({
        doctorId,
        fecha: fechaUTC,
        estado: { $in: ["PENDIENTE", "ASISTIO"] },
        hora: { $ne: null },
      }).lean();

      // Filtrar las que caen dentro del rango bloqueado
      const citasAfectadas = citasEnFecha.filter((c) => {
        if (tipo === "DIA_COMPLETO") return true;
        if (!c.hora || !horaInicio || !horaFin) return false;
        const citaMin = toMin(c.hora);
        return citaMin >= toMin(horaInicio) && citaMin < toMin(horaFin);
      });

      if (citasAfectadas.length > 0) {
        const motivoAfectacion = `Bloqueo de agenda del Dr. ${doctor.nombres} ${doctor.apellidos} — ${fecha}${tipo === "RANGO_HORAS" ? ` de ${horaInicio} a ${horaFin}` : " (día completo)"}. Motivo: ${motivo}`;
        const fechaStr = new Date(fechaUTC).toLocaleDateString("es-PE", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" });

        for (const cita of citasAfectadas) {
          // Marcar cita como AFECTADA
          await Cita.findByIdAndUpdate(cita._id, {
            estado: "AFECTADA",
            motivoAfectacion,
          });

          // Obtener paciente con correo
          const paciente = await Paciente.findById(cita.pacienteId).select("nombres apellidos correo").lean();
          if (!paciente) continue;

          // Notificación in-app
          await Notificacion.crearNotificacion(
            cita.pacienteId,
            "⚠️ Tu cita fue afectada por un bloqueo",
            `Tu cita con el Dr. ${doctor.nombres} ${doctor.apellidos} del ${fechaStr}${cita.hora ? ` a las ${cita.hora}` : ""} requiere ser reprogramada. Motivo: ${motivo}`,
            "CITA"
          );

          // Correo (falla silencioso si no tiene correo)
          if ((paciente as any).correo) {
            enviarCorreoCitaAfectada({
              correo: (paciente as any).correo,
              paciente: { nombres: paciente.nombres, apellidos: paciente.apellidos },
              doctor: { nombres: doctor.nombres, apellidos: doctor.apellidos },
              fecha: fechaStr,
              hora: cita.hora ?? undefined,
              motivoBloqueo: motivo,
            }).catch((err) => console.error("Error enviando correo cita afectada:", err));
          }
        }
      }
    } catch (err) {
      console.error("Error procesando citas afectadas:", err);
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

    const doctorDesactivar = await Doctor.findById(bloqueo.doctorId).select("nombres apellidos").lean();
    const fechaStr = bloqueo.fecha.toISOString().split("T")[0];
    const rangoHoras = bloqueo.tipoDia === "RANGO_HORAS" && bloqueo.horaInicio && bloqueo.horaFin
      ? ` (${bloqueo.horaInicio}–${bloqueo.horaFin})`
      : " (día completo)";
    const descDesactivar = doctorDesactivar
      ? `Desactivó bloqueo del Dr. ${doctorDesactivar.nombres} ${doctorDesactivar.apellidos} — ${fechaStr}${rangoHoras}. Motivo original: ${bloqueo.motivo}`
      : `Desactivó bloqueo del ${fechaStr}${rangoHoras}`;

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
        descripcion: descDesactivar,
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
