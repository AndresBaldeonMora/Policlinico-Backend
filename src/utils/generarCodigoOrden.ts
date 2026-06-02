import { OrdenExamen } from "../models/OrdenExamen";
import { hoyPeruUTC, finDelDiaUTC } from "./fecha.utils";

/**
 * Genera un código único de orden con formato ORD-YYYYMMDD-XXXX
 * donde XXXX es un secuencial del día (calendario peruano).
 */
export const generarCodigoOrden = async (): Promise<string> => {
  const inicioDelDia = hoyPeruUTC();
  const y = inicioDelDia.getUTCFullYear();
  const m = String(inicioDelDia.getUTCMonth() + 1).padStart(2, "0");
  const d = String(inicioDelDia.getUTCDate()).padStart(2, "0");
  const prefijo = `ORD-${y}${m}${d}`;

  // Contar órdenes del día para el secuencial
  const finDelDia = finDelDiaUTC(inicioDelDia);

  const count = await OrdenExamen.countDocuments({
    fecha: { $gte: inicioDelDia, $lte: finDelDia },
  });

  const secuencial = String(count + 1).padStart(4, "0");
  return `${prefijo}-${secuencial}`;
};
