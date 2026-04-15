import { Request, Response } from "express";
import { Cita } from "../models/Cita";
import { Doctor } from "../models/Doctor";
import { AuthRequest } from "../middlewares/authMiddlewares";

const getDoctorId = async (req: Request): Promise<string | null> => {
  const user = (req as AuthRequest).user;
  if (!user) return null;

  if (user.medicoId) return user.medicoId;

  const doctor = await Doctor.findOne({ supabaseId: user.userId }).select("_id");
  return doctor ? doctor._id.toString() : null;
};

export const obtenerMiPerfil = async (req: Request, res: Response) => {
  try {
    const doctorId = await getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    const doctor = await Doctor.findById(doctorId).populate("especialidadId", "nombre");
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Perfil de médico no encontrado" });
    }

    res.json({ success: true, data: doctor });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerMisCitas = async (req: Request, res: Response) => {
  try {
    const doctorId = await getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    const citas = await Cita.find({ doctorId })
      .populate("pacienteId", "nombres apellidos dni telefono correo")
      .sort({ fecha: -1, hora: 1 });

    res.json({ success: true, data: citas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerCitasHoy = async (req: Request, res: Response) => {
  try {
    const doctorId = await getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const citas = await Cita.find({
      doctorId,
      fecha: { $gte: hoy, $lt: manana },
    })
      .populate("pacienteId", "nombres apellidos dni telefono correo")
      .sort({ hora: 1 });

    res.json({ success: true, data: citas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const actualizarEstadoCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!["PENDIENTE", "ATENDIDA", "CANCELADA"].includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado inválido" });
    }

    const cita = await Cita.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    ).populate("pacienteId", "nombres apellidos dni telefono");

    if (!cita) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    res.json({ success: true, data: cita });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const prescribirMedicamentos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { medicamentos } = req.body;

    if (!Array.isArray(medicamentos)) {
      return res.status(400).json({ success: false, message: "medicamentos debe ser un array" });
    }

    const cita = await Cita.findByIdAndUpdate(
      id,
      { medicamentosPrescritos: medicamentos },
      { new: true }
    ).populate("pacienteId", "nombres apellidos dni telefono");

    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    res.json({ success: true, data: cita });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const guardarNotasClinicas = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notasClinicas, diagnostico, tratamiento } = req.body;

    if (!diagnostico || diagnostico.trim().length === 0) {
      return res.status(400).json({ success: false, message: "El diagnóstico es obligatorio" });
    }

    const cita = await Cita.findByIdAndUpdate(
      id,
      { notasClinicas, diagnostico, tratamiento },
      { new: true }
    ).populate("pacienteId", "nombres apellidos dni telefono");

    if (!cita) return res.status(404).json({ success: false, message: "Cita no encontrada" });

    res.json({ success: true, data: cita });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerDetalleCita = async (req: Request, res: Response) => {
  try {
    const cita = await Cita.findById(req.params.id).populate(
      "pacienteId",
      "nombres apellidos dni telefono correo direccion fechaNacimiento"
    );

    if (!cita) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    res.json({ success: true, data: cita });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};