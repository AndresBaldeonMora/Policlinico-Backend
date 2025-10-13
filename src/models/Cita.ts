import mongoose from "mongoose";

const citaSchema = new mongoose.Schema(
  {
    pacienteId: { type: mongoose.Schema.Types.ObjectId, ref: "Paciente", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    fecha: { type: String, required: true }, // formato "YYYY-MM-DD"
    hora: { type: String, required: true }   // formato "HH:mm"
  },
  { timestamps: true }
);

export const Cita = mongoose.model("Cita", citaSchema);
