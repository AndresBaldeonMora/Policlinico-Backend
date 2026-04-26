import { Request, Response } from "express";
import { Paciente } from "../models/Paciente";
import { Cita } from "../models/Cita";
import { OrdenExamen } from "../models/OrdenExamen";

// ─── Validaciones ─────────────────────────────────────────
const soloLetras    = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/;
const regexCorreo   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validarPaciente = (body: any, esActualizacion = false): string | null => {
  const { nombres, apellidos, correo } = body;

  if (!esActualizacion || nombres !== undefined) {
    if (!nombres?.trim()) return "Los nombres son obligatorios";
    if (!soloLetras.test(nombres.trim())) return "Los nombres solo pueden contener letras";
  }
  if (!esActualizacion || apellidos !== undefined) {
    if (!apellidos?.trim()) return "Los apellidos son obligatorios";
    if (!soloLetras.test(apellidos.trim())) return "Los apellidos solo pueden contener letras";
  }
  if (correo !== undefined && correo.trim() && !regexCorreo.test(correo.trim()))
    return "El correo no tiene un formato válido";

  return null;
};

// Crear paciente
export const crearPaciente = async (req: Request, res: Response) => {
  try {
    const error = validarPaciente(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    // Verificar duplicados de teléfono y correo
    const { telefono, correo } = req.body;
    if (telefono?.trim()) {
      const existe = await Paciente.findOne({ telefono: telefono.trim() });
      if (existe) return res.status(400).json({ success: false, message: "Ya existe un paciente con ese teléfono" });
    }
    if (correo?.trim()) {
      const existe = await Paciente.findOne({ correo: correo.trim().toLowerCase() });
      if (existe) return res.status(400).json({ success: false, message: "Ya existe un paciente con ese correo" });
    }

    const paciente = await Paciente.create(req.body);
    res.status(201).json({ success: true, message: "Paciente creado correctamente", data: paciente });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Listar todos los pacientes
export const listarPacientes = async (_req: Request, res: Response) => {
  try {
    const pacientes = await Paciente.find();
    res.json({ success: true, data: pacientes });
  } catch (error: any) {
    console.error("Error al listar pacientes:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener paciente por ID
export const obtenerPaciente = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findById(req.params.id);
    if (!paciente) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }
    res.json({ success: true, data: paciente });
  } catch (error: any) {
    console.error("Error al obtener paciente:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Buscar paciente por DNI
export const buscarPacientePorDni = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findOne({ dni: req.params.dni });
    if (!paciente) {
      return res.status(404).json({ success: false, message: "No se encontró ningún paciente con ese DNI" });
    }
    res.json({ success: true, data: paciente });
  } catch (error: any) {
    console.error("Error al buscar paciente por DNI:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar paciente por ID
export const actualizarPaciente = async (req: Request, res: Response) => {
  try {
    const error = validarPaciente(req.body, true);
    if (error) return res.status(400).json({ success: false, message: error });

    const { telefono, correo } = req.body;
    if (telefono?.trim()) {
      const existe = await Paciente.findOne({ telefono: telefono.trim(), _id: { $ne: req.params.id } });
      if (existe) return res.status(400).json({ success: false, message: "Ya existe un paciente con ese teléfono" });
    }
    if (correo?.trim()) {
      const existe = await Paciente.findOne({ correo: correo.trim().toLowerCase(), _id: { $ne: req.params.id } });
      if (existe) return res.status(400).json({ success: false, message: "Ya existe un paciente con ese correo" });
    }

    const paciente = await Paciente.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!paciente) return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    res.json({ success: true, message: "Paciente actualizado correctamente", data: paciente });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Historial completo del paciente
export const obtenerHistorial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const citasPagina = parseInt(req.query.citasPagina as string) || 1;
    const ordenesPagina = parseInt(req.query.ordenesPagina as string) || 1;
    const porPagina = 20;

    const paciente = await Paciente.findById(id);
    if (!paciente) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }

    const [citas, totalCitas, ordenes, totalOrdenes] = await Promise.all([
      Cita.find({ pacienteId: id })
        .populate({
          path: "doctorId",
          select: "nombres apellidos especialidadId",
          populate: { path: "especialidadId", select: "nombre" },
        })
        .sort({ fecha: -1, hora: -1 })
        .skip((citasPagina - 1) * porPagina)
        .limit(porPagina),
      Cita.countDocuments({ pacienteId: id }),
      OrdenExamen.find({ pacienteId: id })
        .populate("doctorId", "nombres apellidos")
        .populate("especialidadId", "nombre")
        .populate("items.examenId", "nombre tipo unidad referenciaMin referenciaMax referenciaTexto")
        .sort({ fecha: -1 })
        .skip((ordenesPagina - 1) * porPagina)
        .limit(porPagina),
      OrdenExamen.countDocuments({ pacienteId: id }),
    ]);

    res.json({
      success: true,
      data: {
        paciente,
        citas: {
          data: citas,
          total: totalCitas,
          pagina: citasPagina,
          totalPaginas: Math.ceil(totalCitas / porPagina),
        },
        ordenes: {
          data: ordenes,
          total: totalOrdenes,
          pagina: ordenesPagina,
          totalPaginas: Math.ceil(totalOrdenes / porPagina),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const eliminarPaciente = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findByIdAndDelete(req.params.id);
    if (!paciente) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }
    res.json({ success: true, message: "Paciente eliminado correctamente" });
  } catch (error: any) {
    console.error("Error al eliminar paciente:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
