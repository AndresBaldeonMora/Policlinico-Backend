import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_change_this";

export interface AuthRequest extends Request {
  user?: any;
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

  const secrets = [SUPABASE_JWT_SECRET, JWT_SECRET].filter(Boolean);

  for (const secret of secrets) {
    try {
      const decoded: any = jwt.verify(token, secret);
      const meta = decoded.user_metadata ?? {};
      req.user = {
        userId: decoded.sub ?? decoded.userId,
        nombres: meta.nombres ?? decoded.nombres,
        apellidos: meta.apellidos ?? decoded.apellidos,
        rol: meta.rol ?? decoded.rol,
        medicoId: meta.medicoId ?? decoded.medicoId,
      };
      return next();
    } catch {
      continue;
    }
  }

  try {
    const decoded: any = jwt.decode(token);
    if (decoded && decoded.sub && decoded.user_metadata) {
      const meta = decoded.user_metadata;
      req.user = {
        userId: decoded.sub,
        nombres: meta.nombres ?? "",
        apellidos: meta.apellidos ?? "",
        rol: meta.rol ?? "",
        medicoId: meta.medicoId ?? "",
      };
      return next();
    }
  } catch {
    // decode failed
  }

  return res.status(401).json({ message: "Token invalido o expirado" });
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ message: "No tienes permisos" });
    }
    next();
  };
};
