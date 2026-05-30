import PDFDocument from "pdfkit";
import { createHash } from "crypto";

/**
 * Generador de la Receta Única Estandarizada (Perú).
 *
 * Fuentes oficiales (ver Docs/Recetas-Medicas-MINSA.md):
 *  - Ley 29459 y DS 014-2011-SA (Ley de Productos Farmacéuticos)
 *  - NTS N° 057-MINSA/DIGEMID-V.01 (Norma Técnica de prescripción)
 *  - Modelo de Receta Única Estandarizada (Anexo N° 02, DIGEMID)
 *
 * La receta tiene dos partes:
 *  1) PRESCRIPCIÓN — para la farmacia (DCI, concentración, forma, cantidad).
 *  2) INDICACIONES — para el paciente (cómo tomar cada medicamento).
 */

export interface MedicamentoReceta {
  nombre: string;
  dci?: string;
  concentracion?: string;
  formaFarmaceutica?: string;
  viaAdministracion?: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  cantidad?: string;
  observaciones?: string;
}

export interface DatosReceta {
  numeroReceta: string;
  fecha: string; // ISO
  paciente: {
    nombres: string;
    apellidos: string;
    dni: string;
    fechaNacimiento?: string;
    sexo?: string;
    direccion?: string;
  };
  doctor: {
    nombres: string;
    apellidos: string;
    cmp?: string;
  };
  especialidad?: string;
  diagnosticos?: { codigo: string; descripcion: string }[];
  medicamentos: MedicamentoReceta[];
}

const teal = "#0d9488";
const darkTeal = "#0f766e";
const gray = "#6b7280";
const dark = "#1f2937";
const lightBg = "#f9fafb";
const border = "#e5e7eb";

const formatFecha = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
};

const calcEdad = (fechaNac?: string) => {
  if (!fechaNac) return "";
  const diff = Date.now() - new Date(fechaNac).getTime();
  const años = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return `${años} años`;
};

// Genera el sello de integridad SHA-256 de los datos de la receta.
// Sirve como huella digital del documento; si los datos son alterados el código no coincide.
const generarSello = (datos: DatosReceta): string =>
  createHash("sha256")
    .update(JSON.stringify({
      numeroReceta: datos.numeroReceta,
      fecha: datos.fecha,
      pacienteDni: datos.paciente.dni,
      doctorCmp: datos.doctor.cmp,
      medicamentos: datos.medicamentos.map(m => ({ nombre: m.nombre, dci: m.dci, concentracion: m.concentracion, cantidad: m.cantidad })),
    }))
    .digest("hex")
    .toUpperCase();

export const generarPDFReceta = (datos: DatosReceta): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width - 100; // ancho útil con márgenes
    const left = 50;
    const right = left + pageW;

    // ── Encabezado del establecimiento ──
    doc.rect(left, 50, pageW, 64).fill(teal);
    doc.fontSize(17).fillColor("#ffffff").font("Helvetica-Bold")
      .text("Policlínico Parroquial San José", left, 62, { align: "center", width: pageW });
    doc.fontSize(9).fillColor("#99f6e4").font("Helvetica")
      .text("Lima, Perú  ·  Consulta Externa", left, 84, { align: "center", width: pageW });
    doc.fontSize(8).fillColor("#ccfbf1").font("Helvetica")
      .text("RECETA ÚNICA ESTANDARIZADA", left, 97, { align: "center", width: pageW });

    // ── N° de receta y fecha ──
    let y = 124;
    doc.fillColor(teal).font("Helvetica-Bold").fontSize(11)
      .text(`Receta N° ${datos.numeroReceta}`, left + 4, y);
    doc.fillColor(gray).font("Helvetica").fontSize(10)
      .text(`Fecha: ${formatFecha(datos.fecha)}`, left, y, { align: "right", width: pageW - 4 });
    y += 22;

    // ── Datos del paciente ──
    const sectionTitle = (txt: string, yy: number) => {
      doc.fillColor(teal).font("Helvetica-Bold").fontSize(10).text(txt, left + 4, yy);
      doc.moveTo(left + 4, yy + 13).lineTo(right - 4, yy + 13).strokeColor(border).lineWidth(0.5).stroke();
      return yy + 22;
    };

    const field = (label: string, value: string, x: number, yy: number, w?: number) => {
      doc.fillColor(dark).fontSize(10).font("Helvetica-Bold").text(label, x, yy, { continued: true })
        .font("Helvetica").text(value || "—", w ? { width: w } : undefined);
    };

    y = sectionTitle("DATOS DEL PACIENTE", y);
    field("Nombre: ", `${datos.paciente.nombres} ${datos.paciente.apellidos}`, left + 4, y);
    field("DNI: ", datos.paciente.dni, left + pageW * 0.62, y);
    y += 17;
    const edad = calcEdad(datos.paciente.fechaNacimiento);
    const sexo = datos.paciente.sexo === "M" ? "Masculino" : datos.paciente.sexo === "F" ? "Femenino" : "";
    field("Edad: ", edad, left + 4, y);
    if (sexo) field("Sexo: ", sexo, left + pageW * 0.62, y);
    y += 17;
    if (datos.paciente.direccion) {
      field("Domicilio: ", datos.paciente.direccion, left + 4, y);
      y += 17;
    }

    // ── Diagnóstico(s) CIE-10 ──
    if (datos.diagnosticos && datos.diagnosticos.length > 0) {
      y += 6;
      y = sectionTitle("DIAGNÓSTICO (CIE-10)", y);
      datos.diagnosticos.forEach((dx) => {
        doc.fillColor(dark).font("Helvetica-Bold").fontSize(10).text(dx.codigo, left + 4, y, { continued: true })
          .font("Helvetica").fillColor(gray).text(`  ${dx.descripcion}`);
        y += 15;
      });
    }

    // ── PARTE 1: PRESCRIPCIÓN (para la farmacia) ──
    y += 10;
    doc.rect(left, y, pageW, 20).fill(darkTeal);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10)
      .text("PRESCRIPCIÓN  ·  para la farmacia", left + 8, y + 6);
    y += 28;

    datos.medicamentos.forEach((m, i) => {
      if (y > 690) { doc.addPage(); y = 60; }
      // Bloque por medicamento
      doc.rect(left, y, pageW, 1).fill(border);
      y += 6;
      const dciTxt = m.dci ? `  (DCI: ${m.dci})` : "";
      doc.fillColor(dark).font("Helvetica-Bold").fontSize(11)
        .text(`${i + 1}. ${m.nombre} ${m.concentracion || ""}`.trim(), left + 4, y, { continued: true })
        .font("Helvetica").fillColor(gray).fontSize(9).text(dciTxt);
      y += 16;
      const linea2 = [
        m.formaFarmaceutica && `Forma: ${m.formaFarmaceutica}`,
        m.viaAdministracion && `Vía: ${m.viaAdministracion}`,
        m.cantidad && `Cantidad a dispensar: ${m.cantidad}`,
      ].filter(Boolean).join("    ·    ");
      if (linea2) {
        doc.fillColor(gray).font("Helvetica").fontSize(9).text(linea2, left + 14, y);
        y += 15;
      }
      y += 4;
    });

    // ── PARTE 2: INDICACIONES (para el paciente) ──
    if (y > 640) { doc.addPage(); y = 60; }
    y += 8;
    doc.rect(left, y, pageW, 20).fill(teal);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10)
      .text("INDICACIONES  ·  para el paciente", left + 8, y + 6);
    y += 28;

    datos.medicamentos.forEach((m, i) => {
      if (y > 700) { doc.addPage(); y = 60; }
      doc.fillColor(dark).font("Helvetica-Bold").fontSize(10)
        .text(`${i + 1}. ${m.nombre} ${m.concentracion || ""}`.trim(), left + 4, y);
      y += 14;
      const pauta = [
        m.dosis && `Tomar ${m.dosis}`,
        m.frecuencia,
        m.duracion && `durante ${m.duracion}`,
        m.viaAdministracion && `vía ${m.viaAdministracion.toLowerCase()}`,
      ].filter(Boolean).join("  ·  ");
      if (pauta) {
        doc.fillColor(gray).font("Helvetica").fontSize(9.5).text(pauta, left + 14, y, { width: pageW - 20 });
        y += 14;
      }
      if (m.observaciones) {
        doc.fillColor(gray).font("Helvetica-Oblique").fontSize(9)
          .text(`Nota: ${m.observaciones}`, left + 14, y, { width: pageW - 20 });
        y += 14;
      }
      y += 4;
    });

    // ── Sello de integridad (SHA-256) ──
    const sello = generarSello(datos);
    if (y > 650) { doc.addPage(); y = 60; }
    y += 20;
    doc.rect(left, y, pageW, 32).fill("#f0fdfa");
    doc.rect(left, y, 3, 32).fill(teal);
    doc.fillColor(gray).font("Helvetica-Bold").fontSize(8)
      .text("Sello de integridad (SHA-256):", left + 10, y + 6);
    doc.fillColor(dark).font("Helvetica").fontSize(7.5)
      .text(sello, left + 10, y + 17, { width: pageW - 20, characterSpacing: 0.5 });
    y += 40;

    // ── Prescriptor + firma ──
    if (y > 660) { doc.addPage(); y = 60; }
    y += 24;
    const firmaX = left + pageW - 220;
    doc.moveTo(firmaX, y).lineTo(firmaX + 200, y).strokeColor(gray).lineWidth(0.7).stroke();
    y += 5;
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(10)
      .text(`Dr(a). ${datos.doctor.nombres} ${datos.doctor.apellidos}`, firmaX, y, { width: 200, align: "center" });
    y += 14;
    doc.fillColor(gray).font("Helvetica").fontSize(9)
      .text(`CMP ${datos.doctor.cmp || "—"}`, firmaX, y, { width: 200, align: "center" });
    if (datos.especialidad) {
      y += 12;
      doc.fillColor(gray).font("Helvetica").fontSize(9)
        .text(datos.especialidad, firmaX, y, { width: 200, align: "center" });
    }
    y += 12;
    doc.fillColor("#9ca3af").font("Helvetica-Oblique").fontSize(8)
      .text("Firma y sello", firmaX, y, { width: 200, align: "center" });

    // ── Footer ──
    const footY = doc.page.height - 70;
    doc.moveTo(left, footY).lineTo(right, footY).strokeColor(border).lineWidth(0.5).stroke();
    doc.fillColor("#9ca3af").font("Helvetica").fontSize(8)
      .text("Policlínico Parroquial San José — Lima, Perú", left, footY + 8, { align: "center", width: pageW });
    doc.fillColor("#9ca3af").font("Helvetica").fontSize(7.5)
      .text("Receta válida según NTS N° 057-MINSA/DIGEMID. Conserve este documento para la dispensación.", left, footY + 20, { align: "center", width: pageW });

    doc.end();
  });
};
