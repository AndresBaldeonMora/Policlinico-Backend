import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Paciente } from "../models/Paciente";
import { Cita } from "../models/Cita";
import { OrdenExamen } from "../models/OrdenExamen";
import { Usuario } from "../models/Usuario";
import { generarPasswordTemporal } from "../utils/generarPasswordTemporal";

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

// Crear paciente — opcionalmente crea también cuenta de portal
// Body extra: { crearCuentaPortal?: boolean, passwordPortal?: string }
export const crearPaciente = async (req: Request, res: Response) => {
  try {
    const error = validarPaciente(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const { telefono, correo, crearCuentaPortal, passwordPortal } = req.body;

    // Validaciones específicas si se va a crear cuenta de portal
    if (crearCuentaPortal) {
      if (!correo?.trim()) {
        return res.status(400).json({
          success: false,
          message: "El correo es obligatorio para crear cuenta de portal",
        });
      }
      const existeUsuario = await Usuario.findOne({ correo: correo.trim().toLowerCase() });
      if (existeUsuario) {
        return res.status(400).json({
          success: false,
          message: "Ya existe una cuenta de usuario con ese correo",
        });
      }
    }

    // Verificar duplicados de teléfono y correo
    if (telefono?.trim()) {
      const existe = await Paciente.findOne({ telefono: telefono.trim() });
      if (existe) return res.status(400).json({ success: false, message: "Ya existe un paciente con ese teléfono" });
    }
    if (correo?.trim()) {
      const existe = await Paciente.findOne({ correo: correo.trim().toLowerCase() });
      if (existe) return res.status(400).json({ success: false, message: "Ya existe un paciente con ese correo" });
    }

    const paciente = await Paciente.create(req.body);

    // Crear cuenta de portal si fue solicitada
    let credenciales: { correo: string; passwordTemporal: string } | undefined;
    if (crearCuentaPortal) {
      const passwordPlano = passwordPortal?.trim() || generarPasswordTemporal();
      const passwordHash  = await bcrypt.hash(passwordPlano, 10);
      await Usuario.create({
        nombres:    paciente.nombres,
        apellidos:  paciente.apellidos,
        correo:     paciente.correo!.toLowerCase(),
        passwordHash,
        rol:        "PACIENTE",
        pacienteId: paciente._id,
      });
      credenciales = {
        correo:           paciente.correo!.toLowerCase(),
        passwordTemporal: passwordPlano,
      };
    }

    res.status(201).json({
      success: true,
      message: "Paciente creado correctamente",
      data: paciente,
      credenciales, // solo presente si se creó cuenta
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear cuenta de portal para un paciente existente.
// Útil para los pacientes ya registrados que aún no tienen cuenta.
export const crearCuentaPaciente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { passwordPortal } = req.body;

    const paciente = await Paciente.findById(id);
    if (!paciente) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }
    if (!paciente.correo?.trim()) {
      return res.status(400).json({
        success: false,
        message: "El paciente no tiene correo registrado. Actualízalo antes de crear cuenta.",
      });
    }

    const yaTieneCuenta = await Usuario.findOne({
      $or: [
        { pacienteId: paciente._id },
        { correo: paciente.correo.toLowerCase() },
      ],
    });
    if (yaTieneCuenta) {
      return res.status(400).json({
        success: false,
        message: "Este paciente ya tiene cuenta registrada",
      });
    }

    const passwordPlano = passwordPortal?.trim() || generarPasswordTemporal();
    const passwordHash  = await bcrypt.hash(passwordPlano, 10);

    await Usuario.create({
      nombres:    paciente.nombres,
      apellidos:  paciente.apellidos,
      correo:     paciente.correo.toLowerCase(),
      passwordHash,
      rol:        "PACIENTE",
      pacienteId: paciente._id,
    });

    res.status(201).json({
      success: true,
      message: "Cuenta de portal creada correctamente",
      credenciales: {
        correo:           paciente.correo.toLowerCase(),
        passwordTemporal: passwordPlano,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Listar todos los pacientes — incluye flag `tieneCuentaPortal` por paciente
export const listarPacientes = async (_req: Request, res: Response) => {
  try {
    const pacientes = await Paciente.find().lean({ virtuals: true });

    // Buscar todos los Usuario PACIENTE en una sola query y armar set de IDs
    const cuentas = await Usuario.find({ rol: "PACIENTE" }).select("pacienteId").lean();
    const idsConCuenta = new Set(
      cuentas.map((u) => u.pacienteId?.toString()).filter(Boolean)
    );

    const data = pacientes.map((p: any) => ({
      ...p,
      tieneCuentaPortal: idsConCuenta.has(String(p._id)),
    }));

    res.json({ success: true, data });
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

// Actualizar historial clínico
export const actualizarHistorialClinico = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { alergias, medicamentosHabituales, problemasMedicos, cirugiasPrevias, antecedentesFamiliares } = req.body;

    const update: Record<string, any> = {};
    if (alergias !== undefined) update.alergias = alergias;
    if (medicamentosHabituales !== undefined) update.medicamentosHabituales = medicamentosHabituales;
    if (problemasMedicos !== undefined) update.problemasMedicos = problemasMedicos;
    if (cirugiasPrevias !== undefined) update.cirugiasPrevias = cirugiasPrevias;
    if (antecedentesFamiliares !== undefined) update.antecedentesFamiliares = antecedentesFamiliares;

    const paciente = await Paciente.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!paciente) return res.status(404).json({ success: false, message: "Paciente no encontrado" });

    res.json({ success: true, message: "Historial clínico actualizado", data: paciente });
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
