/**
 * seedExamenes.ts
 * Inserta el catálogo base de exámenes de laboratorio con nombres agrupados y profesionales.
 * NO borra especialidades ni doctores existentes.
 * Ejecutar: npx ts-node src/config/seedExamenes.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { ExamenLaboratorio } from "../models/ExamenLaboratorio";

const catalogo = [
  // ── HEMATOLOGÍA ──────────────────────────────────────────────────────────
  {
    nombre: "Biometría Hemática Completa",
    tipo: "HEMATOLOGIA",
    descripcion: "Recuento completo de células sanguíneas: eritrocitos, leucocitos, plaquetas, hemoglobina y hematocrito.",
    instrucciones: "Presentarse en ayunas estricto de 8 a 12 horas. No consumir agua con gas ni jugos.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Perfil de Coagulación",
    tipo: "HEMATOLOGIA",
    descripcion: "Evaluación del sistema de hemostasia: tiempo de protrombina, TTPA y tiempo de sangría.",
    instrucciones: "Presentarse en ayunas de 4 a 6 horas. No tomar anticoagulantes las 24 horas previas salvo indicación médica.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Tipificación Sanguínea y Factor Rh",
    tipo: "HEMATOLOGIA",
    descripcion: "Determinación de grupo sanguíneo ABO y factor Rh.",
    instrucciones: "No requiere ayunas. Puede presentarse en cualquier momento del horario de atención.\nHorario de atención: 7:00 a.m. – 12:00 p.m.",
    validezDias: 7,
  },
  {
    nombre: "Velocidad de Eritrosedimentación (VSG)",
    tipo: "HEMATOLOGIA",
    descripcion: "Marcador inespecífico de inflamación sistémica.",
    instrucciones: "Presentarse en ayunas de 4 horas.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },

  // ── BIOQUÍMICA ───────────────────────────────────────────────────────────
  {
    nombre: "Perfil Glucémico",
    tipo: "BIOQUIMICA",
    descripcion: "Evaluación del metabolismo de la glucosa: glucosa en ayunas y hemoglobina glicosilada (HbA1c).",
    instrucciones: "Presentarse en ayunas estricto de 8 a 12 horas. Evitar ejercicio intenso el día previo.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Curva de Tolerancia a la Glucosa",
    tipo: "BIOQUIMICA",
    descripcion: "Evaluación de respuesta glucémica con carga oral de 75 g de glucosa (tomas a 0, 1 y 2 horas).",
    instrucciones: "Ayunas estrictas de 10 a 12 horas. Presentarse a las 7:00 a.m. puntualmente. No fumar ni realizar actividad física durante la prueba. El proceso dura aproximadamente 2 horas.\nHorario de inicio: 7:00 a.m. (única entrada).",
    validezDias: 7,
  },
  {
    nombre: "Perfil Lipídico",
    tipo: "BIOQUIMICA",
    descripcion: "Evaluación del metabolismo de lípidos: colesterol total, HDL, LDL y triglicéridos.",
    instrucciones: "Presentarse en ayunas estricto de 12 a 14 horas. Evitar alcohol y comidas grasas 48 horas antes.\nHorario de atención: 7:00 a.m. – 9:30 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Perfil Hepático",
    tipo: "BIOQUIMICA",
    descripcion: "Evaluación de la función hepática: TGO, TGP, fosfatasa alcalina, bilirrubinas y proteínas totales.",
    instrucciones: "Presentarse en ayunas de 8 a 10 horas. Evitar alcohol 72 horas antes y medicamentos hepatotóxicos salvo indicación médica.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Perfil Renal",
    tipo: "BIOQUIMICA",
    descripcion: "Evaluación de la función renal: urea, creatinina y ácido úrico sérico.",
    instrucciones: "Presentarse en ayunas de 8 horas. Mantener ingesta hídrica habitual. Evitar ejercicio intenso el día previo.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Electrolitos Séricos",
    tipo: "BIOQUIMICA",
    descripcion: "Determinación de sodio, potasio y cloro en sangre.",
    instrucciones: "Presentarse en ayunas de 4 a 6 horas.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Proteína C Reactiva (PCR)",
    tipo: "BIOQUIMICA",
    descripcion: "Marcador sérico de inflamación aguda.",
    instrucciones: "Presentarse en ayunas de 4 horas.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Antígeno Prostático Específico (PSA)",
    tipo: "BIOQUIMICA",
    descripcion: "Marcador tumoral para evaluación prostática (PSA total y libre).",
    instrucciones: "Presentarse en ayunas de 8 horas. Abstenerse de relaciones sexuales y actividad física vigorosa 48 horas antes. No realizarse tacto rectal ni ecografía prostática los 7 días previos.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },

  // ── ORINA ─────────────────────────────────────────────────────────────────
  {
    nombre: "Examen General de Orina",
    tipo: "ORINA",
    descripcion: "Análisis físico, químico y microscópico de la orina.",
    instrucciones: "Recolectar la primera orina de la mañana. Limpiar bien la zona antes de la toma. Descartar el primer chorro y recolectar el chorro medio en el frasco estéril entregado por el laboratorio. Entregar dentro de las 2 horas siguientes.\nHorario de recepción de muestras: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Urocultivo y Antibiograma",
    tipo: "ORINA",
    descripcion: "Cultivo bacteriológico con identificación del agente y prueba de sensibilidad antibiótica.",
    instrucciones: "Recolectar la primera orina de la mañana con técnica aséptica rigurosa. No orinar por al menos 4 horas antes. No tomar antibióticos en las 72 horas previas salvo indicación médica. Frasco estéril entregado por el laboratorio.\nHorario de recepción de muestras: 7:00 a.m. – 9:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Microalbuminuria en Orina de 24 Horas",
    tipo: "ORINA",
    descripcion: "Detección de albúmina urinaria para seguimiento renal y cardiovascular.",
    instrucciones: "Recolección de orina durante 24 horas completas. Se entregará frasco especial. El primer día desechar la primera orina de la mañana y anotar la hora; recolectar toda la orina siguiente hasta la misma hora del día siguiente. Mantener el frasco refrigerado.\nEntregar la muestra al día siguiente por la mañana.",
    validezDias: 7,
  },

  // ── HECES ─────────────────────────────────────────────────────────────────
  {
    nombre: "Examen Coproparasitológico",
    tipo: "HECES",
    descripcion: "Búsqueda de parásitos, quistes, huevos y protozoos en heces.",
    instrucciones: "Recolectar la primera deposición de la mañana. Tomar una pequeña porción en el frasco estéril entregado por el laboratorio. No contaminar la muestra con orina. Entregar dentro de las 2 horas siguientes.\nHorario de recepción de muestras: 7:00 a.m. – 9:30 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Sangre Oculta en Heces",
    tipo: "HECES",
    descripcion: "Detección de sangrado gastrointestinal oculto.",
    instrucciones: "Evitar 3 días antes: carne roja, antiinflamatorios (ibuprofeno, aspirina), vitamina C y verduras de alto contenido en peroxidasa (brócoli, nabo). Recolectar heces de la mañana en el frasco entregado por el laboratorio.\nHorario de recepción de muestras: 7:00 a.m. – 9:30 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Coprocultivo",
    tipo: "HECES",
    descripcion: "Cultivo bacteriológico de heces para identificar patógenos entéricos.",
    instrucciones: "Recolectar la primera deposición de la mañana en el frasco estéril. No tomar antibióticos 72 horas antes. Evitar laxantes y enemas. Entregar inmediatamente.\nHorario de recepción de muestras: 7:00 a.m. – 9:00 a.m.",
    validezDias: 7,
  },

  // ── MICROBIOLOGÍA ─────────────────────────────────────────────────────────
  {
    nombre: "Cultivo de Secreción y Antibiograma",
    tipo: "MICROBIOLOGIA",
    descripcion: "Identificación del agente infeccioso en secreción (herida, faringe, oído u otro sitio indicado) con prueba de sensibilidad antibiótica.",
    instrucciones: "El médico o el técnico de laboratorio tomará la muestra durante la consulta. No aplicar antisépticos en la zona al menos 12 horas antes. No tomar antibióticos en las 72 horas previas salvo indicación médica.\nCoordinación directa con el laboratorio.",
    validezDias: 7,
  },
  {
    nombre: "Baciloscopía para Tuberculosis (BK)",
    tipo: "MICROBIOLOGIA",
    descripcion: "Búsqueda de bacilos ácido-alcohol resistentes (BAAR) en esputo.",
    instrucciones: "Se requieren 3 muestras de esputo en días consecutivos. La muestra debe tomarse por la mañana, en ayunas, con un esfuerzo de tos profunda. Escupir directamente en el frasco estéril. No es saliva.\nHorario de recepción: 7:00 a.m. – 9:00 a.m.",
    validezDias: 7,
  },

  // ── INMUNOLOGÍA / SEROLOGÍA ───────────────────────────────────────────────
  {
    nombre: "Serología para VIH (Prueba Rápida / ELISA)",
    tipo: "INMUNOLOGIA",
    descripcion: "Detección de anticuerpos anti-VIH 1 y 2.",
    instrucciones: "Presentarse en ayunas de 4 horas. Se brindará consejería pre y post prueba conforme al protocolo del Ministerio de Salud.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Serología para Sífilis (VDRL / RPR)",
    tipo: "INMUNOLOGIA",
    descripcion: "Detección de anticuerpos no treponémicos para tamizaje de sífilis.",
    instrucciones: "Presentarse en ayunas de 4 horas. Evitar alcohol 24 horas antes.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Serología para Hepatitis B (HBsAg)",
    tipo: "INMUNOLOGIA",
    descripcion: "Detección del antígeno de superficie del virus de la hepatitis B.",
    instrucciones: "Presentarse en ayunas de 4 horas.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Serología para Hepatitis C (Anti-VHC)",
    tipo: "INMUNOLOGIA",
    descripcion: "Detección de anticuerpos contra el virus de la hepatitis C.",
    instrucciones: "Presentarse en ayunas de 4 horas.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Factor Reumatoide",
    tipo: "INMUNOLOGIA",
    descripcion: "Detección de autoanticuerpos IgM anti-IgG, marcador de artritis reumatoide.",
    instrucciones: "Presentarse en ayunas de 4 a 8 horas.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Anticuerpos Antinucleares (ANA)",
    tipo: "INMUNOLOGIA",
    descripcion: "Panel de autoanticuerpos para evaluación de enfermedades autoinmunes sistémicas.",
    instrucciones: "Presentarse en ayunas de 8 horas.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Prueba de Embarazo en Sangre (Beta-HCG Cuantitativa)",
    tipo: "INMUNOLOGIA",
    descripcion: "Determinación cuantitativa de gonadotropina coriónica humana en suero.",
    instrucciones: "Presentarse en ayunas de 4 horas.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },

  // ── HORMONAS ──────────────────────────────────────────────────────────────
  {
    nombre: "Perfil Tiroideo",
    tipo: "HORMONAS",
    descripcion: "Evaluación de la función tiroidea: TSH, T3 libre y T4 libre.",
    instrucciones: "Presentarse en ayunas estricto de 8 horas. No tomar medicación tiroidea (levotiroxina, metimazol) el día del examen salvo indicación médica.\nHorario de atención: 7:00 a.m. – 10:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Perfil Hormonal Reproductivo Femenino",
    tipo: "HORMONAS",
    descripcion: "Evaluación del eje hormonal: FSH, LH, estradiol y prolactina. Se indica el día del ciclo menstrual según prescripción médica.",
    instrucciones: "Presentarse en ayunas estricto de 8 a 12 horas. Evitar relaciones sexuales y estimulación mamaria 24 horas antes (reduce prolactina falsamente elevada). Venir en reposo, sin estrés.\nHorario de atención: 7:00 a.m. – 9:30 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Testosterona Total y Libre",
    tipo: "HORMONAS",
    descripcion: "Determinación de andrógenos en suero para evaluación del eje hipotálamo-hipofisario-gonadal masculino.",
    instrucciones: "Presentarse en ayunas de 8 horas. Toma de muestra preferentemente entre 7:00 a.m. y 9:00 a.m. (nivel máximo matutino).\nHorario de atención: 7:00 a.m. – 9:00 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Cortisol Sérico Basal",
    tipo: "HORMONAS",
    descripcion: "Determinación de cortisol para evaluación del eje hipotálamo-hipofisario-suprarrenal.",
    instrucciones: "Presentarse en ayunas de 8 horas. Toma de muestra estrictamente a las 8:00 a.m. (pico cortisólico matutino). Evitar ejercicio intenso el día previo.\nHorario de atención: 7:00 a.m. – 8:30 a.m.",
    validezDias: 7,
  },
  {
    nombre: "Insulina Basal e Índice HOMA",
    tipo: "HORMONAS",
    descripcion: "Evaluación de resistencia a la insulina mediante insulina sérica en ayunas y cálculo del índice HOMA-IR.",
    instrucciones: "Presentarse en ayunas estricto de 10 a 12 horas. Evitar ejercicio intenso el día previo.\nHorario de atención: 7:00 a.m. – 9:00 a.m.",
    validezDias: 7,
  },

  // ── IMAGEN / PROCEDIMIENTOS ───────────────────────────────────────────────
  {
    nombre: "Ecografía Abdominal",
    tipo: "IMAGEN",
    descripcion: "Evaluación ecográfica de órganos abdominales: hígado, vesícula, vías biliares, páncreas, bazo y riñones.",
    instrucciones: "Ayunas estrictas de 6 horas (sólidos y líquidos). No fumar ni masticar chicle. Puede tomar medicamentos indispensables con un sorbo de agua.\nHorario de atención: según agenda de ecografías.",
    validezDias: 7,
  },
  {
    nombre: "Ecografía Pélvica y Transvaginal",
    tipo: "IMAGEN",
    descripcion: "Evaluación ecográfica del útero, ovarios y estructuras pélvicas.",
    instrucciones: "Vejiga llena para ecografía transabdominal (beber 1 litro de agua 1 hora antes y no orinar). Para ecografía transvaginal la vejiga debe estar vacía. Seguir la indicación específica del médico.\nHorario de atención: según agenda de ecografías.",
    validezDias: 7,
  },
  {
    nombre: "Ecografía Obstétrica",
    tipo: "IMAGEN",
    descripcion: "Control ecográfico del embarazo: biometría fetal, líquido amniótico, placenta y frecuencia cardiaca fetal.",
    instrucciones: "Para el primer trimestre: vejiga semillena (beber medio litro de agua 30 minutos antes). Segundo y tercer trimestre: no requiere preparación especial.\nHorario de atención: según agenda de ecografías.",
    validezDias: 7,
  },
  {
    nombre: "Ecografía de Tiroides y Paratiroides",
    tipo: "IMAGEN",
    descripcion: "Evaluación ecográfica de la glándula tiroides y paratiroides.",
    instrucciones: "No requiere ayunas ni preparación especial. Usar ropa de cuello amplio o sin cuello.\nHorario de atención: según agenda de ecografías.",
    validezDias: 7,
  },
  {
    nombre: "Ecografía Renal y de Vías Urinarias",
    tipo: "IMAGEN",
    descripcion: "Evaluación ecográfica de riñones, uréteres y vejiga.",
    instrucciones: "Vejiga llena (beber 1 litro de agua 1 hora antes y no orinar). En caso de evaluar solo riñones sin vejiga se puede tomar la muestra en ayunas.\nHorario de atención: según agenda de ecografías.",
    validezDias: 7,
  },
  {
    nombre: "Radiografía de Tórax",
    tipo: "IMAGEN",
    descripcion: "Estudio radiológico de campo pulmonar, silueta cardíaca y estructuras torácicas.",
    instrucciones: "No requiere ayunas. Retirar collares, aretes y prendas con metal en el tórax. Informar al técnico si está embarazada.\nHorario de atención: según agenda de radiología.",
    validezDias: 7,
  },
  {
    nombre: "Electrocardiograma (ECG)",
    tipo: "IMAGEN",
    descripcion: "Registro de la actividad eléctrica del corazón en reposo.",
    instrucciones: "No requiere ayunas. Evitar cremas o lociones en tórax, brazos y piernas. Usar ropa cómoda de dos piezas para facilitar el acceso. Evitar ejercicio intenso la hora previa.\nHorario de atención: según agenda.",
    validezDias: 7,
  },
  {
    nombre: "Espirometría",
    tipo: "IMAGEN",
    descripcion: "Medición de la función ventilatoria mediante flujos y volúmenes pulmonares.",
    instrucciones: "No fumar al menos 4 horas antes. No usar broncodilatadores de acción corta 4 horas antes ni de acción larga 12 horas antes (salvo indicación médica). No consumir alcohol ni realizar ejercicio intenso el día del examen. Usar ropa holgada.\nHorario de atención: según agenda.",
    validezDias: 7,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Conectado a MongoDB");

    await ExamenLaboratorio.deleteMany({});
    console.log("🗑️  Catálogo de exámenes limpiado");

    const creados = await ExamenLaboratorio.insertMany(catalogo);
    console.log(`✅ ${creados.length} exámenes insertados`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en seedExamenes:", error);
    process.exit(1);
  }
}

seed();
