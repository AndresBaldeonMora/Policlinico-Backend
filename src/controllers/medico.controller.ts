import { Request, Response } from "express";
import mongoose from "mongoose";
import { Cita, ICita } from "../models/Cita";
import { Doctor } from "../models/Doctor";
import { AuthRequest } from "../middlewares/authMiddlewares";

const getDoctorId = (req: Request): string | null => {
  const user = (req as AuthRequest).user;
  return user?.medicoId ?? null;
};

export const obtenerMiPerfil = async (req: Request, res: Response) => {
  try {
    const doctorId = getDoctorId(req);
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

// Determina los ObjectIds de todos los médicos de la misma especialidad
async function getDoctorIdsEspecialidad(doctorId: string): Promise<mongoose.Types.ObjectId[]> {
  const doctor = await Doctor.findById(doctorId).select("especialidadId");
  if (!doctor) return [];
  const doctores = await Doctor.find({ especialidadId: doctor.especialidadId }).select("_id");
  return doctores.map(d => d._id as mongoose.Types.ObjectId);
}

// Anota cada cita con subtipoCita usando una sola agregación (NTS-022: 1ª consulta por especialidad)
async function anotarSubtipo(
  citas: mongoose.HydratedDocument<ICita>[],
  doctorIdsEspec: mongoose.Types.ObjectId[]
): Promise<any[]> {
  if (doctorIdsEspec.length === 0) return citas.map(c => c.toObject());

  const pacIds = citas.map(c => {
    const p = c.pacienteId as any;
    return p._id ? new mongoose.Types.ObjectId(String(p._id)) : p;
  });

  // Obtener la primera cita ATENDIDA por paciente en esta especialidad
  const historial: { _id: string; primeraFecha: Date }[] = await Cita.aggregate([
    {
      $match: {
        pacienteId: { $in: pacIds },
        doctorId:   { $in: doctorIdsEspec },
        estado:     "ATENDIDA",
      },
    },
    { $group: { _id: "$pacienteId", primeraFecha: { $min: "$fecha" } } },
  ]);

  const primeraMap = new Map(historial.map(h => [String(h._id), h.primeraFecha]));

  return citas.map(c => {
    const obj: any = c.toObject();
    if (c.tipo !== "LABORATORIO") {
      const pacId = String((c.pacienteId as any)._id ?? c.pacienteId);
      const primera = primeraMap.get(pacId);
      obj.subtipoCita = !primera || c.fecha <= primera ? "NUEVA" : "SEGUIMIENTO";
    }
    return obj;
  });
}

export const obtenerMisCitas = async (req: Request, res: Response) => {
  try {
    const doctorId = getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    const [citas, doctorIdsEspec] = await Promise.all([
      Cita.find({ doctorId })
        .populate("pacienteId", "nombres apellidos dni telefono correo fechaNacimiento")
        .sort({ fecha: -1, hora: 1 }),
      getDoctorIdsEspecialidad(doctorId),
    ]);

    const data = await anotarSubtipo(citas, doctorIdsEspec);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerCitasHoy = async (req: Request, res: Response) => {
  try {
    const doctorId = getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const [citas, doctorIdsEspec] = await Promise.all([
      Cita.find({ doctorId, fecha: { $gte: hoy, $lt: manana } })
        .populate("pacienteId", "nombres apellidos dni telefono correo fechaNacimiento")
        .sort({ hora: 1 }),
      getDoctorIdsEspecialidad(doctorId),
    ]);

    const data = await anotarSubtipo(citas, doctorIdsEspec);
    res.json({ success: true, data });
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

    const update: any = { estado };

    // Al finalizar (ATENDIDA) se estampa la firma electrónica del médico (NTS-022 Art. 8)
    if (estado === "ATENDIDA") {
      const doctorId = getDoctorId(req);
      if (!doctorId) {
        return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
      }
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ success: false, message: "Perfil de médico no encontrado" });
      }
      update.firma = {
        medicoId:       doctor._id,
        medicoNombre:   `${doctor.nombres} ${doctor.apellidos}`,
        numeroCMP:      doctor.cmp ?? "",
        fechaHoraFirma: new Date(),
      };
    }

    const cita = await Cita.findByIdAndUpdate(
      id,
      update,
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
    const { notasClinicas, diagnostico, tratamiento, diagnosticos, especialidad, otrosDiagnosticos } = req.body;

    const cita = await Cita.findByIdAndUpdate(
      id,
      { notasClinicas, diagnostico, tratamiento, diagnosticos, especialidad, otrosDiagnosticos },
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
      "nombres apellidos dni telefono correo direccion fechaNacimiento alergias medicamentosHabituales problemasMedicos cirugiasPrevias antecedentesFamiliares"
    );

    if (!cita) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    const data: any = cita.toObject();

    // Calcular subtipoCita (NTS-022: primera consulta vs. seguimiento por especialidad)
    if (cita.tipo !== "LABORATORIO" && cita.doctorId) {
      const doctorIdsEspec = await getDoctorIdsEspecialidad(String(cita.doctorId));
      if (doctorIdsEspec.length > 0) {
        const previas = await Cita.countDocuments({
          pacienteId: cita.pacienteId,
          doctorId:   { $in: doctorIdsEspec },
          estado:     "ATENDIDA",
          fecha:      { $lt: cita.fecha },
        });
        data.subtipoCita = previas === 0 ? "NUEVA" : "SEGUIMIENTO";
      }
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerHistorialCitasPaciente = async (req: Request, res: Response) => {
  try {
    const { pacienteId } = req.params;
    const { excluirCitaId } = req.query;

    const query: any = { pacienteId };
    if (excluirCitaId) query._id = { $ne: excluirCitaId };

    const citas = await Cita.find(query)
      .populate({
        path: "doctorId",
        select: "nombres apellidos especialidadId",
        populate: { path: "especialidadId", select: "nombre" },
      })
      .sort({ fecha: -1, hora: -1 })
      .limit(50);

    res.json({ success: true, data: citas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};