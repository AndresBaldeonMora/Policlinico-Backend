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
  { 
    timestamps: true,
    toJSON: { virtuals: true },  // ✅ para incluir virtuales en respuestas JSON
    toObject: { virtuals: true } // ✅ también en objetos normales
  }
);

// 🔹 Campo virtual para calcular edad automáticamente
pacienteSchema.virtual("edad").get(function () {
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

export const Paciente = mongoose.model("Paciente", pacienteSchema);
