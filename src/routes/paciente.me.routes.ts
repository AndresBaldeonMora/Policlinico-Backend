import { Router } from "express";
import { verifyToken, requirePaciente } from "../middlewares/authMiddlewares";
import {
  getMyProfile,
  getMyCitas,
  getMyOrdenes,
} from "../controllers/paciente.me.controller";

const router = Router();

// Todas las rutas exigen token válido + rol paciente + Paciente vinculado
router.use(verifyToken, requirePaciente);

router.get("/me",      getMyProfile);
router.get("/citas",   getMyCitas);
router.get("/ordenes", getMyOrdenes);

export default router;
