import { Router } from "express";
import { buscarDNI } from "../controllers/reniec.controller";

const router = Router();
router.get("/:dni", buscarDNI);

export default router;  // ← Debe ser default
