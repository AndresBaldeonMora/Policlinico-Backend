/**
 * Crea un médico de Medicina General con su cuenta de usuario para pruebas.
 * NO toca ninguna otra colección.
 *
 * Ejecución: npm run seed:medico-demo
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { Especialidad } from "../models/Especialidad";
import { Doctor } from "../models/Doctor";
import { Usuario } from "../models/Usuario";

const CORREO_USUARIO = "medicinageneral@sanjose.com";
const CORREO_DOCTOR  = "dr.garcia@sanjose.com";

async function seedMedicoDemo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("❌ Falta MONGODB_URI en .env"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("✅ Conectado a MongoDB\n");

  // 1. Especialidad
  let especialidad = await Especialidad.findOne({ nombre: "Medicina General" });
  if (!especialidad) {
    especialidad = await Especialidad.create({
      nombre: "Medicina General",
      tieneLaboratorioImagen: true,
      consultorio: 1,
    });
    console.log("✅ Especialidad 'Medicina General' creada");
  } else {
    console.log("ℹ️  Especialidad 'Medicina General' ya existe");
  }

  // 2. Doctor
  let doctor = await Doctor.findOne({ correo: CORREO_DOCTOR });
  if (!doctor) {
    doctor = await Doctor.create({
      nombres:        "Carlos",
      apellidos:      "García López",
      correo:         CORREO_DOCTOR,
      telefono:       "987654321",
      especialidadId: especialidad._id,
      cmp:            "12345",
    });
    console.log(`✅ Doctor creado: Dr. ${doctor.nombres} ${doctor.apellidos}`);
  } else {
    console.log(`ℹ️  Doctor ya existe: ${CORREO_DOCTOR}`);
  }

  // 3. Usuario
  const existeUsuario = await Usuario.findOne({ correo: CORREO_USUARIO });
  if (existeUsuario) {
    console.log(`ℹ️  Usuario ya existe: ${CORREO_USUARIO}`);
  } else {
    const passwordHash = await bcrypt.hash("medicinageneral", 10);
    await Usuario.create({
      nombres:    doctor.nombres,
      apellidos:  doctor.apellidos,
      correo:     CORREO_USUARIO,
      passwordHash,
      rol:        "MEDICO",
      medicoId:   doctor._id,
    });
    console.log(`✅ Usuario creado: ${CORREO_USUARIO}`);
  }

  console.log("\n── Credenciales ────────────────────────────────────");
  console.log(`   Email   : ${CORREO_USUARIO}`);
  console.log(`   Password: medicinageneral`);
  console.log("────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedMedicoDemo().catch(async (err) => {
  console.error("❌ Error fatal:", err);
  await mongoose.disconnect();
  process.exit(1);
});
