import { Router } from "express";
import { login, register, cambiarPassword, forgotPassword, resetPassword } from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/authMiddlewares";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/cambiar-password", verifyToken, cambiarPassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;