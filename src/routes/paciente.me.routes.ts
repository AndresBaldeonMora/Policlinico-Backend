import { Router } from "express";
import { verifyToken, requirePaciente } from "../middlewares/authMiddlewares";
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  getMyCitas,
  getMyOrdenes,
  getTerminos,
  updateMyAvatar,
  uploadAvatar,
} from "../controllers/paciente.me.controller";
import {
  getMisNotificaciones,
  marcarTodasLeidas,
  marcarLeida,
  eliminarNotificacion,
} from "../controllers/notificacion.controller";

const router = Router();

// Todas las rutas exigen token válido + rol paciente + Paciente vinculado
router.use(verifyToken, requirePaciente);

router.get("/me",           getMyProfile);
router.put("/me",           updateMyProfile);
router.put("/me/password",  changeMyPassword);
router.post("/me/avatar",   uploadAvatar, updateMyAvatar);
router.get("/citas",        getMyCitas);
router.get("/ordenes",      getMyOrdenes);
router.get("/terminos",     getTerminos);
router.get("/notificaciones",                       getMisNotificaciones);
router.put("/notificaciones/marcar-todas-leidas",   marcarTodasLeidas);
router.put("/notificaciones/:id/leer",              marcarLeida);
router.delete("/notificaciones/:id",                eliminarNotificacion);

export default router;
