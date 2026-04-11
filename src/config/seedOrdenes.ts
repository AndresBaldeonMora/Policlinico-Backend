/**
 * Seed de Órdenes de Análisis Clínicos — solo estado PENDIENTE (Por Autorizar)
 * Elimina todas las órdenes existentes y crea 6 órdenes frescas para pruebas.
 *
 * Ejecución: npm run seed:ordenes
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { OrdenExamen } from "../models/OrdenExamen";
import { Paciente } from "../models/Paciente";
import { Doctor } from "../models/Doctor";
import { Especialidad } from "../models/Especialidad";
import { ExamenLaboratorio } from "../models/ExamenLaboratorio";

const generarCodigo = (idx: number): string => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  return `ORD-${y}${m}${d}-SEED${String(idx).padStart(2, "0")}`;
};

const diasAtras = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

async function seedOrdenes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Conectado a MongoDB");

    // ── Verificar datos base ────────────────────────────────
    const pacientes = await Paciente.find().limit(6);
    if (pacientes.length === 0) {
      console.error("No hay pacientes. Ejecuta el seed principal primero.");
      process.exit(1);
    }

    const doctores = await Doctor.find().limit(3);
    if (doctores.length === 0) {
      console.error("No hay médicos. Ejecuta el seed principal primero.");
      process.exit(1);
    }

    const especialidades = await Especialidad.find({ tieneLaboratorio: true }).limit(3);
    if (especialidades.length === 0) {
      console.error("No hay especialidades con laboratorio.");
      process.exit(1);
    }

    const examenes = await ExamenLaboratorio.find({ activo: true }).limit(10);
    if (examenes.length === 0) {
      console.error("No hay exámenes de laboratorio. Ejecuta npm run seed:examenes primero.");
      process.exit(1);
    }

    // ── Eliminar TODAS las órdenes existentes ───────────────
    const { deletedCount } = await OrdenExamen.deleteMany({});
    console.log(`Órdenes eliminadas: ${deletedCount}`);

    // ── Helpers ─────────────────────────────────────────────
    const getPaciente  = (i: number) => pacientes[i % pacientes.length];
    const getDoctor    = (i: number) => doctores[i % doctores.length];
    const getEsp       = (i: number) => especialidades[i % especialidades.length];
    const getExamenes  = (start: number, count: number) => {
      const total = examenes.length;
      return Array.from({ length: count }, (_, k) => examenes[(start + k) % total]);
    };

    const observaciones = [
      "Ayuno de 8 horas previas a la toma de muestra. No ingerir líquidos distintos al agua.",
      "Muestra de primera orina de la mañana en frasco estéril.",
      "Control de glucemia en ayunas y perfil lipídico completo. Ayuno de 12 horas.",
      "Panel hepático completo. Paciente con antecedente de hepatitis B.",
      "Evaluación preoperatoria. Incluye hemograma completo y pruebas de coagulación.",
      "Perfil tiroideo por sospecha clínica de hipotiroidismo. No requiere ayuno.",
    ];

    // ── Crear 6 órdenes todas en estado PENDIENTE ───────────
    const ordenes = Array.from({ length: 6 }, (_, i) => ({
      codigoOrden:            generarCodigo(i + 1),
      pacienteId:             getPaciente(i)._id,
      doctorId:               getDoctor(i)._id,
      especialidadId:         getEsp(i)._id,
      estado:                 "PENDIENTE" as const,
      fecha:                  diasAtras(i),          // emitidas entre hoy y 5 días atrás
      items:                  getExamenes(i * 2, i % 2 === 0 ? 2 : 3).map((ex) => ({
        examenId:   ex._id,
        observaciones: "",
        estadoItem: "PENDIENTE" as const,
      })),
      observacionesGenerales: observaciones[i],
    }));

    const resultado = await OrdenExamen.insertMany(ordenes);

    console.log("\nOrdenes creadas exitosamente:");
    console.log("─────────────────────────────────────────────────");
    resultado.forEach((o: any, i: number) => {
      const paciente = pacientes[i % pacientes.length];
      console.log(`  ${o.codigoOrden}  —  ${paciente.nombres} ${paciente.apellidos}`);
    });
    console.log("─────────────────────────────────────────────────");
    console.log(`Total: ${resultado.length} órdenes — estado: Por Autorizar\n`);

    process.exit(0);
  } catch (error: any) {
    console.error("Error al ejecutar el seed de órdenes:", error.message);
    process.exit(1);
  }
}

seedOrdenes();
