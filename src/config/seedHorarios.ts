/**
 * Seed de horarios disponibles para todos los doctores.
 *
 * Crea slots de 8:00–12:00 y 14:00–18:00 (cada 30 min)
 * para los próximos 14 días hábiles (lunes a sábado).
 *
 * Ejecución: npm run seed:horarios
 *
 * IMPORTANTE: Correr DESPUÉS de seed:completo para que existan doctores.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Doctor }  from "../models/Doctor";
import { Horario } from "../models/Horario";

const SLOTS_MANANA  = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30"];
const SLOTS_TARDE   = ["14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"];
const TODOS_SLOTS   = [...SLOTS_MANANA, ...SLOTS_TARDE];

function proximosDiasHabiles(cuantos: number): Date[] {
  const dias: Date[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let cursor = new Date(hoy);
  cursor.setDate(cursor.getDate() + 1); // empezar desde mañana

  while (dias.length < cuantos) {
    const dow = cursor.getDay(); // 0=dom, 6=sab
    if (dow !== 0) {             // excluir domingos
      dias.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}

async function seedHorarios() {
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

  // Eliminar horarios futuros existentes (no tocar los ya reservados del pasado)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const deleted = await Horario.deleteMany({ fecha: { $gte: hoy }, reservado: false });
  console.log(`🗑️  ${deleted.deletedCount} horarios libres futuros eliminados\n`);

  const dias = proximosDiasHabiles(14);
  console.log(`📅  Generando horarios para ${dias.length} días hábiles:`);
  dias.forEach(d => console.log(`   • ${d.toLocaleDateString("es-PE", { weekday: "long", day: "2-digit", month: "short" })}`));

  const horarios: any[] = [];

  for (const doctor of doctores) {
    for (const dia of dias) {
      // Cada doctor tiene ~60% de los slots disponibles (simula agenda real)
      const slotsDelDia = TODOS_SLOTS.filter(() => Math.random() > 0.4);
      for (const hora of slotsDelDia) {
        horarios.push({
          doctorId: doctor._id,
          fecha:    new Date(dia),
          hora,
          reservado: false,
        });
      }
    }
  }

  await Horario.insertMany(horarios, { ordered: false });
  console.log(`\n✅ ${horarios.length} horarios creados`);
  console.log(`   Promedio: ${Math.round(horarios.length / doctores.length / dias.length)} slots/día por doctor`);

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("✅ Horarios listos. El wizard de reserva de citas ya tiene");
  console.log("   fechas y horas disponibles para todos los doctores.");
  console.log("────────────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedHorarios().catch(async (err) => {
  console.error("❌ Error fatal:", err);
  await mongoose.disconnect();
  process.exit(1);
});
