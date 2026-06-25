import { Router } from "express";
import { listarAvisos, crearAviso, eliminarAviso, resumenDashboard } from "../controllers/aviso.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = Router();

router.use(verifyToken, requireRole(["ADMINISTRADOR"]));

router.get("/dashboard-resumen", resumenDashboard);
router.get("/",           listarAvisos);
router.post("/",          crearAviso);
router.delete("/:id",     eliminarAviso);

export default router;
