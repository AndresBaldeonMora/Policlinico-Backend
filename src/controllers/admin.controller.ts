import { Response } from "express";
import bcrypt from "bcryptjs";
import { Usuario, RolUsuario } from "../models/Usuario";
import { Doctor } from "../models/Doctor";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { registrarAuditoria } from "../utils/auditoria";
import { generarPasswordTemporal } from "../utils/generarPasswordTemporal";

// Roles que el administrador puede crear/gestionar desde el panel.
// Las cuentas de PACIENTE se crean por autorregistro vinculado a un DNI, no aquí.
const ROLES_GESTIONABLES: RolUsuario[] = ["RECEPCIONISTA", "MEDICO", "ADMINISTRADOR"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const mapUsuario = (u: any) => ({
  id: u._id.toString(),
  nombres: u.nombres,
  apellidos: u.apellidos,
  correo: u.correo,
  rol: u.rol,
  activo: u.activo ?? true,
  debeCambiarPassword: u.debeCambiarPassword ?? false,
  medicoId: u.medicoId ? u.medicoId.toString() : undefined,
  pacienteId: u.pacienteId ? u.pacienteId.toString() : undefined,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// ─────────────────────────────────────────────────────────────
// LISTAR USUARIOS  (filtros: rol, activo, búsqueda por nombre/correo)
// ─────────────────────────────────────────────────────────────
export const listarUsuarios = async (req: AuthRequest, res: Response) => {
  try {
    const { rol, activo, q, page, limit } = req.query;

    // Filtro base (rol + búsqueda): se usa también para contar los activos,
    // de modo que el contador del header sea coherente con la búsqueda actual
    // sin verse afectado por el filtro de estado.
    const filtroBase: Record<string, unknown> = {};
    if (rol) filtroBase.rol = String(rol).toUpperCase();
    if (q) {
      const re = { $regex: String(q), $options: "i" };
      filtroBase.$or = [{ nombres: re }, { apellidos: re }, { correo: re }];
    }

    const filtro: Record<string, unknown> = { ...filtroBase };
    if (activo === "true")  filtro.activo = true;
    if (activo === "false") filtro.activo = false;

    const pageNum  = Math.max(1, parseInt(String(page ?? "1"), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit ?? "25"), 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [usuarios, total, totalActivos] = await Promise.all([
      Usuario.find(filtro).select("-passwordHash").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Usuario.countDocuments(filtro),
      Usuario.countDocuments({ ...filtroBase, activo: true }),
    ]);

    res.json({
      success: true,
      data: usuarios.map(mapUsuario),
      paginacion: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / limitNum)),
      },
      totalActivos,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// OBTENER UN USUARIO
// ─────────────────────────────────────────────────────────────
export const obtenerUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await Usuario.findById(req.params.id).select("-passwordHash");
    if (!usuario) return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    res.json({ success: true, data: mapUsuario(usuario) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// CREAR USUARIO
//   Si no se envía password, se genera una temporal y se marca
//   debeCambiarPassword = true. Devuelve la clave temporal UNA sola vez.
// ─────────────────────────────────────────────────────────────
export const crearUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { nombres, apellidos, correo, rol, password, medicoId } = req.body;

    if (!nombres?.trim() || !apellidos?.trim() || !correo?.trim() || !rol) {
      return res.status(400).json({ success: false, message: "Nombres, apellidos, correo y rol son obligatorios" });
    }
    if (!EMAIL_RE.test(correo.trim())) {
      return res.status(400).json({ success: false, message: "El correo no tiene un formato válido" });
    }

    const rolUpper = String(rol).toUpperCase() as RolUsuario;
    if (!ROLES_GESTIONABLES.includes(rolUpper)) {
      return res.status(400).json({ success: false, message: "Rol no válido para gestión administrativa" });
    }

    const existe = await Usuario.findOne({ correo: correo.toLowerCase().trim() });
    if (existe) {
      return res.status(409).json({ success: false, message: "Ya existe un usuario con ese correo" });
    }

    // Si es MEDICO y se envía medicoId, validar que el doctor exista y no esté ya vinculado.
    let medicoIdRef: any = undefined;
    if (rolUpper === "MEDICO" && medicoId) {
      const doctor = await Doctor.findById(medicoId);
      if (!doctor) return res.status(404).json({ success: false, message: "El doctor indicado no existe" });
      const yaVinculado = await Usuario.findOne({ medicoId });
      if (yaVinculado) return res.status(409).json({ success: false, message: "Ese doctor ya tiene una cuenta vinculada" });
      medicoIdRef = medicoId;
    }

    const passwordPlano = password?.trim() || generarPasswordTemporal();
    const esTemporal = !password?.trim();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordPlano, salt);

    const nuevo = await Usuario.create({
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      correo: correo.toLowerCase().trim(),
      passwordHash,
      rol: rolUpper,
      activo: true,
      debeCambiarPassword: esTemporal,
      medicoId: medicoIdRef,
    });

    await registrarAuditoria({
      req,
      accion: "CREAR_USUARIO",
      entidad: "Usuario",
      entidadId: nuevo._id as any,
      estadoNuevo: rolUpper,
      descripcion: `Creó el usuario ${nuevo.correo} con rol ${rolUpper}`,
    });

    res.status(201).json({
      success: true,
      data: mapUsuario(nuevo),
      // La clave temporal solo se devuelve en la creación para entregarla al usuario.
      passwordTemporal: esTemporal ? passwordPlano : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// ACTUALIZAR USUARIO  (nombres, apellidos, correo, rol)
// ─────────────────────────────────────────────────────────────
export const actualizarUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { nombres, apellidos, correo, rol } = req.body;
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: "Usuario no encontrado" });

    if (correo && correo.toLowerCase().trim() !== usuario.correo) {
      if (!EMAIL_RE.test(correo.trim())) {
        return res.status(400).json({ success: false, message: "El correo no tiene un formato válido" });
      }
      const ocupado = await Usuario.findOne({ correo: correo.toLowerCase().trim(), _id: { $ne: usuario._id } });
      if (ocupado) return res.status(409).json({ success: false, message: "Ese correo ya está en uso" });
      usuario.correo = correo.toLowerCase().trim();
    }

    if (rol) {
      const rolUpper = String(rol).toUpperCase() as RolUsuario;
      if (!ROLES_GESTIONABLES.includes(rolUpper)) {
        return res.status(400).json({ success: false, message: "Rol no válido para gestión administrativa" });
      }
      usuario.rol = rolUpper;
    }
    if (nombres?.trim())   usuario.nombres = nombres.trim();
    if (apellidos?.trim()) usuario.apellidos = apellidos.trim();

    await usuario.save();

    await registrarAuditoria({
      req,
      accion: "ACTUALIZAR_USUARIO",
      entidad: "Usuario",
      entidadId: usuario._id as any,
      descripcion: `Actualizó los datos del usuario ${usuario.correo}`,
    });

    res.json({ success: true, data: mapUsuario(usuario) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// ACTIVAR / DESACTIVAR USUARIO  (soft-disable)
// ─────────────────────────────────────────────────────────────
export const toggleActivoUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: "Usuario no encontrado" });

    // Un administrador no puede desactivarse a sí mismo (evita quedarse sin acceso).
    const yo = req.user?.userId ?? req.user?.id;
    if (String(usuario._id) === String(yo)) {
      return res.status(400).json({ success: false, message: "No puedes desactivar tu propia cuenta" });
    }

    const anterior = usuario.activo ? "activo" : "inactivo";
    usuario.activo = !usuario.activo;
    await usuario.save();
    const nuevo = usuario.activo ? "activo" : "inactivo";

    await registrarAuditoria({
      req,
      accion: usuario.activo ? "ACTIVAR_USUARIO" : "DESACTIVAR_USUARIO",
      entidad: "Usuario",
      entidadId: usuario._id as any,
      estadoAnterior: anterior,
      estadoNuevo: nuevo,
      descripcion: `Cambió el estado del usuario ${usuario.correo} a ${nuevo}`,
    });

    res.json({ success: true, data: mapUsuario(usuario) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// RESETEAR CONTRASEÑA
//   Genera una clave temporal, fuerza el cambio en el próximo login
//   y la devuelve UNA sola vez para entregarla al usuario.
// ─────────────────────────────────────────────────────────────
export const resetearPassword = async (req: AuthRequest, res: Response) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ success: false, message: "Usuario no encontrado" });

    const passwordTemporal = generarPasswordTemporal();
    const salt = await bcrypt.genSalt(10);
    usuario.passwordHash = await bcrypt.hash(passwordTemporal, salt);
    usuario.debeCambiarPassword = true;
    await usuario.save();

    await registrarAuditoria({
      req,
      accion: "RESETEAR_PASSWORD",
      entidad: "Usuario",
      entidadId: usuario._id as any,
      descripcion: `Reseteó la contraseña del usuario ${usuario.correo}`,
    });

    res.json({ success: true, passwordTemporal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
