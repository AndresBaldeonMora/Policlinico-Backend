import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    correo: string;
    nombres: string;
    apellidos: string;
    rol: string;
    medicoId?: string;  // Solo presente si el usuario es MEDICO
  };
}

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
    // Supabase firma sus JWTs con el JWT Secret del proyecto
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as any;

    // Supabase guarda los metadatos del usuario en user_metadata
    const meta = decoded.user_metadata ?? {};

    req.user = {
      userId: decoded.sub,           // sub = UUID del usuario en Supabase
      correo: decoded.email ?? "",
      nombres: meta.nombres ?? "",
      apellidos: meta.apellidos ?? "",
      rol: meta.rol ?? "",
      medicoId: meta.medicoId,       // Solo presente si el usuario es MEDICO
    };

    next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ message: "No tienes permisos" });
    }
    next();
  };
};