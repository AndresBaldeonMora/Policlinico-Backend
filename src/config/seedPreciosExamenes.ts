import { ExamenLaboratorioImagen } from "../models/ExamenLaboratorioImagen";

const PRECIOS_POR_NOMBRE: Record<string, number> = {
  // Hematología
  "Hemograma Completo (Biometría Hemática)":         30,
  "Perfil de Coagulación (TP, TPA, Fibrinógeno)":    50,
  "Tipificación Sanguínea (Grupo y Factor Rh)":      20,
  "Velocidad de Sedimentación Globular (VSG / Wintrobe)": 20,
  // Bioquímica
  "Perfil Glucémico (Glucosa en Ayunas)":            20,
  "Curva de Tolerancia a la Glucosa (PTOG 75g)":     40,
  "Perfil Lipídico Completo":                        50,
  "Perfil Hepático":                                 65,
  "Perfil Renal (Creatinina, Urea, Ácido Úrico)":   45,
  "Proteína C Reactiva (PCR)":                       30,
  "Antígeno Prostático Específico (PSA Total y Libre)": 65,
  "Electrolitos Séricos (Na, K, Cl, Ca, P)":        55,
  // Orina
  "Examen General de Orina (EGO / Uroanálisis)":     20,
  "Urocultivo con Antibiograma":                     45,
  "Microalbuminuria en Orina de 24 Horas":           40,
  // Heces
  "Coproparasitológico Seriado (Examen de Parásitos en Heces)": 25,
  "Sangre Oculta en Heces (SOH)":                   25,
  "Coprocultivo con Antibiograma":                   45,
  "Antígeno de H. pylori en Heces":                  50,
  // Microbiología
  "Cultivo de Secreción con Antibiograma":           50,
  "Baciloscopía para Tuberculosis (BK — Seriada x3)": 30,
  "Test Rápido de Dengue (NS1, IgM, IgG)":           45,
  // Inmunología
  "Prueba Rápida de VIH (Elisa / Inmunocromatografía)": 25,
  "VDRL / RPR (Sífilis)":                            25,
  "Hepatitis B (HBsAg, Anti-HBs, Anti-HBc)":        55,
  "Factor Reumatoide y Anti-CCP":                    65,
  "Beta-HCG Cuantitativa (Prueba de Embarazo)":      35,
  // Hormonas
  "Perfil Tiroideo (TSH, T3, T4 libre)":             80,
  "Perfil Hormonal Femenino (FSH, LH, Estradiol, Progesterona)": 100,
  "Testosterona Total y Libre":                      55,
  "Cortisol Sérico (Matutino y Vespertino)":         50,
  "Insulina Basal y HOMA-IR":                        55,
  // Radiografía
  "Radiografía de Tórax (PA y Lateral)":             55,
  "Radiografía de Columna Lumbar (AP y Lateral)":    55,
  "Radiografía de Extremidades (Miembro Superior o Inferior)": 45,
  "Mamografía Digital Bilateral":                   120,
  // Ecografía
  "Ecografía Abdominal Total":                       90,
  "Ecografía Pélvica (Suprapúbica o Transvaginal)":  90,
  "Ecografía Obstétrica":                           100,
  "Ecografía Renal y de Vías Urinarias":             90,
  "Ecografía Tiroidea":                              90,
  // Tomografía
  "Tomografía Computarizada de Cráneo (con y sin contraste)": 300,
  "Tomografía Computarizada de Tórax":              300,
  "Tomografía Computarizada Abdominopélvica":       350,
  // Resonancia
  "Resonancia Magnética de Cráneo (con y sin contraste)": 450,
  "Resonancia Magnética de Columna (Cervical / Dorsal / Lumbar)": 450,
  "Resonancia Magnética de Rodilla":                380,
  // Electrocardiograma
  "Electrocardiograma en Reposo (ECG de 12 Derivaciones)": 40,
  "Monitoreo Holter 24 Horas":                      200,
  // Otro
  "Glucosa Capilar (Glucómetro)":                    10,
};

// Precios por tipo como fallback si el nombre no coincide exactamente
const PRECIOS_POR_TIPO: Record<string, number> = {
  HEMATOLOGIA:        30,
  BIOQUIMICA:         40,
  ORINA:              20,
  HECES:              25,
  MICROBIOLOGIA:      45,
  INMUNOLOGIA:        45,
  HORMONAS:           65,
  RADIOGRAFIA:        55,
  ECOGRAFIA:          90,
  TOMOGRAFIA:        300,
  RESONANCIA:        430,
  ELECTROCARDIOGRAMA: 40,
  OTRO:               20,
};

export async function seedPreciosExamenes() {
  const sinPrecio = await ExamenLaboratorioImagen.countDocuments({ precio: 0 });
  if (sinPrecio === 0) return; // Ya tienen precio, no hacer nada

  console.log(`💰 Actualizando precios de ${sinPrecio} exámenes…`);
  const examenes = await ExamenLaboratorioImagen.find({ precio: 0 });

  for (const ex of examenes) {
    const precio = PRECIOS_POR_NOMBRE[ex.nombre] ?? PRECIOS_POR_TIPO[ex.tipo] ?? 25;
    await ExamenLaboratorioImagen.updateOne({ _id: ex._id }, { $set: { precio } });
  }

  console.log(`✅ Precios de exámenes actualizados.`);
}
