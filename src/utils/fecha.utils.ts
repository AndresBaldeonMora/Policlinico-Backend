// ============================================
// src/utils/fecha.utils.ts
// Fuente única de verdad para el manejo de fechas en el backend.
//
// Convención del sistema:
//   • `fecha` (día de cita/orden/bloqueo) se guarda como MEDIANOCHE UTC.
//   • `hora` se guarda como string "HH:mm" en hora local de Perú (UTC-5).
//   • Perú no tiene horario de verano: offset fijo UTC-5.
// ============================================

/** Offset fijo de Perú respecto a UTC, en milisegundos (UTC-5, sin DST). */
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Construye la medianoche UTC de un día dado en formato "YYYY-MM-DD".
 * Es la forma canónica de guardar/consultar el campo `fecha`.
 */
export const crearFechaUTC = (fechaString: string): Date => {
  const [year, month, day] = fechaString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * El instante "ahora" trasladado al reloj de pared de Perú.
 * Leer sus componentes con getUTC* devuelve la fecha/hora local peruana,
 * independientemente de la zona horaria del servidor.
 */
export const ahoraPeru = (): Date => new Date(Date.now() - PERU_OFFSET_MS);

/**
 * El día de HOY según el calendario peruano, como medianoche UTC.
 * Correcto aunque el servidor corra en UTC y sean las 11pm en Perú.
 */
export const hoyPeruUTC = (): Date => {
  const p = ahoraPeru();
  return new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate()));
};

/**
 * Fin del día (23:59:59.999 UTC) para un "YYYY-MM-DD" o un Date.
 * Útil para rangos inclusivos `$lte`.
 */
export const finDelDiaUTC = (fecha: string | Date): Date => {
  const base = typeof fecha === "string" ? crearFechaUTC(fecha) : fecha;
  const fin = new Date(base);
  fin.setUTCHours(23, 59, 59, 999);
  return fin;
};

/**
 * Inicio del día (00:00:00.000 UTC) para un "YYYY-MM-DD" o un Date.
 */
export const inicioDelDiaUTC = (fecha: string | Date): Date => {
  const base = typeof fecha === "string" ? crearFechaUTC(fecha) : fecha;
  const inicio = new Date(base);
  inicio.setUTCHours(0, 0, 0, 0);
  return inicio;
};

/**
 * Día de la semana (0=domingo … 6=sábado) leído en UTC.
 * Evita el desfase de usar getDay() local sobre una fecha en medianoche UTC.
 */
export const diaSemanaUTC = (fecha: string | Date): number => {
  const base = typeof fecha === "string" ? crearFechaUTC(fecha) : new Date(fecha);
  return base.getUTCDay();
};

/**
 * Convierte una hora local de Perú ("HH:mm") en el día `fechaUTC` (medianoche UTC)
 * al instante UTC real correspondiente. Suma 5h porque Perú es UTC-5.
 */
export const horaPeruAInstanteUTC = (fechaUTC: Date, hora: string): Date => {
  const [h, m] = hora.split(":").map(Number);
  const instante = new Date(fechaUTC);
  instante.setUTCHours(h + 5, m, 0, 0);
  return instante;
};
