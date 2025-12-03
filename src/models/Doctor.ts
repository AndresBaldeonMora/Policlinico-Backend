import mongoose, { Schema, Document } from "mongoose";

// Definimos la interfaz del Doctor
export interface IDoctor extends Document {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  especialidadId: mongoose.Types.ObjectId;
  usuarioId?: mongoose.Types.ObjectId; // ✅ NUEVO: Vincula con Usuario
  cvUrl?: string;
  cmp?: string;
}

// Definimos el esquema del Doctor
const doctorSchema = new Schema<IDoctor>(
  {
    nombres: {
      type: String,
      required: true,
      trim: true,
    },
    apellidos: {
      type: String,
      required: true,
      trim: true,
    },
    correo: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    telefono: {
      type: String,
      required: true,
      trim: true,
    },
    especialidadId: {
      type: Schema.Types.ObjectId,
      ref: "Especialidad",
      required: true,
    },
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref: "Usuario",
      // ✅ OPCIONAL: Si quieres que sea único (un usuario = un doctor)
      // unique: true,
      // sparse: true,
    },
    cvUrl: {
      type: String,
      default: "",
      trim: true,
    },
    cmp: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Exportamos el modelo Doctor
export const Doctor = mongoose.model<IDoctor>("Doctor", doctorSchema);