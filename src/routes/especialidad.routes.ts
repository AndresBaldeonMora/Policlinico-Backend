import express from "express";
import { listarEspecialidades } from "../controllers/especialidad.controller";

const router = express.Router();

router.get("/", listarEspecialidades);

export default router;
