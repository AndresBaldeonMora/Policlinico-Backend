import mongoose from "mongoose";
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { Reclamacion } from "../models/Reclamacion";
import { Paciente } from "../models/Paciente";
import { registrarAuditoria } from "../utils/auditoria";
import { enviarCorreoReclamacion } from "../config/mailer";

// Registrar una queja o reclamo
export const crearReclamacion = async (req: AuthRequest, res: Response) => {
  try {
    const pacienteId = req.pacienteId;
    if (!pacienteId) {
      return res.status(400).json({ success: false, message: "Paciente no vinculado a la cuenta" });
    }

    const { tipo, descripcion } = req.body;
    if (!tipo || !["QUEJA", "RECLAMO"].includes(tipo.toUpperCase())) {
      return res.status(400).json({ success: false, message: "El tipo debe ser QUEJA o RECLAMO" });
    }
    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ success: false, message: "La descripción es requerida" });
    }

    const paciente = await Paciente.findById(pacienteId);
    if (!paciente) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }

    // Correlativo REC-YYYY-XXXX. El índice único de `codigo` puede chocar si dos
    // requests concurrentes calculan el mismo correlativo (countDocuments no es
    // atómico), por eso reintentamos ante un error de clave duplicada (E11000).
    const anio = new Date().getFullYear();
    let reclamacion;
    let codigoReclamacion = "";
    for (let intento = 0; intento < 5; intento++) {
      const count = await Reclamacion.countDocuments();
      codigoReclamacion = `REC-${anio}-${String(count + 1 + intento).padStart(4, "0")}`;
      try {
        reclamacion = await Reclamacion.create({
          codigo: codigoReclamacion,
          pacienteId,
          tipo: tipo.toUpperCase(),
          descripcion: descripcion.trim(),
          fecha: new Date(),
        });
        break;
      } catch (e: any) {
        if (e?.code === 11000 && intento < 4) continue; // colisión: reintentar
        throw e;
      }
    }
    if (!reclamacion) {
      return res.status(500).json({ success: false, message: "No se pudo generar el código de reclamación" });
    }

    // Enviar correo de confirmación al paciente
    if (paciente.correo) {
      enviarCorreoReclamacion({
        correo: paciente.correo,
        paciente: {
          nombres: paciente.nombres,
          apellidos: paciente.apellidos,
          dni: paciente.dni,
        },
        tipo: reclamacion.tipo,
        descripcion: reclamacion.descripcion,
        fecha: reclamacion.fecha,
        codigoReclamacion,
      }).catch((mailErr) => {
        console.error("Error al enviar el correo del Libro de Reclamaciones:", mailErr);
      });
    }

    res.status(201).json({
      success: true,
      message: `${tipo === "QUEJA" ? "Queja" : "Reclamo"} registrada correctamente con código ${codigoReclamacion}`,
      data: reclamacion,
    });
  } catch (error: any) {
    console.error("Error en crearReclamacion:", error);
    res.status(500).json({ success: false, message: "Error al registrar la reclamación" });
  }
};

// Listar todas las reclamaciones (sólo Admin)
// export const listarReclamaciones = async (req: AuthRequest, res: Response) => {
//   try {
//     const reclamaciones = await Reclamacion.find()
//       .populate("pacienteId", "nombres apellidos dni correo telefono")
//       .sort({ fecha: -1 });

//     res.json({
//       success: true,
//       data: reclamaciones,
//     });
//   } catch (error: any) {
//     console.error("Error en listarReclamaciones:", error);
//     res.status(500).json({ success: false, message: "Error al listar las reclamaciones" });
//   }
// };
export const listarReclamaciones = async (req: AuthRequest, res: Response) => {
  try {
    const reclamaciones = await Reclamacion.find()
      .populate("pacienteId", "nombres apellidos dni correo telefono")
      .sort({ fecha: -1 });
    res.json({ success: true, data: reclamaciones });
  } catch (error: any) {
    console.error("Error en listarReclamaciones:", error);
    res.status(500).json({ success: false, message: "Error al listar las reclamaciones" });
  }
};

// Gestionar estado y respuesta de una reclamación (solo ADMIN)
export const gestionarReclamacion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { estado, respuestaAdmin } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const reclamacion = await Reclamacion.findById(id);
    if (!reclamacion) {
      return res.status(404).json({ success: false, message: "Reclamación no encontrada" });
    }

    // Validar estado
    if (estado && !["PENDIENTE", "EN_REVISION", "RESUELTO"].includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado no válido" });
    }

    // Si se quiere marcar como RESUELTO, es obligatorio una respuesta no vacía
    if (estado === "RESUELTO" && (!respuestaAdmin || !respuestaAdmin.trim())) {
      return res.status(400).json({ success: false, message: "Para marcar como RESUELTO, debes proporcionar una respuesta al paciente." });
    }

    const estadoAnterior = reclamacion.estado;

    if (estado) reclamacion.estado = estado;
    if (respuestaAdmin !== undefined) {
      reclamacion.respuestaAdmin = respuestaAdmin.trim() || undefined;
    }

    // Manejo de fecha de resolución
    if (estado === "RESUELTO" && estadoAnterior !== "RESUELTO") {
      reclamacion.fechaResolucion = new Date();
    } else if (estado !== "RESUELTO") {
      reclamacion.fechaResolucion = undefined;
    }

    await reclamacion.save();

    await registrarAuditoria({
      req,
      accion: "GESTIONAR_RECLAMACION",
      entidad: "Reclamacion",
      entidadId: reclamacion._id,
      estadoAnterior,
      estadoNuevo: reclamacion.estado,
      descripcion: `Cambio de estado a ${reclamacion.estado}${reclamacion.respuestaAdmin ? ` y respuesta agregada` : ""}`,
      detalles: {
        respuestaAdmin: reclamacion.respuestaAdmin,
        fechaResolucion: reclamacion.fechaResolucion,
      },
    });

    res.json({
      success: true,
      message: "Reclamación actualizada correctamente",
      data: reclamacion,
    });
  } catch (error: any) {
    console.error("Error en gestionarReclamacion:", error);
    res.status(500).json({ success: false, message: "Error al gestionar la reclamación" });
  }
};