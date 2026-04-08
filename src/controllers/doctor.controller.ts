import { Request, Response } from "express";
import { Doctor } from "../models/Doctor";
import { Cita } from "../models/Cita";
import { BloqueoHorario } from "../models/BloqueoHorario";

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
    const { nombres, apellidos, correo, telefono, especialidadId, cmp, supabaseId } = req.body;

    // Verificar duplicados 
    const [correoExiste, telefonoExiste] = await Promise.all([
      Doctor.findOne({ correo: correo.trim().toLowerCase() }),
      Doctor.findOne({ telefono: telefono.trim() }),
    ]);
    if (correoExiste)   return res.status(400).json({ success: false, message: "Ya existe un doctor con ese correo" });
    if (telefonoExiste) return res.status(400).json({ success: false, message: "Ya existe un doctor con ese teléfono" });

    const doctor = await Doctor.create({ nombres, apellidos, correo, telefono, especialidadId, cmp, supabaseId });
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
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("especialidadId", "nombre");

    if (!doctor) return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    res.json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const eliminarDoctor = async (req: Request, res: Response) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor no encontrado" });
    }
    res.json({ success: true, message: "Doctor eliminado" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

    const horariosBase = [
      "08:00", "08:30", "09:00", "09:30",
      "10:00", "10:30", "11:00", "11:30", "12:00",
    ];

    const fechaInicio = new Date(fecha as string);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha as string);
    fechaFin.setHours(23, 59, 59, 999);

    // Verificar si el día está bloqueado
    const bloqueoActivo = await BloqueoHorario.findOne({
      doctorId: id,
      fecha: { $gte: fechaInicio, $lte: fechaFin },
      activo: true,
    });

    if (bloqueoActivo) {
      const horariosDisponibles = horariosBase.map((hora) => ({
        hora,
        disponible: false,
        diaBloqueado: true,
      }));
      return res.json({ success: true, data: horariosDisponibles, diaBloqueado: true, motivoBloqueo: bloqueoActivo.motivo });
    }

    const citasAgendadas = await Cita.find({
      doctorId: id,
      fecha: { $gte: fechaInicio, $lte: fechaFin },
    }).select("hora");

    const horasOcupadas = new Set(citasAgendadas.map((c) => c.hora));

    const horariosDisponibles = horariosBase.map((hora) => ({
      hora,
      disponible: !horasOcupadas.has(hora),
    }));

    res.json({ success: true, data: horariosDisponibles });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};