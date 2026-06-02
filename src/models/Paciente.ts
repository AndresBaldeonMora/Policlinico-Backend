import mongoose, { Schema, Document } from "mongoose";
import { hoyPeruUTC } from "../utils/fecha.utils";

export interface IAlergia {
  sustancia: string;
  reaccion: string;
  severidad: "leve" | "moderada" | "severa";
}

export interface IMedicamentoHabitual {
  nombre: string;
  dosis: string;
  frecuencia: string;
  activo: boolean;
  fechaSuspension?: Date;
  motivoSuspension?: string;
}

export interface IProblemaMedico {
  descripcion: string;
  estado: "activo" | "resuelto";
  fechaInicio?: Date;
}

export interface ICirugiaPevia {
  procedimiento: string;
  fecha?: Date;
  hospital?: string;
}

export interface IAntecedenteFamiliar {
  parentesco: string;
  condicion: string;
}

export interface IPaciente extends Document {
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  correo?: string;
  fechaNacimiento?: Date;
  sexo?: string;
  estadoCivil?: string;
  direccion?: string;
  distrito?: string;
  apoderadoNombre?: string;
  apoderadoParentesco?: string;
  apoderadoTelefono?: string;
  avatar?: string;
  alergias: IAlergia[];
  medicamentosHabituales: IMedicamentoHabitual[];
  problemasMedicos: IProblemaMedico[];
  cirugiasPrevias: ICirugiaPevia[];
  antecedentesFamiliares: IAntecedenteFamiliar[];
  edad?: number; // virtual
}

const pacienteSchema = new Schema<IPaciente>(
  {
    nombres:    { type: String, required: true, trim: true, maxlength: 80 },
    apellidos:  { type: String, required: true, trim: true, maxlength: 80 },
    dni:        {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\d{8}$/, "El DNI debe tener exactamente 8 dígitos"],
    },
    telefono: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^\d{6,15}$/, "El teléfono debe contener entre 6 y 15 dígitos"],
    },
    correo: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Correo inválido"],
    },
    fechaNacimiento: { type: Date },
    sexo:       { type: String, enum: ["M", "F", ""], default: "" },
    estadoCivil: {
      type: String,
      enum: ["SOLTERO", "CASADO", "CONVIVIENTE", "DIVORCIADO", "VIUDO", ""],
      default: "",
    },
    direccion:  { type: String, trim: true, default: "" },
    distrito:   { type: String, trim: true, default: "" },
    // Apoderado (solo menores de edad)
    apoderadoNombre:      { type: String, trim: true, default: "" },
    apoderadoParentesco:  { type: String, trim: true, default: "" },
    apoderadoTelefono:    { type: String, trim: true, default: "" },
    avatar:               { type: String, default: null },
    alergias: {
      type: [{
        sustancia: { type: String, trim: true, required: true, maxlength: 120 },
        reaccion:  { type: String, trim: true, default: "", maxlength: 240 },
        severidad: { type: String, enum: ["leve", "moderada", "severa"], default: "leve" },
      }],
      validate: { validator: (v: any[]) => v.length <= 100, message: "Máximo 100 alergias por paciente" },
      default: [],
    },
    medicamentosHabituales: {
      type: [{
        nombre:             { type: String, trim: true, required: true, maxlength: 120 },
        dosis:              { type: String, trim: true, default: "", maxlength: 60 },
        frecuencia:         { type: String, trim: true, default: "", maxlength: 60 },
        activo:             { type: Boolean, default: true },
        fechaSuspension:    { type: Date },
        motivoSuspension:   { type: String, trim: true, default: "", maxlength: 240 },
      }],
      validate: { validator: (v: any[]) => v.length <= 200, message: "Máximo 200 medicamentos por paciente" },
      default: [],
    },
    problemasMedicos: {
      type: [{
        descripcion: { type: String, trim: true, required: true, maxlength: 240 },
        estado:      { type: String, enum: ["activo", "resuelto"], default: "activo" },
        fechaInicio: { type: Date },
      }],
      validate: { validator: (v: any[]) => v.length <= 200, message: "Máximo 200 problemas médicos por paciente" },
      default: [],
    },
    cirugiasPrevias: {
      type: [{
        procedimiento: { type: String, trim: true, required: true, maxlength: 240 },
        fecha:         { type: Date },
        hospital:      { type: String, trim: true, default: "", maxlength: 120 },
      }],
      validate: { validator: (v: any[]) => v.length <= 100, message: "Máximo 100 cirugías por paciente" },
      default: [],
    },
    antecedentesFamiliares: {
      type: [{
        parentesco: { type: String, trim: true, required: true, maxlength: 60 },
        condicion:  { type: String, trim: true, required: true, maxlength: 240 },
      }],
      validate: { validator: (v: any[]) => v.length <= 200, message: "Máximo 200 antecedentes familiares" },
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual edad — comparación en UTC: fechaNacimiento se guarda como
// medianoche UTC y hoy se toma según el calendario peruano (también UTC).
pacienteSchema.virtual("edad").get(function () {
  if (!this.fechaNacimiento) return null;
  const hoy = hoyPeruUTC();
  const nac = new Date(this.fechaNacimiento);
  let edad = hoy.getUTCFullYear() - nac.getUTCFullYear();
  if (
    hoy.getUTCMonth() < nac.getUTCMonth() ||
    (hoy.getUTCMonth() === nac.getUTCMonth() && hoy.getUTCDate() < nac.getUTCDate())
  ) edad--;
  return edad;
});

export const Paciente = mongoose.model<IPaciente>("Paciente", pacienteSchema);