import mongoose, { Schema, Document } from "mongoose";

export type TipoReclamacion = "QUEJA" | "RECLAMO";
export type EstadoReclamacion = "PENDIENTE" | "EN_REVISION" | "RESUELTO";

export interface ITerceroReclamacion {
  tipoDoc: "DNI" | "CE" | "PASAPORTE" | "RUC";
  nroDoc: string;
  nombre: string;
  email?: string;
  domicilio?: string;
  telefono?: string;
}

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
  // Identificación del usuario afectado
  tipoDocIdentificado?: string;
  nroDocIdentificado?: string;
  nombreIdentificado?: string;
  emailIdentificado?: string;
  domicilioIdentificado?: string;
  telefonoIdentificado?: string;
  // Quien presenta (tercero)
  presentadoPorTercero?: boolean;
  tercero?: ITerceroReclamacion;
  // Detalle
  area?: string;
  servicio?: string;
  autorizaNotificacion?: boolean;
}

const terceroSchema = new Schema<ITerceroReclamacion>({
  tipoDoc:   { type: String, enum: ["DNI", "CE", "PASAPORTE", "RUC"] },
  nroDoc:    { type: String, trim: true },
  nombre:    { type: String, trim: true },
  email:     { type: String, trim: true },
  domicilio: { type: String, trim: true },
  telefono:  { type: String, trim: true },
}, { _id: false });

const reclamacionSchema = new Schema<IReclamacion>(
  {
    codigo:     { type: String, required: true, unique: true },
    pacienteId: { type: Schema.Types.ObjectId, ref: "Paciente", required: true },
    tipo:       { type: String, enum: ["QUEJA", "RECLAMO"], required: true },
    descripcion: { type: String, required: true },
    fecha:      { type: Date, default: Date.now },
    estado:     { type: String, enum: ["PENDIENTE", "EN_REVISION", "RESUELTO"], default: "PENDIENTE", required: true },
    respuestaAdmin:  { type: String, trim: true, default: undefined },
    fechaResolucion: { type: Date, default: undefined },
    // Identificación del usuario afectado
    tipoDocIdentificado:  { type: String, trim: true },
    nroDocIdentificado:   { type: String, trim: true },
    nombreIdentificado:   { type: String, trim: true },
    emailIdentificado:    { type: String, trim: true },
    domicilioIdentificado:{ type: String, trim: true },
    telefonoIdentificado: { type: String, trim: true },
    // Tercero
    presentadoPorTercero: { type: Boolean, default: false },
    tercero:              { type: terceroSchema, default: undefined },
    // Detalle
    area:                 { type: String, trim: true },
    servicio:             { type: String, trim: true },
    autorizaNotificacion: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "reclamaciones" }
);

export const Reclamacion = mongoose.model<IReclamacion>("Reclamacion", reclamacionSchema);
