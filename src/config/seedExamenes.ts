/**
 * seedExamenes.ts
 * Inserta el catálogo base de exámenes de laboratorio.
 * NO borra especialidades ni doctores existentes.
 * Ejecutar: npx ts-node src/config/seedExamenes.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { ExamenLaboratorio } from "../models/ExamenLaboratorio";

const catalogo = [
  // ── HEMATOLOGÍA ──────────────────────────────────────────
  { nombre: "Hemograma Completo",         tipo: "HEMATOLOGIA", unidad: "células/µL", descripcion: "Recuento completo de células sanguíneas" },
  { nombre: "Hematocrito",                tipo: "HEMATOLOGIA", unidad: "%",          referenciaMin: 36, referenciaMax: 54 },
  { nombre: "Hemoglobina",                tipo: "HEMATOLOGIA", unidad: "g/dL",       referenciaMin: 12, referenciaMax: 17 },
  { nombre: "Plaquetas",                  tipo: "HEMATOLOGIA", unidad: "x10³/µL",    referenciaMin: 150, referenciaMax: 400 },
  { nombre: "Tiempo de Coagulación",      tipo: "HEMATOLOGIA", unidad: "min",        referenciaMin: 2, referenciaMax: 8 },
  { nombre: "Tiempo de Sangría",          tipo: "HEMATOLOGIA", unidad: "min",        referenciaMin: 1, referenciaMax: 3 },
  { nombre: "Grupo Sanguíneo y Factor Rh",tipo: "HEMATOLOGIA", descripcion: "Determinación de grupo ABO y Rh" },

  // ── BIOQUÍMICA ───────────────────────────────────────────
  { nombre: "Glucosa en Ayunas",          tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMin: 70, referenciaMax: 100 },
  { nombre: "Glucosa Post Prandial",      tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMax: 140 },
  { nombre: "Hemoglobina Glicosilada (HbA1c)", tipo: "BIOQUIMICA", unidad: "%", referenciaMax: 5.7, descripcion: "Control glucémico de 3 meses" },
  { nombre: "Colesterol Total",           tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMax: 200 },
  { nombre: "Colesterol HDL",             tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMin: 40, descripcion: "Colesterol bueno" },
  { nombre: "Colesterol LDL",             tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMax: 130, descripcion: "Colesterol malo" },
  { nombre: "Triglicéridos",              tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMax: 150 },
  { nombre: "Urea",                       tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMin: 15, referenciaMax: 45 },
  { nombre: "Creatinina",                 tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMin: 0.6, referenciaMax: 1.2 },
  { nombre: "Ácido Úrico",                tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMin: 2.4, referenciaMax: 7.0 },
  { nombre: "TGO (AST)",                  tipo: "BIOQUIMICA", unidad: "U/L",    referenciaMax: 40 },
  { nombre: "TGP (ALT)",                  tipo: "BIOQUIMICA", unidad: "U/L",    referenciaMax: 40 },
  { nombre: "Fosfatasa Alcalina",         tipo: "BIOQUIMICA", unidad: "U/L",    referenciaMin: 44, referenciaMax: 147 },
  { nombre: "Bilirrubina Total",          tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMax: 1.2 },
  { nombre: "Bilirrubina Directa",        tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMax: 0.3 },
  { nombre: "Bilirrubina Indirecta",      tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMax: 0.9 },
  { nombre: "Proteínas Totales",          tipo: "BIOQUIMICA", unidad: "g/dL",   referenciaMin: 6.4, referenciaMax: 8.3 },
  { nombre: "Albúmina",                   tipo: "BIOQUIMICA", unidad: "g/dL",   referenciaMin: 3.5, referenciaMax: 5.0 },
  { nombre: "Calcio Sérico",              tipo: "BIOQUIMICA", unidad: "mg/dL",  referenciaMin: 8.5, referenciaMax: 10.5 },
  { nombre: "Sodio (Na+)",                tipo: "BIOQUIMICA", unidad: "mEq/L",  referenciaMin: 136, referenciaMax: 145 },
  { nombre: "Potasio (K+)",               tipo: "BIOQUIMICA", unidad: "mEq/L",  referenciaMin: 3.5, referenciaMax: 5.1 },
  { nombre: "Cloro (Cl-)",                tipo: "BIOQUIMICA", unidad: "mEq/L",  referenciaMin: 98, referenciaMax: 107 },
  { nombre: "PCR (Proteína C Reactiva)",  tipo: "BIOQUIMICA", unidad: "mg/L",   referenciaMax: 5, descripcion: "Marcador de inflamación" },
  { nombre: "Velocidad de Sedimentación (VSG)", tipo: "BIOQUIMICA", unidad: "mm/h", referenciaMax: 20 },
  { nombre: "PSA Total",                  tipo: "BIOQUIMICA", unidad: "ng/mL",  referenciaMax: 4.0, descripcion: "Antígeno prostático específico" },

  // ── ORINA ─────────────────────────────────────────────────
  { nombre: "Examen de Orina Completo",   tipo: "ORINA", descripcion: "Análisis físico, químico y microscópico" },
  { nombre: "Urocultivo",                 tipo: "ORINA", descripcion: "Cultivo bacteriológico de orina" },
  { nombre: "Microalbuminuria",           tipo: "ORINA", unidad: "mg/24h", referenciaMax: 30 },
  { nombre: "Depuración de Creatinina",   tipo: "ORINA", unidad: "mL/min", referenciaMin: 90 },

  // ── HECES ─────────────────────────────────────────────────
  { nombre: "Examen de Heces Completo",   tipo: "HECES", descripcion: "Coproparasitológico y coprocultivo" },
  { nombre: "Sangre Oculta en Heces",     tipo: "HECES", referenciaTexto: "Negativo" },

  // ── MICROBIOLOGÍA ─────────────────────────────────────────
  { nombre: "Cultivo de Secreción",       tipo: "MICROBIOLOGIA", descripcion: "Antibiograma incluido" },
  { nombre: "Baciloscopía (BK)",          tipo: "MICROBIOLOGIA", referenciaTexto: "Negativo", descripcion: "Tuberculosis" },

  // ── INMUNOLOGÍA / SEROLOGÍA ───────────────────────────────
  { nombre: "VIH (ELISA)",                tipo: "INMUNOLOGIA", referenciaTexto: "No reactivo" },
  { nombre: "VDRL (Sífilis)",             tipo: "INMUNOLOGIA", referenciaTexto: "No reactivo" },
  { nombre: "Hepatitis B (HBsAg)",        tipo: "INMUNOLOGIA", referenciaTexto: "Negativo" },
  { nombre: "Hepatitis C (Anti-VHC)",     tipo: "INMUNOLOGIA", referenciaTexto: "Negativo" },
  { nombre: "Factor Reumatoide",          tipo: "INMUNOLOGIA", unidad: "UI/mL", referenciaMax: 14 },
  { nombre: "ANA (Anticuerpos Antinucleares)", tipo: "INMUNOLOGIA", referenciaTexto: "Negativo" },
  { nombre: "Test de Embarazo (Beta-HCG)",tipo: "INMUNOLOGIA", referenciaTexto: "Negativo / Positivo" },

  // ── HORMONAS ──────────────────────────────────────────────
  { nombre: "TSH",                        tipo: "HORMONAS", unidad: "µIU/mL", referenciaMin: 0.4, referenciaMax: 4.0 },
  { nombre: "T3 Libre",                   tipo: "HORMONAS", unidad: "pg/mL",  referenciaMin: 2.3, referenciaMax: 4.2 },
  { nombre: "T4 Libre",                   tipo: "HORMONAS", unidad: "ng/dL",  referenciaMin: 0.8, referenciaMax: 1.8 },
  { nombre: "Testosterona Total",         tipo: "HORMONAS", unidad: "ng/dL" },
  { nombre: "Estradiol",                  tipo: "HORMONAS", unidad: "pg/mL" },
  { nombre: "FSH",                        tipo: "HORMONAS", unidad: "mUI/mL" },
  { nombre: "LH",                         tipo: "HORMONAS", unidad: "mUI/mL" },
  { nombre: "Prolactina",                 tipo: "HORMONAS", unidad: "ng/mL",  referenciaMin: 2, referenciaMax: 18 },
  { nombre: "Cortisol",                   tipo: "HORMONAS", unidad: "µg/dL",  referenciaMin: 6, referenciaMax: 23 },
  { nombre: "Insulina Basal",             tipo: "HORMONAS", unidad: "µUI/mL", referenciaMax: 25 },

  // ── IMAGEN ────────────────────────────────────────────────
  { nombre: "Ecografía Abdominal",        tipo: "IMAGEN" },
  { nombre: "Ecografía Pélvica",          tipo: "IMAGEN" },
  { nombre: "Ecografía Obstétrica",       tipo: "IMAGEN" },
  { nombre: "Ecografía Tiroides",         tipo: "IMAGEN" },
  { nombre: "Ecografía Renal",            tipo: "IMAGEN" },
  { nombre: "Radiografía de Tórax",       tipo: "IMAGEN" },
  { nombre: "Electrocardiograma (ECG)",   tipo: "IMAGEN" },
  { nombre: "Espirometría",               tipo: "IMAGEN" },
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
