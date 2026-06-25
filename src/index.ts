import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import connectDB from "./config/database";
import { initSocket } from "./config/socket";
import { verificarOrdenesVencidas } from "./jobs/vencimientoOrdenes";
import { verificarCitasVencidas } from "./jobs/vencimientoCitas";
import { seedMedicamentos } from "./config/seedMedicamentos";
import { seedPreciosExamenes } from "./config/seedPreciosExamenes";
import cron from "node-cron";

const PORT = process.env.PORT || 3000;

async function main() {
  try {
    await connectDB();
    console.log("✅ Conectado a MongoDB correctamente");

    await verificarOrdenesVencidas();
    await verificarCitasVencidas();
    await seedMedicamentos();
    await seedPreciosExamenes();

    cron.schedule("*/15 * * * *", async () => {
      await verificarCitasVencidas();
    });

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

main();
