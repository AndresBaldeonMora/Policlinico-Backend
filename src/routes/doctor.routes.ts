import express from "express";
import { listarDoctores, obtenerDoctor } from "../controllers/doctor.controller";

const router = express.Router();

// Listar todos los doctores
router.get("/", listarDoctores);

// Obtener un doctor por su ID
router.get("/:id", obtenerDoctor);

export default router;
