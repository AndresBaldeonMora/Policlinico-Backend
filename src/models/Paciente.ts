import mongoose, { Schema, Document } from "mongoose";

export interface IPaciente extends Document {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  correo?: string;
  fechaNacimiento?: Date;
  edad?: number; // virtual
}

const pacienteSchema = new Schema<IPaciente>(
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
    dni: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    telefono: {
      type: String,
      trim: true,
    },
    correo: {
      type: String,
      trim: true,
      lowercase: true,
    },
    fechaNacimiento: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
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
  ) {
    edad--;
  }

  return edad;
});

export const Paciente = mongoose.model<IPaciente>("Paciente", pacienteSchema);
