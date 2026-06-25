import mongoose, { Schema, Document } from "mongoose";

export type TicketEstado = "ABIERTO" | "EN_REVISION" | "RESUELTO" | "CERRADO";
export type TicketPrioridad = "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
export type TicketCategoria =
  | "ERROR_SISTEMA"
  | "ACCESO_USUARIO"
  | "PROBLEMA_CITAS"
  | "PROBLEMA_HISTORIAL"
  | "LENTITUD"
  | "DATOS_INCORRECTOS"
  | "OTRO";

export interface IComentario {
  autorId: string;
  autorNombre: string;
  autorRol: string;
  texto: string;
  creadoEn: Date;
}

export interface ITicket extends Document {
  numero: number;
  titulo: string;
  descripcion: string;
  categoria: TicketCategoria;
  prioridad: TicketPrioridad;
  estado: TicketEstado;
  creadoPorId: string;
  creadoPorNombre: string;
  asignadoAId?: string;
  asignadoANombre?: string;
  comentarios: IComentario[];
  resolucion?: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

const comentarioSchema = new Schema<IComentario>(
  {
    autorId:      { type: String, required: true },
    autorNombre:  { type: String, required: true },
    autorRol:     { type: String, required: true },
    texto:        { type: String, required: true, trim: true, maxlength: 2000 },
    creadoEn:     { type: Date, default: Date.now },
  },
  { _id: true }
);

const ticketSchema = new Schema<ITicket>(
  {
    numero:           { type: Number, unique: true },
    titulo:           { type: String, required: true, trim: true, maxlength: 200 },
    descripcion:      { type: String, required: true, trim: true, maxlength: 3000 },
    categoria:        {
      type: String,
      enum: ["ERROR_SISTEMA","ACCESO_USUARIO","PROBLEMA_CITAS","PROBLEMA_HISTORIAL","LENTITUD","DATOS_INCORRECTOS","OTRO"],
      required: true,
    },
    prioridad:        { type: String, enum: ["BAJA","MEDIA","ALTA","CRITICA"], default: "MEDIA" },
    estado:           { type: String, enum: ["ABIERTO","EN_REVISION","RESUELTO","CERRADO"], default: "ABIERTO" },
    creadoPorId:      { type: String, required: true },
    creadoPorNombre:  { type: String, required: true },
    asignadoAId:      { type: String },
    asignadoANombre:  { type: String },
    comentarios:      { type: [comentarioSchema], default: [] },
    resolucion:       { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: "creadoEn", updatedAt: "actualizadoEn" } }
);

// Auto-incremento del número de ticket
ticketSchema.pre("save", async function (next) {
  if (this.isNew) {
    const ultimo = await mongoose.model("Ticket").findOne().sort({ numero: -1 }).select("numero");
    this.numero = (ultimo?.numero ?? 0) + 1;
  }
  next();
});

ticketSchema.index({ estado: 1, creadoEn: -1 });
ticketSchema.index({ creadoPorId: 1 });

export const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
