import { OrdenExamen } from "../models/OrdenExamen";
import { AuditLog } from "../models/AuditLog";

/**
 * Verifica órdenes vencidas: estado PENDIENTE, sin citaLabId, fechaVencimiento < hoy.
 * Las cancela (estado CANCELADA) guardando el motivo en `motivoVencimiento`, lo que
 * permite distinguirlas de las cancelaciones manuales en reportes.
 */
export const verificarOrdenesVencidas = async (): Promise<number> => {
  const hoy = new Date();

  const ordenesVencidas = await OrdenExamen.find({
    estado: "PENDIENTE",
    citaLabId: null,
    fechaVencimiento: { $lt: hoy, $ne: null },
  });

  if (ordenesVencidas.length === 0) return 0;

  for (const orden of ordenesVencidas) {
    orden.estado = "CANCELADA";
    orden.motivoVencimiento = "Plazo de 30 días expirado sin generar cita de laboratorio / imagen";
    await orden.save();

    try {
      await AuditLog.create({
        usuarioId: orden.doctorId,
        accion: "vencer_orden",
        entidad: "OrdenExamen",
        entidadId: orden._id,
        estadoAnterior: "PENDIENTE",
        estadoNuevo: "CANCELADA",
        descripcion: `Orden ${orden.codigoOrden} CANCELADA por vencimiento automático`,
      });
    } catch (err) {
      console.error("Error al registrar audit de vencimiento:", err);
    }
  }

  console.log(`⏰ ${ordenesVencidas.length} orden(es) CANCELADA(s) por vencimiento`);
  return ordenesVencidas.length;
};
