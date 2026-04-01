import { Router } from "express";
import {
  listarExamenes,
  obtenerExamen,
  crearExamen,
  actualizarExamen,
  eliminarExamen,
} from "../controllers/examen.controller";

const router = Router();

// Catálogo de exámenes
router.get("/",      listarExamenes);
router.get("/:id",   obtenerExamen);
router.post("/",     crearExamen);
router.put("/:id",   actualizarExamen);
router.delete("/:id", eliminarExamen);

export default router;
