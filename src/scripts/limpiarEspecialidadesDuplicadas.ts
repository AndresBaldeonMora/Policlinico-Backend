import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Especialidad } from "../models/Especialidad";

async function limpiar() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("✅ Conectado\n");

  const todas = await Especialidad.find({}).sort({ createdAt: 1 }).lean();
  const vistas = new Map<string, string>(); // nombre → _id del primero (el más antiguo)
  const aEliminar: string[] = [];

  for (const esp of todas) {
    const key = esp.nombre.trim().toLowerCase();
    if (vistas.has(key)) {
      aEliminar.push(String(esp._id));
      console.log(`🗑  Duplicado: "${esp.nombre}" (${esp._id})`);
    } else {
      vistas.set(key, String(esp._id));
    }
  }

  if (aEliminar.length === 0) {
    console.log("✅ Sin duplicados.");
  } else {
    await Especialidad.deleteMany({ _id: { $in: aEliminar } });
    console.log(`\n✅ ${aEliminar.length} duplicado(s) eliminados.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

limpiar().catch(async (e) => {
  console.error("❌", e);
  await mongoose.disconnect();
  process.exit(1);
});
