import { Router } from "express";
import { login, register, cambiarPassword } from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/authMiddlewares";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/cambiar-password", verifyToken, cambiarPassword);

export default router;