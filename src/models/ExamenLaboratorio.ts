import mongoose, { Schema, Document } from "mongoose";

export type TipoExamen =
  | "HEMATOLOGIA"
  | "BIOQUIMICA"
  | "ORINA"
  | "HECES"
  | "MICROBIOLOGIA"
  | "INMUNOLOGIA"
  | "HORMONAS"
  | "IMAGEN"
  | "OTRO";

export interface IExamenLaboratorio extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  tipo: TipoExamen;
  descripcion?: string;
  unidad?: string;
  referenciaMin?: number;
  referenciaMax?: number;
  referenciaTexto?: string;
  activo: boolean;
}

const examenLaboratorioSchema = new Schema<IExamenLaboratorio>(
  {
    nombre:           { type: String, required: true, trim: true },
    tipo: {
      type: String,
      enum: ["HEMATOLOGIA", "BIOQUIMICA", "ORINA", "HECES", "MICROBIOLOGIA", "INMUNOLOGIA", "HORMONAS", "IMAGEN", "OTRO"],
      required: true,
    },
    descripcion:      { type: String, trim: true, default: "" },
    unidad:           { type: String, trim: true, default: "" },
    referenciaMin:    { type: Number },
    referenciaMax:    { type: Number },
    referenciaTexto:  { type: String, trim: true, default: "" },
    activo:           { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ExamenLaboratorio = mongoose.model<IExamenLaboratorio>(
  "ExamenLaboratorio",
  examenLaboratorioSchema
);
