import mongoose, { Schema, Document } from "mongoose";

export type TipoAviso = "INFO" | "ALERTA" | "URGENTE";

export interface IAviso extends Document {
  titulo: string;
  mensaje: string;
  tipo: TipoAviso;
  activo: boolean;
  creadoEn: Date;
}

const avisoSchema = new Schema<IAviso>(
  {
    titulo:   { type: String, required: true, trim: true, maxlength: 120 },
    mensaje:  { type: String, required: true, trim: true, maxlength: 800 },
    tipo:     { type: String, enum: ["INFO", "ALERTA", "URGENTE"], default: "INFO", required: true },
    activo:   { type: Boolean, default: true },
    creadoEn: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const Aviso = mongoose.model<IAviso>("Aviso", avisoSchema);
