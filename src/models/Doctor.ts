import mongoose, { Schema, Document } from "mongoose";

export interface IDoctor extends Document {
  _id: mongoose.Types.ObjectId;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  especialidadId: mongoose.Types.ObjectId;
  cmp?: string;
  avatar?: string;
}

const doctorSchema = new Schema<IDoctor>(
  {
    nombres:        { type: String, required: true, trim: true, maxlength: 80 },
    apellidos:      { type: String, required: true, trim: true, maxlength: 80 },
    correo:         {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Correo inválido"],
    },
    telefono: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: [/^\d{6,15}$/, "Teléfono inválido"],
    },
    especialidadId: { type: Schema.Types.ObjectId, ref: "Especialidad", required: true },
    cmp: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: (v: string) => !v || /^\d{4,8}$/.test(v),
        message: "CMP debe contener 4 a 8 dígitos",
      },
    },
    avatar: { type: String, default: null },
  },
  { timestamps: true, collection: "doctores" }
);

doctorSchema.index({ especialidadId: 1 });
doctorSchema.index({ apellidos: 1, nombres: 1 });

export const Doctor = mongoose.model<IDoctor>("Doctor", doctorSchema);