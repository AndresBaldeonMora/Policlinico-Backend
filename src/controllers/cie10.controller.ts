import { Request, Response } from "express";
import { CIE10 } from "../models/CIE10";
import { normalizarTexto } from "../utils/normalizarTexto";

/** Escapa caracteres especiales de regex en la entrada del usuario */
function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/cie10?q=<texto>
 * Busca códigos CIE-10 por código (prefijo) o por descripción (subcadena,
 * insensible a tildes y mayúsculas). Pensado para autocompletar el
 * diagnóstico en la nota médica.
 */
export const buscarCIE10 = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const qNorm = escaparRegex(normalizarTexto(q));

    const resultados = await CIE10.find({
      $or: [
        { codigo:   { $regex: `^${escaparRegex(q)}`, $options: "i" } },
        { busqueda: { $regex: qNorm } },
      ],
    })
      .select("codigo descripcion capitulo -_id")
      .limit(30)
      .sort({ codigo: 1 });

    res.json({ success: true, data: resultados });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
