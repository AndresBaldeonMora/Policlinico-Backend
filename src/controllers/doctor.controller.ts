import { Request, Response } from "express";
import { Doctor } from "../models/Doctor";
import { Cita, ESTADOS_OCUPAN_SLOT } from "../models/Cita";
import { Horario } from "../models/Horario";
import { Usuario } from "../models/Usuario";
import mongoose from "mongoose";
import { BloqueoHorario } from "../models/BloqueoHorario";
import { crearFechaUTC, ahoraPeru, hoyPeruUTC } from "../utils/fecha.utils";

// ─── Validaciones ─────────────────────────────────────────
const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/;
const soloNumeros9 = /^\d{9}$/;
const soloDigitos5 = /^\d{5}$/;
const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validarDoctor = (body: any, esActualizacion = false): string | null => {
  const { nombres, apellidos, correo, telefono, especialidadId, cmp } = body;

  if (!esActualizacion || nombres !== undefined) {
    if (!nombres?.trim()) return "El nombre es obligatorio";
    if (!soloLetras.test(nombres.trim())) return "El nombre solo puede contener letras";
  }
  if (!esActualizacion || apellidos !== undefined) {
    if (!apellidos?.trim()) return "Los apellidos son obligatorios";
    if (!soloLetras.test(apellidos.trim())) return "Los apellidos solo pueden contener letras";
  }
  if (!esActualizacion || correo !== undefined) {
    if (!correo?.trim()) return "El correo es obligatorio";
    if (!regexCorreo.test(correo.trim())) return "El correo no tiene un formato válido";
  }
  if (!esActualizacion || telefono !== undefined) {
    if (!telefono?.trim()) return "El teléfono es obligatorio";
    if (!soloNumeros9.test(telefono.trim())) return "El teléfono debe tener exactamente 9 dígitos numéricos";
  }
  if (!esActualizacion || especialidadId !== undefined) {
    if (!especialidadId) return "La especialidad es obligatoria";
  }
  if (cmp !== undefined && cmp !== "") {
    if (!soloDigitos5.test(cmp.trim())) return "El CMP debe tener exactamente 5 dígitos numéricos";
  }

  return null;
};

///CRUD////

// Listar todos los doctores
export const listarDoctores = async (_req: Request, res: Response) => {
  try {
    const doctores = await Doctor.find()
      .populate("especialidadId", "nombre")
      .sort({ apellidos: 1 });
    res.json({ success: true, data: doctores });
  } catch (error: any) {
    console.error("Error al listar doctores:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener doctor por ID
export const obtenerDoctor = async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("especialidadId", "nombre");
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    }
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear doctor
export const crearDoctor = async (req: Request, res: Response) => {
  try {
    const error = validarDoctor(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const { nombres, apellidos, correo, telefono, especialidadId, cmp } = req.body;

    // Verificar duplicados 
    const [correoExiste, telefonoExiste] = await Promise.all([
      Doctor.findOne({ correo: correo.trim().toLowerCase() }),
      Doctor.findOne({ telefono: telefono.trim() }),
    ]);
    if (correoExiste)   return res.status(400).json({ success: false, message: "Ya existe un doctor con ese correo" });
    if (telefonoExiste) return res.status(400).json({ success: false, message: "Ya existe un doctor con ese teléfono" });

    const doctor = await Doctor.create({ nombres, apellidos, correo, telefono, especialidadId, cmp });
    const populated = await doctor.populate("especialidadId", "nombre");
    res.status(201).json({ success: true, data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar doctor
export const actualizarDoctor = async (req: Request, res: Response) => {
  try {
    const error = validarDoctor(req.body, true);  // ← esActualizacion = true
    if (error) return res.status(400).json({ success: false, message: error });

    const { correo, telefono } = req.body;

    // Verificar duplicados excluyendo el doctor actual
    if (correo) {
      const existe = await Doctor.findOne({ correo: correo.trim().toLowerCase(), _id: { $ne: req.params.id } });
      if (existe) return res.status(400).json({ success: false, message: "Ya existe un doctor con ese correo" });
    }
    if (telefono) {
      const existe = await Doctor.findOne({ telefono: telefono.trim(), _id: { $ne: req.params.id } });
      if (existe) return res.status(400).json({ success: false, message: "Ya existe un doctor con ese teléfono" });
    }
    // Whitelist: solo se permiten estos campos para evitar mass-assignment.
    const { nombres, apellidos, especialidadId, cmp } = req.body;
    const cambios: Record<string, unknown> = {};
    if (nombres !== undefined) cambios.nombres = String(nombres).trim();
    if (apellidos !== undefined) cambios.apellidos = String(apellidos).trim();
    if (correo !== undefined) cambios.correo = String(correo).trim().toLowerCase();
    if (telefono !== undefined) cambios.telefono = String(telefono).trim();
    if (especialidadId !== undefined) cambios.especialidadId = especialidadId;
    if (cmp !== undefined) cambios.cmp = cmp;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      cambios,
      { new: true, runValidators: true }
    ).populate("especialidadId", "nombre");

    if (!doctor) return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

interface DependenciaDoctor {
  tipo: "CITAS_ACTIVAS" | "HORARIOS_RESERVADOS" | "USUARIO_VINCULADO";
  cantidad?: number;
  mensaje: string;
}

async function verificarDependenciasDoctor(doctorId: string): Promise<DependenciaDoctor[]> {
  const dependencias: DependenciaDoctor[] = [];
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0); // medianoche UTC de hoy

  // Ejecutar las tres validaciones en paralelo
  const [citasActivas, horariosReservados, usuarioVinculado] = await Promise.all([
    Cita.countDocuments({
      doctorId,
      estado: { $in: ["PENDIENTE", "ASISTIO"] }
    }),
    Horario.countDocuments({
      doctorId,
      reservado: true,
      fecha: { $gte: hoy }
    }),
    Usuario.findOne({ medicoId: doctorId }).select("nombres apellidos correo")
  ]);

  if (citasActivas > 0) {
    dependencias.push({
      tipo: "CITAS_ACTIVAS",
      cantidad: citasActivas,
      mensaje: `Tiene ${citasActivas} cita(s) en estado Pendiente o Asistió.`
    });
  }

  if (horariosReservados > 0) {
    dependencias.push({
      tipo: "HORARIOS_RESERVADOS",
      cantidad: horariosReservados,
      mensaje: `Tiene ${horariosReservados} horario(s) reservado(s) a futuro.`
    });
  }

  if (usuarioVinculado) {
    dependencias.push({
      tipo: "USUARIO_VINCULADO",
      mensaje: `Está vinculado a la cuenta de usuario ${usuarioVinculado.nombres} ${usuarioVinculado.apellidos} (${usuarioVinculado.correo}).`
    });
  }

  return dependencias;
}

export const eliminarDoctor = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;   // ✅ así se arregla

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    }

    const dependencias = await verificarDependenciasDoctor(id);
    if (dependencias.length > 0) {
      return res.status(409).json({
        success: false,
        message: "No se puede eliminar el doctor porque tiene dependencias activas.",
        dependencias,
      });
    }

    await Doctor.findByIdAndDelete(id);
    res.json({ success: true, message: "Doctor eliminado" });
  } catch (error: any) {
    console.error("Error en eliminarDoctor:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// export const eliminarDoctor = async (req: Request, res: Response) => {
//   try {
//     const doctor = await Doctor.findByIdAndDelete(req.params.id);
//     if (!doctor) {
//       return res.status(404).json({ success: false, message: "Doctor no encontrado" });
//     }
//     res.json({ success: true, message: "Doctor eliminado" });
//   } catch (error: any) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

///CRUD////

// Doctores por especialidad
export const obtenerDoctoresPorEspecialidad = async (req: Request, res: Response) => {
  try {
    const doctores = await Doctor.find({ especialidadId: req.params.especialidadId })
      .populate("especialidadId", "nombre");
    res.json({ success: true, data: doctores });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Horarios disponibles de un doctor para una fecha
export const obtenerHorariosDisponibles = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ success: false, message: "La fecha es requerida" });
    }

    const fechaUTC = crearFechaUTC(fecha as string);

    // Obtener los slots reales del doctor en la BD para esa fecha
    const horariosDB = await Horario.find({ doctorId: id, fecha: fechaUTC }).sort({ hora: 1 });

    // Si no hay horarios en BD para ese día, responder vacío
    if (horariosDB.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const horariosBase = horariosDB.map((h) => h.hora);

    // Obtener todos los bloqueos activos del día
    const bloqueosActivos = await BloqueoHorario.find({
      doctorId: id,
      fecha: fechaUTC,
      activo: true,
    });

    // Día completo → todos los slots bloqueados
    const bloqueoCompleto = bloqueosActivos.find(b => b.tipoDia === "DIA_COMPLETO");
    if (bloqueoCompleto) {
      return res.json({
        success: true,
        data: horariosBase.map((hora) => ({ hora, disponible: false, diaBloqueado: true })),
        diaBloqueado: true,
        motivoBloqueo: bloqueoCompleto.motivo,
      });
    }

    // Rango de horas → marcar solo los slots dentro del rango
    const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const horasBloqueadas = new Set<string>();
    for (const b of bloqueosActivos) {
      if (b.tipoDia === "RANGO_HORAS" && b.horaInicio && b.horaFin) {
        const ini = toMin(b.horaInicio);
        const fin = toMin(b.horaFin);
        for (const hora of horariosBase) {
          const s = toMin(hora);
          if (s >= ini && s < fin) horasBloqueadas.add(hora);
        }
      }
    }

    const citasAgendadas = await Cita.find({
      doctorId: id,
      fecha: fechaUTC,
      estado: { $nin: ["CANCELADA", "REPROGRAMADA"] },
    }).select("hora");

    const horasOcupadas = new Set(citasAgendadas.map((c) => c.hora));

    const peru = ahoraPeru();
    const esHoy = fechaUTC.getTime() === hoyPeruUTC().getTime();
    const minutosActuales = esHoy ? peru.getUTCHours() * 60 + peru.getUTCMinutes() : -1;

    const horariosDisponibles = horariosBase.map((hora) => {
      const [h, m] = hora.split(":").map(Number);
      const yaPaso = esHoy && h * 60 + m <= minutosActuales;
      return { hora, disponible: !horasOcupadas.has(hora) && !horasBloqueadas.has(hora) && !yaPaso };
    });

    res.json({ success: true, data: horariosDisponibles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Devuelve todos los horarios del doctor para una fecha (para bloqueo de agenda)
export const obtenerHorariosDia = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({ success: false, message: "La fecha es requerida" });
    }

    const fechaUTC = crearFechaUTC(fecha as string);
    if (isNaN(fechaUTC.getTime())) {
      return res.status(400).json({ success: false, message: "Formato de fecha inválido" });
    }

    // Todos los slots registrados para ese día (reservados o no)
    const slots = await Horario.find({ doctorId: id, fecha: fechaUTC }).sort({ hora: 1 });

    if (slots.length > 0) {
      return res.json({ success: true, data: slots.map(s => s.hora) });
    }

    // Si no hay registros para esa fecha, inferir horario del patrón del doctor
    const horasUnicas = await Horario.distinct("hora", { doctorId: id });
    horasUnicas.sort();
    res.json({ success: true, data: horasUnicas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};