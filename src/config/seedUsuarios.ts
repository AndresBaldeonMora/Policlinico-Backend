/**
 * Seed de usuarios del sistema.
 *
 * - Limpia todos los usuarios existentes antes de crear los nuevos.
 * - Crea cuentas fijas: paciente, administrador, recepcionista.
 * - Crea una cuenta por cada especialidad médica vinculada al Doctor de esa especialidad.
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
import { Especialidad } from "../models/Especialidad";

// ─── Cuentas fijas ────────────────────────────────────────────────────────────

interface CuentaFija {
  nombres: string;
  apellidos: string;
  correo: string;
  password: string;
  rol: RolUsuario;
}

const CUENTAS_FIJAS: CuentaFija[] = [
  {
    nombres:   "Paciente",
    apellidos: "Demo",
    correo:    "paciente@sanjose.com",
    password:  "paciente",
    rol:       "PACIENTE",
  },
  {
    nombres:   "Administrador",
    apellidos: "Principal",
    correo:    "administrador@sanjose.com",
    password:  "administrador",
    rol:       "ADMINISTRADOR",
  },
  {
    nombres:   "Recepcionista",
    apellidos: "Principal",
    correo:    "recepcionista@sanjose.com",
    password:  "recepcionista",
    rol:       "RECEPCIONISTA",
  },
];

// ─── Cuentas médicas por especialidad ─────────────────────────────────────────
// correoPrefix → email será {prefix}@sanjose.com
// password     → contraseña corta de la especialidad

interface CuentaMedica {
  especialidad: string; // nombre exacto en DB
  prefix: string;       // parte antes del @
  password: string;
}

const CUENTAS_MEDICAS: CuentaMedica[] = [
  { especialidad: "Pediatría",                        prefix: "pediatria",          password: "pediatria"          },
  { especialidad: "Medicina Interna",                 prefix: "medicinainterna",     password: "medicinainterna"    },
  { especialidad: "Ginecología",                      prefix: "ginecologia",         password: "ginecologia"        },
  { especialidad: "Cardiología",                      prefix: "cardiologia",         password: "cardiologia"        },
  { especialidad: "Oftalmología",                     prefix: "oftalmologia",        password: "oftalmologia"       },
  { especialidad: "Medicina Física y Rehabilitación", prefix: "medicinafisica",      password: "medicinafisica"     },
  { especialidad: "Neumología",                       prefix: "neumologia",          password: "neumologia"         },
  { especialidad: "Reumatología",                     prefix: "reumatologia",        password: "reumatologia"       },
  { especialidad: "Radiología",                       prefix: "radiologia",          password: "radiologia"         },
  { especialidad: "Gastroenterología",                prefix: "gastroenterologia",   password: "gastroenterologia"  },
  { especialidad: "Odontología",                      prefix: "odontologia",         password: "odontologia"        },
  { especialidad: "Endocrinología",                   prefix: "endocrinologia",      password: "endocrinologia"     },
  { especialidad: "Traumatología",                    prefix: "traumatologia",       password: "traumatologia"      },
  { especialidad: "Geriatría",                        prefix: "geriatria",           password: "geriatria"          },
  { especialidad: "Medicina",                         prefix: "medicina",            password: "medicina"           },
  { especialidad: "Medicina Familiar",                prefix: "medicinafamiliar",    password: "medicinafamiliar"   },
  { especialidad: "Ecografías",                       prefix: "ecografias",          password: "ecografias"         },
  { especialidad: "Otorrinolaringología",             prefix: "otorrino",            password: "otorrino"           },
  { especialidad: "Urología",                         prefix: "urologia",            password: "urologia"           },
  { especialidad: "Cosmiatría",                       prefix: "cosmiatra",           password: "cosmiatra"          },
];

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seedUsuarios() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Falta MONGODB_URI en .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Conectado a MongoDB\n");

  // Limpiar todos los usuarios
  const deleted = await Usuario.deleteMany({});
  console.log(`🗑️  ${deleted.deletedCount} usuarios eliminados\n`);

  let creados = 0, errores = 0;

  // ── 1. Cuentas fijas ────────────────────────────────────────────────────────
  console.log("── Cuentas fijas ──────────────────────────────────────────");
  for (const c of CUENTAS_FIJAS) {
    const correo = c.correo.toLowerCase().trim();
    try {
      let pacienteId: mongoose.Types.ObjectId | undefined;

      if (c.rol === "PACIENTE") {
        const paciente = await Paciente.findOne({ correo });
        if (paciente) {
          pacienteId = paciente._id as mongoose.Types.ObjectId;
          console.log(`🔗 ${correo} — vinculado al Paciente ${paciente.nombres} ${paciente.apellidos}`);
        } else {
          console.log(`⚠️  ${correo} — no se encontró Paciente con ese correo (se crea sin vínculo)`);
        }
      }

      const passwordHash = await bcrypt.hash(c.password, 10);
      await Usuario.create({
        nombres:    c.nombres,
        apellidos:  c.apellidos,
        correo,
        passwordHash,
        rol:        c.rol,
        pacienteId,
      });
      console.log(`✅ ${correo} — creado (${c.rol})`);
      creados++;
    } catch (err: any) {
      console.error(`❌ ${correo} — error: ${err.message}`);
      errores++;
    }
  }

  // ── 2. Cuentas médicas ──────────────────────────────────────────────────────
  console.log("\n── Cuentas médicas ────────────────────────────────────────");
  for (const m of CUENTAS_MEDICAS) {
    const correo = `${m.prefix}@sanjose.com`;
    try {
      const especialidad = await Especialidad.findOne({ nombre: m.especialidad });
      if (!especialidad) {
        console.log(`⚠️  ${correo} — especialidad "${m.especialidad}" no encontrada en DB (saltado)`);
        errores++;
        continue;
      }

      const doctor = await Doctor.findOne({ especialidadId: especialidad._id });
      if (!doctor) {
        console.log(`⚠️  ${correo} — no hay Doctor para especialidad "${m.especialidad}" (saltado)`);
        errores++;
        continue;
      }

      const passwordHash = await bcrypt.hash(m.password, 10);
      await Usuario.create({
        nombres:    doctor.nombres,
        apellidos:  doctor.apellidos,
        correo,
        passwordHash,
        rol:        "MEDICO" as RolUsuario,
        medicoId:   doctor._id,
      });
      console.log(`✅ ${correo} — creado → Dr. ${doctor.nombres} ${doctor.apellidos} (${m.especialidad})`);
      creados++;
    } catch (err: any) {
      console.error(`❌ ${correo} — error: ${err.message}`);
      errores++;
    }
  }

  // ── Resumen ─────────────────────────────────────────────────────────────────
  const total = CUENTAS_FIJAS.length + CUENTAS_MEDICAS.length;
  console.log("\n────────────────────────────────────────────────────────────");
  console.log(`Total esperado : ${total}`);
  console.log(`✅ Creados     : ${creados}`);
  console.log(`❌ Errores     : ${errores}`);
  console.log("────────────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedUsuarios().catch(async (err) => {
  console.error("❌ Error fatal:", err);
  await mongoose.disconnect();
  process.exit(1);
});
