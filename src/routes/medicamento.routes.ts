import express from "express";
import {
  listarMedicamentos,
  crearMedicamento,
  actualizarMedicamento,
  toggleActivoMedicamento,
} from "../controllers/medicamento.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.get("/", listarMedicamentos);
// El catálogo lo gestiona el ADMINISTRADOR; el MEDICO puede dar de alta uno rápido.
router.post("/", verifyToken, requireRole(["MEDICO", "ADMINISTRADOR"]), crearMedicamento);
router.patch("/:id", verifyToken, requireRole(["ADMINISTRADOR"]), actualizarMedicamento);
router.patch("/:id/toggle", verifyToken, requireRole(["ADMINISTRADOR"]), toggleActivoMedicamento);

export default router;
