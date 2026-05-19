import express from "express";
import { buscarCIE10 } from "../controllers/cie10.controller";

const router = express.Router();

router.get("/", buscarCIE10);

export default router;
