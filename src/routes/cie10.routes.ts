import express from "express";
import { buscarCIE10 } from "../controllers/cie10.controller";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";

const router = express.Router();

router.get("/", verifyToken, requireRole(["MEDICO", "ADMINISTRADOR"]), buscarCIE10);

export default router;
