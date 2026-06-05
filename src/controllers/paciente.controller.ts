import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import axios from "axios";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { Paciente } from "../models/Paciente";
import { Cita } from "../models/Cita";
import { OrdenExamen } from "../models/OrdenExamen";
import { Usuario } from "../models/Usuario";
import { generarPasswordTemporal } from "../utils/generarPasswordTemporal";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { enviarCorreoRecordatorio } from "../config/mailer";

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

// Whitelist de campos editables en crear/actualizar paciente.
// Bloquea mass assignment de campos sensibles (historiaClinica, rol, etc.).
const CAMPOS_PACIENTE_PERMITIDOS = [
  "nombres", "apellidos", "dni", "fechaNacimiento", "sexo",
  "telefono", "correo", "direccion",
  "alergias", "medicamentosHabituales", "problemasMedicos",
  "cirugiasPrevias", "antecedentesFamiliares",
] as const;

function whitelistPaciente(body: any): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of CAMPOS_PACIENTE_PERMITIDOS) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

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

    // Whitelist defensiva — NUNCA pasar req.body crudo.
    const paciente = await Paciente.create(whitelistPaciente(req.body));

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

// Actualizar paciente por ID — usa whitelist defensiva.
export const actualizarPaciente = async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }
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

    // Whitelist defensiva — bloquea mass assignment (rol, _id, historiaClinica, etc.).
    const paciente = await Paciente.findByIdAndUpdate(
      req.params.id, whitelistPaciente(req.body), { new: true, runValidators: true }
    );
    if (!paciente) return res.status(404).json({ success: false, message: "Paciente no encontrado" });

    // Sincronizar correo en Usuario vinculado para que el login siga funcionando
    if (correo?.trim()) {
      await Usuario.findOneAndUpdate(
        { pacienteId: req.params.id },
        { correo: correo.trim().toLowerCase() }
      );
    }

    res.json({ success: true, message: "Paciente actualizado correctamente", data: paciente });
  } catch (error: any) {
    console.error("actualizarPaciente:", error);
    res.status(500).json({ success: false, message: "Error al actualizar paciente" });
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

// Actualizar historial clínico — sólo admin o un médico que haya
// atendido (o tenga programado atender) al paciente.
export const actualizarHistorialClinico = async (req: AuthRequest, res: Response) => {
  try {
    const idRaw = req.params.id;
    const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const rol = String(req.user?.rol ?? "").toUpperCase();
    const medicoId = req.user?.medicoId;

    // Si es MEDICO, debe haber al menos una cita con ese paciente.
    if (rol === "MEDICO") {
      if (!medicoId) {
        return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
      }
      const tieneRelacion = await Cita.exists({
        pacienteId: new mongoose.Types.ObjectId(id),
        doctorId: new mongoose.Types.ObjectId(String(medicoId)),
      });
      if (!tieneRelacion) {
        return res.status(403).json({
          success: false,
          message: "Sólo puedes editar el historial de pacientes que has atendido",
        });
      }
    }
    // ADMINISTRADOR pasa sin verificación adicional (cubierto por requireRole en la route).

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
    console.error("actualizarHistorialClinico:", error);
    res.status(500).json({ success: false, message: "Error al actualizar historial" });
  }
};

// Actualizar historia clínica por especialidad — merge campos específicos
export const actualizarHistoriaClinicaEspecialidad = async (req: AuthRequest, res: Response) => {
  try {
    const idRaw = req.params.id;
    const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const rol = String(req.user?.rol ?? "").toUpperCase();
    const medicoId = req.user?.medicoId;

    // Si es MEDICO, debe haber al menos una cita con ese paciente.
    if (rol === "MEDICO") {
      if (!medicoId) {
        return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
      }
      const tieneRelacion = await Cita.exists({
        pacienteId: new mongoose.Types.ObjectId(id),
        doctorId: new mongoose.Types.ObjectId(String(medicoId)),
      });
      if (!tieneRelacion) {
        return res.status(403).json({
          success: false,
          message: "Sólo puedes editar el historial de pacientes que has atendido",
        });
      }
    }

    const { especialidad, campos } = req.body;
    if (!especialidad || typeof especialidad !== "string") {
      return res.status(400).json({ success: false, message: "Campo 'especialidad' requerido" });
    }
    if (!campos || typeof campos !== "object") {
      return res.status(400).json({ success: false, message: "Campo 'campos' requerido" });
    }

    const paciente = await Paciente.findById(id);
    if (!paciente) return res.status(404).json({ success: false, message: "Paciente no encontrado" });

    const historialActual = paciente.historiaClinicaEspecialidad ?? {};
    historialActual[especialidad] = { ...historialActual[especialidad], ...campos };
    paciente.historiaClinicaEspecialidad = historialActual;
    paciente.markModified("historiaClinicaEspecialidad");
    await paciente.save();

    res.json({ success: true, message: "Historia clínica actualizada", data: paciente.historiaClinicaEspecialidad });
  } catch (error: any) {
    console.error("actualizarHistoriaClinicaEspecialidad:", error);
    res.status(500).json({ success: false, message: "Error al actualizar historia clínica" });
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

// ── Desactivar paciente (soft-delete) ──────────────────────────
export const desactivarPaciente = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    if (!paciente)
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    res.json({ success: true, message: "Paciente desactivado correctamente" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Subir/actualizar avatar del paciente (staff) ───────────────
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_DIR_STAFF = path.resolve(process.cwd(), "uploads", "avatares");

export const uploadAvatarPaciente = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES },
}).single("avatar");

const detectImageExt = (buf: Buffer): "jpg" | "png" | "webp" | null => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
};

export const subirAvatarPaciente = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file)
      return res.status(400).json({ success: false, message: "No se recibió ningún archivo en el campo 'avatar'" });
    if (file.size > AVATAR_MAX_BYTES)
      return res.status(400).json({ success: false, message: "El avatar excede el tamaño máximo de 2MB" });

    const ext = detectImageExt(file.buffer);
    if (!ext)
      return res.status(400).json({ success: false, message: "Tipo de archivo no permitido. Solo JPG, PNG o WebP" });

    await fs.mkdir(AVATAR_DIR_STAFF, { recursive: true });

    const baseName = String(req.params.id);
    for (const otraExt of ["jpg", "jpeg", "png", "webp"]) {
      if (otraExt === ext) continue;
      await fs.rm(path.join(AVATAR_DIR_STAFF, `${baseName}.${otraExt}`), { force: true });
    }

    const fileName = `${baseName}.${ext}`;
    await fs.writeFile(path.join(AVATAR_DIR_STAFF, fileName), file.buffer);

    const avatarUrl = `/uploads/avatares/${fileName}`;
    await Paciente.findByIdAndUpdate(req.params.id, { avatar: avatarUrl });

    res.json({ success: true, message: "Avatar actualizado", data: { avatarUrl } });
  } catch (error: any) {
    if (error?.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ success: false, message: "El avatar excede el tamaño máximo de 2MB" });
    res.status(500).json({ success: false, message: error.message });
  }
};

export const enviarRecordatorioEmail = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findById(req.params.id).lean();
    if (!paciente) return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    if (!paciente.correo) return res.status(400).json({ success: false, message: "El paciente no tiene correo registrado" });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const citasDocs = await Cita.find({
      pacienteId: paciente._id,
      estado: { $in: ["PENDIENTE", "CONFIRMADA"] },
      fecha: { $gte: hoy },
    })
      .sort({ fecha: 1 })
      .populate<{ doctorId: { nombres: string; apellidos: string } | null }>(
        "doctorId", "nombres apellidos"
      )
      .lean();

    const citas = citasDocs.map((c) => ({
      fecha:  c.fecha.toISOString(),
      hora:   c.hora ?? undefined,
      tipo:   c.tipo,
      estado: c.estado,
      doctor: c.doctorId ? `${c.doctorId.nombres} ${c.doctorId.apellidos}` : undefined,
    }));

    await enviarCorreoRecordatorio(
      paciente.correo,
      { nombres: paciente.nombres, apellidos: paciente.apellidos, dni: paciente.dni },
      citas,
    );
    res.json({ success: true, message: "Recordatorio enviado por correo" });
  } catch (error: any) {
    console.error("enviarRecordatorioEmail:", error);
    res.status(500).json({ success: false, message: "Error al enviar el correo" });
  }
};

export const enviarRecordatorioWsp = async (req: Request, res: Response) => {
  try {
    const paciente = await Paciente.findById(req.params.id).lean();
    if (!paciente) return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    if (!paciente.telefono) return res.status(400).json({ success: false, message: "El paciente no tiene teléfono registrado" });

    const token   = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) {
      return res.status(503).json({ success: false, message: "WhatsApp no configurado en el servidor" });
    }

    const numero = `51${paciente.telefono.replace(/\D/g, "")}`;
    const mensaje = `Hola ${paciente.nombres}, le recordamos que tiene una cita pendiente en el Policlínico Parroquial San José. Por favor confirme su asistencia o comuníquese con nosotros si necesita reprogramar.`;

    await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        to: numero,
        type: "text",
        text: { body: mensaje },
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );

    res.json({ success: true, message: "Recordatorio enviado por WhatsApp" });
  } catch (error: any) {
    console.error("enviarRecordatorioWsp:", error?.response?.data ?? error.message);
    res.status(500).json({ success: false, message: "Error al enviar el mensaje de WhatsApp" });
  }
};
