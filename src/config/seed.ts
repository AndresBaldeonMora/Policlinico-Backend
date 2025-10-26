import mongoose from "mongoose";
import dotenv from "dotenv";
import { Especialidad } from "../models/Especialidad";
import { Doctor } from "../models/Doctor";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/policlinico";

const especialidadesData = [
  { nombre: "Pediatría", descripcion: "Atención médica para niños y adolescentes" },
  { nombre: "Cardiología", descripcion: "Tratamiento de enfermedades del corazón" },
  { nombre: "Dermatología", descripcion: "Tratamiento de afecciones de la piel" }
];

const doctoresData = [
  { nombres: "María", apellidos: "González", correo: "maria@policlinico.com", telefono: "987654321", especialidad: "Pediatría" },
  { nombres: "Luis", apellidos: "Ramírez", correo: "luis@policlinico.com", telefono: "987123456", especialidad: "Cardiología" },
  { nombres: "Ana", apellidos: "Torres", correo: "ana@policlinico.com", telefono: "999888777", especialidad: "Dermatología" }
];


const seedDatabase = async () => {
  await Doctor.collection.dropIndexes().catch(() => {});
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Conectado a MongoDB para carga inicial");

    await Especialidad.deleteMany({});
    await Doctor.deleteMany({});

    const especialidades = await Especialidad.insertMany(especialidadesData);
    console.log("🌱 Especialidades creadas:", especialidades.length);

    const especialidadMap: Record<string, mongoose.Types.ObjectId> = {};
    especialidades.forEach(e => (especialidadMap[e.nombre] = e._id as mongoose.Types.ObjectId));

    const doctores = doctoresData.map(d => ({
      ...d,
      especialidadId: especialidadMap[d.especialidad]
    }));

    await Doctor.insertMany(doctores);
    console.log("👩‍⚕️ Doctores creados:", doctores.length);

    console.log("✅ Carga inicial completada correctamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al sembrar datos:", error);
    process.exit(1);
  }
};

seedDatabase();
