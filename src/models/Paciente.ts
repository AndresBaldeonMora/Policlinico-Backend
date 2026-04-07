import mongoose, { Schema, Document } from "mongoose";

export interface IPaciente extends Document {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  correo?: string;
  fechaNacimiento?: Date;
  sexo?: string;
  estadoCivil?: string;
  direccion?: string;
  distrito?: string;
  apoderadoNombre?: string;
  apoderadoParentesco?: string;
  apoderadoTelefono?: string;
  edad?: number; // virtual
}

const pacienteSchema = new Schema<IPaciente>(
  {
    nombres:    { type: String, required: true, trim: true },
    apellidos:  { type: String, required: true, trim: true },
    dni:        { type: String, required: true, unique: true, trim: true },
    telefono: { type: String, trim: true, unique: true, sparse: true },
    correo:   { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    fechaNacimiento: { type: Date },
    sexo:       { type: String, enum: ["M", "F", ""], default: "" },
    estadoCivil: {
      type: String,
      enum: ["SOLTERO", "CASADO", "CONVIVIENTE", "DIVORCIADO", "VIUDO", ""],
      default: "",
    },
    direccion:  { type: String, trim: true, default: "" },
    distrito:   { type: String, trim: true, default: "" },
    // Apoderado (solo menores de edad)
    apoderadoNombre:      { type: String, trim: true, default: "" },
    apoderadoParentesco:  { type: String, trim: true, default: "" },
    apoderadoTelefono:    { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual edad
pacienteSchema.virtual("edad").get(function () {
  if (!this.fechaNacimiento) return null;
  const hoy = new Date();
  const nac = new Date(this.fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
  ) edad--;
  return edad;
});

export const Paciente = mongoose.model<IPaciente>("Paciente", pacienteSchema);