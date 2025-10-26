import express from "express";
import { crearPaciente, listarPacientes, buscarPacientePorDni } from "../controllers/paciente.controller";

const router = express.Router();

router.post("/", crearPaciente);
router.get("/", listarPacientes);
router.get("/dni/:dni", buscarPacientePorDni);

export default router;
