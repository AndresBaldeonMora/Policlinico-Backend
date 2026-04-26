import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Usuario, RolUsuario } from "../models/Usuario";
import { Paciente } from "../models/Paciente";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_change_this";

const ROLES_VALIDOS: RolUsuario[] = ["RECEPCIONISTA", "MEDICO", "PACIENTE", "ADMINISTRADOR"];

// --------------------------------------------------
// 1. REGISTRAR NUEVOS USUARIOS
//    - PACIENTE requiere `dni` para vincular con un Paciente existente
//    - MEDICO puede recibir `medicoId` (opcional)
// --------------------------------------------------
export const register = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, correo, password, rol, dni, medicoId } = req.body;

    if (!nombres || !apellidos || !correo || !password || !rol) {
      return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    const rolUpper = String(rol).toUpperCase() as RolUsuario;
    if (!ROLES_VALIDOS.includes(rolUpper)) {
      return res.status(400).json({ message: "El rol proporcionado no es válido" });
    }

    const existingUser = await Usuario.findOne({ correo: correo.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "El correo ya está en uso" });
    }

    // Si es PACIENTE, vincular con Paciente existente por DNI
    let pacienteIdRef: any = undefined;
    if (rolUpper === "PACIENTE") {
      if (!dni) {
        return res.status(400).json({
          message: "El DNI es requerido para registrar un paciente",
        });
      }
      const paciente = await Paciente.findOne({ dni: String(dni).trim() });
      if (!paciente) {
        return res.status(404).json({
          message: "No existe un paciente registrado con ese DNI. Contacta a recepción.",
        });
      }
      // No permitir doble cuenta para el mismo paciente
      const yaVinculado = await Usuario.findOne({ pacienteId: paciente._id });
      if (yaVinculado) {
        return res.status(400).json({
          message: "Este paciente ya tiene una cuenta registrada",
        });
      }
      pacienteIdRef = paciente._id;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new Usuario({
      nombres,
      apellidos,
      correo: correo.toLowerCase(),
      passwordHash,
      rol: rolUpper,
      pacienteId: pacienteIdRef,
      medicoId: rolUpper === "MEDICO" ? medicoId : undefined,
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      id: savedUser._id,
      nombres: savedUser.nombres,
      apellidos: savedUser.apellidos,
      correo: savedUser.correo,
      rol: savedUser.rol,
      pacienteId: savedUser.pacienteId,
      medicoId: savedUser.medicoId,
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
    const { correo, password } = req.body;

    const user = await Usuario.findOne({ correo: correo.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Credenciales inválidas" });
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
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        rol: user.rol,
        medicoId: user.medicoId,
        pacienteId: user.pacienteId,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
