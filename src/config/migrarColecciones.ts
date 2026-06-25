/**
 * migrarColecciones.ts
 * Renombra colecciones con nombres incorrectos (generados por Mongoose) a nombres
 * correctos en español, y elimina colecciones residuales vacías.
 *
 * EJECUTAR UNA SOLA VEZ antes de deployar los modelos actualizados:
 *   npx ts-node src/config/migrarColecciones.ts
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

interface RenameOp { desde: string; hacia: string }

const RENOMBRAR: RenameOp[] = [
  { desde: "especialidads",           hacia: "especialidades"   },
  { desde: "reclamacions",            hacia: "reclamaciones"    },
  { desde: "notificacions",           hacia: "notificaciones"   },
  { desde: "ordenexamens",            hacia: "ordenesexamen"    },
  { desde: "examenlaboratorioimagens",hacia: "examenes"         },
  { desde: "doctors",                 hacia: "doctores"         },
];

const ELIMINAR = [
  "San Jose",
  "horariomensuals",
  "sequences",
  "examenlaboratorios",
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("❌ Falta MONGODB_URI en .env"); process.exit(1); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  console.log("✅ Conectado a MongoDB\n");

  const coleccionesExistentes = (await db.listCollections().toArray()).map(c => c.name);

  // ── Renombrar ──────────────────────────────────────────────────────────────
  console.log("── Renombrando colecciones ────────────────────────────────────");
  for (const op of RENOMBRAR) {
    if (!coleccionesExistentes.includes(op.desde)) {
      console.log(`   ⏭  "${op.desde}" no existe, omitiendo`);
      continue;
    }
    if (coleccionesExistentes.includes(op.hacia)) {
      console.log(`   ⚠️  "${op.hacia}" ya existe, omitiendo rename de "${op.desde}"`);
      continue;
    }
    await db.collection(op.desde).rename(op.hacia);
    console.log(`   ✅ "${op.desde}" → "${op.hacia}"`);
  }

  // ── Eliminar residuos ──────────────────────────────────────────────────────
  console.log("\n── Eliminando colecciones residuales ──────────────────────────");
  for (const nombre of ELIMINAR) {
    if (!coleccionesExistentes.includes(nombre)) {
      console.log(`   ⏭  "${nombre}" no existe, omitiendo`);
      continue;
    }
    await db.collection(nombre).drop();
    console.log(`   🗑️  "${nombre}" eliminada`);
  }

  console.log("\n✅ Migración completada\n");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("❌ Error:", err);
  await mongoose.disconnect();
  process.exit(1);
});
