import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Especialidad } from "../models/Especialidad";
import { Doctor } from "../models/Doctor";

const NOMBRES_VALIDOS = [
  "Medicina General",
  "Pediatría",
  "Odontología",
  "Reumatología",
  "Ginecología y Obstetricia",
  "Cardiología",
  "Endocrinología",
  "Neumología",
  "Gastroenterología",
  "Psiquiatría",
];

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Conectado a MongoDB");

    // Eliminar especialidades que no estén en la lista
    const resultEsp = await Especialidad.deleteMany({ nombre: { $nin: NOMBRES_VALIDOS } });
    console.log(`🗑️  ${resultEsp.deletedCount} especialidades eliminadas`);

    // Asignar consultorios correctos a las que quedan
    const consultorios: Record<string, number> = {
      "Medicina General":          1,
      "Pediatría":                 2,
      "Odontología":               3,
      "Reumatología":              4,
      "Ginecología y Obstetricia": 5,
      "Cardiología":               6,
      "Endocrinología":            7,
      "Neumología":                8,
      "Gastroenterología":         9,
      "Psiquiatría":               10,
    };
    for (const [nombre, consultorio] of Object.entries(consultorios)) {
      await Especialidad.updateOne({ nombre }, { consultorio });
    }
    console.log("✅ Consultorios actualizados");

    // Eliminar doctores cuya especialidad ya no existe
    const especialidadesValidas = await Especialidad.find({}, "_id");
    const idsValidos = especialidadesValidas.map(e => e._id);
    const resultDoc = await Doctor.deleteMany({ especialidadId: { $nin: idsValidos } });
    console.log(`🗑️  ${resultDoc.deletedCount} doctores eliminados (especialidad inexistente)`);

    console.log("\n✅ Limpieza completada");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

cleanup();
