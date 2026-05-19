/**
 * Seed de cuenta demo de paciente para presentación/producción.
 *
 * Crea (o actualiza) todo lo necesario para simular una cuenta paciente completa:
 *   1. Paciente  — datos personales, antecedentes clínicos
 *   2. Usuario   — credenciales de acceso vinculadas al Paciente
 *   3. Citas     — historial variado (ATENDIDA, CANCELADA, PENDIENTE)
 *   4. Órdenes   — exámenes con y sin resultados
 *
 * Ejecución: npm run seed:paciente-demo
 *
 * Credenciales generadas:
 *   correo  : paciente@sanjose.com
 *   password: paciente
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { Paciente }     from "../models/Paciente";
import { Usuario }      from "../models/Usuario";
import { Doctor }       from "../models/Doctor";
import { Especialidad } from "../models/Especialidad";
import { Cita }         from "../models/Cita";
import { OrdenExamen }  from "../models/OrdenExamen";
import { ExamenLaboratorioImagen } from "../models/ExamenLaboratorioImagen";

const CORREO_PACIENTE  = "paciente@sanjose.com";
const PASSWORD_DEMO    = "paciente";

// ─── Helpers de fecha ─────────────────────────────────────────────────────────
const daysAgo  = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysFrom = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

// ─── Main ──────────────────────────────────────────────────────────────────────
async function seedPacienteDemo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("❌ Falta MONGODB_URI en .env"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("✅ Conectado a MongoDB\n");

  // ── 1. Paciente ─────────────────────────────────────────────────────────────
  console.log("── 1. Paciente ────────────────────────────────────────────────");

  let paciente = await Paciente.findOne({ correo: CORREO_PACIENTE });

  const pacienteData = {
    nombres:    "María Fernanda",
    apellidos:  "Rodríguez Castillo",
    dni:        "45678901",
    telefono:   "987654321",
    correo:     CORREO_PACIENTE,
    fechaNacimiento: new Date("1990-03-15"),
    sexo:       "F" as const,
    estadoCivil: "CASADO" as const,
    direccion:  "Av. Los Pinos 342, Urb. Santa Rosa",
    distrito:   "San Borja",
    alergias: [
      { sustancia: "Penicilina",  reaccion: "Urticaria generalizada", severidad: "severa"   as const },
      { sustancia: "Ibuprofeno",  reaccion: "Dolor de estómago",      severidad: "moderada" as const },
    ],
    medicamentosHabituales: [
      { nombre: "Atorvastatina", dosis: "20 mg",  frecuencia: "Cada noche",   activo: true  },
      { nombre: "Metformina",    dosis: "850 mg", frecuencia: "Con desayuno", activo: true  },
      { nombre: "Vitamina D",    dosis: "1000 UI",frecuencia: "Cada mañana",  activo: false },
    ],
    problemasMedicos: [
      { descripcion: "Diabetes mellitus tipo 2",  estado: "activo"   as const, fechaInicio: new Date("2018-06-01") },
      { descripcion: "Hipertensión arterial leve",estado: "activo"   as const, fechaInicio: new Date("2020-02-14") },
      { descripcion: "Gastritis crónica",          estado: "resuelto" as const, fechaInicio: new Date("2015-09-10") },
    ],
    cirugiasPrevias: [
      { procedimiento: "Apendicectomía",  fecha: new Date("2010-08-22"), hospital: "Clínica San Pablo" },
      { procedimiento: "Cesárea electiva",fecha: new Date("2016-11-03"), hospital: "Hospital Rebagliati" },
    ],
    antecedentesFamiliares: [
      { parentesco: "Madre",   condicion: "Diabetes mellitus tipo 2" },
      { parentesco: "Padre",   condicion: "Hipertensión arterial" },
      { parentesco: "Abuela materna", condicion: "Enfermedad coronaria" },
    ],
  };

  if (paciente) {
    Object.assign(paciente, pacienteData);
    await paciente.save();
    console.log(`♻️  Paciente actualizado → ${paciente.nombres} ${paciente.apellidos} (${paciente._id})`);
  } else {
    paciente = await Paciente.create(pacienteData);
    console.log(`✅ Paciente creado → ${paciente.nombres} ${paciente.apellidos} (${paciente._id})`);
  }

  const pacienteId = paciente._id as mongoose.Types.ObjectId;

  // ── 2. Usuario ──────────────────────────────────────────────────────────────
  console.log("\n── 2. Usuario ─────────────────────────────────────────────────");

  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
  let usuario = await Usuario.findOne({ correo: CORREO_PACIENTE });

  if (usuario) {
    usuario.nombres      = pacienteData.nombres;
    usuario.apellidos    = pacienteData.apellidos;
    usuario.passwordHash = passwordHash;
    usuario.rol          = "PACIENTE";
    usuario.pacienteId   = pacienteId;
    await usuario.save();
    console.log(`♻️  Usuario actualizado → ${CORREO_PACIENTE}`);
  } else {
    await Usuario.create({
      nombres:    pacienteData.nombres,
      apellidos:  pacienteData.apellidos,
      correo:     CORREO_PACIENTE,
      passwordHash,
      rol:        "PACIENTE",
      pacienteId,
    });
    console.log(`✅ Usuario creado → ${CORREO_PACIENTE}`);
  }

  console.log(`   🔑 Credenciales: ${CORREO_PACIENTE} / ${PASSWORD_DEMO}`);

  // ── 3. Buscar doctores disponibles ─────────────────────────────────────────
  console.log("\n── 3. Buscando médicos en DB ──────────────────────────────────");

  const getDoctor = async (especialidad: string) => {
    const esp = await Especialidad.findOne({ nombre: especialidad });
    if (!esp) return null;
    return Doctor.findOne({ especialidadId: esp._id });
  };

  const drMedicinaInterna  = await getDoctor("Medicina Interna");
  const drCardiologia      = await getDoctor("Cardiología");
  const drEndocrinologia   = await getDoctor("Endocrinología");
  const drGastroenterologia= await getDoctor("Gastroenterología");
  const drMedicina         = await getDoctor("Medicina");

  [
    ["Medicina Interna",   drMedicinaInterna  ],
    ["Cardiología",        drCardiologia      ],
    ["Endocrinología",     drEndocrinologia   ],
    ["Gastroenterología",  drGastroenterologia],
    ["Medicina",           drMedicinaInterna  ],
  ].forEach(([esp, dr]) => {
    if (dr) console.log(`   ✅ ${esp}: Dr. ${(dr as any).nombres} ${(dr as any).apellidos}`);
    else    console.log(`   ⚠️  ${esp}: no encontrado (citas de esa especialidad omitidas)`);
  });

  // ── 4. Citas ────────────────────────────────────────────────────────────────
  console.log("\n── 4. Citas ───────────────────────────────────────────────────");

  // Eliminar citas previas del demo para evitar duplicados
  const deletedCitas = await Cita.deleteMany({ pacienteId });
  console.log(`🗑️  ${deletedCitas.deletedCount} citas anteriores del paciente demo eliminadas`);

  const citasACrear: any[] = [];

  // ── Citas pasadas ATENDIDAS ────────────────────────────────────────────────
  if (drMedicinaInterna) {
    citasACrear.push({
      pacienteId,
      doctorId:   drMedicinaInterna._id,
      fecha:      daysAgo(90),
      hora:       "09:00",
      tipo:       "CONSULTA",
      estado:     "ATENDIDA",
      diagnostico: "Diabetes mellitus tipo 2 con control glucémico regular. Se ajusta dosis de Metformina.",
      tratamiento: "Metformina 850 mg c/12h. Dieta baja en carbohidratos refinados. Control en 3 meses.",
      notasClinicas: "Paciente refiere episodios de mareo matutino. Glucosa en ayuno: 145 mg/dL. HbA1c: 7.8%.",
    });
    citasACrear.push({
      pacienteId,
      doctorId:   drMedicinaInterna._id,
      fecha:      daysAgo(45),
      hora:       "10:30",
      tipo:       "CONSULTA",
      estado:     "ATENDIDA",
      diagnostico: "Control de diabetes. Mejora parcial. Hipertensión arterial estadio 1.",
      tratamiento: "Continuar Metformina. Iniciar Losartán 50 mg c/24h. Monitoreo de PA en casa.",
      notasClinicas: "Glucosa en ayuno: 128 mg/dL. PA: 145/92 mmHg. Peso: 68 kg. IMC: 26.1.",
    });
  }

  if (drCardiologia) {
    citasACrear.push({
      pacienteId,
      doctorId:   drCardiologia._id,
      fecha:      daysAgo(60),
      hora:       "11:00",
      tipo:       "CONSULTA",
      estado:     "ATENDIDA",
      diagnostico: "Hipertensión arterial esencial. Riesgo cardiovascular moderado.",
      tratamiento: "EKG de control. Ecocardiograma en 6 meses. Restricción de sal < 5g/día.",
      notasClinicas: "Paciente sin sintomatología cardiovascular aguda. EKG: ritmo sinusal. FA descartada.",
    });
  }

  if (drEndocrinologia) {
    citasACrear.push({
      pacienteId,
      doctorId:   drEndocrinologia._id,
      fecha:      daysAgo(20),
      hora:       "08:30",
      tipo:       "CONSULTA",
      estado:     "ATENDIDA",
      diagnostico: "Diabetes tipo 2 descompensada. Se solicita perfil lipídico y HbA1c.",
      tratamiento: "Agregar Atorvastatina 20 mg/noche. Orden de laboratorio emitida.",
      notasClinicas: "Paciente acude por aumento de 4 kg en 2 meses. Refiere mayor sed y micción frecuente.",
    });
  }

  // ── Cita CANCELADA ─────────────────────────────────────────────────────────
  if (drGastroenterologia) {
    citasACrear.push({
      pacienteId,
      doctorId:        drGastroenterologia._id,
      fecha:           daysAgo(15),
      hora:            "14:00",
      tipo:            "CONSULTA",
      estado:          "CANCELADA",
      motivoCancelacion: "Paciente llamó para reprogramar por compromiso laboral imprevisto.",
    });
  }

  // ── Citas PENDIENTES (futuras) ─────────────────────────────────────────────
  if (drMedicinaInterna) {
    citasACrear.push({
      pacienteId,
      doctorId:   drMedicinaInterna._id,
      fecha:      daysFrom(7),
      hora:       "09:00",
      tipo:       "CONSULTA",
      estado:     "PENDIENTE",
    });
  }

  if (drCardiologia) {
    citasACrear.push({
      pacienteId,
      doctorId:   drCardiologia._id,
      fecha:      daysFrom(21),
      hora:       "11:30",
      tipo:       "CONSULTA",
      estado:     "PENDIENTE",
    });
  }

  if (drMedicinaInterna) {
    citasACrear.push({
      pacienteId,
      doctorId:   null,
      fecha:      daysFrom(3),
      hora:       "07:30",
      tipo:       "LABORATORIO",
      estado:     "PENDIENTE",
      instrucciones: "Ayuno de 8 horas. No tomar medicamentos hasta después de la toma de muestra.",
    });
  }

  const citasCreadas = await Cita.insertMany(citasACrear);
  console.log(`✅ ${citasCreadas.length} citas creadas`);

  // ── 5. Órdenes de examen ────────────────────────────────────────────────────
  console.log("\n── 5. Órdenes de examen ───────────────────────────────────────");

  // Eliminar órdenes previas del demo
  const deletedOrdenes = await OrdenExamen.deleteMany({ pacienteId });
  console.log(`🗑️  ${deletedOrdenes.deletedCount} órdenes anteriores del paciente demo eliminadas`);

  const espEndocrinologia  = await Especialidad.findOne({ nombre: "Endocrinología" });
  const espMedicinaInterna = await Especialidad.findOne({ nombre: "Medicina Interna" });
  const espCardiologia     = await Especialidad.findOne({ nombre: "Cardiología" });

  // Buscar exámenes del catálogo con patrones amplios para compatibilidad
  // con seedCompleto (nombres cortos) y seedExamenes (nombres detallados).
  const exGlucosa    = await ExamenLaboratorioImagen.findOne({ nombre: /Glucos|Glucém/i });
  const exLipidos    = await ExamenLaboratorioImagen.findOne({ nombre: /Lipídico|Lip[ií]dico/i });
  const exRenal      = await ExamenLaboratorioImagen.findOne({ nombre: /Perfil Renal|Creatinina/i });
  const exHemograma  = await ExamenLaboratorioImagen.findOne({ nombre: /Hemograma/i });
  const exInsulina   = await ExamenLaboratorioImagen.findOne({ nombre: /Insulina/i });
  const exECG        = await ExamenLaboratorioImagen.findOne({ nombre: /Electrocardiograma|ECG/i });
  const exHolter     = await ExamenLaboratorioImagen.findOne({ nombre: /Holter/i });

  const mkItem = (examen: any, seccion: "LAB" | "IMAGEN", obs = "", completado = false, valor = "", unidad = "") => ({
    examenId:              examen._id,
    seccion,
    observaciones:         obs,
    respuestasProtocolares: [],
    estadoItem:            completado ? "COMPLETADO" : "PENDIENTE",
    ...(valor   ? { valorResultado:  valor }  : {}),
    ...(unidad  ? { unidadResultado: unidad } : {}),
    ...(completado ? { fechaResultado: daysAgo(17) } : {}),
  });

  const ordenesACrear: any[] = [];

  // ── Orden FINALIZADA con resultados ───────────────────────────────────────
  if (drEndocrinologia && espEndocrinologia) {
    ordenesACrear.push({
      pacienteId,
      doctorId:       drEndocrinologia._id,
      especialidadId: espEndocrinologia._id,
      codigoOrden:    "ORD-DEMO-001",
      tipoOrden:      "LABORATORIO",
      fecha:          daysAgo(20),
      fechaAutorizacion: daysAgo(19),
      fechaAsistencia:   daysAgo(18),
      fechaResultados:   daysAgo(17),
      estado:         "FINALIZADO",
      observacionesGenerales: "Perfil metabólico completo por control de DM2.",
      notas: "Continuar con dieta baja en carbohidratos refinados. Próximo control en 3 meses.",
      items: [
        ...(exGlucosa  ? [mkItem(exGlucosa,  "LAB", "Ayuno de 8 horas", true, "145", "mg/dL")] : []),
        ...(exInsulina ? [mkItem(exInsulina, "LAB", "",                  true, "7.8", "%")]    : []),
        ...(exLipidos  ? [mkItem(exLipidos,  "LAB", "",                  true, "210", "mg/dL")] : []),
      ],
    });
  }

  // ── Orden FINALIZADA anterior ─────────────────────────────────────────────
  if (drMedicinaInterna && espMedicinaInterna) {
    ordenesACrear.push({
      pacienteId,
      doctorId:       drMedicinaInterna._id,
      especialidadId: espMedicinaInterna._id,
      codigoOrden:    "ORD-DEMO-002",
      tipoOrden:      "LABORATORIO",
      fecha:          daysAgo(45),
      fechaAutorizacion: daysAgo(44),
      fechaAsistencia:   daysAgo(43),
      fechaResultados:   daysAgo(42),
      estado:         "FINALIZADO",
      observacionesGenerales: "Hemograma completo + perfil lipídico.",
      notas: "Se recomienda actividad física moderada y dieta baja en grasas saturadas.",
      items: [
        ...(exHemograma ? [{ ...mkItem(exHemograma, "LAB", "", true, "13.5", "g/dL"), fechaResultado: daysAgo(42) }] : []),
        ...(exLipidos   ? [{ ...mkItem(exLipidos,   "LAB", "", true, "185",  "mg/dL"), fechaResultado: daysAgo(42) }] : []),
      ],
    });
  }

  // ── Orden PENDIENTE (reciente, sin resultados) ────────────────────────────
  if (drCardiologia && espCardiologia) {
    ordenesACrear.push({
      pacienteId,
      doctorId:       drCardiologia._id,
      especialidadId: espCardiologia._id,
      codigoOrden:    "ORD-DEMO-003",
      tipoOrden:      "IMAGEN",
      fecha:          daysAgo(5),
      fechaAutorizacion: daysAgo(4),
      citaImagenFecha: (() => { const d = daysFrom(3); d.setUTCHours(9, 30, 0, 0); return d; })(),
      estado:         "EN_PROCESO",
      observacionesGenerales: "Evaluación de función ventricular y descartar patología estructural.",
      notas: "Presentarse con ropa cómoda. Evitar cremas o lociones en el área del pecho el día del estudio.",
      items: [
        ...(exECG    ? [mkItem(exECG,    "IMAGEN", "Paciente en reposo 15 min previos")]  : []),
        ...(exHolter ? [mkItem(exHolter, "IMAGEN", "No retirar los electrodos durante 24h")] : []),
      ],
    });
  }

  // ── Orden PENDIENTE para laboratorio próximo ──────────────────────────────
  if (drMedicinaInterna && espMedicinaInterna) {
    ordenesACrear.push({
      pacienteId,
      doctorId:       drMedicinaInterna._id,
      especialidadId: espMedicinaInterna._id,
      codigoOrden:    "ORD-DEMO-004",
      tipoOrden:      "LABORATORIO",
      fecha:          daysAgo(2),
      fechaAutorizacion: daysAgo(1),
      fechaCitaLab:   daysFrom(3),
      estado:         "PENDIENTE",
      observacionesGenerales: "Control trimestral de DM2 e HTA.",
      notas: "Recordar ayuno de 8 horas antes de la toma de muestra. Traer resultados anteriores.",
      items: [
        ...(exGlucosa ? [mkItem(exGlucosa, "LAB", "Ayuno de 8 horas")] : []),
        ...(exRenal   ? [mkItem(exRenal,   "LAB", "")]                  : []),
        ...(exInsulina? [mkItem(exInsulina,"LAB", "")]                  : []),
      ],
    });
  }

  if (ordenesACrear.length > 0) {
    const ordenesCreadas = await OrdenExamen.insertMany(ordenesACrear);
    console.log(`✅ ${ordenesCreadas.length} órdenes de examen creadas`);
  } else {
    console.log("⚠️  No se crearon órdenes (no se encontraron médicos/especialidades)");
  }

  // ── Resumen ─────────────────────────────────────────────────────────────────
  console.log("\n────────────────────────────────────────────────────────────────");
  console.log("✅ Seed completado. Cuenta demo lista para presentación.");
  console.log(`   correo  : ${CORREO_PACIENTE}`);
  console.log(`   password: ${PASSWORD_DEMO}`);
  console.log("────────────────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedPacienteDemo().catch(async (err) => {
  console.error("❌ Error fatal:", err);
  await mongoose.disconnect();
  process.exit(1);
});
