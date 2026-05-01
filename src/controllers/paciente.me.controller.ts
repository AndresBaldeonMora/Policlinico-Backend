import { Response } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { Paciente } from "../models/Paciente";
import { Cita } from "../models/Cita";
import { OrdenExamen } from "../models/OrdenExamen";
import { Usuario } from "../models/Usuario";
import { AuthRequest } from "../middlewares/authMiddlewares";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_REGEX = /^(?:\+51\d{9}|9\d{8})$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

// Términos y condiciones del portal del paciente. Se versionan manualmente:
// si cambia el contenido, sube TERMINOS_VERSION y TERMINOS_FECHA_ACTUALIZACION.
const TERMINOS_VERSION = "1.0";
const TERMINOS_FECHA_ACTUALIZACION = "2026-04-30";
const TERMINOS_CONTENIDO = `TÉRMINOS Y CONDICIONES DEL PORTAL DEL PACIENTE
Policlínico Parroquial San José

1. ACEPTACIÓN
Al usar el portal del paciente, usted acepta estos términos y la política
de tratamiento de datos personales del Policlínico Parroquial San José.

2. USO DE LA CUENTA
La cuenta es personal e intransferible. El paciente es responsable de
mantener segura su contraseña y de toda actividad realizada con sus
credenciales.

3. CONFIDENCIALIDAD DE DATOS DE SALUD
Los datos clínicos, citas, órdenes de examen y resultados visibles en el
portal son información sensible. El Policlínico aplica controles para
protegerla y solo personal autorizado puede acceder a ella.

4. INFORMACIÓN DEL PERFIL
El paciente debe mantener actualizados sus datos de contacto (correo,
teléfono, dirección). El DNI no es modificable desde el portal.

5. CITAS Y ÓRDENES
La información mostrada en el portal es referencial. Cualquier consulta
clínica debe canalizarse con el médico tratante. La cancelación o
reprogramación de citas se rige por las políticas del policlínico.

6. LIMITACIÓN DE RESPONSABILIDAD
El portal es una herramienta de apoyo y no reemplaza la atención médica
presencial ni constituye diagnóstico.

7. CAMBIOS A LOS TÉRMINOS
El Policlínico podrá actualizar estos términos. La versión vigente se
indica al inicio de este documento.

Versión ${TERMINOS_VERSION} — ${TERMINOS_FECHA_ACTUALIZACION}`;

// ──────────────────────────────────────────────────────────────────────────
// AVATAR
// ──────────────────────────────────────────────────────────────────────────
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const AVATAR_DIR = path.resolve(process.cwd(), "uploads", "avatares");

// Middleware multer en memoria. La validación real (magic bytes, extensión)
// se hace dentro del handler para poder devolver respuestas JSON consistentes.
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES },
}).single("avatar");

// Detecta el tipo real de imagen mirando los primeros bytes (magic bytes).
// Devuelve la extensión correcta o null si no es una imagen permitida.
const detectImageExt = (buf: Buffer): "jpg" | "png" | "webp" | null => {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";
  // WebP: "RIFF" .... "WEBP"
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) return "webp";
  return null;
};

// POST /api/paciente/me/avatar — sube/actualiza la foto de perfil del paciente.
// Espera multipart/form-data con un único archivo en el campo "avatar".
export const updateMyAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No se recibió ningún archivo en el campo 'avatar'",
      });
    }
    if (file.size > AVATAR_MAX_BYTES) {
      return res.status(400).json({
        success: false,
        message: "El avatar excede el tamaño máximo de 2MB",
      });
    }

    const ext = detectImageExt(file.buffer);
    if (!ext) {
      return res.status(400).json({
        success: false,
        message: "Tipo de archivo no permitido. Solo se aceptan JPG, PNG o WebP",
      });
    }

    await fs.mkdir(AVATAR_DIR, { recursive: true });

    // Borra cualquier avatar previo del mismo paciente con otra extensión
    const baseName = String(req.pacienteId);
    for (const otraExt of ["jpg", "jpeg", "png", "webp"]) {
      if (otraExt === ext) continue;
      const previo = path.join(AVATAR_DIR, `${baseName}.${otraExt}`);
      await fs.rm(previo, { force: true });
    }

    const fileName = `${baseName}.${ext}`;
    await fs.writeFile(path.join(AVATAR_DIR, fileName), file.buffer);

    const avatarUrl = `/uploads/avatares/${fileName}`;
    await Paciente.findByIdAndUpdate(req.pacienteId, { avatar: avatarUrl });

    res.json({
      success: true,
      message: "Avatar actualizado correctamente",
      data: { avatarUrl },
    });
  } catch (error: any) {
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "El avatar excede el tamaño máximo de 2MB",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/paciente/terminos — términos y condiciones vigentes del portal.
export const getTerminos = async (_req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        contenido: TERMINOS_CONTENIDO,
        version: TERMINOS_VERSION,
        fechaActualizacion: TERMINOS_FECHA_ACTUALIZACION,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/paciente/me — actualiza datos personales del paciente autenticado.
// El DNI es inmutable. Si se cambia el correo, también se sincroniza en Usuario
// para que el paciente pueda seguir entrando al portal con el correo nuevo.
export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const {
      nombres,
      apellidos,
      telefono,
      correo,
      fechaNacimiento,
      sexo,
      direccion,
      distrito,
      apoderadoNombre,
      apoderadoParentesco,
      apoderadoTelefono,
    } = req.body ?? {};

    const nombresT   = String(nombres   ?? "").trim();
    const apellidosT = String(apellidos ?? "").trim();
    const telefonoT  = String(telefono  ?? "").trim();
    const correoT    = String(correo    ?? "").trim().toLowerCase();
    const sexoT      = String(sexo      ?? "").trim().toUpperCase();

    if (!nombresT || nombresT.length > 100) {
      return res.status(400).json({ success: false, message: "Nombres es obligatorio (máx 100 caracteres)" });
    }
    if (!apellidosT || apellidosT.length > 100) {
      return res.status(400).json({ success: false, message: "Apellidos es obligatorio (máx 100 caracteres)" });
    }
    if (!TELEFONO_REGEX.test(telefonoT)) {
      return res.status(400).json({ success: false, message: "Teléfono inválido. Formato esperado: +51XXXXXXXXX o 9XXXXXXXX" });
    }
    if (!EMAIL_REGEX.test(correoT)) {
      return res.status(400).json({ success: false, message: "Correo inválido" });
    }
    if (!fechaNacimiento) {
      return res.status(400).json({ success: false, message: "Fecha de nacimiento es obligatoria" });
    }
    const fechaNac = new Date(fechaNacimiento);
    if (isNaN(fechaNac.getTime())) {
      return res.status(400).json({ success: false, message: "Fecha de nacimiento inválida" });
    }
    if (sexoT !== "M" && sexoT !== "F") {
      return res.status(400).json({ success: false, message: "Sexo debe ser 'M' o 'F'" });
    }
    const direccionT = String(direccion ?? "").trim();
    const distritoT  = String(distrito  ?? "").trim();
    if (direccionT.length > 200) {
      return res.status(400).json({ success: false, message: "Dirección excede 200 caracteres" });
    }
    if (distritoT.length > 100) {
      return res.status(400).json({ success: false, message: "Distrito excede 100 caracteres" });
    }

    // Email único: que no exista en otro Paciente ni en otro Usuario
    const otroPaciente = await Paciente.findOne({
      correo: correoT,
      _id: { $ne: req.pacienteId },
    }).select("_id");
    if (otroPaciente) {
      return res.status(409).json({ success: false, message: "Ese correo ya está en uso por otro paciente" });
    }

    const userId = req.user?.userId;
    const otroUsuario = await Usuario.findOne({
      correo: correoT,
      _id: { $ne: userId },
    }).select("_id");
    if (otroUsuario) {
      return res.status(409).json({ success: false, message: "Ese correo ya está en uso" });
    }

    const actualizado = await Paciente.findByIdAndUpdate(
      req.pacienteId,
      {
        nombres:   nombresT,
        apellidos: apellidosT,
        telefono:  telefonoT,
        correo:    correoT,
        fechaNacimiento: fechaNac,
        sexo:      sexoT,
        direccion: direccionT,
        distrito:  distritoT,
        apoderadoNombre:     String(apoderadoNombre     ?? "").trim(),
        apoderadoParentesco: String(apoderadoParentesco ?? "").trim(),
        apoderadoTelefono:   String(apoderadoTelefono   ?? "").trim(),
      },
      { new: true, runValidators: true }
    ).select("nombres apellidos dni telefono correo fechaNacimiento sexo direccion distrito apoderadoNombre apoderadoParentesco apoderadoTelefono avatar");

    if (!actualizado) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }

    // Mantener sincronizada la cuenta de portal (Usuario) con los datos del paciente
    if (userId) {
      await Usuario.findByIdAndUpdate(userId, {
        nombres:   nombresT,
        apellidos: apellidosT,
        correo:    correoT,
      });
    }

    res.json({
      success: true,
      message: "Perfil actualizado correctamente",
      data: actualizado,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "Correo o teléfono duplicado" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/paciente/me/password — cambio de contraseña del paciente autenticado.
export const changeMyPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { passwordActual, passwordNueva, passwordConfirm } = req.body ?? {};

    if (!passwordActual || !passwordNueva || !passwordConfirm) {
      return res.status(400).json({
        success: false,
        message: "passwordActual, passwordNueva y passwordConfirm son obligatorios",
      });
    }
    if (passwordNueva !== passwordConfirm) {
      return res.status(400).json({
        success: false,
        message: "La nueva contraseña y su confirmación no coinciden",
      });
    }
    if (passwordNueva === passwordActual) {
      return res.status(400).json({
        success: false,
        message: "La nueva contraseña no puede ser igual a la actual",
      });
    }
    if (!PASSWORD_REGEX.test(passwordNueva)) {
      return res.status(400).json({
        success: false,
        message: "La nueva contraseña debe tener mínimo 8 caracteres e incluir mayúscula, minúscula, número y carácter especial (!@#$%^&*)",
      });
    }

    const userId = req.user?.userId;
    const usuario = await Usuario.findById(userId);
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    const ok = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!ok) {
      return res.status(400).json({ success: false, message: "La contraseña actual es incorrecta" });
    }

    usuario.passwordHash = await bcrypt.hash(passwordNueva, 10);
    await usuario.save();

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/paciente/me — datos personales del paciente autenticado
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const paciente = await Paciente.findById(req.pacienteId).select(
      "nombres apellidos dni telefono correo fechaNacimiento sexo estadoCivil direccion distrito apoderadoNombre apoderadoParentesco apoderadoTelefono avatar"
    );
    if (!paciente) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }
    res.json({ success: true, data: paciente });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/paciente/citas — historial de citas del paciente autenticado
// Soporta ?estado=PENDIENTE&desde=2026-01-01&hasta=2026-12-31&pagina=1
export const getMyCitas = async (req: AuthRequest, res: Response) => {
  try {
    const pagina    = Math.max(parseInt(req.query.pagina as string) || 1, 1);
    const porPagina = 20;
    const filtro: any = { pacienteId: req.pacienteId };

    if (req.query.estado) filtro.estado = String(req.query.estado).toUpperCase();
    if (req.query.desde || req.query.hasta) {
      filtro.fecha = {};
      if (req.query.desde) filtro.fecha.$gte = new Date(String(req.query.desde));
      if (req.query.hasta) filtro.fecha.$lte = new Date(String(req.query.hasta));
    }

    const [citas, total] = await Promise.all([
      Cita.find(filtro)
        .select("-pago -__v") // excluye datos de pago
        .populate({
          path: "doctorId",
          select: "nombres apellidos especialidadId",
          populate: { path: "especialidadId", select: "nombre" },
        })
        .populate("medicamentosPrescritos.medicamentoId", "nombre principioActivo presentacion")
        .sort({ fecha: -1, hora: -1 })
        .skip((pagina - 1) * porPagina)
        .limit(porPagina),
      Cita.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      data: citas,
      paginacion: {
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/paciente/ordenes — órdenes de laboratorio/imagen del paciente autenticado
// Soporta ?estado=PENDIENTE&tipoOrden=LABORATORIO&pagina=1
export const getMyOrdenes = async (req: AuthRequest, res: Response) => {
  try {
    const pagina    = Math.max(parseInt(req.query.pagina as string) || 1, 1);
    const porPagina = 20;
    const filtro: any = { pacienteId: req.pacienteId };

    if (req.query.estado)    filtro.estado    = String(req.query.estado).toUpperCase();
    if (req.query.tipoOrden) filtro.tipoOrden = String(req.query.tipoOrden).toUpperCase();

    const [ordenes, total] = await Promise.all([
      OrdenExamen.find(filtro)
        .select("-__v")
        .populate("doctorId", "nombres apellidos")
        .populate("especialidadId", "nombre")
        .populate(
          "items.examenId",
          "nombre tipo unidad referenciaMin referenciaMax referenciaTexto"
        )
        .sort({ fecha: -1 })
        .skip((pagina - 1) * porPagina)
        .limit(porPagina),
      OrdenExamen.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      data: ordenes,
      paginacion: {
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
