import mongoose, { Schema, Document } from "mongoose";

export type ChatTipo = "ADMIN_STAFF" | "ADMIN_PACIENTE";

export interface IMensajeChat extends Document {
  sala: string;               // roomId único: "staff-{userId}" | "paciente-{pacienteId}"
  tipo: ChatTipo;
  autorId: string;            // userId del emisor
  autorNombre: string;
  autorRol: string;
  texto: string;
  leido: boolean;
  creadoEn: Date;
}

const mensajeChatSchema = new Schema<IMensajeChat>({
  sala:        { type: String, required: true, index: true },
  tipo:        { type: String, enum: ["ADMIN_STAFF", "ADMIN_PACIENTE"], required: true },
  autorId:     { type: String, required: true },
  autorNombre: { type: String, required: true },
  autorRol:    { type: String, required: true },
  texto:       { type: String, required: true, trim: true, maxlength: 1000 },
  leido:       { type: Boolean, default: false },
  creadoEn:    { type: Date,   default: Date.now },
});

mensajeChatSchema.index({ sala: 1, creadoEn: 1 });

export const MensajeChat = mongoose.model<IMensajeChat>("MensajeChat", mensajeChatSchema);
