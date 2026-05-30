import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Fail-fast: si la env var no está, abortar el arranque en producción.
// En dev se permite un fallback explícito por DX, advirtiendo en consola.
const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET no está configurado en el entorno (producción)");
  }
  console.warn("⚠️  JWT_SECRET no definido — usando fallback de DESARROLLO. NUNCA usar en producción.");
  return "dev-only-jwt-secret-do-not-use-in-production";
})();

// Exportado para que auth.controller use exactamente el mismo secreto.
export const getJwtSecret = () => JWT_SECRET;

export interface AuthRequest extends Request {
  user?: any;
  pacienteId?: string;
}

// Verifica el JWT propio del backend (firmado con JWT_SECRET).
// Fija el algoritmo a HS256 para evitar el ataque "alg: none".
export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRol = (req.user?.rol ?? "").toUpperCase();
    const rolesUpper = roles.map((r) => r.toUpperCase());
    if (!req.user || !rolesUpper.includes(userRol)) {
      return res.status(403).json({ message: "No tienes permisos" });
    }
    next();
  };
};

// Exige rol PACIENTE y un pacienteId válido en el JWT.
export const requirePaciente = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const rol = (req.user?.rol ?? "").toUpperCase();
  if (rol !== "PACIENTE") {
    return res.status(403).json({ success: false, message: "Acceso restringido a pacientes" });
  }

  const pacienteId = req.user?.pacienteId;
  if (!pacienteId) {
    return res.status(400).json({
      success: false,
      message: "El token no tiene paciente vinculado",
    });
  }

  req.pacienteId = String(pacienteId);
  next();
};
