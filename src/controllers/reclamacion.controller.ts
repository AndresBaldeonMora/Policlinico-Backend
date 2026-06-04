import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { Reclamacion } from "../models/Reclamacion";
import { Paciente } from "../models/Paciente";
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

    // Correlativo REC-YYYY-XXXX
    const count = await Reclamacion.countDocuments();
    const codigoReclamacion = `REC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const reclamacion = await Reclamacion.create({
      codigo: codigoReclamacion,
      pacienteId,
      tipo: tipo.toUpperCase(),
      descripcion: descripcion.trim(),
      fecha: new Date(),
    });

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
export const listarReclamaciones = async (req: AuthRequest, res: Response) => {
  try {
    const reclamaciones = await Reclamacion.find()
      .populate("pacienteId", "nombres apellidos dni correo telefono")
      .sort({ fecha: -1 });

    res.json({
      success: true,
      data: reclamaciones,
    });
  } catch (error: any) {
    console.error("Error en listarReclamaciones:", error);
    res.status(500).json({ success: false, message: "Error al listar las reclamaciones" });
  }
};
