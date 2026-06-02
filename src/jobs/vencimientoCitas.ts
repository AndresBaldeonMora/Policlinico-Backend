import { Cita } from "../models/Cita";
import { AuditLog } from "../models/AuditLog";
import { hoyPeruUTC, horaPeruAInstanteUTC } from "../utils/fecha.utils";

/**
 * Marca como VENCIDAS:
 *  - Citas PENDIENTE/REPROGRAMADA cuya hora superó 30 min sin asistencia (hoy o antes).
 *  - Citas ASISTIO de días anteriores: el paciente llegó pero no fue atendido.
 */
export const verificarCitasVencidas = async (): Promise<number> => {
  const ahora = new Date();

  // Hoy según el calendario peruano, como medianoche UTC.
  const inicioDia = hoyPeruUTC();

  // PENDIENTE/REPROGRAMADA: hoy o antes (con gracia de 30 min)
  const citasPendientes = await Cita.find({
    estado: { $in: ["PENDIENTE", "REPROGRAMADA"] },
    fecha: { $lte: inicioDia },
  });

  // ASISTIO de días estrictamente anteriores: paciente en sala sin ser atendido
  const citasAsistioViejas = await Cita.find({
    estado: "ASISTIO",
    fecha: { $lt: inicioDia },
  });

  const citasAbiertas = [...citasPendientes, ...citasAsistioViejas];

  if (citasAbiertas.length === 0) return 0;

  let vencidas = 0;

  for (const cita of citasAbiertas) {
    const estadoAnterior = cita.estado;
    let motivo: string;

    if (cita.estado === "ASISTIO") {
      // Jornada cerrada sin atención — vencer sin gracia
      motivo = "Paciente en sala no fue atendido al concluir la jornada.";
    } else {
      // PENDIENTE/REPROGRAMADA: aplicar gracia de 30 minutos.
      // `hora` es hora local de Perú; horaPeruAInstanteUTC la convierte al instante UTC real.
      const citaMomento = horaPeruAInstanteUTC(new Date(cita.fecha), cita.hora ?? "23:59");
      const limite = new Date(citaMomento.getTime() + 30 * 60 * 1000);
      if (ahora <= limite) continue;
      motivo = "Paciente no asistió 30 minutos después de la hora programada.";
    }

    cita.estado = "VENCIDA";
    cita.motivoCancelacion = motivo;
    await cita.save();
    vencidas++;

    try {
      await AuditLog.create({
        usuarioId: cita.doctorId || cita.pacienteId,
        accion: "vencer_cita_automatica",
        entidad: "Cita",
        entidadId: cita._id,
        estadoAnterior,
        estadoNuevo: "VENCIDA",
        descripcion: `Cita de ${estadoAnterior} a VENCIDA automáticamente (fecha: ${cita.fecha.toISOString().split("T")[0]}, hora: ${cita.hora ?? "sin hora"})`,
      });
    } catch (err) {
      console.error("Error al registrar audit de vencimiento de cita:", err);
    }
  }

  if (vencidas > 0)
    console.log(`⏰ ${vencidas} cita(s) marcada(s) como VENCIDA(s) automáticamente`);

  return vencidas;
};
