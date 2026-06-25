/**
 * resetTotal.ts
 * Limpia TODA la base de datos y recrea datos base del sistema.
 *
 * Crea:
 *   - 10 especialidades (sin duplicados)
 *   - 2 doctores por especialidad con turnos distintos
 *       Doctor 1: 08:00–15:00  (turno mañana)
 *       Doctor 2: 15:00–22:00  (turno tarde)
 *   - Horarios para hoy + 14 días hábiles (lun–sáb)
 *   - Cuentas: recepcionista, paciente, administrador + médicas (prefix / prefix2)
 *
 * Ejecución: npm run reset:total
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";

import { Especialidad }        from "../models/Especialidad";
import { Doctor }              from "../models/Doctor";
import { Usuario, RolUsuario } from "../models/Usuario";
import { Paciente }            from "../models/Paciente";
import { Cita }                from "../models/Cita";
import { OrdenExamen }         from "../models/OrdenExamen";
import { Interconsulta }       from "../models/Interconsulta";
import { Notificacion }        from "../models/Notificacion";
import { AuditLog }            from "../models/AuditLog";
import { BloqueoHorario }      from "../models/BloqueoHorario";
import { Horario }             from "../models/Horario";

// ─── Turnos ─────────────────────────────────────────────────────────────────
// 08:00–22:00 dividido en dos bloques de 7 horas, slots cada 30 min
const SLOTS_MANANA = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30",
];
const SLOTS_TARDE = [
  "15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30",
];

// ─── Especialidades ──────────────────────────────────────────────────────────
const ESPECIALIDADES = [
  { nombre: "Cardiología",               tieneLaboratorioImagen: true,  consultorio: 1  },
  { nombre: "Endocrinología",            tieneLaboratorioImagen: true,  consultorio: 2  },
  { nombre: "Gastroenterología",         tieneLaboratorioImagen: true,  consultorio: 3  },
  { nombre: "Ginecología y Obstetricia", tieneLaboratorioImagen: true,  consultorio: 4  },
  { nombre: "Medicina General",          tieneLaboratorioImagen: true,  consultorio: 5  },
  { nombre: "Neumología",                tieneLaboratorioImagen: true,  consultorio: 6  },
  { nombre: "Odontología",               tieneLaboratorioImagen: false, consultorio: 7  },
  { nombre: "Pediatría",                 tieneLaboratorioImagen: true,  consultorio: 8  },
  { nombre: "Psiquiatría",               tieneLaboratorioImagen: false, consultorio: 9  },
  { nombre: "Reumatología",              tieneLaboratorioImagen: true,  consultorio: 10 },
];

// ─── Doctores: 2 por especialidad ────────────────────────────────────────────
// turno: "manana" | "tarde"  →  define qué slots se asignan en los horarios
interface DoctorDef {
  nombres: string; apellidos: string; correo: string; telefono: string;
  especialidad: string; cmp: string; prefix: string; password: string;
  turno: "manana" | "tarde";
}

const DOCTORES: DoctorDef[] = [
  // Cardiología
  { nombres: "María",     apellidos: "Torres",      correo: "maria@sanjose.com",        telefono: "977666555", especialidad: "Cardiología",               cmp: "77777", prefix: "cardiologia",         password: "cardiologia",        turno: "manana" },
  { nombres: "Roberto",   apellidos: "Castillo",    correo: "rcastillo@sanjose.com",    telefono: "977666556", especialidad: "Cardiología",               cmp: "77778", prefix: "cardiologia2",        password: "cardiologia2",       turno: "tarde"  },
  // Endocrinología
  { nombres: "Daniela",   apellidos: "Flores",      correo: "dflores@sanjose.com",      telefono: "973666555", especialidad: "Endocrinología",            cmp: "40404", prefix: "endocrinologia",      password: "endocrinologia",     turno: "manana" },
  { nombres: "Luis",      apellidos: "Paredes",     correo: "lparedes@sanjose.com",     telefono: "973666556", especialidad: "Endocrinología",            cmp: "40405", prefix: "endocrinologia2",     password: "endocrinologia2",    turno: "tarde"  },
  // Gastroenterología
  { nombres: "Gabriela",  apellidos: "Soto",        correo: "gsoto@sanjose.com",        telefono: "991888777", especialidad: "Gastroenterología",         cmp: "20202", prefix: "gastroenterologia",   password: "gastroenterologia",  turno: "manana" },
  { nombres: "Fernando",  apellidos: "Medina",      correo: "fmedina@sanjose.com",      telefono: "991888778", especialidad: "Gastroenterología",         cmp: "20203", prefix: "gastroenterologia2",  password: "gastroenterologia2", turno: "tarde"  },
  // Ginecología y Obstetricia
  { nombres: "Ana",       apellidos: "Villanueva",  correo: "avillanueva@sanjose.com",  telefono: "955444333", especialidad: "Ginecología y Obstetricia", cmp: "55555", prefix: "ginecologia",         password: "ginecologia",        turno: "manana" },
  { nombres: "Patricia",  apellidos: "Meza",        correo: "pmeza@sanjose.com",        telefono: "955444334", especialidad: "Ginecología y Obstetricia", cmp: "55556", prefix: "ginecologia2",        password: "ginecologia2",       turno: "tarde"  },
  // Medicina General
  { nombres: "Jasmen",    apellidos: "Sajian",      correo: "jasmen@sanjose.com",       telefono: "999888777", especialidad: "Medicina General",          cmp: "99999", prefix: "medicinageneral",     password: "medicinageneral",    turno: "manana" },
  { nombres: "Ricardo",   apellidos: "Vargas",      correo: "rvargas@sanjose.com",      telefono: "999888778", especialidad: "Medicina General",          cmp: "99998", prefix: "medicinageneral2",    password: "medicinageneral2",   turno: "tarde"  },
  // Neumología
  { nombres: "Jorge",     apellidos: "Salinas",     correo: "jsalinas@sanjose.com",     telefono: "922111000", especialidad: "Neumología",                cmp: "22222", prefix: "neumologia",          password: "neumologia",         turno: "manana" },
  { nombres: "Carmen",    apellidos: "Quispe",      correo: "cquispe@sanjose.com",      telefono: "922111001", especialidad: "Neumología",                cmp: "22223", prefix: "neumologia2",         password: "neumologia2",        turno: "tarde"  },
  // Odontología
  { nombres: "Miguel",    apellidos: "Quispe",      correo: "mquispe@sanjose.com",      telefono: "982777666", especialidad: "Odontología",               cmp: "30303", prefix: "odontologia",         password: "odontologia",        turno: "manana" },
  { nombres: "Sofía",     apellidos: "Ramos",       correo: "sramos@sanjose.com",       telefono: "982777667", especialidad: "Odontología",               cmp: "30304", prefix: "odontologia2",        password: "odontologia2",       turno: "tarde"  },
  // Pediatría
  { nombres: "Carlos",    apellidos: "Ríos",        correo: "carlos@sanjose.com",       telefono: "988777666", especialidad: "Pediatría",                 cmp: "88888", prefix: "pediatria",           password: "pediatria",          turno: "manana" },
  { nombres: "Valeria",   apellidos: "Cruz",        correo: "vcruz@sanjose.com",        telefono: "988777667", especialidad: "Pediatría",                 cmp: "88889", prefix: "pediatria2",          password: "pediatria2",         turno: "tarde"  },
  // Psiquiatría
  { nombres: "Gustavo",   apellidos: "López",       correo: "glopez@sanjose.com",       telefono: "900111222", especialidad: "Psiquiatría",               cmp: "10010", prefix: "psiquiatria",         password: "psiquiatria",        turno: "manana" },
  { nombres: "Andrea",    apellidos: "Herrera",     correo: "aherrera@sanjose.com",     telefono: "900111223", especialidad: "Psiquiatría",               cmp: "10011", prefix: "psiquiatria2",        password: "psiquiatria2",       turno: "tarde"  },
  // Reumatología
  { nombres: "Claudia",   apellidos: "Huamán",      correo: "chuaman@sanjose.com",      telefono: "911000999", especialidad: "Reumatología",              cmp: "11111", prefix: "reumatologia",        password: "reumatologia",       turno: "manana" },
  { nombres: "Eduardo",   apellidos: "Bernales",    correo: "ebernales@sanjose.com",    telefono: "911000998", especialidad: "Reumatología",              cmp: "11112", prefix: "reumatologia2",       password: "reumatologia2",      turno: "tarde"  },
];

// ─── Cuentas fijas (no médicas) ─────────────────────────────────────────────
const CUENTAS_FIJAS = [
  { nombres: "Recepcionista", apellidos: "Principal", correo: "recepcionista@sanjose.com", password: "recepcionista", rol: "RECEPCIONISTA" as RolUsuario },
  { nombres: "Administrador", apellidos: "Principal",  correo: "administrador@sanjose.com", password: "administrador", rol: "ADMINISTRADOR" as RolUsuario },
];

// ─── Paciente demo ───────────────────────────────────────────────────────────
const PACIENTE_DEMO = {
  nombres: "Paciente", apellidos: "Demo", dni: "00000001",
  correo: "paciente@sanjose.com", telefono: "900000001",
  sexo: "M", fechaNacimiento: new Date("1990-01-01"),
};

// ─── Utilidad: días hábiles (lun–sáb) desde hoy ─────────────────────────────
function diasHabiles(cuantos: number): Date[] {
  const dias: Date[] = [];
  const ahora = new Date();
  const cursor = new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));
  while (dias.length < cuantos) {
    if (cursor.getUTCDay() !== 0) dias.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function resetTotal() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("❌ Falta MONGODB_URI en .env"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("✅ Conectado a MongoDB\n");

  // ── 1. Limpiar TODO ────────────────────────────────────────────────────────
  console.log("── Limpiando base de datos ────────────────────────────────────");
  const [rCitas, rOrdenes, rInterconsultas, rNotificaciones, rAudit, rBloqueos,
         rHorarios, rUsuarios, rDoctores, rPacientes, rEspecialidades] =
    await Promise.all([
      Cita.deleteMany({}),
      OrdenExamen.deleteMany({}),
      Interconsulta.deleteMany({}),
      Notificacion.deleteMany({}),
      AuditLog.deleteMany({}),
      BloqueoHorario.deleteMany({}),
      Horario.deleteMany({}),
      Usuario.deleteMany({}),
      Doctor.deleteMany({}),
      Paciente.deleteMany({}),
      Especialidad.deleteMany({}),
    ]);

  console.log(`🗑️  Citas           : ${rCitas.deletedCount}`);
  console.log(`🗑️  Órdenes         : ${rOrdenes.deletedCount}`);
  console.log(`🗑️  Interconsultas  : ${rInterconsultas.deletedCount}`);
  console.log(`🗑️  Notificaciones  : ${rNotificaciones.deletedCount}`);
  console.log(`🗑️  AuditLogs       : ${rAudit.deletedCount}`);
  console.log(`🗑️  BloqueoHorarios : ${rBloqueos.deletedCount}`);
  console.log(`🗑️  Horarios        : ${rHorarios.deletedCount}`);
  console.log(`🗑️  Usuarios        : ${rUsuarios.deletedCount}`);
  console.log(`🗑️  Doctores        : ${rDoctores.deletedCount}`);
  console.log(`🗑️  Pacientes       : ${rPacientes.deletedCount}`);
  console.log(`🗑️  Especialidades  : ${rEspecialidades.deletedCount}`);
  console.log();

  // ── 2. Especialidades ──────────────────────────────────────────────────────
  console.log("── Creando especialidades ─────────────────────────────────────");
  const espCreadas = await Especialidad.insertMany(ESPECIALIDADES);
  espCreadas.forEach(e => console.log(`   • ${e.nombre}`));
  console.log();

  // ── 3. Doctores ───────────────────────────────────────────────────────────
  console.log("── Creando doctores ───────────────────────────────────────────");
  const doctoresCreados: (DoctorDef & { _id: mongoose.Types.ObjectId })[] = [];
  for (const d of DOCTORES) {
    const esp = espCreadas.find(e => e.nombre === d.especialidad);
    if (!esp) { console.log(`⚠️  Especialidad "${d.especialidad}" no encontrada`); continue; }
    const doc = await Doctor.create({
      nombres: d.nombres, apellidos: d.apellidos, correo: d.correo,
      telefono: d.telefono, especialidadId: esp._id, cmp: d.cmp,
    });
    doctoresCreados.push({ ...d, _id: doc._id as mongoose.Types.ObjectId });
    const turnoLabel = d.turno === "manana" ? "08:00–15:00" : "15:00–22:00";
    console.log(`   ✅ Dr. ${d.nombres} ${d.apellidos} — ${d.especialidad} [${turnoLabel}]`);
  }
  console.log();

  // ── 4. Horarios (hoy + 14 días hábiles) ───────────────────────────────────
  console.log("── Generando horarios ─────────────────────────────────────────");
  const dias = diasHabiles(15);
  const horarios: any[] = [];
  for (const doc of doctoresCreados) {
    const slots = doc.turno === "manana" ? SLOTS_MANANA : SLOTS_TARDE;
    for (const dia of dias) {
      for (const hora of slots) {
        horarios.push({ doctorId: doc._id, fecha: new Date(dia), hora, reservado: false });
      }
    }
  }
  await Horario.insertMany(horarios, { ordered: false });
  console.log(`   ✅ ${horarios.length} slots creados (${dias.length} días × 14 slots/doctor × ${doctoresCreados.length} doctores)`);
  console.log(`   Turno mañana : 08:00–15:00 | Turno tarde : 15:00–22:00`);
  console.log();

  // ── 5. Cuentas fijas ───────────────────────────────────────────────────────
  console.log("── Creando cuentas fijas ──────────────────────────────────────");
  for (const c of CUENTAS_FIJAS) {
    const hash = await bcrypt.hash(c.password, 10);
    await Usuario.create({ nombres: c.nombres, apellidos: c.apellidos, correo: c.correo, passwordHash: hash, rol: c.rol });
    console.log(`   ✅ ${c.correo}  (${c.rol})  pw: ${c.password}`);
  }

  // Paciente demo: crear documento Paciente y vincular al Usuario
  const pacienteDoc = await Paciente.create(PACIENTE_DEMO);
  const hashPaciente = await bcrypt.hash("paciente", 10);
  await Usuario.create({
    nombres: PACIENTE_DEMO.nombres, apellidos: PACIENTE_DEMO.apellidos,
    correo: PACIENTE_DEMO.correo, passwordHash: hashPaciente,
    rol: "PACIENTE" as RolUsuario, pacienteId: pacienteDoc._id,
  });
  console.log(`   ✅ paciente@sanjose.com  (PACIENTE)  pw: paciente  → Paciente vinculado`);
  console.log();

  // ── 6. Cuentas médicas ─────────────────────────────────────────────────────
  console.log("── Creando cuentas médicas ────────────────────────────────────");
  for (const d of doctoresCreados) {
    const correo = `${d.prefix}@sanjose.com`;
    const turnoLabel = d.turno === "manana" ? "08:00–15:00" : "15:00–22:00";
    const hash = await bcrypt.hash(d.password, 10);
    await Usuario.create({
      nombres: d.nombres, apellidos: d.apellidos, correo,
      passwordHash: hash, rol: "MEDICO" as RolUsuario, medicoId: d._id,
    });
    console.log(`   ✅ ${correo}  →  Dr. ${d.nombres} ${d.apellidos}  [${turnoLabel}]`);
  }
  console.log();

  // ── Resumen ────────────────────────────────────────────────────────────────
  const totalUsuarios = CUENTAS_FIJAS.length + 1 + doctoresCreados.length; // +1 paciente
  console.log("════════════════════════════════════════════════════════════════");
  console.log("✅ Reset total completado");
  console.log(`   Especialidades : ${espCreadas.length}`);
  console.log(`   Doctores       : ${doctoresCreados.length} (2 por especialidad)`);
  console.log(`   Horarios       : ${horarios.length} slots`);
  console.log(`   Usuarios       : ${totalUsuarios}`);
  console.log("════════════════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
  process.exit(0);
}

resetTotal().catch(async (err) => {
  console.error("❌ Error fatal:", err);
  await mongoose.disconnect();
  process.exit(1);
});
