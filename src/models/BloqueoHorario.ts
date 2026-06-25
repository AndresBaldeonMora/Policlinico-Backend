import mongoose, { Schema, Document } from "mongoose";

export interface IBloqueoHorario extends Document {
  doctorId: mongoose.Types.ObjectId;
  fecha: Date;
  tipoDia: "DIA_COMPLETO" | "RANGO_HORAS";
  horaInicio?: string;
  horaFin?: string;
  motivo: string;
  descripcion?: string;
  creadoPor: mongoose.Types.ObjectId;
  creadoEn: Date;
  activo: boolean;
}

const bloqueoHorarioSchema = new Schema<IBloqueoHorario>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    fecha: {
      type: Date,
      required: true,
    },
    tipoDia: {
      type: String,
      enum: ["DIA_COMPLETO", "RANGO_HORAS"],
      default: "DIA_COMPLETO",
      required: true,
    },
    horaInicio: { type: String, trim: true },
    horaFin:    { type: String, trim: true },
    motivo: {
      type: String,
      required: true,
      enum: ["No asistió", "Permiso médico", "Capacitación", "Almuerzo", "Imprevisto", "Otro"],
    },
    descripcion: {
      type: String,
      trim: true,
    },
    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    creadoEn: {
      type: Date,
      default: Date.now,
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

bloqueoHorarioSchema.index({ doctorId: 1, fecha: 1 });

export const BloqueoHorario = mongoose.model<IBloqueoHorario>("BloqueoHorario", bloqueoHorarioSchema);
