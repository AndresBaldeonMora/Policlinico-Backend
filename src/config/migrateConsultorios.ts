import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Especialidad } from "../models/Especialidad";

const especialidadesConConsultorios = [
  { nombre: "Medicina", consultorio: 3 },
  { nombre: "Medicina Interna", consultorio: 3 },
  { nombre: "Pediatría", consultorio: 7 },
  { nombre: "Odontología", consultorio: 1 },
  { nombre: "Reumatología", consultorio: 9 },
  { nombre: "Ginecología", consultorio: 5 },
  { nombre: "Cardiología", consultorio: 2 },
  { nombre: "Endocrinología", consultorio: 8 },
  { nombre: "Neumología", consultorio: 4 },
  { nombre: "Gastroenterología", consultorio: 6 },
  { nombre: "Psiquiatría", consultorio: 10 },
];

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Conectado a MongoDB");

    // Actualizar especialidades existentes
    for (const esp of especialidadesConConsultorios) {
      const result = await Especialidad.findOneAndUpdate(
        { nombre: esp.nombre },
        { consultorio: esp.consultorio },
        { new: true }
      );
      if (result) {
        console.log(`✅ ${esp.nombre} → Consultorio ${esp.consultorio}`);
      } else {
        // Si no existe, crear (para Psiquiatría que probablemente no esté)
        const created = await Especialidad.create({
          nombre: esp.nombre,
          tieneLaboratorioImagen: false,
          consultorio: esp.consultorio,
        });
        console.log(`✨ Creada: ${esp.nombre} → Consultorio ${esp.consultorio}`);
      }
    }

    console.log("\n✅ Migración completada");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

migrate();
