import mongoose, { Schema, Document } from "mongoose";

export interface ICita extends Document {
  pacienteId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  fecha: Date;
  hora: string;
  estado: "PENDIENTE" | "ATENDIDA" | "CANCELADA" | "REPROGRAMADA";
}

const citaSchema = new Schema<ICita>(
  {
    pacienteId: { type: Schema.Types.ObjectId, ref: "Paciente", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    fecha: { type: Date, required: true },
    hora: { type: String, required: true },
    estado: {
      type: String,
      enum: ["PENDIENTE", "ATENDIDA", "CANCELADA", "REPROGRAMADA"],
      default: "PENDIENTE",
      required: true,
    },
  },
  { timestamps: true }
);

citaSchema.index({ doctorId: 1, fecha: 1, hora: 1 }, { unique: true });

export const Cita = mongoose.model<ICita>("Cita", citaSchema);
