import express from "express";
import { 
    listarDoctores, 
    obtenerDoctor, 
    obtenerDoctoresPorEspecialidad 
} from "../controllers/doctor.controller";

const router = express.Router();

// ⭐ ORDEN IMPORTA: específicas primero
router.get('/especialidad/:especialidadId', obtenerDoctoresPorEspecialidad);
router.get("/", listarDoctores);
router.get("/:id", obtenerDoctor);

export default router;