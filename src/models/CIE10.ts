import mongoose, { Schema, Document } from "mongoose";

/**
 * Catálogo CIE-10 (Clasificación Internacional de Enfermedades, 10.ª revisión).
 *
 * Fuente: catálogo oficial publicado por SUSALUD (CIE10_2021).
 * Ver FUENTES.md — el uso del CIE-10 en establecimientos de salud peruanos
 * está dispuesto por la RM N° 553-2002-SA-DM y reiterado por la RM 447-2024/MINSA.
 *
 * El catálogo solo se consulta (lectura); se carga vía `npm run seed:cie10`.
 */

export interface ICIE10 extends Document {
  codigo: string;        // Código estándar, ej. "E11.9", "I10.X"
  descripcion: string;   // Descripción oficial (con tildes y mayúsculas)
  busqueda: string;      // descripcion normalizada (minúsculas, sin tildes) — para búsqueda
  capitulo: string;      // Letra inicial del código, ej. "E" — agrupa por capítulo CIE-10
}

const cie10Schema = new Schema<ICIE10>(
  {
    codigo:      { type: String, required: true, unique: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    busqueda:    { type: String, required: true },
    capitulo:    { type: String, required: true },
  },
  { timestamps: false }
);

// `codigo` ya queda indexado por `unique: true`.
// Índice adicional para búsqueda por descripción normalizada.
cie10Schema.index({ busqueda: 1 });

export const CIE10 = mongoose.model<ICIE10>("CIE10", cie10Schema);
