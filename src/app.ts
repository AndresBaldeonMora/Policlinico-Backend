import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import pacienteRoutes from "./routes/paciente.routes";
import pacienteMeRoutes from "./routes/paciente.me.routes";
import especialidadRoutes from "./routes/especialidad.routes";
import doctorRoutes from "./routes/doctor.routes";
import medicoRoutes from "./routes/medico.routes";
import citaRoutes from "./routes/cita.routes";
import horarioRoutes from "./routes/horario.routes";
import testRoutes from "./routes/test.routes";
import authRoutes from "./routes/auth.routes";

import bloqueoRoutes from "./routes/bloqueo.routes";
import examenRoutes from "./routes/examen.routes";
import ordenRoutes from "./routes/orden.routes";
import reportesRoutes from "./routes/reportes.routes";
import medicamentoRoutes from "./routes/medicamento.routes";
import cie10Routes from "./routes/cie10.routes";
import adminRoutes from "./routes/admin.routes";
import interconsultaRoutes from "./routes/interconsulta.routes";
import reclamacionRoutes from "./routes/reclamacion.routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

// Detrás de proxy/Nginx: respeta X-Forwarded-* para IP real + rate limit
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Helmet — headers de seguridad (HSTS, frameguard, noSniff, etc.)
app.use(
  helmet({
    contentSecurityPolicy: false, // API sirve JSON, no HTML; evita romper docs/Swagger
    crossOriginResourcePolicy: { policy: "cross-origin" }, // permite servir avatares cross-origin
  })
);

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:5173", "http://127.0.0.1:5173"]
    : []),
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

// Límite de tamaño de body para evitar DoS por payloads gigantes
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Servir archivos estáticos subidos (avatares, etc.) desde /uploads — sin dotfiles
app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), "uploads"), { dotfiles: "deny" })
);

// Rate limiting estricto en endpoints de autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Demasiados intentos. Vuelve a probar en unos minutos." },
});

// Rate limit global razonable para todas las rutas API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

app.get("/", (_req, res) => {
  // Health check minimalista — no expone mapa de endpoints en prod
  res.json({ status: "ok" });
});

app.use("/api/paciente", pacienteMeRoutes);
app.use("/api/pacientes", pacienteRoutes);
app.use("/api/especialidades", especialidadRoutes);
app.use("/api/medico", medicoRoutes);
app.use("/api/doctores", doctorRoutes);
app.use("/api/citas", citaRoutes);
app.use("/api/horarios", horarioRoutes);
app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/bloqueos", bloqueoRoutes);
app.use("/api/examenes", examenRoutes);
app.use("/api/ordenes", ordenRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/medicamentos", medicamentoRoutes);
app.use("/api/cie10", cie10Routes);
app.use("/api/admin", adminRoutes);
app.use("/api/interconsultas", interconsultaRoutes);
app.use("/api/reclamaciones", reclamacionRoutes);

// /api/test sólo disponible en dev — expone info de Mongo
if (process.env.NODE_ENV !== "production") {
  app.use("/api/test", testRoutes);
}

app.use(errorHandler);

export default app;
