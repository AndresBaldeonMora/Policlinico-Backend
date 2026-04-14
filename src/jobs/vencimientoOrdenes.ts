import { OrdenExamen } from "../models/OrdenExamen";
import { AuditLog } from "../models/AuditLog";

/**
 * Verifica órdenes vencidas: estado PENDIENTE, sin citaLabId, fechaVencimiento < hoy.
 * Las actualiza a estado VENCIDA y registra en AuditLog.
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
    orden.estado = "VENCIDA";
    orden.motivoVencimiento = "Plazo de 30 días expirado sin generar cita de laboratorio / imagen";
    await orden.save();

    try {
      await AuditLog.create({
        usuarioId: orden.doctorId,
        accion: "vencer_orden",
        entidad: "OrdenExamen",
        entidadId: orden._id,
        estadoAnterior: "PENDIENTE",
        estadoNuevo: "VENCIDA",
        descripcion: `Orden ${orden.codigoOrden} venció automáticamente`,
      });
    } catch (err) {
      console.error("Error al registrar audit de vencimiento:", err);
    }
  }

  console.log(`⏰ ${ordenesVencidas.length} orden(es) marcada(s) como VENCIDA(s)`);
  return ordenesVencidas.length;
};
