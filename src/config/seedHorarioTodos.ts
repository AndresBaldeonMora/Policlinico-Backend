/**
 * Seed: Horario de 8 horas para todos los médicos existentes.
 *
 * Crea slots de 8:00–12:00 y 14:00–18:00 (cada 30 min)
 * para hoy y los próximos 14 días hábiles (lunes a sábado).
 *
 * Ejecución: npm run seed:horario-todos
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Doctor }  from "../models/Doctor";
import { Horario } from "../models/Horario";

const SLOTS_MANANA = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30"];
const SLOTS_TARDE  = ["14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
const TODOS_SLOTS  = [...SLOTS_MANANA, ...SLOTS_TARDE];

function diasHabilesDesdeHoy(cuantos: number): Date[] {
  const dias: Date[] = [];
  const ahora = new Date();
  const cursor = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));

  while (dias.length < cuantos) {
    if (cursor.getUTCDay() !== 0) { // excluir domingos
      dias.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

async function seedHorarioTodos() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("❌ Falta MONGODB_URI en .env"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("✅ Conectado a MongoDB\n");

  const doctores = await Doctor.find({});
  if (doctores.length === 0) {
    console.error("❌ No hay doctores en la BD. Corre seed:completo primero.");
    process.exit(1);
  }
  console.log(`👨‍⚕️  ${doctores.length} doctores encontrados`);

  const _ahora = new Date();
  const hoy = new Date(Date.UTC(_ahora.getFullYear(), _ahora.getMonth(), _ahora.getDate()));

  // Eliminar horarios libres desde hoy en adelante
  const deleted = await Horario.deleteMany({ fecha: { $gte: hoy }, reservado: false });
  console.log(`🗑️  ${deleted.deletedCount} horarios libres eliminados\n`);

  const dias = diasHabilesDesdeHoy(15); // hoy + 14 días hábiles
  console.log(`📅  Generando horarios para ${dias.length} días hábiles (hoy incluido):`);
  dias.forEach(d =>
    console.log(`   • ${d.toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "short", timeZone: "UTC" })}`)
  );

  const horarios: any[] = [];

  for (const doctor of doctores) {
    for (const dia of dias) {
      for (const hora of TODOS_SLOTS) {
        horarios.push({ doctorId: doctor._id, fecha: new Date(dia), hora, reservado: false });
      }
    }
  }

  await Horario.insertMany(horarios, { ordered: false });

  const slotsXDoctor = TODOS_SLOTS.length * dias.length;
  console.log(`\n✅ ${horarios.length} horarios creados`);
  console.log(`   ${slotsXDoctor} slots por doctor (${TODOS_SLOTS.length} slots/día × ${dias.length} días)`);
  console.log(`   Turno: 08:00–12:00 y 14:00–18:00 (8 horas de atención)\n`);

  for (const d of doctores) {
    console.log(`   • Dr. ${d.nombres} ${d.apellidos}`);
  }

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("✅ Horarios listos para todos los médicos.");
  console.log("────────────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedHorarioTodos().catch(async (err) => {
  console.error("❌ Error fatal:", err);
  await mongoose.disconnect();
  process.exit(1);
});
