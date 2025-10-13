import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Rutas de Citas funcionando 📅' });
});

export default router;
