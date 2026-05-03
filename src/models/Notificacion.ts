import mongoose, { Schema, Document, Model } from "mongoose";

export type TipoNotificacion = "CITA" | "EXAMEN" | "RECETA" | "SISTEMA";
export type FiltroNotificaciones = "TODAS" | "LEIDAS" | "NO_LEIDAS";

export interface INotificacion extends Document {
  pacienteId: mongoose.Types.ObjectId;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
  leida: boolean;
  fechaCreacion: Date;
  fechaLectura?: Date | null;
  link?: string;
  eliminada: boolean;

  marcarComoLeida(): Promise<INotificacion>;
}

export interface PaginadoNotificaciones {
  data: INotificacion[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export interface INotificacionModel extends Model<INotificacion> {
  crearNotificacion(
    pacienteId: mongoose.Types.ObjectId | string,
    titulo: string,
    mensaje: string,
    tipo: TipoNotificacion,
    link?: string
  ): Promise<INotificacion>;

  obtenerPorPaciente(
    pacienteId: mongoose.Types.ObjectId | string,
    filtro?: FiltroNotificaciones,
    pagina?: number,
    porPagina?: number
  ): Promise<PaginadoNotificaciones>;
}

const notificacionSchema = new Schema<INotificacion, INotificacionModel>(
  {
    pacienteId: {
      type: Schema.Types.ObjectId,
      ref: "Paciente",
      required: true,
    },
    titulo:  { type: String, required: true, trim: true, maxlength: 100 },
    mensaje: { type: String, required: true, trim: true, maxlength: 500 },
    tipo: {
      type: String,
      enum: ["CITA", "EXAMEN", "RECETA", "SISTEMA"],
      required: true,
      default: "SISTEMA",
    },
    leida:         { type: Boolean, default: false },
    fechaCreacion: { type: Date, default: Date.now },
    fechaLectura:  { type: Date, default: null },
    link:          { type: String, trim: true, default: "" },
    eliminada:     { type: Boolean, default: false },
  },
  { timestamps: false }
);

// Búsquedas más comunes: notificaciones del paciente filtradas por estado leída
notificacionSchema.index({ pacienteId: 1, leida: 1 });
// Ordenamiento por fecha (más recientes primero)
notificacionSchema.index({ fechaCreacion: -1 });

// ── Métodos de instancia ─────────────────────────────────────
notificacionSchema.methods.marcarComoLeida = async function () {
  if (!this.leida) {
    this.leida = true;
    this.fechaLectura = new Date();
    await this.save();
  }
  return this;
};

// ── Métodos estáticos ────────────────────────────────────────
notificacionSchema.statics.crearNotificacion = async function (
  pacienteId,
  titulo,
  mensaje,
  tipo,
  link
) {
  return this.create({
    pacienteId,
    titulo,
    mensaje,
    tipo,
    link: link ?? "",
  });
};

notificacionSchema.statics.obtenerPorPaciente = async function (
  pacienteId,
  filtro = "TODAS",
  pagina = 1,
  porPagina = 20
) {
  const paginaSafe    = Math.max(pagina | 0, 1);
  const porPaginaSafe = Math.min(Math.max(porPagina | 0, 1), 50);

  const query: any = { pacienteId, eliminada: false };
  if (filtro === "LEIDAS")    query.leida = true;
  if (filtro === "NO_LEIDAS") query.leida = false;

  const [data, total] = await Promise.all([
    this.find(query)
      .sort({ fechaCreacion: -1 })
      .skip((paginaSafe - 1) * porPaginaSafe)
      .limit(porPaginaSafe),
    this.countDocuments(query),
  ]);

  return {
    data,
    total,
    pagina: paginaSafe,
    porPagina: porPaginaSafe,
    totalPaginas: Math.ceil(total / porPaginaSafe),
  };
};

export const Notificacion = mongoose.model<INotificacion, INotificacionModel>(
  "Notificacion",
  notificacionSchema
);
