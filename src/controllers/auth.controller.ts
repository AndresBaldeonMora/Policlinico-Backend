import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Usuario } from "../models/Usuario";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_change_this";

// --------------------------------------------------
// 1. FUNCIÓN PARA REGISTRAR NUEVOS USUARIOS
// --------------------------------------------------
export const register = async (req: Request, res: Response) => {
  try {
    const { nombres, apellidos, correo, password, rol } = req.body;

    // 1. Validar que vengan los campos requeridos
    if (!nombres || !apellidos || !correo || !password || !rol) {
      return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    // 2. Validar que el ROL sea uno de los permitidos
    if (rol !== "RECEPCIONISTA" && rol !== "MEDICO") {
      return res.status(400).json({ message: "El rol proporcionado no es válido" });
    }

    // 3. Verificar si el correo ya existe
    const existingUser = await Usuario.findOne({ correo: correo.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "El correo ya está en uso" });
    }

    // 4. Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. Crear la instancia del nuevo usuario
    const newUser = new Usuario({
      nombres,
      apellidos,
      correo: correo.toLowerCase(),
      passwordHash,
      rol,
    });

    // 6. Guardar el usuario en la base de datos
    const savedUser = await newUser.save();

    // 7. Responder al cliente (sin el passwordHash)
    res.status(201).json({
      id: savedUser._id,
      nombres: savedUser.nombres,
      apellidos: savedUser.apellidos,
      correo: savedUser.correo,
      rol: savedUser.rol,
    });

  } catch (error) {
    console.error("Error en register:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --------------------------------------------------
// 2. FUNCIÓN PARA INICIAR SESIÓN (LOGIN)
// --------------------------------------------------
export const login = async (req: Request, res: Response) => {
  try {
    const { correo, password } = req.body;

    // 1. Buscar al usuario por correo
    const user = await Usuario.findOne({ correo: correo.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // 2. Comparar la contraseña
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // 3. Crear el Token (JWT)
    const token = jwt.sign(
      {
        userId: String(user._id),
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    // 4. Enviar la respuesta
    res.json({
      token,
      user: {
        id: user._id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        rol: user.rol,
      },
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};