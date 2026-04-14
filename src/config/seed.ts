import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Especialidad } from "../models/Especialidad";
import { Doctor } from "../models/Doctor";

const especialidades = [
  { nombre: "Pediatría",                       tieneLaboratorioImagen: true  },
  { nombre: "Medicina Interna",                tieneLaboratorioImagen: true  },
  { nombre: "Ginecología",                     tieneLaboratorioImagen: true  },
  { nombre: "Cardiología",                     tieneLaboratorioImagen: true  },
  { nombre: "Oftalmología",                    tieneLaboratorioImagen: false },
  { nombre: "Medicina Física y Rehabilitación",tieneLaboratorioImagen: false },
  { nombre: "Neumología",                      tieneLaboratorioImagen: true  },
  { nombre: "Reumatología",                    tieneLaboratorioImagen: true  },
  { nombre: "Radiología",                      tieneLaboratorioImagen: false },
  { nombre: "Gastroenterología",               tieneLaboratorioImagen: true  },
  { nombre: "Odontología",                     tieneLaboratorioImagen: false },
  { nombre: "Endocrinología",                  tieneLaboratorioImagen: true  },
  { nombre: "Traumatología",                   tieneLaboratorioImagen: false },
  { nombre: "Geriatría",                       tieneLaboratorioImagen: true  },
  { nombre: "Medicina",                        tieneLaboratorioImagen: true  },
  { nombre: "Medicina Familiar",               tieneLaboratorioImagen: true  },
  { nombre: "Ecografías",                      tieneLaboratorioImagen: false },
  { nombre: "Otorrinolaringología",            tieneLaboratorioImagen: false },
  { nombre: "Urología",                        tieneLaboratorioImagen: true  },
  { nombre: "Cosmiatría",                      tieneLaboratorioImagen: false },
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
      { nombres: "Jasmen",     apellidos: "Sajian",      correo: "jasmen@sanjose.com",      telefono: "999888777", especialidadId: getId("Medicina"),                        cmp: "99999" },
      { nombres: "Carlos",     apellidos: "Ríos",        correo: "carlos@sanjose.com",       telefono: "988777666", especialidadId: getId("Pediatría"),                       cmp: "88888" },
      { nombres: "María",      apellidos: "Torres",      correo: "maria@sanjose.com",        telefono: "977666555", especialidadId: getId("Cardiología"),                     cmp: "77777" },
      { nombres: "Luis",       apellidos: "Paredes",     correo: "lparedes@sanjose.com",     telefono: "966555444", especialidadId: getId("Medicina Interna"),                cmp: "66666" },
      { nombres: "Ana",        apellidos: "Villanueva",  correo: "avillanueva@sanjose.com",  telefono: "955444333", especialidadId: getId("Ginecología"),                     cmp: "55555" },
      { nombres: "Roberto",    apellidos: "Chávez",      correo: "rchavez@sanjose.com",      telefono: "944333222", especialidadId: getId("Oftalmología"),                    cmp: "44444" },
      { nombres: "Patricia",   apellidos: "Mendoza",     correo: "pmendoza@sanjose.com",     telefono: "933222111", especialidadId: getId("Medicina Física y Rehabilitación"),cmp: "33333" },
      { nombres: "Jorge",      apellidos: "Salinas",     correo: "jsalinas@sanjose.com",     telefono: "922111000", especialidadId: getId("Neumología"),                      cmp: "22222" },
      { nombres: "Claudia",    apellidos: "Huamán",      correo: "chuaman@sanjose.com",      telefono: "911000999", especialidadId: getId("Reumatología"),                    cmp: "11111" },
      { nombres: "Fernando",   apellidos: "Castillo",    correo: "fcastillo@sanjose.com",    telefono: "900999888", especialidadId: getId("Radiología"),                      cmp: "10101" },
      { nombres: "Gabriela",   apellidos: "Soto",        correo: "gsoto@sanjose.com",        telefono: "991888777", especialidadId: getId("Gastroenterología"),               cmp: "20202" },
      { nombres: "Miguel",     apellidos: "Quispe",      correo: "mquispe@sanjose.com",      telefono: "982777666", especialidadId: getId("Odontología"),                     cmp: "30303" },
      { nombres: "Daniela",    apellidos: "Flores",      correo: "dflores@sanjose.com",      telefono: "973666555", especialidadId: getId("Endocrinología"),                  cmp: "40404" },
      { nombres: "Andrés",     apellidos: "Morales",     correo: "amorales@sanjose.com",     telefono: "964555444", especialidadId: getId("Traumatología"),                   cmp: "50505" },
      { nombres: "Rosa",       apellidos: "Delgado",     correo: "rdelgado@sanjose.com",     telefono: "955444333", especialidadId: getId("Geriatría"),                       cmp: "60606" },
      { nombres: "Héctor",     apellidos: "Ramos",       correo: "hramos@sanjose.com",       telefono: "946333222", especialidadId: getId("Medicina Familiar"),               cmp: "70707" },
      { nombres: "Sofía",      apellidos: "Vargas",      correo: "svargas@sanjose.com",      telefono: "937222111", especialidadId: getId("Ecografías"),                      cmp: "80808" },
      { nombres: "Ricardo",    apellidos: "Aguirre",     correo: "raguirre@sanjose.com",     telefono: "928111000", especialidadId: getId("Otorrinolaringología"),             cmp: "90909" },
      { nombres: "Valeria",    apellidos: "Núñez",       correo: "vnunez@sanjose.com",       telefono: "919000999", especialidadId: getId("Urología"),                        cmp: "10010" },
      { nombres: "Cristina",   apellidos: "Lozano",      correo: "clozano@sanjose.com",      telefono: "910999888", especialidadId: getId("Cosmiatría"),                      cmp: "20020" },
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