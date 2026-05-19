/**
 * Seed del catálogo CIE-10.
 *
 * Carga el catálogo oficial de SUSALUD (src/config/data/CIE10_2021.csv,
 * 12,674 códigos) en la colección `cie10s` de MongoDB.
 *
 * Ejecución: npm run seed:cie10
 *
 * El catálogo es de solo lectura: este seed reemplaza por completo la
 * colección cada vez que se ejecuta (deleteMany + insertMany).
 */

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { CIE10 } from "../models/CIE10";
import { normalizarTexto } from "../utils/normalizarTexto";

const CSV_PATH = path.join(__dirname, "data", "CIE10_2021.csv");

/** Parser de una línea CSV que respeta comillas dobles y escape "" */
function parseCSVLine(line: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let dentroComillas = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (dentroComillas) {
      if (c === '"') {
        if (line[i + 1] === '"') { actual += '"'; i++; }   // comilla escapada
        else dentroComillas = false;
      } else {
        actual += c;
      }
    } else {
      if (c === '"') dentroComillas = true;
      else if (c === ",") { campos.push(actual); actual = ""; }
      else actual += c;
    }
  }
  campos.push(actual);
  return campos;
}

async function seedCIE10() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("❌ Falta MONGODB_URI en .env"); process.exit(1); }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ No se encontró el catálogo en ${CSV_PATH}`);
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Conectado a MongoDB\n");

  // Leer y parsear el CSV
  const contenido = fs.readFileSync(CSV_PATH, "utf-8");
  const lineas = contenido.split(/\r?\n/).filter(l => l.trim() !== "");
  lineas.shift(); // descartar cabecera CODIGO,DESCRIPCION

  const vistos = new Set<string>();
  const docs = lineas.flatMap((linea) => {
    const [codigo, descripcion] = parseCSVLine(linea);
    if (!codigo || !descripcion) return [];
    const cod = codigo.trim();
    if (vistos.has(cod)) return [];   // evitar duplicados
    vistos.add(cod);
    return [{
      codigo:      cod,
      descripcion: descripcion.trim(),
      busqueda:    normalizarTexto(descripcion),
      capitulo:    cod.charAt(0).toUpperCase(),
    }];
  });

  console.log(`📄 ${docs.length} códigos CIE-10 leídos del catálogo SUSALUD`);

  // Reemplazo total de la colección
  await CIE10.deleteMany({});
  console.log("🗑️  Colección cie10s limpiada");

  await CIE10.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} códigos CIE-10 insertados`);

  // Resumen por capítulo
  const porCapitulo = await CIE10.aggregate([
    { $group: { _id: "$capitulo", total: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  console.log("\n📊 Códigos por capítulo (letra inicial):");
  console.log("   " + porCapitulo.map(c => `${c._id}:${c.total}`).join("  "));

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("✅ Catálogo CIE-10 listo. Fuente: SUSALUD (CIE10_2021).");
  console.log("────────────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
}

seedCIE10().catch(async (err) => {
  console.error("❌ Error fatal:", err);
  await mongoose.disconnect();
  process.exit(1);
});
