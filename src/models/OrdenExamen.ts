import mongoose, { Schema, Document } from "mongoose";

export interface IRespuestaProtocolar {
  preguntaId: string;
  preguntaTexto: string;
  respuesta: string;
}

export interface IItemOrden {
  examenId: mongoose.Types.ObjectId;
  seccion: "LAB" | "IMAGEN";   // qué módulo procesa este ítem
  observaciones?: string;
  respuestasProtocolares: IRespuestaProtocolar[];
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

export type TipoOrden = "LABORATORIO" | "IMAGEN" | "MIXTA";

export interface IOrdenExamen extends Document {
  _id: mongoose.Types.ObjectId;
  pacienteId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  citaId?: mongoose.Types.ObjectId;
  especialidadId: mongoose.Types.ObjectId;
  codigoOrden: string;
  tipoOrden: TipoOrden;
  // Ciclo de vida de la orden
  fecha: Date;
  fechaAutorizacion?: Date;      // Cuando recepción autoriza la orden
  fechaCitaLab?: Date;           // Día agendado para toma de muestra (laboratorio)
  fechaVencimiento?: Date;       // fechaAutorizacion + 7 días
  fechaAsistencia?: Date;        // Cuando el paciente se presenta
  fechaResultados?: Date;        // Cuando el laboratorio/imagen carga resultados
  // Campos específicos de imagenología
  citaImagenFecha?: Date;        // Fecha + hora exacta para cita de imagen
  duracionEstimadaMin?: number;  // Duración estimada del estudio en minutos
  salaEquipo?: string;           // Sala o equipo asignado
  // Resultado global (PDF de la orden completa)
  archivoResultadoUrl?: string;
  // Campos heredados / compatibilidad
  citaLabId?: mongoose.Types.ObjectId;
  motivoVencimiento?: string;
  items: IItemOrden[];
  estado: EstadoOrdenExamen;
  observacionesGenerales?: string;
}

const respuestaProtocolarSchema = new Schema<IRespuestaProtocolar>(
  {
    preguntaId:    { type: String, required: true },
    preguntaTexto: { type: String, required: true },
    respuesta:     { type: String, required: true },
  },
  { _id: false }
);

const itemOrdenSchema = new Schema<IItemOrden>(
  {
    examenId: { type: Schema.Types.ObjectId, ref: "ExamenLaboratorioImagen", required: true },
    seccion: {
      type: String,
      enum: ["LAB", "IMAGEN"],
      required: true,
      default: "LAB",
    },
    observaciones:           { type: String, trim: true, default: "" },
    respuestasProtocolares:  { type: [respuestaProtocolarSchema], default: [] },
    valorResultado:          { type: String, trim: true },
    unidadResultado:         { type: String, trim: true },
    archivoUrl:              { type: String, trim: true },
    fechaResultado:          { type: Date },
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
    tipoOrden: {
      type: String,
      enum: ["LABORATORIO", "IMAGEN", "MIXTA"],
      default: "LABORATORIO",
    },
    fecha:          { type: Date, required: true, default: () => new Date() },
    // Ciclo de vida
    fechaAutorizacion:  { type: Date },
    fechaCitaLab:       { type: Date },
    fechaVencimiento:   { type: Date },
    fechaAsistencia:    { type: Date },
    fechaResultados:    { type: Date },
    // Imagenología
    citaImagenFecha:      { type: Date },
    duracionEstimadaMin:  { type: Number, min: 1 },
    salaEquipo:           { type: String, trim: true },
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
