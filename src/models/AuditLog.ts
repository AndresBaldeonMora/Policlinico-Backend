import mongoose, { Schema, Document } from "mongoose";

export type EntidadAudit =
  | "Cita"
  | "OrdenExamen"
  | "Paciente"
  | "Doctor"
  | "BloqueoHorario"
  | "ServicioDomicilio"
  | "CitaRemota";

export interface IAuditLog extends Document {
  usuarioId: mongoose.Types.ObjectId;
  usuarioNombre?: string;
  accion: string;
  entidad: EntidadAudit;
  entidadId: mongoose.Types.ObjectId;
  estadoAnterior?: string;
  estadoNuevo?: string;
  descripcion?: string;
  detalles?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  usuarioId: { type: Schema.Types.ObjectId, required: true },
  usuarioNombre: { type: String, trim: true },
  accion: { type: String, required: true, trim: true },
  entidad: {
    type: String,
    enum: ["Cita", "OrdenExamen", "Paciente", "Doctor", "BloqueoHorario", "ServicioDomicilio", "CitaRemota"],
    required: true,
  },
  entidadId: { type: Schema.Types.ObjectId, required: true },
  estadoAnterior: { type: String, trim: true },
  estadoNuevo: { type: String, trim: true },
  descripcion: { type: String, trim: true },
  detalles: { type: Schema.Types.Mixed },
  ipAddress: { type: String, trim: true },
  timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ entidad: 1, entidadId: 1 });
auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
