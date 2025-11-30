import mongoose, { Schema, Document } from "mongoose";
import { IDoctor } from "./Doctor"; // Importa la interfaz del doctor

export interface IHorario extends Document {
  doctorId: mongoose.Types.ObjectId;
  fecha: Date;
  hora: string; // O tipo Date dependiendo de cómo manejes las horas
  reservado: boolean;
}

const horarioSchema = new Schema<IHorario>({
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  fecha: {
    type: Date,
    required: true,
  },
  hora: {
    type: String, // O Date si prefieres usar Date
    required: true,
  },
  reservado: {
    type: Boolean,
    default: false,
  },
});

export const Horario = mongoose.model<IHorario>("Horario", horarioSchema);
