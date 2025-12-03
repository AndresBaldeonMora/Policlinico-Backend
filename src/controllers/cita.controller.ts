// src/controllers/cita.controller.ts (FINAL)

import { Request, Response } from "express";
import { Cita } from "../models/Cita";
// Asegúrate de que estas importaciones existan y sean correctas en tu proyecto
import { Paciente } from "../models/Paciente"; 
import { Doctor } from "../models/Doctor";

// 🧩 Función auxiliar: calcula el estado actual de una cita
const calcularEstado = (fecha: Date, hora: string, estado: string): string => {
  // ✅ CORRECCIÓN: Comparamos con mayúsculas porque así se guarda en la BD ahora
  if (estado === "REPROGRAMADA") return "REPROGRAMADA"; // prioridad

  const ahora = new Date();
  const fechaHoraCita = new Date(fecha);
  const [horas, minutos] = hora.split(":").map(Number);
  
  // Usamos setHours para establecer la hora de la cita en la hora local.
  fechaHoraCita.setHours(horas, minutos, 0, 0);

  const diferenciaMin = (ahora.getTime() - fechaHoraCita.getTime()) / (1000 * 60);
  
  // Si el estado en BD es FINALIZADO o ATENDIDA, devolvemos ese, 
  // si no, calculamos si ya pasó el tiempo
  if (diferenciaMin > 30) return "finalizado"; // O podrías retornar "ATENDIDA" si prefieres
  return "PENDIENTE";
};

/**
 * Función auxiliar para crear un objeto Date en la zona horaria local 
 * a partir de una cadena YYYY-MM-DD.
 * Esto corrige el error de "Invalid Date" y el problema de la zona horaria.
 */
const crearFechaLocal = (fechaString: string): Date => {
  const [year, month, day] = fechaString.split('-').map(Number);
  // month - 1 es crucial porque JavaScript usa meses 0-indexados (Enero=0)
  return new Date(year, month - 1, day); 
}

// ---------------------------------------------------------------
// 🟢 Crear cita
export const crearCita = async (req: Request, res: Response) => {
    try {
        const { pacienteId, doctorId, fecha, hora } = req.body;

        if (!pacienteId || !doctorId || !fecha || !hora) {
            return res.status(400).json({
                success: false,
                message: "Todos los campos son requeridos",
            });
        }

        // ✅ CORRECCIÓN 1: Usar la función auxiliar para crear la fecha localmente
        const fechaInicioDia = crearFechaLocal(fecha);
        
        // Verificación de seguridad (soluciona CastError: Invalid Date)
        if (isNaN(fechaInicioDia.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Formato de fecha inválido proporcionado",
            });
        }
        
        const citaExistente = await Cita.findOne({
            doctorId,
            fecha: fechaInicioDia, 
            hora,
        });

        if (citaExistente) {
            return res.status(400).json({
                success: false,
                message: "Ya existe una cita para ese horario",
            });
        }

        const nuevaCita = new Cita({
            pacienteId,
            doctorId,
            fecha: fechaInicioDia, // Usar la fecha corregida
            hora,
            // ✅ CORRECCIÓN DE TIPO: Mayúsculas para coincidir con el modelo
            estado: "PENDIENTE", 
        });

        await nuevaCita.save();
        res.status(201).json({
            success: true,
            data: nuevaCita,
            message: "Cita creada exitosamente",
        });
    } catch (error: any) {
        console.error("❌ Error al crear cita:", error);
        res.status(500).json({
            success: false,
            message: "Error al crear la cita",
            error: error.message,
        });
    }
};
// ---------------------------------------------------------------

// 🟣 Listar citas (con DNI, paciente, doctor y especialidad)
export const listarCitas = async (_req: Request, res: Response) => {
    try {
        const citas = await Cita.find()
          .populate("pacienteId", "nombres apellidos dni")
          .populate({
            path: "doctorId",
            select: "nombres apellidos especialidadId",
            populate: {
              path: "especialidadId",
              select: "nombre",
            },
          })
          .sort({ _id: -1 }); 

        const citasProcesadas = citas.map((cita, index) => {
            const paciente = cita.pacienteId as any;
            const doctor = cita.doctorId as any;

            const fechaFormateada = new Date(cita.fecha).toLocaleDateString("es-PE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });

            // Aquí pasamos el estado tal cual viene de la BD (ej. "PENDIENTE", "REPROGRAMADA")
            const estadoActual = calcularEstado(cita.fecha, cita.hora, cita.estado);

            return {
                id: index + 1, 
                _id: cita._id,
                dni: paciente?.dni || "—",
                paciente: `${paciente?.nombres || ""} ${paciente?.apellidos || ""}`.trim(),
                doctor: doctor
                  ? `${doctor?.nombres || ""} ${doctor?.apellidos || ""}`.trim()
                  : "Sin asignar",
                doctorId: doctor?._id || "", 
                especialidad: doctor?.especialidadId?.nombre || "Sin especialidad",
                fecha: fechaFormateada,
                hora: cita.hora,
                estado: estadoActual,
            };
        });

        res.json({ success: true, data: citasProcesadas });
    } catch (error: any) {
        console.error("❌ Error al listar citas:", error);
        res.status(500).json({
            success: false,
            message: "Error al listar citas",
            error: error.message,
        });
    }
};
// ---------------------------------------------------------------

// 🔵 Reprogramar cita
export const reprogramarCita = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { fecha, hora } = req.body;

        const cita = await Cita.findById(id);
        if (!cita) {
            return res.status(404).json({
                success: false,
                message: "Cita no encontrada",
            });
        }

        // ✅ CORRECCIÓN 2: Usar la función auxiliar para crear la fecha localmente al reprogramar
        const fechaInicioDia = crearFechaLocal(fecha); 

        if (isNaN(fechaInicioDia.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Formato de nueva fecha inválido",
            });
        }

        cita.fecha = fechaInicioDia; // Usar la fecha corregida
        cita.hora = hora;
        // ✅ CORRECCIÓN DE TIPO: Usar mayúsculas para cumplir con el enum del modelo
        cita.estado = "REPROGRAMADA"; 

        await cita.save();

        res.json({
            success: true,
            data: cita,
            message: "Cita reprogramada exitosamente",
        });
    } catch (error: any) {
        console.error("❌ Error al reprogramar cita:", error);
        res.status(500).json({
            success: false,
            message: "Error al reprogramar cita",
            error: error.message,
        });
    }
};