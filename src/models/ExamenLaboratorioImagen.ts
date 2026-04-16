import mongoose, { Schema, Document } from "mongoose";

export type TipoExamen =
  | "HEMATOLOGIA"
  | "BIOQUIMICA"
  | "ORINA"
  | "HECES"
  | "MICROBIOLOGIA"
  | "INMUNOLOGIA"
  | "HORMONAS"
  | "RADIOGRAFIA"
  | "ECOGRAFIA"
  | "TOMOGRAFIA"
  | "RESONANCIA"
  | "ELECTROCARDIOGRAMA"
  | "OTRO";

export type TipoPregunta = "BOOLEAN" | "TEXTO" | "SELECCION";

export interface IPreguntaProtocolar {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  obligatoria: boolean;
  opciones?: string[];   // Solo para tipo SELECCION
}

export interface IExamenLaboratorioImagen extends Document {
  _id: mongoose.Types.ObjectId;
  nombre: string;
  tipo: TipoExamen;
  descripcion?: string;
  instrucciones: string;
  preguntasProtocolares: IPreguntaProtocolar[];
  validezDias: number;
  activo: boolean;
}

const preguntaProtocolarSchema = new Schema<IPreguntaProtocolar>(
  {
    id:          { type: String, required: true },
    texto:       { type: String, required: true, trim: true },
    tipo:        { type: String, enum: ["BOOLEAN", "TEXTO", "SELECCION"], required: true },
    obligatoria: { type: Boolean, default: true },
    opciones:    [{ type: String, trim: true }],
  },
  { _id: false }
);

const examenLaboratorioImagenSchema = new Schema<IExamenLaboratorioImagen>(
  {
    nombre: { type: String, required: true, trim: true },
    tipo: {
      type: String,
      enum: [
        "HEMATOLOGIA", "BIOQUIMICA", "ORINA", "HECES",
        "MICROBIOLOGIA", "INMUNOLOGIA", "HORMONAS",
        "RADIOGRAFIA", "ECOGRAFIA", "TOMOGRAFIA",
        "RESONANCIA", "ELECTROCARDIOGRAMA", "OTRO",
      ],
      required: true,
    },
    descripcion:            { type: String, trim: true, default: "" },
    instrucciones:          { type: String, trim: true, default: "" },
    preguntasProtocolares:  { type: [preguntaProtocolarSchema], default: [] },
    validezDias:            { type: Number, default: 7, min: 1 },
    activo:                 { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ExamenLaboratorioImagen = mongoose.model<IExamenLaboratorioImagen>(
  "ExamenLaboratorioImagen",
  examenLaboratorioImagenSchema
);
