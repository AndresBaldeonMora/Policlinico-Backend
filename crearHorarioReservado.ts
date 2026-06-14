import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import { Horario } from "./src/models/Horario";
import { hoyPeruUTC } from "./src/utils/fecha.utils";

const DOCTOR_ID = "6a2f27068b5f4c42555b5ee4";

async function crearHorarioReservado() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("✅ Conectado");

  // Calcular fecha: mañana (día hábil, no domingo)
  let fecha = hoyPeruUTC();
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  while (fecha.getUTCDay() === 0) fecha.setUTCDate(fecha.getUTCDate() + 1); // saltar domingo

  const hora = "10:00"; // cualquier hora

  // Crear horario directamente con reservado = true
  const horario = await Horario.create({
    doctorId: new mongoose.Types.ObjectId(DOCTOR_ID),
    fecha,
    hora,
    reservado: true,
  });

  console.log(`✅ Horario reservado creado: ${fecha.toISOString()} a las ${hora}`);
  console.log(`   ID del horario: ${horario._id}`);
  process.exit(0);
}

crearHorarioReservado().catch(console.error);