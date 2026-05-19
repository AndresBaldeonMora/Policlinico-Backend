/**
 * Normaliza texto para búsqueda insensible a tildes y mayúsculas.
 * "Neumonía" → "neumonia". Debe usarse de forma idéntica al cargar
 * el catálogo (seedCIE10) y al consultar (cie10.controller) para que
 * las búsquedas coincidan.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // elimina marcas diacríticas combinantes
    .trim();
}
