import { Request, Response } from "express";
import "multer";
import { ExamenLaboratorioImagen } from "../models/ExamenLaboratorioImagen";
import { AuditLog } from "../models/AuditLog";
import { OrdenExamen } from "../models/OrdenExamen";
import { Cita } from "../models/Cita";
import { Usuario } from "../models/Usuario";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { generarCodigoOrden } from "../utils/generarCodigoOrden";
import cloudinary from "../config/cloudinary";
import { enviarCorreoResultados } from "../config/mailer";
import { Paciente } from "../models/Paciente";

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────
const registrarAudit = async (
  usuarioId: string,
  accion: string,
  entidadId: string,
  detalles: Record<string, unknown>,
  ipAddress?: string,
  extra?: {
    estadoAnterior?: string;
    estadoNuevo?: string;
    usuarioNombre?: string;
    descripcion?: string;
  }
) => {
  try {
    await AuditLog.create({
      usuarioId,
      accion,
      entidad: "OrdenExamen",
      entidadId,
      detalles,
      ipAddress,
      ...extra,
    });
  } catch (error) {
    console.error("Error al registrar audit log:", error);
  }
};

// Capacidad máxima del laboratorio por día (toma de muestras, 7–11 a.m.)
export const CAPACIDAD_DIARIA_LAB = 15;

const TIPOS_IMAGEN = ["RADIOGRAFIA", "ECOGRAFIA", "TOMOGRAFIA", "RESONANCIA", "ELECTROCARDIOGRAMA"];
const TIPOS_LAB    = ["HEMATOLOGIA", "BIOQUIMICA", "ORINA", "HECES", "MICROBIOLOGIA", "INMUNOLOGIA", "HORMONAS"];

// Duraciones estimadas por defecto (minutos) según modalidad
const DURACION_DEFAULT: Record<string, number> = {
  RADIOGRAFIA:       15,
  ECOGRAFIA:         30,
  TOMOGRAFIA:        30,
  RESONANCIA:        60,
  ELECTROCARDIOGRAMA: 20,
};

function detectarTipoOrden(tiposExamenes: string[]): "LABORATORIO" | "IMAGEN" | "MIXTA" {
  const tieneImagen = tiposExamenes.some((t) => TIPOS_IMAGEN.includes(t));
  const tieneLab    = tiposExamenes.some((t) => TIPOS_LAB.includes(t) || t === "OTRO");
  if (tieneImagen && tieneLab) return "MIXTA";
  if (tieneImagen) return "IMAGEN";
  return "LABORATORIO";
}

// ─────────────────────────────────────────────────────────────
// CATÁLOGO DE EXÁMENES DE LABORATORIO
// ─────────────────────────────────────────────────────────────

export const listarExamenes = async (req: Request, res: Response) => {
  try {
    const { tipo, activo } = req.query;
    const filtro: any = {};
    if (tipo) filtro.tipo = tipo;
    if (activo !== undefined) filtro.activo = activo === "true";
    const examenes = await ExamenLaboratorioImagen.find(filtro).sort({ tipo: 1, nombre: 1 });
    res.json({ success: true, data: examenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerExamen = async (req: Request, res: Response) => {
  try {
    const examen = await ExamenLaboratorioImagen.findById(req.params.id);
    if (!examen)
      return res.status(404).json({ success: false, message: "Examen no encontrado" });
    res.json({ success: true, data: examen });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const crearExamen = async (req: Request, res: Response) => {
  try {
    const { nombre, tipo, descripcion, instrucciones, validezDias } = req.body;
    if (!nombre?.trim() || !tipo) {
      return res
        .status(400)
        .json({ success: false, message: "nombre y tipo son obligatorios" });
    }
    const examen = await ExamenLaboratorioImagen.create({
      nombre: nombre.trim(),
      tipo,
      descripcion,
      instrucciones,
      validezDias,
    });
    res.status(201).json({ success: true, data: examen });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const actualizarExamen = async (req: Request, res: Response) => {
  try {
    const examen = await ExamenLaboratorioImagen.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!examen)
      return res.status(404).json({ success: false, message: "Examen no encontrado" });
    res.json({ success: true, data: examen });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const eliminarExamen = async (req: Request, res: Response) => {
  try {
    const examen = await ExamenLaboratorioImagen.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    if (!examen)
      return res.status(404).json({ success: false, message: "Examen no encontrado" });
    res.json({ success: true, message: "Examen desactivado" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// ÓRDENES DE ANÁLISIS CLÍNICOS
// ─────────────────────────────────────────────────────────────

// ── Crear orden (emitida por el médico durante la consulta) ──
export const crearOrden = async (req: AuthRequest, res: Response) => {
  try {
    const { pacienteId, citaId, especialidadId, items, observacionesGenerales } =
      req.body;

    if (!pacienteId || !especialidadId || !items?.length) {
      return res.status(400).json({
        success: false,
        message: "pacienteId, especialidadId e items son obligatorios",
      });
    }

    let medicoId = req.user?.medicoId;
    if (!medicoId) {
      const usuario = await Usuario.findById(req.user?.userId);
      if (!usuario?.medicoId) {
        return res.status(403).json({
          success: false,
          message: "Tu usuario no está vinculado a un médico",
        });
      }
      medicoId = String(usuario.medicoId);
    }

    if (citaId) {
      const cita = await Cita.findById(citaId);
      if (!cita)
        return res
          .status(404)
          .json({ success: false, message: "La cita especificada no existe" });
      if (String(cita.doctorId) !== medicoId) {
        return res.status(403).json({
          success: false,
          message:
            "No tienes permiso para crear órdenes en esta cita. Solo el médico asignado puede hacerlo.",
        });
      }
    }

    const codigoOrden = await generarCodigoOrden();

    // Detectar tipo de orden y seccion por ítem según los exámenes solicitados
    const examenesIds = items.map((i: any) => i.examenId);
    const examenesData = await ExamenLaboratorioImagen.find({ _id: { $in: examenesIds } }).select("tipo");
    const examenMap = new Map(examenesData.map((e) => [String(e._id), e.tipo]));
    const tiposExamenes = examenesData.map((e) => e.tipo);
    const tipoOrden = detectarTipoOrden(tiposExamenes);

    const orden = await OrdenExamen.create({
      pacienteId,
      doctorId: medicoId,
      citaId: citaId || undefined,
      especialidadId,
      codigoOrden,
      tipoOrden,
      items: items.map((item: any) => {
        const tipo = examenMap.get(String(item.examenId)) ?? "";
        const seccion: "LAB" | "IMAGEN" = TIPOS_IMAGEN.includes(tipo) ? "IMAGEN" : "LAB";
        return {
          examenId: item.examenId,
          seccion,
          observaciones: item.observaciones || "",
          respuestasProtocolares: Array.isArray(item.respuestasProtocolares)
            ? item.respuestasProtocolares
            : [],
          estadoItem: "PENDIENTE",
        };
      }),
      observacionesGenerales: observacionesGenerales || "",
      estado: "PENDIENTE",
    });

    const ordenPoblada = await OrdenExamen.findById(orden._id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo preguntasProtocolares");

    res.status(201).json({ success: true, data: ordenPoblada });

    await registrarAudit(
      req.user?.userId ?? "desconocido",
      "crear_orden",
      String(orden._id),
      { pacienteId, citaId, especialidadId, items },
      req.ip as string | undefined
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Convierte "DD/MM/YYYY HH:mm" o ISO a Date. Lanza si es inválido.
function parseFecha(valor: string): Date {
  // Formato DD/MM/YYYY o DD/MM/YYYY HH:mm
  const matchDMY = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (matchDMY) {
    const [, d, m, y, hh = "00", mm = "00"] = matchDMY;
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:00.000Z`);
  }
  // Fallback ISO
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) throw new Error("Fecha inválida");
  return fecha;
}

// ── Autorizar orden (recepción) — PENDIENTE → EN_PROCESO ──
// Para LABORATORIO: body { fechaCitaLab: "DD/MM/YYYY" }
// Para IMAGEN:      body { citaImagenFecha: "DD/MM/YYYY HH:mm", salaEquipo: "Sala 1", duracionEstimadaMin: 30 }
export const autorizarOrden = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { fechaCitaLab, citaImagenFecha, salaEquipo, duracionEstimadaMin } = req.body;

    const orden = await OrdenExamen.findById(id);
    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });

    if (orden.estado !== "PENDIENTE") {
      return res.status(400).json({
        success: false,
        message: `Solo se pueden autorizar órdenes en estado PENDIENTE. Estado actual: ${orden.estado}`,
      });
    }

    const tipoOrden = orden.tipoOrden;
    const necesitaLab    = tipoOrden === "LABORATORIO" || tipoOrden === "MIXTA";
    const necesitaImagen = tipoOrden === "IMAGEN"      || tipoOrden === "MIXTA";

    // ── Validar campos requeridos según tipo ──
    if (necesitaLab && !fechaCitaLab) {
      return res.status(400).json({
        success: false,
        message: "Se requiere fechaCitaLab (DD/MM/YYYY) para los exámenes de laboratorio",
      });
    }
    if (necesitaImagen && !citaImagenFecha) {
      return res.status(400).json({
        success: false,
        message: "Se requiere citaImagenFecha (DD/MM/YYYY HH:mm) para los exámenes de imagenología",
      });
    }

    const ahora = new Date();

    // ── Procesar parte LAB ──
    if (necesitaLab) {
      let citaLabDate: Date;
      try {
        citaLabDate = parseFecha(fechaCitaLab);
      } catch {
        return res.status(400).json({ success: false, message: "fechaCitaLab inválida. Use DD/MM/YYYY" });
      }
      citaLabDate = new Date(`${citaLabDate.toISOString().slice(0, 10)}T00:00:00.000Z`);

      const startOfDay = citaLabDate;
      const endOfDay   = new Date(`${citaLabDate.toISOString().slice(0, 10)}T23:59:59.999Z`);
      const ocupados = await OrdenExamen.countDocuments({
        fechaCitaLab: { $gte: startOfDay, $lte: endOfDay },
        estado: { $in: ["EN_PROCESO", "ASISTIDO", "FINALIZADO"] },
      });
      if (ocupados >= CAPACIDAD_DIARIA_LAB) {
        const d = citaLabDate;
        const f = `${d.getUTCDate().toString().padStart(2,"0")}/${(d.getUTCMonth()+1).toString().padStart(2,"0")}/${d.getUTCFullYear()}`;
        return res.status(400).json({
          success: false,
          message: `No hay cupos de laboratorio para el ${f}. Capacidad máxima: ${CAPACIDAD_DIARIA_LAB} pacientes.`,
        });
      }

      orden.fechaCitaLab = citaLabDate;
    }

    // ── Procesar parte IMAGEN ──
    if (necesitaImagen) {
      let fechaImagen: Date;
      try {
        fechaImagen = parseFecha(citaImagenFecha);
      } catch {
        return res.status(400).json({ success: false, message: "citaImagenFecha inválida. Use DD/MM/YYYY HH:mm" });
      }

      const duracion = duracionEstimadaMin ?? 30;
      const fechaFin = new Date(fechaImagen.getTime() + duracion * 60_000);

      if (salaEquipo) {
        const conflicto = await OrdenExamen.findOne({
          tipoOrden: { $in: ["IMAGEN", "MIXTA"] },
          salaEquipo,
          estado: { $in: ["EN_PROCESO", "ASISTIDO", "FINALIZADO"] },
          citaImagenFecha: { $lt: fechaFin },
          $expr: {
            $gt: [
              { $add: ["$citaImagenFecha", { $multiply: [{ $ifNull: ["$duracionEstimadaMin", 30] }, 60_000] }] },
              fechaImagen,
            ],
          },
        });
        if (conflicto) {
          return res.status(400).json({
            success: false,
            message: `La sala/equipo "${salaEquipo}" ya tiene una cita programada en ese horario.`,
          });
        }
        orden.salaEquipo = salaEquipo;
      }

      orden.citaImagenFecha = fechaImagen;
      orden.duracionEstimadaMin = duracion;
    }

    // ── Vencimiento: el más largo entre los dos flujos ──
    const diasVencimiento = necesitaImagen ? 30 : 7;
    const fechaVencimiento = new Date(ahora);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + diasVencimiento);

    orden.estado = "EN_PROCESO";
    orden.fechaAutorizacion = ahora;
    orden.fechaVencimiento = fechaVencimiento;

    await orden.save();

    const ordenActualizada = await OrdenExamen.findById(id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo instrucciones preguntasProtocolares");

    res.json({ success: true, data: ordenActualizada });

    await registrarAudit(
      req.user?.userId ?? "desconocido",
      "autorizar_orden",
      id,
      { fechaAutorizacion: orden.fechaAutorizacion, fechaVencimiento: orden.fechaVencimiento },
      req.ip as string | undefined,
      { estadoAnterior: "PENDIENTE", estadoNuevo: "EN_PROCESO" }
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Registrar asistencia del paciente (recepción) — EN_PROCESO → ASISTIDO ──
// Body opcional: respuestasProtocolares: { itemIndex, respuestas: [{preguntaId, preguntaTexto, respuesta}] }[]
export const registrarAsistencia = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { respuestasProtocolares } = req.body as {
      respuestasProtocolares?: { itemIndex: number; respuestas: { preguntaId: string; preguntaTexto: string; respuesta: string }[] }[];
    };

    const orden = await OrdenExamen.findById(id);
    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });

    if (orden.estado !== "EN_PROCESO") {
      return res.status(400).json({
        success: false,
        message: `Solo se puede registrar asistencia en órdenes En Vigencia. Estado actual: ${orden.estado}`,
      });
    }

    // Verificar que la orden no haya vencido
    if (orden.fechaVencimiento && new Date() > orden.fechaVencimiento) {
      orden.estado = "VENCIDA";
      orden.motivoVencimiento = "Expiró el período de vigencia sin que el paciente se presentara";
      await orden.save();
      return res.status(400).json({
        success: false,
        message: "La orden ha vencido. El paciente debe solicitar una nueva orden al médico.",
      });
    }

    // Guardar respuestas protocolares por ítem
    if (Array.isArray(respuestasProtocolares)) {
      for (const { itemIndex, respuestas } of respuestasProtocolares) {
        if (orden.items[itemIndex]) {
          orden.items[itemIndex].respuestasProtocolares = respuestas;
        }
      }
    }

    orden.estado = "ASISTIDO";
    orden.fechaAsistencia = new Date();
    await orden.save();

    const ordenActualizada = await OrdenExamen.findById(id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo instrucciones preguntasProtocolares");

    res.json({ success: true, data: ordenActualizada });

    await registrarAudit(
      req.user?.userId ?? "desconocido",
      "registrar_asistencia",
      id,
      { fechaAsistencia: orden.fechaAsistencia },
      req.ip as string | undefined,
      { estadoAnterior: "EN_PROCESO", estadoNuevo: "ASISTIDO" }
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Finalizar orden con resultados (laboratorio) — ASISTIDO → FINALIZADO ──
// Recibe el PDF de resultados, lo sube a Cloudinary y envía correo al paciente.
export const finalizarOrden = async (
  req: Request & { file?: Express.Multer.File; user?: any },
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const file = req.file;

    if (!file)
      return res
        .status(400)
        .json({ success: false, message: "Se requiere el archivo PDF de resultados" });

    const orden = await OrdenExamen.findById(id);
    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });

    if (orden.estado !== "ASISTIDO") {
      return res.status(400).json({
        success: false,
        message: `Solo se pueden cargar resultados en órdenes En Análisis. Estado actual: ${orden.estado}`,
      });
    }

    // Subir PDF de resultados a Cloudinary
    // Usamos resource_type "raw" para PDFs descargables y upload() con base64
    // para evitar el error "Stale request" que ocurre con upload_stream y firmas.
    const publicId = `${orden.codigoOrden || "ORD"}_resultados_${Date.now()}`;
    const b64DataUri = `data:application/pdf;base64,${file.buffer.toString("base64")}`;
    const uploadResult = await cloudinary.uploader.upload(b64DataUri, {
      resource_type: "raw",
      folder: "policlinico/resultados",
      public_id: publicId,
      overwrite: true,
    });

    const ahora = new Date();
    orden.archivoResultadoUrl = uploadResult.secure_url;
    orden.fechaResultados = ahora;
    orden.estado = "FINALIZADO";
    // Marcar todos los ítems como completados
    orden.items.forEach((item) => {
      item.estadoItem = "COMPLETADO";
      if (!item.fechaResultado) item.fechaResultado = ahora;
    });
    await orden.save();

    const ordenActualizada = await OrdenExamen.findById(id)
      .populate("pacienteId", "nombres apellidos dni fechaNacimiento sexo correo")
      .populate("doctorId", "nombres apellidos cmp")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo preguntasProtocolares");

    res.json({ success: true, data: ordenActualizada });

    // Enviar correo al paciente con el PDF adjunto
    try {
      const paciente = await Paciente.findById(orden.pacienteId);
      if (paciente?.correo) {
        const doc = ordenActualizada?.doctorId as any;
        const esp = ordenActualizada?.especialidadId as any;
        const examenes = (ordenActualizada?.items || []).map((item) => {
          const ex =
            typeof item.examenId === "object" ? (item.examenId as any) : null;
          return {
            nombre: ex?.nombre || "Examen",
            tipo: ex?.tipo || "—",
            valor: item.valorResultado || "—",
            unidad: item.unidadResultado,
            archivoUrl: uploadResult.secure_url,
          };
        });
        await enviarCorreoResultados({
          correo: paciente.correo,
          paciente: {
            nombres: paciente.nombres,
            apellidos: paciente.apellidos,
            dni: paciente.dni,
            fechaNacimiento: paciente.fechaNacimiento?.toISOString(),
            sexo: paciente.sexo,
          },
          doctor: {
            nombres: doc?.nombres || "",
            apellidos: doc?.apellidos || "",
            cmp: doc?.cmp,
          },
          especialidad: esp?.nombre || "",
          codigoOrden: orden.codigoOrden || id,
          fechaOrden: orden.fecha.toISOString(),
          examenes,
          observaciones: orden.observacionesGenerales,
        });
        console.log(`Notificación de resultados enviada a ${paciente.correo}`);
      }
    } catch (emailErr) {
      console.error("Error al enviar correo de resultados:", emailErr);
    }

    await registrarAudit(
      (req as any).user?.userId ?? "desconocido",
      "finalizar_orden",
      id,
      { archivoResultadoUrl: uploadResult.secure_url, fechaResultados: ahora },
      req.ip as string | undefined,
      { estadoAnterior: "ASISTIDO", estadoNuevo: "FINALIZADO" }
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Disponibilidad del laboratorio por día (para el selector de fecha) ──
// Devuelve cuántos cupos están ocupados en cada día dentro del rango solicitado.
export const obtenerDisponibilidadLab = async (req: Request, res: Response) => {
  try {
    const { desde, hasta } = req.query;

    const fechaDesde = desde
      ? new Date(`${desde}T00:00:00.000Z`)
      : new Date();
    const fechaHasta = hasta
      ? new Date(`${hasta}T23:59:59.999Z`)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    // Agrupa las órdenes con fechaCitaLab dentro del rango por día (UTC)
    const resultado = await OrdenExamen.aggregate([
      {
        $match: {
          fechaCitaLab: { $gte: fechaDesde, $lte: fechaHasta },
          estado: { $in: ["EN_PROCESO", "ASISTIDO", "FINALIZADO"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$fechaCitaLab", timezone: "UTC" },
          },
          ocupados: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      capacidadDiaria: CAPACIDAD_DIARIA_LAB,
      data: resultado.map((r) => ({ fecha: r._id as string, ocupados: r.ocupados as number })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Procesar vencimiento automático — EN_PROCESO → VENCIDA ──
// Se invoca desde el frontend al abrir el módulo. Actualiza en lote.
export const procesarVencidas = async (req: Request, res: Response) => {
  try {
    const ahora = new Date();
    const resultado = await OrdenExamen.updateMany(
      {
        estado: "EN_PROCESO",
        fechaVencimiento: { $lt: ahora },
      },
      {
        $set: {
          estado: "VENCIDA",
          motivoVencimiento:
            "Expiró el período de vigencia sin que el paciente se presentara",
        },
      }
    );

    res.json({
      success: true,
      actualizadas: resultado.modifiedCount,
      message: `${resultado.modifiedCount} orden(es) marcada(s) como vencida(s)`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Listar órdenes por estado ──
export const listarOrdenesPorEstado = async (req: Request, res: Response) => {
  try {
    const { estado, tipoOrden } = req.query;
    const estadosValidos = [
      "PENDIENTE",
      "EN_PROCESO",
      "ASISTIDO",
      "FINALIZADO",
      "CANCELADA",
      "VENCIDA",
    ];

    const filtro: any =
      estado && estadosValidos.includes(estado as string)
        ? { estado }
        : { estado: { $in: ["PENDIENTE", "EN_PROCESO"] } };

    if (tipoOrden && ["LABORATORIO", "IMAGEN", "MIXTA"].includes(tipoOrden as string)) {
      filtro.tipoOrden = tipoOrden;
    }

    const ordenes = await OrdenExamen.find(filtro)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo instrucciones preguntasProtocolares")
      .sort({ fecha: -1 });

    res.json({ success: true, data: ordenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Listar órdenes pendientes (compatibilidad) ──
export const listarOrdenesPendientes = async (req: Request, res: Response) => {
  try {
    const { todos, estado, tipoOrden } = req.query;
    const estadosValidos = [
      "PENDIENTE",
      "EN_PROCESO",
      "ASISTIDO",
      "FINALIZADO",
      "CANCELADA",
      "VENCIDA",
    ];

    let filtro: any;
    if (todos === "true") {
      filtro = {};
    } else if (estado && estadosValidos.includes(estado as string)) {
      filtro = { estado };
    } else {
      filtro = { estado: { $in: ["PENDIENTE", "EN_PROCESO"] } };
    }

    if (tipoOrden && ["LABORATORIO", "IMAGEN", "MIXTA"].includes(tipoOrden as string)) {
      filtro.tipoOrden = tipoOrden;
    }

    const ordenes = await OrdenExamen.find(filtro)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo preguntasProtocolares")
      .sort({ fecha: -1 });

    res.json({ success: true, data: ordenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Obtener orden por ID ──
export const obtenerOrden = async (req: Request, res: Response) => {
  try {
    const orden = await OrdenExamen.findById(req.params.id)
      .populate("pacienteId", "nombres apellidos dni fechaNacimiento sexo")
      .populate("doctorId", "nombres apellidos cmp")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo instrucciones preguntasProtocolares");
    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });
    res.json({ success: true, data: orden });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Listar órdenes por paciente ──
export const listarOrdenesPorPaciente = async (req: Request, res: Response) => {
  try {
    const { pacienteId } = req.params;
    const ordenes = await OrdenExamen.find({ pacienteId })
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo preguntasProtocolares")
      .sort({ fecha: -1 });
    res.json({ success: true, data: ordenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Listar órdenes por cita ──
export const listarOrdenesPorCita = async (req: Request, res: Response) => {
  try {
    const { citaId } = req.params;
    const ordenes = await OrdenExamen.find({ citaId })
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo preguntasProtocolares");
    res.json({ success: true, data: ordenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Buscar orden por código ──
export const buscarOrdenPorCodigo = async (req: Request, res: Response) => {
  try {
    const { codigo } = req.query;
    if (!codigo)
      return res
        .status(400)
        .json({ success: false, message: "El parámetro codigo es requerido" });

    const orden = await OrdenExamen.findOne({ codigoOrden: codigo as string })
      .populate("pacienteId", "nombres apellidos dni fechaNacimiento sexo")
      .populate("doctorId", "nombres apellidos cmp")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo instrucciones preguntasProtocolares");

    if (!orden)
      return res
        .status(404)
        .json({ success: false, message: "No se encontró orden con ese código" });

    res.json({ success: true, data: orden });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Cancelar orden ──
export const cancelarOrden = async (req: Request, res: Response) => {
  try {
    const orden = await OrdenExamen.findById(req.params.id);
    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });

    if (!["PENDIENTE", "EN_PROCESO"].includes(orden.estado)) {
      return res.status(400).json({
        success: false,
        message: `No se puede cancelar una orden en estado ${orden.estado}`,
      });
    }

    orden.estado = "CANCELADA";
    await orden.save();

    res.json({ success: true, message: "Orden anulada correctamente" });

    await registrarAudit(
      (req as AuthRequest).user?.userId ?? "desconocido",
      "cancelar_orden",
      String(req.params.id),
      { estadoNuevo: "CANCELADA" },
      req.ip as string | undefined,
      { estadoAnterior: orden.estado, estadoNuevo: "CANCELADA" }
    );
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Edición de orden (solo médico, solo PENDIENTE) ──
export const actualizarOrden = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { items, observacionesGenerales } = req.body;
    const medicoId = req.user?.medicoId;

    const orden = await OrdenExamen.findById(id);
    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });

    if (medicoId && orden.doctorId.toString() !== medicoId) {
      return res
        .status(403)
        .json({ success: false, message: "No tienes permisos para editar esta orden" });
    }

    if (orden.estado !== "PENDIENTE") {
      return res.status(400).json({
        success: false,
        message: "Solo se pueden editar órdenes en estado Pendiente de Autorización",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Debe incluir al menos un ítem en la orden" });
    }

    orden.items = items;
    if (observacionesGenerales !== undefined)
      orden.observacionesGenerales = observacionesGenerales;
    await orden.save();

    const ordenActualizada = await OrdenExamen.findById(id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo instrucciones preguntasProtocolares");

    res.json({ success: true, data: ordenActualizada });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Datos para impresión de orden ──
export const obtenerOrdenParaImprimir = async (req: Request, res: Response) => {
  try {
    const orden = await OrdenExamen.findById(req.params.id)
      .populate("pacienteId", "nombres apellidos dni fechaNacimiento sexo")
      .populate({
        path: "doctorId",
        select: "nombres apellidos cmp especialidadId",
        populate: { path: "especialidadId", select: "nombre" },
      })
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo descripcion instrucciones");

    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });

    res.json({
      success: true,
      data: {
        orden,
        policlinico: {
          nombre: "Policlínico Parroquial San José",
          direccion: "Lima, Perú",
          telefono: "",
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Subir archivo individual de resultado por ítem (uso opcional) ──
export const subirArchivoResultado = async (
  req: Request & { file?: Express.Multer.File },
  res: Response
) => {
  try {
    const { id } = req.params;
    const { examenId } = req.body;
    const file = req.file;

    if (!file)
      return res
        .status(400)
        .json({ success: false, message: "No se envió ningún archivo" });
    if (!examenId)
      return res
        .status(400)
        .json({ success: false, message: "Se requiere examenId" });

    const orden = await OrdenExamen.findById(id);
    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });

    const ext = file.originalname.split(".").pop() || "file";
    const publicId = `${orden.codigoOrden || "ORD"}_${examenId}_${Date.now()}`;

    const resultado = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "policlinico/resultados",
          resource_type: "auto",
          public_id: publicId,
          format: ext,
          use_filename: true,
        },
        (error: any, result: any) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    const item = orden.items.find((i) => i.examenId.toString() === examenId);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Examen no encontrado en la orden" });

    item.archivoUrl = resultado.secure_url;
    await orden.save();

    res.json({ success: true, url: resultado.secure_url });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Cargar resultados numéricos por ítem (compatibilidad) ──
export const cargarResultados = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { resultados } = req.body;

    if (!resultados?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Se requieren resultados" });
    }

    const orden = await OrdenExamen.findById(id);
    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });

    for (const resultado of resultados) {
      const item = orden.items.find(
        (i) => i.examenId.toString() === resultado.examenId
      );
      if (item) {
        item.valorResultado = resultado.valorResultado;
        item.unidadResultado =
          resultado.unidadResultado || item.unidadResultado;
        item.fechaResultado = new Date();
        item.estadoItem = "COMPLETADO";
      }
    }

    await orden.save();

    const ordenActualizada = await OrdenExamen.findById(id)
      .populate("pacienteId", "nombres apellidos dni")
      .populate("doctorId", "nombres apellidos")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo instrucciones preguntasProtocolares");

    res.json({ success: true, data: ordenActualizada });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Horario laboral de imagenología: 08:00–17:00 UTC
const IMAGEN_INICIO_H = 8;
const IMAGEN_FIN_H    = 17;

// ── Disponibilidad de imagenología por sala/día ──
// Query: fecha (DD/MM/YYYY), salaEquipo (opcional), duracionMin (número)
// Retorna franjas ocupadas Y horarios libres sugeridos para esa sala
export const obtenerDisponibilidadImagen = async (req: Request, res: Response) => {
  try {
    const { fecha, salaEquipo, duracionMin } = req.query;

    if (!fecha) {
      return res.status(400).json({ success: false, message: "Parámetro fecha requerido (DD/MM/YYYY)" });
    }

    let fechaBase: Date;
    try {
      fechaBase = parseFecha(fecha as string);
    } catch {
      return res.status(400).json({ success: false, message: "Fecha inválida. Use DD/MM/YYYY" });
    }

    const isoFecha = fechaBase.toISOString().slice(0, 10); // YYYY-MM-DD
    const startOfDay = new Date(`${isoFecha}T00:00:00.000Z`);
    const endOfDay   = new Date(`${isoFecha}T23:59:59.999Z`);

    const filtro: any = {
      tipoOrden: { $in: ["IMAGEN", "MIXTA"] },
      citaImagenFecha: { $gte: startOfDay, $lte: endOfDay },
      estado: { $in: ["EN_PROCESO", "ASISTIDO", "FINALIZADO"] },
    };
    if (salaEquipo) filtro.salaEquipo = salaEquipo as string;

    const citas = await OrdenExamen.find(filtro)
      .select("citaImagenFecha duracionEstimadaMin salaEquipo estado")
      .populate("pacienteId", "nombres apellidos")
      .sort({ citaImagenFecha: 1 });

    const franjas = citas.map((c) => ({
      ordenId: c._id,
      paciente: c.pacienteId,
      salaEquipo: c.salaEquipo,
      inicio: c.citaImagenFecha,
      fin: c.citaImagenFecha
        ? new Date(c.citaImagenFecha.getTime() + (c.duracionEstimadaMin ?? 30) * 60_000)
        : null,
      duracionMin: c.duracionEstimadaMin ?? 30,
      estado: c.estado,
    }));

    // Calcular slots libres sugeridos para esa sala en el día
    const duracion = Number(duracionMin) || 30;
    const slotsLibres: string[] = [];
    if (salaEquipo) {
      const franjasOrdenadas = franjas.filter((f) => f.salaEquipo === salaEquipo && f.inicio && f.fin);
      let cursor = new Date(`${isoFecha}T${String(IMAGEN_INICIO_H).padStart(2, "0")}:00:00.000Z`);
      const fin = new Date(`${isoFecha}T${String(IMAGEN_FIN_H).padStart(2, "0")}:00:00.000Z`);

      while (cursor.getTime() + duracion * 60_000 <= fin.getTime()) {
        const slotFin = new Date(cursor.getTime() + duracion * 60_000);
        const ocupado = franjasOrdenadas.some(
          (f) => f.inicio! < slotFin && f.fin! > cursor
        );
        if (!ocupado) {
          // Formato DD/MM/YYYY HH:mm (hora local UTC)
          const hh = String(cursor.getUTCHours()).padStart(2, "0");
          const mm = String(cursor.getUTCMinutes()).padStart(2, "0");
          const dd = String(cursor.getUTCDate()).padStart(2, "0");
          const mo = String(cursor.getUTCMonth() + 1).padStart(2, "0");
          const yy = cursor.getUTCFullYear();
          slotsLibres.push(`${dd}/${mo}/${yy} ${hh}:${mm}`);
        }
        cursor = new Date(cursor.getTime() + 30 * 60_000); // avanzar de 30 en 30 min
      }
    }

    res.json({
      success: true,
      fecha,
      duracionesPorModalidad: DURACION_DEFAULT,
      franjasOcupadas: franjas,
      slotsLibres,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Audit logs (diagnóstico) ──
export { };
