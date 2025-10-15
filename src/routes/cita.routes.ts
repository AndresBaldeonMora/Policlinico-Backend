import express from "express";
import { crearCita, listarCitas, eliminarCita } from "../controllers/cita.controller";

const router = express.Router();

router.post("/", crearCita);
router.get("/", listarCitas);
router.delete("/:id", eliminarCita);

export default router;
