import { Router } from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import {
  crearBloqueo,
  listarBloqueos,
  desactivarBloqueo,
  verificarBloqueo,
} from "../controllers/bloqueo.controller";

const router = Router();

router.use(verifyToken);

const STAFF = ["ADMINISTRADOR", "RECEPCIONISTA", "MEDICO"];

router.post("/",                              requireRole(STAFF), crearBloqueo);
router.get("/",                               requireRole(STAFF), listarBloqueos);
router.delete("/:id",                         requireRole(STAFF), desactivarBloqueo);
router.get("/doctor/:doctorId/fecha/:fecha",  requireRole(STAFF), verificarBloqueo);

export default router;
