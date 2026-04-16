import dotenv from "dotenv";
dotenv.config(); // ← PRIMERO ESTO

import app from "./app";
import connectDB from "./config/database";
import { verificarOrdenesVencidas } from "./jobs/vencimientoOrdenes";
import { verificarCitasVencidas } from "./jobs/vencimientoCitas";
import { seedMedicamentos } from "./config/seedMedicamentos";
import cron from "node-cron";

const PORT = process.env.PORT || 3000;

async function main() {
  try {
    await connectDB();
    console.log("✅ Conectado a MongoDB correctamente");

    // Verificar vencimientos al arrancar (cubre reinicios fuera del horario del cron)
    await verificarOrdenesVencidas();
    await verificarCitasVencidas();

    // Poblar catálogo de medicamentos si está vacío
    await seedMedicamentos();

    // Cron diario a las 00:01 AM — vence citas del día anterior no atendidas
    cron.schedule("1 0 * * *", async () => {
      console.log("⏰ [CRON 00:01] Iniciando vencimiento automático de citas...");
      await verificarCitasVencidas();
    });

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

main();