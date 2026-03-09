import { Router } from "express";
import {
  listarEspecialidades,
  obtenerEspecialidad,
  crearEspecialidad,
  eliminarEspecialidad,
} from "../controllers/especialidad.controller";

const router = Router();

router.get("/",     listarEspecialidades);
router.get("/:id",  obtenerEspecialidad);
router.post("/",    crearEspecialidad);
router.delete("/:id", eliminarEspecialidad);

export default router;