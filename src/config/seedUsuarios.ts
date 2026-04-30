/**
 * Seed de usuarios del sistema (post-migración de Supabase a JWT propio).
 *
 * - Idempotente: si el correo ya existe en `usuarios`, lo salta.
 * - Para rol MEDICO: busca un Doctor con el mismo correo y lo vincula vía `medicoId`.
 * - Para rol PACIENTE: busca un Paciente con el mismo correo y lo vincula vía `pacienteId`.
 * - Las contraseñas son temporales — los usuarios deberían cambiarlas al primer login.
 *
 * Ejecución: npm run seed:usuarios
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { Usuario, RolUsuario } from "../models/Usuario";
import { Doctor } from "../models/Doctor";
import { Paciente } from "../models/Paciente";

interface UsuarioSeed {
  nombres: string;
  apellidos: string;
  correo: string;
  password: string;
  rol: RolUsuario;
}

const USUARIOS: UsuarioSeed[] = [
  {
    nombres:   "Andres",
    apellidos: "Recepcion",
    correo:    "andres@sanjose.com",
    password:  "andres",
    rol:       "RECEPCIONISTA",
  },
  {
    nombres:   "Jasmen",
    apellidos: "Medico",
    correo:    "jasmen@sanjose.com",
    password:  "jasmen",
    rol:       "MEDICO",
  },
];

async function seedUsuarios() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Falta MONGODB_URI en .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Conectado a MongoDB\n");

  let creados = 0, saltados = 0, errores = 0;

  for (const u of USUARIOS) {
    const correo = u.correo.toLowerCase().trim();
    try {
      const yaExiste = await Usuario.findOne({ correo });
      if (yaExiste) {
        console.log(`⏭️  ${correo} — ya existe, saltado`);
        saltados++;
        continue;
      }

      // Vincular con Doctor o Paciente si corresponde
      let medicoId: mongoose.Types.ObjectId | undefined;
      let pacienteId: mongoose.Types.ObjectId | undefined;

      if (u.rol === "MEDICO") {
        const doctor = await Doctor.findOne({ correo });
        if (doctor) {
          medicoId = doctor._id;
          console.log(`🔗 ${correo} — vinculado al Doctor ${doctor.nombres} ${doctor.apellidos}`);
        } else {
          console.log(`⚠️  ${correo} — rol MEDICO pero no se encontró Doctor con ese correo (se crea sin vínculo)`);
        }
      }

      if (u.rol === "PACIENTE") {
        const paciente = await Paciente.findOne({ correo });
        if (paciente) {
          pacienteId = paciente._id as mongoose.Types.ObjectId;
          console.log(`🔗 ${correo} — vinculado al Paciente ${paciente.nombres} ${paciente.apellidos}`);
        } else {
          console.log(`⚠️  ${correo} — rol PACIENTE pero no se encontró Paciente con ese correo (se crea sin vínculo)`);
        }
      }

      const passwordHash = await bcrypt.hash(u.password, 10);

      await Usuario.create({
        nombres:   u.nombres,
        apellidos: u.apellidos,
        correo,
        passwordHash,
        rol:       u.rol,
        medicoId,
        pacienteId,
      });

      console.log(`✅ ${correo} — creado (${u.rol})`);
      creados++;
    } catch (err: any) {
      console.error(`❌ ${correo} — error: ${err.message}`);
      errores++;
    }
  }

  console.log("\n────────────────────────────────");
  console.log(`Total: ${USUARIOS.length}`);
  console.log(`✅ Creados: ${creados}`);
  console.log(`⏭️  Saltados: ${saltados}`);
  console.log(`❌ Errores: ${errores}`);
  console.log("────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedUsuarios().catch(async (err) => {
  console.error("❌ Error fatal:", err);
  await mongoose.disconnect();
  process.exit(1);
});
