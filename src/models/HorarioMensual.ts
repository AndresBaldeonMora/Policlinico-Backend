import mongoose, { Schema, Document } from "mongoose";

/**
 * Plantilla de horario mensual de un médico: qué días de la semana atiende
 * y en qué franja horaria, para un mes/año concreto.
 */
export interface IHorarioMensual extends Document {
  medicoId: mongoose.Types.ObjectId;
  mes: number;          // 1–12
  anio: number;
  diasSemana: number[]; // 0=Domingo … 6=Sábado
  horaInicio: string;   // "08:00"
  horaFin: string;      // "13:00"
}

const horarioMensualSchema = new Schema<IHorarioMensual>(
  {
    medicoId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    mes: { type: Number, required: true, min: 1, max: 12 },
    anio: { type: Number, required: true },
    diasSemana: { type: [Number], default: [] }, // 0=Dom … 6=Sáb
    horaInicio: { type: String, required: true }, // "HH:MM"
    horaFin: { type: String, required: true },    // "HH:MM"
  },
  { timestamps: true }
);

// Un único horario por médico/mes/año (al re-guardar se reemplaza).
horarioMensualSchema.index({ medicoId: 1, mes: 1, anio: 1 }, { unique: true });

export const HorarioMensual = mongoose.model<IHorarioMensual>("HorarioMensual", horarioMensualSchema);
