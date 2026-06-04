import { Request, Response } from "express";
import mongoose from "mongoose";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import { Cita, ICita } from "../models/Cita";
import { Doctor } from "../models/Doctor";
import { Horario } from "../models/Horario";
import { OrdenExamen } from "../models/OrdenExamen";
import { Interconsulta } from "../models/Interconsulta";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { generarPDFReceta } from "../config/pdfReceta";
import { generarPDFAlta } from "../config/pdfAlta";
import { enviarCorreoAlta } from "../config/mailer";
import { hoyPeruUTC } from "../utils/fecha.utils";

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

    const hoy = hoyPeruUTC();
    const manana = new Date(hoy.getTime() + 24 * 60 * 60 * 1000);

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

export const obtenerTurnoHoy = async (req: Request, res: Response) => {
  try {
    const doctorId = getDoctorId(req);
    if (!doctorId) return res.status(403).json({ success: false, message: "No autorizado" });

    const hoy   = hoyPeruUTC();
    const manana = new Date(hoy.getTime() + 24 * 60 * 60 * 1000);

    const slots = await Horario.find({ doctorId, fecha: { $gte: hoy, $lt: manana } })
      .sort({ hora: 1 })
      .select("hora -_id");

    if (slots.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: { inicio: slots[0].hora, fin: slots[slots.length - 1].hora },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Estados terminales: una vez firmada (ATENDIDA), la cita es inmutable (NTS-022 Art. 8).
const ESTADOS_INMUTABLES = ["ATENDIDA", "CANCELADA"] as const;

// Transiciones permitidas para el portal médico.
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  PENDIENTE: ["ATENDIDA", "CANCELADA"],
  ASISTIO:   ["ATENDIDA", "CANCELADA"],
  // ATENDIDA y CANCELADA → nada (terminales)
};

export const actualizarEstadoCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID de cita inválido" });
    }
    if (!["PENDIENTE", "ATENDIDA", "CANCELADA"].includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado inválido" });
    }

    const doctorId = getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    // IDOR fix: filtrar por doctorId — sólo el médico dueño de la cita la modifica.
    const citaActual = await Cita.findOne({ _id: id, doctorId });
    if (!citaActual) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    // Estado actual terminal → bloquear cambios.
    if (ESTADOS_INMUTABLES.includes(citaActual.estado as any)) {
      return res.status(409).json({
        success: false,
        message: `La cita está en estado ${citaActual.estado} y no puede modificarse.`,
      });
    }

    const transicionesOK = TRANSICIONES_VALIDAS[citaActual.estado] ?? [];
    if (!transicionesOK.includes(estado)) {
      return res.status(409).json({
        success: false,
        message: `Transición inválida: ${citaActual.estado} → ${estado}`,
      });
    }

    const update: any = { estado };

    // Al finalizar (ATENDIDA) se estampa la firma electrónica del médico (NTS-022 Art. 8).
    if (estado === "ATENDIDA") {
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

    const cita = await Cita.findByIdAndUpdate(id, update, { new: true })
      .populate("pacienteId", "nombres apellidos dni telefono");

    if (!cita) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    if (estado === "ATENDIDA" && (cita as any).interconsultaId) {
      try {
        await Interconsulta.findByIdAndUpdate(
          (cita as any).interconsultaId,
          { estado: "ATENDIDA" }
        );
      } catch (err) {
        console.error("No se pudo sincronizar interconsulta vinculada:", err);
      }
    }

    res.json({ success: true, data: cita });
  } catch (error: any) {
    console.error("actualizarEstadoCita:", error);
    res.status(500).json({ success: false, message: "Error al actualizar la cita" });
  }
};

export const prescribirMedicamentos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { medicamentos } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID de cita inválido" });
    }
    if (!Array.isArray(medicamentos)) {
      return res.status(400).json({ success: false, message: "medicamentos debe ser un array" });
    }

    const doctorId = getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    // IDOR fix + bloquear edición de cita firmada.
    const citaActual = await Cita.findOne({ _id: id, doctorId });
    if (!citaActual) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }
    if (ESTADOS_INMUTABLES.includes(citaActual.estado as any)) {
      return res.status(409).json({
        success: false,
        message: `La cita está ${citaActual.estado} y no puede modificarse.`,
      });
    }

    const cita = await Cita.findByIdAndUpdate(
      id,
      { medicamentosPrescritos: medicamentos },
      { new: true }
    ).populate("pacienteId", "nombres apellidos dni telefono");

    res.json({ success: true, data: cita });
  } catch (error: any) {
    console.error("prescribirMedicamentos:", error);
    res.status(500).json({ success: false, message: "Error al guardar prescripción" });
  }
};

export const guardarNotasClinicas = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notasClinicas, diagnostico, tratamiento, diagnosticos, especialidad, otrosDiagnosticos, medicamentosPrescritos } = req.body;

    const update: any = { notasClinicas, diagnostico, tratamiento, diagnosticos, especialidad, otrosDiagnosticos };
    // Persistir los medicamentos en el campo estructurado (Receta Única Estandarizada),
    // además del blob en notasClinicas. Solo si el cliente los envía.
    if (Array.isArray(medicamentosPrescritos)) {
      update.medicamentosPrescritos = medicamentosPrescritos;
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID de cita inválido" });
    }

    const doctorId = getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    // IDOR fix + bloquear edición de cita firmada.
    const citaActual = await Cita.findOne({ _id: id, doctorId });
    if (!citaActual) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }
    if (ESTADOS_INMUTABLES.includes(citaActual.estado as any)) {
      return res.status(409).json({
        success: false,
        message: `La cita está ${citaActual.estado} y no puede modificarse.`,
      });
    }

    const cita = await Cita.findByIdAndUpdate(
      id,
      update,
      { new: true }
    ).populate("pacienteId", "nombres apellidos dni telefono");

    res.json({ success: true, data: cita });
  } catch (error: any) {
    console.error("guardarNotasClinicas:", error);
    res.status(500).json({ success: false, message: "Error al guardar la nota clínica" });
  }
};

// IDOR fix: el médico sólo accede a sus propias citas (o a las de su especialidad si compañero).
export const obtenerDetalleCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "ID inválido" });
    }

    const doctorId = getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "Usuario no vinculado a un perfil médico" });
    }

    // Lee primero sin populate de PII para chequear ownership.
    const citaRef = await Cita.findById(id).select("doctorId pacienteId").lean();
    if (!citaRef) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    // Permitido si: es el doctor de la cita, o es de su misma especialidad.
    const esDueño = String(citaRef.doctorId) === String(doctorId);
    let permitido = esDueño;
    if (!permitido) {
      const doctoresEspec = await getDoctorIdsEspecialidad(String(doctorId));
      permitido = doctoresEspec.some((d) => String(d) === String(citaRef.doctorId));
    }
    if (!permitido) {
      return res.status(403).json({ success: false, message: "No tienes acceso a esta cita" });
    }

    const cita = await Cita.findById(id).populate(
      "pacienteId",
      "nombres apellidos dni telefono correo direccion fechaNacimiento alergias medicamentosHabituales problemasMedicos cirugiasPrevias antecedentesFamiliares"
    );
    if (!cita) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    const data: any = cita.toObject();

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
    console.error("obtenerDetalleCita:", error);
    res.status(500).json({ success: false, message: "Error al obtener la cita" });
  }
};

// Resultados de exámenes recientemente finalizados de las órdenes emitidas por el médico.
// Alimenta la bandeja del dashboard ("resultados listos para revisar").
export const obtenerResultadosRecientes = async (req: Request, res: Response) => {
  try {
    const doctorId = getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    const ordenes = await OrdenExamen.find({ doctorId, estado: "FINALIZADO" })
      .populate("pacienteId", "nombres apellidos dni")
      .populate("especialidadId", "nombre")
      .populate("items.examenId", "nombre tipo")
      .sort({ fechaResultados: -1 })
      .limit(20);

    res.json({ success: true, data: ordenes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Genera y transmite la Receta Única Estandarizada (PDF) de una cita.
// Usa los medicamentos estructurados (medicamentosPrescritos) persistidos en la cita.
export const generarReceta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cita = await Cita.findById(id)
      .populate("pacienteId", "nombres apellidos dni correo fechaNacimiento sexo direccion")
      .populate({
        path: "doctorId",
        select: "nombres apellidos cmp especialidadId",
        populate: { path: "especialidadId", select: "nombre" },
      });

    if (!cita) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    const meds = cita.medicamentosPrescritos ?? [];
    if (meds.length === 0) {
      return res.status(400).json({ success: false, message: "La cita no tiene medicamentos prescritos" });
    }

    const pac: any = cita.pacienteId;
    const doc: any = cita.doctorId;

    const datosReceta = {
      numeroReceta: `R-${String(cita._id).slice(-6).toUpperCase()}`,
      fecha: (cita.firma?.fechaHoraFirma ?? cita.fecha ?? new Date()).toISOString(),
      paciente: {
        nombres: pac?.nombres ?? "",
        apellidos: pac?.apellidos ?? "",
        dni: pac?.dni ?? "",
        fechaNacimiento: pac?.fechaNacimiento ? new Date(pac.fechaNacimiento).toISOString() : undefined,
        sexo: pac?.sexo ?? "",
        direccion: pac?.direccion ?? "",
      },
      doctor: {
        nombres: doc?.nombres ?? cita.firma?.medicoNombre ?? "",
        apellidos: doc?.apellidos ?? "",
        cmp: doc?.cmp ?? cita.firma?.numeroCMP ?? "",
      },
      especialidad: doc?.especialidadId?.nombre ?? cita.especialidad?.nombre ?? "",
      diagnosticos: (cita.diagnosticos ?? []).map((d) => ({ codigo: d.codigo, descripcion: d.descripcion })),
      medicamentos: meds.map((m) => ({
        nombre: m.nombre,
        dci: m.dci,
        concentracion: m.concentracion,
        formaFarmaceutica: m.formaFarmaceutica,
        viaAdministracion: m.viaAdministracion,
        dosis: m.dosis,
        frecuencia: m.frecuencia,
        duracion: m.duracion,
        cantidad: m.cantidad,
        observaciones: m.observaciones,
      })),
    };

    const pdf = await generarPDFReceta(datosReceta);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Receta_${String(cita._id).slice(-6)}.pdf"`);
    res.send(pdf);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const obtenerHistorialCitasPaciente = async (req: Request, res: Response) => {
  try {
    const pacienteIdRaw = req.params.pacienteId;
    const pacienteId = Array.isArray(pacienteIdRaw) ? pacienteIdRaw[0] : pacienteIdRaw;
    const { excluirCitaId } = req.query;

    if (!pacienteId || !mongoose.isValidObjectId(pacienteId)) {
      return res.status(400).json({ success: false, message: "ID de paciente inválido" });
    }

    const doctorId = getDoctorId(req);
    if (!doctorId) {
      return res.status(403).json({ success: false, message: "No autorizado" });
    }

    const doctoresEspec = await getDoctorIdsEspecialidad(String(doctorId));
    const tieneRelacion = await Cita.exists({
      pacienteId: new mongoose.Types.ObjectId(pacienteId),
      doctorId: { $in: doctoresEspec.length ? doctoresEspec : [new mongoose.Types.ObjectId(doctorId)] },
    });
    if (!tieneRelacion) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso al historial de este paciente",
      });
    }

    const query: any = { pacienteId };
    if (excluirCitaId && mongoose.isValidObjectId(String(excluirCitaId))) {
      query._id = { $ne: excluirCitaId };
    }

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
    console.error("obtenerHistorialCitasPaciente:", error);
    res.status(500).json({ success: false, message: "Error al obtener historial" });
  }
};

export const generarAlta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cita = await Cita.findById(id)
      .populate("pacienteId", "nombres apellidos dni fechaNacimiento correo")
      .populate({
        path: "doctorId",
        select: "nombres apellidos cmp especialidadId",
        populate: { path: "especialidadId", select: "nombre" },
      });

    if (!cita) {
      return res.status(404).json({ success: false, message: "Cita no encontrada" });
    }

    const pac: any = cita.pacienteId;
    const doc: any = cita.doctorId;

    // Extraer medidas no farmacológicas y próxima cita del SOAP guardado
    let indicaciones: string[] = [];
    let otrasIndicaciones: string | undefined;
    let criteriosAlarma: string | undefined;
    let proximaCita: string | undefined;
    let tiempoSeguimiento: string | undefined;
    let hora: string | undefined = cita.hora;

    if (cita.notasClinicas) {
      try {
        const parsed = JSON.parse(cita.notasClinicas);
        indicaciones       = parsed.soap?.P?.medidas            ?? [];
        otrasIndicaciones  = parsed.soap?.P?.otrasIndicaciones  || undefined;
        criteriosAlarma    = parsed.soap?.P?.criteriosAlarma    || undefined;
        proximaCita        = parsed.soap?.P?.proximaCita        || undefined;
        tiempoSeguimiento  = parsed.soap?.P?.tiempoSeguimiento  || undefined;
      } catch { /* SOAP no parseable, continuar con vacíos */ }
    }

    const datosAlta = {
      fecha:    (cita.fecha ?? new Date()).toISOString(),
      hora,
      paciente: {
        nombres:         pac?.nombres       ?? "",
        apellidos:       pac?.apellidos     ?? "",
        dni:             pac?.dni           ?? "",
        fechaNacimiento: pac?.fechaNacimiento
          ? new Date(pac.fechaNacimiento).toISOString()
          : undefined,
      },
      doctor: {
        nombres:   doc?.nombres   ?? cita.firma?.medicoNombre ?? "",
        apellidos: doc?.apellidos ?? "",
        cmp:       doc?.cmp       ?? cita.firma?.numeroCMP    ?? "",
      },
      especialidad: doc?.especialidadId?.nombre ?? cita.especialidad?.nombre ?? "",
      diagnosticos: (cita.diagnosticos ?? []).map((d) => ({
        codigo:      d.codigo,
        descripcion: d.descripcion,
        tipo:        d.tipo,
      })),
      medicamentos: (cita.medicamentosPrescritos ?? []).map((m) => ({
        nombre:        m.nombre,
        concentracion: m.concentracion,
        frecuencia:    m.frecuencia,
        duracion:      m.duracion,
        dosis:         m.dosis,
      })),
      indicaciones,
      otrasIndicaciones,
      criteriosAlarma,
      proximaCita,
      tiempoSeguimiento,
    };
    const pdf = await generarPDFAlta(datosAlta);

    // Enviar resumen de atención al correo del paciente (sin bloquear la respuesta)
    const correo = pac?.correo;
    if (correo) {
      enviarCorreoAlta(correo, pac, pdf).catch((err) =>
        console.error("Error enviando resumen de alta por correo:", err)
      );
    }

    // Devolver el PDF al frontend
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Alta_${String(cita._id).slice(-6)}.pdf"`);
    res.send(pdf);
  } catch (error: any) {
    console.error("ERROR en generarAlta:", error.message, error.stack);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Avatar del médico ─────────────────────────────────────────
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_DIR_DOC   = path.resolve(process.cwd(), "uploads", "avatares");

export const uploadAvatarMedico = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES },
}).single("avatar");

const detectImgExt = (buf: Buffer): "jpg" | "png" | "webp" | null => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
};

export const subirAvatarMedico = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = getDoctorId(req);
    if (!doctorId) return res.status(403).json({ success: false, message: "No autorizado" });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file)
      return res.status(400).json({ success: false, message: "No se recibió ningún archivo en el campo 'avatar'" });
    if (file.size > AVATAR_MAX_BYTES)
      return res.status(400).json({ success: false, message: "El avatar excede el tamaño máximo de 2MB" });

    const ext = detectImgExt(file.buffer);
    if (!ext)
      return res.status(400).json({ success: false, message: "Solo se aceptan JPG, PNG o WebP" });

    await fs.mkdir(AVATAR_DIR_DOC, { recursive: true });

    for (const otraExt of ["jpg", "jpeg", "png", "webp"]) {
      if (otraExt === ext) continue;
      await fs.rm(path.join(AVATAR_DIR_DOC, `doc_${doctorId}.${otraExt}`), { force: true });
    }

    const fileName = `doc_${doctorId}.${ext}`;
    await fs.writeFile(path.join(AVATAR_DIR_DOC, fileName), file.buffer);

    const avatarUrl = `/uploads/avatares/${fileName}`;
    await Doctor.findByIdAndUpdate(doctorId, { avatar: avatarUrl });

    res.json({ success: true, message: "Foto actualizada", data: { avatarUrl } });
  } catch (error: any) {
    if (error?.code === "LIMIT_FILE_SIZE")
      return res.status(400).json({ success: false, message: "El avatar excede el tamaño máximo de 2MB" });
    res.status(500).json({ success: false, message: error.message });
  }
};