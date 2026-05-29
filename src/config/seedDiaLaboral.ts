/**
 * Seed: Día laboral completo — Dr. Jasmen Sajian (Medicina General)
 *
 * Crea 12 pacientes con antecedentes clínicos variados y 13 citas para hoy,
 * simulando una jornada realista: atendidas (con SOAP), en sala, pendientes y cancelada.
 *
 * Ejecución: npm run seed:dia-laboral
 *
 * ⚠️  Solo elimina las citas de HOY del doctor Jasmen. No toca otros datos.
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Cita }     from "../models/Cita";
import { Paciente } from "../models/Paciente";
import { Doctor }   from "../models/Doctor";

const DOCTOR_ID = "6a16340582042e3458178301";

// Fecha de hoy en UTC puro (sin hora)
const hoy = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
};

// SOAP JSON para citas ATENDIDAS
const soap = (motivo: string, dxCode: string, dxName: string, dxTipo: "presuntivo" | "confirmado", evaluacion: string, meds: { nombre: string; concentracion: string; forma: string; via: string; frecuencia: string; duracion: string }[]) =>
  JSON.stringify({
    soap: {
      S: { motivoConsulta: motivo },
      O: {},
      A: {
        diagnoses: [{ code: dxCode, name: dxName, tipo: dxTipo }],
        evaluacion,
      },
      P: {},
    },
    medicamentos: meds,
  });

// ─── Pacientes ────────────────────────────────────────────────────────────────
const PACIENTES = [
  {
    nombres: "Carlos Eduardo", apellidos: "Ramírez Torres",
    dni: "72341001", telefono: "987001001", correo: "carlos.ramirez01@mail.com",
    fechaNacimiento: new Date("1978-03-12"), sexo: "M", estadoCivil: "CASADO",
    direccion: "Jr. Los Olivos 245", distrito: "Miraflores",
    alergias: [{ sustancia: "Penicilina", reaccion: "Urticaria", severidad: "severa" as const }],
    problemasMedicos: [
      { descripcion: "Hipertensión arterial", estado: "activo" as const, fechaInicio: new Date("2019-01-15") },
      { descripcion: "Dislipidemia", estado: "activo" as const, fechaInicio: new Date("2020-06-01") },
    ],
    medicamentosHabituales: [
      { nombre: "Losartán", dosis: "50 mg", frecuencia: "1 vez al día", activo: true },
      { nombre: "Atorvastatina", dosis: "20 mg", frecuencia: "Cada noche", activo: true },
    ],
    cirugiasPrevias: [],
    antecedentesFamiliares: [{ parentesco: "Padre", condicion: "Infarto de miocardio" }],
  },
  {
    nombres: "Lucía Paola", apellidos: "Flores Mendoza",
    dni: "72341002", telefono: "987001002", correo: "lucia.flores02@mail.com",
    fechaNacimiento: new Date("1992-07-25"), sexo: "F", estadoCivil: "SOLTERO",
    direccion: "Av. Primavera 1034", distrito: "Surco",
    alergias: [],
    problemasMedicos: [
      { descripcion: "Anemia ferropénica", estado: "activo" as const, fechaInicio: new Date("2023-03-10") },
    ],
    medicamentosHabituales: [
      { nombre: "Sulfato ferroso", dosis: "300 mg", frecuencia: "2 veces al día", activo: true },
    ],
    cirugiasPrevias: [],
    antecedentesFamiliares: [],
  },
  {
    nombres: "Jorge Alberto", apellidos: "Quispe Huanca",
    dni: "72341003", telefono: "987001003", correo: "jorge.quispe03@mail.com",
    fechaNacimiento: new Date("1965-11-04"), sexo: "M", estadoCivil: "CASADO",
    direccion: "Calle Las Begonias 890", distrito: "San Isidro",
    alergias: [
      { sustancia: "Ibuprofeno", reaccion: "Gastritis aguda", severidad: "moderada" as const },
      { sustancia: "Sulfonamidas", reaccion: "Rash cutáneo", severidad: "leve" as const },
    ],
    problemasMedicos: [
      { descripcion: "Diabetes mellitus tipo 2", estado: "activo" as const, fechaInicio: new Date("2015-08-20") },
      { descripcion: "Neuropatía diabética periférica", estado: "activo" as const, fechaInicio: new Date("2021-02-10") },
    ],
    medicamentosHabituales: [
      { nombre: "Metformina", dosis: "850 mg", frecuencia: "Con desayuno y cena", activo: true },
      { nombre: "Glibenclamida", dosis: "5 mg", frecuencia: "Antes del desayuno", activo: true },
      { nombre: "Vitamina B12", dosis: "1000 mcg", frecuencia: "Cada semana IM", activo: true },
    ],
    cirugiasPrevias: [{ procedimiento: "Amputación parcial dedo meñique derecho", fecha: new Date("2022-05-15"), hospital: "Hospital Rebagliati" }],
    antecedentesFamiliares: [{ parentesco: "Madre", condicion: "Diabetes tipo 2" }, { parentesco: "Hermano", condicion: "Diabetes tipo 2" }],
  },
  {
    nombres: "Ana María", apellidos: "Villanueva Castro",
    dni: "72341004", telefono: "987001004", correo: "ana.villanueva04@mail.com",
    fechaNacimiento: new Date("1985-02-18"), sexo: "F", estadoCivil: "CASADO",
    direccion: "Jr. Huallaga 556", distrito: "Cercado de Lima",
    alergias: [],
    problemasMedicos: [],
    medicamentosHabituales: [],
    cirugiasPrevias: [{ procedimiento: "Colecistectomía laparoscópica", fecha: new Date("2018-09-30"), hospital: "Clínica San Pablo" }],
    antecedentesFamiliares: [{ parentesco: "Madre", condicion: "Hipertensión arterial" }],
  },
  {
    nombres: "Roberto César", apellidos: "Salinas Pinto",
    dni: "72341005", telefono: "987001005", correo: "roberto.salinas05@mail.com",
    fechaNacimiento: new Date("1955-06-30"), sexo: "M", estadoCivil: "VIUDO",
    direccion: "Av. Universitaria 2300", distrito: "San Miguel",
    alergias: [{ sustancia: "Aspirina", reaccion: "Broncoespasmo", severidad: "severa" as const }],
    problemasMedicos: [
      { descripcion: "EPOC estadio II", estado: "activo" as const, fechaInicio: new Date("2017-04-05") },
      { descripcion: "Hipertensión arterial", estado: "activo" as const, fechaInicio: new Date("2012-01-01") },
      { descripcion: "Osteoartritis rodilla derecha", estado: "activo" as const, fechaInicio: new Date("2020-11-20") },
    ],
    medicamentosHabituales: [
      { nombre: "Salbutamol inhalador", dosis: "100 mcg", frecuencia: "SOS", activo: true },
      { nombre: "Tiotropio inhalador", dosis: "18 mcg", frecuencia: "1 vez al día", activo: true },
      { nombre: "Amlodipino", dosis: "5 mg", frecuencia: "1 vez al día", activo: true },
    ],
    cirugiasPrevias: [{ procedimiento: "Bypass coronario triple", fecha: new Date("2014-03-22"), hospital: "Hospital Nacional Dos de Mayo" }],
    antecedentesFamiliares: [{ parentesco: "Padre", condicion: "EPOC" }, { parentesco: "Padre", condicion: "Cardiopatía isquémica" }],
  },
  {
    nombres: "Daniela Sofía", apellidos: "Morales Ríos",
    dni: "72341006", telefono: "987001006", correo: "daniela.morales06@mail.com",
    fechaNacimiento: new Date("2001-09-14"), sexo: "F", estadoCivil: "SOLTERO",
    direccion: "Calle Reducto 1120", distrito: "Miraflores",
    alergias: [],
    problemasMedicos: [
      { descripcion: "Migraña con aura", estado: "activo" as const, fechaInicio: new Date("2019-05-01") },
    ],
    medicamentosHabituales: [
      { nombre: "Topiramato", dosis: "50 mg", frecuencia: "Cada noche", activo: true },
    ],
    cirugiasPrevias: [],
    antecedentesFamiliares: [{ parentesco: "Madre", condicion: "Migraña crónica" }],
  },
  {
    nombres: "Manuel Augusto", apellidos: "Cárdenas Lozano",
    dni: "72341007", telefono: "987001007", correo: "manuel.cardenas07@mail.com",
    fechaNacimiento: new Date("1948-12-01"), sexo: "M", estadoCivil: "CASADO",
    direccion: "Av. Brasil 1890", distrito: "Breña",
    alergias: [{ sustancia: "Contraste yodado", reaccion: "Angioedema", severidad: "severa" as const }],
    problemasMedicos: [
      { descripcion: "Insuficiencia renal crónica estadio 3", estado: "activo" as const, fechaInicio: new Date("2018-07-10") },
      { descripcion: "Diabetes mellitus tipo 2", estado: "activo" as const, fechaInicio: new Date("2010-03-15") },
      { descripcion: "Hipertensión arterial", estado: "activo" as const, fechaInicio: new Date("2010-03-15") },
      { descripcion: "Anemia crónica", estado: "activo" as const, fechaInicio: new Date("2020-01-01") },
    ],
    medicamentosHabituales: [
      { nombre: "Insulina glargina", dosis: "20 UI", frecuencia: "Cada noche SC", activo: true },
      { nombre: "Amlodipino", dosis: "10 mg", frecuencia: "1 vez al día", activo: true },
      { nombre: "Furosemida", dosis: "40 mg", frecuencia: "Mañanas", activo: true },
      { nombre: "Eritropoyetina", dosis: "4000 UI", frecuencia: "3 veces por semana SC", activo: true },
    ],
    cirugiasPrevias: [{ procedimiento: "Fístula arteriovenosa brazo izquierdo", fecha: new Date("2021-08-05"), hospital: "Hospital Loayza" }],
    antecedentesFamiliares: [{ parentesco: "Padre", condicion: "Insuficiencia renal" }, { parentesco: "Madre", condicion: "Diabetes tipo 2" }],
  },
  {
    nombres: "Patricia Elena", apellidos: "Gutiérrez Álvarez",
    dni: "72341008", telefono: "987001008", correo: "patricia.gutierrez08@mail.com",
    fechaNacimiento: new Date("1970-04-22"), sexo: "F", estadoCivil: "DIVORCIADO",
    direccion: "Jr. Cahuide 345", distrito: "Jesús María",
    alergias: [],
    problemasMedicos: [
      { descripcion: "Hipotiroidismo primario", estado: "activo" as const, fechaInicio: new Date("2016-02-14") },
      { descripcion: "Depresión mayor en remisión", estado: "resuelto" as const, fechaInicio: new Date("2017-09-01") },
    ],
    medicamentosHabituales: [
      { nombre: "Levotiroxina", dosis: "100 mcg", frecuencia: "En ayunas 30 min antes del desayuno", activo: true },
    ],
    cirugiasPrevias: [],
    antecedentesFamiliares: [{ parentesco: "Madre", condicion: "Hipotiroidismo" }, { parentesco: "Abuela materna", condicion: "Cáncer de tiroides" }],
  },
  {
    nombres: "Fernando José", apellidos: "Paredes Noriega",
    dni: "72341009", telefono: "987001009", correo: "fernando.paredes09@mail.com",
    fechaNacimiento: new Date("1988-08-07"), sexo: "M", estadoCivil: "CONVIVIENTE",
    direccion: "Av. Colonial 2450", distrito: "Callao",
    alergias: [],
    problemasMedicos: [],
    medicamentosHabituales: [],
    cirugiasPrevias: [],
    antecedentesFamiliares: [],
  },
  {
    nombres: "Claudia Beatriz", apellidos: "Huamán Soto",
    dni: "72341010", telefono: "987001010", correo: "claudia.huaman10@mail.com",
    fechaNacimiento: new Date("1999-01-31"), sexo: "F", estadoCivil: "SOLTERO",
    direccion: "Calle Los Ficus 78", distrito: "La Molina",
    alergias: [{ sustancia: "Látex", reaccion: "Dermatitis de contacto", severidad: "moderada" as const }],
    problemasMedicos: [
      { descripcion: "Asma bronquial leve persistente", estado: "activo" as const, fechaInicio: new Date("2010-06-01") },
    ],
    medicamentosHabituales: [
      { nombre: "Fluticasona/Salmeterol inhalador", dosis: "250/25 mcg", frecuencia: "2 veces al día", activo: true },
    ],
    cirugiasPrevias: [],
    antecedentesFamiliares: [{ parentesco: "Padre", condicion: "Asma bronquial" }],
  },
  {
    nombres: "Tomás Enrique", apellidos: "Vargas Cotrina",
    dni: "72341011", telefono: "987001011", correo: "tomas.vargas11@mail.com",
    fechaNacimiento: new Date("1975-05-19"), sexo: "M", estadoCivil: "CASADO",
    direccion: "Av. Angamos Oeste 560", distrito: "Miraflores",
    alergias: [],
    problemasMedicos: [
      { descripcion: "Gota hiperuricémica", estado: "activo" as const, fechaInicio: new Date("2022-10-03") },
    ],
    medicamentosHabituales: [
      { nombre: "Alopurinol", dosis: "300 mg", frecuencia: "1 vez al día", activo: true },
    ],
    cirugiasPrevias: [],
    antecedentesFamiliares: [{ parentesco: "Padre", condicion: "Gota" }],
  },
  {
    nombres: "Rosa Isabel", apellidos: "Chávez Peralta",
    dni: "72341012", telefono: "987001012", correo: "rosa.chavez12@mail.com",
    fechaNacimiento: new Date("1960-10-08"), sexo: "F", estadoCivil: "CASADO",
    direccion: "Jr. Amazonas 1245", distrito: "Rímac",
    alergias: [{ sustancia: "Penicilina", reaccion: "Anafilaxia", severidad: "severa" as const }],
    problemasMedicos: [
      { descripcion: "Artritis reumatoide", estado: "activo" as const, fechaInicio: new Date("2014-05-20") },
      { descripcion: "Osteoporosis", estado: "activo" as const, fechaInicio: new Date("2020-08-15") },
    ],
    medicamentosHabituales: [
      { nombre: "Metotrexato", dosis: "15 mg", frecuencia: "Una vez por semana VO", activo: true },
      { nombre: "Ácido fólico", dosis: "5 mg", frecuencia: "6 días por semana", activo: true },
      { nombre: "Calcio + Vitamina D", dosis: "600 mg / 400 UI", frecuencia: "2 veces al día", activo: true },
    ],
    cirugiasPrevias: [{ procedimiento: "Prótesis total rodilla izquierda", fecha: new Date("2023-01-18"), hospital: "Clínica Ricardo Palma" }],
    antecedentesFamiliares: [{ parentesco: "Madre", condicion: "Artritis reumatoide" }],
  },
];

// ─── Agenda del día ───────────────────────────────────────────────────────────
// índice = índice en PACIENTES, estado y datos clínicos
const AGENDA: {
  idx: number;
  hora: string;
  subtipo: "NUEVA" | "SEGUIMIENTO";
  estado: "ATENDIDA" | "ASISTIO" | "PENDIENTE" | "CANCELADA" | "REPROGRAMADA";
  notas?: string;
  diagnostico?: string;
  notasClinicas?: string;
  motivoCancelacion?: string;
}[] = [
  // ── Mañana: ya atendidas ──────────────────────────────────────────────────
  {
    idx: 0, hora: "08:00", subtipo: "SEGUIMIENTO", estado: "ATENDIDA",
    notas: "Control de hipertensión y dislipidemia. Solicita renovación de recetas.",
    diagnostico: "I10 - Hipertensión esencial",
    notasClinicas: soap(
      "Control mensual de presión arterial. Refiere mareos ocasionales al levantarse.",
      "I10", "Hipertensión esencial (primaria)", "confirmado",
      "PA: 138/86 mmHg. FC: 74 lpm. Sin edemas. Se ajusta Losartán a 100 mg. Continuar Atorvastatina.",
      [
        { nombre: "Losartán", concentracion: "100 mg", forma: "Tableta", via: "Oral", frecuencia: "1 vez al día", duracion: "30 días" },
        { nombre: "Atorvastatina", concentracion: "20 mg", forma: "Tableta", via: "Oral", frecuencia: "Cada noche", duracion: "30 días" },
      ]
    ),
  },
  {
    idx: 2, hora: "08:30", subtipo: "SEGUIMIENTO", estado: "ATENDIDA",
    notas: "Control DM2. Refiere ardor en pies por las noches.",
    diagnostico: "E11.9 - Diabetes mellitus tipo 2",
    notasClinicas: soap(
      "Paciente refiere parestesias y ardor en ambos pies de predominio nocturno. Glucosa en ayuno: 162 mg/dL.",
      "E11.65", "Diabetes mellitus tipo 2 con hiperglucemia", "confirmado",
      "Control glucémico deficiente. Se agrega Pregabalina para neuropatía. Se solicita HbA1c y perfil lipídico.",
      [
        { nombre: "Metformina", concentracion: "850 mg", forma: "Tableta", via: "Oral", frecuencia: "Con desayuno y cena", duracion: "30 días" },
        { nombre: "Pregabalina", concentracion: "75 mg", forma: "Cápsula", via: "Oral", frecuencia: "Cada 12 horas", duracion: "30 días" },
      ]
    ),
  },
  {
    idx: 4, hora: "09:00", subtipo: "SEGUIMIENTO", estado: "ATENDIDA",
    notas: "Disnea de esfuerzo progresiva. Control EPOC.",
    diagnostico: "J44.1 - EPOC con exacerbación aguda",
    notasClinicas: soap(
      "Paciente refiere aumento de disnea en los últimos 5 días. Expectoración amarillenta. Sat O2 basal: 91%.",
      "J44.1", "EPOC con exacerbación aguda", "confirmado",
      "Exacerbación leve-moderada de EPOC. Se agrega Azitromicina y aumenta frecuencia de broncodilatador. Derivar a neumología si no mejora en 5 días.",
      [
        { nombre: "Azitromicina", concentracion: "500 mg", forma: "Tableta", via: "Oral", frecuencia: "1 vez al día", duracion: "5 días" },
        { nombre: "Salbutamol", concentracion: "100 mcg/dosis", forma: "Inhalador", via: "Inhalatoria", frecuencia: "Cada 4-6 horas", duracion: "7 días" },
        { nombre: "Prednisona", concentracion: "40 mg", forma: "Tableta", via: "Oral", frecuencia: "1 vez al día en la mañana", duracion: "5 días" },
      ]
    ),
  },
  {
    idx: 7, hora: "09:30", subtipo: "NUEVA", estado: "ATENDIDA",
    notas: "Cansancio, caída de cabello, estreñimiento. Sin diagnóstico previo de tiroides.",
    diagnostico: "E03.9 - Hipotiroidismo no especificado",
    notasClinicas: soap(
      "Paciente refiere fatiga crónica de 6 meses, caída de cabello difusa, constipación y aumento de peso de 5 kg. Solicita chequeo general.",
      "E03.9", "Hipotiroidismo, no especificado", "presuntivo",
      "Cuadro compatible con hipotiroidismo. Se solicita TSH, T4 libre y hemograma. Se inicia Levotiroxina 50 mcg empíricamente pendiente de resultados.",
      [
        { nombre: "Levotiroxina", concentracion: "50 mcg", forma: "Tableta", via: "Oral", frecuencia: "En ayunas 30 min antes del desayuno", duracion: "30 días" },
      ]
    ),
  },
  // ── Cancelada ────────────────────────────────────────────────────────────
  {
    idx: 3, hora: "10:00", subtipo: "NUEVA", estado: "CANCELADA",
    notas: "Consulta general programada.",
    motivoCancelacion: "Paciente llamó para cancelar. No puede asistir por viaje de emergencia.",
  },
  // ── En sala (ya llegaron, esperando) ─────────────────────────────────────
  {
    idx: 6, hora: "10:30", subtipo: "SEGUIMIENTO", estado: "ASISTIO",
    notas: "Control de insuficiencia renal. Traer resultados de laboratorio reciente.",
  },
  {
    idx: 11, hora: "11:00", subtipo: "SEGUIMIENTO", estado: "ASISTIO",
    notas: "Dolor articular generalizado. Evaluación de artritis reumatoide.",
  },
  // ── Pendientes tarde ──────────────────────────────────────────────────────
  {
    idx: 1, hora: "11:30", subtipo: "NUEVA", estado: "PENDIENTE",
    notas: "Palidez, cansancio, mareo. Sospecha de anemia.",
  },
  {
    idx: 5, hora: "12:00", subtipo: "NUEVA", estado: "PENDIENTE",
    notas: "Cefalea intensa recurrente. Descartar migraña.",
  },
  {
    idx: 8, hora: "14:00", subtipo: "NUEVA", estado: "PENDIENTE",
    notas: "Chequeo general anual. Sin antecedentes relevantes.",
  },
  {
    idx: 9, hora: "14:30", subtipo: "SEGUIMIENTO", estado: "PENDIENTE",
    notas: "Control de asma. Trae espirometría reciente.",
  },
  {
    idx: 10, hora: "15:00", subtipo: "SEGUIMIENTO", estado: "PENDIENTE",
    notas: "Dolor en articulación metatarsofalángica. Posible brote de gota.",
  },
  {
    idx: 3, hora: "16:00", subtipo: "NUEVA", estado: "REPROGRAMADA",
    notas: "Consulta reprogramada desde sesión anterior.",
  },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
async function seedDiaLaboral() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("❌ Falta MONGODB_URI en .env"); process.exit(1); }

  await mongoose.connect(uri);
  console.log("✅ Conectado a MongoDB\n");

  // 1. Verificar doctor
  const doctor = await Doctor.findById(DOCTOR_ID);
  if (!doctor) {
    console.error(`❌ Doctor con ID ${DOCTOR_ID} no encontrado.`);
    await mongoose.disconnect(); process.exit(1);
  }
  console.log(`👨‍⚕️  Doctor: ${doctor.nombres} ${doctor.apellidos}\n`);

  // 2. Crear / recuperar pacientes (upsert por DNI)
  console.log("── Pacientes ───────────────────────────────────────────────────");
  const pacienteIds: mongoose.Types.ObjectId[] = [];

  for (const datos of PACIENTES) {
    let pac = await Paciente.findOne({ dni: datos.dni });
    if (pac) {
      Object.assign(pac, datos);
      await pac.save();
      console.log(`  ♻️  ${datos.nombres} ${datos.apellidos} (${datos.dni})`);
    } else {
      pac = await Paciente.create(datos);
      console.log(`  ✅ ${datos.nombres} ${datos.apellidos} (${datos.dni})`);
    }
    pacienteIds.push(pac._id as mongoose.Types.ObjectId);
  }

  // 3. Limpiar citas de HOY del doctor Jasmen
  console.log("\n── Citas ───────────────────────────────────────────────────────");
  const fechaHoy = hoy();
  const fechaManana = new Date(fechaHoy); fechaManana.setDate(fechaManana.getDate() + 1);

  const deleted = await Cita.deleteMany({
    doctorId: new mongoose.Types.ObjectId(DOCTOR_ID),
    fecha: { $gte: fechaHoy, $lt: fechaManana },
  });
  console.log(`  🗑️  ${deleted.deletedCount} citas de hoy eliminadas\n`);

  // 4. Insertar nueva agenda
  const citasACrear = AGENDA.map(slot => ({
    pacienteId:   pacienteIds[slot.idx],
    doctorId:     new mongoose.Types.ObjectId(DOCTOR_ID),
    fecha:        fechaHoy,
    hora:         slot.hora,
    tipo:         "CONSULTA",
    subtipoCita:  slot.subtipo,
    estado:       slot.estado,
    notas:        slot.notas ?? "",
    ...(slot.diagnostico    ? { diagnostico:    slot.diagnostico    } : {}),
    ...(slot.notasClinicas  ? { notasClinicas:  slot.notasClinicas  } : {}),
    ...(slot.motivoCancelacion ? { motivoCancelacion: slot.motivoCancelacion } : {}),
    ...(slot.estado === "ATENDIDA" ? {
      firma: {
        medicoId:       new mongoose.Types.ObjectId(DOCTOR_ID),
        medicoNombre:   `${doctor.nombres} ${doctor.apellidos}`,
        numeroCMP:      (doctor as any).cmp ?? "99999",
        fechaHoraFirma: new Date(),
      },
    } : {}),
  }));

  const creadas = await Cita.insertMany(citasACrear);
  console.log(`  ✅ ${creadas.length} citas creadas para hoy:\n`);

  const estadoEmoji: Record<string, string> = {
    ATENDIDA: "✔️ ", ASISTIO: "🟡", PENDIENTE: "🕐", CANCELADA: "✖️ ", REPROGRAMADA: "🔄",
  };
  for (const [i, slot] of AGENDA.entries()) {
    const pac = PACIENTES[slot.idx];
    console.log(`  ${estadoEmoji[slot.estado] ?? "·"} ${slot.hora}  ${pac.nombres} ${pac.apellidos}  [${slot.estado}]`);
  }

  console.log("\n────────────────────────────────────────────────────────────────");
  console.log("✅ Día laboral cargado correctamente.");
  console.log(`   Médico  : Dr. ${doctor.nombres} ${doctor.apellidos}`);
  console.log(`   Fecha   : ${fechaHoy.toISOString().split("T")[0]}`);
  console.log(`   Citas   : ${creadas.length} (4 atendidas · 1 cancelada · 2 en sala · 5 pendientes · 1 reprogramada)`);
  console.log("────────────────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedDiaLaboral().catch(async err => {
  console.error("❌ Error fatal:", err);
  await mongoose.disconnect();
  process.exit(1);
});
