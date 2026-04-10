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
  instrucciones: string;   // Indicaciones para el paciente (ayuno, horario, preparación)
  validezDias: number;     // Días de validez de la cita de lab generada (default 7)
  activo: boolean;
}

const examenLaboratorioSchema = new Schema<IExamenLaboratorio>(
  {
    nombre:        { type: String, required: true, trim: true },
    tipo: {
      type: String,
      enum: ["HEMATOLOGIA", "BIOQUIMICA", "ORINA", "HECES", "MICROBIOLOGIA", "INMUNOLOGIA", "HORMONAS", "IMAGEN", "OTRO"],
      required: true,
    },
    descripcion:   { type: String, trim: true, default: "" },
    instrucciones: { type: String, trim: true, default: "" },
    validezDias:   { type: Number, default: 7, min: 1 },
    activo:        { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ExamenLaboratorio = mongoose.model<IExamenLaboratorio>(
  "ExamenLaboratorio",
  examenLaboratorioSchema
);
