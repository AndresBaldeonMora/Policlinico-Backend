import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Usuario } from "../models/Usuario";
import { Paciente } from "../models/Paciente";
import { getJwtSecret } from "../middlewares/authMiddlewares";
import type { AuthRequest } from "../middlewares/authMiddlewares";

const JWT_SECRET = getJwtSecret();

// --------------------------------------------------
// 1. REGISTRAR (público) → SÓLO PACIENTE
//    Los demás roles (MEDICO, RECEPCIONISTA, ADMINISTRADOR) se crean
//    desde el panel de administración (`/api/admin/usuarios`).
// --------------------------------------------------
export const register = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, password, dni } = req.body;
    const correo = typeof req.body.correo === "string" ? req.body.correo : "";

    if (!nombres || !apellidos || !correo || !password || !dni) {
      return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    // Defensa anti-NoSQL injection: forzamos tipos string.
    if (typeof password !== "string" || typeof dni !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Credenciales inválidas" });
    }

    const correoNorm = correo.toLowerCase().trim();

    const existingUser = await Usuario.findOne({ correo: correoNorm });
    if (existingUser) {
      // Mensaje genérico para evitar enumeración de correos.
      return res.status(400).json({ message: "No se puede crear la cuenta. Verifica los datos o contacta a recepción." });
    }

    // Sólo se vincula con Paciente preexistente (creado por recepción).
    const paciente = await Paciente.findOne({ dni: dni.trim() });
    if (!paciente) {
      return res.status(400).json({
        message: "No se puede crear la cuenta. Verifica los datos o contacta a recepción.",
      });
    }
    const yaVinculado = await Usuario.findOne({ pacienteId: paciente._id });
    if (yaVinculado) {
      return res.status(400).json({
        message: "No se puede crear la cuenta. Verifica los datos o contacta a recepción.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new Usuario({
      nombres,
      apellidos,
      correo: correoNorm,
      passwordHash,
      rol: "PACIENTE",
      pacienteId: paciente._id,
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      id: savedUser._id,
      nombres: savedUser.nombres,
      apellidos: savedUser.apellidos,
      correo: savedUser.correo,
      rol: savedUser.rol,
      pacienteId: savedUser.pacienteId,
    });
  } catch (error) {
    console.error("Error en register:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --------------------------------------------------
// 2. LOGIN
// --------------------------------------------------
export const login = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const correo = typeof req.body.correo === "string" ? req.body.correo : "";

    // Tipos forzados — bloquea {correo:{$gt:""}} y demás operadores NoSQL.
    if (typeof password !== "string" || !correo || !password) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const correoNorm = correo.toLowerCase().trim();
    const user = await Usuario.findOne({ correo: correoNorm });

    // Hash dummy de longitud comparable para evitar timing attack:
    // ejecutamos bcrypt.compare aunque el usuario no exista.
    const dummyHash = "$2a$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstuv";
    const passwordHash = user?.passwordHash ?? dummyHash;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isValid) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (user.activo === false) {
      return res.status(403).json({ message: "Esta cuenta ha sido desactivada. Contacta al administrador." });
    }

    const token = jwt.sign(
      {
        userId: String(user._id),
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
        medicoId: user.medicoId ? String(user.medicoId) : undefined,
        pacienteId: user.pacienteId ? String(user.pacienteId) : undefined,
      },
      JWT_SECRET,
      { algorithm: "HS256", expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        rol: user.rol,
        debeCambiarPassword: user.debeCambiarPassword ?? false,
        medicoId: user.medicoId,
        pacienteId: user.pacienteId,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --------------------------------------------------
// 3. CAMBIAR CONTRASEÑA (usuario autenticado)
//    Obligatorio en primer login cuando debeCambiarPassword = true.
// --------------------------------------------------
export const cambiarPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    if (typeof passwordActual !== "string" || typeof passwordNuevo !== "string") {
      return res.status(400).json({ message: "Datos inválidos" });
    }
    if (passwordNuevo.length < 8) {
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 8 caracteres" });
    }

    const user = await Usuario.findById(req.user?.userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const isValid = await bcrypt.compare(passwordActual, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "La contraseña actual es incorrecta" });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(passwordNuevo, salt);
    user.debeCambiarPassword = false;
    await user.save();

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error en cambiarPassword:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
