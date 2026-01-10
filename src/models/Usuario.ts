import mongoose, { Schema, Document } from "mongoose";

export type RolUsuario = "RECEPCIONISTA" | "MEDICO";

export interface IUsuario extends Document {
  nombres: string;
  apellidos: string;
  correo: string;
  passwordHash: string;
  rol: RolUsuario;
  // ✅ AGREGAMOS ESTO: Para vincular al médico
  medicoId?: mongoose.Types.ObjectId; 
}

const usuarioSchema = new Schema<IUsuario>(
  {
    nombres: { type: String, required: true },
    apellidos: { type: String, required: true },
    correo: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    rol: {
      type: String,
      enum: ["RECEPCIONISTA", "MEDICO"],
      required: true,
    },
    // ✅ AGREGAMOS ESTO AL SCHEMA
    medicoId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: false, // Es opcional porque el Recepcionista no lo tiene
    },
  },
  { timestamps: true }
);

export const Usuario = mongoose.model<IUsuario>("Usuario", usuarioSchema);