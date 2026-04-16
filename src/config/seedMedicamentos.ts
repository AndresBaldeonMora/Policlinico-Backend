import { Medicamento } from "../models/Medicamento";

const MEDICAMENTOS_BASE = [
  { nombre: "Paracetamol", principioActivo: "Acetaminofén", presentacion: "Tableta 500mg" },
  { nombre: "Paracetamol Jarabe", principioActivo: "Acetaminofén", presentacion: "Jarabe 120mg/5ml" },
  { nombre: "Ibuprofeno", principioActivo: "Ibuprofeno", presentacion: "Tableta 400mg" },
  { nombre: "Ibuprofeno Jarabe", principioActivo: "Ibuprofeno", presentacion: "Jarabe 100mg/5ml" },
  { nombre: "Amoxicilina", principioActivo: "Amoxicilina", presentacion: "Cápsula 500mg" },
  { nombre: "Amoxicilina + Ácido Clavulánico", principioActivo: "Amoxicilina/Clavulanato", presentacion: "Tableta 500mg/125mg" },
  { nombre: "Azitromicina", principioActivo: "Azitromicina", presentacion: "Tableta 500mg" },
  { nombre: "Ciprofloxacino", principioActivo: "Ciprofloxacino", presentacion: "Tableta 500mg" },
  { nombre: "Metformina", principioActivo: "Metformina", presentacion: "Tableta 500mg" },
  { nombre: "Enalapril", principioActivo: "Enalapril", presentacion: "Tableta 10mg" },
  { nombre: "Atorvastatina", principioActivo: "Atorvastatina", presentacion: "Tableta 20mg" },
  { nombre: "Omeprazol", principioActivo: "Omeprazol", presentacion: "Cápsula 20mg" },
  { nombre: "Ranitidina", principioActivo: "Ranitidina", presentacion: "Tableta 150mg" },
  { nombre: "Loratadina", principioActivo: "Loratadina", presentacion: "Tableta 10mg" },
  { nombre: "Cetirizina", principioActivo: "Cetirizina", presentacion: "Tableta 10mg" },
  { nombre: "Diclofenaco", principioActivo: "Diclofenaco sódico", presentacion: "Tableta 50mg" },
  { nombre: "Dipirona", principioActivo: "Metamizol sódico", presentacion: "Tableta 500mg" },
  { nombre: "Prednisona", principioActivo: "Prednisona", presentacion: "Tableta 20mg" },
  { nombre: "Dexametasona", principioActivo: "Dexametasona", presentacion: "Ampolla 4mg/ml" },
  { nombre: "Furosemida", principioActivo: "Furosemida", presentacion: "Tableta 40mg" },
  { nombre: "Albendazol", principioActivo: "Albendazol", presentacion: "Tableta 400mg" },
  { nombre: "Metronidazol", principioActivo: "Metronidazol", presentacion: "Tableta 500mg" },
  { nombre: "Vitamina C", principioActivo: "Ácido ascórbico", presentacion: "Tableta 1000mg" },
  { nombre: "Vitamina D3", principioActivo: "Colecalciferol", presentacion: "Cápsula 2000 UI" },
];

export const seedMedicamentos = async () => {
  const count = await Medicamento.countDocuments();
  if (count > 0) return;

  await Medicamento.insertMany(MEDICAMENTOS_BASE);
  console.log(`✅ Seed medicamentos: ${MEDICAMENTOS_BASE.length} medicamentos insertados`);
};
