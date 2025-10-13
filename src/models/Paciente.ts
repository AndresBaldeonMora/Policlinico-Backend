import mongoose from 'mongoose';

const pacienteSchema = new mongoose.Schema({
  nombres: { type: String, required: true },
  apellidos: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  telefono: { type: String },
}, { timestamps: true });

export default mongoose.model('Paciente', pacienteSchema);
