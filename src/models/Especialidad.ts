import mongoose, { Schema, Document } from "mongoose";

export interface IEspecialidad extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  tieneLaboratorioImagen: boolean;
  examenes: mongoose.Types.ObjectId[];
}

const especialidadSchema = new Schema<IEspecialidad>(
  {
    nombre:                 { type: String, required: true, trim: true },
    tieneLaboratorioImagen: { type: Boolean, default: false },
    examenes: [{ type: Schema.Types.ObjectId, ref: "ExamenLaboratorioImagen", default: [] }],
  },
  { timestamps: true }
);

export const Especialidad = mongoose.model<IEspecialidad>(
  "Especialidad",
  especialidadSchema
);