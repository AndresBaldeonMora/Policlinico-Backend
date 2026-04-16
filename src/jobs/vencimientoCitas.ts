import { Cita } from "../models/Cita";
import { AuditLog } from "../models/AuditLog";

/**
 * Marca como VENCIDAS las citas PENDIENTE o REPROGRAMADA cuya fecha ya pasó
 * (comparación solo por día — se ejecuta a las 00:01 del día siguiente).
 */
export const verificarCitasVencidas = async (): Promise<number> => {
  // Inicio del día actual en UTC (00:00:00.000)
  const hoy = new Date();
  hoy.setUTCHours(0, 0, 0, 0);

  const citasAbiertas = await Cita.find({
    estado: { $in: ["PENDIENTE", "REPROGRAMADA"] },
    fecha: { $lt: hoy },
  });

  if (citasAbiertas.length === 0) return 0;

  let vencidas = 0;

  for (const cita of citasAbiertas) {
    const estadoAnterior = cita.estado;
    cita.estado = "VENCIDA";
    cita.motivoCancelacion = "Cita no atendida ni reprogramada. Vencimiento automático.";
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

  console.log(`⏰ ${vencidas} cita(s) marcada(s) como VENCIDA(s) automáticamente`);
  return vencidas;
};
