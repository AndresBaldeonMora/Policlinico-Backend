import express from "express";
import cors from "cors";

import pacienteRoutes from "./routes/paciente.routes";
import especialidadRoutes from "./routes/especialidad.routes";
import doctorRoutes from "./routes/doctor.routes";
import citaRoutes from "./routes/cita.routes";
import horarioRoutes from "./routes/horario.routes";
import testRoutes from "./routes/test.routes";
import authRoutes from "./routes/auth.routes";
import reniecRoutes from "./routes/reniec.routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    message: "API Policlínico - Sistema de Gestión de Citas",
    version: "1.0.0",
    endpoints: {
      pacientes: "/api/pacientes",
      especialidades: "/api/especialidades",
      doctores: "/api/doctores",
      citas: "/api/citas",
      horarios: "/api/horarios",
      reniec: "/api/reniec/:dni",
    },
  });
});

app.use("/api/pacientes", pacienteRoutes);
app.use("/api/especialidades", especialidadRoutes);
app.use("/api/doctores", doctorRoutes);
app.use("/api/citas", citaRoutes);
app.use("/api/horarios", horarioRoutes);
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reniec", reniecRoutes);

app.use(errorHandler);

export default app;