import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const PRECIOS: Record<string, number> = {
  // Bioquímica
  "Creatinina y Úrea":           25,
  "Glucosa en Ayunas":           18,
  "Perfil Lipídico":             45,
  "Prueba de Función Hepática":  55,
  // Hematología
  "Hemograma Completo":          25,
  // Inmunología / Serología
  "PCR Cuantitativo":            85,
  // Orina
  "Examen de Orina Completo":    15,
  // Ecografía
  "Ecografía Abdominal":        120,
  // Electrocardiograma
  "Electrocardiograma":          60,
  // Radiografía
  "Radiografía de Tórax":        50,
};

// Precios por tipo si el nombre no coincide exactamente
const PRECIOS_POR_TIPO: Record<string, number> = {
  BIOQUIMICA:        35,
  HEMATOLOGIA:       25,
  ORINA:             15,
  HECES:             15,
  MICROBIOLOGIA:     45,
  INMUNOLOGIA:       65,
  HORMONAS:          80,
  RADIOGRAFIA:       50,
  ECOGRAFIA:        120,
  TOMOGRAFIA:       280,
  RESONANCIA:       450,
  ELECTROCARDIOGRAMA: 60,
  OTRO:              30,
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const col = db.collection("examenes");

  const examenes = await col.find({}).toArray();
  console.log(`Total exámenes: ${examenes.length}`);

  let actualizados = 0;
  for (const ex of examenes) {
    const precio = PRECIOS[ex.nombre] ?? PRECIOS_POR_TIPO[ex.tipo] ?? 30;
    await col.updateOne({ _id: ex._id }, { $set: { precio } });
    console.log(`  ${ex.nombre} (${ex.tipo}) → S/ ${precio}`);
    actualizados++;
  }

  console.log(`\nActualizados: ${actualizados} exámenes.`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
