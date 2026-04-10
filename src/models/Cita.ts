import mongoose, { Schema, Document } from "mongoose";

export type TipoCita = "CONSULTA" | "LABORATORIO" | "REMOTA" | "DOMICILIO";

export interface ICita extends Document {
  pacienteId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId | null;
  fecha: Date;
  hora?: string;
  tipo: TipoCita;
  estado: "PENDIENTE" | "ATENDIDA" | "CANCELADA" | "REPROGRAMADA";

  // Exclusivos de citas LABORATORIO
  fechaVigenciaHasta?: Date;   // Hasta cuándo es válida la cita de laboratorio
  instrucciones?: string;      // Indicaciones compiladas para el paciente

  // Preparado para pagos (NO obligatorio por ahora)
  pago?: {
    metodo: "TARJETA" | "EFECTIVO" | "TRANSFERENCIA";
    monto: number;
    referencia?: string;
    fechaPago: Date;
  };
}

const citaSchema = new Schema<ICita>(
  {
    pacienteId: {
      type: Schema.Types.ObjectId,
      ref: "Paciente",
      required: true,
    },

    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: false,
      default: null,
    },

    fecha: {
      type: Date,
      required: true,
    },

    hora: {
      type: String,
      required: false,
      default: null,
    },

    tipo: {
      type: String,
      enum: ["CONSULTA", "LABORATORIO", "REMOTA", "DOMICILIO"],
      default: "CONSULTA",
      required: true,
    },

    estado: {
      type: String,
      enum: ["PENDIENTE", "ATENDIDA", "CANCELADA", "REPROGRAMADA"],
      default: "PENDIENTE",
      required: true,
    },

    fechaVigenciaHasta: {
      type: Date,
      required: false,
    },

    instrucciones: {
      type: String,
      required: false,
      default: "",
    },

    pago: {
      metodo: {
        type: String,
        enum: ["TARJETA", "EFECTIVO", "TRANSFERENCIA"],
      },
      monto:     { type: Number, min: 0 },
      referencia: { type: String },
      fechaPago:  { type: Date },
    },
  },
  { timestamps: true }
);

// Unicidad para citas de CONSULTA / REMOTA / DOMICILIO (con doctor asignado)
citaSchema.index(
  { doctorId: 1, fecha: 1, hora: 1 },
  { unique: true, partialFilterExpression: { doctorId: { $type: "objectId" } } }
);

export const Cita = mongoose.model<ICita>("Cita", citaSchema);
