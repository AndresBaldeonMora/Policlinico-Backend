import express from "express";
import { listarDoctores, obtenerDoctor, obtenerDoctoresPorEspecialidad } from "../controllers/doctor.controller";

const router = express.Router();

// ⭐ ESTA RUTA DEBE IR PRIMERO (más específica)
router.get("/especialidad/:especialidadId", obtenerDoctoresPorEspecialidad);

// Estas van después (menos específicas)
router.get("/", listarDoctores);
router.get("/:id", obtenerDoctor);

export default router;