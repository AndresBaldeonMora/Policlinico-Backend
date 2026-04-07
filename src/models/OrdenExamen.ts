import mongoose, { Schema, Document } from "mongoose";

export interface IItemOrden {
  examenId: mongoose.Types.ObjectId;
  observaciones?: string;
  // Resultado capturado por técnico de laboratorio
  valorResultado?: string;
  unidadResultado?: string;
  fechaResultado?: Date;
  estadoItem: "PENDIENTE" | "COMPLETADO";
}

export interface IOrdenExamen extends Document {
  _id: mongoose.Types.ObjectId;
  pacienteId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  citaId?: mongoose.Types.ObjectId;
  especialidadId: mongoose.Types.ObjectId;
  items: IItemOrden[];
  estado: "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "CANCELADA";
  observacionesGenerales?: string;
  fecha: Date;
}

const itemOrdenSchema = new Schema<IItemOrden>(
  {
    examenId: { type: Schema.Types.ObjectId, ref: "ExamenLaboratorio", required: true },
    observaciones:    { type: String, trim: true, default: "" },
    valorResultado:   { type: String, trim: true },
    unidadResultado:  { type: String, trim: true },
    fechaResultado:   { type: Date },
    estadoItem: {
      type: String,
      enum: ["PENDIENTE", "COMPLETADO"],
      default: "PENDIENTE",
    },
  },
  { _id: false }
);

const ordenExamenSchema = new Schema<IOrdenExamen>(
  {
    pacienteId: { type: Schema.Types.ObjectId, ref: "Paciente", required: true },
    doctorId:   { type: Schema.Types.ObjectId, ref: "Doctor",   required: true },
    citaId:     { type: Schema.Types.ObjectId, ref: "Cita" },
    especialidadId: { type: Schema.Types.ObjectId, ref: "Especialidad", required: true },
    items: [itemOrdenSchema],
    estado: {
      type: String,
      enum: ["PENDIENTE", "EN_PROCESO", "COMPLETADO", "CANCELADA"],
      default: "PENDIENTE",
      required: true,
    },
    observacionesGenerales: { type: String, trim: true, default: "" },
    fecha: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

export const OrdenExamen = mongoose.model<IOrdenExamen>("OrdenExamen", ordenExamenSchema);
