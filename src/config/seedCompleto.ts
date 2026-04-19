import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Especialidad } from "../models/Especialidad";
import { Doctor } from "../models/Doctor";
import { Paciente } from "../models/Paciente";
import { Cita } from "../models/Cita";
import { Medicamento } from "../models/Medicamento";
import { ExamenLaboratorioImagen } from "../models/ExamenLaboratorioImagen";
import { OrdenExamen } from "../models/OrdenExamen";

const especialidades = [
  { nombre: "Pediatría", tieneLaboratorioImagen: true },
  { nombre: "Medicina Interna", tieneLaboratorioImagen: true },
  { nombre: "Ginecología", tieneLaboratorioImagen: true },
  { nombre: "Cardiología", tieneLaboratorioImagen: true },
  { nombre: "Oftalmología", tieneLaboratorioImagen: false },
  { nombre: "Medicina Física y Rehabilitación", tieneLaboratorioImagen: false },
  { nombre: "Neumología", tieneLaboratorioImagen: true },
  { nombre: "Reumatología", tieneLaboratorioImagen: true },
  { nombre: "Radiología", tieneLaboratorioImagen: false },
  { nombre: "Gastroenterología", tieneLaboratorioImagen: true },
  { nombre: "Odontología", tieneLaboratorioImagen: false },
  { nombre: "Endocrinología", tieneLaboratorioImagen: true },
  { nombre: "Traumatología", tieneLaboratorioImagen: false },
  { nombre: "Geriatría", tieneLaboratorioImagen: true },
  { nombre: "Medicina", tieneLaboratorioImagen: true },
  { nombre: "Medicina Familiar", tieneLaboratorioImagen: true },
  { nombre: "Ecografías", tieneLaboratorioImagen: false },
  { nombre: "Otorrinolaringología", tieneLaboratorioImagen: false },
  { nombre: "Urología", tieneLaboratorioImagen: true },
  { nombre: "Cosmiatría", tieneLaboratorioImagen: false },
];

const medicamentos = [
  { nombre: "Amoxicilina 500mg", principioActivo: "Amoxicilina", presentacion: "Cápsulas" },
  { nombre: "Paracetamol 500mg", principioActivo: "Paracetamol", presentacion: "Tabletas" },
  { nombre: "Ibuprofeno 400mg", principioActivo: "Ibuprofeno", presentacion: "Tabletas" },
  { nombre: "Omeprazol 20mg", principioActivo: "Omeprazol", presentacion: "Cápsulas" },
  { nombre: "Losartán 50mg", principioActivo: "Losartán", presentacion: "Tabletas" },
  { nombre: "Metformina 500mg", principioActivo: "Metformina", presentacion: "Tabletas" },
  { nombre: "Atorvastatina 10mg", principioActivo: "Atorvastatina", presentacion: "Tabletas" },
  { nombre: "Lisinopril 10mg", principioActivo: "Lisinopril", presentacion: "Tabletas" },
  { nombre: "Fluoxetina 20mg", principioActivo: "Fluoxetina", presentacion: "Cápsulas" },
  { nombre: "Ranitidina 150mg", principioActivo: "Ranitidina", presentacion: "Tabletas" },
  { nombre: "Cetirizina 10mg", principioActivo: "Cetirizina", presentacion: "Tabletas" },
  { nombre: "Loratadina 10mg", principioActivo: "Loratadina", presentacion: "Tabletas" },
];

const examenes = [
  {
    nombre: "Hemograma Completo",
    tipo: "HEMATOLOGIA",
    descripcion: "Análisis completo de células sanguíneas",
    instrucciones: "Ayuno de 8 horas. Extraer en horario de mañana.",
    preguntasProtocolares: [
      { id: "p1", texto: "¿Ha comido en las últimas 8 horas?", tipo: "BOOLEAN", obligatoria: true },
    ],
    validezDias: 7,
    activo: true,
  },
  {
    nombre: "Perfil Lipídico",
    tipo: "BIOQUIMICA",
    descripcion: "Colesterol total, HDL, LDL, Triglicéridos",
    instrucciones: "Ayuno de 12 horas. Extraer en horario de mañana.",
    preguntasProtocolares: [
      { id: "p1", texto: "¿Ha comido en las últimas 12 horas?", tipo: "BOOLEAN", obligatoria: true },
    ],
    validezDias: 7,
    activo: true,
  },
  {
    nombre: "Glucosa en Ayunas",
    tipo: "BIOQUIMICA",
    descripcion: "Medición de glucosa sérica",
    instrucciones: "Ayuno de 8 horas obligatorio",
    preguntasProtocolares: [],
    validezDias: 7,
    activo: true,
  },
  {
    nombre: "Prueba de Función Hepática",
    tipo: "BIOQUIMICA",
    descripcion: "AST, ALT, Bilirrubina total y directa",
    instrucciones: "Sin ayuno especial requerido",
    preguntasProtocolares: [],
    validezDias: 7,
    activo: true,
  },
  {
    nombre: "Creatinina y Úrea",
    tipo: "BIOQUIMICA",
    descripcion: "Función renal",
    instrucciones: "Sin ayuno especial",
    preguntasProtocolares: [],
    validezDias: 7,
    activo: true,
  },
  {
    nombre: "Análisis de Orina Completo",
    tipo: "ORINA",
    descripcion: "Análisis físico y químico de orina",
    instrucciones: "Muestra de primer orina de la mañana",
    preguntasProtocolares: [],
    validezDias: 7,
    activo: true,
  },
  {
    nombre: "Radiografía de Tórax",
    tipo: "RADIOGRAFIA",
    descripcion: "Radiografía del tórax PA",
    instrucciones: "Sin contraste. Traer ropa sin botones metálicos.",
    preguntasProtocolares: [
      { id: "p1", texto: "¿Es mujer embarazada?", tipo: "BOOLEAN", obligatoria: true },
    ],
    validezDias: 30,
    activo: true,
  },
  {
    nombre: "Ecografía Abdominal",
    tipo: "ECOGRAFIA",
    descripcion: "Ecografía de órganos abdominales",
    instrucciones: "Ayuno de 6 horas. Tomar 1 litro de agua 1 hora antes.",
    preguntasProtocolares: [],
    validezDias: 30,
    activo: true,
  },
  {
    nombre: "Electrocardiograma",
    tipo: "ELECTROCARDIOGRAMA",
    descripcion: "Registro eléctrico del corazón",
    instrucciones: "Acudir en estado de reposo",
    preguntasProtocolares: [],
    validezDias: 30,
    activo: true,
  },
  {
    nombre: "Prueba Rápida COVID-19",
    tipo: "INMUNOLOGIA",
    descripcion: "Detección de antígeno COVID-19",
    instrucciones: "Tomar muestra de hisopado nasofaríngeo",
    preguntasProtocolares: [
      { id: "p1", texto: "¿Síntomas respiratorios en últimos 7 días?", tipo: "BOOLEAN", obligatoria: true },
    ],
    validezDias: 1,
    activo: true,
  },
];

const primerosNombres = [
  "Juan", "María", "Carlos", "Ana", "Luis", "Rosa", "Pedro", "Elena", "José", "Carmen",
  "Miguel", "Patricia", "Francisco", "Sandra", "Diego", "Laura", "Andrés", "Claudia", "Ricardo", "Marta",
  "Raúl", "Beatriz", "Fernando", "Gloria", "Javier", "Dolores", "Víctor", "Pilar", "Enrique", "Teresita",
];

const apellidos = [
  "García", "Martínez", "López", "Rodríguez", "Hernández", "Pérez", "Fernández", "Torres", "Morales", "Mendoza",
  "Chávez", "Vargas", "Ruiz", "Jiménez", "Reyes", "Soto", "Quintero", "Ayala", "Rojas", "Flores",
  "Salinas", "Quispe", "Delgado", "Ramos", "Aguirre", "Núñez", "Lozano", "Salas", "Munguía", "Gutiérrez",
];

const distritos = [
  "Lima", "Miraflores", "San Isidro", "Surco", "La Molina", "Barranco", "Magdalena", "San Martín de Porres",
  "Comas", "Rímac", "San Miguel", "Breña", "Chorrillos", "Villa María del Triunfo", "San Bartolo",
];

const horas = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
];

const diagnosticos = [
  "Hipertensión arterial esencial",
  "Diabetes mellitus tipo 2",
  "Gastritis crónica",
  "Infección de vías urinarias",
  "Sinusitis aguda",
  "Dermatitis atópica",
  "Hipotiroidismo",
  "Colesterol elevado",
  "Anemia ferropénica",
  "Cefalea tensional",
];

const motivosCancelacion = [
  "Cambio de horario laboral",
  "Enfermedad del paciente",
  "Urgencia familiar",
  "Motivos económicos",
  "Decisión personal",
];

function generarDNI(): string {
  return String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
}

function generarTelefono(): string {
  return "9" + String(Math.floor(Math.random() * 900000000) + 100000000);
}

function generarCorreo(): string {
  const nombres = ["usuario", "cliente", "paciente"];
  const dominios = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"];
  return `${nombres[Math.floor(Math.random() * nombres.length)]}${Math.floor(Math.random() * 99999)}@${dominios[Math.floor(Math.random() * dominios.length)]}`;
}

function fechaAleatoria(desde: Date, hasta: Date): Date {
  return new Date(desde.getTime() + Math.random() * (hasta.getTime() - desde.getTime()));
}

function restarDias(fecha: Date, dias: number): Date {
  const result = new Date(fecha);
  result.setDate(result.getDate() - dias);
  return result;
}

async function seedCompleto() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ Conectado a MongoDB");

    // LIMPIAR TODAS LAS COLECCIONES
    console.log("🗑️  Limpiando todas las colecciones...");
    await Paciente.deleteMany({});
    await Cita.deleteMany({});
    await OrdenExamen.deleteMany({});
    await ExamenLaboratorioImagen.deleteMany({});
    await Medicamento.deleteMany({});
    await Especialidad.deleteMany({});
    await Doctor.deleteMany({});
    console.log("✅ Colecciones limpiadas");

    // CREAR ESPECIALIDADES
    const especialidadesCreadas = await Especialidad.insertMany(especialidades);
    console.log(`✅ ${especialidadesCreadas.length} especialidades creadas`);

    // CREAR DOCTORES (varios por especialidad)
    const doctores: any[] = [];
    for (const especialidad of especialidadesCreadas) {
      for (let i = 1; i <= 2; i++) {
        const nombre = primerosNombres[Math.floor(Math.random() * primerosNombres.length)];
        const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
        doctores.push({
          nombres: nombre,
          apellidos: apellido,
          correo: `${nombre.toLowerCase()}.${apellido.toLowerCase()}@policlinico.com`,
          telefono: generarTelefono(),
          especialidadId: especialidad._id,
          cmp: String(Math.floor(Math.random() * 999999)).padStart(5, "0"),
        });
      }
    }
    const doctoresCreados = await Doctor.insertMany(doctores);
    console.log(`✅ ${doctoresCreados.length} doctores creados`);

    // CREAR MEDICAMENTOS
    const medicamentosCreados = await Medicamento.insertMany(medicamentos);
    console.log(`✅ ${medicamentosCreados.length} medicamentos creados`);

    // CREAR EXÁMENES
    const examenesCreados = await ExamenLaboratorioImagen.insertMany(examenes);
    console.log(`✅ ${examenesCreados.length} exámenes creados`);

    // CREAR PACIENTES (50 pacientes)
    const pacientes: any[] = [];
    const hoy = new Date();
    for (let i = 0; i < 50; i++) {
      const nombre = primerosNombres[Math.floor(Math.random() * primerosNombres.length)];
      const apellido = apellidos[Math.floor(Math.random() * apellidos.length)];
      const dniUnico = generarDNI();
      const telefonoUnico = generarTelefono();
      const correoUnico = generarCorreo();

      const fechaNac = new Date(1950 + Math.floor(Math.random() * 70), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));

      pacientes.push({
        nombres: nombre,
        apellidos: apellido,
        dni: dniUnico,
        telefono: telefonoUnico,
        correo: correoUnico,
        fechaNacimiento: fechaNac,
        sexo: Math.random() > 0.5 ? "M" : "F",
        estadoCivil: ["SOLTERO", "CASADO", "CONVIVIENTE", "DIVORCIADO", "VIUDO"][Math.floor(Math.random() * 5)],
        direccion: `Av. Principal ${Math.floor(Math.random() * 999)} Apt. ${Math.floor(Math.random() * 99)}`,
        distrito: distritos[Math.floor(Math.random() * distritos.length)],
      });
    }
    const pacientesCreados = await Paciente.insertMany(pacientes);
    console.log(`✅ ${pacientesCreados.length} pacientes creados`);

    // CREAR CITAS (múltiples estados y fechas)
    const citas: any[] = [];
    const estados = ["PENDIENTE", "ASISTIO", "ATENDIDA", "CANCELADA", "REPROGRAMADA"];
    const tipos = ["CONSULTA", "LABORATORIO", "REMOTA", "DOMICILIO"];

    for (let i = 0; i < 150; i++) {
      const paciente = pacientesCreados[Math.floor(Math.random() * pacientesCreados.length)];
      const doctor = doctoresCreados[Math.floor(Math.random() * doctoresCreados.length)];
      const estado = estados[Math.floor(Math.random() * estados.length)];
      const tipo = tipos[Math.floor(Math.random() * tipos.length)];

      // Fechas distribuidas: pasadas, presentes y futuras
      let fecha: Date;
      if (Math.random() < 0.3) {
        // 30% en el pasado (últimos 30 días)
        fecha = restarDias(hoy, Math.floor(Math.random() * 30));
      } else if (Math.random() < 0.5) {
        // 20% hoy o en los próximos días
        fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() + Math.floor(Math.random() * 7));
      } else {
        // 50% en el futuro (próximas 2 semanas)
        fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() + Math.floor(Math.random() * 14));
      }

      const cita: any = {
        pacienteId: paciente._id,
        doctorId: tipo === "LABORATORIO" ? null : doctor._id,
        fecha: fecha,
        hora: horas[Math.floor(Math.random() * horas.length)],
        tipo: tipo,
        estado: estado,
      };

      if (estado === "ATENDIDA") {
        cita.notasClinicas = "Paciente atendido correctamente. Diagnóstico establecido.";
        cita.diagnostico = diagnosticos[Math.floor(Math.random() * diagnosticos.length)];
        cita.tratamiento = "Prescripción de medicamentos y seguimiento en 2 semanas.";
        cita.horarioAsistencia = fecha;
        cita.medicamentosPrescritos = [
          {
            medicamentoId: medicamentosCreados[Math.floor(Math.random() * medicamentosCreados.length)]._id,
            nombre: medicamentosCreados[Math.floor(Math.random() * medicamentosCreados.length)].nombre,
            dosis: ["500mg", "1000mg", "250mg", "100mg"][Math.floor(Math.random() * 4)],
            frecuencia: ["Cada 8 horas", "Cada 12 horas", "Una vez al día"][Math.floor(Math.random() * 3)],
            duracion: "7 días",
          },
        ];
      } else if (estado === "CANCELADA") {
        cita.motivoCancelacion = motivosCancelacion[Math.floor(Math.random() * motivosCancelacion.length)];
      } else if (estado === "ASISTIO") {
        cita.horarioAsistencia = fecha;
      }

      citas.push(cita);
    }

    await Cita.insertMany(citas);
    console.log(`✅ ${citas.length} citas creadas en diferentes estados`);

    // CREAR ÓRDENES DE EXAMEN
    const ordenes: any[] = [];
    for (let i = 0; i < 40; i++) {
      const paciente = pacientesCreados[Math.floor(Math.random() * pacientesCreados.length)];
      const doctor = doctoresCreados[Math.floor(Math.random() * doctoresCreados.length)];
      const especialidad = especialidadesCreadas[Math.floor(Math.random() * especialidadesCreadas.length)];
      const estados = ["PENDIENTE", "EN_PROCESO", "ASISTIDO", "FINALIZADO", "CANCELADA"];
      const estado = estados[Math.floor(Math.random() * estados.length)];

      const examen = examenesCreados[Math.floor(Math.random() * examenesCreados.length)];
      const ahora = new Date();

      const orden: any = {
        pacienteId: paciente._id,
        doctorId: doctor._id,
        especialidadId: especialidad._id,
        codigoOrden: `ORD-${ahora.getTime()}-${i}`,
        fecha: restarDias(ahora, Math.floor(Math.random() * 10)),
        items: [
          {
            examenId: examen._id,
            estadoItem: estado === "FINALIZADO" ? "COMPLETADO" : "PENDIENTE",
            observaciones: "Orden de examen rutinario",
          },
        ],
        estado: estado,
        observacionesGenerales: "Orden creada para seguimiento médico",
      };

      if (estado === "EN_PROCESO" || estado === "ASISTIDO" || estado === "FINALIZADO") {
        orden.fechaAutorizacion = restarDias(ahora, Math.floor(Math.random() * 5));
        orden.fechaCitaLab = new Date(orden.fechaAutorizacion);
        orden.fechaCitaLab.setDate(orden.fechaCitaLab.getDate() + Math.floor(Math.random() * 5));
      }

      if (estado === "ASISTIDO" || estado === "FINALIZADO") {
        orden.fechaAsistencia = orden.fechaCitaLab;
      }

      if (estado === "FINALIZADO") {
        orden.items[0].estadoItem = "COMPLETADO";
        orden.fechaResultados = new Date(orden.fechaAsistencia);
        orden.fechaResultados.setDate(orden.fechaResultados.getDate() + 1);
        orden.items[0].valorResultado = Math.floor(Math.random() * 200).toString();
        orden.items[0].unidadResultado = "g/dL";
      }

      ordenes.push(orden);
    }

    await OrdenExamen.insertMany(ordenes);
    console.log(`✅ ${ordenes.length} órdenes de examen creadas`);

    console.log("\n📊 RESUMEN DEL SEED:");
    console.log(`   • Especialidades: ${especialidadesCreadas.length}`);
    console.log(`   • Doctores: ${doctoresCreados.length}`);
    console.log(`   • Pacientes: ${pacientesCreados.length}`);
    console.log(`   • Citas: ${citas.length}`);
    console.log(`   • Órdenes de Examen: ${ordenes.length}`);
    console.log(`   • Medicamentos: ${medicamentosCreados.length}`);
    console.log(`   • Exámenes de Laboratorio: ${examenesCreados.length}`);
    console.log("\n✨ Seed completado exitosamente. ¡Policlínico listo para producción!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error en seed:", error);
    process.exit(1);
  }
}

seedCompleto();
