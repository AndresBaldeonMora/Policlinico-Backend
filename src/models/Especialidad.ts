import mongoose, { Schema, Document } from "mongoose";

export interface IEspecialidad extends Document {
  nombre: string;
  descripcion: string;
}

const especialidadSchema = new Schema<IEspecialidad>(
  {
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
  },
  { timestamps: true }
);

export const Especialidad = mongoose.model<IEspecialidad>(
  "Especialidad",
  especialidadSchema
);
