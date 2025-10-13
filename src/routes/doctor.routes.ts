import express from "express";
import {
  crearDoctor,
  listarDoctores,
  obtenerDoctor,
  actualizarDoctor,
  eliminarDoctor,
} from "../controllers/doctor.controller";

const router = express.Router();

router.post("/", crearDoctor);
router.get("/", listarDoctores);
router.get("/:id", obtenerDoctor);
router.put("/:id", actualizarDoctor);
router.delete("/:id", eliminarDoctor);

export default router;
