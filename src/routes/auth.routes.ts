import { Router } from "express";
// Importa AMBAS funciones del controlador
import { login, register } from "../controllers/auth.controller";

const router = Router();

// Ruta para registrar un nuevo usuario
// Ej: POST http://localhost:3000/api/auth/register
router.post("/register", register);

// Ruta para iniciar sesión
// Ej: POST http://localhost:3000/api/auth/login
router.post("/login", login);

export default router;