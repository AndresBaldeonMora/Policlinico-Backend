import mongoose from "mongoose";

const pacienteSchema = new mongoose.Schema(
  {
    nombres: { type: String, required: true },
    apellidos: { type: String, required: true },
    dni: { type: String, required: true, unique: true },
    telefono: { type: String },
    correo: { type: String },
    direccion: { type: String },
    fechaNacimiento: { type: Date },
  },
  { timestamps: true }
);

export const Paciente = mongoose.model("Paciente", pacienteSchema);
