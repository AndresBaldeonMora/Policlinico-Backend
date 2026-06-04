/**
 * cleanAndSeed.ts
 * Limpia todas las colecciones transaccionales para empezar pruebas desde cero.
 *
 * SE LIMPIAN  : Cita, OrdenExamen, Interconsulta, Notificacion, AuditLog, BloqueoHorario
 * SE CONSERVAN: Usuario, Doctor, Paciente, Especialidad, Horario,
 *               ExamenLaboratorioImagen, Medicamento, CIE10
 *
 * Ejecución: npm run clean:seed
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Cita }           from "../models/Cita";
import { OrdenExamen }    from "../models/OrdenExamen";
import { Interconsulta }  from "../models/Interconsulta";
import { Notificacion }   from "../models/Notificacion";
import { AuditLog }       from "../models/AuditLog";
import { BloqueoHorario } from "../models/BloqueoHorario";

async function clean() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Conectado a MongoDB\n");

    const [rCitas, rOrdenes, rInterconsultas, rNotificaciones, rAudit, rBloqueos] =
      await Promise.all([
        Cita.deleteMany({}),
        OrdenExamen.deleteMany({}),
        Interconsulta.deleteMany({}),
        Notificacion.deleteMany({}),
        AuditLog.deleteMany({}),
        BloqueoHorario.deleteMany({}),
      ]);

    console.log(`🗑️  Citas eliminadas           : ${rCitas.deletedCount}`);
    console.log(`🗑️  Órdenes eliminadas         : ${rOrdenes.deletedCount}`);
    console.log(`🗑️  Interconsultas eliminadas  : ${rInterconsultas.deletedCount}`);
    console.log(`🗑️  Notificaciones eliminadas  : ${rNotificaciones.deletedCount}`);
    console.log(`🗑️  AuditLogs eliminados       : ${rAudit.deletedCount}`);
    console.log(`🗑️  BloqueoHorarios eliminados : ${rBloqueos.deletedCount}`);
    console.log("\n✅ Base de datos lista para pruebas.\n");

    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error:", err.message ?? err);
    process.exit(1);
  }
}

clean();
