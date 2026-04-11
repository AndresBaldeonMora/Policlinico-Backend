import mongoose, { Schema, Document } from "mongoose";

export interface IItemOrden {
  examenId: mongoose.Types.ObjectId;
  observaciones?: string;
  valorResultado?: string;
  unidadResultado?: string;
  archivoUrl?: string;
  fechaResultado?: Date;
  estadoItem: "PENDIENTE" | "COMPLETADO";
}

export type EstadoOrdenExamen =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "ASISTIDO"
  | "FINALIZADO"
  | "CANCELADA"
  | "VENCIDA";

export interface IOrdenExamen extends Document {
  _id: mongoose.Types.ObjectId;
  pacienteId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  citaId?: mongoose.Types.ObjectId;
  especialidadId: mongoose.Types.ObjectId;
  codigoOrden: string;
  // Ciclo de vida de la orden
  fecha: Date;
  fechaAutorizacion?: Date;   // Cuando recepción autoriza la orden
  fechaCitaLab?: Date;        // Día agendado para la toma de muestra
  fechaVencimiento?: Date;    // fechaAutorizacion + 7 días
  fechaAsistencia?: Date;     // Cuando el paciente se presenta al laboratorio
  fechaResultados?: Date;     // Cuando el laboratorio carga los resultados
  // Resultado global (PDF de la orden completa)
  archivoResultadoUrl?: string;
  // Campos heredados / compatibilidad
  citaLabId?: mongoose.Types.ObjectId;
  motivoVencimiento?: string;
  items: IItemOrden[];
  estado: EstadoOrdenExamen;
  observacionesGenerales?: string;
}

const itemOrdenSchema = new Schema<IItemOrden>(
  {
    examenId: { type: Schema.Types.ObjectId, ref: "ExamenLaboratorio", required: true },
    observaciones:    { type: String, trim: true, default: "" },
    valorResultado:   { type: String, trim: true },
    unidadResultado:  { type: String, trim: true },
    archivoUrl:       { type: String, trim: true },
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
    pacienteId:     { type: Schema.Types.ObjectId, ref: "Paciente",         required: true },
    doctorId:       { type: Schema.Types.ObjectId, ref: "Doctor",           required: true },
    citaId:         { type: Schema.Types.ObjectId, ref: "Cita" },
    especialidadId: { type: Schema.Types.ObjectId, ref: "Especialidad",     required: true },
    codigoOrden:    { type: String, unique: true, sparse: true },
    fecha:          { type: Date, required: true, default: () => new Date() },
    // Ciclo de vida
    fechaAutorizacion:  { type: Date },
    fechaCitaLab:       { type: Date },
    fechaVencimiento:   { type: Date },
    fechaAsistencia:    { type: Date },
    fechaResultados:    { type: Date },
    archivoResultadoUrl:{ type: String, trim: true },
    // Compatibilidad
    citaLabId:          { type: Schema.Types.ObjectId, ref: "Cita" },
    motivoVencimiento:  { type: String, trim: true },
    items: [itemOrdenSchema],
    estado: {
      type: String,
      enum: ["PENDIENTE", "EN_PROCESO", "ASISTIDO", "FINALIZADO", "CANCELADA", "VENCIDA"],
      default: "PENDIENTE",
      required: true,
    },
    observacionesGenerales: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const OrdenExamen = mongoose.model<IOrdenExamen>("OrdenExamen", ordenExamenSchema);
