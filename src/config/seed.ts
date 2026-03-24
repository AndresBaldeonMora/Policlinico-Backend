import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Especialidad } from "../models/Especialidad";
import { Doctor } from "../models/Doctor";

const especialidades = [
  { nombre: "Medicina General" },
  { nombre: "Pediatría" },
  { nombre: "Cardiología" },
  { nombre: "Dermatología" },
  { nombre: "Ginecología" },
  { nombre: "Traumatología" },
  { nombre: "Oftalmología" },
  { nombre: "Odontología" },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Conectado a MongoDB");

    // Limpiar colecciones
    await Especialidad.deleteMany({});
    await Doctor.deleteMany({});
    console.log("🗑️  Colecciones limpiadas");

    // Crear especialidades
    const especialidadesCreadas = await Especialidad.insertMany(especialidades);
    console.log(`✅ ${especialidadesCreadas.length} especialidades creadas`);

    // Crear doctores de ejemplo
    const medGen  = especialidadesCreadas.find(e => e.nombre === "Medicina General")?._id;
    const pediatr = especialidadesCreadas.find(e => e.nombre === "Pediatría")?._id;
    const cardiol = especialidadesCreadas.find(e => e.nombre === "Cardiología")?._id;

    const doctores = [
      { nombres: "Jasmen",  apellidos: "Sajian",  correo: "jasmen@sanjose.com",  telefono: "999888777", especialidadId: medGen,  cmp: "99999" },
      { nombres: "Carlos",  apellidos: "Ríos",    correo: "carlos@sanjose.com",  telefono: "988777666", especialidadId: pediatr, cmp: "88888" },
      { nombres: "María",   apellidos: "Torres",  correo: "maria@sanjose.com",   telefono: "977666555", especialidadId: cardiol, cmp: "77777" },
    ];

    const doctoresCreados = await Doctor.insertMany(doctores);
    console.log(`✅ ${doctoresCreados.length} doctores creados`);

    console.log("\n📋 IDs para configurar en Supabase user_metadata:");
    doctoresCreados.forEach(d => {
      console.log(`  ${d.nombres} ${d.apellidos}: medicoId = "${d._id}"`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  }
}

seed();