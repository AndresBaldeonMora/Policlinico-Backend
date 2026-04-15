import express from "express";
import { listarMedicamentos, crearMedicamento } from "../controllers/medicamento.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.get("/", listarMedicamentos);
router.post("/", verifyToken, requireRole(["MEDICO"]), crearMedicamento);

export default router;
