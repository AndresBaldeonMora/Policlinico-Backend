import { Request, Response } from "express";
import mongoose from "mongoose";
import { Horario } from "../models/Horario";

// ── Slots del mes para un doctor (agrupados por día) ─────────────────────────
// GET /api/horarios/doctor/:doctorId?mes=6&anio=2026
export const obtenerSlotsPorMes = async (req: Request, res: Response) => {
  try {
    const doctorId = req.params.doctorId as string;
    const mes  = parseInt(req.query.mes  as string);
    const anio = parseInt(req.query.anio as string);
    if (!mes || !anio || mes < 1 || mes > 12) {
      return res.status(400).json({ success: false, message: "mes y anio son requeridos" });
    }

    const inicio = new Date(Date.UTC(anio, mes - 1, 1));
    const fin    = new Date(Date.UTC(anio, mes,     1));

    const slots = await Horario.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      fecha: { $gte: inicio, $lt: fin },
    }).lean();

    // Agrupar por fecha ISO "YYYY-MM-DD"
    const porDia: Record<string, { total: number; reservados: number; horas: string[] }> = {};
    for (const s of slots) {
      const key = s.fecha.toISOString().slice(0, 10);
      if (!porDia[key]) porDia[key] = { total: 0, reservados: 0, horas: [] };
      porDia[key].total++;
      if (s.reservado) porDia[key].reservados++;
      porDia[key].horas.push(s.hora);
    }

    return res.json({ success: true, data: porDia });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ── Crear múltiples slots de una vez ─────────────────────────────────────────
// POST /api/horarios/bulk  { doctorId, fecha, horas: ["08:00","08:30",...] }
export const crearSlotsBulk = async (req: Request, res: Response) => {
  try {
    const { doctorId, fecha, horas } = req.body;
    if (!doctorId || !fecha || !Array.isArray(horas) || horas.length === 0) {
      return res.status(400).json({ success: false, message: "doctorId, fecha y horas[] son requeridos" });
    }

    const fechaUTC = new Date(fecha); // espera "YYYY-MM-DDT00:00:00.000Z"

    // Obtener horas ya existentes para no duplicar
    const existentes = await Horario.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      fecha: fechaUTC,
    }).lean().then(r => new Set(r.map(h => h.hora)));

    const nuevos = horas
      .filter((h: string) => !existentes.has(h))
      .map((hora: string) => ({ doctorId, fecha: fechaUTC, hora, reservado: false }));

    if (nuevos.length > 0) await Horario.insertMany(nuevos);

    return res.status(201).json({
      success: true,
      message: `${nuevos.length} slot(s) creados`,
      data: { creados: nuevos.length, omitidos: horas.length - nuevos.length },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ── Eliminar slots de un día (solo los NO reservados) ────────────────────────
// DELETE /api/horarios/bulk  { doctorId, fecha, horas?: ["08:00",...] }
// Si no se envía horas[], elimina todos los slots libres del día
export const eliminarSlotsBulk = async (req: Request, res: Response) => {
  try {
    const { doctorId, fecha, horas } = req.body;
    if (!doctorId || !fecha) {
      return res.status(400).json({ success: false, message: "doctorId y fecha son requeridos" });
    }

    const fechaUTC = new Date(fecha);
    const filtro: any = {
      doctorId: new mongoose.Types.ObjectId(doctorId),
      fecha: fechaUTC,
      reservado: false, // nunca eliminar slots ya reservados
    };
    if (Array.isArray(horas) && horas.length > 0) filtro.hora = { $in: horas };

    const resultado = await Horario.deleteMany(filtro);

    return res.json({
      success: true,
      message: `${resultado.deletedCount} slot(s) eliminados`,
      data: { eliminados: resultado.deletedCount },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Crear horario
export const crearHorario = async (req: Request, res: Response) => {
  try {
    const { doctorId, fecha, hora } = req.body;

    if (!doctorId || !fecha || !hora) {
      return res.status(400).json({
        success: false,
        message: "Todos los campos son requeridos",
      });
    }

    const horarioExistente = await Horario.findOne({
      doctorId,
      fecha,
      hora,
    });

    if (horarioExistente) {
      return res.status(400).json({
        success: false,
        message: "Este horario ya está registrado",
      });
    }

    const nuevoHorario = new Horario({
      doctorId,
      fecha,
      hora,
      reservado: false, // Inicialmente no está reservado
    });

    await nuevoHorario.save();

    res.status(201).json({
      success: true,
      message: "Horario creado exitosamente",
      data: nuevoHorario,
    });
  } catch (error: unknown) {
    // Verificamos si el error es una instancia de Error y accedemos a su mensaje
    if (error instanceof Error) {
      console.error("❌ Error al crear horario:", error.message);
      res.status(500).json({
        success: false,
        message: "Error al crear el horario",
        error: error.message,
      });
    } else {
      console.error("❌ Error desconocido:", error);
      res.status(500).json({
        success: false,
        message: "Error al crear el horario",
        error: "Error desconocido",
      });
    }
  }
};

// Verificar disponibilidad
export const verificarDisponibilidad = async (req: Request, res: Response) => {
  try {
    const { doctorId, fecha, hora } = req.params;

    const horario = await Horario.findOne({
      doctorId,
      fecha,
      hora,
    });

    if (!horario) {
      return res.status(404).json({
        success: false,
        message: "Horario no encontrado",
      });
    }

    if (horario.reservado) {
      return res.status(400).json({
        success: false,
        message: "Este horario ya está reservado",
      });
    }

    res.status(200).json({
      success: true,
      message: "Horario disponible",
    });
  } catch (error: unknown) {
    // Verificamos si el error es una instancia de Error y accedemos a su mensaje
    if (error instanceof Error) {
      console.error("❌ Error al verificar disponibilidad:", error.message);
      res.status(500).json({
        success: false,
        message: "Error al verificar disponibilidad",
        error: error.message,
      });
    } else {
      console.error("❌ Error desconocido:", error);
      res.status(500).json({
        success: false,
        message: "Error al verificar disponibilidad",
        error: "Error desconocido",
      });
    }
  }
};

// Reservar horario — atómico (anti race condition) + ownership del paciente.
export const reservarHorario = async (req: any, res: Response) => {
  try {
    const { doctorId, fecha, hora } = req.body;

    // Si el rol es PACIENTE y se envió pacienteId en el body, forzar al del token.
    const rol = String(req.user?.rol ?? "").toUpperCase();
    if (rol === "PACIENTE" && req.body.pacienteId
        && String(req.body.pacienteId) !== String(req.user?.pacienteId)) {
      return res.status(403).json({
        success: false,
        message: "Sólo puedes reservar a tu propio nombre",
      });
    }

    // Atómico: actualiza sólo si el slot está libre.
    const horario = await Horario.findOneAndUpdate(
      { doctorId, fecha, hora, reservado: { $ne: true } },
      { $set: { reservado: true } },
      { new: true }
    );

    if (!horario) {
      // Distinguir 404 (slot inexistente) de 409 (ya reservado por carrera).
      const existe = await Horario.findOne({ doctorId, fecha, hora }).lean();
      if (!existe) {
        return res.status(404).json({ success: false, message: "Horario no encontrado" });
      }
      return res.status(409).json({ success: false, message: "Este horario ya está reservado" });
    }

    res.status(200).json({
      success: true,
      message: "Horario reservado con éxito",
      data: horario,
    });
  } catch (error: unknown) {
    // Verificamos si el error es una instancia de Error y accedemos a su mensaje
    if (error instanceof Error) {
      console.error("❌ Error al reservar horario:", error.message);
      res.status(500).json({
        success: false,
        message: "Error al reservar el horario",
        error: error.message,
      });
    } else {
      console.error("❌ Error desconocido:", error);
      res.status(500).json({
        success: false,
        message: "Error al reservar el horario",
        error: "Error desconocido",
      });
    }
  }
};
