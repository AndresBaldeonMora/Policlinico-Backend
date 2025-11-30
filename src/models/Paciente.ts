import mongoose, { Schema, Document } from "mongoose";

export interface IPaciente extends Document {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  fechaNacimiento?: Date;
  edad?: number; // viene del virtual
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
    direccion: {
      type: String,
      trim: true,
    },
    fechaNacimiento: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },   // ✅ incluye 'edad' en las respuestas JSON
    toObject: { virtuals: true }, // ✅ también si se usa .toObject()
  }
);

// ✅ Virtual para calcular edad
pacienteSchema.virtual("edad").get(function (this: IPaciente) {
  if (!this.fechaNacimiento) return null;

  const hoy = new Date();
  const fechaNac = new Date(this.fechaNacimiento);

  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }

  return edad;
});

export const Paciente = mongoose.model<IPaciente>("Paciente", pacienteSchema);
