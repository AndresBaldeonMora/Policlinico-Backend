import express from "express";
import { listarDoctores, obtenerDoctor, obtenerDoctoresPorEspecialidad } from "../controllers/doctor.controller";

const router = express.Router();

// ⭐ ESTA RUTA DEBE IR PRIMERO (más específica)
// Backend route
router.get('/especialidad/:especialidadId', async (req, res) => {
    try {
        const { especialidadId } = req.params;
        const doctores = await Doctor.find({ especialidad: especialidadId })
            .populate('especialidad');
        res.json(doctores);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener doctores' });
    }
});
// Estas van después (menos específicas)
router.get("/", listarDoctores);
router.get("/:id", obtenerDoctor);

export default router;