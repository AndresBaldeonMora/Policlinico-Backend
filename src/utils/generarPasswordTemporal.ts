/**
 * Genera una contraseña temporal legible para entregar al paciente en papel.
 * Formato: 3 letras-4 dígitos-2 letras  →  ej: "POL-4827-XB"
 * Evita caracteres ambiguos (0/O, 1/I/L) para reducir errores al escribirla.
 */
export function generarPasswordTemporal(): string {
  const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ"; // sin I, L, O
  const DIGITOS = "23456789";                 // sin 0, 1
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(LETRAS, 3)}-${pick(DIGITOS, 4)}-${pick(LETRAS, 2)}`;
}
