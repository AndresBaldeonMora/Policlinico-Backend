import express from "express";
import cors from "cors";
import path from "path";

import pacienteRoutes from "./routes/paciente.routes";
import pacienteMeRoutes from "./routes/paciente.me.routes";
import especialidadRoutes from "./routes/especialidad.routes";
import doctorRoutes from "./routes/doctor.routes";
import medicoRoutes from "./routes/medico.routes"; // ✅ CORRECTO
import citaRoutes from "./routes/cita.routes";
import horarioRoutes from "./routes/horario.routes";
import testRoutes from "./routes/test.routes";
import authRoutes from "./routes/auth.routes";

import bloqueoRoutes from "./routes/bloqueo.routes";
import examenRoutes from "./routes/examen.routes";
import ordenRoutes from "./routes/orden.routes";
import reportesRoutes from "./routes/reportes.routes";
import medicamentoRoutes from "./routes/medicamento.routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos subidos (avatares, etc.) desde /uploads
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

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
      medico: "/api/medico",
      examenes: "/api/examenes",
      bloqueos: "/api/bloqueos",
      ordenes: "/api/ordenes",
      reportes: "/api/reportes",
    },
  });
});

// ✅ ORDEN CORRECTO: medico ANTES de doctores
app.use("/api/paciente", pacienteMeRoutes); // portal del paciente (singular)
app.use("/api/pacientes", pacienteRoutes);
app.use("/api/especialidades", especialidadRoutes);
app.use("/api/medico", medicoRoutes); 
app.use("/api/doctores", doctorRoutes);
app.use("/api/citas", citaRoutes);
app.use("/api/horarios", horarioRoutes);
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/bloqueos", bloqueoRoutes);
app.use("/api/examenes", examenRoutes);
app.use("/api/ordenes", ordenRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/medicamentos", medicamentoRoutes);

app.use(errorHandler);

export default app;