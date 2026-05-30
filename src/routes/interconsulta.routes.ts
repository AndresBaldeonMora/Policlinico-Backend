import express from "express";
import {
  crearInterconsulta,
  listarRecibidas,
  listarEnviadas,
  responderInterconsulta,
  listarPorPaciente,
  obtenerPorId,
  agendarCitaInterconsulta,
} from "../controllers/interconsulta.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole(["MEDICO"]));

router.post("/", crearInterconsulta);
router.get("/recibidas", listarRecibidas);
router.get("/enviadas", listarEnviadas);
router.get("/paciente/:pacienteId", listarPorPaciente);
// ⚠️ Las rutas con :id deben ir DESPUÉS de las rutas estáticas para no shadowearlas
router.get("/:id", obtenerPorId);
router.patch("/:id/responder", responderInterconsulta);
router.post("/:id/agendar", agendarCitaInterconsulta);

export default router;
