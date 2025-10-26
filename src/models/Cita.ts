// src/models/Cita.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICita extends Document {
  pacienteId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  fecha: Date;
  hora: string;
  estado: "pendiente" | "reprogramado" | "finalizado"; // ✅ agregado
}

const citaSchema = new Schema<ICita>(
  {
    pacienteId: { type: Schema.Types.ObjectId, ref: "Paciente", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    fecha: { type: Date, required: true },
    hora: { type: String, required: true },
    estado: {
      type: String,
      enum: ["pendiente", "reprogramado", "finalizado"], // ✅ enum
      default: "pendiente",
    },
  },
  { timestamps: true }
);

export const Cita = mongoose.model<ICita>("Cita", citaSchema);
