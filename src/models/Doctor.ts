import mongoose, { Schema, Document } from "mongoose";

export interface IDoctor extends Document {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  especialidadId: mongoose.Types.ObjectId;
}

const doctorSchema = new Schema<IDoctor>(
  {
    nombres: { type: String, required: true },
    apellidos: { type: String, required: true },
    correo: { type: String, required: true },
    telefono: { type: String, required: true },
    especialidadId: { type: Schema.Types.ObjectId, ref: "Especialidad", required: true }
  },
  { timestamps: true }
);

export const Doctor = mongoose.model<IDoctor>("Doctor", doctorSchema);
