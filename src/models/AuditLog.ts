import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  usuarioId: mongoose.Schema.Types.ObjectId,
  accion: String,
  entidad: String,
  entidadId: mongoose.Schema.Types.ObjectId,
  detalles: Object,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now }
});

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);