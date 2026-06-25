import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Colecciones residuales que Mongoose auto-generó con nombre incorrecto
// Todas deberían estar vacías; el script verifica antes de eliminar.
const RESIDUALES = [
  "doctors",
  "especialidads",
  "examenlaboratorioimagens",
  "notificacions",
  "ordenexamens",
  "reclamacions",
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  const existentes = (await db.listCollections().toArray()).map(c => c.name);

  for (const nombre of RESIDUALES) {
    if (!existentes.includes(nombre)) {
      console.log(`  ⏭  ${nombre} — no existe, omitiendo`);
      continue;
    }
    const count = await db.collection(nombre).countDocuments();
    if (count > 0) {
      console.log(`  ⚠️  ${nombre} — tiene ${count} documentos, NO se elimina (revisar manualmente)`);
    } else {
      await db.collection(nombre).drop();
      console.log(`  ✅ ${nombre} — eliminada (estaba vacía)`);
    }
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
