import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Cita } from "../models/Cita";
import { OrdenExamen } from "../models/OrdenExamen";

/**
 * Migración única: funde el antiguo estado VENCIDA en CANCELADA.
 *
 * - Citas VENCIDA → CANCELADA. Si no tenían `motivoCancelacion`, se les pone uno
 *   indicando que fue por vencimiento, para distinguirlas en reportes de las
 *   cancelaciones manuales.
 * - Órdenes VENCIDA → CANCELADA. El motivo de vencimiento se conserva en
 *   `motivoVencimiento` (ya existente); si faltaba, se rellena.
 *
 * Ejecutar una sola vez tras desplegar el cambio de estados:
 *   npx ts-node src/config/migrarEstadosVencidos.ts
 */
async function migrarEstadosVencidos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Conectado a MongoDB");

    const citas = await Cita.updateMany(
      { estado: "VENCIDA" as any },
      [
        {
          $set: {
            estado: "CANCELADA",
            motivoCancelacion: {
              $ifNull: ["$motivoCancelacion", "Vencida por tiempo (migración)"],
            },
          },
        },
      ]
    );
    console.log(`🗓️  Citas migradas VENCIDA → CANCELADA: ${citas.modifiedCount}`);

    const ordenes = await OrdenExamen.updateMany(
      { estado: "VENCIDA" as any },
      [
        {
          $set: {
            estado: "CANCELADA",
            motivoVencimiento: {
              $ifNull: ["$motivoVencimiento", "Vencida por tiempo (migración)"],
            },
          },
        },
      ]
    );
    console.log(`🧪 Órdenes migradas VENCIDA → CANCELADA: ${ordenes.modifiedCount}`);

    console.log("✅ Migración completada");
  } catch (err) {
    console.error("❌ Error en la migración:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

migrarEstadosVencidos();
