import { OrdenExamen } from "../models/OrdenExamen";

/**
 * Genera un código único de orden con formato ORD-YYYYMMDD-XXXX
 * donde XXXX es un secuencial del día.
 */
export const generarCodigoOrden = async (): Promise<string> => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  const prefijo = `ORD-${y}${m}${d}`;

  // Contar órdenes del día para el secuencial
  const inicioDelDia = new Date(y, hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  const finDelDia = new Date(y, hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);

  const count = await OrdenExamen.countDocuments({
    fecha: { $gte: inicioDelDia, $lte: finDelDia },
  });

  const secuencial = String(count + 1).padStart(4, "0");
  return `${prefijo}-${secuencial}`;
};
