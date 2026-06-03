import mongoose, { Schema, Document } from "mongoose";

export type PrioridadInterconsulta = "urgente" | "preferente" | "electiva";
export type EstadoInterconsulta =
  | "PENDIENTE"   // Solicitada, esperando respuesta
  | "RESPONDIDA"  // Respondida por escrito
  | "CITADA"      // Se agendó una cita presencial vinculada
  | "ATENDIDA"    // La cita vinculada fue atendida
  | "CANCELADA";

export interface IInterconsulta extends Document {
  pacienteId: mongoose.Types.ObjectId;
  citaId?: mongoose.Types.ObjectId;
  solicitanteId: mongoose.Types.ObjectId;
  solicitanteNombre: string;
  solicitanteEspecialidad?: string;           // Especialidad del médico solicitante (trazabilidad)
  especialidadSolicitada: string;
  medicoSolicitado?: string;
  destinatarioId?: mongoose.Types.ObjectId;
  prioridad: PrioridadInterconsulta;
  diagnosticoPresuntivo?: string;             // NTS-139: diagnóstico de trabajo del solicitante
  motivoConsulta: string;
  preguntaClinica?: string;
  informacionRelevante?: string;
  estado: EstadoInterconsulta;
  motivoCancelacion?: string;                 // Justificación si estado === CANCELADA
  // Respuesta del especialista
  respuesta?: string;
  respondidoPorId?: mongoose.Types.ObjectId;
  respondidoPorNombre?: string;
  respondidoPorCMP?: string;                  // N° colegiatura del especialista (requisito legal)
  fechaRespuesta?: Date;
  citaGeneradaId?: mongoose.Types.ObjectId;
}

const interconsultaSchema = new Schema<IInterconsulta>(
  {
    pacienteId:    { type: Schema.Types.ObjectId, ref: "Paciente", required: true },
    citaId:        { type: Schema.Types.ObjectId, ref: "Cita" },
    solicitanteId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    solicitanteNombre: { type: String, required: true, trim: true },
    especialidadSolicitada: { type: String, required: true, trim: true },
    medicoSolicitado: { type: String, trim: true, default: "" },
    destinatarioId: { type: Schema.Types.ObjectId, ref: "Doctor" },
    prioridad: {
      type: String,
      enum: ["urgente", "preferente", "electiva"],
      default: "electiva",
      required: true,
    },
    solicitanteEspecialidad: { type: String, trim: true, default: "" },
    diagnosticoPresuntivo:   { type: String, trim: true, default: "" },
    motivoConsulta:          { type: String, required: true, trim: true },
    preguntaClinica:         { type: String, trim: true, default: "" },
    informacionRelevante:    { type: String, trim: true, default: "" },
    estado: {
      type: String,
      enum: ["PENDIENTE", "RESPONDIDA", "CITADA", "ATENDIDA", "CANCELADA"],
      default: "PENDIENTE",
      required: true,
    },
    motivoCancelacion:   { type: String, trim: true, default: "" },
    respuesta:           { type: String, trim: true, default: "" },
    respondidoPorId:     { type: Schema.Types.ObjectId, ref: "Doctor" },
    respondidoPorNombre: { type: String, trim: true, default: "" },
    respondidoPorCMP:    { type: String, trim: true, default: "" },
    fechaRespuesta:      { type: Date },
    citaGeneradaId:      { type: Schema.Types.ObjectId, ref: "Cita" },
  },
  { timestamps: true }
);

interconsultaSchema.index({ especialidadSolicitada: 1, estado: 1 });
interconsultaSchema.index({ solicitanteId: 1 });
interconsultaSchema.index({ destinatarioId: 1 });

export const Interconsulta = mongoose.model<IInterconsulta>("Interconsulta", interconsultaSchema);
