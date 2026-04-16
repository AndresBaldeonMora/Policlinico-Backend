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

    const orden = await OrdenExamen.create({
      pacienteId,
      doctorId: medicoId,
      citaId: citaId || undefined,
      especialidadId,
      codigoOrden,
      items: items.map((item: any) => ({
        examenId: item.examenId,
        observaciones: item.observaciones || "",
        respuestasProtocolares: Array.isArray(item.respuestasProtocolares)
          ? item.respuestasProtocolares
          : [],
        estadoItem: "PENDIENTE",
      })),
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

// ── Autorizar orden (recepción) — PENDIENTE → EN_PROCESO ──
export const autorizarOrden = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { fechaCitaLab } = req.body; // "YYYY-MM-DD" — día agendado para la toma de muestra

    const orden = await OrdenExamen.findById(id);
    if (!orden)
      return res.status(404).json({ success: false, message: "Orden no encontrada" });

    if (orden.estado !== "PENDIENTE") {
      return res.status(400).json({
        success: false,
        message: `Solo se pueden autorizar órdenes en estado PENDIENTE. Estado actual: ${orden.estado}`,
      });
    }

    // Validar y reservar cupo para la fecha de cita de laboratorio
    let citaLabDate: Date | undefined;
    if (fechaCitaLab) {
      citaLabDate = new Date(`${fechaCitaLab}T00:00:00.000Z`);
      if (isNaN(citaLabDate.getTime())) {
        return res.status(400).json({ success: false, message: "Fecha de cita inválida." });
      }
      // Verificar cupos disponibles para ese día
      const startOfDay = new Date(`${fechaCitaLab}T00:00:00.000Z`);
      const endOfDay   = new Date(`${fechaCitaLab}T23:59:59.999Z`);
      const ocupados = await OrdenExamen.countDocuments({
        fechaCitaLab: { $gte: startOfDay, $lte: endOfDay },
        estado: { $in: ["EN_PROCESO", "ASISTIDO", "FINALIZADO"] },
      });
      if (ocupados >= CAPACIDAD_DIARIA_LAB) {
        return res.status(400).json({
          success: false,
          message: `No hay cupos disponibles para el ${fechaCitaLab}. El laboratorio alcanzó su capacidad máxima de ${CAPACIDAD_DIARIA_LAB} pacientes para ese día.`,
        });
      }
    }

    const ahora = new Date();
    const fechaVencimiento = new Date(ahora);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

    orden.estado = "EN_PROCESO";
    orden.fechaAutorizacion = ahora;
    orden.fechaVencimiento = fechaVencimiento;
    if (citaLabDate) orden.fechaCitaLab = citaLabDate;
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
      { fechaAutorizacion: ahora, fechaVencimiento },
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
    const { estado } = req.query;
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
    const { todos, estado } = req.query;
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

// ── Audit logs (diagnóstico) ──
export { };
