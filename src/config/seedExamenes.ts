/**
 * Seed del catálogo de exámenes de Laboratorio e Imagen
 *
 * Preguntas protocolares basadas en:
 *  - NTS N.° 072-MINSA/DGSP-V.01 (2009): Anemia y ajuste de hemoglobina por altitud
 *  - NTS N.° 041-MINSA/DGSP-V.01 (2019): Estrategia Nacional de Tuberculosis
 *  - RM 705-2006-MINSA: Atención integral de la gestante, tamizaje de sífilis
 *  - RM 343-2016-MINSA: Guía de práctica clínica de dislipidemias
 *  - RM 490-2018-MINSA: Screening de cáncer de mama (mamografía >40 años)
 *  - DS 009-2012-EM (IPEN): Protección radiológica en radiología diagnóstica
 *  - CLSI H3-A6: Procedimiento para colección de sangre venosa
 *  - ACR Manual on Contrast Media (2022): Uso de contraste en TC y RM
 *  - ICRP Publication 84: Protección radiológica en el embarazo
 *  - INS Perú, Manual de procedimientos para el diagnóstico de parásitos intestinales (2003)
 *  - SOPECARD / Doc. Técnico MINSA: Guía ECG y enfermedad coronaria (2011)
 *
 * Ejecución: npx ts-node src/config/seedExamenes.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { ExamenLaboratorioImagen } from "../models/ExamenLaboratorioImagen";

const examenes = [
  // ══════════════════════════════════════════════════════════════
  // HEMATOLOGÍA
  // Fuente: CLSI H3-A6; NTS N.° 072-MINSA/DGSP (2009) — altitud
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Hemograma Completo (Biometría Hemática)",
    tipo: "HEMATOLOGIA",
    descripcion: "Recuento de eritrocitos, leucocitos, plaquetas, hemoglobina y hematocrito.",
    instrucciones: "Ayuno de 4 horas. Evitar ejercicio intenso las 24 horas previas.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "hb_ayuno",
        texto: "¿El paciente está en ayuno de al menos 4 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // CLSI H3-A6: tabaquismo eleva leucocitos y hematocrito
        id: "hb_tabaquismo",
        texto: "¿El paciente fuma regularmente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // NTS 072-MINSA/DGSP (2009); CENAN-MINSA 2015: ajuste por altitud
        id: "hb_altitud",
        texto: "¿El paciente reside habitualmente a más de 3,000 metros sobre el nivel del mar?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // CLSI H3-A6: transfusión reciente altera el recuento
        id: "hb_transfusion",
        texto: "¿El paciente ha recibido una transfusión de sangre en los últimos 3 meses?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "hb_medicamentos",
        texto: "¿El paciente toma algún medicamento actualmente? (especifique)",
        tipo: "TEXTO",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Perfil de Coagulación (TP, TPA, Fibrinógeno)",
    tipo: "HEMATOLOGIA",
    descripcion: "Evaluación del sistema hemostático: tiempo de protrombina, tiempo de tromboplastina parcial activada y fibrinógeno.",
    instrucciones: "Ayuno de 4 horas. Informar uso de anticoagulantes.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "coag_ayuno",
        texto: "¿El paciente está en ayuno de al menos 4 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // CLSI H3-A6: anticoagulantes alteran directamente los resultados
        id: "coag_anticoagulantes",
        texto: "¿El paciente toma anticoagulantes (warfarina, heparina, apixabán, rivaroxabán u otros)?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Omega-3 y vitamina E tienen efecto antiagregante plaquetario (CLSI)
        id: "coag_suplementos",
        texto: "¿El paciente toma suplementos de omega-3 o vitamina E?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "coag_sangrado",
        texto: "¿El paciente tiene antecedente de sangrado anormal o trastorno de coagulación?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Tipificación Sanguínea (Grupo y Factor Rh)",
    tipo: "HEMATOLOGIA",
    descripcion: "Determinación del grupo sanguíneo ABO y factor Rh.",
    instrucciones: "No requiere ayuno.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "tipo_transfusion",
        texto: "¿El paciente ha recibido transfusiones de sangre anteriormente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Anticuerpos anti-D en gestantes Rh negativo: relevante clínicamente
        id: "tipo_embarazo",
        texto: "¿La paciente está embarazada actualmente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "tipo_trasplante",
        texto: "¿El paciente ha recibido un trasplante de órgano previamente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Velocidad de Sedimentación Globular (VSG / Wintrobe)",
    tipo: "HEMATOLOGIA",
    descripcion: "Marcador inespecífico de inflamación sistémica.",
    instrucciones: "Ayuno de 4 horas recomendado.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "vsg_ayuno",
        texto: "¿El paciente está en ayuno de al menos 4 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "vsg_infeccion",
        texto: "¿El paciente presenta fiebre, infección activa o inflamación conocida?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Ciclo menstrual eleva la VSG fisiológicamente (CLSI H3-A6)
        id: "vsg_menstruacion",
        texto: "¿La paciente se encuentra en período menstrual actualmente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        // Anemia conocida interfiere con la VSG (CLSI H3-A6)
        id: "vsg_anemia",
        texto: "¿El paciente tiene diagnóstico previo de anemia?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // BIOQUÍMICA
  // Fuente: CLSI; RM 343-2016-MINSA (dislipidemias)
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Perfil Glucémico (Glucosa en Ayunas)",
    tipo: "BIOQUIMICA",
    descripcion: "Medición de glucosa sérica en condiciones de ayuno.",
    instrucciones: "Ayuno estricto de 8 horas. Solo agua permitida.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "gluc_ayuno",
        texto: "¿El paciente lleva al menos 8 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "gluc_diabetes",
        texto: "¿El paciente tiene diagnóstico de diabetes?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "gluc_insulina",
        texto: "¿El paciente se aplica insulina u otros hipoglucemiantes?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Ejercicio intenso reduce glucemia transitoriamente (CLSI)
        id: "gluc_ejercicio",
        texto: "¿El paciente realizó ejercicio intenso en las últimas 12 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Curva de Tolerancia a la Glucosa (PTOG 75g)",
    tipo: "BIOQUIMICA",
    descripcion: "Prueba de carga de glucosa oral para diagnóstico de diabetes gestacional o intolerancia.",
    instrucciones: "Ayuno de 8 horas. Dieta libre los 3 días previos (no restricción de carbohidratos).",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "ptog_ayuno",
        texto: "¿El paciente lleva al menos 8 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ptog_dieta_libre",
        texto: "¿El paciente mantuvo dieta libre (sin restricción de carbohidratos) los 3 días anteriores?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ptog_embarazo",
        texto: "¿La paciente está embarazada? (indica tamizaje de diabetes gestacional)",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ptog_diabetes",
        texto: "¿El paciente tiene diagnóstico previo de diabetes?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Perfil Lipídico Completo",
    tipo: "BIOQUIMICA",
    descripcion: "Colesterol total, HDL, LDL, triglicéridos y VLDL.",
    instrucciones: "Ayuno de 12 horas. Evitar alcohol 48 horas antes.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "lip_ayuno",
        texto: "¿El paciente lleva al menos 12 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "lip_alcohol",
        texto: "¿El paciente consumió alcohol en las últimas 48 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // RM 343-2016-MINSA: hipotiroidismo es causa secundaria de dislipidemia
        id: "lip_hipotiroidismo",
        texto: "¿El paciente tiene diagnóstico de hipotiroidismo?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "lip_medicamentos",
        texto: "¿El paciente toma estatinas, fibratos u otros hipolipemiantes?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Perfil Hepático",
    tipo: "BIOQUIMICA",
    descripcion: "TGO, TGP, fosfatasa alcalina, bilirrubinas total/directa/indirecta, proteínas totales.",
    instrucciones: "Ayuno de 8 horas.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "hep_ayuno",
        texto: "¿El paciente lleva al menos 8 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "hep_alcohol",
        texto: "¿El paciente consume alcohol de forma habitual o consumió en los últimos 7 días?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "hep_medicamentos",
        texto: "¿El paciente toma medicamentos que afecten el hígado (paracetamol en dosis altas, metotrexato, antituberculosos, estatinas)?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "hep_hepatitis",
        texto: "¿El paciente tiene antecedente de hepatitis viral o enfermedad hepática crónica?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Perfil Renal (Creatinina, Urea, Ácido Úrico)",
    tipo: "BIOQUIMICA",
    descripcion: "Evaluación de función renal: creatinina sérica, urea, nitrógeno ureico y ácido úrico.",
    instrucciones: "Ayuno de 8 horas. Hidratación normal.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "ren_ayuno",
        texto: "¿El paciente lleva al menos 8 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Deshidratación eleva creatinina falsamente (CLSI)
        id: "ren_deshidratacion",
        texto: "¿El paciente ha tenido diarrea, vómitos o sudoración excesiva en las últimas 24 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ren_insuficiencia",
        texto: "¿El paciente tiene diagnóstico de insuficiencia renal o enfermedad renal crónica?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ren_aines",
        texto: "¿El paciente toma AINEs (ibuprofeno, naproxeno, etc.) de forma regular?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Proteína C Reactiva (PCR)",
    tipo: "BIOQUIMICA",
    descripcion: "Marcador sensible de inflamación aguda y crónica.",
    instrucciones: "No requiere ayuno.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "pcr_infeccion",
        texto: "¿El paciente presenta síntomas de infección activa (fiebre, dolor, malestar)?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "pcr_enf_cronica",
        texto: "¿El paciente tiene diagnóstico de artritis reumatoide, lupus u otra enfermedad inflamatoria crónica?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Antígeno Prostático Específico (PSA Total y Libre)",
    tipo: "BIOQUIMICA",
    descripcion: "Marcador tumoral para cáncer de próstata y seguimiento de hiperplasia benigna.",
    instrucciones: "Abstinencia sexual 48 horas antes. No realizar tacto rectal ni cistoscopia las 72 horas previas.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "psa_tacto",
        texto: "¿Se realizó tacto rectal en los últimos 3 días?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "psa_sexual",
        texto: "¿El paciente tuvo actividad sexual en las últimas 48 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "psa_prostatitis",
        texto: "¿El paciente tiene diagnóstico de prostatitis o infección urinaria activa?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Electrolitos Séricos (Na, K, Cl, Ca, P)",
    tipo: "BIOQUIMICA",
    descripcion: "Sodio, potasio, cloro, calcio y fósforo séricos.",
    instrucciones: "Ayuno de 4 horas.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "elec_ayuno",
        texto: "¿El paciente lleva al menos 4 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Diarrea y vómitos alteran Na y K significativamente (CLSI)
        id: "elec_deshidratacion",
        texto: "¿El paciente ha tenido diarrea o vómitos en las últimas 24 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "elec_diureticos",
        texto: "¿El paciente toma diuréticos o suplementos de potasio?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ORINA
  // Fuente: INS Perú, Manual de procedimientos para el diagnóstico
  // de parásitos intestinales (2003); protocolos de toma de muestra INS
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Examen General de Orina (EGO / Uroanálisis)",
    tipo: "ORINA",
    descripcion: "Análisis físico, químico y microscópico de orina.",
    instrucciones: "Primera orina de la mañana. Aseo genital previo. Muestra de chorro medio en frasco estéril.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "ego_primera_orina",
        texto: "¿La muestra corresponde a la primera orina de la mañana?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // INS Perú: higiene genital obligatoria para evitar contaminación
        id: "ego_higiene",
        texto: "¿El paciente realizó aseo genital antes de recolectar la muestra?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Ejercicio intenso causa proteinuria de esfuerzo transitoria
        id: "ego_ejercicio",
        texto: "¿El paciente realizó ejercicio físico intenso en las últimas 24 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ego_menstruacion",
        texto: "¿La paciente se encuentra en período menstrual actualmente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Urocultivo con Antibiograma",
    tipo: "ORINA",
    descripcion: "Cultivo microbiológico de orina para identificar gérmenes y determinar sensibilidad antibiótica.",
    instrucciones: "Primera orina de la mañana. Aseo genital riguroso. Frasco estéril. No tomar antibióticos 48 horas antes.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "ucul_primera_orina",
        texto: "¿La muestra es la primera orina de la mañana?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ucul_higiene",
        texto: "¿El paciente realizó aseo genital riguroso antes de recolectar la muestra?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ucul_antibioticos",
        texto: "¿El paciente está tomando antibióticos actualmente o los tomó en los últimos 7 días?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ucul_sintomas",
        texto: "¿El paciente presenta ardor al orinar, urgencia urinaria o fiebre?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Microalbuminuria en Orina de 24 Horas",
    tipo: "ORINA",
    descripcion: "Cuantificación de albúmina en orina de 24 horas para detección de nefropatía precoz.",
    instrucciones: "Recolección de orina completa de 24 horas. Primer chorro del día se descarta, luego recolectar todo hasta el día siguiente.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "alb_recoleccion",
        texto: "¿El paciente recibió instrucción sobre la técnica correcta de recolección de 24 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "alb_diabetes",
        texto: "¿El paciente tiene diagnóstico de diabetes o hipertensión?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "alb_ejercicio",
        texto: "¿El paciente realizó ejercicio intenso el día de la recolección?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "alb_infeccion_urinaria",
        texto: "¿El paciente presenta infección urinaria activa o fiebre?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // HECES
  // Fuente: INS Perú, Manual de procedimientos para el diagnóstico
  // de parásitos intestinales (2003)
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Coproparasitológico Seriado (Examen de Parásitos en Heces)",
    tipo: "HECES",
    descripcion: "Identificación de parásitos intestinales: protozoos y helmintos.",
    instrucciones: "3 muestras en días alternos. Frasco limpio con tapa. No usar laxantes ni antiparasitarios los 7 días previos.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        // INS Perú (2003): trofozoítos de Entamoeba histolytica mueren en <2h a temperatura ambiente
        id: "copropar_tiempo",
        texto: "¿La muestra fue recolectada hace menos de 2 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "copropar_antiparasitarios",
        texto: "¿El paciente tomó antiparasitarios en los últimos 7 días?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // INS Perú (2003): S. stercoralis y Fasciola hepatica prevalentes en zonas rurales/sierra
        id: "copropar_zona",
        texto: "¿El paciente proviene de zona rural o selva (alto riesgo de Strongyloides, Fasciola)?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "copropar_diarrea",
        texto: "¿El paciente presenta diarrea actualmente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Sangre Oculta en Heces (SOH)",
    tipo: "HECES",
    descripcion: "Detección de sangre oculta en heces para cribado de patología gastrointestinal.",
    instrucciones: "Dieta libre de carne roja, vitamina C y AINEs los 3 días previos. No tomar la muestra durante la menstruación.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "soh_carne",
        texto: "¿El paciente evitó el consumo de carne roja los 3 días anteriores?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Vitamina C causa falsos negativos (reduce el reactivo)
        id: "soh_vitamina_c",
        texto: "¿El paciente tomó suplementos de vitamina C en los últimos 3 días?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "soh_aines",
        texto: "¿El paciente tomó AINEs (ibuprofeno, aspirina) en los últimos 3 días?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "soh_menstruacion",
        texto: "¿La paciente se encuentra en período menstrual actualmente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Coprocultivo con Antibiograma",
    tipo: "HECES",
    descripcion: "Cultivo de heces para identificación de patógenos bacterianos: Salmonella, Shigella, Campylobacter, E. coli.",
    instrucciones: "Muestra fresca en frasco estéril. No usar antibióticos 48 horas antes.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        // INS Perú (2003): muestra reciente mejora el rendimiento del cultivo
        id: "ccult_fresco",
        texto: "¿La muestra fue recolectada hace menos de 2 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ccult_antibioticos",
        texto: "¿El paciente está tomando antibióticos actualmente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ccult_diarrea",
        texto: "¿El paciente presenta diarrea con sangre o moco?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Antígeno de H. pylori en Heces",
    tipo: "HECES",
    descripcion: "Detección del antígeno de Helicobacter pylori en heces. Útil para diagnóstico y control post-erradicación.",
    instrucciones: "Suspender antibióticos 2 semanas antes. Suspender inhibidores de bomba de protones 2 semanas antes. Suspender bismuto 4 semanas antes.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        // Antibióticos reducen sensibilidad de la prueba
        id: "hp_antibioticos",
        texto: "¿El paciente ha tomado antibióticos en las últimas 2 semanas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // IBP reducen carga bacteriana y generan falsos negativos
        id: "hp_ipp",
        texto: "¿El paciente toma inhibidores de bomba de protones (omeprazol, pantoprazol, etc.) actualmente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Bismuto interfiere con la prueba por hasta 4 semanas
        id: "hp_bismuto",
        texto: "¿El paciente ha tomado compuestos de bismuto en el último mes?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "hp_control",
        texto: "¿Es una prueba de control post-tratamiento erradicador?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // MICROBIOLOGÍA
  // Fuente: NTS N.° 041-MINSA/DGSP-V.01 (2019) — Tuberculosis
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Cultivo de Secreción con Antibiograma",
    tipo: "MICROBIOLOGIA",
    descripcion: "Cultivo de secreción (faríngea, herida, ótica, uretral, vaginal u otra) para identificación bacteriana y antibiograma.",
    instrucciones: "Toma de muestra por personal de salud antes de iniciar antibióticos.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "csec_antibioticos",
        texto: "¿El paciente está tomando antibióticos actualmente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "csec_zona",
        texto: "¿Cuál es la zona de la secreción a cultivar?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Faríngea", "Herida quirúrgica o úlcera", "Oído", "Uretral", "Vaginal", "Otra"],
      },
      {
        id: "csec_tiempo",
        texto: "¿Hace cuánto tiempo presentó los síntomas?",
        tipo: "SELECCION",
        obligatoria: false,
        opciones: ["Menos de 24 horas", "1 a 7 días", "Más de 7 días"],
      },
    ],
  },
  {
    nombre: "Baciloscopía para Tuberculosis (BK — Seriada x3)",
    tipo: "MICROBIOLOGIA",
    descripcion: "Examen microscópico de esputo para identificación de Mycobacterium tuberculosis. Se requieren 3 muestras seriadas.",
    instrucciones: "Muestra de esputo al despertar (mínimo 3–5 mL). Recolectar en recipiente estéril. No usar enjuague bucal previo.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "bk_tos",
        texto: "¿El paciente presenta tos por 15 días o más?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "bk_contacto",
        texto: "¿El paciente ha tenido contacto con un caso confirmado de tuberculosis?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // NTS N.° 041-MINSA/DGSP-V.01 (2019): clasifica caso nuevo vs. retreatamiento
        id: "bk_tratamiento_previo",
        texto: "¿El paciente ha recibido tratamiento para tuberculosis anteriormente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // NTS N.° 041-MINSA/DGSP-V.01 (2019): coinfección TB-VIH requiere protocolo diferenciado
        id: "bk_vih",
        texto: "¿El paciente tiene diagnóstico de VIH?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "bk_numero",
        texto: "¿Cuál es el número de muestra que entrega hoy?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Primera muestra", "Segunda muestra", "Tercera muestra"],
      },
    ],
  },
  {
    nombre: "Test Rápido de Dengue (NS1, IgM, IgG)",
    tipo: "MICROBIOLOGIA",
    descripcion: "Detección de antígeno NS1 y anticuerpos IgM/IgG para diagnóstico de dengue. Endémico en zonas costeras y selváticas del Perú.",
    instrucciones: "No requiere ayuno. Indicar fecha de inicio de fiebre.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "dengue_fiebre",
        texto: "¿Cuándo inició la fiebre del paciente?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Hoy (día 1)", "Hace 2-3 días", "Hace 4-7 días", "Hace más de 7 días"],
      },
      {
        id: "dengue_zona",
        texto: "¿El paciente reside o visitó recientemente una zona endémica de dengue (costa norte, selva)?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "dengue_viaje",
        texto: "¿El paciente viajó fuera de Lima en los últimos 15 días?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "dengue_previo",
        texto: "¿El paciente ha tenido dengue anteriormente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // INMUNOLOGÍA / SEROLOGÍA
  // Fuente: RM 705-2006-MINSA (gestantes y VDRL)
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Prueba Rápida de VIH (Elisa / Inmunocromatografía)",
    tipo: "INMUNOLOGIA",
    descripcion: "Tamizaje de anticuerpos contra VIH-1 y VIH-2.",
    instrucciones: "No requiere ayuno. Se requiere consentimiento informado firmado.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "vih_consentimiento",
        texto: "¿El paciente firmó el consentimiento informado para la prueba de VIH?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "vih_prueba_previa",
        texto: "¿El paciente ha realizado prueba de VIH anteriormente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "vih_embarazo",
        texto: "¿La paciente está embarazada? (tamizaje prenatal obligatorio)",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "VDRL / RPR (Sífilis)",
    tipo: "INMUNOLOGIA",
    descripcion: "Prueba no treponémica para diagnóstico y control de sífilis.",
    instrucciones: "No requiere ayuno. Informar tratamientos previos.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "vdrl_tratamiento",
        texto: "¿El paciente recibió tratamiento para sífilis anteriormente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // RM 705-2006-MINSA: tamizaje de sífilis en gestantes es obligatorio y de reporte
        id: "vdrl_gestante",
        texto: "¿La paciente está embarazada? (tamizaje obligatorio en gestantes — RM 705-2006-MINSA)",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "vdrl_sintomas",
        texto: "¿El paciente presenta úlceras genitales, erupciones en palmas/plantas o ganglios inflamados?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Hepatitis B (HBsAg, Anti-HBs, Anti-HBc)",
    tipo: "INMUNOLOGIA",
    descripcion: "Perfil serológico para hepatitis B: antígeno de superficie, anticuerpos de superficie y core.",
    instrucciones: "No requiere ayuno.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "hepb_vacuna",
        texto: "¿El paciente ha recibido vacuna contra hepatitis B?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "hepb_transfusion",
        texto: "¿El paciente ha recibido transfusiones de sangre o hemoderivados?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "hepb_embarazo",
        texto: "¿La paciente está embarazada? (cribado prenatal)",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Factor Reumatoide y Anti-CCP",
    tipo: "INMUNOLOGIA",
    descripcion: "Marcadores serológicos para diagnóstico de artritis reumatoide.",
    instrucciones: "No requiere ayuno.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "fr_dolor",
        texto: "¿El paciente tiene dolor articular en manos, muñecas o pies por más de 6 semanas?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "fr_rigidez",
        texto: "¿El paciente presenta rigidez matutina de más de 30 minutos?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "fr_medicamentos",
        texto: "¿El paciente toma inmunosupresores o biológicos actualmente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Beta-HCG Cuantitativa (Prueba de Embarazo)",
    tipo: "INMUNOLOGIA",
    descripcion: "Dosaje cuantitativo de gonadotropina coriónica humana para diagnóstico y seguimiento de embarazo.",
    instrucciones: "No requiere ayuno. Primera orina de la mañana para mayor concentración si es prueba en orina.",
    validezDias: 7,
    preguntasProtocolares: [
      {
        id: "bhcg_atraso",
        texto: "¿Cuántos días de atraso menstrual tiene la paciente?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Menos de 7 días", "7 a 14 días", "Más de 14 días", "No aplica / no sabe"],
      },
      {
        id: "bhcg_tratamiento_fertilidad",
        texto: "¿La paciente está en tratamiento de fertilidad con hCG exógena?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // HORMONAS
  // Fuente: Protocolo UPCH/UNMSM (2019) — biotina en TSH;
  //         SOPECARD/MINSA — cortisol circadiano
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Perfil Tiroideo (TSH, T3, T4 libre)",
    tipo: "HORMONAS",
    descripcion: "Evaluación completa de la función tiroidea: TSH ultrasensible, T3 total y T4 libre.",
    instrucciones: "No requiere ayuno. Toma de muestra preferiblemente en la mañana.",
    validezDias: 14,
    preguntasProtocolares: [
      {
        id: "tsh_levotiroxina",
        texto: "¿El paciente toma levotiroxina u otros medicamentos para la tiroides?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Biotina interfiere con ensayos inmunológicos de TSH y T4
        // (FDA Safety Communication 2017; adoptado por UPCH/UNMSM desde 2019)
        id: "tsh_biotina",
        texto: "¿El paciente toma suplementos de biotina (vitamina B7)? Suspender 72h antes.",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Exceso de yodo puede suprimir TSH — efecto Wolff-Chaikoff
        id: "tsh_yodo",
        texto: "¿El paciente recibió contraste iodado (tomografía, arteriografía) en los últimos 6 meses?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Perfil Hormonal Femenino (FSH, LH, Estradiol, Progesterona)",
    tipo: "HORMONAS",
    descripcion: "Evaluación del eje hipofisario-ovárico. Útil en ciclos irregulares, menopausia e infertilidad.",
    instrucciones: "Toma de muestra entre el día 2 y 5 del ciclo menstrual (salvo indicación médica diferente).",
    validezDias: 14,
    preguntasProtocolares: [
      {
        id: "horm_dia_ciclo",
        texto: "¿En qué día del ciclo menstrual se encuentra la paciente?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Día 2–5 (fase folicular temprana)", "Día 12–14 (ovulación)", "Día 21–23 (fase lútea)", "Sin ciclo / menopausia", "No sabe"],
      },
      {
        id: "horm_anticonceptivos",
        texto: "¿La paciente toma anticonceptivos hormonales actualmente?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Testosterona Total y Libre",
    tipo: "HORMONAS",
    descripcion: "Medición de testosterona para evaluación de hipogonadismo, síndrome de ovario poliquístico o virilización.",
    instrucciones: "Toma de muestra entre las 7 a.m. y 10 a.m. (pico circadiano de testosterona).",
    validezDias: 14,
    preguntasProtocolares: [
      {
        id: "testo_hora",
        texto: "¿La muestra se extrae antes de las 10 a.m.?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "testo_esteroides",
        texto: "¿El paciente usa esteroides anabólicos o terapia de reemplazo hormonal?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Cortisol Sérico (Matutino y Vespertino)",
    tipo: "HORMONAS",
    descripcion: "Evaluación del eje hipotálamo-hipófiso-adrenal. Diagnóstico de Cushing, Addison o insuficiencia suprarrenal.",
    instrucciones: "Cortisol matutino: muestra entre 7–9 a.m. Cortisol vespertino: entre 4–6 p.m. Sin ayuno obligatorio.",
    validezDias: 14,
    preguntasProtocolares: [
      {
        id: "cort_hora",
        texto: "¿Es la muestra de cortisol matutino (7–9 a.m.) o vespertino (4–6 p.m.)?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Matutino (7–9 a.m.)", "Vespertino (4–6 p.m.)"],
      },
      {
        id: "cort_estres",
        texto: "¿El paciente estuvo bajo estrés agudo (dolor, procedimiento, ansiedad intensa) hoy?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Trabajadores nocturnos tienen ritmo circadiano invertido (SOPECARD/MINSA 2011)
        id: "cort_turno_nocturno",
        texto: "¿El paciente trabaja en turno nocturno o tiene ciclo circadiano alterado?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "cort_corticoides",
        texto: "¿El paciente toma corticoides (prednisona, dexametasona, hidrocortisona)?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Insulina Basal y HOMA-IR",
    tipo: "HORMONAS",
    descripcion: "Insulina en ayunas para cálculo del índice de resistencia a la insulina (HOMA-IR).",
    instrucciones: "Ayuno estricto de 8 horas. No realizar ejercicio el día del examen.",
    validezDias: 14,
    preguntasProtocolares: [
      {
        id: "ins_ayuno",
        texto: "¿El paciente lleva al menos 8 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ins_insulina_exogena",
        texto: "¿El paciente se aplica insulina exógena?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ins_ejercicio",
        texto: "¿El paciente realizó ejercicio en las últimas 24 horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // RADIOGRAFÍA
  // Fuente: DS 009-2012-EM (IPEN) — protección radiológica;
  //         ICRP Publication 84 — embarazo y radiación
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Radiografía de Tórax (PA y Lateral)",
    tipo: "RADIOGRAFIA",
    descripcion: "Evaluación de campos pulmonares, silueta cardíaca y estructuras mediastínicas.",
    instrucciones: "Retirar joyas y objetos metálicos del torso. Protección de tiroides y gónadas cuando sea posible.",
    validezDias: 14,
    preguntasProtocolares: [
      {
        // DS 009-2012-EM (IPEN); ICRP Publication 84
        id: "rxtor_embarazo",
        texto: "¿La paciente podría estar embarazada o está embarazada?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // ICRP Publication 84: regla de los 10 días para minimizar riesgo en embarazo no conocido
        id: "rxtor_fum",
        texto: "¿Cuándo fue la última menstruación de la paciente?",
        tipo: "SELECCION",
        obligatoria: false,
        opciones: ["Dentro de los últimos 10 días", "Hace más de 10 días", "No aplica / menopausia"],
      },
      {
        id: "rxtor_marcapasos",
        texto: "¿El paciente tiene marcapasos, válvulas metálicas u implantes en el tórax?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Radiografía de Columna Lumbar (AP y Lateral)",
    tipo: "RADIOGRAFIA",
    descripcion: "Evaluación de columna vertebral lumbar: alineación, discos intervertebrales y estructuras óseas.",
    instrucciones: "Retirar cinturón y objetos metálicos de la zona. Protección gonadal.",
    validezDias: 14,
    preguntasProtocolares: [
      {
        id: "rxlum_embarazo",
        texto: "¿La paciente podría estar embarazada o está embarazada?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "rxlum_fum",
        texto: "¿Cuándo fue la última menstruación de la paciente?",
        tipo: "SELECCION",
        obligatoria: false,
        opciones: ["Dentro de los últimos 10 días", "Hace más de 10 días", "No aplica / menopausia"],
      },
      {
        id: "rxlum_cirugia",
        texto: "¿El paciente ha tenido cirugía de columna o tiene material metálico en la zona?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Radiografía de Extremidades (Miembro Superior o Inferior)",
    tipo: "RADIOGRAFIA",
    descripcion: "Evaluación de huesos de extremidades: fracturas, luxaciones, alteraciones articulares.",
    instrucciones: "Retirar objetos metálicos de la extremidad.",
    validezDias: 14,
    preguntasProtocolares: [
      {
        id: "rxext_embarazo",
        texto: "¿La paciente podría estar embarazada?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "rxext_zona",
        texto: "¿Cuál extremidad o región se va a radiografiar?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Miembro superior (hombro, brazo, codo, antebrazo, muñeca, mano)", "Miembro inferior (cadera, muslo, rodilla, pierna, tobillo, pie)"],
      },
      {
        id: "rxext_implante",
        texto: "¿El paciente tiene prótesis metálica o clavo intramedular en la zona?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Mamografía Digital Bilateral",
    tipo: "RADIOGRAFIA",
    descripcion: "Estudio de imagen para detección precoz de cáncer de mama. Recomendada anualmente para mujeres > 40 años según RM 490-2018-MINSA.",
    instrucciones: "No aplicar desodorante, talco ni crema en axilas o senos el día del examen. Informar última mamografía previa.",
    validezDias: 365,
    preguntasProtocolares: [
      {
        id: "mamo_embarazo",
        texto: "¿La paciente está embarazada o en período de lactancia?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "mamo_implantes",
        texto: "¿La paciente tiene implantes mamarios?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // RM 490-2018-MINSA: mamografía anual para mujeres >40
        id: "mamo_previa",
        texto: "¿La paciente tiene mamografías previas para comparación?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "mamo_sintomas",
        texto: "¿La paciente presenta nódulo palpable, secreción del pezón o dolor mamario?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ECOGRAFÍA
  // Fuente: Protocolo MINSA control prenatal; Guía AIUM
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Ecografía Abdominal Total",
    tipo: "ECOGRAFIA",
    descripcion: "Evaluación de órganos abdominales: hígado, vesícula, vías biliares, páncreas, bazo, riñones y estructuras vasculares.",
    instrucciones: "Ayuno de 6 horas. Vejiga semillena (tomar 4 vasos de agua 1 hora antes sin orinar).",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "ecab_ayuno",
        texto: "¿El paciente lleva al menos 6 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ecab_vejiga",
        texto: "¿El paciente tiene la vejiga semillena (tomó agua y no orinó)?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ecab_cirugia",
        texto: "¿El paciente ha tenido cirugías abdominales previas?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Ecografía Pélvica (Suprapúbica o Transvaginal)",
    tipo: "ECOGRAFIA",
    descripcion: "Evaluación de útero, ovarios, próstata o vejiga. Vía suprapúbica o transvaginal según indicación.",
    instrucciones: "Vejiga llena para vía suprapúbica (tomar 1 litro de agua 1 hora antes). Vejiga vacía para transvaginal.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "ecpel_via",
        texto: "¿Cuál es la vía de abordaje indicada?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Suprapúbica (vejiga llena)", "Transvaginal (vejiga vacía)", "Ambas"],
      },
      {
        id: "ecpel_vejiga",
        texto: "¿La paciente cumplió la preparación de vejiga indicada?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ecpel_menstruacion",
        texto: "¿La paciente está en período menstrual actualmente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Ecografía Obstétrica",
    tipo: "ECOGRAFIA",
    descripcion: "Control y seguimiento del embarazo: biometría fetal, placenta, líquido amniótico y anatomía fetal.",
    instrucciones: "Vejiga semillena en el primer trimestre. No requiere preparación especial después del primer trimestre.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "ecobs_semanas",
        texto: "¿Cuántas semanas de gestación tiene la paciente?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Menos de 12 semanas (primer trimestre)", "12–28 semanas (segundo trimestre)", "Más de 28 semanas (tercer trimestre)"],
      },
      {
        // Protocolo MINSA control prenatal: FUM para cálculo de edad gestacional
        id: "ecobs_fum",
        texto: "¿La paciente recuerda la fecha de su última menstruación (FUM)?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // Alto riesgo cambia el protocolo de evaluación (MINSA control prenatal)
        id: "ecobs_alto_riesgo",
        texto: "¿La paciente tiene diabetes, hipertensión, embarazo múltiple u otro factor de alto riesgo?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Ecografía Renal y de Vías Urinarias",
    tipo: "ECOGRAFIA",
    descripcion: "Evaluación de riñones, uréteres y vejiga: litiasis, quistes, hidronefrosis, tumores.",
    instrucciones: "Vejiga llena. Tomar 1 litro de agua 1 hora antes sin orinar.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "ecren_vejiga",
        texto: "¿El paciente tiene la vejiga llena (tomó agua y no orinó en la última hora)?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ecren_calculo",
        texto: "¿El paciente tiene antecedente de cálculos renales o episodios de cólico renal?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "ecren_dolor",
        texto: "¿El paciente presenta dolor lumbar o hematuria actualmente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Ecografía Tiroidea",
    tipo: "ECOGRAFIA",
    descripcion: "Evaluación morfológica de la glándula tiroides: nódulos, volumen, vascularización.",
    instrucciones: "No requiere preparación especial.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "ectir_nodulo",
        texto: "¿El paciente tiene nódulo tiroideo palpable o bocio?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "ectir_tiroides",
        texto: "¿El paciente tiene diagnóstico de hipotiroidismo, hipertiroidismo o tiroiditis?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // TOMOGRAFÍA
  // Fuente: ACR Manual on Contrast Media (2022) — contraste nefrotóxico
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Tomografía Computarizada de Cráneo (con y sin contraste)",
    tipo: "TOMOGRAFIA",
    descripcion: "Evaluación de parénquima cerebral, ventrículos, estructuras de fosa posterior y base de cráneo.",
    instrucciones: "Ayuno de 4 horas si se usará contraste. Retirar objetos metálicos de la cabeza.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "tccra_contraste",
        texto: "¿El estudio requiere contraste yodado intravenoso?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "tccra_ayuno",
        texto: "¿El paciente lleva al menos 4 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // ACR Manual on Contrast Media (2022): TFGe antes de contraste IV
        id: "tccra_renal",
        texto: "¿El paciente tiene insuficiencia renal conocida o creatinina elevada?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // ACR: metformina debe suspenderse 48h antes del contraste por riesgo de acidosis láctica
        id: "tccra_metformina",
        texto: "¿El paciente toma metformina? (suspender 48h antes si usará contraste)",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "tccra_alergia",
        texto: "¿El paciente tiene antecedente de reacción alérgica al contraste yodado?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Tomografía Computarizada de Tórax",
    tipo: "TOMOGRAFIA",
    descripcion: "Evaluación de pulmones, mediastino, pleura y vasos torácicos. Alta resolución para patología pulmonar.",
    instrucciones: "Ayuno de 4 horas si se usará contraste. Retirar objetos metálicos del tórax.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "tctor_contraste",
        texto: "¿El estudio requiere contraste yodado intravenoso?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "tctor_ayuno",
        texto: "¿El paciente lleva al menos 4 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // ACR (2022): el contraste es nefrotóxico independientemente de la zona estudiada
        id: "tctor_renal",
        texto: "¿El paciente tiene insuficiencia renal conocida o creatinina elevada?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "tctor_embarazo",
        texto: "¿La paciente podría estar embarazada?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "tctor_alergia",
        texto: "¿El paciente tiene antecedente de reacción alérgica al contraste yodado?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Tomografía Computarizada Abdominopélvica",
    tipo: "TOMOGRAFIA",
    descripcion: "Evaluación de hígado, vías biliares, páncreas, riñones, bazo, intestinos y estructuras pélvicas.",
    instrucciones: "Ayuno de 4 horas. Tomar agua o contraste oral según indicación médica.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "tcabp_contraste",
        texto: "¿El estudio requiere contraste yodado intravenoso?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "tcabp_ayuno",
        texto: "¿El paciente lleva al menos 4 horas en ayuno?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // ACR (2022): contraste IV es nefrotóxico
        id: "tcabp_renal",
        texto: "¿El paciente tiene insuficiencia renal conocida o creatinina elevada?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "tcabp_metformina",
        texto: "¿El paciente toma metformina? (suspender 48h antes si usará contraste)",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "tcabp_embarazo",
        texto: "¿La paciente podría estar embarazada?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // RESONANCIA MAGNÉTICA
  // Fuente: ACR MRI Safety Guidelines (2023)
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Resonancia Magnética de Cráneo (con y sin contraste)",
    tipo: "RESONANCIA",
    descripcion: "Estudio de parénquima cerebral, silla turca, fosa posterior y nervios craneales con alta resolución.",
    instrucciones: "Retirar todos los objetos metálicos. Duración aproximada: 30–45 minutos. Informar implantes metálicos.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        // ACR MRI Safety Guidelines: objetos ferromagnéticos son contraindicación absoluta
        id: "rmcra_marcapasos",
        texto: "¿El paciente tiene marcapasos, desfibrilador implantable u otro dispositivo cardíaco electrónico?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "rmcra_implante_coclear",
        texto: "¿El paciente tiene implante coclear u otro implante en cabeza/cuello?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "rmcra_claustrofobia",
        texto: "¿El paciente tiene claustrofobia o ansiedad en espacios cerrados?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // ACR: gadolinio contraindicado en insuficiencia renal severa
        id: "rmcra_renal",
        texto: "¿El paciente tiene insuficiencia renal o TFG < 30 mL/min?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // ACR: límite de peso para el equipo (130–150 kg según modelo)
        id: "rmcra_peso",
        texto: "¿El peso del paciente supera los 130 kg?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Resonancia Magnética de Columna (Cervical / Dorsal / Lumbar)",
    tipo: "RESONANCIA",
    descripcion: "Evaluación de médula espinal, discos intervertebrales, raíces nerviosas y estructuras paraespinales.",
    instrucciones: "Retirar objetos metálicos. Duración: 30–60 minutos.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "rmcol_marcapasos",
        texto: "¿El paciente tiene marcapasos u otro implante metálico activo?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "rmcol_cirugia",
        texto: "¿El paciente tiene material de osteosíntesis, tornillos, placas o clavos en la columna?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "rmcol_zona",
        texto: "¿Qué segmento de columna se va a estudiar?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Columna cervical", "Columna dorsal", "Columna lumbar", "Columna completa"],
      },
      {
        id: "rmcol_peso",
        texto: "¿El peso del paciente supera los 130 kg?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
  {
    nombre: "Resonancia Magnética de Rodilla",
    tipo: "RESONANCIA",
    descripcion: "Evaluación de meniscos, ligamentos, cartílago articular y estructuras óseas de la articulación de rodilla.",
    instrucciones: "No requiere preparación especial. Informar prótesis o implantes metálicos.",
    validezDias: 30,
    preguntasProtocolares: [
      {
        id: "rmrod_implante",
        texto: "¿El paciente tiene prótesis de rodilla u otro implante metálico?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "rmrod_lado",
        texto: "¿Cuál rodilla se va a estudiar?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Rodilla derecha", "Rodilla izquierda", "Ambas rodillas"],
      },
      {
        id: "rmrod_embarazo",
        texto: "¿La paciente podría estar embarazada? (precaución en primer trimestre)",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "rmrod_claustrofobia",
        texto: "¿El paciente tiene claustrofobia?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        // ACR: límite de peso del equipo
        id: "rmrod_peso",
        texto: "¿El peso del paciente supera los 130 kg?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ELECTROCARDIOGRAMA
  // Fuente: SOPECARD; Doc. Técnico MINSA — Diagnóstico y
  //         Tratamiento de la Enfermedad Coronaria (2011)
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Electrocardiograma en Reposo (ECG de 12 Derivaciones)",
    tipo: "ELECTROCARDIOGRAMA",
    descripcion: "Registro de la actividad eléctrica del corazón en 12 derivaciones estándar. Reposo absoluto durante el registro.",
    instrucciones: "Evitar cremas, lociones o aceites en el torso el día del examen. Reposo de 5 minutos previos.",
    validezDias: 14,
    preguntasProtocolares: [
      {
        // SOPECARD/MINSA 2011: ECG previo permite comparación evolutiva
        id: "ecg_antecedente_previo",
        texto: "¿El paciente tiene un electrocardiograma previo para comparación?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "ecg_antiarritmicos",
        texto: "¿El paciente toma antiarrítmicos, digoxina o betabloqueadores?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "ecg_palpitaciones",
        texto: "¿El paciente presenta palpitaciones, dolor torácico o síncope actualmente?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        // SOPECARD/MINSA 2011: IMC es dato contextual para interpretación
        id: "ecg_talla_peso",
        texto: "¿Cuál es el peso y la talla del paciente? (para cálculo de IMC)",
        tipo: "TEXTO",
        obligatoria: false,
      },
    ],
  },
  {
    nombre: "Monitoreo Holter 24 Horas",
    tipo: "ELECTROCARDIOGRAMA",
    descripcion: "Registro continuo de ECG durante 24 horas para detección de arritmias intermitentes.",
    instrucciones: "No aplicar cremas ni lociones en el tórax. Llevar diario de actividades durante el monitoreo. No bañarse con el dispositivo.",
    validezDias: 14,
    preguntasProtocolares: [
      {
        id: "holter_arritmia",
        texto: "¿El paciente tiene diagnóstico previo de arritmia o trastorno de conducción?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "holter_marcapasos",
        texto: "¿El paciente tiene marcapasos implantado?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
      {
        id: "holter_antecedente_ecg",
        texto: "¿El paciente tiene ECG previo para comparación?",
        tipo: "BOOLEAN",
        obligatoria: false,
      },
      {
        id: "holter_sintomas",
        texto: "¿Con qué frecuencia el paciente presenta los síntomas (palpitaciones, mareos, síncope)?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Varias veces al día", "Diariamente", "Algunas veces por semana", "Ocasionalmente (menos de 1 vez/semana)"],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // OTRO
  // ══════════════════════════════════════════════════════════════
  {
    nombre: "Glucosa Capilar (Glucómetro)",
    tipo: "OTRO",
    descripcion: "Medición rápida de glucosa en sangre capilar para control glicémico en consulta.",
    instrucciones: "Informar si es en ayuno o postprandial. Limpiar el dedo antes de la punción.",
    validezDias: 1,
    preguntasProtocolares: [
      {
        id: "gluc_cap_estado",
        texto: "¿El paciente está en ayuno o es una medición postprandial?",
        tipo: "SELECCION",
        obligatoria: true,
        opciones: ["Ayuno (más de 8 horas)", "Postprandial (1-2 horas después de comer)", "Al azar"],
      },
      {
        id: "gluc_cap_insulina",
        texto: "¿El paciente se aplicó insulina en las últimas horas?",
        tipo: "BOOLEAN",
        obligatoria: true,
      },
    ],
  },
];

async function seedExamenes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Conectado a MongoDB");

    await ExamenLaboratorioImagen.deleteMany({});
    console.log("🗑️  Catálogo limpiado (colección ExamenLaboratorioImagen)");

    const insertados = await ExamenLaboratorioImagen.insertMany(examenes);
    console.log(`✅ ${insertados.length} exámenes insertados con preguntas protocolares`);

    // Resumen por tipo
    const conteo: Record<string, number> = {};
    for (const ex of insertados) {
      conteo[ex.tipo] = (conteo[ex.tipo] || 0) + 1;
    }

    console.log("\n📋 Exámenes por tipo:");
    for (const [tipo, cantidad] of Object.entries(conteo)) {
      console.log(`   ${tipo}: ${cantidad}`);
    }

    console.log("\n📚 Fuentes normativas utilizadas:");
    console.log("   - NTS N.° 072-MINSA/DGSP-V.01 (2009) — Anemia y altitud");
    console.log("   - NTS N.° 041-MINSA/DGSP-V.01 (2019) — Tuberculosis");
    console.log("   - RM 705-2006-MINSA — Gestante y sífilis");
    console.log("   - RM 343-2016-MINSA — Dislipidemias");
    console.log("   - RM 490-2018-MINSA — Mamografía de cribado");
    console.log("   - DS 009-2012-EM (IPEN) — Protección radiológica");
    console.log("   - CLSI H3-A6 — Colección de sangre venosa");
    console.log("   - ACR Manual on Contrast Media (2022)");
    console.log("   - ICRP Publication 84 — Radiación y embarazo");
    console.log("   - INS Perú, Manual de parasitología (2003)");
    console.log("   - SOPECARD / Doc. Técnico MINSA ECG (2011)");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  }
}

seedExamenes();
