import { Router } from "express";
import {
  listarEspecialidades,
  obtenerEspecialidad,
  crearEspecialidad,
  eliminarEspecialidad,
  actualizarEspecialidad,
} from "../controllers/especialidad.controller";

const router = Router();

router.get("/",     listarEspecialidades);
router.get("/:id",  obtenerEspecialidad);
router.post("/",    crearEspecialidad);
router.delete("/:id", eliminarEspecialidad);
router.patch("/:id", actualizarEspecialidad);

export default router;