import mongoose, { Schema, Document } from "mongoose";

export interface IEspecialidad extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  tieneLaboratorio: boolean;
  examenes: mongoose.Types.ObjectId[];
}

const especialidadSchema = new Schema<IEspecialidad>(
  {
    nombre:           { type: String, required: true, trim: true },
    tieneLaboratorio: { type: Boolean, default: false },
    examenes: [{ type: Schema.Types.ObjectId, ref: "ExamenLaboratorio", default: [] }], // ← nuevo
  },
  { timestamps: true }
);

export const Especialidad = mongoose.model<IEspecialidad>(
  "Especialidad",
  especialidadSchema
);