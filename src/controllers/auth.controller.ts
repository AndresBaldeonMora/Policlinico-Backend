import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Usuario } from "../models/Usuario";
import { Paciente } from "../models/Paciente";
import { getJwtSecret } from "../middlewares/authMiddlewares";
import type { AuthRequest } from "../middlewares/authMiddlewares";
import transporter from "../config/mailer";

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

// --------------------------------------------------
// 4. SOLICITAR RESET DE CONTRASEÑA (público)
//    Envía un correo con enlace de reset válido por 1 hora.
// --------------------------------------------------
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const correo = typeof req.body.correo === "string" ? req.body.correo.toLowerCase().trim() : "";
    if (!correo) {
      return res.status(400).json({ message: "El correo es obligatorio" });
    }

    const user = await Usuario.findOne({ correo });

    // Siempre respondemos con éxito para no enumerar correos
    if (!user || user.activo === false) {
      return res.json({ success: true, message: "Si el correo existe, recibirás las instrucciones." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#0f172a;margin-bottom:8px;">Restablecer contraseña</h2>
        <p>Estimado(a) <strong>${user.nombres} ${user.apellidos}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo. Este enlace expirará en <strong>1 hora</strong>.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${resetUrl}" style="background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            Restablecer contraseña
          </a>
        </div>
        <p style="color:#64748b;font-size:13px;">Si no solicitaste este cambio, ignora este correo. Tu contraseña seguirá siendo la misma.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
        <p style="color:#94a3b8;font-size:12px;">Policlínico Parroquial San José · Este es un correo automático, por favor no respondas.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Policlínico San José" <${process.env.SMTP_USER}>`,
      to: correo,
      subject: "Restablecer contraseña | Policlínico San José",
      html,
    });

    res.json({ success: true, message: "Si el correo existe, recibirás las instrucciones." });
  } catch (error) {
    console.error("Error en forgotPassword:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --------------------------------------------------
// 5. RESETEAR CONTRASEÑA CON TOKEN (público)
// --------------------------------------------------
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, passwordNuevo } = req.body;

    if (typeof token !== "string" || typeof passwordNuevo !== "string") {
      return res.status(400).json({ message: "Datos inválidos" });
    }
    if (passwordNuevo.length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await Usuario.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "El enlace es inválido o ha expirado." });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(passwordNuevo, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    user.debeCambiarPassword = false;
    await user.save();

    res.json({ success: true, message: "Contraseña restablecida correctamente. Ya puedes iniciar sesión." });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
