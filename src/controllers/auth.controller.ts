import { Request, Response } from "express";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
import { Usuario } from "../models/Usuario";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_change_this";

export const login = async (req: Request, res: Response) => {
  try {
    const { correo, password } = req.body;

    const user = await Usuario.findOne({ correo });
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
        medicoId: user.medicoId || null,
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
        medicoId: user.medicoId || null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
