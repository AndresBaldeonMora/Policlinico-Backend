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
  citaId?: mongoose.Types.ObjectId;          // Cita de origen (consulta donde se solicitó)
  solicitanteId: mongoose.Types.ObjectId;     // Médico que solicita
  solicitanteNombre: string;                  // Nombre del solicitante al momento de crear
  especialidadSolicitada: string;             // Especialidad destino (texto)
  medicoSolicitado?: string;                  // Nombre libre del médico sugerido (opcional)
  destinatarioId?: mongoose.Types.ObjectId;   // Médico destinatario concreto (opcional)
  prioridad: PrioridadInterconsulta;
  motivoConsulta: string;
  preguntaClinica?: string;
  informacionRelevante?: string;
  estado: EstadoInterconsulta;
  // Respuesta del especialista
  respuesta?: string;
  respondidoPorId?: mongoose.Types.ObjectId;
  respondidoPorNombre?: string;
  fechaRespuesta?: Date;
  // Cita presencial generada como respuesta (estado CITADA)
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
    motivoConsulta:       { type: String, required: true, trim: true },
    preguntaClinica:      { type: String, trim: true, default: "" },
    informacionRelevante: { type: String, trim: true, default: "" },
    estado: {
      type: String,
      enum: ["PENDIENTE", "RESPONDIDA", "CITADA", "ATENDIDA", "CANCELADA"],
      default: "PENDIENTE",
      required: true,
    },
    respuesta:           { type: String, trim: true, default: "" },
    respondidoPorId:     { type: Schema.Types.ObjectId, ref: "Doctor" },
    respondidoPorNombre: { type: String, trim: true, default: "" },
    fechaRespuesta:      { type: Date },
    citaGeneradaId:      { type: Schema.Types.ObjectId, ref: "Cita" },
  },
  { timestamps: true }
);

interconsultaSchema.index({ especialidadSolicitada: 1, estado: 1 });
interconsultaSchema.index({ solicitanteId: 1 });
interconsultaSchema.index({ destinatarioId: 1 });

export const Interconsulta = mongoose.model<IInterconsulta>("Interconsulta", interconsultaSchema);
