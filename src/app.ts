// ============================================
// src/app.ts
// ============================================
import express from 'express';
import cors from 'cors';
import pacienteRoutes from './routes/paciente.routes';
import especialidadRoutes from './routes/especialidad.routes';
import doctorRoutes from './routes/doctor.routes';
import citaRoutes from './routes/cita.routes';
import { errorHandler } from './middlewares/errorHandler';
import testRoutes from './routes/test.routes';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    message: 'API Policlínico - Sistema de Gestión de Citas',
    version: '1.0.0',
    endpoints: {
      pacientes: '/api/pacientes',
      especialidades: '/api/especialidades',
      doctores: '/api/doctores',
      citas: '/api/citas',
    }
  });
});

app.use('/api/pacientes', pacienteRoutes);
app.use('/api/especialidades', especialidadRoutes);
app.use('/api/doctores', doctorRoutes);
app.use('/api/citas', citaRoutes);
app.use('/api/test', testRoutes);

app.use(errorHandler);

export default app;
