import mongoose, { Schema, Document } from "mongoose";

export interface IBloqueoHorario extends Document {
  doctorId: mongoose.Types.ObjectId;
  fecha: Date;
  esDiaCompleto: boolean;   // true = todo el día; false = franja [horaInicio, horaFin)
  horaInicio?: string;      // "14:00" — sólo si no es día completo
  horaFin?: string;         // "16:00" — sólo si no es día completo
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
    esDiaCompleto: {
      type: Boolean,
      default: true,
    },
    horaInicio: { type: String }, // "HH:MM" — sólo si no es día completo
    horaFin: { type: String },
    motivo: {
      type: String,
      required: true,
      enum: ["No asistió", "Permiso médico", "Capacitación", "Otro"],
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

/**
 * Indica si un bloqueo afecta a una hora concreta ("HH:MM").
 * Un bloqueo de día completo (o uno antiguo sin el flag) cubre todo el día;
 * uno de franja sólo cubre el rango [horaInicio, horaFin).
 */
export function bloqueoCubreHora(
  b: { esDiaCompleto?: boolean; horaInicio?: string; horaFin?: string },
  hora: string
): boolean {
  if (b.esDiaCompleto !== false) return true;
  if (!b.horaInicio || !b.horaFin) return true; // defensivo: franja mal formada → trata como día completo
  return hora >= b.horaInicio && hora < b.horaFin;
}
