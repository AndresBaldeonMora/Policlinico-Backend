import { Cita } from "../models/Cita";
import { AuditLog } from "../models/AuditLog";

/**
 * Verifica citas pasadas: estado PENDIENTE, cuya fecha y hora ya pasaron respecto a ahora.
 * Las actualiza a estado CANCELADA (anuladas) y registra en AuditLog.
 */
export const verificarCitasVencidas = async (): Promise<number> => {
  const hoy = new Date();

  // Traer todas las citas pendientes
  const citasPendientes = await Cita.find({
    estado: "PENDIENTE",
  });

  if (citasPendientes.length === 0) return 0;

  let citasCanceladas = 0;

  for (const cita of citasPendientes) {
    // Reconstruir la fecha + hora en UTC para comparar con hoy
    const fechaCita = new Date(cita.fecha);
    
    if (cita.hora) {
      const [horas, minutos] = cita.hora.split(":").map(Number);
      fechaCita.setUTCHours(horas, minutos, 0, 0);
    } else {
      // Si por alguna razón no tiene hora, se asume el final del día
      fechaCita.setUTCHours(23, 59, 59, 999);
    }

    // Si la fecha y hora de la cita ya pasó
    if (fechaCita < hoy) {
      cita.estado = "CANCELADA";
      cita.motivoCancelacion = "Cita no atendida en el horario programado. Anulación automática.";
      await cita.save();
      citasCanceladas++;

      try {
        await AuditLog.create({
          usuarioId: cita.doctorId || cita.pacienteId,
          accion: "cancelar_cita_automatica",
          entidad: "Cita",
          entidadId: cita._id,
          estadoAnterior: "PENDIENTE",
          estadoNuevo: "CANCELADA",
          descripcion: `Cita de PENDIENTE a CANCELADA automáticamente por tiempo expirado (Hora cita: ${cita.hora})`,
        });
      } catch (err) {
        console.error("Error al registrar audit de vencimiento de cita:", err);
      }
    }
  }

  if (citasCanceladas > 0) {
    console.log(`⏰ ${citasCanceladas} cita(s) pendiente(s) marcada(s) como CANCELADA(s) (Vencida)`);
  }
  
  return citasCanceladas;
};
