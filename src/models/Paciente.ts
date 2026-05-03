import mongoose, { Schema, Document } from "mongoose";

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
    nombres:    { type: String, required: true, trim: true },
    apellidos:  { type: String, required: true, trim: true },
    dni:        { type: String, required: true, unique: true, trim: true },
    telefono: { type: String, trim: true, unique: true, sparse: true },
    correo:   { type: String, trim: true, lowercase: true, unique: true, sparse: true },
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
    alergias: [{
      sustancia: { type: String, trim: true, required: true },
      reaccion:  { type: String, trim: true, default: "" },
      severidad: { type: String, enum: ["leve", "moderada", "severa"], default: "leve" },
    }],
    medicamentosHabituales: [{
      nombre:    { type: String, trim: true, required: true },
      dosis:     { type: String, trim: true, default: "" },
      frecuencia:{ type: String, trim: true, default: "" },
      activo:    { type: Boolean, default: true },
    }],
    problemasMedicos: [{
      descripcion: { type: String, trim: true, required: true },
      estado:      { type: String, enum: ["activo", "resuelto"], default: "activo" },
      fechaInicio: { type: Date },
    }],
    cirugiasPrevias: [{
      procedimiento: { type: String, trim: true, required: true },
      fecha:         { type: Date },
      hospital:      { type: String, trim: true, default: "" },
    }],
    antecedentesFamiliares: [{
      parentesco: { type: String, trim: true, required: true },
      condicion:  { type: String, trim: true, required: true },
    }],
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual edad
pacienteSchema.virtual("edad").get(function () {
  if (!this.fechaNacimiento) return null;
  const hoy = new Date();
  const nac = new Date(this.fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
  ) edad--;
  return edad;
});

export const Paciente = mongoose.model<IPaciente>("Paciente", pacienteSchema);