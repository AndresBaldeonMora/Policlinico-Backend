// ============================================
// src/utils/horarios.util.ts
// ============================================
export class HorariosUtil {
  static generarHorarios(horaInicio: string, horaFin: string): string[] {
    const horarios: string[] = [];
    const [inicioHora, inicioMin] = horaInicio.split(':').map(Number);
    const [finHora, finMin] = horaFin.split(':').map(Number);

    let horaActual = inicioHora * 60 + inicioMin;
    const horaFinMinutos = finHora * 60 + finMin;

    while (horaActual < horaFinMinutos) {
      const horas = Math.floor(horaActual / 60);
      const minutos = horaActual % 60;
      horarios.push(
        `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`
      );
      horaActual += 30;
    }

    return horarios;
  }

  static obtenerDiaSemana(fecha: string): number {
    return new Date(fecha).getDay();
  }
}
