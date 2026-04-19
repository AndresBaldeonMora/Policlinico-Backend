import { Cita } from "../models/Cita";
import { AuditLog } from "../models/AuditLog";

/**
 * Marca como VENCIDAS las citas PENDIENTE o REPROGRAMADA cuya hora programada
 * superó los 30 minutos sin que el paciente haya asistido.
 */
export const verificarCitasVencidas = async (): Promise<number> => {
  const ahora = new Date();

  // Traer citas abiertas cuya fecha ya ocurrió (hoy o antes)
  const inicioDia = new Date(ahora);
  inicioDia.setUTCHours(0, 0, 0, 0);

  const citasAbiertas = await Cita.find({
    estado: { $in: ["PENDIENTE", "REPROGRAMADA"] },
    fecha: { $lte: inicioDia },
  });

  if (citasAbiertas.length === 0) return 0;

  let vencidas = 0;

  for (const cita of citasAbiertas) {
    // Reconstruir el datetime exacto de la cita (fecha + hora)
    const [horas, minutos] = (cita.hora ?? "23:59").split(":").map(Number);
    const citaMomento = new Date(cita.fecha);
    citaMomento.setUTCHours(horas, minutos, 0, 0);

    // Gracia: 30 minutos después de la hora programada
    const limite = new Date(citaMomento.getTime() + 30 * 60 * 1000);
    if (ahora <= limite) continue;

    const estadoAnterior = cita.estado;
    cita.estado = "VENCIDA";
    cita.motivoCancelacion = "Paciente no asistió 30 minutos después de la hora programada.";
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
        descripcion: `Cita de ${estadoAnterior} a VENCIDA automáticamente (fecha: ${cita.fecha.toISOString().split("T")[0]}, hora: ${cita.hora ?? "sin hora"}, límite: +30 min)`,
      });
    } catch (err) {
      console.error("Error al registrar audit de vencimiento de cita:", err);
    }
  }

  if (vencidas > 0)
    console.log(`⏰ ${vencidas} cita(s) marcada(s) como VENCIDA(s) automáticamente`);

  return vencidas;
};
