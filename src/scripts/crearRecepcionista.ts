import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Usuario } from "../models/Usuario";

const MONGODB_URI = "mongodb+srv://SanJose:SanJose12345@sigempsj.quex5f3.mongodb.net/";

const CORREO    = "recepcion@policlinico.com";
const PASSWORD  = "Recepcion123";
const NOMBRES   = "María";
const APELLIDOS = "García";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Conectado a MongoDB");

  const existe = await Usuario.findOne({ correo: CORREO });
  if (existe) {
    console.log(`Ya existe un usuario con correo ${CORREO} (rol: ${existe.rol})`);
    await mongoose.disconnect();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(PASSWORD, salt);

  const usuario = new Usuario({
    nombres: NOMBRES,
    apellidos: APELLIDOS,
    correo: CORREO,
    passwordHash,
    rol: "RECEPCIONISTA",
    activo: true,
    debeCambiarPassword: false,
  });

  await usuario.save();
  console.log("Recepcionista creada exitosamente:");
  console.log(`  Correo:     ${CORREO}`);
  console.log(`  Contraseña: ${PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
