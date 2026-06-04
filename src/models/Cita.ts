import mongoose, { Schema, Document } from "mongoose";

export type TipoCita = "CONSULTA" | "LABORATORIO" | "REMOTA" | "DOMICILIO" | "INTERCONSULTA";

export interface ICita extends Document {
  pacienteId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId | null;
  fecha: Date;
  hora?: string;
  tipo: TipoCita;
  // VENCIDA se eliminó como estado: las citas que expiran (por tiempo o manual)
  // terminan en CANCELADA, con el motivo registrado en `motivoCancelacion`.
  estado: "PENDIENTE" | "ASISTIO" | "ATENDIDA" | "CANCELADA" | "REPROGRAMADA";

  // Vínculo cuando la cita nace como respuesta presencial a una interconsulta
  interconsultaId?: mongoose.Types.ObjectId;

  altaMedicaUrl?:      string;
  altaMedicaPublicId?: string;

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

  // Grupo "Otros diagnósticos" — NTS-022, Formato de Consulta Externa
  otrosDiagnosticos?: {
    riesgo?: string;
    nutricional?: string;
    saludMental?: string;
    causaExterna?: string;
    estadoFuncional?: string;
  };

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

  // Medicamentos prescritos — alineado a la Receta Única Estandarizada (DIGEMID,
  // NTS 057-MINSA/DIGEMID y DS 014-2011-SA). El DCI (Denominación Común
  // Internacional / principio activo) es obligatorio en la prescripción peruana.
  medicamentosPrescritos?: {
    medicamentoId?: mongoose.Types.ObjectId;
    nombre: string;              // Nombre del medicamento (marca o genérico)
    dci?: string;                // Denominación Común Internacional (principio activo)
    concentracion?: string;      // p. ej. "850 mg", "500 mg/5 mL"
    formaFarmaceutica?: string;  // Tableta, cápsula, jarabe, inyectable…
    viaAdministracion?: string;  // Oral, intramuscular, tópica…
    dosis?: string;              // Cantidad por toma
    frecuencia?: string;         // Cada 8 h, 2 veces/día…
    duracion?: string;           // 7 días, 30 días, indefinido…
    cantidad?: string;           // Cantidad total a dispensar en farmacia
    observaciones?: string;      // Indicaciones al paciente
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
      enum: ["CONSULTA", "LABORATORIO", "REMOTA", "DOMICILIO", "INTERCONSULTA"],
      default: "CONSULTA",
      required: true,
    },

    interconsultaId: {
      type: Schema.Types.ObjectId,
      ref: "Interconsulta",
      required: false,
    },

    estado: {
      type: String,
      enum: ["PENDIENTE", "ASISTIO", "ATENDIDA", "CANCELADA", "REPROGRAMADA"],
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

    altaMedicaUrl:      { type: String, trim: true },
    altaMedicaPublicId: { type: String, trim: true },

    // Diagnósticos CIE-10 estructurados
    diagnosticos: [{
      codigo:      { type: String, required: true },
      descripcion: { type: String, required: true },
      tipo:        { type: String, enum: ["presuntivo", "confirmado"], default: "presuntivo" },
      esPrincipal: { type: Boolean, default: false },
    }],

    // Grupo "Otros diagnósticos" (NTS-022, Formato de Consulta Externa)
    otrosDiagnosticos: {
      riesgo:          { type: String, default: "" },
      nutricional:     { type: String, default: "" },
      saludMental:     { type: String, default: "" },
      causaExterna:    { type: String, default: "" },
      estadoFuncional: { type: String, default: "" },
    },

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

    // Medicamentos prescritos (Receta Única Estandarizada — DIGEMID / NTS 057)
    medicamentosPrescritos: [{
      medicamentoId:     { type: Schema.Types.ObjectId, ref: "Medicamento" },
      nombre:            { type: String, required: true },
      dci:               { type: String, default: "" },
      concentracion:     { type: String, default: "" },
      formaFarmaceutica: { type: String, default: "" },
      viaAdministracion: { type: String, default: "" },
      dosis:             { type: String, default: "" },
      frecuencia:        { type: String, default: "" },
      duracion:          { type: String, default: "" },
      cantidad:          { type: String, default: "" },
      observaciones:     { type: String, default: "" },
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

// Unicidad por doctor+fecha+hora — solo cuando hora está definida (string).
// Las citas urgentes sin hora fija (hora=null) pueden coexistir múltiples en el mismo día.
citaSchema.index(
  { doctorId: 1, fecha: 1, hora: 1 },
  { unique: true, partialFilterExpression: { doctorId: { $type: "objectId" }, hora: { $type: "string" } } }
);

// Índice para reportes de morbilidad por código CIE-10 (NTS-139)
citaSchema.index({ "diagnosticos.codigo": 1 });

// Performance: historiales y agenda diaria.
citaSchema.index({ pacienteId: 1, fecha: -1 });
citaSchema.index({ fecha: 1 });
citaSchema.index({ estado: 1, fecha: 1 });
citaSchema.index({ interconsultaId: 1 });

// Estados que mantienen un horario OCUPADO. Una cita en cualquier otro
// estado (CANCELADA, REPROGRAMADA, ATENDIDA) libera el slot.
export const ESTADOS_OCUPAN_SLOT = ["PENDIENTE", "ASISTIO"];

export const Cita = mongoose.model<ICita>("Cita", citaSchema);
