import mongoose, { Schema, Document } from "mongoose";

export type TipoReclamacion = "QUEJA" | "RECLAMO";
export type EstadoReclamacion = "PENDIENTE" | "EN_REVISION" | "RESUELTO";

export interface IReclamacion extends Document {
  codigo: string;
  pacienteId: mongoose.Types.ObjectId;
  tipo: TipoReclamacion;
  descripcion: string;
  fecha: Date;
  estado: EstadoReclamacion;
  respuestaAdmin?: string;
  fechaResolucion?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reclamacionSchema = new Schema<IReclamacion>(
  {
    codigo: { type: String, required: true, unique: true },
    pacienteId: {
      type: Schema.Types.ObjectId,
      ref: "Paciente",
      required: true,
    },
    tipo: {
      type: String,
      enum: ["QUEJA", "RECLAMO"],
      required: true,
    },
    descripcion: {
      type: String,
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    estado: {
      type: String,
      enum: ["PENDIENTE", "EN_REVISION", "RESUELTO"],
      default: "PENDIENTE",
      required: true,
    },
    respuestaAdmin: { type: String, trim: true, default: undefined }, 
    fechaResolucion: { type: Date, default: undefined }, 
  },
  { timestamps: true }
);

export const Reclamacion = mongoose.model<IReclamacion>("Reclamacion", reclamacionSchema);
