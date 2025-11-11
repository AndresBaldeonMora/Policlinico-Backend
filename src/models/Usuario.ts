import mongoose, { Schema, Document } from "mongoose";

export type RolUsuario = "RECEPCIONISTA" | "MEDICO";

export interface IUsuario extends Document {
  nombres: string;
  apellidos: string;
  correo: string;
  passwordHash: string;
  rol: RolUsuario;
  medicoId?: mongoose.Types.ObjectId; // opcional, si este usuario pertenece a un médico
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
    medicoId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
    },
  },
  { timestamps: true }
);

export const Usuario = mongoose.model<IUsuario>("Usuario", usuarioSchema);
