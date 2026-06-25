import { Router } from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import {
  crearTicket,
  listarTickets,
  obtenerTicket,
  actualizarTicket,
  agregarComentario,
  resumenTickets,
} from "../controllers/ticket.controller";

const router = Router();
router.use(verifyToken);

// Solo recepcionistas crean tickets
router.post("/",                    requireRole(["RECEPCIONISTA"]),               crearTicket);

// Ambos listan (filtro interno por rol)
router.get("/",                     requireRole(["RECEPCIONISTA","ADMINISTRADOR"]), listarTickets);
router.get("/resumen",              requireRole(["ADMINISTRADOR"]),                resumenTickets);
router.get("/:id",                  requireRole(["RECEPCIONISTA","ADMINISTRADOR"]), obtenerTicket);

// Solo admin puede cambiar estado/prioridad
router.patch("/:id",                requireRole(["ADMINISTRADOR"]),                actualizarTicket);

// Comentarios: ambos roles (el controller controla acceso)
router.post("/:id/comentarios",     requireRole(["RECEPCIONISTA","ADMINISTRADOR"]), agregarComentario);

export default router;
