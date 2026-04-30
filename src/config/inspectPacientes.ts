/**
 * Inspecciona la colección de pacientes para ver si están listos para login.
 * Ejecución: npx ts-node src/config/inspectPacientes.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Paciente } from "../models/Paciente";
import { Cita } from "../models/Cita";
import { OrdenExamen } from "../models/OrdenExamen";
import { Usuario } from "../models/Usuario";

async function inspect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Falta MONGODB_URI");
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log("✅ Conectado a MongoDB\n");

  const total = await Paciente.countDocuments();
  const conCorreo = await Paciente.countDocuments({ correo: { $exists: true, $ne: "" } });
  const conDni = await Paciente.countDocuments({ dni: { $exists: true, $ne: "" } });
  const conTelefono = await Paciente.countDocuments({ telefono: { $exists: true, $ne: "" } });
  const sinCorreo = total - conCorreo;

  console.log("📊 RESUMEN GENERAL DE PACIENTES");
  console.log("────────────────────────────────");
  console.log(`Total pacientes:      ${total}`);
  console.log(`Con correo:           ${conCorreo}  ${conCorreo === total ? "✅" : "⚠️"}`);
  console.log(`Sin correo:           ${sinCorreo}  ${sinCorreo === 0 ? "✅" : "❌ no podrán loguearse"}`);
  console.log(`Con DNI:              ${conDni}  ${conDni === total ? "✅" : "⚠️"}`);
  console.log(`Con teléfono:         ${conTelefono}\n`);

  const usuariosPaciente = await Usuario.countDocuments({ rol: "PACIENTE" });
  console.log("📊 USUARIOS PACIENTE EXISTENTES");
  console.log("────────────────────────────────");
  console.log(`Cuentas PACIENTE en Usuario: ${usuariosPaciente}\n`);

  console.log("🔍 PACIENTES CON DATOS COMPLETOS PARA LOGIN (con correo + DNI):");
  console.log("────────────────────────────────");
  const candidatos = await Paciente.find({
    correo: { $exists: true, $ne: "" },
    dni: { $exists: true, $ne: "" },
  })
    .select("nombres apellidos dni correo telefono")
    .limit(10);

  if (candidatos.length === 0) {
    console.log("⚠️  Ningún paciente tiene los 2 campos (correo + DNI) llenos.\n");
  } else {
    candidatos.forEach((p, i) => {
      console.log(`${i + 1}. ${p.nombres} ${p.apellidos}`);
      console.log(`   DNI: ${p.dni}  |  Correo: ${p.correo}  |  Tel: ${p.telefono ?? "—"}`);
    });
    console.log("");
  }

  console.log("🩺 ACTIVIDAD CLÍNICA (top 5 con más citas/órdenes):");
  console.log("────────────────────────────────");
  const conActividad = await Cita.aggregate([
    { $group: { _id: "$pacienteId", citas: { $sum: 1 } } },
    { $sort: { citas: -1 } },
    { $limit: 5 },
  ]);

  for (const c of conActividad) {
    const p = await Paciente.findById(c._id).select("nombres apellidos dni correo");
    const ordenesCount = await OrdenExamen.countDocuments({ pacienteId: c._id });
    if (p) {
      const correoStr = p.correo ? p.correo : "❌ SIN CORREO";
      console.log(`• ${p.nombres} ${p.apellidos} (DNI ${p.dni})`);
      console.log(`  Citas: ${c.citas} | Órdenes: ${ordenesCount} | Correo: ${correoStr}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

inspect().catch(async (err) => {
  console.error("❌ Error:", err);
  await mongoose.disconnect();
  process.exit(1);
});
