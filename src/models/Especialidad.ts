import mongoose, { Schema, Document } from "mongoose";

export interface IEspecialidad extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  tieneLaboratorio: boolean;
}

const especialidadSchema = new Schema<IEspecialidad>(
  {
    nombre:           { type: String, required: true, trim: true },
    tieneLaboratorio: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Especialidad = mongoose.model<IEspecialidad>(
  "Especialidad",
  especialidadSchema
);