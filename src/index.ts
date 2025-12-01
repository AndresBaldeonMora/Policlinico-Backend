import dotenv from "dotenv";
dotenv.config(); // ← PRIMERO ESTO

import app from "./app";
import connectDB from "./config/database";

const PORT = process.env.PORT || 3000;

async function main() {
  try {
    await connectDB();
    console.log("✅ Conectado a MongoDB correctamente");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

main();