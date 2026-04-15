import mongoose, { Schema, Document } from "mongoose";

export interface IMedicamento extends Document {
  nombre: string;
  principioActivo: string;
  presentacion: string;
  activo: boolean;
}

const medicamentoSchema = new Schema<IMedicamento>(
  {
    nombre:          { type: String, required: true },
    principioActivo: { type: String, required: true },
    presentacion:    { type: String, required: true },
    activo:          { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Medicamento = mongoose.model<IMedicamento>("Medicamento", medicamentoSchema);
