import express from "express";
import { listarDoctores, obtenerDoctor, obtenerDoctoresPorEspecialidad } from "../controllers/doctor.controller"; // Asegúrate de agregar la nueva función

const router = express.Router();

// Listar todos los doctores
router.get("/", listarDoctores);

// Obtener un doctor por su ID
router.get("/:id", obtenerDoctor);

// **Nueva Ruta para obtener doctores por especialidad**
router.get("/especialidad/:especialidadId", obtenerDoctoresPorEspecialidad);

export default router;
