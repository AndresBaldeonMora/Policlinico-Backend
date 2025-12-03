import { Request, Response } from "express";
import { Cita } from "../models/Cita";
import { Doctor } from "../models/Doctor";

// ✅ Obtener perfil del médico logueado
export const obtenerMiPerfil = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;

    const doctor = await Doctor.findOne({ usuarioId: userId }).populate(
      "especialidadId",
      "nombre"
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Perfil de médico no encontrado",
      });
    }

    res.json({ success: true, data: doctor });
  } catch (error: any) {
    console.error("❌ Error al obtener perfil:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Obtener todas las citas del médico
export const obtenerMisCitas = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;

    const doctor = await Doctor.findOne({ usuarioId: userId });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor no encontrado",
      });
    }

    const citas = await Cita.find({ doctorId: doctor._id })
      .populate("pacienteId", "nombres apellidos dni telefono correo")
      .sort({ fecha: -1, hora: 1 });

    res.json({ success: true, data: citas });
  } catch (error: any) {
    console.error("❌ Error al obtener citas:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Obtener citas del día de hoy
export const obtenerCitasHoy = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;

    const doctor = await Doctor.findOne({ usuarioId: userId });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor no encontrado",
      });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const citas = await Cita.find({
      doctorId: doctor._id,
      fecha: { $gte: hoy, $lt: manana },
    })
      .populate("pacienteId", "nombres apellidos dni telefono correo")
      .sort({ hora: 1 });

    res.json({ success: true, data: citas });
  } catch (error: any) {
    console.error("❌ Error al obtener citas de hoy:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Actualizar estado de una cita
export const actualizarEstadoCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["PENDIENTE", "ATENDIDA", "CANCELADA"].includes(estado)) {
      return res.status(400).json({
        success: false,
        message: "Estado inválido",
      });
    }

    const cita = await Cita.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    ).populate("pacienteId", "nombres apellidos dni telefono");

    if (!cita) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada",
      });
    }

    res.json({ success: true, data: cita });
  } catch (error: any) {
    console.error("❌ Error al actualizar estado:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Obtener detalle de una cita específica
export const obtenerDetalleCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cita = await Cita.findById(id).populate(
      "pacienteId",
      "nombres apellidos dni telefono correo direccion fechaNacimiento"
    );

    if (!cita) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada",
      });
    }

    res.json({ success: true, data: cita });
  } catch (error: any) {
    console.error("❌ Error al obtener detalle de cita:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};