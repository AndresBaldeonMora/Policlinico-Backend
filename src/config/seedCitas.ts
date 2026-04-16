import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Cita } from "../models/Cita";
import { Doctor } from "../models/Doctor";
import { Paciente } from "../models/Paciente";

const toISODateLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

async function seedCitas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Conectado a MongoDB");

    // Limpiar TODAS las citas
    await Cita.deleteMany({});
    console.log("🗑️  Colección Cita limpiada");

    let doctorJasmen = await Doctor.findById("69cc64f77b1bf3c5506abd50");
    if (!doctorJasmen) {
      doctorJasmen = await Doctor.findOne({ nombres: { $regex: /Jasmen/i } });
      if (!doctorJasmen) {
        console.log("⚠️ No se encontró al doctor Jasmen. Asegúrate de haber ejecutado 'npm run seed' antes.");
        process.exit(1);
      }
    }

    let paciente = await Paciente.findById("69ae4bcbb6faa1aed17d5a56");
    if (!paciente) {
      paciente = await Paciente.findOne({ dni: "74659414" });
      if (!paciente) {
        paciente = await Paciente.create({
          _id: new mongoose.Types.ObjectId("69ae4bcbb6faa1aed17d5a56"),
          nombres: "Miguel Andres",
          apellidos: "Baldeon Mora",
          dni: "74659414",
          telefono: "913459012",
          correo: "fabriziodiaz991@gmail.com",
          genero: "MASCULINO",
          fechaNacimiento: new Date("2003-01-28"),
          direccion: "Av Victor 337",
        });
        console.log("🧑 Paciente Miguel Andres creado forzosamente.");
      }
    }

    const hoy = new Date();
    
    const fechaAyer = new Date(); fechaAyer.setDate(hoy.getDate() - 2);
    const fechaManana = new Date(); fechaManana.setDate(hoy.getDate() + 1);

    const citasPrueba = [
      {
        pacienteId: paciente._id,
        doctorId: doctorJasmen._id,
        fecha: new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())),
        hora: "08:00",
        tipo: "CONSULTA",
        estado: "PENDIENTE", 
      },
      {
        pacienteId: paciente._id,
        doctorId: doctorJasmen._id,
        fecha: new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())),
        hora: "19:00",
        tipo: "CONSULTA",
        estado: "PENDIENTE",
      },
      {
        pacienteId: paciente._id,
        doctorId: doctorJasmen._id,
        fecha: new Date(Date.UTC(fechaManana.getFullYear(), fechaManana.getMonth(), fechaManana.getDate())),
        hora: "10:00",
        tipo: "CONSULTA",
        estado: "REPROGRAMADA",
      },
      {
        pacienteId: paciente._id,
        doctorId: doctorJasmen._id,
        fecha: new Date(Date.UTC(fechaAyer.getFullYear(), fechaAyer.getMonth(), fechaAyer.getDate())),
        hora: "15:00",
        tipo: "CONSULTA",
        estado: "ATENDIDA",
        horarioAsistencia: fechaAyer,
      }
    ];

    await Cita.insertMany(citasPrueba);
    console.log(`✅ ${citasPrueba.length} citas de prueba creadas correctamente para la Dra. ${doctorJasmen.nombres}.`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en seed de Citas:", error);
    process.exit(1);
  }
}

seedCitas();
