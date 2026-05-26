import express from "express";
import {
  crearInterconsulta,
  listarRecibidas,
  listarEnviadas,
  responderInterconsulta,
  listarPorPaciente,
} from "../controllers/interconsulta.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.use(verifyToken);
router.use(requireRole(["MEDICO"]));

router.post("/", crearInterconsulta);
router.get("/recibidas", listarRecibidas);
router.get("/enviadas", listarEnviadas);
router.get("/paciente/:pacienteId", listarPorPaciente);
router.patch("/:id/responder", responderInterconsulta);

export default router;
