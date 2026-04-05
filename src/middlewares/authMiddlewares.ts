import { Request, Response, NextFunction } from "express";
//import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// const supabase = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_ANON_KEY!
// );

export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const token = authHeader.split(" ")[1];

  // Intentar primero con JWT propio del backend
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    // Si falla, intentar con token de Supabase
  }

  // Intentar decodificar token de Supabase (firmado con ES256)
  try {
    const decoded: any = jwt.decode(token);
    // if (decoded?.iss?.includes("supabase") && decoded.user_metadata) {
    //   req.user = {
    //     userId: decoded.sub,
    //     nombres: decoded.user_metadata?.nombres,
    //     apellidos: decoded.user_metadata?.apellidos,
    //     rol: decoded.user_metadata?.rol,
    //     medicoId: decoded.user_metadata?.medicoId,
    //   };
    //   return next();
    // }
    if (decoded?.iss?.includes("supabase")) {
      const meta = decoded.user_metadata ?? {};
      const appMeta = decoded.app_metadata ?? {};

      req.user = {
        userId:    decoded.sub,
        email:     decoded.email,
        nombres:   meta.nombres,
        apellidos: meta.apellidos,
        rol:       (appMeta.role ?? meta.rol ?? "").toLowerCase(), // ← ADMINISTRADOR → administrador
        medicoId:  meta.medicoId,
      };

      return next();
    }
  } catch {
    // Token no decodificable
  }

  return res.status(401).json({ message: "Token inválido o expirado" });
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ message: "No tienes permisos" });
    }
    next();
  };
};
