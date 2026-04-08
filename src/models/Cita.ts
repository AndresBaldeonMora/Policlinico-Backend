import mongoose, { Schema, Document } from "mongoose";

export type TipoCita = "CONSULTA" | "LABORATORIO" | "REMOTA" | "DOMICILIO";

export interface ICita extends Document {
  pacienteId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  fecha: Date;
  hora: string;
  tipo: TipoCita;
  estado: "PENDIENTE" | "ATENDIDA" | "CANCELADA" | "REPROGRAMADA";

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
      required: true,
    },

    fecha: {
      type: Date,
      required: true,
    },

    hora: {
      type: String,
      required: true,
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

    // 🔒 Campo de pago (opcional por ahora)
    pago: {
      metodo: {
        type: String,
        enum: ["TARJETA", "EFECTIVO", "TRANSFERENCIA"],
      },
      monto: {
        type: Number,
        min: 0,
      },
      referencia: {
        type: String,
      },
      fechaPago: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

// 🔐 Blindaje definitivo contra duplicados
citaSchema.index(
  { doctorId: 1, fecha: 1, hora: 1 },
  { unique: true }
);

export const Cita = mongoose.model<ICita>("Cita", citaSchema);
