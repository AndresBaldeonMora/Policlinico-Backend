import mongoose, { Schema, Document } from "mongoose";

export interface IDoctor extends Document {
  _id: mongoose.Types.ObjectId;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  especialidadId: mongoose.Types.ObjectId;
  cmp?: string;
}

const doctorSchema = new Schema<IDoctor>(
  {
    nombres:        { type: String, required: true, trim: true },
    apellidos:      { type: String, required: true, trim: true },
    correo:         { type: String, required: true, trim: true, lowercase: true, unique: true },
    telefono:       { type: String, required: true, trim: true, unique: true },
    especialidadId: { type: Schema.Types.ObjectId, ref: "Especialidad", required: true },
    cmp:            { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const Doctor = mongoose.model<IDoctor>("Doctor", doctorSchema);