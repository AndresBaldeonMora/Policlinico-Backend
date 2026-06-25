import { Router, Request, Response } from "express";
import { verifyToken, requireRole } from "../middlewares/authMiddlewares";
import { historialSala, conversacionesAdmin } from "../config/socket";
import { MensajeChat } from "../models/MensajeChat";

const router = Router();
router.use(verifyToken);

// Historial de una sala (admin o participante)
router.get("/sala/:sala", async (req: Request, res: Response) => {
  try {
    const msgs = await historialSala(String(req.params.sala), 80);
    res.json({ success: true, data: msgs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Conversaciones del admin (staff + pacientes)
router.get("/conversaciones", requireRole(["ADMINISTRADOR"]), async (_req: Request, res: Response) => {
  try {
    const data = await conversacionesAdmin();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// No leídos en una sala
router.get("/no-leidos/:sala", async (req: Request, res: Response) => {
  const user = (req as any).user;
  try {
    const count = await MensajeChat.countDocuments({
      sala: req.params.sala,
      autorId: { $ne: user.id ?? user._id },
      leido: false,
    });
    res.json({ success: true, data: count });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
