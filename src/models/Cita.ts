import mongoose, { Schema, Document } from "mongoose";

export type TipoCita = "CONSULTA" | "LABORATORIO" | "REMOTA" | "DOMICILIO";

export interface ICita extends Document {
  pacienteId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId | null;
  fecha: Date;
  hora?: string;
  tipo: TipoCita;
  estado: "PENDIENTE" | "ASISTIO" | "ATENDIDA" | "CANCELADA" | "REPROGRAMADA" | "VENCIDA";

  // Exclusivos de citas LABORATORIO
  fechaVigenciaHasta?: Date;   // Hasta cuándo es válida la cita de laboratorio
  instrucciones?: string;      // Indicaciones compiladas para el paciente

  // Campos clínicos (llena el médico)
  notasClinicas?: string;      // Observaciones clínicas libres
  diagnostico?: string;        // Diagnóstico principal en texto (para visualización rápida)
  tratamiento?: string;        // Plan de tratamiento

  // Diagnósticos CIE-10 estructurados — consultables y auditables (NTS-022, NTS-139)
  diagnosticos?: {
    codigo: string;            // Código CIE-10 oficial (ej. "E11.9")
    descripcion: string;       // Descripción oficial del código
    tipo: "presuntivo" | "confirmado";
    esPrincipal: boolean;      // true = diagnóstico principal de la consulta
  }[];

  // Firma electrónica del médico responsable — se estampa al finalizar (NTS-022 Art. 8)
  firma?: {
    medicoId: mongoose.Types.ObjectId;
    medicoNombre: string;      // Nombre completo del médico al momento de firmar
    numeroCMP: string;         // N° de colegiatura del Colegio Médico del Perú
    fechaHoraFirma: Date;
  };

  // Datos de la sección de especialidad (NTS-022) — fuera del blob JSON.
  // Los campos son flexibles por especialidad; se irán tipando especialidad
  // por especialidad a medida que cada una se valide contra su fuente clínica.
  especialidad?: {
    nombre: string;                    // Especialidad del formulario usado
    campos: Record<string, string>;    // Pares campo→valor de la sección E
  };

  // Campos de flujo
  horarioAsistencia?: Date;    // Timestamp de confirmación de asistencia
  motivoCancelacion?: string;  // Por qué se canceló

  // Medicamentos prescritos
  medicamentosPrescritos?: {
    medicamentoId: mongoose.Types.ObjectId;
    nombre: string;
    dosis: string;
    frecuencia: string;
    duracion: string;
    observaciones?: string;
  }[];

  // Preparado para pagos (NO obligatorio por ahora)
  pago?: {
    metodo: "TARJETA" | "EFECTIVO" | "TRANSFERENCIA";
    monto: number;
    referencia?: string;
    fechaPago: Date;
  };
}

const citaSchema = new Schema<ICita>(
  {
    pacienteId: {
      type: Schema.Types.ObjectId,
      ref: "Paciente",
      required: true,
    },

    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: false,
      default: null,
    },

    fecha: {
      type: Date,
      required: true,
    },

    hora: {
      type: String,
      required: false,
      default: null,
    },

    tipo: {
      type: String,
      enum: ["CONSULTA", "LABORATORIO", "REMOTA", "DOMICILIO"],
      default: "CONSULTA",
      required: true,
    },

    estado: {
      type: String,
      enum: ["PENDIENTE","ASISTIO", "ATENDIDA", "CANCELADA", "REPROGRAMADA", "VENCIDA"],
      default: "PENDIENTE",
      required: true,
    },

    fechaVigenciaHasta: {
      type: Date,
      required: false,
    },

    instrucciones: {
      type: String,
      required: false,
      default: "",
    },

    // Campos clínicos
    notasClinicas:     { type: String, default: "" },
    diagnostico:       { type: String, default: "" },
    tratamiento:       { type: String, default: "" },

    // Diagnósticos CIE-10 estructurados
    diagnosticos: [{
      codigo:      { type: String, required: true },
      descripcion: { type: String, required: true },
      tipo:        { type: String, enum: ["presuntivo", "confirmado"], default: "presuntivo" },
      esPrincipal: { type: Boolean, default: false },
    }],

    // Firma electrónica del médico (NTS-022 Art. 8)
    firma: {
      medicoId:       { type: Schema.Types.ObjectId, ref: "Doctor" },
      medicoNombre:   { type: String },
      numeroCMP:      { type: String },
      fechaHoraFirma: { type: Date },
    },

    // Datos de la sección de especialidad (NTS-022)
    especialidad: {
      nombre: { type: String },
      campos: { type: Schema.Types.Mixed, default: {} },
    },

    horarioAsistencia: { type: Date, required: false },
    motivoCancelacion: { type: String, required: false },

    // Medicamentos prescritos
    medicamentosPrescritos: [{
      medicamentoId: { type: Schema.Types.ObjectId, ref: "Medicamento" },
      nombre:        { type: String, required: true },
      dosis:         { type: String, required: true },
      frecuencia:    { type: String, required: true },
      duracion:      { type: String, required: true },
      observaciones: { type: String, default: "" },
    }],

    pago: {
      metodo: {
        type: String,
        enum: ["TARJETA", "EFECTIVO", "TRANSFERENCIA"],
      },
      monto:     { type: Number, min: 0 },
      referencia: { type: String },
      fechaPago:  { type: Date },
    },
  },
  { timestamps: true }
);

// Unicidad para citas de CONSULTA / REMOTA / DOMICILIO (con doctor asignado)
citaSchema.index(
  { doctorId: 1, fecha: 1, hora: 1 },
  { unique: true, partialFilterExpression: { doctorId: { $type: "objectId" } } }
);

// Índice para reportes de morbilidad por código CIE-10 (NTS-139)
citaSchema.index({ "diagnosticos.codigo": 1 });

export const Cita = mongoose.model<ICita>("Cita", citaSchema);
