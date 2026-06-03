import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Especialidad } from "../models/Especialidad";
import { Doctor } from "../models/Doctor";

const especialidades = [
  { nombre: "Medicina General",          tieneLaboratorioImagen: true,  consultorio: 1  },
  { nombre: "Pediatría",                 tieneLaboratorioImagen: true,  consultorio: 2  },
  { nombre: "Odontología",               tieneLaboratorioImagen: false, consultorio: 3  },
  { nombre: "Reumatología",              tieneLaboratorioImagen: true,  consultorio: 4  },
  { nombre: "Ginecología y Obstetricia", tieneLaboratorioImagen: true,  consultorio: 5  },
  { nombre: "Cardiología",               tieneLaboratorioImagen: true,  consultorio: 6  },
  { nombre: "Endocrinología",            tieneLaboratorioImagen: true,  consultorio: 7  },
  { nombre: "Neumología",                tieneLaboratorioImagen: true,  consultorio: 8  },
  { nombre: "Gastroenterología",         tieneLaboratorioImagen: true,  consultorio: 9  },
  { nombre: "Psiquiatría",               tieneLaboratorioImagen: false, consultorio: 10 },
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

    // Crear un doctor por cada especialidad
    const getId = (nombre: string) => especialidadesCreadas.find(e => e.nombre === nombre)?._id;

    const doctores = [
      { nombres: "Jasmen",   apellidos: "Sajian",     correo: "jasmen@sanjose.com",     telefono: "999888777", especialidadId: getId("Medicina General"),          cmp: "99999" },
      { nombres: "Carlos",   apellidos: "Ríos",       correo: "carlos@sanjose.com",     telefono: "988777666", especialidadId: getId("Pediatría"),                 cmp: "88888" },
      { nombres: "Miguel",   apellidos: "Quispe",     correo: "mquispe@sanjose.com",    telefono: "982777666", especialidadId: getId("Odontología"),               cmp: "30303" },
      { nombres: "Claudia",  apellidos: "Huamán",     correo: "chuaman@sanjose.com",    telefono: "911000999", especialidadId: getId("Reumatología"),              cmp: "11111" },
      { nombres: "Ana",      apellidos: "Villanueva", correo: "avillanueva@sanjose.com",telefono: "955444333", especialidadId: getId("Ginecología y Obstetricia"), cmp: "55555" },
      { nombres: "María",    apellidos: "Torres",     correo: "maria@sanjose.com",      telefono: "977666555", especialidadId: getId("Cardiología"),               cmp: "77777" },
      { nombres: "Daniela",  apellidos: "Flores",     correo: "dflores@sanjose.com",    telefono: "973666555", especialidadId: getId("Endocrinología"),            cmp: "40404" },
      { nombres: "Jorge",    apellidos: "Salinas",    correo: "jsalinas@sanjose.com",   telefono: "922111000", especialidadId: getId("Neumología"),                cmp: "22222" },
      { nombres: "Gabriela", apellidos: "Soto",       correo: "gsoto@sanjose.com",      telefono: "991888777", especialidadId: getId("Gastroenterología"),        cmp: "20202" },
      { nombres: "Gustavo",  apellidos: "López",      correo: "glopez@sanjose.com",     telefono: "900111222", especialidadId: getId("Psiquiatría"),               cmp: "10010" },
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